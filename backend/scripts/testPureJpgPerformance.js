const axios = require('axios');
const mongoose = require('mongoose');
const productModel = require('../models/productModel');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

async function testPureJpgPerformance() {
    try {
        console.log('🧪 INICIANDO TEST DE RENDIMIENTO - PRODUCTOS PUROS CON JPG...\n');
        
        // Conectar a MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Buscar productos con SOLO imágenes JPG (sin WebP)
        const products = await productModel.find({
            productImage: { 
                $exists: true, 
                $ne: [],
                $regex: /\.jpg|\.jpeg/i
            }
        }).limit(10);

        if (products.length === 0) {
            console.log('❌ No se encontraron productos con imágenes JPG');
            return;
        }

        console.log(`📊 Encontrados ${products.length} productos con JPG puro para probar\n`);

        const results = [];

        for (let i = 0; i < Math.min(5, products.length); i++) {
            const product = products[i];
            console.log(`🔍 Probando producto ${i + 1}: ${product.productName}`);
            
            const productResults = {
                productName: product.productName,
                productId: product._id,
                imageCount: product.productImage.length,
                imageTests: []
            };

            // Probar cada imagen del producto
            for (let j = 0; j < product.productImage.length; j++) {
                const imageUrl = product.productImage[j];
                const startTime = Date.now();
                
                try {
                    // Simular carga de imagen (solo headers para medir tiempo de respuesta)
                    const response = await axios.head(imageUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; ImageLoadTest/1.0)'
                        }
                    });
                    
                    const endTime = Date.now();
                    const loadTime = endTime - startTime;
                    
                    const imageInfo = {
                        url: imageUrl,
                        loadTime: loadTime,
                        status: response.status,
                        contentType: response.headers['content-type'],
                        contentLength: response.headers['content-length'],
                        isWebP: imageUrl.includes('.webp'),
                        isJPG: imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')
                    };
                    
                    productResults.imageTests.push(imageInfo);
                    
                    const format = imageInfo.isJPG ? '📷 JPG' : imageInfo.isWebP ? '⚡ WebP' : '❓ OTRO';
                    console.log(`  ${format} ${j + 1}: ${loadTime}ms (${imageInfo.contentType})`);
                    
                } catch (error) {
                    const endTime = Date.now();
                    const loadTime = endTime - startTime;
                    
                    const imageInfo = {
                        url: imageUrl,
                        loadTime: loadTime,
                        status: 'ERROR',
                        error: error.message,
                        isWebP: imageUrl.includes('.webp'),
                        isJPG: imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')
                    };
                    
                    productResults.imageTests.push(imageInfo);
                    console.log(`  ❌ Imagen ${j + 1}: ERROR - ${error.message}`);
                }
            }

            // Calcular estadísticas del producto
            const successfulImages = productResults.imageTests.filter(img => img.status !== 'ERROR');
            const jpgImages = successfulImages.filter(img => img.isJPG);
            const webpImages = successfulImages.filter(img => img.isWebP);
            
            productResults.stats = {
                totalImages: productResults.imageTests.length,
                successfulImages: successfulImages.length,
                jpgImages: jpgImages.length,
                webpImages: webpImages.length,
                avgLoadTime: successfulImages.length > 0 ? 
                    Math.round(successfulImages.reduce((sum, img) => sum + img.loadTime, 0) / successfulImages.length) : 0,
                avgJpgLoadTime: jpgImages.length > 0 ? 
                    Math.round(jpgImages.reduce((sum, img) => sum + img.loadTime, 0) / jpgImages.length) : 0,
                avgWebpLoadTime: webpImages.length > 0 ? 
                    Math.round(webpImages.reduce((sum, img) => sum + img.loadTime, 0) / webpImages.length) : 0
            };

            results.push(productResults);
            
            if (jpgImages.length > 0 && webpImages.length > 0) {
                const improvement = Math.round(((productResults.stats.avgJpgLoadTime - productResults.stats.avgWebpLoadTime) / productResults.stats.avgJpgLoadTime) * 100);
                console.log(`  📊 Promedio: ${productResults.stats.avgLoadTime}ms (JPG: ${productResults.stats.avgJpgLoadTime}ms, WebP: ${productResults.stats.avgWebpLoadTime}ms) - Mejora: ${improvement}%`);
            } else if (jpgImages.length > 0) {
                console.log(`  📊 Promedio: ${productResults.stats.avgLoadTime}ms (Solo JPG: ${productResults.stats.avgJpgLoadTime}ms)`);
            } else if (webpImages.length > 0) {
                console.log(`  📊 Promedio: ${productResults.stats.avgLoadTime}ms (Solo WebP: ${productResults.stats.avgWebpLoadTime}ms)`);
            } else {
                console.log(`  📊 Promedio: ${productResults.stats.avgLoadTime}ms`);
            }
            console.log('');
        }

        // Calcular estadísticas generales
        const allImages = results.flatMap(r => r.imageTests);
        const successfulImages = allImages.filter(img => img.status !== 'ERROR');
        const jpgImages = successfulImages.filter(img => img.isJPG);
        const webpImages = successfulImages.filter(img => img.isWebP);

        const generalStats = {
            totalProducts: results.length,
            totalImages: allImages.length,
            successfulImages: successfulImages.length,
            jpgImages: jpgImages.length,
            webpImages: webpImages.length,
            avgLoadTime: successfulImages.length > 0 ? 
                Math.round(successfulImages.reduce((sum, img) => sum + img.loadTime, 0) / successfulImages.length) : 0,
            avgJpgLoadTime: jpgImages.length > 0 ? 
                Math.round(jpgImages.reduce((sum, img) => sum + img.loadTime, 0) / jpgImages.length) : 0,
            avgWebpLoadTime: webpImages.length > 0 ? 
                Math.round(webpImages.reduce((sum, img) => sum + img.loadTime, 0) / webpImages.length) : 0,
            minLoadTime: successfulImages.length > 0 ? Math.min(...successfulImages.map(img => img.loadTime)) : 0,
            maxLoadTime: successfulImages.length > 0 ? Math.max(...successfulImages.map(img => img.loadTime)) : 0
        };

        // Mostrar resultados
        console.log('📊 ===== RESULTADOS DE PRODUCTOS CON JPG PURO =====');
        console.log(`📦 Productos probados: ${generalStats.totalProducts}`);
        console.log(`🖼️  Total de imágenes: ${generalStats.totalImages}`);
        console.log(`✅ Imágenes exitosas: ${generalStats.successfulImages}`);
        console.log(`📷 Imágenes JPG: ${generalStats.jpgImages}`);
        console.log(`⚡ Imágenes WebP: ${generalStats.webpImages}`);
        console.log('');
        console.log('⏱️  TIEMPOS DE CARGA:');
        console.log(`   📊 Promedio general: ${generalStats.avgLoadTime}ms`);
        console.log(`   📷 Promedio JPG: ${generalStats.avgJpgLoadTime}ms`);
        console.log(`   ⚡ Promedio WebP: ${generalStats.avgWebpLoadTime}ms`);
        console.log(`   🐌 Más lenta: ${generalStats.maxLoadTime}ms`);
        console.log(`   🚀 Más rápida: ${generalStats.minLoadTime}ms`);
        console.log('');

        if (generalStats.avgJpgLoadTime > 0 && generalStats.avgWebpLoadTime > 0) {
            const improvement = Math.round(((generalStats.avgJpgLoadTime - generalStats.avgWebpLoadTime) / generalStats.avgJpgLoadTime) * 100);
            console.log(`🎯 MEJORA CON WEBP: ${improvement}% más rápido`);
        } else if (generalStats.avgJpgLoadTime > 0) {
            console.log(`📷 Solo JPG encontradas - Tiempo promedio: ${generalStats.avgJpgLoadTime}ms`);
            console.log(`💡 Este es el tiempo de carga ACTUAL con JPG que mejorará con WebP`);
        } else if (generalStats.avgWebpLoadTime > 0) {
            console.log(`⚡ Solo WebP encontradas - Tiempo promedio: ${generalStats.avgWebpLoadTime}ms`);
        }

        console.log('\n💾 Guardando resultados detallados...');
        
        // Guardar resultados en archivo
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `pure_jpg_performance_test_${timestamp}.json`;
        
        const detailedResults = {
            timestamp: new Date().toISOString(),
            generalStats,
            productResults: results
        };
        
        fs.writeFileSync(filename, JSON.stringify(detailedResults, null, 2));
        console.log(`✅ Resultados guardados en: ${filename}`);

        console.log('\n🎯 TEST COMPLETADO!');
        console.log('💡 Mañana podrás comparar estos tiempos JPG con los WebP convertidos!');

    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar el test
testPureJpgPerformance();

