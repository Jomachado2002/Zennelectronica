// frontend/src/pages/FinancialDashboard.js
import React, { useState, useEffect } from 'react';
import { FaDollarSign, FaShoppingCart, FaMoneyBillWave, FaChartLine, FaFilter, FaDownload, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const FinancialDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [accountStatement, setAccountStatement] = useState(null);
  const [yearlyMetrics, setYearlyMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filters, setFilters] = useState({
    period: 'month',
    startDate: '',
    endDate: '',
    type: 'all',
    year: new Date().getFullYear()
  });

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'statement') {
      fetchAccountStatement();
    } else if (activeTab === 'yearly') {
      fetchYearlyMetrics();
    }
  }, [activeTab, filters]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.period) queryParams.append('period', filters.period);

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/dashboard?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        toast.error(result.message || "Error al cargar el dashboard");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccountStatement = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.type) queryParams.append('type', filters.type);

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/estado-cuenta?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setAccountStatement(result.data);
      } else {
        toast.error(result.message || "Error al cargar el estado de cuenta");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchYearlyMetrics = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.year) queryParams.append('year', filters.year);

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/metricas-anuales?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setYearlyMetrics(result.data);
      } else {
        toast.error(result.message || "Error al cargar métricas anuales");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'week': return 'Semana';
      case 'month': return 'Mes';
      case 'quarter': return 'Trimestre';
      case 'year': return 'Año';
      default: return period;
    }
  };

  const getTransactionTypeColor = (type) => {
    return type === 'ingreso' ? 'text-green-600' : 'text-red-600';
  };

  const getTransactionTypeIcon = (type) => {
    return type === 'ingreso' ? '↗' : '↙';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (amount < 0) {
      return `- ${displayPYGCurrency(Math.abs(amount))}`;
    }
    return displayPYGCurrency(amount);
  };

  const renderDashboard = () => {
    if (!dashboardData) return null;

    const { summary, charts, alerts } = dashboardData;

    return (
      <div className="space-y-6">
        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ingresos</p>
                <p className="text-2xl font-bold text-green-600">
                  {displayPYGCurrency(summary.sales?.totalRevenue || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  {summary.sales?.totalSales || 0} ventas
                </p>
              </div>
              <FaMoneyBillWave className="text-3xl text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gastos</p>
                <p className="text-2xl font-bold text-red-600">
                  {displayPYGCurrency(summary.purchases?.totalExpenses || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  {summary.purchases?.totalPurchases || 0} compras
                </p>
              </div>
              <FaShoppingCart className="text-3xl text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ganancia Neta</p>
                <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.netProfit || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  Margen: {(summary.profitMargin || 0).toFixed(1)}%
                </p>
              </div>
              <FaChartLine className="text-3xl text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendiente de Cobro</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {displayPYGCurrency(summary.sales?.pendingAmount || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  Por cobrar
                </p>
              </div>
              <FaDollarSign className="text-3xl text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Alertas */}
        {alerts && alerts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FaExclamationTriangle className="mr-2 text-yellow-500" />
              Alertas y Notificaciones
            </h3>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  alert.type === 'error' ? 'bg-red-50 border-red-400' : 'bg-yellow-50 border-yellow-400'
                }`}>
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-sm text-gray-600">{alert.action}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ventas por Tipo */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Ventas por Tipo</h3>
            <div className="space-y-3">
              {charts.salesByType?.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{item._id}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{displayPYGCurrency(item.totalAmount)}</span>
                    <span className="text-xs text-gray-500">({item.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gastos por Tipo */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Gastos por Tipo</h3>
            <div className="space-y-3">
              {charts.expensesByType?.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{item._id}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{displayPYGCurrency(item.totalAmount)}</span>
                    <span className="text-xs text-gray-500">({item.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Clientes */}
        {charts.topClients && charts.topClients.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Top Clientes</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Cliente</th>
                    <th className="text-center py-2">Ventas</th>
                    <th className="text-right py-2">Monto Total</th>
                  </tr>
                </thead>
                <tbody>
                  {charts.topClients.map((client, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">
                        <div>
                          <div className="font-medium">{client.clientName}</div>
                          {client.clientCompany && (
                            <div className="text-sm text-gray-500">{client.clientCompany}</div>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-2">{client.totalSales}</td>
                      <td className="text-right py-2 font-medium">
                        {displayPYGCurrency(client.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAccountStatement = () => {
    if (!accountStatement) return null;

    const { summary, transactions, categoryBreakdown } = accountStatement;

    return (
      <div className="space-y-6">
        {/* Resumen del Estado de Cuenta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Ingresos</p>
              <p className="text-2xl font-bold text-green-600">
                {displayPYGCurrency(summary.totalIngresos)}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Egresos</p>
              <p className="text-2xl font-bold text-red-600">
                {displayPYGCurrency(summary.totalEgresos)}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-center">
              <p className="text-sm text-gray-600">Balance</p>
              <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Transacciones */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Movimientos</h3>
              <span className="text-sm text-gray-500">
                {summary.totalTransactions} transacciones
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions?.slice(0, 50).map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.reference}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {getTransactionTypeIcon(transaction.type)} {transaction.subtype}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.paymentStatus === 'pagado' ? 'bg-green-100 text-green-800' :
                        transaction.paymentStatus === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.paymentStatus}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-medium ${getTransactionTypeColor(transaction.type)}`}>
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Breakdown por Categorías */}
        {categoryBreakdown && Object.keys(categoryBreakdown).length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Resumen por Categorías</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categoryBreakdown).map(([category, data]) => (
                <div key={category} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{category}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">Ingresos:</span>
                      <span>{displayPYGCurrency(data.ingresos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Egresos:</span>
                      <span>{displayPYGCurrency(data.egresos)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="font-medium">Neto:</span>
                      <span className={`font-medium ${data.ingresos - data.egresos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(data.ingresos - data.egresos)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {data.count} transacciones
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderYearlyMetrics = () => {
    if (!yearlyMetrics) return null;

    const { months, yearTotals, profitMargin, year } = yearlyMetrics;

    return (
      <div className="space-y-6">
        {/* Resumen Anual */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Resumen Anual {year}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Ventas</p>
              <p className="text-xl font-bold text-green-600">{yearTotals.totalSales}</p>
              <p className="text-sm text-gray-500">{displayPYGCurrency(yearTotals.totalRevenue)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Compras</p>
              <p className="text-xl font-bold text-red-600">{yearTotals.totalPurchases}</p>
              <p className="text-sm text-gray-500">{displayPYGCurrency(yearTotals.totalExpenses)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Ganancia Neta</p>
              <p className={`text-xl font-bold ${yearTotals.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(yearTotals.netProfit)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Margen</p>
              <p className={`text-xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Métricas Mensuales */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Métricas Mensuales</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ventas</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Compras</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gastos</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {months.map((month, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {month.monthName}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {month.sales.count}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                      {displayPYGCurrency(month.sales.revenue)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {month.purchases.count}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-red-600">
                      {displayPYGCurrency(month.purchases.expenses)}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-medium ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(month.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <FaChartLine className="mr-2 text-blue-600" />
          Dashboard Financiero
        </h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Resumen General
            </button>
            <button
              onClick={() => setActiveTab('statement')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'statement'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Estado de Cuenta
            </button>
            <button
              onClick={() => setActiveTab('yearly')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'yearly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Métricas Anuales
            </button>
          </nav>
        </div>

        {/* Filtros */}
        <div className="p-6 bg-gray-50">
          <div className="flex items-center mb-3">
            <FaFilter className="mr-2 text-gray-600" />
            <h3 className="font-medium">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {activeTab === 'dashboard' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período
                </label>
                <select
                  name="period"
                  value={filters.period}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="week">Esta Semana</option>
                  <option value="month">Este Mes</option>
                  <option value="quarter">Este Trimestre</option>
                  <option value="year">Este Año</option>
                </select>
              </div>
            )}

            {activeTab === 'statement' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    name="type"
                    value={filters.type}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">Todos</option>
                    <option value="sales">Solo Ventas</option>
                    <option value="purchases">Solo Compras</option>
                  </select>
                </div>
              </>
            )}

            {activeTab === 'yearly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Año
                </label>
                <select
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando datos...</p>
        </div>
      ) : (
        <div>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'statement' && renderAccountStatement()}
          {activeTab === 'yearly' && renderYearlyMetrics()}
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;