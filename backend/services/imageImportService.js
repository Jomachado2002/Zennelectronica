// backend/services/imageImportService.js
// Servicio para importar imágenes desde URLs del proveedor a Firebase Storage

const axios = require('axios');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { v4: uuidv4 } = require('uuid');

// Configuración de Firebase
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Inicializar Firebase
let app;
let storage;

try {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
} catch (error) {
    console.error('Error inicializando Firebase Storage:', error.message);
}

/**
 * Descarga una imagen desde una URL
 * @param {string} imageUrl - URL de la imagen
 * @param {number} timeout - Timeout en milisegundos (por defecto: 30000)
 * @returns {Promise<Buffer>} Buffer de la imagen
 */
async function downloadImage(imageUrl, timeout = 30000) {
    try {
        if (!imageUrl || !imageUrl.startsWith('http')) {
            throw new Error('URL de imagen no válida');
        }

        console.log(`Descargando imagen: ${imageUrl}`);

        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (response.status !== 200) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        if (!response.data || response.data.length === 0) {
            throw new Error('Imagen vacía');
        }

        // Validar que sea una imagen
        const contentType = response.headers['content-type'];
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        
        if (!validTypes.includes(contentType)) {
            throw new Error(`Tipo de imagen no válido: ${contentType}`);
        }

        console.log(`Imagen descargada: ${response.data.length} bytes, tipo: ${contentType}`);
        return Buffer.from(response.data);

    } catch (error) {
        console.error(`Error descargando imagen ${imageUrl}:`, error.message);
        throw error;
    }
}

/**
 * Sube una imagen a Firebase Storage
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {string} providerCode - Código del producto del proveedor
 * @param {string} originalUrl - URL original de la imagen
 * @returns {Promise<string>} URL pública de la imagen subida
 */
async function uploadImageToFirebase(imageBuffer, providerCode, originalUrl = '') {
    try {
        if (!imageBuffer || imageBuffer.length === 0) {
            throw new Error('Buffer de imagen vacío');
        }

        if (!providerCode) {
            throw new Error('Código del proveedor requerido');
        }

        // Generar nombre único para el archivo
        const uniqueId = uuidv4();
        const fileName = `${uniqueId}_${providerCode}.jpg`;
        const fullPath = `products/${fileName}`;

        console.log(`Subiendo imagen: ${fullPath}`);

        // Crear referencia en Firebase Storage
        const storageRef = ref(storage, fullPath);

        // Subir archivo
        const snapshot = await uploadBytes(storageRef, imageBuffer, {
            customMetadata: {
                providerCode: providerCode,
                originalUrl: originalUrl,
                uploadedAt: new Date().toISOString(),
                source: 'inventory_sync'
            }
        });

        // Obtener URL pública
        const publicUrl = await getDownloadURL(snapshot.ref);

        console.log(`Imagen subida exitosamente: ${publicUrl}`);
        return publicUrl;

    } catch (error) {
        console.error('Error subiendo imagen a Firebase:', error.message);
        throw error;
    }
}

/**
 * Importa una imagen completa: descarga desde URL del proveedor y sube a Firebase
 * @param {string} imageUrl - URL de la imagen del proveedor
 * @param {string} providerCode - Código del producto del proveedor
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Resultado de la importación
 */
async function importImage(imageUrl, providerCode, options = {}) {
    const { timeout = 30000, retries = 3 } = options;

    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Importando imagen (intento ${attempt}/${retries}): ${imageUrl}`);

            // Descargar imagen
            const imageBuffer = await downloadImage(imageUrl, timeout);

            // Subir a Firebase
            const publicUrl = await uploadImageToFirebase(imageBuffer, providerCode, imageUrl);

            return {
                success: true,
                providerCode,
                originalUrl: imageUrl,
                publicUrl,
                fileSize: imageBuffer.length,
                attempt
            };

        } catch (error) {
            lastError = error;
            console.error(`Error en intento ${attempt}:`, error.message);

            if (attempt < retries) {
                const delay = attempt * 2000; // Delay progresivo: 2s, 4s, 6s
                console.log(`Esperando ${delay}ms antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // Si todos los intentos fallaron
    return {
        success: false,
        providerCode,
        originalUrl: imageUrl,
        error: lastError.message,
        attempts: retries
    };
}

/**
 * Importa múltiples imágenes en paralelo
 * @param {Array} imageData - Array de objetos con imageUrl y providerCode
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Array>} Array de resultados
 */
async function importMultipleImages(imageData, options = {}) {
    const { maxConcurrent = 5, delayBetweenBatches = 1000 } = options;

    const results = [];
    const batches = [];

    // Dividir en lotes
    for (let i = 0; i < imageData.length; i += maxConcurrent) {
        batches.push(imageData.slice(i, i + maxConcurrent));
    }

    console.log(`Importando ${imageData.length} imágenes en ${batches.length} lotes de máximo ${maxConcurrent}`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`Procesando lote ${batchIndex + 1}/${batches.length}`);

        // Procesar lote en paralelo
        const batchPromises = batch.map(item => 
            importImage(item.imageUrl, item.providerCode, options)
        );

        try {
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Delay entre lotes (excepto el último)
            if (batchIndex < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }

        } catch (error) {
            console.error(`Error en lote ${batchIndex + 1}:`, error.message);
            // Agregar errores para este lote
            batch.forEach(item => {
                results.push({
                    success: false,
                    providerCode: item.providerCode,
                    originalUrl: item.imageUrl,
                    error: error.message
                });
            });
        }
    }

    return results;
}

/**
 * Valida si una URL de imagen es accesible
 * @param {string} imageUrl - URL a validar
 * @returns {Promise<boolean>} True si es accesible
 */
async function validateImageUrl(imageUrl) {
    try {
        if (!imageUrl || !imageUrl.startsWith('http')) {
            return false;
        }

        const response = await axios.head(imageUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const contentType = response.headers['content-type'];
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

        return response.status === 200 && validTypes.includes(contentType);

    } catch (error) {
        console.error(`Error validando URL ${imageUrl}:`, error.message);
        return false;
    }
}

module.exports = {
    downloadImage,
    uploadImageToFirebase,
    importImage,
    importMultipleImages,
    validateImageUrl
};
