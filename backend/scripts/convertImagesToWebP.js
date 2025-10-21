const mongoose = require('mongoose');
const axios = require('axios');
const sharp = require('sharp');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBizDZqVCrTnU1-D5ajvaNCx0ZrRM_uLUo",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "eccomerce-jmcomputer.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "eccomerce-jmcomputer",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "eccomerce-jmcomputer.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "283552064252",
  appId: process.env.FIREBASE_APP_ID || "1:283552064252:web:04049ae8f8c2cfa1906d79",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-CZMQK251CP"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Importar modelo existente
const productModel = require('../models/productModel');
const Product = productModel;

// Configuración del script
const CONFIG = {
  // Directorio temporal para procesar imágenes
  TEMP_DIR: path.join(__dirname, 'temp_webp_conversion'),
  // Calidad de compresión WebP (0-100)
  WEBP_QUALITY: 85,
  // Tamaño máximo de imagen (ancho en píxeles)
  MAX_WIDTH: 1920,
  // Tamaño máximo de imagen (alto en píxeles)
  MAX_HEIGHT: 1080,
  // Límite de productos a procesar por lote
  BATCH_SIZE: 20,
  // Delay entre lotes (ms)
  BATCH_DELAY: 500,
  // Modo de prueba (no actualiza la base de datos)
  DRY_RUN: false
};

// Estadísticas del proceso
const stats = {
  totalProducts: 0,
  processedProducts: 0,
  totalImages: 0,
  convertedImages: 0,
  errors: 0,
  skippedImages: 0,
  startTime: null,
  endTime: null
};

// Función para logging con colores
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const colors = {
    INFO: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m', // Green
    WARNING: '\x1b[33m', // Yellow
    ERROR: '\x1b[31m',   // Red
    PROGRESS: '\x1b[35m' // Magenta
  };
  const reset = '\x1b[0m';
  const color = colors[type] || colors.INFO;
  // console.log removed for production
}

// Función para crear directorio temporal
function createTempDir() {
  if (!fs.existsSync(CONFIG.TEMP_DIR)) {
    fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
    log(`Directorio temporal creado: ${CONFIG.TEMP_DIR}`, 'SUCCESS');
  }
}

// Función para limpiar directorio temporal
function cleanupTempDir() {
  if (fs.existsSync(CONFIG.TEMP_DIR)) {
    fs.rmSync(CONFIG.TEMP_DIR, { recursive: true, force: true });
    log('Directorio temporal limpiado', 'SUCCESS');
  }
}

// Función para verificar si una URL es de Firebase Storage
function isFirebaseUrl(url) {
  return url && url.includes('firebasestorage.googleapis.com');
}

// Función para extraer el path del archivo desde la URL de Firebase
function extractFirebasePath(url) {
  try {
    const urlObj = new URL(url);
    // Buscar el patrón /o/ en la URL
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

// Función para descargar imagen desde Firebase
async function downloadImage(url) {
  try {
    log(`Descargando imagen: ${url}`, 'PROGRESS');
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    return Buffer.from(response.data);
  } catch (error) {
    log(`Error descargando imagen: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Función para convertir imagen a WebP
async function convertToWebP(imageBuffer, outputPath) {
  try {
    log(`Convirtiendo imagen a WebP: ${outputPath}`, 'PROGRESS');
    
    await sharp(imageBuffer)
      .resize(CONFIG.MAX_WIDTH, CONFIG.MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ 
        quality: CONFIG.WEBP_QUALITY,
        effort: 6 // Máximo esfuerzo de compresión
      })
      .toFile(outputPath);
    
    log(`Imagen convertida exitosamente: ${outputPath}`, 'SUCCESS');
    return true;
  } catch (error) {
    log(`Error convirtiendo imagen: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Función para subir imagen WebP a Firebase
async function uploadWebPToFirebase(webpPath, originalPath) {
  try {
    // Leer el archivo WebP
    const webpBuffer = fs.readFileSync(webpPath);
    
    // Generar nuevo nombre con extensión .webp
    const pathParts = originalPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.split('.')[0];
    const newFileName = `${nameWithoutExt}.webp`;
    
    // Crear nueva ruta en Firebase
    const newPath = originalPath.replace(fileName, newFileName);
    
    log(`Subiendo WebP a Firebase: ${newPath}`, 'PROGRESS');
    
    // Crear referencia y subir
    const storageRef = ref(storage, newPath);
    const snapshot = await uploadBytes(storageRef, webpBuffer, {
      customMetadata: {
        convertedAt: new Date().toISOString(),
        originalFormat: 'converted_to_webp',
        quality: CONFIG.WEBP_QUALITY.toString()
      }
    });
    
    // Obtener URL pública
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    log(`WebP subido exitosamente: ${downloadURL}`, 'SUCCESS');
    return downloadURL;
  } catch (error) {
    log(`Error subiendo WebP: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Función para eliminar imagen original de Firebase
async function deleteOriginalImage(originalPath) {
  try {
    if (CONFIG.DRY_RUN) {
      log(`[DRY RUN] Eliminaría imagen original: ${originalPath}`, 'WARNING');
      return true;
    }
    
    log(`Eliminando imagen original: ${originalPath}`, 'PROGRESS');
    const storageRef = ref(storage, originalPath);
    await deleteObject(storageRef);
    log(`Imagen original eliminada: ${originalPath}`, 'SUCCESS');
    return true;
  } catch (error) {
    log(`Error eliminando imagen original: ${error.message}`, 'ERROR');
    // No lanzamos el error para no interrumpir el proceso
    return false;
  }
}

// Función para procesar una imagen individual
async function processImage(imageUrl, productId) {
  try {
    // Verificar si es una URL de Firebase
    if (!isFirebaseUrl(imageUrl)) {
      log(`URL no es de Firebase, saltando: ${imageUrl}`, 'WARNING');
      stats.skippedImages++;
      return imageUrl; // Retornar URL original
    }
    
    // Extraer path del archivo
    const firebasePath = extractFirebasePath(imageUrl);
    if (!firebasePath) {
      log(`No se pudo extraer path de Firebase: ${imageUrl}`, 'WARNING');
      stats.skippedImages++;
      return imageUrl;
    }
    
    // Verificar si ya es WebP
    if (firebasePath.toLowerCase().endsWith('.webp')) {
      log(`Imagen ya es WebP, saltando: ${imageUrl}`, 'WARNING');
      stats.skippedImages++;
      return imageUrl;
    }
    
    // Crear nombres de archivos temporales
    const tempId = uuidv4();
    const tempOriginalPath = path.join(CONFIG.TEMP_DIR, `${tempId}_original`);
    const tempWebpPath = path.join(CONFIG.TEMP_DIR, `${tempId}.webp`);
    
    try {
      // Descargar imagen original
      const imageBuffer = await downloadImage(imageUrl);
      fs.writeFileSync(tempOriginalPath, imageBuffer);
      
      // Convertir a WebP
      await convertToWebP(imageBuffer, tempWebpPath);
      
      // Subir WebP a Firebase
      const newWebpUrl = await uploadWebPToFirebase(tempWebpPath, firebasePath);
      
      // Eliminar imagen original
      await deleteOriginalImage(firebasePath);
      
      // Limpiar archivos temporales
      if (fs.existsSync(tempOriginalPath)) fs.unlinkSync(tempOriginalPath);
      if (fs.existsSync(tempWebpPath)) fs.unlinkSync(tempWebpPath);
      
      stats.convertedImages++;
      log(`Imagen convertida exitosamente: ${imageUrl} -> ${newWebpUrl}`, 'SUCCESS');
      return newWebpUrl;
      
    } catch (error) {
      // Limpiar archivos temporales en caso de error
      if (fs.existsSync(tempOriginalPath)) fs.unlinkSync(tempOriginalPath);
      if (fs.existsSync(tempWebpPath)) fs.unlinkSync(tempWebpPath);
      throw error;
    }
    
  } catch (error) {
    log(`Error procesando imagen ${imageUrl}: ${error.message}`, 'ERROR');
    stats.errors++;
    return imageUrl; // Retornar URL original en caso de error
  }
}

// Función para procesar un producto
async function processProduct(product) {
  try {
    log(`Procesando producto: ${product.productName} (${product._id})`, 'PROGRESS');
    
    if (!product.productImage || product.productImage.length === 0) {
      log(`Producto sin imágenes, saltando: ${product.productName}`, 'WARNING');
      return;
    }
    
    const newImageUrls = [];
    
    // Procesar cada imagen del producto
    for (const imageUrl of product.productImage) {
      const newUrl = await processImage(imageUrl, product._id);
      newImageUrls.push(newUrl);
    }
    
    // Actualizar producto en la base de datos
    if (!CONFIG.DRY_RUN) {
      await Product.findByIdAndUpdate(product._id, {
        productImage: newImageUrls,
        lastWebPConversion: new Date()
      });
      log(`Producto actualizado en BD: ${product.productName}`, 'SUCCESS');
    } else {
      log(`[DRY RUN] Actualizaría producto en BD: ${product.productName}`, 'WARNING');
    }
    
    stats.processedProducts++;
    
  } catch (error) {
    log(`Error procesando producto ${product.productName}: ${error.message}`, 'ERROR');
    stats.errors++;
  }
}

// Función principal
async function convertImagesToWebP() {
  try {
    stats.startTime = new Date();
    log('=== INICIANDO CONVERSIÓN MASIVA A WEBP ===', 'INFO');
    log(`Configuración:`, 'INFO');
    log(`- Calidad WebP: ${CONFIG.WEBP_QUALITY}`, 'INFO');
    log(`- Tamaño máximo: ${CONFIG.MAX_WIDTH}x${CONFIG.MAX_HEIGHT}`, 'INFO');
    log(`- Tamaño de lote: ${CONFIG.BATCH_SIZE}`, 'INFO');
    log(`- Modo prueba: ${CONFIG.DRY_RUN ? 'SÍ' : 'NO'}`, 'INFO');
    
    // Conectar a MongoDB
    log('Conectando a MongoDB...', 'PROGRESS');
    await mongoose.connect(MONGODB_URI);
    log('Conectado a MongoDB exitosamente', 'SUCCESS');
    
    // Crear directorio temporal
    createTempDir();
    
    // Obtener total de productos
    stats.totalProducts = await Product.countDocuments();
    log(`Total de productos encontrados: ${stats.totalProducts}`, 'INFO');
    
    // Obtener total de imágenes
    const productsWithImages = await Product.find({ productImage: { $exists: true, $ne: [] } });
    stats.totalImages = productsWithImages.reduce((total, product) => total + product.productImage.length, 0);
    log(`Total de imágenes encontradas: ${stats.totalImages}`, 'INFO');
    
    // Procesar productos en lotes
    let skip = 0;
    let hasMore = true;
    
    while (hasMore) {
      log(`Procesando lote: ${skip + 1} - ${skip + CONFIG.BATCH_SIZE}`, 'PROGRESS');
      
      const products = await Product.find({ productImage: { $exists: true, $ne: [] } })
        .skip(skip)
        .limit(CONFIG.BATCH_SIZE);
      
      if (products.length === 0) {
        hasMore = false;
        break;
      }
      
      // Procesar cada producto en el lote
      for (const product of products) {
        await processProduct(product);
      }
      
      skip += CONFIG.BATCH_SIZE;
      
      // Delay entre lotes
      if (hasMore) {
        log(`Esperando 500ms antes del siguiente lote...`, 'PROGRESS');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    stats.endTime = new Date();
    const duration = (stats.endTime - stats.startTime) / 1000;
    
    // Mostrar estadísticas finales
    log('=== CONVERSIÓN COMPLETADA ===', 'SUCCESS');
    log(`Duración total: ${Math.round(duration)} segundos`, 'INFO');
    log(`Productos procesados: ${stats.processedProducts}/${stats.totalProducts}`, 'INFO');
    log(`Imágenes convertidas: ${stats.convertedImages}/${stats.totalImages}`, 'INFO');
    log(`Imágenes saltadas: ${stats.skippedImages}`, 'INFO');
    log(`Errores: ${stats.errors}`, stats.errors > 0 ? 'ERROR' : 'SUCCESS');
    
  } catch (error) {
    log(`Error general: ${error.message}`, 'ERROR');
    // console.error removed for production
  } finally {
    // Limpiar recursos
    cleanupTempDir();
    await mongoose.disconnect();
    log('Conexión a MongoDB cerrada', 'INFO');
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log(`
=== CONVERTIDOR MASIVO DE IMÁGENES A WEBP ===

Uso: node convertImagesToWebP.js [opciones]

Opciones:
  --dry-run          Modo de prueba (no actualiza la base de datos)
  --quality=85       Calidad WebP (0-100, default: 85)
  --max-width=1920   Ancho máximo en píxeles (default: 1920)
  --max-height=1080  Alto máximo en píxeles (default: 1080)
  --batch-size=10    Tamaño de lote (default: 10)
  --help             Mostrar esta ayuda

Ejemplos:
  node convertImagesToWebP.js --dry-run
  node convertImagesToWebP.js --quality=90 --max-width=2048
  node convertImagesToWebP.js --batch-size=5 --dry-run

Variables de entorno requeridas:
  MONGODB_URI
  FIREBASE_API_KEY
  FIREBASE_AUTH_DOMAIN
  FIREBASE_PROJECT_ID
  FIREBASE_STORAGE_BUCKET
  FIREBASE_MESSAGING_SENDER_ID
  FIREBASE_APP_ID
  FIREBASE_MEASUREMENT_ID
`);
}

// Procesar argumentos de línea de comandos
function processArgs() {
  const args = process.argv.slice(2);
  
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--dry-run') {
      CONFIG.DRY_RUN = true;
    } else if (arg.startsWith('--quality=')) {
      CONFIG.WEBP_QUALITY = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--max-width=')) {
      CONFIG.MAX_WIDTH = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--max-height=')) {
      CONFIG.MAX_HEIGHT = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--batch-size=')) {
      CONFIG.BATCH_SIZE = parseInt(arg.split('=')[1]);
    }
  }
}

// Ejecutar script
if (require.main === module) {
  processArgs();
  convertImagesToWebP().catch(console.error);
}

module.exports = { convertImagesToWebP, CONFIG };
