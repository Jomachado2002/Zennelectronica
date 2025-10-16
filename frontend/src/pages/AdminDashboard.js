// frontend/src/pages/AdminDashboard.js - DASHBOARD PRINCIPAL OPTIMIZADO CON LIBROS DE DIFERENCIAS
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaShoppingCart, 
  FaShoppingBag, 
  FaUsers, 
  FaBox, 
  FaMoneyBillWave,
  FaChartLine, 
  FaArrowUp,
  FaArrowDown,
  FaExclamationTriangle,
  FaTimes,
  FaClock,
  FaSyncAlt,
  FaReceipt,
  FaCalculator,
  FaFileExcel,
  FaCheckCircle,
  FaTimesCircle,
  FaBalanceScale
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';
import * as XLSX from 'xlsx';
import moment from 'moment';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    overview: {
      totalProducts: 0,
      totalUsers: 0,
      totalSales: 0,
      totalPurchases: 0,
      totalClients: 0,
      totalSuppliers: 0,
      totalBudgets: 0,
      totalTransactions: 0
    },
    financial: {
      totalSalesAmount: 0,
      totalPurchasesAmount: 0,
      totalBudgetsAmount: 0,
      grossProfit: 0,
      netProfit: 0,
      totalIVA: 0,
      pendingPayments: 0,
      pendingReceipts: 0
    },
    trends: {
      salesGrowth: 0,
      purchasesGrowth: 0,
      userGrowth: 0,
      productGrowth: 0
    },
    recent: {
      sales: [],
      purchases: [],
      users: [],
      budgets: []
    },
    alerts: [],
    differences: {
      purchaseSales: [],
      inventory: [],
      payments: []
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d'); // '7d', '30d', '90d', '1y'
  const [selectedView, setSelectedView] = useState('overview'); // 'overview', 'financial', 'differences'

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Iniciando carga de datos del dashboard...');
      // Usar las URLs correctas del SummaryApi
      const [salesRes, purchasesRes, usersRes, productsRes, budgetsRes, clientsRes, suppliersRes, transactionsRes] = await Promise.all([
        fetch(SummaryApi.getAllSales.url, { method: SummaryApi.getAllSales.method, credentials: 'include' }).catch(() => ({ json: () => Promise.resolve({ success: false, data: { sales: [] } }) })),
        fetch(SummaryApi.getAllPurchases.url, { method: SummaryApi.getAllPurchases.method, credentials: 'include' }).catch(() => ({ json: () => Promise.resolve({ success: false, data: { purchases: [] } }) })),
        fetch(SummaryApi.allUser.url, { method: SummaryApi.allUser.method, credentials: 'include' }).catch(() => ({ json: () => Promise.resolve({ success: false, data: [] }) })),
        fetch(SummaryApi.allProduct.url, { method: SummaryApi.allProduct.method, credentials: 'include' }).catch(() => ({ json: () => Promise.resolve({ success: false, data: { products: [] } }) })),
        fetch(SummaryApi.getAllBudgets.url, { method: SummaryApi.getAllBudgets.method, credentials: 'include' }).catch(() => ({ json: () => Promise.resolve({ success: false, data: { budgets: [] } }) })),
        fetch(SummaryApi.getAllClients.url, { method: SummaryApi.getAllClients.method, credentials: 'include' }).catch(() => ({ json: () => Promise.resolve({ success: false, data: [] }) })),
        fetch(SummaryApi.getAllSuppliers.url, { method: SummaryApi.getAllSuppliers.method, credentials: 'include' }).catch(() => ({ json: () => Promise.resolve({ success: false, data: { suppliers: [] } }) })),
        fetch(SummaryApi.bancard.transactions.getAll.url, { method: SummaryApi.bancard.transactions.getAll.method, credentials: 'include' }).catch(() => ({ json: () => Promise.resolve({ success: false, data: { transactions: [] } }) }))
      ]);

      const [sales, purchases, users, products, budgets, clients, suppliers, transactions] = await Promise.all([
        salesRes.json(),
        purchasesRes.json(),
        usersRes.json(),
        productsRes.json(),
        budgetsRes.json(),
        clientsRes.json(),
        suppliersRes.json(),
        transactionsRes.json()
      ]);

      console.log('📊 Respuestas del dashboard:', {
        sales: sales?.success,
        purchases: purchases?.success,
        users: users?.success,
        products: products?.success,
        budgets: budgets?.success,
        clients: clients?.success,
        suppliers: suppliers?.success,
        transactions: transactions?.success
      });

      const salesData = sales.success ? (sales.data?.sales || sales.data || []) : [];
      const purchasesData = purchases.success ? (purchases.data?.purchases || purchases.data || []) : [];
      const usersData = users.success ? (users.data || []) : [];
      const productsData = products.success ? (products.data?.products || products.data || []) : [];
      const budgetsData = budgets.success ? (budgets.data?.budgets || budgets.data || []) : [];
      const clientsData = clients.success ? (clients.data || []) : [];
      const suppliersData = suppliers.success ? (suppliers.data?.suppliers || suppliers.data || []) : [];
      const transactionsData = transactions.success ? (transactions.data?.transactions || transactions.data || []) : [];

      // Calcular diferencias entre compras y ventas
      const differences = calculateDifferences(purchasesData, salesData, productsData);

      // Generar alertas
      const alerts = generateAlerts(salesData, purchasesData, productsData, budgetsData);

      setDashboardData({
        overview: {
          totalProducts: productsData.length,
          totalUsers: usersData.length,
          totalSales: salesData.length,
          totalPurchases: purchasesData.length,
          totalClients: clientsData.length,
          totalSuppliers: suppliersData.length,
          totalBudgets: budgetsData.length,
          totalTransactions: transactionsData.length
        },
        financial: {
          totalSalesAmount: salesData.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
          totalPurchasesAmount: purchasesData.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
          totalBudgetsAmount: budgetsData.reduce((sum, b) => sum + (b.finalAmount || 0), 0),
          grossProfit: calculateGrossProfit(salesData, purchasesData),
          netProfit: calculateNetProfit(salesData, purchasesData),
          totalIVA: calculateTotalIVA(salesData, purchasesData),
          pendingPayments: calculatePendingPayments(purchasesData),
          pendingReceipts: calculatePendingReceipts(salesData)
        },
        trends: {
          salesGrowth: calculateGrowth(salesData, 'saleDate'),
          purchasesGrowth: calculateGrowth(purchasesData, 'purchaseDate'),
          userGrowth: calculateGrowth(usersData, 'createdAt'),
          productGrowth: calculateGrowth(productsData, 'createdAt')
        },
        recent: {
          sales: salesData.slice(0, 5),
          purchases: purchasesData.slice(0, 5),
          users: usersData.slice(0, 5),
          budgets: budgetsData.slice(0, 5)
        },
        alerts,
        differences
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Error al cargar los datos del dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000); // Actualizar cada 5 minutos
    return () => clearInterval(interval);
  }, [selectedPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateDifferences = (purchases, sales, products) => {
    const differences = {
      purchaseSales: [],
      inventory: [],
      payments: []
    };

    // Diferencias entre compras y ventas por producto
    const productMap = new Map();
    products.forEach(product => {
      productMap.set(product._id, {
        name: product.productName,
        expectedStock: product.stock,
        category: product.category
      });
    });

    // Analizar compras vs ventas
    const purchaseMap = new Map();
    const salesMap = new Map();

    purchases.forEach(purchase => {
      purchase.items?.forEach(item => {
        const key = item.productId;
        if (!purchaseMap.has(key)) {
          purchaseMap.set(key, { quantity: 0, amount: 0 });
        }
        purchaseMap.get(key).quantity += item.quantity;
        purchaseMap.get(key).amount += item.quantity * item.unitPrice;
      });
    });

    sales.forEach(sale => {
      sale.items?.forEach(item => {
        const key = item.productId;
        if (!salesMap.has(key)) {
          salesMap.set(key, { quantity: 0, amount: 0 });
        }
        salesMap.get(key).quantity += item.quantity;
        salesMap.get(key).amount += item.quantity * item.unitPrice;
      });
    });

    // Calcular diferencias
    productMap.forEach((product, productId) => {
      const purchased = purchaseMap.get(productId) || { quantity: 0, amount: 0 };
      const sold = salesMap.get(productId) || { quantity: 0, amount: 0 };
      
      if (purchased.quantity > 0 || sold.quantity > 0) {
        differences.purchaseSales.push({
          productId,
          productName: product.name,
          category: product.category,
          purchasedQuantity: purchased.quantity,
          soldQuantity: sold.quantity,
          difference: purchased.quantity - sold.quantity,
          purchasedAmount: purchased.amount,
          soldAmount: sold.amount,
          profitAmount: sold.amount - purchased.amount,
          profitMargin: purchased.amount > 0 ? ((sold.amount - purchased.amount) / purchased.amount) * 100 : 0
        });
      }
    });

    return differences;
  };

  const generateAlerts = (sales, purchases, products, budgets) => {
    const alerts = [];

    // Alertas de stock bajo
    products.forEach(product => {
      if (product.stock < 10) {
        alerts.push({
          type: 'warning',
          title: 'Stock Bajo',
          message: `${product.productName} tiene solo ${product.stock} unidades`,
          action: `/panel-admin/productos/${product._id}`,
          icon: FaExclamationTriangle,
          color: 'yellow'
        });
      }
    });

    // Alertas de presupuestos vencidos
    budgets.forEach(budget => {
      if (moment(budget.validUntil).isBefore(moment()) && budget.status === 'sent') {
        alerts.push({
          type: 'danger',
          title: 'Presupuesto Vencido',
          message: `Presupuesto ${budget.budgetNumber} ha vencido`,
          action: `/panel-admin/presupuestos/${budget._id}`,
          icon: FaTimes,
          color: 'red'
        });
      }
    });

    // Alertas de pagos pendientes
    const pendingPurchases = purchases.filter(p => p.paymentStatus === 'pendiente');
    if (pendingPurchases.length > 0) {
      alerts.push({
        type: 'info',
        title: 'Pagos Pendientes',
        message: `${pendingPurchases.length} compras con pagos pendientes`,
        action: '/panel-admin/compras',
        icon: FaClock,
        color: 'blue'
      });
    }

    return alerts.slice(0, 10); // Máximo 10 alertas
  };

  const calculateGrossProfit = (sales, purchases) => {
    const salesAmount = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const purchasesAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    return salesAmount - purchasesAmount;
  };

  const calculateNetProfit = (sales, purchases) => {
    const grossProfit = calculateGrossProfit(sales, purchases);
    const ivaAmount = calculateTotalIVA(sales, purchases);
    return grossProfit - (ivaAmount * 0.1); // Estimación de impuestos
  };

  const calculateTotalIVA = (sales, purchases) => {
    const salesIVA = sales.reduce((sum, s) => sum + (s.ivaAmount || 0), 0);
    const purchasesIVA = purchases.reduce((sum, p) => sum + (p.ivaAmount || 0), 0);
    return salesIVA + purchasesIVA;
  };

  const calculatePendingPayments = (purchases) => {
    return purchases.filter(p => p.paymentStatus === 'pendiente')
      .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  };

  const calculatePendingReceipts = (sales) => {
    return sales.filter(s => s.paymentStatus === 'pendiente')
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  };

  const calculateGrowth = (data, dateField) => {
    if (data.length < 2) return 0;
    
    const previousPeriod = moment().subtract(parseInt(selectedPeriod), selectedPeriod.includes('d') ? 'days' : 'months');
    
    const currentPeriod = data.filter(item => 
      moment(item[dateField]).isAfter(previousPeriod)
    ).length;
    
    const previousPeriodData = data.filter(item => 
      moment(item[dateField]).isBetween(
        moment().subtract(parseInt(selectedPeriod) * 2, selectedPeriod.includes('d') ? 'days' : 'months'),
        previousPeriod
      )
    ).length;
    
    if (previousPeriodData === 0) return currentPeriod > 0 ? 100 : 0;
    
    return ((currentPeriod - previousPeriodData) / previousPeriodData) * 100;
  };

  const exportDifferencesToExcel = () => {
    const excelData = dashboardData.differences.purchaseSales.map(item => ({
      'Producto': item.productName,
      'Categoría': item.category,
      'Cantidad Comprada': item.purchasedQuantity,
      'Cantidad Vendida': item.soldQuantity,
      'Diferencia': item.difference,
      'Monto Comprado': item.purchasedAmount,
      'Monto Vendido': item.soldAmount,
      'Ganancia': item.profitAmount,
      'Margen (%)': item.profitMargin.toFixed(2)
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Diferencias');
    XLSX.writeFile(wb, `Libro_Diferencias_${moment().format('YYYY-MM-DD')}.xlsx`);
    toast.success("Libro de diferencias exportado a Excel");
  };


  const getAlertIcon = (alert) => {
    const IconComponent = alert.icon;
    return <IconComponent className={`w-5 h-5 text-${alert.color}-600`} />;
  };

  const getAlertColor = (alert) => {
    switch (alert.type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'danger': return 'bg-red-50 border-red-200 text-red-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Principal</h1>
            <p className="text-gray-600 mt-1">
              Resumen completo del negocio con análisis de diferencias y tendencias
            </p>
      </div>

          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="1y">Último año</option>
            </select>
            
            <button
              onClick={fetchDashboardData}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaSyncAlt className="w-4 h-4 mr-2" />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Navegación de vistas */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setSelectedView('overview')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedView === 'overview' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Resumen General
          </button>
          <button
            onClick={() => setSelectedView('financial')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedView === 'financial' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Financiero
          </button>
          <button
            onClick={() => setSelectedView('differences')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedView === 'differences' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Libros de Diferencias
          </button>
        </div>
      </div>

      {/* Vista Resumen General */}
      {selectedView === 'overview' && (
        <>
          {/* Estadísticas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FaShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ventas</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.overview.totalSales}</p>
                  <div className="flex items-center mt-1">
                    {dashboardData.trends.salesGrowth >= 0 ? (
                      <FaArrowUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <FaArrowDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${dashboardData.trends.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(dashboardData.trends.salesGrowth).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <FaShoppingBag className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Compras</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.overview.totalPurchases}</p>
                  <div className="flex items-center mt-1">
                    {dashboardData.trends.purchasesGrowth >= 0 ? (
                      <FaArrowUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <FaArrowDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${dashboardData.trends.purchasesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(dashboardData.trends.purchasesGrowth).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <FaUsers className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Usuarios</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.overview.totalUsers}</p>
                  <div className="flex items-center mt-1">
                    {dashboardData.trends.userGrowth >= 0 ? (
                      <FaArrowUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <FaArrowDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${dashboardData.trends.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(dashboardData.trends.userGrowth).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <FaBox className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Productos</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.overview.totalProducts}</p>
                  <div className="flex items-center mt-1">
                    {dashboardData.trends.productGrowth >= 0 ? (
                      <FaArrowUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <FaArrowDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${dashboardData.trends.productGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(dashboardData.trends.productGrowth).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas */}
          {dashboardData.alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaExclamationTriangle className="mr-2 text-yellow-600" />
                  Alertas y Notificaciones
                </h3>
                <div className="space-y-3">
                  {dashboardData.alerts.map((alert, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${getAlertColor(alert)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getAlertIcon(alert)}
                          <div className="ml-3">
                            <h4 className="font-medium">{alert.title}</h4>
                            <p className="text-sm opacity-75">{alert.message}</p>
                          </div>
                        </div>
                        {alert.action && (
                          <Link
                            to={alert.action}
                            className="text-sm font-medium hover:underline"
                          >
                            Ver detalles
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actividad reciente */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaShoppingCart className="mr-2 text-blue-600" />
                  Ventas Recientes
                </h3>
                <div className="space-y-3">
                  {dashboardData.recent.sales.map((sale, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          #{sale.invoiceNumber || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {moment(sale.saleDate).format('DD/MM/YYYY HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {displayPYGCurrency(sale.totalAmount || 0)}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sale.paymentStatus === 'pagado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sale.paymentStatus || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {dashboardData.recent.sales.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No hay ventas recientes</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaShoppingBag className="mr-2 text-green-600" />
                  Compras Recientes
                </h3>
                <div className="space-y-3">
                  {dashboardData.recent.purchases.map((purchase, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          #{purchase.invoiceNumber || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {moment(purchase.purchaseDate).format('DD/MM/YYYY HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {displayPYGCurrency(purchase.totalAmount || 0)}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          purchase.paymentStatus === 'pagado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {purchase.paymentStatus || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {dashboardData.recent.purchases.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No hay compras recientes</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Vista Financiera */}
      {selectedView === 'financial' && (
        <>
          {/* Resumen financiero */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <FaMoneyBillWave className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {displayPYGCurrency(dashboardData.financial.totalSalesAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FaShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Compras Totales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {displayPYGCurrency(dashboardData.financial.totalPurchasesAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <FaChartLine className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ganancia Bruta</p>
                  <p className={`text-2xl font-bold ${dashboardData.financial.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {displayPYGCurrency(dashboardData.financial.grossProfit)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <FaReceipt className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">IVA Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {displayPYGCurrency(dashboardData.financial.totalIVA)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Análisis financiero detallado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaCalculator className="mr-2 text-blue-600" />
                  Análisis de Rentabilidad
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Ganancia Bruta</span>
                    <span className={`font-semibold ${dashboardData.financial.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {displayPYGCurrency(dashboardData.financial.grossProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Ganancia Neta</span>
                    <span className={`font-semibold ${dashboardData.financial.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {displayPYGCurrency(dashboardData.financial.netProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Margen Bruto</span>
                    <span className="font-semibold text-gray-900">
                      {dashboardData.financial.totalSalesAmount > 0 
                        ? ((dashboardData.financial.grossProfit / dashboardData.financial.totalSalesAmount) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Margen Neto</span>
                    <span className="font-semibold text-gray-900">
                      {dashboardData.financial.totalSalesAmount > 0 
                        ? ((dashboardData.financial.netProfit / dashboardData.financial.totalSalesAmount) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaClock className="mr-2 text-orange-600" />
                  Pagos Pendientes
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-red-700">Pagos Pendientes (Compras)</span>
                    <span className="font-semibold text-red-800">
                      {displayPYGCurrency(dashboardData.financial.pendingPayments)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-blue-700">Cobros Pendientes (Ventas)</span>
                    <span className="font-semibold text-blue-800">
                      {displayPYGCurrency(dashboardData.financial.pendingReceipts)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Flujo Neto Pendiente</span>
                    <span className={`font-semibold ${
                      (dashboardData.financial.pendingReceipts - dashboardData.financial.pendingPayments) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {displayPYGCurrency(dashboardData.financial.pendingReceipts - dashboardData.financial.pendingPayments)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Vista Libros de Diferencias */}
      {selectedView === 'differences' && (
        <>
          {/* Header de diferencias */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FaBalanceScale className="mr-2 text-blue-600" />
                    Libro de Diferencias - Compras vs Ventas
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Análisis detallado de diferencias entre compras y ventas por producto
                  </p>
                </div>
                <button
                  onClick={exportDifferencesToExcel}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FaFileExcel className="w-4 h-4 mr-2" />
                  Exportar Excel
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de diferencias */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comprado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendido
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diferencia
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ganancia
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margen %
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.differences.purchaseSales.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{item.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{item.purchasedQuantity}</div>
                        <div className="text-xs text-gray-500">{displayPYGCurrency(item.purchasedAmount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{item.soldQuantity}</div>
                        <div className="text-xs text-gray-500">{displayPYGCurrency(item.soldAmount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.difference > 0 ? 'bg-yellow-100 text-yellow-800' : 
                          item.difference < 0 ? 'bg-red-100 text-red-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.difference > 0 ? '+' : ''}{item.difference}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-medium ${
                          item.profitAmount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {displayPYGCurrency(item.profitAmount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`text-sm font-medium ${
                          item.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {item.difference === 0 ? (
                          <FaCheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : item.difference > 0 ? (
                          <FaExclamationTriangle className="w-5 h-5 text-yellow-500 mx-auto" />
                        ) : (
                          <FaTimesCircle className="w-5 h-5 text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {dashboardData.differences.purchaseSales.length === 0 && (
            <div className="text-center py-12">
              <FaBalanceScale className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay diferencias registradas</h3>
              <p className="mt-1 text-sm text-gray-500">
                No se encontraron productos con actividad de compra o venta en el período seleccionado.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;