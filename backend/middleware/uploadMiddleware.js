// backend/middleware/uploadMiddleware.js
// Middleware para manejar uploads de archivos CSV

const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento en memoria
const storage = multer.memoryStorage();

// Filtro para archivos CSV
const fileFilter = (req, file, cb) => {
    // Verificar que sea un archivo CSV
    if (file.mimetype === 'text/csv' || 
        file.originalname.toLowerCase().endsWith('.csv') ||
        file.mimetype === 'application/vnd.ms-excel') {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos CSV'), false);
    }
};

// Configuración de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
        files: 1 // Solo un archivo
    }
});

// Middleware para manejar errores de upload
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'El archivo es demasiado grande. Máximo 10MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Solo se permite un archivo por vez.'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                error: 'Campo de archivo inesperado.'
            });
        }
    }
    
    if (error.message === 'Solo se permiten archivos CSV') {
        return res.status(400).json({
            success: false,
            error: 'Solo se permiten archivos CSV (.csv)'
        });
    }
    
    next(error);
};

module.exports = {
    uploadCSV: upload.single('csvFile'),
    handleUploadError
};
