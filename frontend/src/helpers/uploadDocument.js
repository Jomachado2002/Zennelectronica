// frontend/src/helpers/uploadDocument.js
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Configuración de Firebase
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
 * Tipos de documentos permitidos
 */
const ALLOWED_DOCUMENT_TYPES = {
  // Documentos
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  
  // Imágenes
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg'
};

/**
 * Tamaños máximos por tipo de archivo (en bytes)
 */
const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024,    // 5MB para imágenes
  document: 10 * 1024 * 1024, // 10MB para documentos
  default: 5 * 1024 * 1024    // 5MB por defecto
};

/**
 * Valida si el archivo es válido
 * @param {File} file - Archivo a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} - Resultado de la validación
 */
const validateFile = (file, options = {}) => {
  const {
    maxSize = MAX_FILE_SIZES.default,
    allowedTypes = Object.keys(ALLOWED_DOCUMENT_TYPES),
    allowedCategories = ['image', 'document']
  } = options;

  // Verificar que el archivo existe
  if (!file) {
    return {
      isValid: false,
      error: 'No se ha seleccionado ningún archivo'
    };
  }

  // Verificar el tipo de archivo
  if (!ALLOWED_DOCUMENT_TYPES[file.type]) {
    return {
      isValid: false,
      error: `Tipo de archivo no permitido: ${file.type}. Tipos permitidos: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG`
    };
  }

  // Verificar tipos permitidos específicos
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Tipo de archivo no permitido para esta operación`
    };
  }

  // Verificar el tamaño del archivo
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`
    };
  }

  // Verificar categorías permitidas
  const isImage = file.type.startsWith('image/');
  const isDocument = !isImage;
  
  if (!allowedCategories.includes('image') && isImage) {
    return {
      isValid: false,
      error: 'No se permiten imágenes para esta operación'
    };
  }

  if (!allowedCategories.includes('document') && isDocument) {
    return {
      isValid: false,
      error: 'No se permiten documentos para esta operación'
    };
  }

  return {
    isValid: true,
    fileType: ALLOWED_DOCUMENT_TYPES[file.type],
    category: isImage ? 'image' : 'document'
  };
};

/**
 * Genera un nombre de archivo único y seguro
 * @param {File} file - Archivo original
 * @param {string} folder - Carpeta de destino
 * @returns {string} - Nombre de archivo único
 */
const generateUniqueFileName = (file, folder = 'documents') => {
  const uniqueId = uuidv4();
  const timestamp = Date.now();
  const fileExtension = ALLOWED_DOCUMENT_TYPES[file.type];
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Reemplazar caracteres especiales
    .replace(/_{2,}/g, '_')          // Reemplazar múltiples guiones bajos
    .substring(0, 50);               // Limitar longitud

  return `${folder}/${timestamp}_${uniqueId}_${sanitizedName}.${fileExtension}`;
};

/**
 * Sube un documento a Firebase Storage
 * @param {File} file - Archivo a subir
 * @param {Object} options - Opciones de subida
 * @returns {Promise<Object>} - Resultado de la subida
 */
const uploadDocument = async (file, options = {}) => {
  try {
    const {
      folder = 'documents',
      maxSize = MAX_FILE_SIZES.default,
      allowedTypes = Object.keys(ALLOWED_DOCUMENT_TYPES),
      allowedCategories = ['image', 'document'],
      onProgress = null
    } = options;

    // Validar el archivo
    const validation = validateFile(file, { maxSize, allowedTypes, allowedCategories });
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Generar nombre único para el archivo
    const fileName = generateUniqueFileName(file, folder);
    
    // Crear referencia para subir el archivo
    const storageRef = ref(storage, fileName);
    
    // Configurar metadatos del archivo
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        category: validation.category,
        fileExtension: validation.fileType
      }
    };

    // Subir el archivo con seguimiento del progreso
    let uploadTask;
    if (onProgress && typeof onProgress === 'function') {
      // Si se proporciona callback de progreso, usar uploadBytesResumable
      const { uploadBytesResumable } = await import('firebase/storage');
      uploadTask = uploadBytesResumable(storageRef, file, metadata);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => {
            console.error("Error durante la subida:", error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                success: true,
                url: downloadURL,
                public_id: fileName,
                secure_url: downloadURL,
                original_filename: file.name,
                format: validation.fileType,
                bytes: file.size,
                category: validation.category,
                uploaded_at: new Date().toISOString()
              });
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } else {
      // Subida simple sin seguimiento de progreso
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        success: true,
        url: downloadURL,
        public_id: fileName,
        secure_url: downloadURL,
        original_filename: file.name,
        format: validation.fileType,
        bytes: file.size,
        category: validation.category,
        uploaded_at: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error("Error al subir el documento:", error);
    throw new Error(`Error al subir el archivo: ${error.message}`);
  }
};

/**
 * Sube múltiples documentos
 * @param {FileList|Array} files - Lista de archivos a subir
 * @param {Object} options - Opciones de subida
 * @returns {Promise<Array>} - Array con los resultados de cada subida
 */
const uploadMultipleDocuments = async (files, options = {}) => {
  const {
    maxFiles = 5,
    onProgress = null
  } = options;

  // Convertir FileList a Array si es necesario
  const fileArray = Array.from(files);

  // Verificar límite de archivos
  if (fileArray.length > maxFiles) {
    throw new Error(`No se pueden subir más de ${maxFiles} archivos a la vez`);
  }

  // Subir archivos uno por uno o en paralelo
  const uploadPromises = fileArray.map(async (file, index) => {
    try {
      const progressCallback = onProgress ? 
        (progress) => onProgress(index, progress) : null;
      
      return await uploadDocument(file, {
        ...options,
        onProgress: progressCallback
      });
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filename: file.name
      };
    }
  });

  return Promise.all(uploadPromises);
};

/**
 * Funciones específicas para diferentes tipos de documentos
 */
export const uploadInvoice = (file, options = {}) => {
  return uploadDocument(file, {
    folder: 'invoices',
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: MAX_FILE_SIZES.document,
    ...options
  });
};

export const uploadReceipt = (file, options = {}) => {
  return uploadDocument(file, {
    folder: 'receipts',
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: MAX_FILE_SIZES.document,
    ...options
  });
};

export const uploadBudgetDocument = (file, options = {}) => {
  return uploadDocument(file, {
    folder: 'budgets',
    allowedTypes: ['application/pdf'],
    maxSize: MAX_FILE_SIZES.document,
    ...options
  });
};

export const uploadGeneralDocument = (file, options = {}) => {
  return uploadDocument(file, {
    folder: 'documents',
    ...options
  });
};

// Exportaciones
export { 
  uploadDocument, 
  uploadMultipleDocuments, 
  validateFile, 
  ALLOWED_DOCUMENT_TYPES, 
  MAX_FILE_SIZES 
};

export default uploadDocument;