// frontend/src/helpers/imageOptimizer.js
// Helper para optimización automática de imágenes a WebP

import imageCompression from 'browser-image-compression';

/**
 * Configuración por defecto para optimización de imágenes
 */
const DEFAULT_OPTIONS = {
    maxSizeMB: 2, // Máximo 2MB después de comprimir
    maxWidthOrHeight: 1920, // Máximo 1920px de ancho o alto
    useWebWorker: true, // Usar Web Worker para mejor rendimiento
    quality: 0.85, // Calidad 85% (excelente calidad, buen ahorro)
    fileType: 'image/webp', // Convertir a WebP
    initialQuality: 0.85,
    alwaysKeepResolution: false, // Permitir redimensionar si es necesario
    preserveExif: false, // No preservar metadatos EXIF para reducir tamaño
};

/**
 * Valida si un archivo es una imagen válida
 * @param {File} file - Archivo a validar
 * @returns {boolean} True si es una imagen válida
 */
export function isValidImageFile(file) {
    if (!file || !file.type) return false;
    
    const validTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff'
    ];
    
    return validTypes.includes(file.type.toLowerCase());
}

/**
 * Valida el tamaño de un archivo
 * @param {File} file - Archivo a validar
 * @param {number} maxSizeMB - Tamaño máximo en MB
 * @returns {Object} { isValid: boolean, sizeMB: number, message?: string }
 */
export function validateFileSize(file, maxSizeMB = 10) {
    const sizeMB = file.size / (1024 * 1024);
    const isValid = sizeMB <= maxSizeMB;
    
    return {
        isValid,
        sizeMB: Math.round(sizeMB * 100) / 100,
        message: isValid ? null : `El archivo ${file.name} es muy grande (${Math.round(sizeMB * 100) / 100}MB). Máximo permitido: ${maxSizeMB}MB`
    };
}

/**
 * Optimiza una imagen individual
 * @param {File} file - Archivo de imagen a optimizar
 * @param {Object} options - Opciones de optimización
 * @returns {Promise<File>} Archivo optimizado
 */
export async function optimizeImage(file, options = {}) {
    try {
        console.log(`🖼️ Optimizando imagen: ${file.name} (${Math.round(file.size / 1024)}KB)`);
        
        // Validar que sea una imagen
        if (!isValidImageFile(file)) {
            throw new Error(`El archivo ${file.name} no es una imagen válida`);
        }
        
        // Validar tamaño
        const sizeValidation = validateFileSize(file, 10);
        if (!sizeValidation.isValid) {
            throw new Error(sizeValidation.message);
        }
        
        // Configuración combinada
        const compressionOptions = {
            ...DEFAULT_OPTIONS,
            ...options
        };
        
        // Optimizar imagen
        const optimizedFile = await imageCompression(file, compressionOptions);
        
        const originalSizeKB = Math.round(file.size / 1024);
        const optimizedSizeKB = Math.round(optimizedFile.size / 1024);
        const reductionPercent = Math.round(((file.size - optimizedFile.size) / file.size) * 100);
        
        // console.log removed for production
        console.log(`📊 Tamaño: ${originalSizeKB}KB → ${optimizedSizeKB}KB (${reductionPercent}% reducción)`);
        
        return {
            file: optimizedFile,
            originalSize: file.size,
            optimizedSize: optimizedFile.size,
            reductionPercent,
            success: true
        };
        
    } catch (error) {
        // console.error removed for production
        return {
            file: file, // Usar archivo original si falla la optimización
            originalSize: file.size,
            optimizedSize: file.size,
            reductionPercent: 0,
            success: false,
            error: error.message
        };
    }
}

/**
 * Optimiza múltiples imágenes en paralelo
 * @param {File[]} files - Array de archivos de imagen
 * @param {Object} options - Opciones de optimización
 * @param {Function} onProgress - Callback de progreso (index, total, fileName)
 * @returns {Promise<Array>} Array de resultados de optimización
 */
export async function optimizeMultipleImages(files, options = {}, onProgress = null) {
    // console.log removed for production
    
    const results = [];
    const validFiles = files.filter(file => isValidImageFile(file));
    
    if (validFiles.length === 0) {
        // console.log removed for production
        return [];
    }
    
    // console.log removed for production
    
    // Procesar en paralelo con límite de concurrencia
    const BATCH_SIZE = 3; // Procesar máximo 3 imágenes a la vez
    const batches = [];
    
    for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
        batches.push(validFiles.slice(i, i + BATCH_SIZE));
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📦 Procesando lote ${batchIndex + 1}/${batches.length} (${batch.length} imágenes)`);
        
        // Procesar lote en paralelo
        const batchPromises = batch.map(async (file, fileIndex) => {
            const globalIndex = batchIndex * BATCH_SIZE + fileIndex;
            
            if (onProgress) {
                onProgress(globalIndex + 1, validFiles.length, file.name);
            }
            
            return await optimizeImage(file, options);
        });
        
        try {
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        } catch (error) {
            // console.error removed for production
            // Agregar errores para este lote
            batch.forEach((file, fileIndex) => {
                results.push({
                    file: file,
                    originalSize: file.size,
                    optimizedSize: file.size,
                    reductionPercent: 0,
                    success: false,
                    error: `Error en lote: ${error.message}`
                });
            });
        }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalReduction = results.reduce((sum, r) => sum + r.reductionPercent, 0) / results.length;
    
    // console.log removed for production
    console.log(`📊 Reducción promedio: ${Math.round(totalReduction)}%`);
    
    return results;
}

/**
 * Obtiene estadísticas de optimización
 * @param {Array} results - Resultados de optimización
 * @returns {Object} Estadísticas
 */
export function getOptimizationStats(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOptimizedSize = results.reduce((sum, r) => sum + r.optimizedSize, 0);
    const totalReduction = totalOriginalSize > 0 ? 
        Math.round(((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100) : 0;
    
    return {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        totalOriginalSize,
        totalOptimizedSize,
        totalReduction,
        averageReduction: successful.length > 0 ? 
            Math.round(successful.reduce((sum, r) => sum + r.reductionPercent, 0) / successful.length) : 0
    };
}

/**
 * Crea un archivo File desde datos del portapapeles
 * @param {DataTransferItem} item - Item del portapapeles
 * @returns {Promise<File>} Archivo creado
 */
export async function createFileFromClipboardItem(item) {
    return new Promise((resolve, reject) => {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            resolve(file);
        } else {
            reject(new Error('No es una imagen válida del portapapeles'));
        }
    });
}

/**
 * Procesa items del portapapeles y extrae imágenes
 * @param {DataTransfer} clipboardData - Datos del portapapeles
 * @returns {Promise<File[]>} Array de archivos de imagen
 */
export async function extractImagesFromClipboard(clipboardData) {
    const imageFiles = [];
    
    if (!clipboardData || !clipboardData.items) {
        return imageFiles;
    }
    
    // console.log removed for production
    
    for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            try {
                const file = await createFileFromClipboardItem(item);
                imageFiles.push(file);
                console.log(`✅ Imagen extraída del portapapeles: ${file.name} (${file.type})`);
            } catch (error) {
                // console.warn removed for production
            }
        }
    }
    
    // console.log removed for production
    return imageFiles;
}

export default {
    optimizeImage,
    optimizeMultipleImages,
    isValidImageFile,
    validateFileSize,
    getOptimizationStats,
    extractImagesFromClipboard,
    createFileFromClipboardItem
};
