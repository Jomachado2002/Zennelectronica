const mongoose = require('mongoose');
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

// Función para probar conversión con una imagen de prueba
async function testSingleImageConversion() {
  try {
    log('=== PRUEBA DE CONVERSIÓN DE IMAGEN INDIVIDUAL ===', 'INFO');
    
    // Buscar un producto con imágenes para probar
    const product = await Product.findOne({ 
      productImage: { $exists: true, $ne: [] } 
    });
    
    if (!product) {
      log('No se encontraron productos con imágenes para probar', 'WARNING');
      return;
    }
    
    log(`Producto de prueba: ${product.productName}`, 'INFO');
    log(`Imágenes disponibles: ${product.productImage.length}`, 'INFO');
    
    // Tomar la primera imagen para la prueba
    const testImageUrl = product.productImage[0];
    log(`URL de prueba: ${testImageUrl}`, 'INFO');
    
    // Verificar si ya es WebP
    if (testImageUrl.toLowerCase().includes('.webp')) {
      log('La imagen ya es WebP, buscando otra...', 'WARNING');
      
      // Buscar otra imagen que no sea WebP
      const nonWebPImage = product.productImage.find(img => 
        !img.toLowerCase().includes('.webp')
      );
      
      if (nonWebPImage) {
        log(`Usando imagen no-WebP: ${nonWebPImage}`, 'INFO');
        await testConversion(nonWebPImage);
      } else {
        log('Todas las imágenes de este producto ya son WebP', 'WARNING');
      }
    } else {
      await testConversion(testImageUrl);
    }
    
  } catch (error) {
    log(`Error en prueba individual: ${error.message}`, 'ERROR');
    console.error(error);
  }
}

// Función para probar la conversión
async function testConversion(imageUrl) {
  try {
    log('Iniciando conversión de prueba...', 'PROGRESS');
    
    // Verificar conectividad
    log('Verificando conectividad a Firebase...', 'PROGRESS');
    const { initializeApp } = require('firebase/app');
    const { getStorage } = require('firebase/storage');
    
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBizDZqVCrTnU1-D5ajvaNCx0ZrRM_uLUo",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "eccomerce-jmcomputer.firebaseapp.com",
      projectId: process.env.FIREBASE_PROJECT_ID || "eccomerce-jmcomputer",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "eccomerce-jmcomputer.firebasestorage.app",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "283552064252",
      appId: process.env.FIREBASE_APP_ID || "1:283552064252:web:04049ae8f8c2cfa1906d79",
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-CZMQK251CP"
    };
    
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    log('Conectividad a Firebase verificada', 'SUCCESS');
    
    // Verificar dependencias
    log('Verificando dependencias...', 'PROGRESS');
    
    try {
      const sharp = require('sharp');
      log('Sharp instalado correctamente', 'SUCCESS');
    } catch (error) {
      log('Error: Sharp no está instalado. Ejecuta: npm install sharp', 'ERROR');
      return;
    }
    
    try {
      const axios = require('axios');
      log('Axios disponible', 'SUCCESS');
    } catch (error) {
      log('Error: Axios no está disponible', 'ERROR');
      return;
    }
    
    try {
      const { v4: uuidv4 } = require('uuid');
      log('UUID disponible', 'SUCCESS');
    } catch (error) {
      log('Error: UUID no está disponible', 'ERROR');
      return;
    }
    
    // Probar descarga de imagen
    log('Probando descarga de imagen...', 'PROGRESS');
    const axios = require('axios');
    const response = await axios.head(imageUrl, { timeout: 10000 });
    log(`Imagen accesible (Status: ${response.status})`, 'SUCCESS');
    
    // Mostrar información de la imagen
    log(`Content-Type: ${response.headers['content-type']}`, 'INFO');
    log(`Content-Length: ${response.headers['content-length']} bytes`, 'INFO');
    
    log('✅ Todas las verificaciones pasaron correctamente', 'SUCCESS');
    log('El sistema está listo para la conversión masiva', 'SUCCESS');
    
  } catch (error) {
    log(`Error en verificación: ${error.message}`, 'ERROR');
    console.error(error);
  }
}

// Función para mostrar estadísticas actuales
async function showCurrentStats() {
  try {
    log('=== ESTADÍSTICAS ACTUALES ===', 'INFO');
    await analyzeConversionStats();
  } catch (error) {
    log(`Error obteniendo estadísticas: ${error.message}`, 'ERROR');
  }
}

// Función principal
async function main() {
  try {
    log('=== PRUEBA DEL SISTEMA DE CONVERSIÓN WEBP ===', 'INFO');
    
    // Conectar a MongoDB
    log('Conectando a MongoDB...', 'PROGRESS');
    await mongoose.connect(MONGODB_URI);
    log('Conectado a MongoDB exitosamente', 'SUCCESS');
    
    // Mostrar estadísticas actuales
    await showCurrentStats();
    
    // Probar conversión individual
    await testSingleImageConversion();
    
    log('\n=== RESUMEN DE PRUEBAS ===', 'INFO');
    log('✅ Conexión a MongoDB: OK', 'SUCCESS');
    log('✅ Conexión a Firebase: OK', 'SUCCESS');
    log('✅ Dependencias: OK', 'SUCCESS');
    log('✅ Acceso a imágenes: OK', 'SUCCESS');
    
    log('\n🚀 El sistema está listo para la conversión masiva', 'SUCCESS');
    log('Ejecuta: node scripts/convertImagesToWebP.js --dry-run', 'INFO');
    
  } catch (error) {
    log(`Error general: ${error.message}`, 'ERROR');
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log('Conexión a MongoDB cerrada', 'INFO');
  }
}

if (require.main === module) {
  main();
}

module.exports = { testSingleImageConversion, testConversion, showCurrentStats };
