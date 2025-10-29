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
        // console.log removed for production

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
        // console.error removed for production
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
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production

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
            // console.warn removed for production
        }

        // Comparar productos
        const comparisonResult = await compareByCode(
            csvResult.products,
            category,
            subcategory
        );

        // No necesitamos limpiar archivo temporal ya que usamos memoryStorage
        // console.log removed for production

        res.status(200).json(comparisonResult);

    } catch (error) {
        // console.error removed for production
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
        // console.log removed for production

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
            // console.warn removed for production
        }

        // Comparar productos
        const comparisonResult = await compareByName(
            csvResult.products,
            category,
            subcategory
        );

        // No necesitamos limpiar archivo temporal ya que usamos memoryStorage
        // console.log removed for production

        res.status(200).json(comparisonResult);

    } catch (error) {
        // console.error removed for production
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
        // console.log removed for production
        // console.log removed for production
        
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

        // console.log removed for production

        let idsToUpdate = [];

        if (updateAll && filters?.notInProviderList) {
            idsToUpdate = filters.notInProviderList;
            // console.log removed for production
        } else {
            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'IDs de productos requeridos'
                });
            }
            idsToUpdate = productIds;
            // console.log removed for production
        }

        // Verificar estado ANTES
        const productsBeforeUpdate = await productModel.find({ _id: { $in: idsToUpdate } })
            .select('_id productCode productName stockStatus stock codigo')
            .lean();
        
        // console.log removed for production
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

        // console.log removed for production

        // Obtener solo los IDs que realmente necesitan actualización
        const idsNeedingUpdate = productsBeforeUpdate
            .filter(p => !alreadyInDesiredState.find(a => a._id.toString() === p._id.toString()))
            .map(p => p._id);

        // console.log removed for production

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

        // console.log removed for production
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
        // console.error removed for production
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
        // console.log removed for production

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
                // console.log removed for production

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
                // console.error removed for production
                
                results.push({
                    providerCode: productData.providerCode,
                    status: 'failed',
                    error: error.message
                });

                failedCount++;
            }
        }

        // console.log removed for production

        res.status(200).json({
            success: true,
            imported: importedCount,
            failed: failedCount,
            results
        });

    } catch (error) {
        // console.error removed for production
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
        // console.log removed for production
        
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
                    // console.log removed for production
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
                // console.error removed for production
            }
        }

        res.status(200).json({
            success: true,
            message: `Actualización completada: ${results.success} exitosos, ${results.failed} fallidos`,
            results
        });

    } catch (error) {
        // console.error removed for production
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

/**
 * POST /api/admin/inventory-sync/restock-products
 * Actualiza el stock de productos que reaparecen en el CSV
 */
async function restockProductsController(req, res) {
    try {
        const { productIds, updateAll, filters } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'IDs de productos requeridos'
            });
        }

        // Verificar estado ANTES
        const productsBeforeUpdate = await productModel.find({ _id: { $in: productIds } })
            .select('_id productCode productName stockStatus stock codigo')
            .lean();

        if (productsBeforeUpdate.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron productos para actualizar'
            });
        }

        // Actualizar productos a stock disponible
        const updateData = { 
            stockStatus: 'in_stock', 
            stock: 1, 
            updatedAt: new Date() 
        };

        const result = await productModel.updateMany(
            { _id: { $in: productIds } },
            { $set: updateData }
        );

        console.log(`✅ Restock completado:`, {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            acknowledged: result.acknowledged
        });

        // Verificar DESPUÉS
        const productsAfterUpdate = await productModel.find({ _id: { $in: productIds } })
            .select('_id productCode productName stockStatus stock codigo')
            .lean();

        res.json({
            success: true,
            updated: result.modifiedCount,
            message: `${result.modifiedCount} productos restockeados exitosamente`,
            updatedProducts: productsAfterUpdate.map(p => ({
                productId: p._id.toString(),
                productCode: p.codigo || p.productCode,
                productName: p.productName,
                newStatus: p.stockStatus,
                newStock: p.stock
            }))
        });

    } catch (error) {
        console.error('Error en restockProductsController:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

/**
 * POST /api/admin/inventory-sync/bulk-update-prices
 * Actualiza precios de múltiples productos
 */
async function bulkUpdatePricesController(req, res) {
    try {
        const { updates } = req.body;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de actualizaciones de precios'
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
                const { productId, newPrice } = update;

                if (!productId || newPrice === undefined || newPrice < 0) {
                    results.failed++;
                    results.errors.push({
                        productId: productId || 'unknown',
                        error: 'ProductId y precio válido son requeridos'
                    });
                    continue;
                }

                // Actualizar el producto en la base de datos
                const updatedProduct = await productModel.findByIdAndUpdate(
                    productId,
                    { 
                        purchasePriceUSD: newPrice,
                        updatedAt: new Date()
                    },
                    { new: true, runValidators: true }
                );

                if (updatedProduct) {
                    results.success++;
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
            }
        }

        res.status(200).json({
            success: true,
            message: `Actualización de precios completada: ${results.success} exitosos, ${results.failed} fallidos`,
            results
        });

    } catch (error) {
        console.error('Error en bulkUpdatePricesController:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

/**
 * POST /api/admin/inventory-sync/toggle-product-visibility
 * Cambia la visibilidad de un producto
 */
async function toggleProductVisibilityController(req, res) {
    try {
        const { productId, isVisible } = req.body;

        if (!productId || isVisible === undefined) {
            return res.status(400).json({
                success: false,
                error: 'ProductId e isVisible son requeridos'
            });
        }

        const updatedProduct = await productModel.findByIdAndUpdate(
            productId,
            { 
                isVisible: isVisible,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado'
            });
        }

        res.json({
            success: true,
            message: `Producto ${isVisible ? 'mostrado' : 'oculto'} exitosamente`,
            product: {
                productId: updatedProduct._id,
                productCode: updatedProduct.codigo,
                productName: updatedProduct.productName,
                isVisible: updatedProduct.isVisible
            }
        });

    } catch (error) {
        console.error('Error en toggleProductVisibilityController:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

/**
 * POST /api/admin/inventory-sync/bulk-toggle-visibility
 * Cambia la visibilidad de múltiples productos
 */
async function bulkToggleVisibilityController(req, res) {
    try {
        const { productIds, isVisible } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de IDs de productos'
            });
        }

        if (isVisible === undefined) {
            return res.status(400).json({
                success: false,
                error: 'isVisible es requerido'
            });
        }

        const result = await productModel.updateMany(
            { _id: { $in: productIds } },
            { 
                isVisible: isVisible,
                updatedAt: new Date()
            }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} productos ${isVisible ? 'mostrados' : 'ocultos'} exitosamente`,
            updated: result.modifiedCount,
            matched: result.matchedCount
        });

    } catch (error) {
        console.error('Error en bulkToggleVisibilityController:', error);
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
    updateProductCodesController,
    restockProductsController,
    bulkUpdatePricesController,
    toggleProductVisibilityController,
    bulkToggleVisibilityController
};
