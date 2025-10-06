// backend/scripts/migrateSingleProduct.js - VERSIÓN FINAL CON FIREBASE SDK
// Usa Firebase SDK con configuración correcta para autenticación

const mongoose = require('mongoose');
const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const crypto = require('crypto');
require('dotenv').config();

// ===== CONFIGURACIÓN =====
const MIGRATION_CONFIG = {
    // Producto específico para prueba
    TEST_PRODUCT_ID: '67b343ea45a2c1e4df25849d',
    
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
    
    // Configuración de migración
    FOLDER_STRUCTURE: 'products/',
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    VERIFY_UPLOAD: true,
    CREATE_BACKUP: true
};

// ===== MODELO DE PRODUCTO =====
const productModel = require('../models/productModel');

// ===== INICIALIZAR FIREBASE =====
let app;
let storage;

try {
    // Verificar variables de entorno requeridas
    const requiredVars = [
        'REACT_APP_FIREBASE_API_KEY',
        'REACT_APP_FIREBASE_PROJECT_ID',
        'REACT_APP_FIREBASE_AUTH_DOMAIN'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Variables de entorno faltantes: ${missingVars.join(', ')}`);
    }
    
    // Inicializar Firebase con el NUEVO bucket
    app = initializeApp(MIGRATION_CONFIG.FIREBASE_CONFIG, 'migration-app');
    storage = getStorage(app);
    
    
    
} catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    process.exit(1);
}

// ===== FUNCIONES AUXILIARES =====

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const emoji = {
        'INFO': '📋',
        'SUCCESS': '✅',
        'ERROR': '❌',
        'WARNING': '⚠️',
        'PROGRESS': '🔄'
    }[type] || '📋';
    
    
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
    });
}

async function downloadImage(imageUrl) {
    log(`Descargando imagen: ${imageUrl.substring(0, 80)}...`, 'PROGRESS');
    
    try {
        const response = await fetchNative(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        log(`Imagen descargada exitosamente (${buffer.length} bytes)`, 'SUCCESS');
        return buffer;
    } catch (error) {
        log(`Error descargando imagen: ${error.message}`, 'ERROR');
        throw error;
    }
}

function extractFileName(firebaseUrl) {
    try {
        // Firebase URLs: ...%2Fproducts%2Fnombre-archivo.jpg?alt=media...
        const match = firebaseUrl.match(/products%2F([^?&]+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }
        
        // Fallback: generar nombre único
        const uniqueId = crypto.randomUUID();
        const extension = firebaseUrl.includes('.jpg') ? '.jpg' : 
                         firebaseUrl.includes('.png') ? '.png' : 
                         firebaseUrl.includes('.webp') ? '.webp' : '.jpg';
        
        return `migrated_${uniqueId}${extension}`;
    } catch (error) {
        log(`Error extrayendo nombre: ${error.message}`, 'WARNING');
        return `migrated_${crypto.randomUUID()}.jpg`;
    }
}

async function uploadToNewBucket(imageBuffer, fileName, productId) {
    const fullPath = `${MIGRATION_CONFIG.FOLDER_STRUCTURE}${fileName}`;
    
    log(`Subiendo archivo: ${fullPath}`, 'PROGRESS');
    
    try {
        // Crear referencia al archivo en el nuevo bucket
        const storageRef = ref(storage, fullPath);
        
        // Subir el archivo
        const snapshot = await uploadBytes(storageRef, imageBuffer, {
            customMetadata: {
                productId: productId,
                migratedAt: new Date().toISOString(),
                originalBucket: 'eccomerce-jmcomputer.firebasestorage.app'
            }
        });
        
        // Obtener URL pública
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        log(`Imagen subida exitosamente: ${downloadURL}`, 'SUCCESS');
        return downloadURL;
    } catch (error) {
        log(`Error subiendo imagen: ${error.message}`, 'ERROR');
        throw error;
    }
}

async function verifyImageUrl(url) {
    try {
        const response = await fetchNative(url);
        return response.ok;
    } catch (error) {
        log(`Error verificando URL: ${error.message}`, 'ERROR');
        return false;
    }
}

async function migrateImage(imageUrl, productId, imageIndex) {
    let lastError;
    
    for (let attempt = 1; attempt <= MIGRATION_CONFIG.MAX_RETRIES; attempt++) {
        try {
            log(`Intento ${attempt}/${MIGRATION_CONFIG.MAX_RETRIES} - Imagen ${imageIndex + 1}`, 'PROGRESS');
            
            // Descargar imagen
            const imageBuffer = await downloadImage(imageUrl);
            
            // Extraer nombre de archivo
            const fileName = extractFileName(imageUrl);
            
            // Subir al nuevo bucket
            const newUrl = await uploadToNewBucket(imageBuffer, fileName, productId);
            
            // Verificar que la nueva URL funciona
            if (MIGRATION_CONFIG.VERIFY_UPLOAD) {
                log('Verificando que la nueva URL funciona...', 'PROGRESS');
                
                // Esperar un poco para que se propague
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const isWorking = await verifyImageUrl(newUrl);
                if (!isWorking) {
                    log('⚠️ URL no verificable inmediatamente, pero upload exitoso', 'WARNING');
                } else {
                    log('✅ Nueva URL verificada correctamente', 'SUCCESS');
                }
            }
            
            return newUrl;
            
        } catch (error) {
            lastError = error;
            log(`Intento ${attempt} falló: ${error.message}`, 'ERROR');
            
            if (attempt < MIGRATION_CONFIG.MAX_RETRIES) {
                log(`Esperando ${MIGRATION_CONFIG.RETRY_DELAY}ms antes del siguiente intento...`, 'WARNING');
                await new Promise(resolve => setTimeout(resolve, MIGRATION_CONFIG.RETRY_DELAY));
            }
        }
    }
    
    throw new Error(`Falló después de ${MIGRATION_CONFIG.MAX_RETRIES} intentos: ${lastError.message}`);
}

async function migrateSingleProduct() {
    try {
        log('🚀 INICIANDO MIGRACIÓN DE PRODUCTO ESPECÍFICO', 'INFO');
        log(`Producto ID: ${MIGRATION_CONFIG.TEST_PRODUCT_ID}`, 'INFO');
        log(`Bucket destino: eccomerce-zenn-saopaulo`, 'INFO');
        
        // Conectar a MongoDB
        log('Conectando a MongoDB...', 'PROGRESS');
        await mongoose.connect(process.env.MONGODB_URI);
        log('✅ Conectado a MongoDB', 'SUCCESS');
        
        // Buscar el producto
        log('Buscando producto en la base de datos...', 'PROGRESS');
        const product = await productModel.findById(MIGRATION_CONFIG.TEST_PRODUCT_ID);
        
        if (!product) {
            throw new Error(`Producto no encontrado: ${MIGRATION_CONFIG.TEST_PRODUCT_ID}`);
        }
        
        log(`✅ Producto encontrado: ${product.productName}`, 'SUCCESS');
        log(`Imágenes a migrar: ${product.productImage.length}`, 'INFO');
        
        // Crear backup de URLs originales
        const originalImages = [...product.productImage];
        log('✅ Backup de URLs originales creado', 'SUCCESS');
        
        // Migrar cada imagen
        const newImageUrls = [];
        
        for (let i = 0; i < product.productImage.length; i++) {
            const originalUrl = product.productImage[i];
            log(`\n📸 Migrando imagen ${i + 1}/${product.productImage.length}`, 'INFO');
            
            try {
                const newUrl = await migrateImage(originalUrl, product._id, i);
                newImageUrls.push(newUrl);
                log(`✅ Imagen ${i + 1} migrada exitosamente`, 'SUCCESS');
            } catch (error) {
                log(`❌ Error migrando imagen ${i + 1}: ${error.message}`, 'ERROR');
                // En caso de error, mantener la URL original
                newImageUrls.push(originalUrl);
                log(`⚠️ Manteniendo URL original para imagen ${i + 1}`, 'WARNING');
            }
        }
        
        // Actualizar producto en la base de datos
        log('\n💾 Actualizando producto en la base de datos...', 'PROGRESS');
        
        const updateData = {
            productImage: newImageUrls,
            updatedAt: new Date()
        };
        
        // Agregar backup si está habilitado
        if (MIGRATION_CONFIG.CREATE_BACKUP) {
            updateData.productImageBackup = originalImages;
            updateData.migrationDate = new Date();
        }
        
        await productModel.findByIdAndUpdate(product._id, updateData);
        
        log('✅ Producto actualizado en la base de datos', 'SUCCESS');
        
        // Resumen final
        log('\n📊 RESUMEN DE MIGRACIÓN', 'SUCCESS');
        log(`Producto: ${product.productName}`, 'INFO');
        log(`Total de imágenes: ${product.productImage.length}`, 'INFO');
        log(`Imágenes migradas: ${newImageUrls.filter(url => !originalImages.includes(url)).length}`, 'SUCCESS');
        log(`Imágenes con error: ${newImageUrls.filter(url => originalImages.includes(url)).length}`, 'WARNING');
        
        
        newImageUrls.forEach((url, index) => {
            
        });
        
        if (MIGRATION_CONFIG.CREATE_BACKUP) {
            
            originalImages.forEach((url, index) => {
                
            });
        }
        
        log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE', 'SUCCESS');
        
        return {
            success: true,
            productId: product._id,
            productName: product.productName,
            originalUrls: originalImages,
            newUrls: newImageUrls,
            migratedCount: newImageUrls.filter(url => !originalImages.includes(url)).length,
            errorCount: newImageUrls.filter(url => originalImages.includes(url)).length
        };
        
    } catch (error) {
        log(`💥 ERROR CRÍTICO: ${error.message}`, 'ERROR');
        console.error('Stack trace:', error.stack);
        throw error;
    } finally {
        // Cerrar conexión a MongoDB
        await mongoose.connection.close();
        log('🔌 Conexión a MongoDB cerrada', 'INFO');
    }
}

async function rollbackProduct() {
    try {
        log('🔄 INICIANDO ROLLBACK', 'WARNING');
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        const product = await productModel.findById(MIGRATION_CONFIG.TEST_PRODUCT_ID);
        if (!product || !product.productImageBackup) {
            throw new Error('No se encontró backup para hacer rollback');
        }
        
        await productModel.findByIdAndUpdate(product._id, {
            productImage: product.productImageBackup,
            updatedAt: new Date()
        });
        
        log('✅ ROLLBACK COMPLETADO - URLs restauradas', 'SUCCESS');
        
    } catch (error) {
        log(`❌ Error en rollback: ${error.message}`, 'ERROR');
        throw error;
    } finally {
        await mongoose.connection.close();
    }
}

async function testConnection() {
    try {
        log('🧪 PROBANDO CONEXIÓN CON FIREBASE STORAGE...', 'INFO');
        
        // Probar subida de archivo test usando Firebase SDK
        log('Probando subida con Firebase SDK...', 'PROGRESS');
        const testFileName = `test-connection-${Date.now()}.txt`;
        const testContent = `Test de conexión exitoso - ${new Date().toISOString()}`;
        const testBuffer = Buffer.from(testContent, 'utf8');
        
        // Crear referencia
        const storageRef = ref(storage, testFileName);
        
        // Subir archivo
        const snapshot = await uploadBytes(storageRef, testBuffer);
        log('✅ Archivo test subido exitosamente', 'SUCCESS');
        
        // Obtener URL pública
        const downloadURL = await getDownloadURL(snapshot.ref);
        log(`✅ URL pública generada: ${downloadURL}`, 'SUCCESS');
        
        // Verificar acceso público (con pequeña espera)
        await new Promise(resolve => setTimeout(resolve, 2000));
        const isAccessible = await verifyImageUrl(downloadURL);
        if (isAccessible) {
            log('✅ Acceso público verificado correctamente', 'SUCCESS');
        } else {
            log('⚠️ Archivo subido, verificación de acceso puede tomar tiempo', 'WARNING');
        }
        
        log('🎉 PRUEBA DE CONEXIÓN EXITOSA', 'SUCCESS');
        log('🚀 El bucket está listo para la migración', 'INFO');
        
    } catch (error) {
        log(`❌ Error en prueba de conexión: ${error.message}`, 'ERROR');
        
        // Información adicional para debug
        log('Debug info:', 'INFO');
        log(`Bucket configurado: eccomerce-zenn-saopaulo`, 'INFO');
        log(`Firebase Project ID: ${process.env.REACT_APP_FIREBASE_PROJECT_ID}`, 'INFO');
        
        throw error;
    }
}

// ===== EJECUCIÓN =====
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'migrate';
    
    try {
        switch (command) {
            case 'migrate':
                await migrateSingleProduct();
                break;
            case 'rollback':
                await rollbackProduct();
                break;
            case 'test-connection':
                await testConnection();
                break;
            default:
                
                
                
                
        }
    } catch (error) {
        log(`💥 Error ejecutando comando '${command}': ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Error no capturado:', error);
        process.exit(1);
    });
}

module.exports = {
    migrateSingleProduct,
    rollbackProduct,
    testConnection,
    MIGRATION_CONFIG
};