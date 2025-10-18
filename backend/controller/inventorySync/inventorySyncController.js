// backend/controller/inventorySync/inventorySyncController.js
// Controlador para el sistema de sincronización de inventario

const productModel = require('../../models/productModel');
const categoryModel = require('../../models/categoryModel');
const { parseCSVFile, validateCSVStructure } = require('../../services/csvParserService');
const { compareByCode, compareByName } = require('../../services/comparisonService');
const { importImage, importMultipleImages } = require('../../services/imageImportService');
const { calculatePrices } = require('../../utils/priceCalculator');
const { generateSlug, generateUniqueSlug } = require('../../utils/slugGenerator');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/admin/inventory-sync/categories
 * Retorna todas las categorías con sus subcategorías desde la tabla categories
 */
async function getCategoriesController(req, res) {
    try {
        console.log('Obteniendo categorías para sincronización de inventario');

        // Obtener categorías activas desde la tabla categories
        const categories = await categoryModel.find({ isActive: true }).sort({ order: 1 });
        
        const categoriesWithSubcategories = categories.map(category => ({
            value: category.value,
            label: category.label,
            subcategories: category.subcategories
                .filter(sub => sub.isActive) // Solo subcategorías activas
                .sort((a, b) => a.order - b.order) // Ordenar por order
                .map(sub => ({
                    value: sub.value,
                    label: sub.label
                }))
        }));

        res.status(200).json({
            success: true,
            categories: categoriesWithSubcategories
        });

    } catch (error) {
        console.error('Error obteniendo categorías:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

/**
 * POST /api/admin/inventory-sync/compare-by-code
 * Compara productos usando el código del producto
 */
async function compareByCodeController(req, res) {
    try {
        console.log('Iniciando comparación por código');
        console.log('req.file:', req.file);
        console.log('req.body:', req.body);

        const csvFile = req.file;
        const { category, subcategory } = req.body;

        if (!csvFile) {
            return res.status(400).json({
                success: false,
                error: 'Archivo CSV requerido'
            });
        }

        if (!category || !subcategory) {
            return res.status(400).json({
                success: false,
                error: 'Categoría y subcategoría requeridas'
            });
        }

        // Validar estructura del CSV
        const csvBuffer = csvFile.buffer;
        const validation = await validateCSVStructure(csvBuffer);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Estructura del CSV inválida',
                details: validation.error
            });
        }

        // Parsear CSV
        const csvResult = await parseCSVFile(csvBuffer);
        if (csvResult.errors.length > 0) {
            console.warn(`CSV parseado con ${csvResult.errors.length} errores`);
        }

        // Comparar productos
        const comparisonResult = await compareByCode(
            csvResult.products,
            category,
            subcategory
        );

        // Limpiar archivo temporal
        try {
            fs.unlinkSync(csvFile);
        } catch (cleanupError) {
            console.warn('Error limpiando archivo temporal:', cleanupError.message);
        }

        res.status(200).json(comparisonResult);

    } catch (error) {
        console.error('Error en comparación por código:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

/**
 * POST /api/admin/inventory-sync/compare-by-name
 * Compara productos usando el nombre normalizado
 */
async function compareByNameController(req, res) {
    try {
        console.log('Iniciando comparación por nombre');

        const csvFile = req.file;
        const { category, subcategory } = req.body;

        if (!csvFile) {
            return res.status(400).json({
                success: false,
                error: 'Archivo CSV requerido'
            });
        }

        if (!category || !subcategory) {
            return res.status(400).json({
                success: false,
                error: 'Categoría y subcategoría requeridas'
            });
        }

        // Validar estructura del CSV
        const csvBuffer = csvFile.buffer;
        const validation = await validateCSVStructure(csvBuffer);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Estructura del CSV inválida',
                details: validation.error
            });
        }

        // Parsear CSV
        const csvResult = await parseCSVFile(csvBuffer);
        if (csvResult.errors.length > 0) {
            console.warn(`CSV parseado con ${csvResult.errors.length} errores`);
        }

        // Comparar productos
        const comparisonResult = await compareByName(
            csvResult.products,
            category,
            subcategory
        );

        // Limpiar archivo temporal
        try {
            fs.unlinkSync(csvFile);
        } catch (cleanupError) {
            console.warn('Error limpiando archivo temporal:', cleanupError.message);
        }

        res.status(200).json(comparisonResult);

    } catch (error) {
        console.error('Error en comparación por nombre:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

/**
 * POST /api/admin/inventory-sync/update-stock
 * Actualiza el estado de stock de productos
 */
async function updateStockController(req, res) {
    try {
        console.log('🔄 Iniciando actualización de stock');
        console.log('📊 Body recibido:', req.body);
        
        const { action, productIds, updateAll, filters } = req.body;

        if (!action) {
            return res.status(400).json({
                success: false,
                error: 'Acción requerida'
            });
        }

        if (action !== 'mark_out_of_stock') {
            return res.status(400).json({
                success: false,
                error: 'Acción no válida'
            });
        }

        console.log(`📊 Acción: ${action}`);

        let idsToUpdate = [];

        if (updateAll && filters?.notInProviderList) {
            idsToUpdate = filters.notInProviderList;
            console.log(`📊 Modo masivo: actualizando ${idsToUpdate.length} productos`);
        } else {
            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'IDs de productos requeridos'
                });
            }
            idsToUpdate = productIds;
            console.log(`📊 IDs recibidos: ${productIds.length} productos`);
        }

        // Verificar estado ANTES
        const productsBeforeUpdate = await productModel.find({ _id: { $in: idsToUpdate } })
            .select('_id productCode productName stockStatus stock codigo')
            .lean();
        
        console.log(`📊 Productos encontrados: ${productsBeforeUpdate.length}`);
        console.log('📊 Ejemplos de productos antes:', productsBeforeUpdate.slice(0, 3));

        if (productsBeforeUpdate.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron productos para actualizar'
            });
        }

        // IMPORTANTE: Detectar cuántos YA están en el estado deseado
        const alreadyInDesiredState = productsBeforeUpdate.filter(p => {
            if (action === 'mark_out_of_stock') {
                return p.stockStatus === 'out_of_stock' && p.stock === 0;
            } else if (action === 'mark_in_stock') {
                return p.stockStatus === 'in_stock' && p.stock > 0;
            }
            return false;
        });

        console.log(`⚠️ ${alreadyInDesiredState.length} de ${productsBeforeUpdate.length} productos YA están en el estado deseado`);

        // Obtener solo los IDs que realmente necesitan actualización
        const idsNeedingUpdate = productsBeforeUpdate
            .filter(p => !alreadyInDesiredState.find(a => a._id.toString() === p._id.toString()))
            .map(p => p._id);

        console.log(`✅ ${idsNeedingUpdate.length} productos necesitan actualización`);

        // Si no hay nada que actualizar
        if (idsNeedingUpdate.length === 0) {
            return res.json({
                success: true,
                updated: 0,
                alreadyInDesiredState: alreadyInDesiredState.length,
                message: `Todos los productos ya estaban en el estado deseado`,
                updatedProducts: []
            });
        }

        // Actualizar solo los que necesitan cambio
        const updateData = action === 'mark_out_of_stock' 
            ? { stockStatus: 'out_of_stock', stock: 0, updatedAt: new Date() }
            : { stockStatus: 'in_stock', stock: 1, updatedAt: new Date() };

        const result = await productModel.updateMany(
            { _id: { $in: idsNeedingUpdate } },
            { $set: updateData }
        );

        console.log(`✅ Actualización completada:`, {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            acknowledged: result.acknowledged
        });

        // Verificar DESPUÉS
        const productsAfterUpdate = await productModel.find({ _id: { $in: idsNeedingUpdate } })
            .select('_id productCode productName stockStatus stock codigo')
            .lean();

        console.log('📊 Productos DESPUÉS de actualizar:', productsAfterUpdate.length);
        console.log('📊 Ejemplos de productos después:', productsAfterUpdate.slice(0, 3));

        res.json({
            success: true,
            updated: result.modifiedCount,
            alreadyInDesiredState: alreadyInDesiredState.length,
            message: `${result.modifiedCount} productos actualizados. ${alreadyInDesiredState.length} ya estaban sin stock.`,
            updatedProducts: productsAfterUpdate.map(p => ({
                productId: p._id.toString(),
                productCode: p.codigo || p.productCode,
                productName: p.productName,
                newStatus: p.stockStatus,
                newStock: p.stock
            }))
        });

    } catch (error) {
        console.error('❌ Error actualizando stock:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

/**
 * POST /api/admin/inventory-sync/import-products
 * Importa productos nuevos desde el CSV
 */
async function importProductsController(req, res) {
    try {
        console.log('Iniciando importación de productos');

        const { products, config } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Lista de productos requerida'
            });
        }

        if (!config) {
            return res.status(400).json({
                success: false,
                error: 'Configuración requerida'
            });
        }

        // Configuración por defecto
        const {
            deliveryCost = 30000,
            exchangeRate = 7300,
            profitMargin = 20
        } = config;

        const results = [];
        let importedCount = 0;
        let failedCount = 0;

        // Función para verificar si el slug es único
        const checkSlugUnique = async (slug) => {
            const existing = await productModel.findOne({ slug });
            return !existing;
        };

        // Procesar productos uno por uno
        for (const productData of products) {
            try {
                console.log(`Importando producto: ${productData.providerCode}`);

                // Validar datos del producto
                if (!productData.providerCode || !productData.productName || !productData.priceUSD) {
                    throw new Error('Datos del producto incompletos');
                }

                // Verificar si el producto ya existe
                const existingProduct = await productModel.findOne({
                    codigo: productData.providerCode.toUpperCase()
                });

                if (existingProduct) {
                    throw new Error('Producto ya existe en el sistema');
                }

                // Importar imagen
                const imageResult = await importImage(
                    productData.imageUrl,
                    productData.providerCode,
                    { timeout: 30000, retries: 3 }
                );

                if (!imageResult.success) {
                    throw new Error(`Error importando imagen: ${imageResult.error}`);
                }

                // Calcular precios
                const prices = calculatePrices(
                    productData.priceUSD,
                    exchangeRate,
                    deliveryCost,
                    profitMargin
                );

                // Generar slug único
                const baseSlug = generateSlug(productData.productName);
                const uniqueSlug = await generateUniqueSlug(productData.productName, checkSlugUnique);

                // Crear producto en la base de datos
                const newProduct = new productModel({
                    productName: productData.productName,
                    brandName: 'Proveedor', // Por defecto
                    category: productData.category,
                    subcategory: productData.subcategory,
                    productImage: [imageResult.publicUrl],
                    documentationLink: productData.productUrl,
                    codigo: productData.providerCode.toUpperCase(),
                    slug: uniqueSlug,
                    
                    // Precios
                    price: 0, // Siempre 0 como especificado
                    sellingPrice: prices.sellingPrice,
                    purchasePriceUSD: prices.purchasePriceUSD,
                    exchangeRate: prices.exchangeRate,
                    purchasePrice: prices.purchasePrice,
                    deliveryCost: prices.deliveryCost,
                    profitMargin: prices.profitMargin,
                    profitAmount: prices.profitAmount,
                    
                    // Stock
                    stock: 1, // Stock inicial
                    stockStatus: 'in_stock'
                });

                const savedProduct = await newProduct.save();

                results.push({
                    providerCode: productData.providerCode,
                    status: 'success',
                    productId: savedProduct._id,
                    importedImageUrl: imageResult.publicUrl
                });

                importedCount++;

            } catch (error) {
                console.error(`Error importando producto ${productData.providerCode}:`, error.message);
                
                results.push({
                    providerCode: productData.providerCode,
                    status: 'failed',
                    error: error.message
                });

                failedCount++;
            }
        }

        console.log(`Importación completada: ${importedCount} exitosos, ${failedCount} fallidos`);

        res.status(200).json({
            success: true,
            imported: importedCount,
            failed: failedCount,
            results
        });

    } catch (error) {
        console.error('Error en importación de productos:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

/**
 * POST /api/admin/inventory-sync/update-product-codes
 * Actualiza los códigos de productos cuando los nombres coinciden pero los códigos no
 */
async function updateProductCodesController(req, res) {
    try {
        console.log('Iniciando actualización de códigos de productos');
        
        const { updates } = req.body;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de actualizaciones'
            });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Procesar cada actualización
        for (const update of updates) {
            try {
                const { productId, newCode } = update;

                if (!productId || !newCode) {
                    results.failed++;
                    results.errors.push({
                        productId: productId || 'unknown',
                        error: 'ProductId y newCode son requeridos'
                    });
                    continue;
                }

                // Actualizar el producto en la base de datos
                const updatedProduct = await productModel.findByIdAndUpdate(
                    productId,
                    { codigo: newCode },
                    { new: true, runValidators: true }
                );

                if (updatedProduct) {
                    results.success++;
                    console.log(`Código actualizado para producto ${productId}: ${newCode}`);
                } else {
                    results.failed++;
                    results.errors.push({
                        productId,
                        error: 'Producto no encontrado'
                    });
                }

            } catch (error) {
                results.failed++;
                results.errors.push({
                    productId: update.productId || 'unknown',
                    error: error.message
                });
                console.error(`Error actualizando código para producto ${update.productId}:`, error.message);
            }
        }

        res.status(200).json({
            success: true,
            message: `Actualización completada: ${results.success} exitosos, ${results.failed} fallidos`,
            results
        });

    } catch (error) {
        console.error('Error en updateProductCodesController:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

module.exports = {
    getCategoriesController,
    compareByCodeController,
    compareByNameController,
    updateStockController,
    importProductsController,
    updateProductCodesController
};
