// backend/controller/dashboard/dashboardController.js
const SaleModel = require('../../models/saleModel');
const PurchaseModel = require('../../models/purchaseModel');
const ClientModel = require('../../models/clientModel');
const SupplierModel = require('../../models/supplierModel');
const uploadProductPermission = require('../../helpers/permission');

/**
 * Obtener resumen general del dashboard
 */
async function getDashboardSummaryController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { period = 'month' } = req.query;
        
        // Calcular fechas según el período
        let startDate, endDate;
        const now = new Date();
        
        switch (period) {
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                endDate = now;
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = now;
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = now;
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
        }

        // Resumen de ventas del período
        const salesSummary = await SaleModel.aggregate([
            {
                $match: {
                    saleDate: { $gte: startDate, $lte: endDate },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmount" },
                    avgSaleAmount: { $avg: "$totalAmount" },
                    pendingAmount: {
                        $sum: {
                            $cond: [
                                { $in: ["$paymentStatus", ["pendiente", "parcial"]] },
                                "$totalAmount",
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Resumen de compras del período
        const purchasesSummary = await PurchaseModel.aggregate([
            {
                $match: {
                    purchaseDate: { $gte: startDate, $lte: endDate },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalPurchases: { $sum: 1 },
                    totalExpenses: { $sum: "$totalAmount" },
                    avgPurchaseAmount: { $avg: "$totalAmount" },
                    pendingPayments: {
                        $sum: {
                            $cond: [
                                { $in: ["$paymentStatus", ["pendiente", "parcial"]] },
                                "$totalAmount",
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Ventas por tipo
        const salesByType = await SaleModel.aggregate([
            {
                $match: {
                    saleDate: { $gte: startDate, $lte: endDate },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: "$saleType",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        // Gastos por tipo
        const expensesByType = await PurchaseModel.aggregate([
            {
                $match: {
                    purchaseDate: { $gte: startDate, $lte: endDate },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: "$purchaseType",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        // Tendencia de ventas (últimos 30 días)
        const salesTrend = await SaleModel.aggregate([
            {
                $match: {
                    saleDate: { 
                        $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), 
                        $lte: now 
                    },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$saleDate" },
                        month: { $month: "$saleDate" },
                        day: { $dayOfMonth: "$saleDate" }
                    },
                    totalSales: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        // Top clientes
        const topClients = await SaleModel.aggregate([
            {
                $match: {
                    saleDate: { $gte: startDate, $lte: endDate },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: "$client",
                    totalSales: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" },
                    clientName: { $first: "$clientSnapshot.name" },
                    clientCompany: { $first: "$clientSnapshot.company" }
                }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 5 }
        ]);

        // Calcular utilidad (ingresos - gastos)
        const totalRevenue = salesSummary[0]?.totalRevenue || 0;
        const totalExpenses = purchasesSummary[0]?.totalExpenses || 0;
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // Alertas y notificaciones
        const alerts = [];
        
        // Verificar ventas pendientes de cobro
        const overdueSales = await SaleModel.countDocuments({
            paymentStatus: { $in: ['pendiente', 'parcial'] },
            dueDate: { $lt: now },
            isActive: true
        });
        
        if (overdueSales > 0) {
            alerts.push({
                type: 'warning',
                message: `${overdueSales} ventas vencidas pendientes de cobro`,
                action: 'Revisar ventas pendientes'
            });
        }

        // Verificar compras pendientes de pago
        const overduePurchases = await PurchaseModel.countDocuments({
            paymentStatus: { $in: ['pendiente', 'parcial'] },
            dueDate: { $lt: now },
            isActive: true
        });
        
        if (overduePurchases > 0) {
            alerts.push({
                type: 'error',
                message: `${overduePurchases} compras vencidas pendientes de pago`,
                action: 'Revisar compras pendientes'
            });
        }

        // Verificar margen de ganancia bajo
        if (profitMargin < 10 && totalRevenue > 0) {
            alerts.push({
                type: 'warning',
                message: `Margen de ganancia bajo: ${profitMargin.toFixed(1)}%`,
                action: 'Revisar estructura de costos'
            });
        }

        res.json({
            message: "Resumen del dashboard",
            data: {
                period: { startDate, endDate, periodType: period },
                summary: {
                    sales: salesSummary[0] || {},
                    purchases: purchasesSummary[0] || {},
                    netProfit,
                    profitMargin
                },
                charts: {
                    salesByType,
                    expensesByType,
                    salesTrend,
                    topClients
                },
                alerts
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
 * Obtener estado de cuenta detallado
 */
async function getAccountStatementController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { startDate, endDate, type = 'all' } = req.query;
        
        // Fechas por defecto (mes actual)
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();

        let transactions = [];

        // Obtener ventas si se solicita
        if (type === 'all' || type === 'sales') {
            const sales = await SaleModel.find({
                saleDate: { $gte: start, $lte: end },
                isActive: true
            })
            .populate('client', 'name company')
            .sort({ saleDate: -1 })
            .lean();

            sales.forEach(sale => {
                transactions.push({
                    type: 'ingreso',
                    subtype: 'venta',
                    category: sale.saleType,
                    date: sale.saleDate,
                    amount: sale.totalAmount,
                    description: `Venta ${sale.saleNumber} - ${sale.client?.name || 'Cliente'}`,
                    reference: sale.saleNumber,
                    paymentStatus: sale.paymentStatus,
                    paymentMethod: sale.paymentMethod,
                    client: sale.client?.name,
                    id: sale._id,
                    invoiceFile: sale.invoiceFile
                });
            });
        }

        // Obtener compras si se solicita
        if (type === 'all' || type === 'purchases') {
            const purchases = await PurchaseModel.find({
                purchaseDate: { $gte: start, $lte: end },
                isActive: true
            })
            .populate('supplier', 'name company')
            .sort({ purchaseDate: -1 })
            .lean();

            purchases.forEach(purchase => {
                transactions.push({
                    type: 'egreso',
                    subtype: 'compra',
                    category: purchase.purchaseType,
                    date: purchase.purchaseDate,
                    amount: -purchase.totalAmount, // Negativo para egresos
                    description: `Compra ${purchase.purchaseNumber} - ${purchase.supplier?.name || purchase.supplierInfo?.name || 'Proveedor'}`,
                    reference: purchase.purchaseNumber,
                    paymentStatus: purchase.paymentStatus,
                    paymentMethod: purchase.paymentMethod,
                    supplier: purchase.supplier?.name || purchase.supplierInfo?.name,
                    id: purchase._id,
                    invoiceFile: purchase.invoiceFile,
                    receiptFile: purchase.receiptFile
                });
            });
        }

        // Ordenar por fecha descendente
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Calcular totales y balance
        let totalIngresos = 0;
        let totalEgresos = 0;
        let balance = 0;

        transactions.forEach(transaction => {
            if (transaction.type === 'ingreso') {
                totalIngresos += transaction.amount;
                balance += transaction.amount;
            } else {
                totalEgresos += Math.abs(transaction.amount);
                balance += transaction.amount; // Ya es negativo
            }
        });

        // Resumen por categorías
        const categoryBreakdown = {};
        transactions.forEach(transaction => {
            if (!categoryBreakdown[transaction.category]) {
                categoryBreakdown[transaction.category] = {
                    ingresos: 0,
                    egresos: 0,
                    count: 0
                };
            }
            
            if (transaction.type === 'ingreso') {
                categoryBreakdown[transaction.category].ingresos += transaction.amount;
            } else {
                categoryBreakdown[transaction.category].egresos += Math.abs(transaction.amount);
            }
            categoryBreakdown[transaction.category].count++;
        });

        res.json({
            message: "Estado de cuenta",
            data: {
                period: { start, end },
                summary: {
                    totalIngresos,
                    totalEgresos,
                    balance,
                    totalTransactions: transactions.length
                },
                transactions,
                categoryBreakdown
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
 * Obtener métricas anuales
 */
async function getYearlyMetricsController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { year = new Date().getFullYear() } = req.query;
        
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);

        // Métricas mensuales de ventas
        const monthlySales = await SaleModel.aggregate([
            {
                $match: {
                    saleDate: { $gte: startOfYear, $lte: endOfYear },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: { $month: "$saleDate" },
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Métricas mensuales de compras
        const monthlyPurchases = await PurchaseModel.aggregate([
            {
                $match: {
                    purchaseDate: { $gte: startOfYear, $lte: endOfYear },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: { $month: "$purchaseDate" },
                    totalPurchases: { $sum: 1 },
                    totalExpenses: { $sum: "$totalAmount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Crear array de 12 meses con datos
        const months = Array.from({ length: 12 }, (_, index) => {
            const monthNum = index + 1;
            const salesData = monthlySales.find(s => s._id === monthNum) || {};
            const purchasesData = monthlyPurchases.find(p => p._id === monthNum) || {};
            
            return {
                month: monthNum,
                monthName: new Date(year, index, 1).toLocaleString('es', { month: 'long' }),
                sales: {
                    count: salesData.totalSales || 0,
                    revenue: salesData.totalRevenue || 0
                },
                purchases: {
                    count: purchasesData.totalPurchases || 0,
                    expenses: purchasesData.totalExpenses || 0
                },
                profit: (salesData.totalRevenue || 0) - (purchasesData.totalExpenses || 0)
            };
        });

        // Totales anuales
        const yearTotals = months.reduce((acc, month) => ({
            totalSales: acc.totalSales + month.sales.count,
            totalRevenue: acc.totalRevenue + month.sales.revenue,
            totalPurchases: acc.totalPurchases + month.purchases.count,
            totalExpenses: acc.totalExpenses + month.purchases.expenses,
            netProfit: acc.netProfit + month.profit
        }), {
            totalSales: 0,
            totalRevenue: 0,
            totalPurchases: 0,
            totalExpenses: 0,
            netProfit: 0
        });

        res.json({
            message: "Métricas anuales",
            data: {
                year: parseInt(year),
                months,
                yearTotals,
                profitMargin: yearTotals.totalRevenue > 0 ? 
                    (yearTotals.netProfit / yearTotals.totalRevenue) * 100 : 0
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
    getDashboardSummaryController,
    getAccountStatementController,
    getYearlyMetricsController
};