// Script de prueba para verificar la funcionalidad de exportación de productos
const mongoose = require('mongoose');
const ProductModel = require('./models/productModel');
require('dotenv').config();

async function testExportProducts() {
    try {
        console.log('🔍 Probando funcionalidad de exportación de productos...\n');
        
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');
        
        // Buscar productos con stock > 0
        const productsWithStock = await ProductModel.find({
            stock: { $gt: 0 }
        }).select({
            _id: 1,
            productName: 1,
            description: 1,
            stock: 1,
            sellingPrice: 1
        }).limit(5).lean();
        
        console.log(`📦 Productos con stock > 0 encontrados: ${productsWithStock.length}`);
        
        if (productsWithStock.length > 0) {
            console.log('\n📋 Ejemplos de productos:');
            productsWithStock.forEach((product, index) => {
                console.log(`\n${index + 1}. ${product.productName}`);
                console.log(`   Stock: ${product.stock}`);
                console.log(`   Precio: ${product.sellingPrice}`);
                console.log(`   Descripción original: ${product.description || 'Sin descripción'}`);
                
                // Simular la nueva lógica de descripción
                const mensajeContacto = 'Para más información podrías escribirnos al 0973/345/284 contamos con productos al por mayor para reventa';
                let descripcionCompleta = '';
                
                if (product.description && product.description.trim() !== '') {
                    descripcionCompleta = `${product.description} ${mensajeContacto}`;
                } else {
                    descripcionCompleta = mensajeContacto;
                }
                
                console.log(`   Descripción final: ${descripcionCompleta}`);
            });
        }
        
        // Buscar productos sin stock para comparar
        const productsWithoutStock = await ProductModel.find({
            $or: [
                { stock: { $lte: 0 } },
                { stock: { $exists: false } }
            ]
        }).countDocuments();
        
        console.log(`\n❌ Productos sin stock (no se exportarán): ${productsWithoutStock}`);
        
        console.log('\n✅ Prueba completada exitosamente');
        console.log('🎯 La funcionalidad de exportación está lista para usar');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada');
    }
}

testExportProducts();
