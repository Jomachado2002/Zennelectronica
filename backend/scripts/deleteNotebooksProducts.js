// backend/scripts/deleteNotebooksProducts.js
// Script para eliminar todos los productos de la subcategoría "notebooks" y sus imágenes de Firebase

const mongoose = require('mongoose');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, deleteObject } = require('firebase/storage');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBizDZqVCrTnU1-D5ajvaNCx0ZrRM_uLUo",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "eccomerce-jmcomputer.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "eccomerce-jmcomputer",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "eccomerce-jmcomputer.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "283552064252",
  appId: process.env.FIREBASE_APP_ID || "1:283552064252:web:04049ae8f8c2cfa1906d79",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-CZMQK251CP"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Importar el modelo de Producto
const ProductModel = require('../models/productModel');

// Configuración de logging
const log = (message, type = 'INFO') => {
    const timestamp = new Date().toISOString();
    const colors = {
        'INFO': '\x1b[36m',    // Cyan
        'SUCCESS': '\x1b[32m', // Green
        'WARNING': '\x1b[33m', // Yellow
        'ERROR': '\x1b[31m',   // Red
        'PROGRESS': '\x1b[35m' // Magenta
    };
    const reset = '\x1b[0m';
    // console.log removed for production
};

/**
 * Extrae la ruta del archivo en Firebase Storage desde una URL de Firebase
 * @param {string} firebaseUrl - URL completa de Firebase Storage
 * @returns {string|null} - Ruta del archivo en Firebase Storage o null si no es válida
 */
function extractFirebasePath(firebaseUrl) {
    try {
        // Patrón para URLs de Firebase Storage
        const firebasePattern = /firebasestorage\.googleapis\.com\/v0\/b\/([^\/]+)\/o\/([^?]+)/;
        const match = firebaseUrl.match(firebasePattern);
        
        if (match) {
            // Decodificar la ruta del archivo (puede estar URL encoded)
            const filePath = decodeURIComponent(match[2]);
            log(`Ruta extraída: ${filePath}`, 'INFO');
            return filePath;
        }
        
        // Patrón alternativo para URLs más simples
        const simplePattern = /firebasestorage\.googleapis\.com.*%2F([^?]+)/;
        const simpleMatch = firebaseUrl.match(simplePattern);
        
        if (simpleMatch) {
            const filePath = decodeURIComponent(simpleMatch[1]);
            log(`Ruta extraída (patrón simple): ${filePath}`, 'INFO');
            return filePath;
        }
        
        log(`No se pudo extraer ruta de: ${firebaseUrl}`, 'WARNING');
        return null;
    } catch (error) {
        log(`Error extrayendo ruta de Firebase: ${error.message}`, 'ERROR');
        return null;
    }
}

/**
 * Elimina una imagen de Firebase Storage
 * @param {string} imageUrl - URL de la imagen en Firebase
 * @returns {Promise<boolean>} - true si se eliminó correctamente, false en caso contrario
 */
async function deleteFirebaseImage(imageUrl) {
    try {
        const filePath = extractFirebasePath(imageUrl);
        
        if (!filePath) {
            log(`No se pudo extraer ruta de: ${imageUrl}`, 'WARNING');
            return false;
        }
        
        // Crear referencia al archivo en Firebase Storage
        const imageRef = ref(storage, filePath);
        
        // Eliminar el archivo
        await deleteObject(imageRef);
        
        log(`Imagen eliminada exitosamente: ${filePath}`, 'SUCCESS');
        return true;
    } catch (error) {
        // Si el archivo no existe, no es un error crítico
        if (error.code === 'storage/object-not-found') {
            log(`Imagen ya no existe en Firebase: ${imageUrl}`, 'WARNING');
            return true;
        }
        
        log(`Error eliminando imagen ${imageUrl}: ${error.message}`, 'ERROR');
        return false;
    }
}

/**
 * Elimina todas las imágenes de un producto de Firebase Storage
 * @param {Object} product - Objeto del producto con sus imágenes
 * @returns {Promise<Object>} - Estadísticas de eliminación
 */
async function deleteProductImages(product) {
    const stats = {
        totalImages: product.productImage ? product.productImage.length : 0,
        deletedImages: 0,
        failedImages: 0,
        skippedImages: 0
    };
    
    if (!product.productImage || product.productImage.length === 0) {
        log(`Producto ${product.productName} no tiene imágenes`, 'INFO');
        return stats;
    }
    
    log(`Eliminando ${stats.totalImages} imágenes del producto: ${product.productName}`, 'PROGRESS');
    
    for (let i = 0; i < product.productImage.length; i++) {
        const imageUrl = product.productImage[i];
        
        // Verificar si es una URL de Firebase
        if (!imageUrl.includes('firebasestorage.googleapis.com')) {
            log(`Imagen ${i + 1} no es de Firebase, omitiendo: ${imageUrl}`, 'WARNING');
            stats.skippedImages++;
            continue;
        }
        
        const deleted = await deleteFirebaseImage(imageUrl);
        
        if (deleted) {
            stats.deletedImages++;
        } else {
            stats.failedImages++;
        }
        
        // Pequeña pausa para no sobrecargar Firebase
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return stats;
}

/**
 * Función principal para eliminar productos de notebooks
 */
async function deleteNotebooksProducts() {
    try {
        log('🚀 Iniciando eliminación de productos de notebooks...', 'INFO');
        
        // Conectar a MongoDB
        log('Conectando a MongoDB...', 'PROGRESS');
        await mongoose.connect(MONGODB_URI);
        log('✅ Conectado a MongoDB', 'SUCCESS');
        
        // Buscar todos los productos de la subcategoría "notebooks"
        log('Buscando productos de la subcategoría "notebooks"...', 'PROGRESS');
        const notebooksProducts = await ProductModel.find({ 
            subcategory: { $regex: /notebooks/i } 
        });
        
        log(`📊 Encontrados ${notebooksProducts.length} productos de notebooks`, 'INFO');
        
        if (notebooksProducts.length === 0) {
            log('No hay productos de notebooks para eliminar', 'WARNING');
            return;
        }
        
        // Mostrar lista de productos que se van a eliminar
        log('📋 Productos que serán eliminados:', 'INFO');
        notebooksProducts.forEach((product, index) => {
            log(`${index + 1}. ${product.productName} (${product.brandName}) - ${product.productImage ? product.productImage.length : 0} imágenes`, 'INFO');
        });
        
        // Confirmar eliminación
        log('⚠️  ADVERTENCIA: Esta acción eliminará permanentemente todos los productos de notebooks y sus imágenes de Firebase', 'WARNING');
        log('Para continuar, ejecuta: node deleteNotebooksProducts.js --confirm', 'WARNING');
        
        // Verificar si se pasó el flag --confirm
        const args = process.argv.slice(2);
        if (!args.includes('--confirm')) {
            log('❌ Operación cancelada. Usa --confirm para proceder', 'ERROR');
            process.exit(0);
        }
        
        log('✅ Confirmación recibida, procediendo con la eliminación...', 'SUCCESS');
        
        // Estadísticas generales
        const generalStats = {
            totalProducts: notebooksProducts.length,
            deletedProducts: 0,
            failedProducts: 0,
            totalImages: 0,
            deletedImages: 0,
            failedImages: 0,
            skippedImages: 0
        };
        
        // Procesar cada producto
        for (let i = 0; i < notebooksProducts.length; i++) {
            const product = notebooksProducts[i];
            
            log(`\n🔄 Procesando producto ${i + 1}/${notebooksProducts.length}: ${product.productName}`, 'PROGRESS');
            
            try {
                // Eliminar imágenes de Firebase
                const imageStats = await deleteProductImages(product);
                
                // Actualizar estadísticas generales
                generalStats.totalImages += imageStats.totalImages;
                generalStats.deletedImages += imageStats.deletedImages;
                generalStats.failedImages += imageStats.failedImages;
                generalStats.skippedImages += imageStats.skippedImages;
                
                // Eliminar producto de la base de datos
                await ProductModel.findByIdAndDelete(product._id);
                
                generalStats.deletedProducts++;
                log(`✅ Producto eliminado: ${product.productName}`, 'SUCCESS');
                
            } catch (error) {
                generalStats.failedProducts++;
                log(`❌ Error eliminando producto ${product.productName}: ${error.message}`, 'ERROR');
            }
            
            // Pausa entre productos para no sobrecargar los servicios
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Mostrar resumen final
        log('\n📊 RESUMEN DE ELIMINACIÓN:', 'INFO');
        log(`✅ Productos eliminados: ${generalStats.deletedProducts}/${generalStats.totalProducts}`, 'SUCCESS');
        log(`❌ Productos con errores: ${generalStats.failedProducts}/${generalStats.totalProducts}`, generalStats.failedProducts > 0 ? 'ERROR' : 'SUCCESS');
        log(`🖼️  Imágenes procesadas: ${generalStats.totalImages}`, 'INFO');
        log(`✅ Imágenes eliminadas: ${generalStats.deletedImages}`, 'SUCCESS');
        log(`❌ Imágenes con errores: ${generalStats.failedImages}`, generalStats.failedImages > 0 ? 'ERROR' : 'SUCCESS');
        log(`⏭️  Imágenes omitidas: ${generalStats.skippedImages}`, 'INFO');
        
        if (generalStats.failedProducts === 0 && generalStats.failedImages === 0) {
            log('\n🎉 ¡Eliminación completada exitosamente!', 'SUCCESS');
        } else {
            log('\n⚠️  Eliminación completada con algunos errores', 'WARNING');
        }
        
    } catch (error) {
        log(`❌ Error general: ${error.message}`, 'ERROR');
        // console.error removed for production
    } finally {
        // Cerrar conexión a MongoDB
        await mongoose.disconnect();
        log('🔌 Desconectado de MongoDB', 'INFO');
        process.exit(0);
    }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
    deleteNotebooksProducts();
}

module.exports = {
    deleteNotebooksProducts,
    deleteFirebaseImage,
    extractFirebasePath
};
