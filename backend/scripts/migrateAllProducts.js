// backend/scripts/migrateAllProducts.js - MIGRACIÓN MASIVA DE TODOS LOS PRODUCTOS
// Migra todos los productos en lotes seguros con estadísticas completas

const mongoose = require('mongoose');
const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const crypto = require('crypto');
require('dotenv').config();

// ===== CONFIGURACIÓN =====
const MIGRATION_CONFIG = {
    // Configuración Firebase para el NUEVO bucket
    FIREBASE_CONFIG: {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: "eccomerce-zenn-saopaulo", // ⚠️ NUEVO BUCKET
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
        measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
    },
    
    // Configuración de migración masiva
    FOLDER_STRUCTURE: 'products/',
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    VERIFY_UPLOAD: true,
    CREATE_BACKUP: true,
    
    // Configuración de lotes para evitar sobrecarga
    BATCH_SIZE: 10, // Productos por lote
    DELAY_BETWEEN_BATCHES: 5000, // 5 segundos entre lotes
    DELAY_BETWEEN_PRODUCTS: 1000, // 1 segundo entre productos
    DELAY_BETWEEN_IMAGES: 500, // 0.5 segundos entre imágenes
    
    // Configuración de logging
    LOG_PROGRESS_EVERY: 5, // Log cada 5 productos
    SAVE_PROGRESS_FILE: true // Guardar progreso en archivo
};

// ===== MODELO DE PRODUCTO =====
const productModel = require('../models/productModel');

// ===== INICIALIZAR FIREBASE =====
let app;
let storage;

try {
    const requiredVars = [
        'REACT_APP_FIREBASE_API_KEY',
        'REACT_APP_FIREBASE_PROJECT_ID',
        'REACT_APP_FIREBASE_AUTH_DOMAIN'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Variables de entorno faltantes: ${missingVars.join(', ')}`);
    }
    
    app = initializeApp(MIGRATION_CONFIG.FIREBASE_CONFIG, 'mass-migration');
    storage = getStorage(app);
    
    console.log('✅ Firebase inicializado correctamente');
    console.log(`📋 Bucket objetivo: eccomerce-zenn-saopaulo`);
} catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    process.exit(1);
}

// ===== ESTADÍSTICAS Y PROGRESO =====
const migrationStats = {
    startTime: null,
    totalProducts: 0,
    processedProducts: 0,
    successfulProducts: 0,
    failedProducts: 0,
    totalImages: 0,
    migratedImages: 0,
    failedImages: 0,
    skippedProducts: 0, // Productos ya migrados
    failedProductsList: [],
    currentBatch: 0,
    totalBatches: 0
};

// ===== FUNCIONES AUXILIARES =====

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const emoji = {
        'INFO': '📋',
        'SUCCESS': '✅',
        'ERROR': '❌',
        'WARNING': '⚠️',
        'PROGRESS': '🔄',
        'STATS': '📊'
    }[type] || '📋';
    
    console.log(`${emoji} [${timestamp}] ${message}`);
}

function logProgress() {
    const elapsed = Date.now() - migrationStats.startTime;
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
    
    const progressPercent = Math.round((migrationStats.processedProducts / migrationStats.totalProducts) * 100);
    const avgTimePerProduct = migrationStats.processedProducts > 0 ? elapsed / migrationStats.processedProducts : 0;
    const remainingProducts = migrationStats.totalProducts - migrationStats.processedProducts;
    const estimatedRemainingTime = Math.round((remainingProducts * avgTimePerProduct) / 60000);
    
    log(`PROGRESO: ${progressPercent}% (${migrationStats.processedProducts}/${migrationStats.totalProducts})`, 'STATS');
    log(`Exitosos: ${migrationStats.successfulProducts} | Fallidos: ${migrationStats.failedProducts} | Saltados: ${migrationStats.skippedProducts}`, 'STATS');
    log(`Imágenes: ${migrationStats.migratedImages}/${migrationStats.totalImages}`, 'STATS');
    log(`Tiempo: ${elapsedMinutes}m ${elapsedSeconds}s | ETA: ~${estimatedRemainingTime}m`, 'STATS');
    log(`Lote: ${migrationStats.currentBatch}/${migrationStats.totalBatches}`, 'STATS');
    console.log('─'.repeat(80));
}

// Función fetch nativa para descargar imágenes
function fetchNative(url) {
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP error! status: ${res.statusCode}`));
                return;
            }
            
            let data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(data);
                resolve({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
                });
            });
        });
        
        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.abort();
            reject(new Error('Request timeout'));
        });
    });
}

async function downloadImage(imageUrl) {
    try {
        const response = await fetchNative(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return buffer;
    } catch (error) {
        throw new Error(`Error descargando imagen: ${error.message}`);
    }
}

function extractFileName(firebaseUrl) {
    try {
        const match = firebaseUrl.match(/products%2F([^?&]+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }
        
        const uniqueId = crypto.randomUUID();
        const extension = firebaseUrl.includes('.jpg') ? '.jpg' : 
                         firebaseUrl.includes('.png') ? '.png' : 
                         firebaseUrl.includes('.webp') ? '.webp' : '.jpg';
        
        return `migrated_${uniqueId}${extension}`;
    } catch (error) {
        return `migrated_${crypto.randomUUID()}.jpg`;
    }
}

async function uploadToNewBucket(imageBuffer, fileName, productId) {
    const fullPath = `${MIGRATION_CONFIG.FOLDER_STRUCTURE}${fileName}`;
    
    try {
        const storageRef = ref(storage, fullPath);
        
        const snapshot = await uploadBytes(storageRef, imageBuffer, {
            customMetadata: {
                productId: productId,
                migratedAt: new Date().toISOString(),
                originalBucket: 'eccomerce-jmcomputer.firebasestorage.app'
            }
        });
        
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        throw new Error(`Error subiendo imagen: ${error.message}`);
    }
}

async function verifyImageUrl(url) {
    try {
        const response = await fetchNative(url);
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function migrateImage(imageUrl, productId, imageIndex) {
    let lastError;
    
    for (let attempt = 1; attempt <= MIGRATION_CONFIG.MAX_RETRIES; attempt++) {
        try {
            const imageBuffer = await downloadImage(imageUrl);
            const fileName = extractFileName(imageUrl);
            const newUrl = await uploadToNewBucket(imageBuffer, fileName, productId);
            
            if (MIGRATION_CONFIG.VERIFY_UPLOAD) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const isWorking = await verifyImageUrl(newUrl);
                if (!isWorking) {
                    // No es crítico si no se puede verificar inmediatamente
                    log(`Imagen subida pero verificación falló: ${newUrl}`, 'WARNING');
                }
            }
            
            migrationStats.migratedImages++;
            return newUrl;
            
        } catch (error) {
            lastError = error;
            if (attempt < MIGRATION_CONFIG.MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, MIGRATION_CONFIG.RETRY_DELAY));
            }
        }
    }
    
    migrationStats.failedImages++;
    throw new Error(`Falló después de ${MIGRATION_CONFIG.MAX_RETRIES} intentos: ${lastError.message}`);
}

async function migrateProduct(product) {
    try {
        // Verificar si ya está migrado
        if (product.migrationDate || product.productImageBackup) {
            log(`Producto ya migrado: ${product.productName}`, 'WARNING');
            migrationStats.skippedProducts++;
            return { success: true, skipped: true };
        }
        
        log(`Migrando: ${product.productName} (${product.productImage.length} imágenes)`, 'PROGRESS');
        
        const originalImages = [...product.productImage];
        const newImageUrls = [];
        
        for (let i = 0; i < product.productImage.length; i++) {
            const originalUrl = product.productImage[i];
            
            try {
                const newUrl = await migrateImage(originalUrl, product._id, i);
                newImageUrls.push(newUrl);
                
                // Pequeña pausa entre imágenes
                if (i < product.productImage.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, MIGRATION_CONFIG.DELAY_BETWEEN_IMAGES));
                }
            } catch (error) {
                log(`Error en imagen ${i + 1}: ${error.message}`, 'ERROR');
                newImageUrls.push(originalUrl); // Mantener original
            }
        }
        
        // Actualizar base de datos
        const updateData = {
            productImage: newImageUrls,
            updatedAt: new Date()
        };
        
        if (MIGRATION_CONFIG.CREATE_BACKUP) {
            updateData.productImageBackup = originalImages;
            updateData.migrationDate = new Date();
        }
        
        await productModel.findByIdAndUpdate(product._id, updateData);
        
        migrationStats.successfulProducts++;
        return { 
            success: true, 
            migratedImages: newImageUrls.filter(url => !originalImages.includes(url)).length 
        };
        
    } catch (error) {
        log(`Error crítico en producto ${product.productName}: ${error.message}`, 'ERROR');
        migrationStats.failedProducts++;
        migrationStats.failedProductsList.push({
            id: product._id,
            name: product.productName,
            error: error.message
        });
        return { success: false, error: error.message };
    }
}

async function migrateAllProducts() {
    try {
        migrationStats.startTime = Date.now();
        
        log('🚀 INICIANDO MIGRACIÓN MASIVA DE TODOS LOS PRODUCTOS', 'INFO');
        
        // Conectar a MongoDB
        log('Conectando a MongoDB...', 'PROGRESS');
        await mongoose.connect(process.env.MONGODB_URI);
        log('✅ Conectado a MongoDB', 'SUCCESS');
        
        // Obtener todos los productos que no están migrados
        log('Obteniendo lista de productos...', 'PROGRESS');
        const products = await productModel.find({
            $and: [
                { productImage: { $exists: true, $ne: [] } },
                { 
                    $or: [
                        { migrationDate: { $exists: false } },
                        { productImageBackup: { $exists: false } }
                    ]
                }
            ]
        }).select('_id productName productImage migrationDate productImageBackup');
        
        migrationStats.totalProducts = products.length;
        migrationStats.totalImages = products.reduce((sum, p) => sum + (p.productImage?.length || 0), 0);
        migrationStats.totalBatches = Math.ceil(products.length / MIGRATION_CONFIG.BATCH_SIZE);
        
        log(`📊 ESTADÍSTICAS INICIALES:`, 'STATS');
        log(`Total productos a migrar: ${migrationStats.totalProducts}`, 'INFO');
        log(`Total imágenes estimadas: ${migrationStats.totalImages}`, 'INFO');
        log(`Lotes planificados: ${migrationStats.totalBatches}`, 'INFO');
        log(`Tamaño de lote: ${MIGRATION_CONFIG.BATCH_SIZE} productos`, 'INFO');
        console.log('═'.repeat(80));
        
        if (migrationStats.totalProducts === 0) {
            log('🎉 Todos los productos ya están migrados', 'SUCCESS');
            return;
        }
        
        // Procesar en lotes
        for (let i = 0; i < products.length; i += MIGRATION_CONFIG.BATCH_SIZE) {
            migrationStats.currentBatch++;
            const batch = products.slice(i, i + MIGRATION_CONFIG.BATCH_SIZE);
            
            log(`🔄 PROCESANDO LOTE ${migrationStats.currentBatch}/${migrationStats.totalBatches} (${batch.length} productos)`, 'PROGRESS');
            
            for (const product of batch) {
                await migrateProduct(product);
                migrationStats.processedProducts++;
                
                // Log de progreso cada X productos
                if (migrationStats.processedProducts % MIGRATION_CONFIG.LOG_PROGRESS_EVERY === 0) {
                    logProgress();
                }
                
                // Pausa entre productos
                if (MIGRATION_CONFIG.DELAY_BETWEEN_PRODUCTS > 0) {
                    await new Promise(resolve => setTimeout(resolve, MIGRATION_CONFIG.DELAY_BETWEEN_PRODUCTS));
                }
            }
            
            // Pausa entre lotes (excepto el último)
            if (migrationStats.currentBatch < migrationStats.totalBatches) {
                log(`⏸️ Pausa entre lotes (${MIGRATION_CONFIG.DELAY_BETWEEN_BATCHES}ms)...`, 'INFO');
                await new Promise(resolve => setTimeout(resolve, MIGRATION_CONFIG.DELAY_BETWEEN_BATCHES));
            }
        }
        
        // Estadísticas finales
        const totalTime = Date.now() - migrationStats.startTime;
        const totalMinutes = Math.floor(totalTime / 60000);
        const totalSeconds = Math.floor((totalTime % 60000) / 1000);
        
        console.log('═'.repeat(80));
        log('🎉 MIGRACIÓN MASIVA COMPLETADA', 'SUCCESS');
        log('📊 ESTADÍSTICAS FINALES:', 'STATS');
        log(`Total productos procesados: ${migrationStats.processedProducts}`, 'INFO');
        log(`Productos exitosos: ${migrationStats.successfulProducts}`, 'SUCCESS');
        log(`Productos fallidos: ${migrationStats.failedProducts}`, 'ERROR');
        log(`Productos saltados (ya migrados): ${migrationStats.skippedProducts}`, 'WARNING');
        log(`Total imágenes migradas: ${migrationStats.migratedImages}`, 'SUCCESS');
        log(`Imágenes fallidas: ${migrationStats.failedImages}`, 'ERROR');
        log(`Tiempo total: ${totalMinutes}m ${totalSeconds}s`, 'INFO');
        
        if (migrationStats.failedProductsList.length > 0) {
            console.log('\n❌ PRODUCTOS CON ERRORES:');
            migrationStats.failedProductsList.forEach((item, index) => {
                console.log(`${index + 1}. ${item.name} (ID: ${item.id})`);
                console.log(`   Error: ${item.error}`);
            });
        }
        
        const successRate = Math.round((migrationStats.successfulProducts / migrationStats.processedProducts) * 100);
        log(`Tasa de éxito: ${successRate}%`, successRate >= 95 ? 'SUCCESS' : successRate >= 80 ? 'WARNING' : 'ERROR');
        
        return {
            success: true,
            stats: migrationStats
        };
        
    } catch (error) {
        log(`💥 ERROR CRÍTICO EN MIGRACIÓN MASIVA: ${error.message}`, 'ERROR');
        console.error('Stack trace:', error.stack);
        throw error;
    } finally {
        await mongoose.connection.close();
        log('🔌 Conexión a MongoDB cerrada', 'INFO');
    }
}

// Función para obtener estadísticas sin migrar
async function getStats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const totalProducts = await productModel.countDocuments({
            productImage: { $exists: true, $ne: [] }
        });
        
        const migratedProducts = await productModel.countDocuments({
            $and: [
                { productImage: { $exists: true, $ne: [] } },
                { migrationDate: { $exists: true } },
                { productImageBackup: { $exists: true } }
            ]
        });
        
        const pendingProducts = totalProducts - migratedProducts;
        
        console.log('📊 ESTADÍSTICAS DE MIGRACIÓN:');
        console.log(`Total productos con imágenes: ${totalProducts}`);
        console.log(`Productos ya migrados: ${migratedProducts}`);
        console.log(`Productos pendientes: ${pendingProducts}`);
        console.log(`Progreso: ${Math.round((migratedProducts / totalProducts) * 100)}%`);
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
    }
}

// ===== EJECUCIÓN =====
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'migrate';
    
    try {
        switch (command) {
            case 'migrate':
                await migrateAllProducts();
                break;
            case 'stats':
                await getStats();
                break;
            default:
                console.log('Comandos disponibles:');
                console.log('  migrate  - Migrar todos los productos pendientes');
                console.log('  stats    - Ver estadísticas de migración');
        }
    } catch (error) {
        log(`💥 Error ejecutando comando '${command}': ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('💥 Error no capturado:', error);
        process.exit(1);
    });
}

module.exports = {
    migrateAllProducts,
    getStats,
    MIGRATION_CONFIG,
    migrationStats
};