// backend/services/imageImportService.js
// Servicio para importar imágenes desde URLs del proveedor a Firebase Storage

const axios = require('axios');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { v4: uuidv4 } = require('uuid');

// Configuración de Firebase - usando la misma configuración que funciona en uploadProduct
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "eccomerce-jmcomputer.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Inicializar Firebase de forma lazy (solo cuando se necesite)
let app;
let storage;

function initializeFirebase() {
    if (!app) {
        try {
            // Verificar si ya existe una app de Firebase
            const { getApps } = require('firebase/app');
            const existingApps = getApps();
            
            if (existingApps.length > 0) {
                // console.log removed for production
                app = existingApps[0];
            } else {
                // console.log removed for production
                app = initializeApp(firebaseConfig);
            }
            
            // Usar getStorage con la app específica y el bucket específico
            storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
            // console.log removed for production
            // console.log removed for production
        } catch (error) {
            // console.error removed for production
            // console.error removed for production
            throw error;
        }
    }
    return { app, storage };
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

        // console.log removed for production

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

        // console.log removed for production
        return Buffer.from(response.data);

    } catch (error) {
        // console.error removed for production
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

        // console.log removed for production

        // Inicializar Firebase de forma lazy
        const { storage: firebaseStorage } = initializeFirebase();

        // Crear referencia en Firebase Storage
        const storageRef = ref(firebaseStorage, fullPath);

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

        // console.log removed for production
        return publicUrl;

    } catch (error) {
        // console.error removed for production
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
async function importImageFromUrl(imageUrl, providerCode, options = {}) {
    try {
        // console.log removed for production
        
        // 1. Descargar imagen
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        // console.log removed for production
        
        // 2. Convertir arraybuffer a File/Blob simulado para uploadImage
        const buffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'image/jpeg';
        
        // Crear un objeto similar a un archivo File del navegador
        const fakeFile = {
            buffer: buffer,
            originalname: `${providerCode}.jpg`,
            mimetype: contentType,
            size: buffer.length,
            name: `${providerCode}.jpg` // Agregar name para compatibilidad
        };
        
        // console.log removed for production
        
        // 3. Inicializar Firebase de forma lazy
        const { storage: firebaseStorage } = initializeFirebase();
        
        const uniqueId = uuidv4();
        const fileName = `${uniqueId}_${fakeFile.name.replace(/\s+/g, '_')}`;
        const fullPath = `products/${fileName}`;
        
        // console.log removed for production
        
        // Crear referencia en Firebase Storage
        const storageRef = ref(firebaseStorage, fullPath);
        
        // Subir archivo
        const snapshot = await uploadBytes(storageRef, buffer, {
            customMetadata: {
                providerCode: providerCode,
                originalUrl: imageUrl,
                uploadedAt: new Date().toISOString(),
                source: 'inventory_sync'
            }
        });
        
        // Obtener URL pública
        const publicUrl = await getDownloadURL(snapshot.ref);
        
        // console.log removed for production
        
        return {
            success: true,
            providerCode,
            originalUrl: imageUrl,
            publicUrl,
            fileSize: buffer.length
        };
        
    } catch (error) {
        // console.error removed for production
        throw error;
    }
}

// Mantener la función original para compatibilidad
async function importImage(imageUrl, providerCode, options = {}) {
    return await importImageFromUrl(imageUrl, providerCode, options);
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

    // console.log removed for production

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        // console.log removed for production

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
            // console.error removed for production
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
        // console.error removed for production
        return false;
    }
}

module.exports = {
    downloadImage,
    uploadImageToFirebase,
    importImage,
    importImageFromUrl,
    importMultipleImages,
    validateImageUrl
};
