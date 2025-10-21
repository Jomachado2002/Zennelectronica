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
  // console.log removed for production
}

// Función para convertir una imagen específica
async function convertSingleImage(imageUrl, productId = null) {
  try {
    log(`Iniciando conversión de: ${imageUrl}`, 'INFO');
    
    // Verificar si es URL de Firebase
    if (!imageUrl.includes('firebasestorage.googleapis.com')) {
      throw new Error('La URL no es de Firebase Storage');
    }
    
    // Extraer path del archivo
    const urlObj = new URL(imageUrl);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/);
    if (!pathMatch) {
      throw new Error('No se pudo extraer el path del archivo');
    }
    const firebasePath = decodeURIComponent(pathMatch[1]);
    
    // Verificar si ya es WebP
    if (firebasePath.toLowerCase().endsWith('.webp')) {
      log('La imagen ya es WebP', 'WARNING');
      return imageUrl;
    }
    
    // Crear directorio temporal
    const tempDir = path.join(__dirname, 'temp_single_conversion');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempId = uuidv4();
    const tempOriginalPath = path.join(tempDir, `${tempId}_original`);
    const tempWebpPath = path.join(tempDir, `${tempId}.webp`);
    
    try {
      // Descargar imagen
      log('Descargando imagen...', 'PROGRESS');
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      const imageBuffer = Buffer.from(response.data);
      fs.writeFileSync(tempOriginalPath, imageBuffer);
      
      // Convertir a WebP
      log('Convirtiendo a WebP...', 'PROGRESS');
      await sharp(imageBuffer)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ 
          quality: 85,
          effort: 6
        })
        .toFile(tempWebpPath);
      
      // Generar nuevo nombre de archivo
      const pathParts = firebasePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const nameWithoutExt = fileName.split('.')[0];
      const newFileName = `${nameWithoutExt}.webp`;
      const newPath = firebasePath.replace(fileName, newFileName);
      
      // Subir WebP a Firebase
      log('Subiendo WebP a Firebase...', 'PROGRESS');
      const webpBuffer = fs.readFileSync(tempWebpPath);
      const storageRef = ref(storage, newPath);
      const snapshot = await uploadBytes(storageRef, webpBuffer, {
        customMetadata: {
          convertedAt: new Date().toISOString(),
          originalFormat: 'converted_to_webp',
          quality: '85'
        }
      });
      
      const newWebpUrl = await getDownloadURL(snapshot.ref);
      
      // Eliminar imagen original
      log('Eliminando imagen original...', 'PROGRESS');
      const originalRef = ref(storage, firebasePath);
      await deleteObject(originalRef);
      
      // Limpiar archivos temporales
      if (fs.existsSync(tempOriginalPath)) fs.unlinkSync(tempOriginalPath);
      if (fs.existsSync(tempWebpPath)) fs.unlinkSync(tempWebpPath);
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
      
      log(`Conversión exitosa: ${imageUrl} -> ${newWebpUrl}`, 'SUCCESS');
      return newWebpUrl;
      
    } catch (error) {
      // Limpiar archivos temporales
      if (fs.existsSync(tempOriginalPath)) fs.unlinkSync(tempOriginalPath);
      if (fs.existsSync(tempWebpPath)) fs.unlinkSync(tempWebpPath);
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
      throw error;
    }
    
  } catch (error) {
    log(`Error en conversión: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Función para convertir todas las imágenes de un producto específico
async function convertProductImages(productId) {
  try {
    await mongoose.connect(MONGODB_URI);
    log('Conectado a MongoDB', 'SUCCESS');
    
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Producto no encontrado: ${productId}`);
    }
    
    log(`Procesando producto: ${product.productName}`, 'INFO');
    
    if (!product.productImage || product.productImage.length === 0) {
      log('El producto no tiene imágenes', 'WARNING');
      return;
    }
    
    const newImageUrls = [];
    
    for (let i = 0; i < product.productImage.length; i++) {
      const imageUrl = product.productImage[i];
      log(`Procesando imagen ${i + 1}/${product.productImage.length}`, 'PROGRESS');
      
      try {
        const newUrl = await convertSingleImage(imageUrl, productId);
        newImageUrls.push(newUrl);
      } catch (error) {
        log(`Error con imagen ${i + 1}: ${error.message}`, 'ERROR');
        newImageUrls.push(imageUrl); // Mantener URL original
      }
    }
    
    // Actualizar producto
    await Product.findByIdAndUpdate(productId, {
      productImage: newImageUrls,
      lastWebPConversion: new Date()
    });
    
    log(`Producto actualizado: ${product.productName}`, 'SUCCESS');
    
  } catch (error) {
    log(`Error: ${error.message}`, 'ERROR');
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
=== CONVERTIDOR DE IMAGEN INDIVIDUAL A WEBP ===

Uso:
  node convertSingleImageToWebP.js <URL_DE_IMAGEN>
  node convertSingleImageToWebP.js --product <ID_DEL_PRODUCTO>

Ejemplos:
  node convertSingleImageToWebP.js "https://firebasestorage.googleapis.com/..."
  node convertSingleImageToWebP.js --product "507f1f77bcf86cd799439011"
`);
    process.exit(1);
  }
  
  try {
    if (args[0] === '--product' && args[1]) {
      await convertProductImages(args[1]);
    } else {
      const imageUrl = args[0];
      const newUrl = await convertSingleImage(imageUrl);
      // console.log removed for production
    }
  } catch (error) {
    // console.error removed for production
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { convertSingleImage, convertProductImages };
