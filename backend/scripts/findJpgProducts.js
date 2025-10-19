const mongoose = require('mongoose');
const productModel = require('../models/productModel');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

async function findJpgProducts() {
    try {
        console.log('🔍 BUSCANDO PRODUCTOS CON IMÁGENES JPG...\n');
        
        // Conectar a MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Buscar productos con imágenes JPG
        const products = await productModel.find({
            productImage: { 
                $exists: true, 
                $ne: [],
                $regex: /\.jpg|\.jpeg/i
            }
        }).limit(20);

        if (products.length === 0) {
            console.log('❌ No se encontraron productos con imágenes JPG');
            return;
        }

        console.log(`📊 Encontrados ${products.length} productos con JPG:\n`);

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const jpgImages = product.productImage.filter(img => img.includes('.jpg') || img.includes('.jpeg'));
            const webpImages = product.productImage.filter(img => img.includes('.webp'));
            
            console.log(`${i + 1}. ${product.productName}`);
            console.log(`   📷 JPG: ${jpgImages.length} imágenes`);
            console.log(`   ⚡ WebP: ${webpImages.length} imágenes`);
            console.log(`   🆔 ID: ${product._id}`);
            console.log('');
        }

        console.log('🎯 Estos productos aún tienen imágenes JPG que pueden ser probadas!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar la búsqueda
findJpgProducts();
