// backend/controller/reports/financialReportsController.js
const ProductModel = require('../../models/productModel');
const uploadProductPermission = require('../../helpers/permission');

/**
 * Genera un reporte general de márgenes de ganancia
 */
async function getMarginReportController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        // Parámetros de filtrado opcionales
        const { 
            category, 
            subcategory, 
            brandName, 
            minMargin, 
            maxMargin,
            sortBy = 'profitMargin',
            sortOrder = 'desc',
            limit = undefined
        } = req.query;

        // Construir el query
        const query = {};
        
        if (category) query.category = category;
        if (subcategory) query.subcategory = subcategory;
        if (brandName) query.brandName = brandName;
        
        // Filtro por margen de ganancia
        if (minMargin !== undefined || maxMargin !== undefined) {
            query.profitMargin = {};
            
            if (minMargin !== undefined) {
                query.profitMargin.$gte = Number(minMargin);
            }
            
            if (maxMargin !== undefined) {
                query.profitMargin.$lte = Number(maxMargin);
            }
        }

        // Ordenamiento
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Ejecutar la consulta con campos específicos (incluyendo campos en USD)
        const products = await ProductModel.find(query)
            .select('productName brandName category subcategory sellingPrice purchasePrice purchasePriceUSD exchangeRate loanInterest deliveryCost profitAmount profitMargin')
            .sort(sort)
            .limit(limit ? Number(limit) : undefined);

        // Calcular estadísticas generales
        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        let totalUSDPurchase = 0;
        let highestMargin = { value: 0, product: null };
        let lowestMargin = { value: Infinity, product: null };

        products.forEach(product => {
            totalRevenue += product.sellingPrice || 0;
            totalUSDPurchase += product.purchasePriceUSD || 0;
            
            const totalCostPerProduct = (product.purchasePrice || 0) + 
                                      ((product.purchasePrice || 0) * (product.loanInterest || 0) / 100) + 
                                      (product.deliveryCost || 0);
            totalCost += totalCostPerProduct;
            totalProfit += product.profitAmount || 0;

            // Verificar margen más alto
            if ((product.profitMargin || 0) > highestMargin.value) {
                highestMargin = {
                    value: product.profitMargin || 0,
                    product: {
                        _id: product._id,
                        productName: product.productName,
                        brandName: product.brandName
                    }
                };
            }

            // Verificar margen más bajo para productos con margen > 0
            if ((product.profitMargin || 0) < lowestMargin.value && (product.profitMargin || 0) > 0) {
                lowestMargin = {
                    value: product.profitMargin || 0,
                    product: {
                        _id: product._id,
                        productName: product.productName,
                        brandName: product.brandName
                    }
                };
            }
        });

        // Si no hay productos con margen > 0, ajustamos el valor más bajo
        if (lowestMargin.value === Infinity) {
            lowestMargin.value = 0;
            lowestMargin.product = null;
        }

        // Calcular promedio general
        const averageMargin = products.length > 0 ? 
            products.reduce((sum, product) => sum + (product.profitMargin || 0), 0) / products.length : 0;

        // Calcular tipo de cambio promedio
        const avgExchangeRate = products.length > 0 ? 
            products.reduce((sum, product) => sum + (product.exchangeRate || 7300), 0) / products.length : 7300;

        // Agrupar por categoría
        const categoryMargins = {};
        products.forEach(product => {
            if (!categoryMargins[product.category]) {
                categoryMargins[product.category] = {
                    totalProducts: 0,
                    totalMargin: 0,
                    avgMargin: 0
                };
            }
            
            categoryMargins[product.category].totalProducts += 1;
            categoryMargins[product.category].totalMargin += (product.profitMargin || 0);
        });

        // Calcular promedio por categoría
        Object.keys(categoryMargins).forEach(cat => {
            categoryMargins[cat].avgMargin = 
                categoryMargins[cat].totalMargin / categoryMargins[cat].totalProducts;
        });

        res.json({
            message: "Reporte de márgenes de ganancia",
            data: {
                products: products,
                summary: {
                    totalProducts: products.length,
                    totalUSDPurchase: totalUSDPurchase,
                    avgExchangeRate: avgExchangeRate,
                    totalRevenue: totalRevenue,
                    totalCost: totalCost,
                    totalProfit: totalProfit,
                    averageMargin: averageMargin.toFixed(2),
                    highestMargin: highestMargin,
                    lowestMargin: lowestMargin,
                    categoryMargins: categoryMargins
                }
            },
            success: true,
            error: false
        });

    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

/**
 * Genera un reporte de rentabilidad por categoría
 */
async function getCategoryProfitabilityController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        // Obtener resumen por categoría con información en USD
        const categorySummary = await ProductModel.aggregate([
            {
                $match: {
                    profitMargin: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: "$category",
                    totalProducts: { $sum: 1 },
                    totalRevenue: { $sum: "$sellingPrice" },
                    totalCost: { 
                        $sum: { 
                            $add: [
                                "$purchasePrice", 
                                { $multiply: ["$purchasePrice", { $divide: ["$loanInterest", 100] }] }, 
                                "$deliveryCost"
                            ] 
                        } 
                    },
                    totalUSDPurchase: { $sum: "$purchasePriceUSD" },
                    avgExchangeRate: { $avg: "$exchangeRate" },
                    totalProfit: { $sum: "$profitAmount" },
                    avgMargin: { $avg: "$profitMargin" }
                }
            },
            {
                $project: {
                    category: "$_id",
                    totalProducts: 1,
                    totalRevenue: 1,
                    totalCost: 1,
                    totalUSDPurchase: 1,
                    avgExchangeRate: 1,
                    totalProfit: 1,
                    avgMargin: 1,
                    profitPercentage: { 
                        $multiply: [
                            { $divide: ["$totalProfit", "$totalRevenue"] },
                            100
                        ]
                    }
                }
            },
            {
                $sort: { avgMargin: -1 }
            }
        ]);

        // Obtener resumen por subcategoría con información en USD
        const subcategorySummary = await ProductModel.aggregate([
            {
                $match: {
                    profitMargin: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: {
                        category: "$category",
                        subcategory: "$subcategory"
                    },
                    totalProducts: { $sum: 1 },
                    totalRevenue: { $sum: "$sellingPrice" },
                    totalCost: { 
                        $sum: { 
                            $add: [
                                "$purchasePrice", 
                                { $multiply: ["$purchasePrice", { $divide: ["$loanInterest", 100] }] }, 
                                "$deliveryCost"
                            ] 
                        } 
                    },
                    totalUSDPurchase: { $sum: "$purchasePriceUSD" },
                    avgExchangeRate: { $avg: "$exchangeRate" },
                    totalProfit: { $sum: "$profitAmount" },
                    avgMargin: { $avg: "$profitMargin" }
                }
            },
            {
                $project: {
                    category: "$_id.category",
                    subcategory: "$_id.subcategory",
                    totalProducts: 1,
                    totalRevenue: 1,
                    totalCost: 1,
                    totalUSDPurchase: 1,
                    avgExchangeRate: 1,
                    totalProfit: 1,
                    avgMargin: 1,
                    profitPercentage: { 
                        $multiply: [
                            { $divide: ["$totalProfit", "$totalRevenue"] },
                            100
                        ]
                    }
                }
            },
            {
                $sort: { category: 1, avgMargin: -1 }
            }
        ]);

        // Obtener resumen por marca con información en USD
        const brandSummary = await ProductModel.aggregate([
            {
                $match: {
                    profitMargin: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: "$brandName",
                    totalProducts: { $sum: 1 },
                    totalRevenue: { $sum: "$sellingPrice" },
                    totalCost: { 
                        $sum: { 
                            $add: [
                                "$purchasePrice", 
                                { $multiply: ["$purchasePrice", { $divide: ["$loanInterest", 100] }] }, 
                                "$deliveryCost"
                            ] 
                        } 
                    },
                    totalUSDPurchase: { $sum: "$purchasePriceUSD" },
                    avgExchangeRate: { $avg: "$exchangeRate" },
                    totalProfit: { $sum: "$profitAmount" },
                    avgMargin: { $avg: "$profitMargin" }
                }
            },
            {
                $project: {
                    brand: "$_id",
                    totalProducts: 1,
                    totalRevenue: 1,
                    totalCost: 1,
                    totalUSDPurchase: 1,
                    avgExchangeRate: 1,
                    totalProfit: 1,
                    avgMargin: 1,
                    profitPercentage: { 
                        $multiply: [
                            { $divide: ["$totalProfit", "$totalRevenue"] },
                            100
                        ]
                    }
                }
            },
            {
                $sort: { avgMargin: -1 }
            }
        ]);

        // Calcular resumen general incluyendo información en USD
        const overallSummary = {
            totalProducts: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            totalUSDPurchase: 0,
            avgExchangeRate: 0
        };

        let totalExchangeRateSum = 0;
        let countWithExchangeRate = 0;

        categorySummary.forEach(category => {
            overallSummary.totalProducts += category.totalProducts;
            overallSummary.totalRevenue += category.totalRevenue;
            overallSummary.totalCost += category.totalCost;
            overallSummary.totalProfit += category.totalProfit;
            overallSummary.totalUSDPurchase += category.totalUSDPurchase;

            // Calcular suma ponderada de tipos de cambio
            if (category.avgExchangeRate) {
                totalExchangeRateSum += category.avgExchangeRate * category.totalProducts;
                countWithExchangeRate += category.totalProducts;
            }
        });

        // Calcular tipo de cambio promedio global
        overallSummary.avgExchangeRate = countWithExchangeRate > 0 ? 
            totalExchangeRateSum / countWithExchangeRate : 7300;

        overallSummary.avgMargin = overallSummary.totalRevenue > 0 ? 
            (overallSummary.totalProfit / overallSummary.totalRevenue) * 100 : 0;

        res.json({
            message: "Reporte de rentabilidad por categoría",
            data: {
                overall: overallSummary,
                byCategory: categorySummary,
                bySubcategory: subcategorySummary,
                byBrand: brandSummary
            },
            success: true,
            error: false
        });

    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

module.exports = {
    getMarginReportController,
    getCategoryProfitabilityController
};