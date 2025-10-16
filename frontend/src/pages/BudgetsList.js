// frontend/src/pages/BudgetsList.js - MEJORADO CON SOPORTE MULTIMONEDA Y DISEÑO OPTIMIZADO
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import { 
  FaFilePdf, 
  FaEdit, 
  FaTrashAlt, 
  FaEye, 
  FaFileDownload,
  FaDownload, 
  FaPlus, 
  FaFilter, 
  FaSearch, 
  FaDollarSign, 
  FaEuroSign, 
  FaExchangeAlt,
  FaCalendarAlt,
  FaBuilding,
  FaUser,
  FaFileExcel,
  FaPrint,
  FaSyncAlt,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaClock,
  FaThumbsUp,
  FaThumbsDown,
  FaExpand,
  FaCompress,
  FaSort,
  FaTimes as FaClose,
  FaFileInvoice,
  FaClipboardList
} from 'react-icons/fa';
import displayPYGCurrency from '../helpers/displayCurrency';
import * as XLSX from 'xlsx';
import moment from 'moment';

const BudgetsList = () => {
  const [budgets, setBudgets] = useState([]);
  const [filteredBudgets, setFilteredBudgets] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewBudgetModal, setShowNewBudgetModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  
  // Filtros mejorados
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    clientId: '',
    currency: '',
    amountRange: { min: '', max: '' },
    startDate: '',
    endDate: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' o 'card'
  const [selectedBudgets, setSelectedBudgets] = useState([]);

  // Estado del formulario de nuevo presupuesto
  const [newBudgetData, setNewBudgetData] = useState({
    clientId: '',
    clientInfo: {
      name: '',
      email: '',
      phone: '',
      company: '',
      address: ''
    },
    items: [{ 
      description: '', 
      quantity: 1, 
      unitPrice: 0, 
      currency: 'PYG', 
      exchangeRate: 7300
    }],
    tax: 10, // IVA por defecto 10%
    validUntil: moment().add(30, 'days').format('YYYY-MM-DD'),
    notes: '',
    currency: 'PYG',
    exchangeRate: 7300,
    includeIVA: true
  });

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    totalAmountUSD: 0,
    totalAmountEUR: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
    converted: 0,
    thisMonth: 0,
    thisMonthAmount: 0
  });

  useEffect(() => {
    fetchBudgets();
    fetchClients();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [filters, budgets]);

  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'amountRange' && key !== 'sortBy' && key !== 'sortOrder' && key !== 'search') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      const result = await response.json();
      if (result.success) {
        const budgetsData = result.data.budgets || [];
        setBudgets(budgetsData);
        calculateStats(budgetsData);
      } else {
        toast.error(result.message || "Error al cargar los presupuestos");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (budgetsData) => {
    const now = moment();
    const startOfMonth = moment().startOf('month');
    
    const total = budgetsData.length;
    const totalAmount = budgetsData.reduce((sum, b) => {
      const amount = b.finalAmount || 0;
      if (b.currency === 'USD') {
        return sum + (amount * (b.exchangeRate || 7300));
      } else if (b.currency === 'EUR') {
        return sum + (amount * (b.exchangeRate || 8000));
      }
      return sum + amount;
    }, 0);

    const totalAmountUSD = budgetsData
      .filter(b => b.currency === 'USD')
      .reduce((sum, b) => sum + (b.finalAmount || 0), 0);

    const totalAmountEUR = budgetsData
      .filter(b => b.currency === 'EUR')
      .reduce((sum, b) => sum + (b.finalAmount || 0), 0);

    const draft = budgetsData.filter(b => b.status === 'draft').length;
    const sent = budgetsData.filter(b => b.status === 'sent').length;
    const accepted = budgetsData.filter(b => b.status === 'accepted').length;
    const rejected = budgetsData.filter(b => b.status === 'rejected').length;
    const expired = budgetsData.filter(b => b.status === 'expired').length;
    const converted = budgetsData.filter(b => b.status === 'converted').length;
    
    const thisMonthBudgets = budgetsData.filter(b => 
      moment(b.createdAt).isSameOrAfter(startOfMonth)
    );
    const thisMonth = thisMonthBudgets.length;
    const thisMonthAmount = thisMonthBudgets.reduce((sum, b) => {
      const amount = b.finalAmount || 0;
      if (b.currency === 'USD') {
        return sum + (amount * (b.exchangeRate || 7300));
      } else if (b.currency === 'EUR') {
        return sum + (amount * (b.exchangeRate || 8000));
      }
      return sum + amount;
    }, 0);

    setStats({
      total,
      totalAmount,
      totalAmountUSD,
      totalAmountEUR,
      draft,
      sent,
      accepted,
      rejected,
      expired,
      converted,
      thisMonth,
      thisMonthAmount
    });
  };

  const applyFiltersAndSort = () => {
    let result = [...budgets];

    // Filtro de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(budget => 
        (budget.budgetNumber?.toLowerCase() || '').includes(searchLower) ||
        (budget.client?.name?.toLowerCase() || '').includes(searchLower) ||
        (budget.client?.email?.toLowerCase() || '').includes(searchLower) ||
        (budget.notes?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Otros filtros...
    if (filters.status) {
      result = result.filter(budget => budget.status === filters.status);
    }

    if (filters.clientId) {
      result = result.filter(budget => budget.clientId === filters.clientId);
    }

    if (filters.currency) {
      result = result.filter(budget => budget.currency === filters.currency);
    }

    if (filters.amountRange.min) {
      result = result.filter(budget => (budget.finalAmount || 0) >= Number(filters.amountRange.min));
    }
    if (filters.amountRange.max) {
      result = result.filter(budget => (budget.finalAmount || 0) <= Number(filters.amountRange.max));
    }

    if (filters.startDate) {
      result = result.filter(budget => 
        moment(budget.createdAt).isSameOrAfter(filters.startDate)
      );
    }
    if (filters.endDate) {
      result = result.filter(budget => 
        moment(budget.createdAt).isSameOrBefore(filters.endDate)
      );
    }

    // Ordenamiento
    result.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'finalAmount':
          aValue = a.finalAmount || 0;
          bValue = b.finalAmount || 0;
          break;
        case 'client':
          aValue = a.client?.name || '';
          bValue = b.client?.name || '';
          break;
        case 'budgetNumber':
          aValue = a.budgetNumber || '';
          bValue = b.budgetNumber || '';
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

    setFilteredBudgets(result);
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
      status: '',
      clientId: '',
      currency: '',
      amountRange: { min: '', max: '' },
      startDate: '',
      endDate: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const exportToExcel = () => {
    const excelData = filteredBudgets.map(budget => ({
      'Número de Presupuesto': budget.budgetNumber || '',
      'Fecha': budget.createdAt ? moment(budget.createdAt).format('DD/MM/YYYY') : '',
      'Cliente': budget.client?.name || '',
      'Email': budget.client?.email || '',
      'Teléfono': budget.client?.phone || '',
      'Empresa': budget.client?.company || '',
      'Importe': budget.finalAmount || 0,
      'Moneda': budget.currency || 'PYG',
      'Tipo de Cambio': budget.exchangeRate || 1,
      'Importe en PYG': budget.currency === 'USD' ? (budget.finalAmount || 0) * (budget.exchangeRate || 7300) : 
                      budget.currency === 'EUR' ? (budget.finalAmount || 0) * (budget.exchangeRate || 8000) : 
                      budget.finalAmount || 0,
      'Estado': getStatusLabel(budget.status),
      'Válido hasta': budget.validUntil ? moment(budget.validUntil).format('DD/MM/YYYY') : '',
      'Notas': budget.notes || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws['!cols'] = [
      { wch: 20 }, // Número de Presupuesto
      { wch: 12 }, // Fecha
      { wch: 25 }, // Cliente
      { wch: 25 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 20 }, // Empresa
      { wch: 15 }, // Importe
      { wch: 10 }, // Moneda
      { wch: 12 }, // Tipo de Cambio
      { wch: 15 }, // Importe en PYG
      { wch: 12 }, // Estado
      { wch: 15 }, // Válido hasta
      { wch: 30 }  // Notas
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Presupuestos');
    XLSX.writeFile(wb, `Presupuestos_${new Date().toLocaleDateString()}.xlsx`);
    toast.success("Presupuestos exportados a Excel");
  };

  const handleStatusChange = async (budgetId, newStatus) => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos/${budgetId}/estado`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Estado actualizado a "${getStatusLabel(newStatus)}"`);
        setBudgets(budgets.map(budget => 
          budget._id === budgetId ? { ...budget, status: newStatus } : budget
        ));
      } else {
        toast.error(result.message || "Error al actualizar el estado");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) {
      return;
    }
    
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos/${budgetId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Presupuesto eliminado correctamente");
        setBudgets(budgets.filter(budget => budget._id !== budgetId));
      } else {
        toast.error(result.message || "Error al eliminar el presupuesto");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const downloadPDF = (budgetId, budgetNumber) => {
    const link = document.createElement('a');
    link.href = `${SummaryApi.baseURL}/api/finanzas/presupuestos/${budgetId}/pdf`;
    link.setAttribute('download', `presupuesto-${budgetNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'draft': return 'Borrador';
      case 'sent': return 'Enviado';
      case 'accepted': return 'Aceptado';
      case 'rejected': return 'Rechazado';
      case 'expired': return 'Expirado';
      case 'converted': return 'Convertido';
      default: return 'Desconocido';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'draft': return <FaClock className="w-4 h-4 text-gray-600" />;
      case 'sent': return <FaExclamationTriangle className="w-4 h-4 text-blue-600" />;
      case 'accepted': return <FaThumbsUp className="w-4 h-4 text-green-600" />;
      case 'rejected': return <FaThumbsDown className="w-4 h-4 text-red-600" />;
      case 'expired': return <FaTimes className="w-4 h-4 text-yellow-600" />;
      case 'converted': return <FaCheck className="w-4 h-4 text-purple-600" />;
      default: return <FaClock className="w-4 h-4 text-gray-600" />;
    }
  };

  const toggleBudgetSelection = (budgetId) => {
    setSelectedBudgets(prev => 
      prev.includes(budgetId) 
        ? prev.filter(id => id !== budgetId)
        : [...prev, budgetId]
    );
  };

  const selectAllBudgets = () => {
    setSelectedBudgets(filteredBudgets.map(b => b._id));
  };

  const clearSelection = () => {
    setSelectedBudgets([]);
  };

  const getFilterDescription = () => {
    let description = `Mostrando ${filteredBudgets.length} de ${budgets.length} presupuestos`;
    
    if (filters.status) {
      description += ` • Estado: "${getStatusLabel(filters.status)}"`
    }
    
    if (filters.currency) {
      description += ` • Moneda: "${filters.currency}"`
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
              <FaFileInvoice className="mr-3 text-blue-600" />
              Gestión de Presupuestos
            </h1>
            <p className="text-gray-600 mt-1">
              Administra presupuestos con soporte para múltiples monedas (PYG, USD, EUR)
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
              onClick={fetchBudgets}
              className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FaSyncAlt className="w-4 h-4 mr-2" />
              Actualizar
            </button>
        
        <Link 
          to="/panel-admin/presupuestos/nuevo" 
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
              <FaPlus className="w-4 h-4 mr-2" />
              Nuevo Presupuesto
        </Link>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FaFileInvoice className="w-5 h-5 text-blue-600" />
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
              <FaDollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total (₲)</p>
              <p className="text-lg font-bold text-gray-900">{displayPYGCurrency(stats.totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FaDollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">USD</p>
              <p className="text-lg font-bold text-gray-900">${stats.totalAmountUSD.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FaEuroSign className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">EUR</p>
              <p className="text-lg font-bold text-gray-900">€{stats.totalAmountEUR.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-50 rounded-lg">
              <FaCalendarAlt className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Este Mes</p>
              <p className="text-xl font-bold text-gray-900">{stats.thisMonth}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-teal-50 rounded-lg">
              <FaThumbsUp className="w-5 h-5 text-teal-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Aceptados</p>
              <p className="text-xl font-bold text-gray-900">{stats.accepted}</p>
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
              placeholder="Buscar por número, cliente, email o notas..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="sent">Enviado</option>
              <option value="accepted">Aceptado</option>
              <option value="rejected">Rechazado</option>
              <option value="expired">Expirado</option>
              <option value="converted">Convertido</option>
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
                <option value="createdAt">Fecha de Creación</option>
                <option value="finalAmount">Monto</option>
                <option value="client">Cliente</option>
                <option value="budgetNumber">Número</option>
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
      {selectedBudgets.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900">
                {selectedBudgets.length} presupuestos seleccionados
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

      {/* Lista de presupuestos */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedBudgets.length === filteredBudgets.length && filteredBudgets.length > 0}
                      onChange={selectedBudgets.length === filteredBudgets.length ? clearSelection : selectAllBudgets}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Presupuesto / Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Importe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Válido hasta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBudgets.map((budget, index) => (
                  <tr key={budget._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedBudgets.includes(budget._id)}
                        onChange={() => toggleBudgetSelection(budget._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <FaFileInvoice className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            #{budget.budgetNumber || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {budget.client?.name || budget.client?.email || 'Cliente no disponible'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {budget.createdAt ? moment(budget.createdAt).format('DD/MM/YYYY') : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {budget.currency || 'PYG'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {budget.currency === 'USD' && '$'}
                        {budget.currency === 'EUR' && '€'}
                        {budget.currency === 'PYG' && '₲'}
                        {(budget.finalAmount || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {budget.currency !== 'PYG' && `₲${((budget.finalAmount || 0) * (budget.exchangeRate || 7300)).toLocaleString()}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(budget.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(budget.status)}`}>
                          {getStatusLabel(budget.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {budget.validUntil ? moment(budget.validUntil).format('DD/MM/YYYY') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => downloadPDF(budget._id, budget.budgetNumber)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Descargar PDF"
                        >
                          <FaFileDownload className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/panel-admin/presupuestos/${budget._id}`}
                          className="text-green-600 hover:text-green-900"
                          title="Ver detalles"
                        >
                          <FaEye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteBudget(budget._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <FaTrashAlt className="w-4 h-4" />
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
          {filteredBudgets.map((budget, index) => (
            <div key={budget._id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    #{budget.budgetNumber || 'N/A'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {budget.client?.name || budget.client?.email || 'Cliente no disponible'}
                  </p>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(budget.status)}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Fecha:</span>
                  <span className="text-sm text-gray-900">
                    {budget.createdAt ? moment(budget.createdAt).format('DD/MM/YYYY') : 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Importe:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {budget.currency === 'USD' && '$'}
                    {budget.currency === 'EUR' && '€'}
                    {budget.currency === 'PYG' && '₲'}
                    {(budget.finalAmount || 0).toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Estado:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(budget.status)}`}>
                    {getStatusLabel(budget.status)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Válido hasta:</span>
                  <span className="text-sm text-gray-900">
                    {budget.validUntil ? moment(budget.validUntil).format('DD/MM/YYYY') : 'N/A'}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 flex space-x-2">
                <button 
                  onClick={() => downloadPDF(budget._id, budget.budgetNumber)}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <FaFileDownload className="w-3 h-3 mr-1" />
                  PDF
                </button>
                <Link
                  to={`/panel-admin/presupuestos/${budget._id}`}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <FaEye className="w-3 h-3 mr-1" />
                  Ver
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredBudgets.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <FaFileInvoice className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron presupuestos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros para ver más resultados.
          </p>
          </div>
        )}

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Cargando presupuestos...</p>
      </div>
      )}
    </div>
  );
};

export default BudgetsList;