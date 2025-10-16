// frontend/src/pages/SalesManagement.js - MEJORADO CON INTERFAZ OPTIMIZADA PARA VENTAS
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaFilter, 
  FaFileInvoiceDollar, 
  FaMoneyBillWave, 
  FaDollarSign,
  FaSearch,
  FaDownload,
  FaFileExcel,
  FaCalendarAlt,
  FaUser,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaChartLine,
  FaSyncAlt,
  FaShoppingBag,
  FaExpand,
  FaCompress,
  FaPlus
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';
import * as XLSX from 'xlsx';
import moment from 'moment';

const SalesManagement = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros mejorados
  const [filters, setFilters] = useState({
    search: '',
    saleType: '',
    paymentStatus: '',
    startDate: '',
    endDate: '',
    clientId: '',
    amountRange: { min: '', max: '' },
    includeIVA: '',
    currency: '',
    sortBy: 'saleDate',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' o 'card'
  const [selectedSales, setSelectedSales] = useState([]);


  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    totalAmountWithIVA: 0,
    totalIVA: 0,
    pending: 0,
    paid: 0,
    thisMonth: 0,
    thisMonthAmount: 0
  });

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'amountRange' && key !== 'sortBy' && key !== 'sortOrder' && key !== 'search') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        const salesData = result.data.sales || [];
        // Mapear los datos para asegurar compatibilidad
        const mappedSales = salesData.map(sale => ({
          ...sale,
          clientInfo: sale.client ? {
            name: sale.client.name || sale.clientSnapshot?.name,
            email: sale.client.email || sale.clientSnapshot?.email,
            phone: sale.client.phone || sale.clientSnapshot?.phone,
            company: sale.client.company || sale.clientSnapshot?.company
          } : sale.clientSnapshot,
          invoiceNumber: sale.saleNumber || sale.invoiceNumber,
          saleDate: sale.saleDate || sale.createdAt,
          totalAmount: sale.subtotal || sale.totalAmount,
          ivaAmount: sale.taxAmount || sale.ivaAmount,
          tax: sale.taxRate || sale.tax,
          paymentStatus: sale.paymentStatus || 'pendiente'
        }));
        setSales(mappedSales);
        calculateStats(mappedSales);
      } else {
        toast.error(result.message || "Error al cargar las ventas");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (salesData) => {
    const startOfMonth = moment().startOf('month');
    
    const total = salesData.length;
    const totalAmount = salesData.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalIVA = salesData.reduce((sum, s) => sum + (s.ivaAmount || 0), 0);
    const totalAmountWithIVA = totalAmount + totalIVA;
    
    const pending = salesData.filter(s => s.paymentStatus === 'pendiente').length;
    const paid = salesData.filter(s => s.paymentStatus === 'pagado').length;
    
    const thisMonthSales = salesData.filter(s => 
      moment(s.saleDate).isSameOrAfter(startOfMonth)
    );
    const thisMonth = thisMonthSales.length;
    const thisMonthAmount = thisMonthSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    setStats({
      total,
      totalAmount,
      totalAmountWithIVA,
      totalIVA,
      pending,
      paid,
      thisMonth,
      thisMonthAmount
    });
  };

  const applyFiltersAndSort = () => {
    let result = [...sales];

    // Filtro de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(sale => 
        (sale.invoiceNumber?.toLowerCase() || '').includes(searchLower) ||
        (sale.clientInfo?.name?.toLowerCase() || '').includes(searchLower) ||
        (sale.clientInfo?.email?.toLowerCase() || '').includes(searchLower) ||
        (sale.notes?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Otros filtros...
    if (filters.saleType) {
      result = result.filter(sale => sale.saleType === filters.saleType);
    }

    if (filters.paymentStatus) {
      result = result.filter(sale => sale.paymentStatus === filters.paymentStatus);
    }

    if (filters.clientId) {
      result = result.filter(sale => sale.clientId === filters.clientId);
    }

    if (filters.amountRange.min) {
      result = result.filter(sale => (sale.totalAmount || 0) >= Number(filters.amountRange.min));
    }
    if (filters.amountRange.max) {
      result = result.filter(sale => (sale.totalAmount || 0) <= Number(filters.amountRange.max));
    }

    if (filters.currency) {
      result = result.filter(sale => sale.currency === filters.currency);
    }

    if (filters.startDate) {
      result = result.filter(sale => 
        moment(sale.saleDate).isSameOrAfter(filters.startDate)
      );
    }
    if (filters.endDate) {
      result = result.filter(sale => 
        moment(sale.saleDate).isSameOrBefore(filters.endDate)
      );
    }

    // Ordenamiento
    result.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'saleDate':
          aValue = new Date(a.saleDate);
          bValue = new Date(b.saleDate);
          break;
        case 'totalAmount':
          aValue = a.totalAmount || 0;
          bValue = b.totalAmount || 0;
          break;
        case 'client':
          aValue = a.clientInfo?.name || '';
          bValue = b.clientInfo?.name || '';
          break;
        case 'invoiceNumber':
          aValue = a.invoiceNumber || '';
          bValue = b.invoiceNumber || '';
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredSales(result);
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/clientes`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setClients(result.data.clients || []);
      }
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchClients();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyFiltersAndSort();
  }, [filters, sales]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleAmountRangeChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      amountRange: { ...prev.amountRange, [field]: value }
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      saleType: '',
      paymentStatus: '',
      startDate: '',
      endDate: '',
      clientId: '',
      amountRange: { min: '', max: '' },
      includeIVA: '',
      currency: '',
      sortBy: 'saleDate',
      sortOrder: 'desc'
    });
  };

  const exportToExcel = () => {
    const excelData = filteredSales.map(sale => ({
      'Número de Factura': sale.invoiceNumber || '',
      'Fecha': sale.saleDate ? moment(sale.saleDate).format('DD/MM/YYYY') : '',
      'Cliente': sale.clientInfo?.name || sale.clientInfo?.email || '',
      'Email': sale.clientInfo?.email || '',
      'Teléfono': sale.clientInfo?.phone || '',
      'Tipo de Venta': sale.saleType || '',
      'Subtotal': sale.totalAmount || 0,
      'IVA (%)': sale.tax || 0,
      'IVA (₲)': sale.ivaAmount || 0,
      'Total con IVA': (sale.totalAmount || 0) + (sale.ivaAmount || 0),
      'Moneda': sale.currency || 'PYG',
      'Tipo de Cambio': sale.exchangeRate || 1,
      'Método de Pago': sale.paymentMethod || '',
      'Estado': sale.paymentStatus || '',
      'Fecha de Vencimiento': sale.dueDate ? moment(sale.dueDate).format('DD/MM/YYYY') : '',
      'Notas': sale.notes || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws['!cols'] = [
      { wch: 20 }, // Número de Factura
      { wch: 12 }, // Fecha
      { wch: 25 }, // Cliente
      { wch: 25 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 15 }, // Tipo de Venta
      { wch: 15 }, // Subtotal
      { wch: 10 }, // IVA (%)
      { wch: 15 }, // IVA (₲)
      { wch: 15 }, // Total con IVA
      { wch: 10 }, // Moneda
      { wch: 12 }, // Tipo de Cambio
      { wch: 15 }, // Método de Pago
      { wch: 12 }, // Estado
      { wch: 15 }, // Fecha de Vencimiento
      { wch: 30 }  // Notas
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `Ventas_${new Date().toLocaleDateString()}.xlsx`);
    toast.success("Ventas exportadas a Excel");
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'pagado':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusIcon = (status) => {
    switch (status) {
      case 'pagado':
        return <FaCheck className="w-4 h-4 text-green-600" />;
      case 'pendiente':
        return <FaExclamationTriangle className="w-4 h-4 text-yellow-600" />;
      case 'vencido':
        return <FaTimes className="w-4 h-4 text-red-600" />;
      default:
        return <FaInfoCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const toggleSaleSelection = (saleId) => {
    setSelectedSales(prev => 
      prev.includes(saleId) 
        ? prev.filter(id => id !== saleId)
        : [...prev, saleId]
    );
  };

  const selectAllSales = () => {
    setSelectedSales(filteredSales.map(s => s._id));
  };

  const clearSelection = () => {
    setSelectedSales([]);
  };

  const getFilterDescription = () => {
    let description = `Mostrando ${filteredSales.length} de ${sales.length} ventas`;
    
    if (filters.saleType) {
      description += ` • Tipo: "${filters.saleType}"`
    }
    
    if (filters.paymentStatus) {
      description += ` • Estado: "${filters.paymentStatus}"`
    }

    if (filters.startDate && filters.endDate) {
      description += ` • Período: ${moment(filters.startDate).format('DD/MM/YYYY')} - ${moment(filters.endDate).format('DD/MM/YYYY')}`
    }

    return description;
  };

  const updatePaymentStatus = async (saleId, newStatus) => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/${saleId}/estado-pago`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ paymentStatus: newStatus })
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Estado de pago actualizado correctamente");
        fetchSales(); // Recargar las ventas
      } else {
        toast.error(result.message || "Error al actualizar el estado");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const deleteSale = async (saleId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta venta?")) {
      return;
    }

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/${saleId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Venta eliminada correctamente");
        fetchSales(); // Recargar las ventas
      } else {
        toast.error(result.message || "Error al eliminar la venta");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center text-gray-900">
              <FaShoppingBag className="mr-3 text-green-600" />
              Gestión de Ventas
            </h1>
            <p className="text-gray-600 mt-1">
              Administra las ventas con soporte para IVA de Paraguay y múltiples monedas
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
              className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {viewMode === 'table' ? <FaExpand className="w-4 h-4 mr-2" /> : <FaCompress className="w-4 h-4 mr-2" />}
              {viewMode === 'table' ? 'Vista Tarjetas' : 'Vista Tabla'}
            </button>
            
            <button
              onClick={fetchSales}
              className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FaSyncAlt className="w-4 h-4 mr-2" />
              Actualizar
            </button>
            
            <button
              onClick={() => navigate('/panel-admin/nueva-venta')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Nueva Venta
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <FaShoppingBag className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FaMoneyBillWave className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Subtotal</p>
              <p className="text-lg font-bold text-gray-900">{displayPYGCurrency(stats.totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-50 rounded-lg">
                <FaFileInvoiceDollar className="w-5 h-5 text-purple-600" />
              </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">IVA (10%)</p>
              <p className="text-lg font-bold text-gray-900">{displayPYGCurrency(stats.totalIVA)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-50 rounded-lg">
              <FaDollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total con IVA</p>
              <p className="text-lg font-bold text-gray-900">{displayPYGCurrency(stats.totalAmountWithIVA)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <FaExclamationTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <FaCheck className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pagadas</p>
              <p className="text-xl font-bold text-gray-900">{stats.paid}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-teal-50 rounded-lg">
              <FaCalendarAlt className="w-5 h-5 text-teal-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Este Mes</p>
              <p className="text-xl font-bold text-gray-900">{stats.thisMonth}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <FaChartLine className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Mes (₲)</p>
              <p className="text-lg font-bold text-gray-900">{displayPYGCurrency(stats.thisMonthAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3">
          <h3 className="text-base font-semibold flex items-center mb-2 sm:mb-0">
            <FaFilter className="mr-2 text-gray-600" />
            Filtros y Búsqueda
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm"
            >
              {showFilters ? 'Ocultar' : 'Filtros'}
            </button>
            <button
              onClick={resetFilters}
              className="px-3 py-1 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Búsqueda principal */}
        <div className="mb-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Buscar por factura, cliente, email o notas..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Venta</label>
            <select
              name="saleType"
              value={filters.saleType}
              onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los tipos</option>
              <option value="terminal">Terminal</option>
                <option value="online">Online</option>
                <option value="mayorista">Mayorista</option>
                <option value="retail">Retail</option>
            </select>
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Pago</label>
            <select
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select
              name="clientId"
              value={filters.clientId}
              onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los clientes</option>
              {clients.map(client => (
                <option key={client._id} value={client._id}>
                    {client.name || client.email}
                </option>
              ))}
            </select>
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select
                name="currency"
                value={filters.currency}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las monedas</option>
                <option value="PYG">Guaraní (₲)</option>
                <option value="USD">Dólar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto Mínimo</label>
              <input
                type="number"
                value={filters.amountRange.min}
                onChange={(e) => handleAmountRangeChange('min', e.target.value)}
                placeholder="0"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto Máximo</label>
              <input
                type="number"
                value={filters.amountRange.max}
                onChange={(e) => handleAmountRangeChange('max', e.target.value)}
                placeholder="999999999"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
              <select
                name="sortBy"
                value={filters.sortBy}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="saleDate">Fecha</option>
                <option value="totalAmount">Monto</option>
                <option value="client">Cliente</option>
                <option value="invoiceNumber">Número de Factura</option>
              </select>
        </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
              <select
                name="sortOrder"
                value={filters.sortOrder}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Acciones masivas */}
      {selectedSales.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900">
                {selectedSales.length} ventas seleccionadas
              </span>
          <button
                onClick={clearSelection}
                className="ml-3 text-sm text-blue-600 hover:text-blue-800"
          >
                Limpiar selección
          </button>
            </div>
            <div className="flex space-x-2">
          <button
                onClick={exportToExcel}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
                <FaDownload className="w-3 h-3 mr-1" />
                Exportar
          </button>
        </div>
      </div>
        </div>
      )}

      {/* Información de filtros */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          {getFilterDescription()}
          </div>
        <div className="flex space-x-2">
          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 text-sm"
          >
            <FaFileExcel className="w-4 h-4 mr-2" />
            Exportar Excel
          </button>
          </div>
      </div>

      {/* Lista de ventas */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedSales.length === filteredSales.length && filteredSales.length > 0}
                      onChange={selectedSales.length === filteredSales.length ? clearSelection : selectAllSales}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura / Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IVA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale, index) => (
                  <tr key={sale._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSales.includes(sale._id)}
                        onChange={() => toggleSaleSelection(sale._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <FaUser className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            #{sale.invoiceNumber || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sale.clientInfo?.name || sale.clientInfo?.email || 'Cliente no disponible'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {sale.saleDate ? moment(sale.saleDate).format('DD/MM/YYYY') : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {sale.saleType || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {displayPYGCurrency(sale.totalAmount || 0)}
                        </div>
                      <div className="text-xs text-gray-500">
                        {sale.currency || 'PYG'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {displayPYGCurrency(sale.ivaAmount || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {sale.tax || 0}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getPaymentStatusIcon(sale.paymentStatus)}
                        <select
                          value={sale.paymentStatus || 'pendiente'}
                          onChange={(e) => updatePaymentStatus(sale._id, e.target.value)}
                          className={`ml-2 text-xs font-semibold rounded-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 ${getPaymentStatusColor(sale.paymentStatus)}`}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="pagado">Pagado</option>
                          <option value="vencido">Vencido</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                        <button
                          className="text-green-600 hover:text-green-900"
                          title="Editar"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSale(sale._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSales.map((sale, index) => (
            <div key={sale._id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    #{sale.invoiceNumber || 'N/A'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {sale.clientInfo?.name || sale.clientInfo?.email || 'Cliente no disponible'}
                  </p>
                </div>
                <div className="flex items-center">
                  {getPaymentStatusIcon(sale.paymentStatus)}
                </div>
                </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Fecha:</span>
                  <span className="text-sm text-gray-900">
                    {sale.saleDate ? moment(sale.saleDate).format('DD/MM/YYYY') : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Subtotal:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {displayPYGCurrency(sale.totalAmount || 0)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">IVA:</span>
                  <span className="text-sm text-gray-900">
                    {displayPYGCurrency(sale.ivaAmount || 0)}
                  </span>
              </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Total:</span>
                  <span className="text-sm font-bold text-green-600">
                    {displayPYGCurrency((sale.totalAmount || 0) + (sale.ivaAmount || 0))}
                  </span>
                </div>

                  <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Estado:</span>
                  <select
                    value={sale.paymentStatus || 'pendiente'}
                    onChange={(e) => updatePaymentStatus(sale._id, e.target.value)}
                    className={`text-xs font-semibold rounded-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 ${getPaymentStatusColor(sale.paymentStatus)}`}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <button className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  <FaEye className="w-3 h-3 mr-1" />
                  Ver
                </button>
                <button className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                  <FaEdit className="w-3 h-3 mr-1" />
                  Editar
                </button>
                <button 
                  onClick={() => deleteSale(sale._id)}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  <FaTrash className="w-3 h-3 mr-1" />
                  Eliminar
                </button>
              </div>
          </div>
          ))}
        </div>
      )}

      {filteredSales.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <FaShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron ventas</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros para ver más resultados.
                </p>
              </div>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Cargando ventas...</p>
        </div>
      )}
    </div>
  );
};

export default SalesManagement;