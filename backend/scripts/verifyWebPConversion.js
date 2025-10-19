const mongoose = require('mongoose');
const axios = require('axios');
const productModel = require('../models/productModel');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

const Product = productModel;

// Función para logging
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    WARNING: '\x1b[33m',
    ERROR: '\x1b[31m',
    PROGRESS: '\x1b[35m'
  };
  const reset = '\x1b[0m';
  const color = colors[type] || colors.INFO;
  console.log(`${color}[${timestamp}] ${type}: ${message}${reset}`);
}

// Función para verificar si una URL es WebP
function isWebPUrl(url) {
  return url && url.toLowerCase().includes('.webp');
}

// Función para verificar si una URL es de Firebase
function isFirebaseUrl(url) {
  return url && url.includes('firebasestorage.googleapis.com');
}

// Función para verificar si una imagen es accesible
async function checkImageAccessibility(url) {
  try {
    const response = await axios.head(url, { timeout: 10000 });
    return {
      accessible: response.status === 200,
      status: response.status,
      contentType: response.headers['content-type']
    };
  } catch (error) {
    return {
      accessible: false,
      status: error.response?.status || 'ERROR',
      error: error.message
    };
  }
}

// Función para analizar estadísticas de conversión
async function analyzeConversionStats() {
  try {
    log('Conectando a MongoDB...', 'PROGRESS');
    await mongoose.connect(MONGODB_URI);
    log('Conectado a MongoDB exitosamente', 'SUCCESS');
    
    // Obtener estadísticas generales
    const totalProducts = await Product.countDocuments();
    const productsWithImages = await Product.countDocuments({ 
      productImage: { $exists: true, $ne: [] } 
    });
    
    // Obtener productos convertidos
    const convertedProducts = await Product.countDocuments({
      lastWebPConversion: { $exists: true }
    });
    
    // Obtener todas las imágenes
    const allProducts = await Product.find({ 
      productImage: { $exists: true, $ne: [] } 
    }).select('productImage lastWebPConversion');
    
    let totalImages = 0;
    let webpImages = 0;
    let firebaseImages = 0;
    let nonFirebaseImages = 0;
    let inaccessibleImages = 0;
    
    log('Analizando imágenes...', 'PROGRESS');
    
    for (const product of allProducts) {
      for (const imageUrl of product.productImage) {
        totalImages++;
        
        if (isFirebaseUrl(imageUrl)) {
          firebaseImages++;
          
          if (isWebPUrl(imageUrl)) {
            webpImages++;
          }
        } else {
          nonFirebaseImages++;
        }
        
        // Verificar accesibilidad (solo algunas imágenes para no sobrecargar)
        if (totalImages <= 10) {
          const accessibility = await checkImageAccessibility(imageUrl);
          if (!accessibility.accessible) {
            inaccessibleImages++;
          }
        }
      }
    }
    
    // Calcular porcentajes
    const webpPercentage = totalImages > 0 ? ((webpImages / totalImages) * 100).toFixed(2) : 0;
    const firebasePercentage = totalImages > 0 ? ((firebaseImages / totalImages) * 100).toFixed(2) : 0;
    const conversionPercentage = productsWithImages > 0 ? ((convertedProducts / productsWithImages) * 100).toFixed(2) : 0;
    
    // Mostrar estadísticas
    log('=== ESTADÍSTICAS DE CONVERSIÓN WEBP ===', 'INFO');
    log(`Total de productos: ${totalProducts}`, 'INFO');
    log(`Productos con imágenes: ${productsWithImages}`, 'INFO');
    log(`Productos convertidos: ${convertedProducts} (${conversionPercentage}%)`, 'INFO');
    log(`Total de imágenes: ${totalImages}`, 'INFO');
    log(`Imágenes WebP: ${webpImages} (${webpPercentage}%)`, 'INFO');
    log(`Imágenes de Firebase: ${firebaseImages} (${firebasePercentage}%)`, 'INFO');
    log(`Imágenes no-Firebase: ${nonFirebaseImages}`, 'INFO');
    log(`Imágenes inaccesibles (muestra): ${inaccessibleImages}`, 'WARNING');
    
    // Recomendaciones
    log('\n=== RECOMENDACIONES ===', 'INFO');
    
    if (conversionPercentage < 100) {
      log(`⚠️  Aún hay ${productsWithImages - convertedProducts} productos sin convertir`, 'WARNING');
    }
    
    if (webpPercentage < 100) {
      log(`⚠️  Aún hay ${totalImages - webpImages} imágenes sin convertir a WebP`, 'WARNING');
    }
    
    if (nonFirebaseImages > 0) {
      log(`⚠️  Hay ${nonFirebaseImages} imágenes que no están en Firebase Storage`, 'WARNING');
    }
    
    if (inaccessibleImages > 0) {
      log(`⚠️  Se encontraron ${inaccessibleImages} imágenes inaccesibles en la muestra`, 'WARNING');
    }
    
    if (conversionPercentage === 100 && webpPercentage === 100) {
      log('🎉 ¡Todas las imágenes han sido convertidas exitosamente!', 'SUCCESS');
    }
    
  } catch (error) {
    log(`Error: ${error.message}`, 'ERROR');
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log('Conexión a MongoDB cerrada', 'INFO');
  }
}

// Función para verificar un producto específico
async function verifyProduct(productId) {
  try {
    log('Conectando a MongoDB...', 'PROGRESS');
    await mongoose.connect(MONGODB_URI);
    log('Conectado a MongoDB exitosamente', 'SUCCESS');
    
    const product = await Product.findById(productId);
    if (!product) {
      log(`Producto no encontrado: ${productId}`, 'ERROR');
      return;
    }
    
    log(`Verificando producto: ${product.productName}`, 'INFO');
    log(`ID: ${product._id}`, 'INFO');
    log(`Imágenes: ${product.productImage.length}`, 'INFO');
    
    if (product.lastWebPConversion) {
      log(`Última conversión: ${product.lastWebPConversion}`, 'INFO');
    } else {
      log('No se ha convertido a WebP', 'WARNING');
    }
    
    for (let i = 0; i < product.productImage.length; i++) {
      const imageUrl = product.productImage[i];
      log(`\nImagen ${i + 1}:`, 'PROGRESS');
      log(`  URL: ${imageUrl}`, 'INFO');
      log(`  Firebase: ${isFirebaseUrl(imageUrl) ? 'Sí' : 'No'}`, 'INFO');
      log(`  WebP: ${isWebPUrl(imageUrl) ? 'Sí' : 'No'}`, 'INFO');
      
      const accessibility = await checkImageAccessibility(imageUrl);
      log(`  Accesible: ${accessibility.accessible ? 'Sí' : 'No'}`, accessibility.accessible ? 'SUCCESS' : 'ERROR');
      if (!accessibility.accessible) {
        log(`  Error: ${accessibility.error}`, 'ERROR');
      }
    }
    
  } catch (error) {
    log(`Error: ${error.message}`, 'ERROR');
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    await analyzeConversionStats();
  } else if (args[0] === '--product' && args[1]) {
    await verifyProduct(args[1]);
  } else {
    console.log(`
=== VERIFICADOR DE CONVERSIÓN WEBP ===

Uso:
  node verifyWebPConversion.js                    # Analizar todas las estadísticas
  node verifyWebPConversion.js --product <ID>     # Verificar producto específico

Ejemplos:
  node verifyWebPConversion.js
  node verifyWebPConversion.js --product "507f1f77bcf86cd799439011"
`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeConversionStats, verifyProduct };
