// frontend/src/helpers/uploadImage.js
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid'; // Necesitarás instalar este paquete: npm install uuid

// Configuración de Firebase directamente en este archivo para evitar dependencias
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "eccomerce-jmcomputer.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

/**
 * Sube una imagen a Firebase Storage y devuelve la URL pública
 * @param {File} image - Archivo de imagen a subir
 * @returns {Promise<Object>} - Estructura similar a la respuesta de Cloudinary
 */
const uploadImage = async(image) => {
  try {
    // Crear un nombre único para la imagen
    const uniqueId = uuidv4();
    const fileName = `${uniqueId}_${image.name.replace(/\s+/g, '_')}`;
    
    // Ruta en Firebase Storage
    const storagePath = 'products';
    const fullPath = `${storagePath}/${fileName}`;
    
    // Crear referencia para subir la imagen
    const storageRef = ref(storage, fullPath);
    
    // Subir la imagen
    const snapshot = await uploadBytes(storageRef, image);
    
    // Obtener la URL pública
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Devolver un objeto similar al que devolvía Cloudinary
    return {
      url: downloadURL,
      public_id: fullPath,
      secure_url: downloadURL,
      original_filename: image.name,
      format: image.name.split('.').pop().toLowerCase(),
      bytes: image.size
    };
  } catch (error) {
    console.error("Error al subir la imagen a Firebase Storage:", error);
    throw error;
  }
};

export default uploadImage;