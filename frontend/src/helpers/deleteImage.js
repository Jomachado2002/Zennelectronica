// frontend/src/helpers/deleteImage.js
import { storage } from '../config/firebase';
import { ref, deleteObject } from 'firebase/storage';

/**
 * Elimina una imagen de Firebase Storage
 * @param {string} imageUrl - URL completa de la imagen o public_id
 * @returns {Promise<Object>} - Resultado de la operación
 */
const deleteImage = async (imageUrl) => {
  try {
    let fullPath;
    
    // Verificar si es una URL completa o un public_id
    if (imageUrl.startsWith('http')) {
      // Es una URL completa, extraemos la ruta del archivo
      try {
        // Las URLs de Firebase suelen tener el formato:
        // https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[path]?token...
        const urlParts = imageUrl.split('/o/');
        if (urlParts.length < 2) {
          throw new Error('URL format not recognized');
        }
        
        // Decodificar la URL para manejar caracteres especiales
        fullPath = decodeURIComponent(urlParts[1].split('?')[0]);
      } catch (error) {
        console.error("Error parsing URL:", error);
        throw new Error(`Invalid image URL format: ${imageUrl}`);
      }
    } else {
      // Es un public_id, lo usamos directamente
      fullPath = imageUrl;
    }
    
    // Crear referencia al archivo a eliminar
    const storageRef = ref(storage, fullPath);
    
    // Eliminar el archivo
    await deleteObject(storageRef);
    
    return { 
      success: true, 
      message: "Image deleted successfully",
      path: fullPath
    };
  } catch (error) {
    console.error("Error deleting image from Firebase:", error);
    throw error;
  }
};

export default deleteImage;