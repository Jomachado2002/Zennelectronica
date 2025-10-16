// frontend/src/pages/PurchaseManagement.js - MEJORADO CON INTERFAZ OPTIMIZADA PARA PARAGUAY
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaFileUpload, 
  FaEye, 
  FaFilter, 
  FaShoppingCart, 
  FaReceipt, 
  FaDollarSign,
  FaSearch,
  FaDownload,
  FaFileExcel,
  FaCalendarAlt,
  FaBuilding,
  FaUser,
  FaMoneyBillWave,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaChartLine,
  FaBox,
  FaTruck,
  FaFileInvoice,
  FaPrint,
  FaExpand,
  FaCompress,
  FaSyncAlt,
  FaSort,
  FaTimes as FaClose
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';
import * as XLSX from 'xlsx';
import moment from 'moment';

const PurchaseManagement = () => {
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  
  // Filtros mejorados
  const [filters, setFilters] = useState({
    search: '',
    purchaseType: '',
    paymentStatus: '',
    startDate: '',
    endDate: '',
    supplierId: '',
    amountRange: { min: '', max: '' },
    includeIVA: '',
    currency: '',
    sortBy: 'purchaseDate',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' o 'card'
  const [selectedPurchases, setSelectedPurchases] = useState([]);

  // Estado del formulario de nueva compra CON SOPORTE MULTI-MONEDA Y IVA
  const [newPurchaseData, setNewPurchaseData] = useState({
    purchaseType: 'inventario',
    supplierId: '',
    supplierInfo: {
      name: '',
      company: '',
      ruc: '',
      contact: '',
      email: '',
      phone: ''
    },
    items: [{ 
      description: '', 
      category: 'producto', 
      quantity: 1, 
      unitPrice: 0, 
      currency: 'USD', 
      exchangeRate: 7300,
      ivaIncluded: false,
      ivaRate: 10
    }],
    tax: 10, // IVA por defecto 10% (Paraguay)
    paymentMethod: 'transferencia',
    paymentStatus: 'pendiente',
    dueDate: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
    invoiceNumber: '',
    invoiceDate: '',
    includeIVA: true
  });

  const [fileUpload, setFileUpload] = useState({
    invoice: null,
    receipt: null
  });

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

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [filters, purchases]);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'amountRange' && key !== 'sortBy' && key !== 'sortOrder' && key !== 'search') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        const purchasesData = result.data.purchases || [];
        setPurchases(purchasesData);
        calculateStats(purchasesData);
      } else {
        toast.error(result.message || "Error al cargar las compras");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (purchasesData) => {
    const now = moment();
    const startOfMonth = moment().startOf('month');
    
    const total = purchasesData.length;
    const totalAmount = purchasesData.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalIVA = purchasesData.reduce((sum, p) => sum + (p.ivaAmount || 0), 0);
    const totalAmountWithIVA = totalAmount + totalIVA;
    
    const pending = purchasesData.filter(p => p.paymentStatus === 'pendiente').length;
    const paid = purchasesData.filter(p => p.paymentStatus === 'pagado').length;
    
    const thisMonthPurchases = purchasesData.filter(p => 
      moment(p.purchaseDate).isSameOrAfter(startOfMonth)
    );
    const thisMonth = thisMonthPurchases.length;
    const thisMonthAmount = thisMonthPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

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
    let result = [...purchases];

    // Filtro de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(purchase => 
        (purchase.invoiceNumber?.toLowerCase() || '').includes(searchLower) ||
        (purchase.supplierInfo?.name?.toLowerCase() || '').includes(searchLower) ||
        (purchase.supplierInfo?.company?.toLowerCase() || '').includes(searchLower) ||
        (purchase.notes?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Filtro de tipo de compra
    if (filters.purchaseType) {
      result = result.filter(purchase => purchase.purchaseType === filters.purchaseType);
    }

    // Filtro de estado de pago
    if (filters.paymentStatus) {
      result = result.filter(purchase => purchase.paymentStatus === filters.paymentStatus);
    }

    // Filtro de proveedor
    if (filters.supplierId) {
      result = result.filter(purchase => purchase.supplierId === filters.supplierId);
    }

    // Filtro de rango de monto
    if (filters.amountRange.min) {
      result = result.filter(purchase => (purchase.totalAmount || 0) >= Number(filters.amountRange.min));
    }
    if (filters.amountRange.max) {
      result = result.filter(purchase => (purchase.totalAmount || 0) <= Number(filters.amountRange.max));
    }

    // Filtro de moneda
    if (filters.currency) {
      result = result.filter(purchase => purchase.currency === filters.currency);
    }

    // Filtro de fechas
    if (filters.startDate) {
      result = result.filter(purchase => 
        moment(purchase.purchaseDate).isSameOrAfter(filters.startDate)
      );
    }
    if (filters.endDate) {
      result = result.filter(purchase => 
        moment(purchase.purchaseDate).isSameOrBefore(filters.endDate)
      );
    }

    // Ordenamiento
    result.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'purchaseDate':
          aValue = new Date(a.purchaseDate);
          bValue = new Date(b.purchaseDate);
          break;
        case 'totalAmount':
          aValue = a.totalAmount || 0;
          bValue = b.totalAmount || 0;
          break;
        case 'supplier':
          aValue = a.supplierInfo?.name || '';
          bValue = b.supplierInfo?.name || '';
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

    setFilteredPurchases(result);
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/proveedores`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setSuppliers(result.data.suppliers || []);
      }
    } catch (error) {
      console.error("Error al cargar proveedores:", error);
    }
  };

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
      purchaseType: '',
      paymentStatus: '',
      startDate: '',
      endDate: '',
      supplierId: '',
      amountRange: { min: '', max: '' },
      includeIVA: '',
      currency: '',
      sortBy: 'purchaseDate',
      sortOrder: 'desc'
    });
  };

  const exportToExcel = () => {
    const excelData = filteredPurchases.map(purchase => ({
      'Número de Factura': purchase.invoiceNumber || '',
      'Fecha': purchase.purchaseDate ? moment(purchase.purchaseDate).format('DD/MM/YYYY') : '',
      'Proveedor': purchase.supplierInfo?.name || purchase.supplierInfo?.company || '',
      'RUC': purchase.supplierInfo?.ruc || '',
      'Tipo de Compra': purchase.purchaseType || '',
      'Subtotal': purchase.totalAmount || 0,
      'IVA (%)': purchase.tax || 0,
      'IVA (₲)': purchase.ivaAmount || 0,
      'Total con IVA': (purchase.totalAmount || 0) + (purchase.ivaAmount || 0),
      'Moneda': purchase.currency || 'PYG',
      'Tipo de Cambio': purchase.exchangeRate || 1,
      'Método de Pago': purchase.paymentMethod || '',
      'Estado': purchase.paymentStatus || '',
      'Fecha de Vencimiento': purchase.dueDate ? moment(purchase.dueDate).format('DD/MM/YYYY') : '',
      'Notas': purchase.notes || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 20 }, // Número de Factura
      { wch: 12 }, // Fecha
      { wch: 25 }, // Proveedor
      { wch: 15 }, // RUC
      { wch: 15 }, // Tipo de Compra
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

    XLSX.utils.book_append_sheet(wb, ws, 'Compras');
    XLSX.writeFile(wb, `Compras_${new Date().toLocaleDateString()}.xlsx`);
    toast.success("Compras exportadas a Excel");
  };

  const addNewItem = () => {
    setNewPurchaseData(prev => ({
      ...prev,
      items: [...prev.items, { 
        description: '', 
        category: 'producto', 
        quantity: 1, 
        unitPrice: 0, 
        currency: 'USD', 
        exchangeRate: 7300,
        ivaIncluded: false,
        ivaRate: 10
      }]
    }));
  };

  const removeItem = (index) => {
    setNewPurchaseData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setNewPurchaseData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateItemTotal = (item) => {
    const subtotal = item.quantity * item.unitPrice;
    const ivaAmount = item.ivaIncluded ? 0 : (subtotal * (item.ivaRate || 10)) / 100;
    return subtotal + ivaAmount;
  };

  const calculatePurchaseTotal = () => {
    return newPurchaseData.items.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    
    try {
      const purchaseData = {
        ...newPurchaseData,
        totalAmount: newPurchaseData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
        ivaAmount: newPurchaseData.items.reduce((sum, item) => {
          const subtotal = item.quantity * item.unitPrice;
          return sum + (item.ivaIncluded ? 0 : (subtotal * (item.ivaRate || 10)) / 100);
        }, 0),
        totalWithIVA: calculatePurchaseTotal()
      };

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(purchaseData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success("Compra registrada exitosamente");
        setShowNewPurchaseModal(false);
        resetNewPurchaseForm();
        fetchPurchases();
      } else {
        toast.error(result.message || "Error al registrar la compra");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error de conexión");
    }
  };

  const resetNewPurchaseForm = () => {
        setNewPurchaseData({
          purchaseType: 'inventario',
          supplierId: '',
          supplierInfo: {
            name: '',
            company: '',
            ruc: '',
        contact: '',
        email: '',
        phone: ''
          },
          items: [{ 
            description: '', 
            category: 'producto', 
            quantity: 1, 
            unitPrice: 0, 
            currency: 'USD', 
        exchangeRate: 7300,
        ivaIncluded: false,
        ivaRate: 10
          }],
          tax: 10,
          paymentMethod: 'transferencia',
          paymentStatus: 'pendiente',
          dueDate: '',
          purchaseDate: new Date().toISOString().split('T')[0],
      notes: '',
      invoiceNumber: '',
      invoiceDate: '',
      includeIVA: true
    });
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

  const togglePurchaseSelection = (purchaseId) => {
    setSelectedPurchases(prev => 
      prev.includes(purchaseId) 
        ? prev.filter(id => id !== purchaseId)
        : [...prev, purchaseId]
    );
  };

  const selectAllPurchases = () => {
    setSelectedPurchases(filteredPurchases.map(p => p._id));
  };

  const clearSelection = () => {
    setSelectedPurchases([]);
  };

  const getFilterDescription = () => {
    let description = `Mostrando ${filteredPurchases.length} de ${purchases.length} compras`;
    
    if (filters.purchaseType) {
      description += ` • Tipo: "${filters.purchaseType}"`
    }
    
    if (filters.paymentStatus) {
      description += ` • Estado: "${filters.paymentStatus}"`
    }

    if (filters.startDate && filters.endDate) {
      description += ` • Período: ${moment(filters.startDate).format('DD/MM/YYYY')} - ${moment(filters.endDate).format('DD/MM/YYYY')}`
    }

    return description;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center text-gray-900">
              <FaShoppingCart className="mr-3 text-blue-600" />
          Gestión de Compras
        </h1>
            <p className="text-gray-600 mt-1">
              Administra las compras con soporte para IVA de Paraguay y múltiples monedas
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
              onClick={fetchPurchases}
              className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FaSyncAlt className="w-4 h-4 mr-2" />
              Actualizar
            </button>
        
        <button
          onClick={() => setShowNewPurchaseModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
              <FaPlus className="w-4 h-4 mr-2" />
              Nueva Compra
        </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FaShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <FaMoneyBillWave className="w-5 h-5 text-green-600" />
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
              <FaReceipt className="w-5 h-5 text-purple-600" />
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
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
          <FaFilter className="mr-2 text-gray-600" />
            Filtros y Búsqueda
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm"
            >
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm"
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
              placeholder="Buscar por factura, proveedor, RUC o notas..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Compra</label>
            <select
              name="purchaseType"
              value={filters.purchaseType}
              onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los tipos</option>
              <option value="inventario">Inventario</option>
              <option value="servicios">Servicios</option>
                <option value="gastos">Gastos</option>
                <option value="equipos">Equipos</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
            <select
              name="supplierId"
              value={filters.supplierId}
              onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map(supplier => (
                <option key={supplier._id} value={supplier._id}>
                    {supplier.name || supplier.company}
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
                <option value="purchaseDate">Fecha</option>
                <option value="totalAmount">Monto</option>
                <option value="supplier">Proveedor</option>
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
      {selectedPurchases.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900">
                {selectedPurchases.length} compras seleccionadas
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

      {/* Lista de compras */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedPurchases.length === filteredPurchases.length && filteredPurchases.length > 0}
                      onChange={selectedPurchases.length === filteredPurchases.length ? clearSelection : selectAllPurchases}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura / Proveedor
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
                {filteredPurchases.map((purchase, index) => (
                  <tr key={purchase._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedPurchases.includes(purchase._id)}
                        onChange={() => togglePurchaseSelection(purchase._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <FaBuilding className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            #{purchase.invoiceNumber || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {purchase.supplierInfo?.name || purchase.supplierInfo?.company || 'Proveedor no disponible'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {purchase.purchaseDate ? moment(purchase.purchaseDate).format('DD/MM/YYYY') : 'N/A'}
                        </div>
                      <div className="text-xs text-gray-500">
                        {purchase.purchaseType || 'N/A'}
                          </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {displayPYGCurrency(purchase.totalAmount || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {purchase.currency || 'PYG'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {displayPYGCurrency(purchase.ivaAmount || 0)}
                        </div>
                      <div className="text-xs text-gray-500">
                        {purchase.tax || 0}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getPaymentStatusIcon(purchase.paymentStatus)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(purchase.paymentStatus)}`}>
                          {purchase.paymentStatus || 'N/A'}
                        </span>
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
          {filteredPurchases.map((purchase, index) => (
            <div key={purchase._id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    #{purchase.invoiceNumber || 'N/A'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {purchase.supplierInfo?.name || purchase.supplierInfo?.company || 'Proveedor no disponible'}
                  </p>
                </div>
                <div className="flex items-center">
                  {getPaymentStatusIcon(purchase.paymentStatus)}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Fecha:</span>
                  <span className="text-sm text-gray-900">
                    {purchase.purchaseDate ? moment(purchase.purchaseDate).format('DD/MM/YYYY') : 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Subtotal:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {displayPYGCurrency(purchase.totalAmount || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">IVA:</span>
                  <span className="text-sm text-gray-900">
                    {displayPYGCurrency(purchase.ivaAmount || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Total:</span>
                  <span className="text-sm font-bold text-green-600">
                    {displayPYGCurrency((purchase.totalAmount || 0) + (purchase.ivaAmount || 0))}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Estado:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(purchase.paymentStatus)}`}>
                    {purchase.paymentStatus || 'N/A'}
                  </span>
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
              </div>
            </div>
          ))}
          </div>
        )}

      {filteredPurchases.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <FaShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron compras</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros para ver más resultados.
          </p>
      </div>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Cargando compras...</p>
        </div>
      )}

      {/* Modal para nueva compra */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Nueva Compra</h2>
                  <p className="text-gray-600 mt-1">
                    Registra una nueva compra con soporte para IVA de Paraguay
                  </p>
                </div>
              <button 
                onClick={() => setShowNewPurchaseModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl p-2 hover:bg-gray-100 rounded-lg"
              >
                  <FaClose />
              </button>
            </div>

              <form onSubmit={handleSubmitPurchase} className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Compra <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newPurchaseData.purchaseType}
                        onChange={(e) => setNewPurchaseData(prev => ({ ...prev, purchaseType: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="inventario">Inventario</option>
                    <option value="servicios">Servicios</option>
                        <option value="gastos">Gastos</option>
                        <option value="equipos">Equipos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Factura <span className="text-red-500">*</span>
                  </label>
                      <input
                        type="text"
                        value={newPurchaseData.invoiceNumber}
                        onChange={(e) => setNewPurchaseData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="001-001-0001234"
                        required
                      />
                </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Compra <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={newPurchaseData.purchaseDate}
                        onChange={(e) => setNewPurchaseData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Vencimiento
                      </label>
                      <input
                        type="date"
                        value={newPurchaseData.dueDate}
                        onChange={(e) => setNewPurchaseData(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    </div>

                  {/* Información del Proveedor */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Proveedor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre/Razón Social <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                          value={newPurchaseData.supplierInfo.name}
                          onChange={(e) => setNewPurchaseData(prev => ({ 
                            ...prev, 
                            supplierInfo: { ...prev.supplierInfo, name: e.target.value }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nombre del proveedor"
                          required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                          RUC <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                          value={newPurchaseData.supplierInfo.ruc}
                          onChange={(e) => setNewPurchaseData(prev => ({ 
                            ...prev, 
                            supplierInfo: { ...prev.supplierInfo, ruc: e.target.value }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="1234567-8"
                          required
                      />
                    </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono
                  </label>
                  <input
                          type="tel"
                          value={newPurchaseData.supplierInfo.phone}
                          onChange={(e) => setNewPurchaseData(prev => ({ 
                            ...prev, 
                            supplierInfo: { ...prev.supplierInfo, phone: e.target.value }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="(021) 123-456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                  </label>
                        <input
                          type="email"
                          value={newPurchaseData.supplierInfo.email}
                          onChange={(e) => setNewPurchaseData(prev => ({ 
                            ...prev, 
                            supplierInfo: { ...prev.supplierInfo, email: e.target.value }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="proveedor@ejemplo.com"
                        />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contacto
                  </label>
                  <input
                          type="text"
                          value={newPurchaseData.supplierInfo.contact}
                          onChange={(e) => setNewPurchaseData(prev => ({ 
                            ...prev, 
                            supplierInfo: { ...prev.supplierInfo, contact: e.target.value }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nombre del contacto"
                        />
                      </div>
                </div>
              </div>

                  {/* Items de la compra */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Items de la Compra</h3>
                  <button
                    type="button"
                        onClick={addNewItem}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                        <FaPlus className="w-4 h-4 mr-2" />
                        Agregar Item
                  </button>
                </div>

                    <div className="space-y-4">
                      {newPurchaseData.items.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                            {newPurchaseData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <FaTrash className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                            <div className="lg:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción <span className="text-red-500">*</span>
                              </label>
                            <input
                              type="text"
                              value={item.description}
                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Descripción del item"
                              required
                            />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cantidad <span className="text-red-500">*</span>
                              </label>
                            <input
                              type="number"
                              min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Precio Unitario <span className="text-red-500">*</span>
                              </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Moneda
                              </label>
                            <select
                              value={item.currency}
                                onChange={(e) => updateItem(index, 'currency', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="USD">USD</option>
                                <option value="PYG">PYG</option>
                                <option value="EUR">EUR</option>
                            </select>
                            </div>

                            {item.currency !== 'PYG' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Tipo de Cambio
                                </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                  value={item.exchangeRate}
                                  onChange={(e) => updateItem(index, 'exchangeRate', Number(e.target.value))}
                                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            )}
                </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                IVA (%)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.ivaRate}
                                onChange={(e) => updateItem(index, 'ivaRate', Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
              </div>

                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`ivaIncluded-${index}`}
                                checked={item.ivaIncluded}
                                onChange={(e) => updateItem(index, 'ivaIncluded', e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor={`ivaIncluded-${index}`} className="ml-2 text-sm text-gray-700">
                                IVA incluido en el precio
                              </label>
                  </div>

                            <div className="text-right">
                              <div className="text-sm text-gray-600">Total del Item:</div>
                              <div className="text-lg font-bold text-gray-900">
                                {displayPYGCurrency(calculateItemTotal(item))}
                  </div>
                  </div>
                </div>
              </div>
                      ))}
                    </div>
              </div>

                  {/* Resumen de la compra */}
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de la Compra</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Subtotal:</div>
                        <div className="text-lg font-bold text-gray-900">
                          {displayPYGCurrency(newPurchaseData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
              </div>
          </div>
                      <div>
                        <div className="text-sm text-gray-600">IVA Total:</div>
                        <div className="text-lg font-bold text-gray-900">
                          {displayPYGCurrency(newPurchaseData.items.reduce((sum, item) => {
                            const subtotal = item.quantity * item.unitPrice;
                            return sum + (item.ivaIncluded ? 0 : (subtotal * (item.ivaRate || 10)) / 100);
                          }, 0))}
        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Total con IVA:</div>
                        <div className="text-xl font-bold text-green-600">
                          {displayPYGCurrency(calculatePurchaseTotal())}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Información adicional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Método de Pago
                      </label>
                      <select
                        value={newPurchaseData.paymentMethod}
                        onChange={(e) => setNewPurchaseData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="transferencia">Transferencia</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="cheque">Cheque</option>
                        <option value="tarjeta">Tarjeta</option>
                      </select>
            </div>

                <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado de Pago
                  </label>
                      <select
                        value={newPurchaseData.paymentStatus}
                        onChange={(e) => setNewPurchaseData(prev => ({ ...prev, paymentStatus: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="pagado">Pagado</option>
                        <option value="vencido">Vencido</option>
                      </select>
                    </div>
                </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas
                  </label>
                    <textarea
                      value={newPurchaseData.notes}
                      onChange={(e) => setNewPurchaseData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notas adicionales sobre la compra..."
                    />
                </div>
              </div>

                <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                    onClick={() => setShowNewPurchaseModal(false)}
                    className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Registrar Compra
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseManagement;