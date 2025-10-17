// backend/services/comparisonService.js
// Servicio para comparar productos del sistema con productos del proveedor

const productModel = require('../models/productModel');
const { normalizeProductName } = require('./csvParserService');

/**
 * Compara productos usando el código del producto
 * @param {Array} providerProducts - Productos del proveedor parseados del CSV
 * @param {string} category - Categoría a filtrar
 * @param {string} subcategory - Subcategoría a filtrar
 * @returns {Promise<Object>} Resultado de la comparación
 */
async function compareByCode(providerProducts, category, subcategory) {
    try {
        console.log(`Iniciando comparación por código para ${category}/${subcategory}`);
        console.log(`Productos del proveedor: ${providerProducts.length}`);

        // Obtener productos del sistema
        const systemProducts = await productModel.find({
            category: category,
            subcategory: subcategory
        }).select('_id codigo productName sellingPrice purchasePriceUSD stock stockStatus');

        console.log(`Productos del sistema: ${systemProducts.length}`);

        // Crear mapas para comparación rápida
        const systemProductsByCode = new Map();
        systemProducts.forEach(product => {
            if (product.codigo && typeof product.codigo === 'string') {
                systemProductsByCode.set(product.codigo.toUpperCase(), product);
            }
        });

        const providerProductsByCode = new Map();
        providerProducts.forEach(product => {
            if (product.providerCode && typeof product.providerCode === 'string') {
                providerProductsByCode.set(product.providerCode.toUpperCase(), product);
            }
        });

        // Encontrar coincidencias
        const matched = [];
        const notInSystem = [];
        const notInProvider = [];
        const priceChanges = [];

        // Productos que están en el proveedor pero no en el sistema
        providerProducts.forEach(providerProduct => {
            const code = providerProduct.providerCode && typeof providerProduct.providerCode === 'string' 
                ? providerProduct.providerCode.toUpperCase() 
                : '';
            const systemProduct = systemProductsByCode.get(code);

            if (!systemProduct) {
                notInSystem.push({
                    providerCode: providerProduct.providerCode,
                    productName: providerProduct.productName,
                    priceUSD: providerProduct.priceUSD,
                    imageUrl: providerProduct.imageUrl,
                    productUrl: providerProduct.productUrl,
                    selected: false
                });
            } else {
                // Verificar si hay cambio de precio
                const currentPriceUSD = systemProduct.purchasePriceUSD || 0;
                const providerPriceUSD = providerProduct.priceUSD;
                const priceChanged = Math.abs(currentPriceUSD - providerPriceUSD) > 0.01;

                if (priceChanged) {
                    priceChanges.push({
                        productId: systemProduct._id,
                        productCode: systemProduct.codigo,
                        productName: systemProduct.productName,
                        currentPrice: currentPriceUSD,
                        providerPrice: providerPriceUSD,
                        priceDifference: providerPriceUSD - currentPriceUSD
                    });
                }

                matched.push({
                    productId: systemProduct._id,
                    productCode: systemProduct.codigo,
                    productName: systemProduct.productName,
                    currentPrice: currentPriceUSD,
                    providerPrice: providerPriceUSD,
                    priceChanged: priceChanged,
                    priceDifference: providerPriceUSD - currentPriceUSD
                });
            }
        });

        // Productos que están en el sistema pero no en el proveedor
        systemProducts.forEach(systemProduct => {
            const code = systemProduct.codigo && typeof systemProduct.codigo === 'string' 
                ? systemProduct.codigo.toUpperCase() 
                : '';
            const providerProduct = providerProductsByCode.get(code);

            if (!providerProduct) {
                notInProvider.push({
                    productId: systemProduct._id,
                    productCode: systemProduct.codigo,
                    productName: systemProduct.productName,
                    currentStock: systemProduct.stock || 0,
                    currentStatus: systemProduct.stockStatus || 'out_of_stock',
                    sellingPrice: systemProduct.sellingPrice || 0,
                    selected: false
                });
            }
        });

        const summary = {
            totalProviderProducts: providerProducts.length,
            totalSystemProducts: systemProducts.length,
            matchedProducts: matched.length,
            notInSystem: notInSystem.length,
            notInProvider: notInProvider.length,
            priceChanges: priceChanges.length
        };

        console.log('Comparación por código completada:', summary);

        return {
            success: true,
            comparisonMethod: 'code',
            summary,
            matched,
            notInSystem,
            notInProvider,
            priceChanges
        };

    } catch (error) {
        console.error('Error en comparación por código:', error.message);
        throw error;
    }
}

/**
 * Compara productos usando el nombre normalizado
 * @param {Array} providerProducts - Productos del proveedor parseados del CSV
 * @param {string} category - Categoría a filtrar
 * @param {string} subcategory - Subcategoría a filtrar
 * @returns {Promise<Object>} Resultado de la comparación
 */
async function compareByName(providerProducts, category, subcategory) {
    try {
        console.log(`Iniciando comparación por nombre para ${category}/${subcategory}`);
        console.log(`Productos del proveedor: ${providerProducts.length}`);

        // Obtener productos del sistema
        const systemProducts = await productModel.find({
            category: category,
            subcategory: subcategory
        }).select('_id codigo productName sellingPrice purchasePriceUSD stock stockStatus');

        console.log(`Productos del sistema: ${systemProducts.length}`);

        // Crear mapas para comparación por nombre normalizado
        const systemProductsByName = new Map();
        systemProducts.forEach(product => {
            if (product.productName) {
                const normalizedName = normalizeProductName(product.productName);
                if (normalizedName) {
                    systemProductsByName.set(normalizedName, product);
                }
            }
        });

        const providerProductsByName = new Map();
        providerProducts.forEach(product => {
            if (product.normalizedName) {
                providerProductsByName.set(product.normalizedName, product);
            }
        });

        // Encontrar coincidencias
        const matched = [];
        const notInSystem = [];
        const notInProvider = [];
        const priceChanges = [];
        const codeMismatches = [];

        // Productos que están en el proveedor pero no en el sistema
        providerProducts.forEach(providerProduct => {
            const normalizedName = providerProduct.normalizedName;
            const systemProduct = systemProductsByName.get(normalizedName);

            if (!systemProduct) {
                notInSystem.push({
                    providerCode: providerProduct.providerCode,
                    productName: providerProduct.productName,
                    priceUSD: providerProduct.priceUSD,
                    imageUrl: providerProduct.imageUrl,
                    productUrl: providerProduct.productUrl,
                    selected: false
                });
            } else {
                // Verificar si hay cambio de precio
                const currentPriceUSD = systemProduct.purchasePriceUSD || 0;
                const providerPriceUSD = providerProduct.priceUSD;
                const priceChanged = Math.abs(currentPriceUSD - providerPriceUSD) > 0.01;

                // Verificar si los códigos coinciden
                const systemCode = systemProduct.codigo ? systemProduct.codigo.toUpperCase() : '';
                const providerCode = providerProduct.providerCode ? providerProduct.providerCode.toUpperCase() : '';
                const codeMatch = systemCode === providerCode;

                if (!codeMatch) {
                    codeMismatches.push({
                        productId: systemProduct._id,
                        productCode: systemProduct.codigo,
                        providerCode: providerProduct.providerCode,
                        productName: systemProduct.productName,
                        codeMatch: false,
                        warning: '⚠️ Los códigos no coinciden'
                    });
                }

                if (priceChanged) {
                    priceChanges.push({
                        productId: systemProduct._id,
                        productCode: systemProduct.codigo,
                        productName: systemProduct.productName,
                        currentPrice: currentPriceUSD,
                        providerPrice: providerPriceUSD,
                        priceDifference: providerPriceUSD - currentPriceUSD
                    });
                }

                matched.push({
                    productId: systemProduct._id,
                    productCode: systemProduct.codigo,
                    providerCode: providerProduct.providerCode,
                    productName: systemProduct.productName,
                    currentPrice: currentPriceUSD,
                    providerPrice: providerPriceUSD,
                    priceChanged: priceChanged,
                    priceDifference: providerPriceUSD - currentPriceUSD,
                    codeMatch: codeMatch,
                    warning: codeMatch ? null : '⚠️ Los códigos no coinciden'
                });
            }
        });

        // Productos que están en el sistema pero no en el proveedor
        systemProducts.forEach(systemProduct => {
            const normalizedName = normalizeProductName(systemProduct.productName);
            const providerProduct = providerProductsByName.get(normalizedName);

            if (!providerProduct) {
                notInProvider.push({
                    productId: systemProduct._id,
                    productCode: systemProduct.codigo,
                    productName: systemProduct.productName,
                    currentStock: systemProduct.stock || 0,
                    currentStatus: systemProduct.stockStatus || 'out_of_stock',
                    sellingPrice: systemProduct.sellingPrice || 0,
                    selected: false
                });
            }
        });

        const summary = {
            totalProviderProducts: providerProducts.length,
            totalSystemProducts: systemProducts.length,
            matchedProducts: matched.length,
            notInSystem: notInSystem.length,
            notInProvider: notInProvider.length,
            priceChanges: priceChanges.length,
            codeMismatches: codeMismatches.length
        };

        console.log('Comparación por nombre completada:', summary);

        return {
            success: true,
            comparisonMethod: 'name',
            summary,
            matched,
            notInSystem,
            notInProvider,
            priceChanges,
            codeMismatches
        };

    } catch (error) {
        console.error('Error en comparación por nombre:', error.message);
        throw error;
    }
}

/**
 * Obtiene estadísticas de comparación para un resumen rápido
 * @param {Array} providerProducts - Productos del proveedor
 * @param {string} category - Categoría
 * @param {string} subcategory - Subcategoría
 * @returns {Promise<Object>} Estadísticas básicas
 */
async function getComparisonStats(providerProducts, category, subcategory) {
    try {
        const systemProductsCount = await productModel.countDocuments({
            category: category,
            subcategory: subcategory
        });

        return {
            providerProductsCount: providerProducts.length,
            systemProductsCount: systemProductsCount,
            category,
            subcategory
        };

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error.message);
        throw error;
    }
}

module.exports = {
    compareByCode,
    compareByName,
    getComparisonStats
};
