const mongoose = require('mongoose');
const sharp = require('sharp');
const axios = require('axios');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const productModel = require('../models/productModel');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBqJgJgJgJgJgJgJgJgJgJgJgJgJgJgJgJg",
  authDomain: "eccomerce-jmcomputer.firebaseapp.com",
  projectId: "eccomerce-jmcomputer",
  storageBucket: "eccomerce-jmcomputer.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Configuración optimizada
const CONFIG = {
  BATCH_SIZE: 50, // Lotes más grandes
  BATCH_DELAY: 100, // Pausa mínima
  MAX_CONCURRENT: 5, // Procesamiento paralelo
  QUALITY: 80, // Calidad WebP
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1080
};

// Estadísticas
let stats = {
  startTime: new Date(),
  endTime: null,
  totalProducts: 0,
  processedProducts: 0,
  totalImages: 0,
  convertedImages: 0,
  skippedImages: 0,
  errors: 0
};

// Función de logging
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${type}:`;
  console.log(`${prefix} ${message}`);
}

// Función para extraer path de Firebase
function extractFirebasePath(url) {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/);
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }
    return null;
  } catch (error) {
    log(`Error extrayendo path de URL: ${error.message}`, 'WARNING');
    return null;
  }
}

// Función para convertir imagen
async function convertImageToWebP(imageUrl, productName) {
  try {
    // Descargar imagen
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 10000 
    });
    
    const imageBuffer = Buffer.from(response.data);
    
    // Convertir a WebP
    const webpBuffer = await sharp(imageBuffer)
      .resize(CONFIG.MAX_WIDTH, CONFIG.MAX_HEIGHT, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .webp({ quality: CONFIG.QUALITY })
      .toBuffer();
    
    // Generar nombre único
    const uniqueId = uuidv4();
    const originalPath = extractFirebasePath(imageUrl);
    if (!originalPath) {
      throw new Error('No se pudo extraer el path del archivo');
    }
    
    const fileName = path.basename(originalPath, path.extname(originalPath));
    const webpFileName = `${fileName}.webp`;
    const webpPath = `products/${webpFileName}`;
    
    // Subir WebP a Firebase
    const webpRef = ref(storage, webpPath);
    const webpSnapshot = await uploadBytes(webpRef, webpBuffer);
    const webpUrl = await getDownloadURL(webpSnapshot.ref);
    
    // Eliminar imagen original
    const originalRef = ref(storage, originalPath);
    await deleteObject(originalRef);
    
    return webpUrl;
    
  } catch (error) {
    log(`Error convirtiendo imagen: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Función para procesar producto
async function processProduct(product) {
  try {
    log(`Procesando producto: ${product.productName}`, 'PROGRESS');
    
    const newImageUrls = [];
    let convertedCount = 0;
    
    for (const imageUrl of product.productImage) {
      try {
        // Verificar si ya es WebP
        if (imageUrl.includes('.webp')) {
          log(`Imagen ya es WebP, saltando: ${imageUrl}`, 'WARNING');
          newImageUrls.push(imageUrl);
          stats.skippedImages++;
          continue;
        }
        
        // Convertir imagen
        const webpUrl = await convertImageToWebP(imageUrl, product.productName);
        newImageUrls.push(webpUrl);
        convertedCount++;
        stats.convertedImages++;
        
        log(`Imagen convertida: ${imageUrl} -> ${webpUrl}`, 'SUCCESS');
        
      } catch (error) {
        log(`Error procesando imagen ${imageUrl}: ${error.message}`, 'ERROR');
        newImageUrls.push(imageUrl); // Mantener URL original en caso de error
        stats.errors++;
      }
    }
    
    // Actualizar producto en la base de datos
    if (convertedCount > 0) {
      await productModel.findByIdAndUpdate(product._id, {
        productImage: newImageUrls
      });
      log(`Producto actualizado en BD: ${product.productName}`, 'SUCCESS');
    }
    
    stats.processedProducts++;
    return convertedCount;
    
  } catch (error) {
    log(`Error procesando producto ${product.productName}: ${error.message}`, 'ERROR');
    stats.errors++;
    return 0;
  }
}

// Función principal
async function convertImagesToWebP() {
  try {
    log('🚀 INICIANDO CONVERSIÓN MASIVA OPTIMIZADA A WEBP...', 'INFO');
    
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    log('Conectado a MongoDB exitosamente', 'SUCCESS');
    
    // Obtener productos con imágenes
    const products = await productModel.find({
      productImage: { $exists: true, $ne: [] }
    });
    
    stats.totalProducts = products.length;
    stats.totalImages = products.reduce((sum, product) => sum + product.productImage.length, 0);
    
    log(`Encontrados ${stats.totalProducts} productos con ${stats.totalImages} imágenes`, 'INFO');
    
    // Procesar en lotes
    for (let i = 0; i < products.length; i += CONFIG.BATCH_SIZE) {
      const batch = products.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
      
      log(`Procesando lote ${batchNumber}: ${i + 1} - ${Math.min(i + CONFIG.BATCH_SIZE, products.length)}`, 'PROGRESS');
      
      // Procesar lote en paralelo
      const promises = batch.map(product => processProduct(product));
      await Promise.all(promises);
      
      // Pausa mínima entre lotes
      if (i + CONFIG.BATCH_SIZE < products.length) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
      }
    }
    
    // Mostrar estadísticas finales
    stats.endTime = new Date();
    const duration = (stats.endTime - stats.startTime) / 1000;
    
    log('🎉 CONVERSIÓN COMPLETADA!', 'SUCCESS');
    log(`📊 ESTADÍSTICAS FINALES:`, 'INFO');
    log(`   ⏱️  Tiempo total: ${Math.round(duration)} segundos`, 'INFO');
    log(`   📦 Productos procesados: ${stats.processedProducts}/${stats.totalProducts}`, 'INFO');
    log(`   🖼️  Imágenes totales: ${stats.totalImages}`, 'INFO');
    log(`   ✅ Imágenes convertidas: ${stats.convertedImages}`, 'SUCCESS');
    log(`   ⏭️  Imágenes saltadas: ${stats.skippedImages}`, 'INFO');
    log(`   ❌ Errores: ${stats.errors}`, 'ERROR');
    log(`   🚀 Velocidad: ${Math.round(stats.convertedImages / duration)} imágenes/segundo`, 'INFO');
    
  } catch (error) {
    log(`Error crítico: ${error.message}`, 'ERROR');
  } finally {
    await mongoose.disconnect();
    log('Desconectado de MongoDB', 'INFO');
  }
}

// Ejecutar conversión
convertImagesToWebP();
