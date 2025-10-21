const axios = require('axios');
const mongoose = require('mongoose');
const productModel = require('../models/productModel');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

async function testNotebookJpgPerformance() {
    try {
        // console.log removed for production
        
        // Conectar a MongoDB
        await mongoose.connect(MONGODB_URI);
        // console.log removed for production

        // Buscar notebooks con imágenes JPG
        const notebooks = await productModel.find({
            $or: [
                { productName: { $regex: /notebook/i } },
                { productName: { $regex: /laptop/i } },
                { productName: { $regex: /portátil/i } },
                { productName: { $regex: /computadora/i } }
            ],
            productImage: { $exists: true, $ne: [] }
        }).limit(10);

        if (notebooks.length === 0) {
            // console.log removed for production
            return;
        }

        // console.log removed for production

        const results = [];

        for (let i = 0; i < Math.min(5, notebooks.length); i++) {
            const notebook = notebooks[i];
            // console.log removed for production
            
            const notebookResults = {
                productName: notebook.productName,
                productId: notebook._id,
                imageCount: notebook.productImage.length,
                imageTests: []
            };

            // Probar cada imagen del notebook
            for (let j = 0; j < notebook.productImage.length; j++) {
                const imageUrl = notebook.productImage[j];
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
                    
                    notebookResults.imageTests.push(imageInfo);
                    
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
                    
                    notebookResults.imageTests.push(imageInfo);
                    // console.log removed for production
                }
            }

            // Calcular estadísticas del notebook
            const successfulImages = notebookResults.imageTests.filter(img => img.status !== 'ERROR');
            const jpgImages = successfulImages.filter(img => img.isJPG);
            const webpImages = successfulImages.filter(img => img.isWebP);
            
            notebookResults.stats = {
                totalImages: notebookResults.imageTests.length,
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

            results.push(notebookResults);
            
            if (jpgImages.length > 0 && webpImages.length > 0) {
                const improvement = Math.round(((notebookResults.stats.avgJpgLoadTime - notebookResults.stats.avgWebpLoadTime) / notebookResults.stats.avgJpgLoadTime) * 100);
                console.log(`  📊 Promedio: ${notebookResults.stats.avgLoadTime}ms (JPG: ${notebookResults.stats.avgJpgLoadTime}ms, WebP: ${notebookResults.stats.avgWebpLoadTime}ms) - Mejora: ${improvement}%`);
            } else if (jpgImages.length > 0) {
                console.log(`  📊 Promedio: ${notebookResults.stats.avgLoadTime}ms (Solo JPG: ${notebookResults.stats.avgJpgLoadTime}ms)`);
            } else if (webpImages.length > 0) {
                console.log(`  📊 Promedio: ${notebookResults.stats.avgLoadTime}ms (Solo WebP: ${notebookResults.stats.avgWebpLoadTime}ms)`);
            } else {
                // console.log removed for production
            }
            // console.log removed for production
        }

        // Calcular estadísticas generales
        const allImages = results.flatMap(r => r.imageTests);
        const successfulImages = allImages.filter(img => img.status !== 'ERROR');
        const jpgImages = successfulImages.filter(img => img.isJPG);
        const webpImages = successfulImages.filter(img => img.isWebP);

        const generalStats = {
            totalNotebooks: results.length,
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
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production

        if (generalStats.avgJpgLoadTime > 0 && generalStats.avgWebpLoadTime > 0) {
            const improvement = Math.round(((generalStats.avgJpgLoadTime - generalStats.avgWebpLoadTime) / generalStats.avgJpgLoadTime) * 100);
            // console.log removed for production
        } else if (generalStats.avgJpgLoadTime > 0) {
            // console.log removed for production
        } else if (generalStats.avgWebpLoadTime > 0) {
            // console.log removed for production
        }

        // console.log removed for production
        
        // Guardar resultados en archivo
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `notebook_performance_test_${timestamp}.json`;
        
        const detailedResults = {
            timestamp: new Date().toISOString(),
            generalStats,
            notebookResults: results
        };
        
        fs.writeFileSync(filename, JSON.stringify(detailedResults, null, 2));
        // console.log removed for production

        // console.log removed for production

    } catch (error) {
        // console.error removed for production
    } finally {
        await mongoose.disconnect();
        // console.log removed for production
    }
}

// Ejecutar el test
testNotebookJpgPerformance();


