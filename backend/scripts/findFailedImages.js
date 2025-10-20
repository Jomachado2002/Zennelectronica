const mongoose = require('mongoose');
const productModel = require('../models/productModel');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

async function findFailedImages() {
    try {
        console.log('🔍 BUSCANDO IMÁGENES QUE FALLARON EN LA CONVERSIÓN...\n');
        
        // Conectar a MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Buscar productos con imágenes que NO son WebP
        const products = await productModel.find({
            productImage: { $exists: true, $ne: [] }
        });

        console.log(`📊 Analizando ${products.length} productos...\n`);

        let failedImages = [];
        let totalImages = 0;
        let webpImages = 0;

        for (const product of products) {
            for (const imageUrl of product.productImage) {
                totalImages++;
                
                // Verificar si la imagen es WebP
                if (imageUrl.includes('.webp')) {
                    webpImages++;
                } else {
                    // Esta imagen no es WebP - es una que falló
                    failedImages.push({
                        productId: product._id,
                        productName: product.productName,
                        imageUrl: imageUrl,
                        format: imageUrl.split('.').pop().toLowerCase()
                    });
                }
            }
        }

        console.log('📈 ESTADÍSTICAS:');
        console.log(`   Total de imágenes: ${totalImages}`);
        console.log(`   Imágenes WebP: ${webpImages} (${((webpImages/totalImages)*100).toFixed(2)}%)`);
        console.log(`   Imágenes fallidas: ${failedImages.length} (${((failedImages.length/totalImages)*100).toFixed(2)}%)\n`);

        if (failedImages.length > 0) {
            console.log('❌ IMÁGENES QUE FALLARON EN LA CONVERSIÓN:');
            console.log('=' .repeat(80));
            
            failedImages.forEach((failed, index) => {
                console.log(`\n${index + 1}. Producto: ${failed.productName}`);
                console.log(`   ID: ${failed.productId}`);
                console.log(`   Formato: ${failed.format}`);
                console.log(`   URL: ${failed.imageUrl}`);
            });
        } else {
            console.log('🎉 ¡Todas las imágenes fueron convertidas exitosamente!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

findFailedImages();

