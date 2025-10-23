// Configuración para la conversión masiva de imágenes a WebP
module.exports = {
  // Configuración de Firebase
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBizDZqVCrTnU1-D5ajvaNCx0ZrRM_uLUo",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "eccomerce-jmcomputer.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "eccomerce-jmcomputer",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "eccomerce-jmcomputer.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "283552064252",
    appId: process.env.FIREBASE_APP_ID || "1:283552064252:web:04049ae8f8c2cfa1906d79",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-CZMQK251CP"
  },
  
  // Configuración de MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0'
  },
  
  // Configuración de conversión WebP
  webp: {
    quality: 85,           // Calidad de compresión (0-100)
    maxWidth: 1920,        // Ancho máximo en píxeles
    maxHeight: 1080,       // Alto máximo en píxeles
    effort: 6              // Esfuerzo de compresión (0-6)
  },
  
  // Configuración del procesamiento
  processing: {
    batchSize: 10,         // Productos por lote
    batchDelay: 2000,      // Delay entre lotes (ms)
    timeout: 30000,        // Timeout para descargas (ms)
    dryRun: false          // Modo de prueba
  },
  
  // Configuración de directorios
  directories: {
    tempDir: 'temp_webp_conversion',
    singleTempDir: 'temp_single_conversion'
  },
  
  // Formatos de imagen soportados
  supportedFormats: [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif'
  ],
  
  // Configuración de logging
  logging: {
    levels: ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'PROGRESS'],
    colors: {
      INFO: '\x1b[36m',    // Cyan
      SUCCESS: '\x1b[32m', // Green
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m',   // Red
      PROGRESS: '\x1b[35m' // Magenta
    }
  }
};




