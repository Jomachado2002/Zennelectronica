const axios = require('axios');
const mongoose = require('mongoose');
const productModel = require('../models/productModel');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

async function testJpgVsWebpPerformance() {
    try {
        console.log('🧪 INICIANDO TEST COMPARATIVO JPG vs WebP...\n');
        
        // Conectar a MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Buscar productos con imágenes
        const products = await productModel.find({
            productImage: { $exists: true, $ne: [] }
        }).limit(20);

        if (products.length === 0) {
            console.log('❌ No se encontraron productos con imágenes');
            return;
        }

        console.log(`📊 Analizando ${products.length} productos...\n`);

        let jpgImages = [];
        let webpImages = [];
        let totalImages = 0;

        // Clasificar imágenes por tipo
        for (const product of products) {
            for (const imageUrl of product.productImage) {
                totalImages++;
                
                if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) {
                    jpgImages.push({
                        url: imageUrl,
                        productName: product.productName,
                        productId: product._id
                    });
                } else if (imageUrl.includes('.webp')) {
                    webpImages.push({
                        url: imageUrl,
                        productName: product.productName,
                        productId: product._id
                    });
                }
            }
        }

        console.log(`📊 ESTADÍSTICAS DE IMÁGENES:`);
        console.log(`   🖼️  Total de imágenes: ${totalImages}`);
        console.log(`   📷 Imágenes JPG: ${jpgImages.length}`);
        console.log(`   ⚡ Imágenes WebP: ${webpImages.length}`);
        console.log(`   📊 Porcentaje WebP: ${Math.round((webpImages.length / totalImages) * 100)}%\n`);

        const results = {
            jpg: [],
            webp: []
        };

        // Probar imágenes JPG
        if (jpgImages.length > 0) {
            console.log(`🔍 Probando ${Math.min(5, jpgImages.length)} imágenes JPG...`);
            
            for (let i = 0; i < Math.min(5, jpgImages.length); i++) {
                const image = jpgImages[i];
                const startTime = Date.now();
                
                try {
                    const response = await axios.head(image.url, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; ImageLoadTest/1.0)'
                        }
                    });
                    
                    const endTime = Date.now();
                    const loadTime = endTime - startTime;
                    
                    const result = {
                        url: image.url,
                        productName: image.productName,
                        loadTime: loadTime,
                        status: response.status,
                        contentType: response.headers['content-type'],
                        contentLength: response.headers['content-length']
                    };
                    
                    results.jpg.push(result);
                    console.log(`  📷 JPG ${i + 1}: ${loadTime}ms (${result.contentType})`);
                    
                } catch (error) {
                    const endTime = Date.now();
                    const loadTime = endTime - startTime;
                    
                    results.jpg.push({
                        url: image.url,
                        productName: image.productName,
                        loadTime: loadTime,
                        status: 'ERROR',
                        error: error.message
                    });
                    console.log(`  ❌ JPG ${i + 1}: ERROR - ${error.message}`);
                }
            }
        } else {
            console.log('✅ No hay imágenes JPG para probar (¡conversión completada!)\n');
        }

        // Probar imágenes WebP
        if (webpImages.length > 0) {
            console.log(`\n🔍 Probando ${Math.min(5, webpImages.length)} imágenes WebP...`);
            
            for (let i = 0; i < Math.min(5, webpImages.length); i++) {
                const image = webpImages[i];
                const startTime = Date.now();
                
                try {
                    const response = await axios.head(image.url, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; ImageLoadTest/1.0)'
                        }
                    });
                    
                    const endTime = Date.now();
                    const loadTime = endTime - startTime;
                    
                    const result = {
                        url: image.url,
                        productName: image.productName,
                        loadTime: loadTime,
                        status: response.status,
                        contentType: response.headers['content-type'],
                        contentLength: response.headers['content-length']
                    };
                    
                    results.webp.push(result);
                    console.log(`  ⚡ WebP ${i + 1}: ${loadTime}ms (${result.contentType})`);
                    
                } catch (error) {
                    const endTime = Date.now();
                    const loadTime = endTime - startTime;
                    
                    results.webp.push({
                        url: image.url,
                        productName: image.productName,
                        loadTime: loadTime,
                        status: 'ERROR',
                        error: error.message
                    });
                    console.log(`  ❌ WebP ${i + 1}: ERROR - ${error.message}`);
                }
            }
        }

        // Calcular estadísticas
        const jpgSuccessful = results.jpg.filter(img => img.status !== 'ERROR');
        const webpSuccessful = results.webp.filter(img => img.status !== 'ERROR');

        const jpgStats = {
            count: jpgSuccessful.length,
            avgLoadTime: jpgSuccessful.length > 0 ? 
                Math.round(jpgSuccessful.reduce((sum, img) => sum + img.loadTime, 0) / jpgSuccessful.length) : 0,
            minLoadTime: jpgSuccessful.length > 0 ? Math.min(...jpgSuccessful.map(img => img.loadTime)) : 0,
            maxLoadTime: jpgSuccessful.length > 0 ? Math.max(...jpgSuccessful.map(img => img.loadTime)) : 0
        };

        const webpStats = {
            count: webpSuccessful.length,
            avgLoadTime: webpSuccessful.length > 0 ? 
                Math.round(webpSuccessful.reduce((sum, img) => sum + img.loadTime, 0) / webpSuccessful.length) : 0,
            minLoadTime: webpSuccessful.length > 0 ? Math.min(...webpSuccessful.map(img => img.loadTime)) : 0,
            maxLoadTime: webpSuccessful.length > 0 ? Math.max(...webpSuccessful.map(img => img.loadTime)) : 0
        };

        // Mostrar resultados
        console.log('\n📊 ===== RESULTADOS COMPARATIVOS =====');
        
        if (jpgStats.count > 0) {
            console.log(`📷 IMÁGENES JPG (${jpgStats.count} probadas):`);
            console.log(`   📊 Promedio: ${jpgStats.avgLoadTime}ms`);
            console.log(`   🚀 Más rápida: ${jpgStats.minLoadTime}ms`);
            console.log(`   🐌 Más lenta: ${jpgStats.maxLoadTime}ms`);
        } else {
            console.log('📷 IMÁGENES JPG: ✅ No hay JPGs (conversión completada)');
        }

        if (webpStats.count > 0) {
            console.log(`\n⚡ IMÁGENES WEBP (${webpStats.count} probadas):`);
            console.log(`   📊 Promedio: ${webpStats.avgLoadTime}ms`);
            console.log(`   🚀 Más rápida: ${webpStats.minLoadTime}ms`);
            console.log(`   🐌 Más lenta: ${webpStats.maxLoadTime}ms`);
        }

        if (jpgStats.count > 0 && webpStats.count > 0) {
            const improvement = Math.round(((jpgStats.avgLoadTime - webpStats.avgLoadTime) / jpgStats.avgLoadTime) * 100);
            console.log(`\n🎯 MEJORA CON WEBP: ${improvement}% más rápido`);
        }

        // Guardar resultados
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `jpg_vs_webp_test_${timestamp}.json`;
        
        const detailedResults = {
            timestamp: new Date().toISOString(),
            totalImages: totalImages,
            jpgImages: jpgImages.length,
            webpImages: webpImages.length,
            jpgStats,
            webpStats,
            results
        };
        
        fs.writeFileSync(filename, JSON.stringify(detailedResults, null, 2));
        console.log(`\n💾 Resultados guardados en: ${filename}`);

        console.log('\n🎯 TEST COMPLETADO!');

    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar el test
testJpgVsWebpPerformance();

