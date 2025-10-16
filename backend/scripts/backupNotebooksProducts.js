// backend/scripts/backupNotebooksProducts.js
// Script para crear una copia de seguridad de los productos de notebooks antes de eliminarlos

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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
    console.log(`${colors[type]}[${timestamp}] ${type}: ${message}${reset}`);
};

/**
 * Función para crear copia de seguridad de productos de notebooks
 */
async function backupNotebooksProducts() {
    try {
        log('💾 Iniciando copia de seguridad de productos de notebooks...', 'INFO');
        
        // Conectar a MongoDB
        log('Conectando a MongoDB...', 'PROGRESS');
        await mongoose.connect(MONGODB_URI);
        log('✅ Conectado a MongoDB', 'SUCCESS');
        
        // Buscar todos los productos de notebooks
        log('Buscando productos de notebooks...', 'PROGRESS');
        const notebooksProducts = await ProductModel.find({ 
            subcategory: { $regex: /notebooks/i } 
        });
        
        log(`📊 Encontrados ${notebooksProducts.length} productos de notebooks`, 'INFO');
        
        if (notebooksProducts.length === 0) {
            log('No hay productos de notebooks para respaldar', 'WARNING');
            return;
        }
        
        // Crear directorio de respaldo si no existe
        const backupDir = path.join(__dirname, '..', 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
            log(`📁 Directorio de respaldo creado: ${backupDir}`, 'SUCCESS');
        }
        
        // Generar nombre de archivo con timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `notebooks_backup_${timestamp}.json`;
        const backupFilePath = path.join(backupDir, backupFileName);
        
        // Preparar datos para el respaldo
        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                totalProducts: notebooksProducts.length,
                description: 'Copia de seguridad de productos de notebooks antes de eliminación',
                version: '1.0'
            },
            products: notebooksProducts.map(product => ({
                _id: product._id,
                productName: product.productName,
                brandName: product.brandName,
                category: product.category,
                subcategory: product.subcategory,
                productImage: product.productImage,
                description: product.description,
                price: product.price,
                sellingPrice: product.sellingPrice,
                codigo: product.codigo,
                stock: product.stock,
                stockStatus: product.stockStatus,
                isVipOffer: product.isVipOffer,
                // Especificaciones de notebooks
                processor: product.processor,
                memory: product.memory,
                storage: product.storage,
                disk: product.disk,
                graphicsCard: product.graphicsCard,
                notebookScreen: product.notebookScreen,
                notebookBattery: product.notebookBattery,
                slug: product.slug,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            }))
        };
        
        // Escribir archivo de respaldo
        log('Escribiendo archivo de respaldo...', 'PROGRESS');
        fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
        
        // Verificar que el archivo se creó correctamente
        const fileStats = fs.statSync(backupFilePath);
        const fileSizeKB = Math.round(fileStats.size / 1024);
        
        log(`✅ Respaldo creado exitosamente: ${backupFileName}`, 'SUCCESS');
        log(`📁 Ubicación: ${backupFilePath}`, 'INFO');
        log(`📊 Tamaño: ${fileSizeKB} KB`, 'INFO');
        log(`📦 Productos respaldados: ${notebooksProducts.length}`, 'INFO');
        
        // Crear un archivo de resumen
        const summaryFileName = `notebooks_summary_${timestamp}.txt`;
        const summaryFilePath = path.join(backupDir, summaryFileName);
        
        const summary = `RESUMEN DE RESPALDO - PRODUCTOS DE NOTEBOOKS
================================================
Fecha: ${new Date().toLocaleString()}
Total de productos: ${notebooksProducts.length}
Archivo de respaldo: ${backupFileName}
Tamaño del archivo: ${fileSizeKB} KB

LISTA DE PRODUCTOS RESPALDADOS:
${notebooksProducts.map((p, i) => `${i + 1}. ${p.productName} (${p.brandName}) - ${p.productImage ? p.productImage.length : 0} imágenes`).join('\n')}

NOTAS:
- Este respaldo contiene todos los datos de los productos de notebooks
- Las imágenes están referenciadas por sus URLs de Firebase
- Para restaurar, usar el archivo JSON con los datos completos
- La eliminación de imágenes de Firebase es irreversible
`;
        
        fs.writeFileSync(summaryFilePath, summary);
        log(`📄 Resumen creado: ${summaryFileName}`, 'SUCCESS');
        
        // Mostrar estadísticas detalladas
        log('\n📊 ESTADÍSTICAS DEL RESPALDO:', 'INFO');
        log(`📦 Total de productos: ${notebooksProducts.length}`, 'INFO');
        
        const imageStats = notebooksProducts.reduce((acc, product) => {
            const imageCount = product.productImage ? product.productImage.length : 0;
            acc.totalImages += imageCount;
            if (imageCount > 0) acc.productsWithImages++;
            return acc;
        }, { totalImages: 0, productsWithImages: 0 });
        
        log(`🖼️  Total de imágenes: ${imageStats.totalImages}`, 'INFO');
        log(`📱 Productos con imágenes: ${imageStats.productsWithImages}`, 'INFO');
        log(`📱 Productos sin imágenes: ${notebooksProducts.length - imageStats.productsWithImages}`, 'INFO');
        
        // Mostrar algunos ejemplos de productos
        log('\n📋 EJEMPLOS DE PRODUCTOS RESPALDADOS:', 'INFO');
        notebooksProducts.slice(0, 5).forEach((product, index) => {
            log(`${index + 1}. ${product.productName} (${product.brandName})`, 'INFO');
        });
        
        if (notebooksProducts.length > 5) {
            log(`... y ${notebooksProducts.length - 5} productos más`, 'INFO');
        }
        
        log('\n✅ ¡RESPALDO COMPLETADO EXITOSAMENTE!', 'SUCCESS');
        log('Ahora puedes proceder con la eliminación usando: node deleteNotebooksProducts.js --confirm', 'INFO');
        
    } catch (error) {
        log(`❌ Error durante el respaldo: ${error.message}`, 'ERROR');
        console.error(error);
    } finally {
        // Cerrar conexión a MongoDB
        await mongoose.disconnect();
        log('🔌 Desconectado de MongoDB', 'INFO');
        process.exit(0);
    }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
    backupNotebooksProducts();
}

module.exports = {
    backupNotebooksProducts
};
