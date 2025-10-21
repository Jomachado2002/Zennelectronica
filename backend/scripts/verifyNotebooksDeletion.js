// backend/scripts/verifyNotebooksDeletion.js
// Script para verificar que todos los productos de notebooks fueron eliminados correctamente

const mongoose = require('mongoose');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

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
 * Función para verificar la eliminación de productos de notebooks
 */
async function verifyNotebooksDeletion() {
    try {
        log('🔍 Iniciando verificación de eliminación de productos de notebooks...', 'INFO');
        
        // Conectar a MongoDB
        log('Conectando a MongoDB...', 'PROGRESS');
        await mongoose.connect(MONGODB_URI);
        log('✅ Conectado a MongoDB', 'SUCCESS');
        
        // Buscar productos de notebooks restantes
        log('Buscando productos de notebooks restantes...', 'PROGRESS');
        const remainingNotebooks = await ProductModel.find({ 
            subcategory: { $regex: /notebooks/i } 
        });
        
        // Buscar productos con variaciones de "notebook"
        const variations = ['notebook', 'laptop', 'portátil', 'computadora portátil'];
        const allVariations = [];
        
        for (const variation of variations) {
            const products = await ProductModel.find({ 
                subcategory: { $regex: new RegExp(variation, 'i') } 
            });
            allVariations.push(...products);
        }
        
        // Eliminar duplicados
        const uniqueVariations = allVariations.filter((product, index, self) => 
            index === self.findIndex(p => p._id.toString() === product._id.toString())
        );
        
        // Buscar en el nombre del producto también
        const nameNotebooks = await ProductModel.find({
            $or: [
                { productName: { $regex: /notebook/i } },
                { productName: { $regex: /laptop/i } },
                { productName: { $regex: /portátil/i } }
            ]
        });
        
        // Estadísticas
        const stats = {
            notebooksInSubcategory: remainingNotebooks.length,
            variationsInSubcategory: uniqueVariations.length,
            notebooksInName: nameNotebooks.length,
            totalRemaining: Math.max(remainingNotebooks.length, uniqueVariations.length, nameNotebooks.length)
        };
        
        log('\n📊 RESULTADOS DE LA VERIFICACIÓN:', 'INFO');
        log(`🔍 Productos con subcategoría "notebooks": ${stats.notebooksInSubcategory}`, 
            stats.notebooksInSubcategory === 0 ? 'SUCCESS' : 'ERROR');
        log(`🔍 Productos con variaciones en subcategoría: ${stats.variationsInSubcategory}`, 
            stats.variationsInSubcategory === 0 ? 'SUCCESS' : 'WARNING');
        log(`🔍 Productos con "notebook" en el nombre: ${stats.notebooksInName}`, 
            stats.notebooksInName === 0 ? 'SUCCESS' : 'WARNING');
        
        // Mostrar productos restantes si los hay
        if (remainingNotebooks.length > 0) {
            log('\n❌ PRODUCTOS DE NOTEBOOKS RESTANTES:', 'ERROR');
            remainingNotebooks.forEach((product, index) => {
                log(`${index + 1}. ${product.productName} (${product.brandName}) - Subcategoría: ${product.subcategory}`, 'ERROR');
            });
        }
        
        if (uniqueVariations.length > 0) {
            log('\n⚠️  PRODUCTOS CON VARIACIONES DE NOTEBOOK:', 'WARNING');
            uniqueVariations.forEach((product, index) => {
                log(`${index + 1}. ${product.productName} (${product.brandName}) - Subcategoría: ${product.subcategory}`, 'WARNING');
            });
        }
        
        if (nameNotebooks.length > 0) {
            log('\n⚠️  PRODUCTOS CON "NOTEBOOK" EN EL NOMBRE:', 'WARNING');
            nameNotebooks.forEach((product, index) => {
                log(`${index + 1}. ${product.productName} (${product.brandName}) - Subcategoría: ${product.subcategory}`, 'WARNING');
            });
        }
        
        // Verificar estadísticas generales de productos
        const totalProducts = await ProductModel.countDocuments();
        const productsWithImages = await ProductModel.countDocuments({ 
            productImage: { $exists: true, $ne: [] } 
        });
        
        log('\n📈 ESTADÍSTICAS GENERALES:', 'INFO');
        log(`📦 Total de productos en la base de datos: ${totalProducts}`, 'INFO');
        log(`🖼️  Productos con imágenes: ${productsWithImages}`, 'INFO');
        
        // Conclusión
        if (stats.notebooksInSubcategory === 0) {
            log('\n✅ ¡VERIFICACIÓN EXITOSA!', 'SUCCESS');
            log('Todos los productos de la subcategoría "notebooks" han sido eliminados correctamente.', 'SUCCESS');
        } else {
            log('\n❌ VERIFICACIÓN FALLIDA', 'ERROR');
            log('Aún quedan productos de notebooks en la base de datos.', 'ERROR');
        }
        
        if (stats.variationsInSubcategory > 0 || stats.notebooksInName > 0) {
            log('\n⚠️  NOTA: Se encontraron productos relacionados que podrían necesitar revisión manual.', 'WARNING');
        }
        
    } catch (error) {
        log(`❌ Error durante la verificación: ${error.message}`, 'ERROR');
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
    verifyNotebooksDeletion();
}

module.exports = {
    verifyNotebooksDeletion
};
