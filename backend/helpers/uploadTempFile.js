// backend/helpers/uploadTempFile.js
const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { v4: uuidv4 } = require('uuid');

// Configuración de Firebase 
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

/**
 * Sube un archivo temporal (PDF, principalmente) a Firebase Storage
 * @param {Buffer} fileBuffer - Buffer del archivo a subir
 * @param {Object} fileInfo - Información del archivo (nombre, tipo, tamaño)
 * @returns {Promise<Object>} - URL y metadatos del archivo subido
 */
const uploadTempFile = async (fileBuffer, fileInfo) => {
  try {
    // Crear un nombre único para el archivo
    const uniqueId = uuidv4();
    const fileName = `${uniqueId}_${fileInfo.name.replace(/\s+/g, '_')}`;
    
    // Ruta en Firebase Storage
    const storagePath = 'documents';
    const fullPath = `${storagePath}/${fileName}`;
    
    // Crear referencia para subir el archivo
    const storageRef = ref(storage, fullPath);
    
    // Subir el archivo
    const snapshot = await uploadBytes(storageRef, fileBuffer);
    
    // Obtener la URL pública
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Devolver un objeto con la información del archivo subido
    return {
      url: downloadURL,
      public_id: fullPath,
      secure_url: downloadURL,
      original_filename: fileInfo.name,
      format: fileInfo.name.split('.').pop().toLowerCase(),
      bytes: fileInfo.size
    };
  } catch (error) {
    console.error("Error al subir archivo temporal a Firebase Storage:", error);
    throw error;
  }
};

module.exports = { uploadTempFile };