// backend/services/imageImportService.js
// Servicio para importar imágenes desde URLs del proveedor a R2 (CDN) o Firebase Storage

const axios = require('axios');
const sharp = require('sharp');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');
const { v4: uuidv4 } = require('uuid');
const {
    isR2Configured,
    uploadBufferToR2,
    deleteObjectFromR2,
    isR2PublicUrl,
    r2KeyFromPublicUrl
} = require('./r2StorageService');

function useR2Storage() {
    const mode = (process.env.IMAGE_STORAGE || 'r2').toLowerCase();
    return mode === 'r2' && isR2Configured();
}

/** Misma política que scripts/webp-conversion-config.js */
const WEBP_OPTS = {
    quality: 85,
    effort: 6,
    maxWidth: 1920,
    maxHeight: 1080
};

/**
 * Convierte cualquier imagen soportada a WebP (único formato que subimos a Firebase).
 */
async function convertBufferToWebP(imageBuffer, options = {}) {
    const quality = options.quality != null ? options.quality : WEBP_OPTS.quality;
    const effort = options.effort != null ? options.effort : WEBP_OPTS.effort;
    const maxWidth = options.maxWidth != null ? options.maxWidth : WEBP_OPTS.maxWidth;
    const maxHeight = options.maxHeight != null ? options.maxHeight : WEBP_OPTS.maxHeight;

    const webpBuffer = await sharp(imageBuffer, { animated: false })
        .rotate()
        .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .webp({ quality, effort })
        .toBuffer();

    return webpBuffer;
}

// Configuración de Firebase - usando la misma configuración que funciona en uploadProduct
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "eccomerce-bluetec-saopaulo",
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
 * Sube una imagen (siempre WebP) a R2 CDN o Firebase según IMAGE_STORAGE.
 * @param {Buffer} imageBuffer - Buffer de la imagen (cualquier formato; se convierte)
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

        const webpBuffer = await convertBufferToWebP(imageBuffer);
        const uniqueId = uuidv4();
        const safeCode = String(providerCode).replace(/\s+/g, '_');
        const fileName = `${uniqueId}_${safeCode}.webp`;
        const fullPath = `products/${fileName}`;

        if (useR2Storage()) {
            return await uploadBufferToR2(webpBuffer, fullPath, {
                contentType: 'image/webp',
                metadata: {
                    providercode: String(providerCode).slice(0, 128),
                    source: 'inventory_sync',
                    format: 'webp'
                }
            });
        }

        const { storage: firebaseStorage } = initializeFirebase();
        const storageRef = ref(firebaseStorage, fullPath);

        const snapshot = await uploadBytes(storageRef, webpBuffer, {
            contentType: 'image/webp',
            customMetadata: {
                providerCode: String(providerCode),
                originalUrl: originalUrl || '',
                uploadedAt: new Date().toISOString(),
                source: 'inventory_sync',
                format: 'webp'
            }
        });

        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        throw error;
    }
}

/**
 * Importa una imagen completa: descarga desde URL del proveedor, convierte a WebP y sube a Firebase
 * @param {string} imageUrl - URL de la imagen del proveedor
 * @param {string} providerCode - Código del producto del proveedor
 * @param {Object} options - Opciones adicionales (quality, maxWidth, maxHeight, effort)
 * @returns {Promise<Object>} Resultado de la importación
 */
async function importImageFromUrl(imageUrl, providerCode, options = {}) {
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const originalBuffer = Buffer.from(response.data);
        if (!originalBuffer.length) {
            throw new Error('Imagen vacía');
        }

        const webpBuffer = await convertBufferToWebP(originalBuffer, options);

        const uniqueId = uuidv4();
        const safeCode = String(providerCode).replace(/\s+/g, '_');
        const fileName = `${uniqueId}_${safeCode}.webp`;
        const fullPath = `products/${fileName}`;

        let publicUrl;
        if (useR2Storage()) {
            publicUrl = await uploadBufferToR2(webpBuffer, fullPath, {
                contentType: 'image/webp',
                metadata: {
                    providercode: String(providerCode).slice(0, 128),
                    source: 'inventory_sync',
                    format: 'webp'
                }
            });
        } else {
            const { storage: firebaseStorage } = initializeFirebase();
            const storageRef = ref(firebaseStorage, fullPath);
            const snapshot = await uploadBytes(storageRef, webpBuffer, {
                contentType: 'image/webp',
                customMetadata: {
                    providerCode: String(providerCode),
                    originalUrl: imageUrl,
                    uploadedAt: new Date().toISOString(),
                    source: 'inventory_sync',
                    format: 'webp',
                    originalBytes: String(originalBuffer.length),
                    webpBytes: String(webpBuffer.length)
                }
            });
            publicUrl = await getDownloadURL(snapshot.ref);
        }

        return {
            success: true,
            providerCode,
            originalUrl: imageUrl,
            publicUrl,
            fileSize: webpBuffer.length,
            originalFileSize: originalBuffer.length,
            format: 'webp',
            storage: useR2Storage() ? 'r2' : 'firebase'
        };
    } catch (error) {
        throw error;
    }
}

function sleepMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reintentos tras fallo de red / Firebase (útil en sync masivo).
 * @param {number} extraRetries - Reintentos tras el primer intento (2 = 3 intentos en total).
 */
async function importImageFromUrlWithRetries(
    imageUrl,
    providerCode,
    options = {},
    extraRetries = 2
) {
    let lastErr;
    const tries = Math.max(0, extraRetries) + 1;
    for (let attempt = 0; attempt < tries; attempt++) {
        try {
            return await importImageFromUrl(imageUrl, providerCode, options);
        } catch (e) {
            lastErr = e;
            if (attempt + 1 < tries) {
                await sleepMs(450 + Math.floor(Math.random() * 450));
            }
        }
    }
    throw lastErr;
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
 * True si la URL es de nuestro storage (R2 CDN o Firebase), no CDN Visão.
 */
function isFirebaseStorageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (isR2PublicUrl(url)) return true;
    return (
        url.includes('firebasestorage.googleapis.com') ||
        url.includes('firebasestorage.app') ||
        url.includes('storage.googleapis.com')
    );
}

/**
 * Extrae la ruta del objeto a partir de una URL pública (R2 o Firebase/GCS).
 * @returns {string|null}
 */
function storagePathFromPublicUrl(url) {
    const r2Key = r2KeyFromPublicUrl(url);
    if (r2Key) return r2Key;

    if (!url || typeof url !== 'string') return null;
    if (
        !url.includes('firebasestorage.googleapis.com') &&
        !url.includes('firebasestorage.app') &&
        !url.includes('storage.googleapis.com')
    ) {
        return null;
    }
    try {
        const encoded = url.match(/\/o\/([^?&#]+)/);
        if (encoded) return decodeURIComponent(encoded[1]);

        const gcs = url.match(/storage\.googleapis\.com\/[^/]+\/(.+?)(?:\?|$)/);
        if (gcs) return decodeURIComponent(gcs[1]);

        const appHost = url.match(/firebasestorage\.app\/(.+?)(?:\?|$)/);
        if (appHost) return decodeURIComponent(appHost[1]);
    } catch {
        return null;
    }
    return null;
}

/**
 * Borra un archivo de R2 o Firebase a partir de su URL pública.
 * Ignora URLs ajenas (p. ej. cdn.visaovip.com).
 */
async function deleteFirebaseImageByUrl(imageUrl) {
    if (isR2PublicUrl(imageUrl) && isR2Configured()) {
        const key = r2KeyFromPublicUrl(imageUrl);
        if (!key) {
            return { deleted: false, skipped: true, reason: 'not_r2_url' };
        }
        try {
            await deleteObjectFromR2(key);
            return { deleted: true, path: key, storage: 'r2' };
        } catch (error) {
            const code = error && (error.name || error.Code || error.message);
            if (code === 'NoSuchKey' || code === 'NotFound') {
                return { deleted: false, skipped: true, reason: 'already_gone', path: key };
            }
            return {
                deleted: false,
                error: error.message || String(error),
                path: key
            };
        }
    }

    const fullPath = storagePathFromPublicUrl(imageUrl);
    if (!fullPath || isR2PublicUrl(imageUrl)) {
        return { deleted: false, skipped: true, reason: 'not_firebase_url' };
    }
    try {
        const { storage: firebaseStorage } = initializeFirebase();
        const storageRef = ref(firebaseStorage, fullPath);
        await deleteObject(storageRef);
        return { deleted: true, path: fullPath, storage: 'firebase' };
    } catch (error) {
        const code = error && (error.code || error.message);
        if (
            code === 'storage/object-not-found' ||
            (typeof code === 'string' && code.includes('object-not-found'))
        ) {
            return { deleted: false, skipped: true, reason: 'already_gone', path: fullPath };
        }
        return {
            deleted: false,
            error: error.message || String(error),
            path: fullPath
        };
    }
}

/**
 * Borra en paralelo (con tope) todas las URLs de Firebase de una lista.
 */
async function deleteFirebaseImages(urls, options = {}) {
    const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
    const maxConcurrent = options.maxConcurrent != null ? Math.max(1, options.maxConcurrent) : 8;
    const firebaseUrls = list.filter(isFirebaseStorageUrl);
    const results = [];

    for (let i = 0; i < firebaseUrls.length; i += maxConcurrent) {
        const chunk = firebaseUrls.slice(i, i + maxConcurrent);
        const chunkRes = await Promise.all(chunk.map((u) => deleteFirebaseImageByUrl(u)));
        results.push(...chunkRes);
    }

    return {
        attempted: firebaseUrls.length,
        deleted: results.filter((r) => r.deleted).length,
        skipped: results.filter((r) => r.skipped).length,
        failed: results.filter((r) => r.error).length,
        results
    };
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
    importImageFromUrlWithRetries,
    importMultipleImages,
    validateImageUrl,
    isFirebaseStorageUrl,
    storagePathFromPublicUrl,
    deleteFirebaseImageByUrl,
    deleteFirebaseImages,
    convertBufferToWebP,
    WEBP_OPTS
};
