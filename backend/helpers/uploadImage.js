// backend/helpers/uploadImage.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Función para subir imágenes (mantén tu implementación existente si ya la tienes)
const uploadImage = async (image) => {
  // Tu código existente...
  // Si no tienes esta función, puedes dejarla vacía o implementarla según necesites
};

// Función simplificada para generar PDFs localmente
const uploadTempFile = async (fileBuffer, fileInfo) => {
  try {
    // Crear un nombre único para el archivo
    const uniqueId = uuidv4();
    const fileName = `${uniqueId}_${fileInfo.name.replace(/\s+/g, '_')}`;
    
    // Crear carpeta de uploads si no existe
    const uploadDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Ruta completa del archivo
    const filePath = path.join(uploadDir, fileName);
    
    // Guardar el archivo
    fs.writeFileSync(filePath, fileBuffer);
    
    // Devolver la ruta local del archivo (para descarga)
    return {
      filePath,
      fileName,
      originalFilename: fileInfo.name
    };
  } catch (error) {
    console.error("Error al generar archivo temporal:", error);
    throw error;
  }
};

module.exports = { uploadImage, uploadTempFile };