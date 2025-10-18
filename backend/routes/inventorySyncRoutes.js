// backend/routes/inventorySyncRoutes.js
// Rutas para el sistema de sincronización de inventario

const express = require('express');
const router = express.Router();
const authToken = require('../middleware/authToken');
const {
    uploadCSV,
    handleUploadError
} = require('../middleware/uploadMiddleware');

const {
    getCategoriesController,
    compareByCodeController,
    compareByNameController,
    updateStockController,
    importProductsController,
    updateProductCodesController
} = require('../controller/inventorySync/inventorySyncController');

// ===== RUTAS DE SINCRONIZACIÓN DE INVENTARIO =====

/**
 * GET /api/admin/inventory-sync/categories
 * Obtiene todas las categorías con sus subcategorías
 */
router.get('/categories', authToken, getCategoriesController);

/**
 * POST /api/admin/inventory-sync/compare-by-code
 * Compara productos del sistema con productos del proveedor usando códigos
 * 
 * Body:
 * - csvFile: Archivo CSV del proveedor (multipart/form-data)
 * - category: Categoría a filtrar
 * - subcategory: Subcategoría a filtrar
 */
router.post('/compare-by-code', 
    authToken,
    uploadCSV,
    handleUploadError,
    compareByCodeController
);

/**
 * POST /api/admin/inventory-sync/compare-by-name
 * Compara productos del sistema con productos del proveedor usando nombres normalizados
 * 
 * Body:
 * - csvFile: Archivo CSV del proveedor (multipart/form-data)
 * - category: Categoría a filtrar
 * - subcategory: Subcategoría a filtrar
 */
router.post('/compare-by-name',
    authToken,
    uploadCSV,
    handleUploadError,
    compareByNameController
);

/**
 * POST /api/admin/inventory-sync/update-stock
 * Actualiza el estado de stock de productos (individual o masivo)
 * 
 * Body:
 * - action: "mark_out_of_stock"
 * - productIds: Array de IDs de productos (para actualización individual)
 * - updateAll: Boolean (para actualización masiva)
 * - filters: Objeto con filtros (para actualización masiva)
 */
router.post('/update-stock', authToken, updateStockController);

/**
 * POST /api/admin/inventory-sync/import-products
 * Importa productos nuevos desde el CSV del proveedor
 * 
 * Body:
 * - products: Array de productos a importar
 * - config: Configuración de precios (deliveryCost, exchangeRate, profitMargin)
 */
router.post('/import-products', authToken, importProductsController);

/**
 * POST /api/admin/inventory-sync/update-product-codes
 * Actualiza los códigos de productos cuando los nombres coinciden pero los códigos no
 * 
 * Body:
 * - updates: Array de objetos con { productId, newCode }
 */
router.post('/update-product-codes', authToken, updateProductCodesController);

/**
 * POST /api/admin/inventory-sync/import-image
 * Importa una imagen desde URL del proveedor y la sube a Firebase Storage
 * 
 * Body:
 * - imageUrl: URL de la imagen del proveedor
 * - productCode: Código del producto
 */
router.post('/import-image', authToken, async (req, res) => {
    try {
        const { imageUrl, productCode } = req.body;
        
        console.log(`📥 Importando imagen para código ${productCode}`);
        console.log(`🔗 URL: ${imageUrl}`);
        
        const path = require('path');
        const imageImportService = require(path.join(__dirname, '../services/imageImportService'));
        
        // Usar imageImportService (que debe estar arreglado con el método correcto)
        const result = await imageImportService.importImageFromUrl(imageUrl, productCode);
        
        res.json({
            success: true,
            firebaseUrl: result
        });
    } catch (error) {
        console.error('❌ Error importando imagen:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
