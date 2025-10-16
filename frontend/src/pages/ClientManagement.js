// frontend/src/pages/ClientManagement.js - MEJORADO CON VINCULACIÓN A VENTAS Y ANÁLISIS AVANZADO
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import { 
  IoMdAdd, 
  IoMdClose, 
  IoIosArrowBack 
} from 'react-icons/io';
import { 
  FaEdit, 
  FaTrash, 
  FaSearch, 
  FaUser, 
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaBuilding,
  FaFileInvoice,
  FaShoppingCart,
  FaMoneyBillWave,
  FaChartLine,
  FaCalendarAlt,
  FaFilter,
  FaDownload,
  FaFileExcel,
  FaPlus,
  FaEye,
  FaExpand,
  FaCompress,
  FaSyncAlt,
  FaTimes as FaClose,
  FaUsers,
  FaUserCheck,
  FaUserClock,
  FaCreditCard,
  FaStore
} from 'react-icons/fa';
import displayPYGCurrency from '../helpers/displayCurrency';
import * as XLSX from 'xlsx';
import moment from 'moment';

const ClientManagement = () => {
  // Estados principales
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Filtros mejorados
  const [filters, setFilters] = useState({
    search: '',
    company: '',
    hasSales: '',
    hasBudgets: '',
    startDate: '',
    endDate: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' o 'card'
  const [selectedClients, setSelectedClients] = useState([]);
  
  // Estado del formulario de cliente
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    taxId: '',
    clientType: 'individual', // 'individual' o 'business'
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'Paraguay'
    },
    businessInfo: {
      industry: '',
      size: '',
      website: '',
      contactPerson: '',
      position: ''
    },
    preferences: {
      currency: 'PYG',
      paymentTerms: '30 días',
      preferredContact: 'email',
      language: 'es'
    },
    notes: '',
    tags: []
  });

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    totalSales: 0,
    totalSalesAmount: 0,
    totalBudgets: 0,
    totalBudgetsAmount: 0,
    individual: 0,
    business: 0,
    thisMonth: 0,
    thisMonthSales: 0
  });
  
  const navigate = useNavigate();
  const { clientId } = useParams();
  
  // Cargar datos al iniciar el componente
  useEffect(() => {
    fetchClients();
    fetchSales();
    fetchBudgets();
  }, []);
  
  useEffect(() => {
    applyFiltersAndSort();
  }, [filters, clients]);
  
  // Si hay un clientId en la URL, mostrar detalles de ese cliente
  useEffect(() => {
    if (clientId) {
      const client = clients.find(c => c._id === clientId);
      if (client) {
        setSelectedClient(client);
        setShowClientDetails(true);
      }
    }
  }, [clientId, clients]);
  
  // Función para obtener todos los clientes
  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(SummaryApi.getAllClients.url, {
        method: SummaryApi.getAllClients.method,
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setClients(result.data || []);
        calculateStats(result.data || []);
      } else {
        toast.error(result.message || "Error al cargar los clientes");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas`, {
        method: 'GET',
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setSales(result.data.sales || []);
      }
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    }
  };

  const fetchBudgets = async () => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos`, {
        method: 'GET',
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setBudgets(result.data.budgets || []);
      }
    } catch (error) {
      console.error("Error al cargar presupuestos:", error);
    }
  };

  const calculateStats = (clientsData) => {
    const now = moment();
    const startOfMonth = moment().startOf('month');
    
    const total = clientsData.length;
    const individual = clientsData.filter(c => c.clientType === 'individual').length;
    const business = clientsData.filter(c => c.clientType === 'business').length;
    
    // Calcular estadísticas de ventas por cliente
    const clientSales = {};
    sales.forEach(sale => {
      if (sale.clientId && !clientSales[sale.clientId]) {
        clientSales[sale.clientId] = { count: 0, amount: 0 };
      }
      if (sale.clientId) {
        clientSales[sale.clientId].count += 1;
        clientSales[sale.clientId].amount += sale.totalAmount || 0;
      }
    });

    const totalSales = Object.keys(clientSales).length;
    const totalSalesAmount = Object.values(clientSales).reduce((sum, c) => sum + c.amount, 0);

    // Calcular estadísticas de presupuestos por cliente
    const clientBudgets = {};
    budgets.forEach(budget => {
      if (budget.clientId && !clientBudgets[budget.clientId]) {
        clientBudgets[budget.clientId] = { count: 0, amount: 0 };
      }
      if (budget.clientId) {
        clientBudgets[budget.clientId].count += 1;
        clientBudgets[budget.clientId].amount += budget.finalAmount || 0;
      }
    });

    const totalBudgets = Object.keys(clientBudgets).length;
    const totalBudgetsAmount = Object.values(clientBudgets).reduce((sum, c) => sum + c.amount, 0);
    
    const thisMonthClients = clientsData.filter(c => 
      moment(c.createdAt).isSameOrAfter(startOfMonth)
    );
    const thisMonth = thisMonthClients.length;
    const thisMonthSales = thisMonthClients.filter(c => clientSales[c._id]).length;

    setStats({
      total,
      totalSales,
      totalSalesAmount,
      totalBudgets,
      totalBudgetsAmount,
      individual,
      business,
      thisMonth,
      thisMonthSales
    });
  };

  const applyFiltersAndSort = () => {
    let result = [...clients];

    // Filtro de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(client => 
        (client.name?.toLowerCase() || '').includes(searchLower) ||
        (client.email?.toLowerCase() || '').includes(searchLower) ||
        (client.phone?.toLowerCase() || '').includes(searchLower) ||
        (client.company?.toLowerCase() || '').includes(searchLower) ||
        (client.taxId?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Otros filtros
    if (filters.company) {
      result = result.filter(client => client.company?.toLowerCase().includes(filters.company.toLowerCase()));
    }

    if (filters.hasSales === 'yes') {
      const clientIdsWithSales = [...new Set(sales.map(s => s.clientId))];
      result = result.filter(client => clientIdsWithSales.includes(client._id));
    } else if (filters.hasSales === 'no') {
      const clientIdsWithSales = [...new Set(sales.map(s => s.clientId))];
      result = result.filter(client => !clientIdsWithSales.includes(client._id));
    }

    if (filters.hasBudgets === 'yes') {
      const clientIdsWithBudgets = [...new Set(budgets.map(b => b.clientId))];
      result = result.filter(client => clientIdsWithBudgets.includes(client._id));
    } else if (filters.hasBudgets === 'no') {
      const clientIdsWithBudgets = [...new Set(budgets.map(b => b.clientId))];
      result = result.filter(client => !clientIdsWithBudgets.includes(client._id));
    }

    if (filters.startDate) {
      result = result.filter(client => 
        moment(client.createdAt).isSameOrAfter(filters.startDate)
      );
    }
    if (filters.endDate) {
      result = result.filter(client => 
        moment(client.createdAt).isSameOrBefore(filters.endDate)
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
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'company':
          aValue = a.company || '';
          bValue = b.company || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
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

    setFilteredClients(result);
  };
  
  // Función para abrir el formulario para un nuevo cliente
  const handleNewClient = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      taxId: '',
      clientType: 'individual',
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'Paraguay'
      },
      businessInfo: {
        industry: '',
        size: '',
        website: '',
        contactPerson: '',
        position: ''
      },
      preferences: {
        currency: 'PYG',
        paymentTerms: '30 días',
        preferredContact: 'email',
        language: 'es'
      },
      notes: '',
      tags: []
    });
    setIsEditMode(false);
    setShowNewClientForm(true);
    setShowClientDetails(false);
  };
  
  // Función para abrir el formulario en modo de edición
  const handleEditClient = (client) => {
    setFormData({
      _id: client._id,
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      taxId: client.taxId || '',
      clientType: client.clientType || 'individual',
      address: {
        street: client.address?.street || '',
        city: client.address?.city || '',
        state: client.address?.state || '',
        zip: client.address?.zip || '',
        country: client.address?.country || 'Paraguay'
      },
      businessInfo: {
        industry: client.businessInfo?.industry || '',
        size: client.businessInfo?.size || '',
        website: client.businessInfo?.website || '',
        contactPerson: client.businessInfo?.contactPerson || '',
        position: client.businessInfo?.position || ''
      },
      preferences: {
        currency: client.preferences?.currency || 'PYG',
        paymentTerms: client.preferences?.paymentTerms || '30 días',
        preferredContact: client.preferences?.preferredContact || 'email',
        language: client.preferences?.language || 'es'
      },
      notes: client.notes || '',
      tags: client.tags || []
    });
    setIsEditMode(true);
    setShowNewClientForm(true);
    setShowClientDetails(false);
  };
  
  // Función para ver detalles de un cliente
  const handleViewClientDetails = (client) => {
    setSelectedClient(client);
    setShowClientDetails(true);
    setShowNewClientForm(false);
    
    // Actualizar la URL sin recargar la página
    navigate(`/panel-admin/clientes/${client._id}`, { replace: true });
  };
  
  // Función para eliminar un cliente
  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este cliente? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/clientes/${clientId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success("Cliente eliminado correctamente");
        fetchClients();
        setShowClientDetails(false);
        navigate("/panel-admin/clientes", { replace: true });
      } else {
        toast.error(result.message || "Error al eliminar el cliente");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };
  
  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Manejar campos anidados
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      company: '',
      hasSales: '',
      hasBudgets: '',
      startDate: '',
      endDate: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };
  
  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Determinar si es crear o actualizar
      const url = isEditMode 
        ? `${SummaryApi.baseURL}/api/finanzas/clientes/${formData._id}`
        : SummaryApi.createClient.url;
      
      const method = isEditMode ? 'PUT' : SummaryApi.createClient.method;
      
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(isEditMode ? "Cliente actualizado correctamente" : "Cliente creado correctamente");
        fetchClients();
        setShowNewClientForm(false);
        
        // Si estamos editando, actualizar vista de detalles
        if (isEditMode && result.data) {
          setSelectedClient(result.data);
          setShowClientDetails(true);
        }
      } else {
        toast.error(result.message || `Error al ${isEditMode ? 'actualizar' : 'crear'} el cliente`);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportToExcel = () => {
    const excelData = filteredClients.map(client => {
      const clientSales = sales.filter(s => s.clientId === client._id);
      const clientBudgets = budgets.filter(b => b.clientId === client._id);
      const totalSalesAmount = clientSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const totalBudgetsAmount = clientBudgets.reduce((sum, b) => sum + (b.finalAmount || 0), 0);

      return {
        'Nombre': client.name || '',
        'Email': client.email || '',
        'Teléfono': client.phone || '',
        'Empresa': client.company || '',
        'RUC/NIT': client.taxId || '',
        'Tipo': client.clientType === 'business' ? 'Empresa' : 'Individual',
        'Industria': client.businessInfo?.industry || '',
        'Ciudad': client.address?.city || '',
        'País': client.address?.country || '',
        'Fecha de Registro': client.createdAt ? moment(client.createdAt).format('DD/MM/YYYY') : '',
        'Total Ventas': clientSales.length,
        'Monto Ventas (₲)': totalSalesAmount,
        'Total Presupuestos': clientBudgets.length,
        'Monto Presupuestos (₲)': totalBudgetsAmount,
        'Moneda Preferida': client.preferences?.currency || 'PYG',
        'Términos de Pago': client.preferences?.paymentTerms || '',
        'Contacto Preferido': client.preferences?.preferredContact || '',
        'Notas': client.notes || ''
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws['!cols'] = [
      { wch: 25 }, // Nombre
      { wch: 30 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 25 }, // Empresa
      { wch: 15 }, // RUC/NIT
      { wch: 12 }, // Tipo
      { wch: 20 }, // Industria
      { wch: 15 }, // Ciudad
      { wch: 12 }, // País
      { wch: 15 }, // Fecha de Registro
      { wch: 12 }, // Total Ventas
      { wch: 15 }, // Monto Ventas
      { wch: 15 }, // Total Presupuestos
      { wch: 18 }, // Monto Presupuestos
      { wch: 12 }, // Moneda Preferida
      { wch: 15 }, // Términos de Pago
      { wch: 15 }, // Contacto Preferido
      { wch: 30 }  // Notas
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, `Clientes_${new Date().toLocaleDateString()}.xlsx`);
    toast.success("Clientes exportados a Excel");
  };

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    setSelectedClients(filteredClients.map(c => c._id));
  };

  const clearSelection = () => {
    setSelectedClients([]);
  };

  const getClientSales = (clientId) => {
    return sales.filter(s => s.clientId === clientId);
  };

  const getClientBudgets = (clientId) => {
    return budgets.filter(b => b.clientId === clientId);
  };

  const getClientTotalSales = (clientId) => {
    const clientSales = getClientSales(clientId);
    return clientSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  };

  const getClientTotalBudgets = (clientId) => {
    const clientBudgets = getClientBudgets(clientId);
    return clientBudgets.reduce((sum, b) => sum + (b.finalAmount || 0), 0);
  };

  const getFilterDescription = () => {
    let description = `Mostrando ${filteredClients.length} de ${clients.length} clientes`;
    
    if (filters.company) {
      description += ` • Empresa: "${filters.company}"`
    }
    
    if (filters.hasSales === 'yes') {
      description += ` • Con ventas`
    } else if (filters.hasSales === 'no') {
      description += ` • Sin ventas`
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
              <FaUsers className="mr-3 text-blue-600" />
              Gestión de Clientes
            </h1>
            <p className="text-gray-600 mt-1">
              Administra clientes con vinculación completa a ventas y presupuestos
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
              onClick={fetchClients}
              className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FaSyncAlt className="w-4 h-4 mr-2" />
              Actualizar
            </button>
            
            <button
              onClick={handleNewClient}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Nuevo Cliente
            </button>
          </div>
        </div>
          </div>
          
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FaUsers className="w-5 h-5 text-blue-600" />
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
              <FaUserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Individuales</p>
              <p className="text-xl font-bold text-gray-900">{stats.individual}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FaBuilding className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Empresas</p>
              <p className="text-xl font-bold text-gray-900">{stats.business}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-50 rounded-lg">
              <FaShoppingCart className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Con Ventas</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-teal-50 rounded-lg">
              <FaMoneyBillWave className="w-5 h-5 text-teal-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Ventas (₲)</p>
              <p className="text-lg font-bold text-gray-900">{displayPYGCurrency(stats.totalSalesAmount)}</p>
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
              placeholder="Buscar por nombre, email, teléfono, empresa o RUC..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
              <input
                type="text"
                name="company"
                value={filters.company}
                onChange={handleFilterChange}
                placeholder="Filtrar por empresa..."
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiene Ventas</label>
              <select
                name="hasSales"
                value={filters.hasSales}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="yes">Con ventas</option>
                <option value="no">Sin ventas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiene Presupuestos</label>
              <select
                name="hasBudgets"
                value={filters.hasBudgets}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="yes">Con presupuestos</option>
                <option value="no">Sin presupuestos</option>
              </select>
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
                <option value="createdAt">Fecha de Registro</option>
                <option value="name">Nombre</option>
                <option value="company">Empresa</option>
                <option value="email">Email</option>
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
      {selectedClients.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900">
                {selectedClients.length} clientes seleccionados
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

      {/* Lista de clientes */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                      onChange={selectedClients.length === filteredClients.length ? clearSelection : selectAllClients}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ventas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Presupuestos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                  </tr>
                </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client, index) => (
                  <tr key={client._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedClients.includes(client._id)}
                        onChange={() => toggleClientSelection(client._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            {client.clientType === 'business' ? 
                              <FaBuilding className="h-5 w-5 text-blue-600" /> : 
                              <FaUser className="h-5 w-5 text-blue-600" />
                            }
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {client.name || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.company || client.clientType === 'business' ? 'Empresa' : 'Individual'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.email || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{client.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getClientSales(client._id).length} ventas
                      </div>
                      <div className="text-sm text-gray-500">
                        {displayPYGCurrency(getClientTotalSales(client._id))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getClientBudgets(client._id).length} presupuestos
                      </div>
                      <div className="text-sm text-gray-500">
                        {displayPYGCurrency(getClientTotalBudgets(client._id))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.createdAt ? moment(client.createdAt).format('DD/MM/YYYY') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewClientDetails(client)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClient(client)}
                          className="text-green-600 hover:text-green-900"
                          title="Editar"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client._id)}
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
          {filteredClients.map((client, index) => (
            <div key={client._id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    {client.clientType === 'business' ? 
                      <FaBuilding className="h-6 w-6 text-blue-600" /> : 
                      <FaUser className="h-6 w-6 text-blue-600" />
                    }
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {client.name || 'Sin nombre'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {client.company || client.clientType === 'business' ? 'Empresa' : 'Individual'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <FaEnvelope className="w-4 h-4 mr-2" />
                  {client.email || 'N/A'}
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <FaPhone className="w-4 h-4 mr-2" />
                  {client.phone || 'N/A'}
                </div>

                {client.address?.city && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FaMapMarkerAlt className="w-4 h-4 mr-2" />
                    {client.address.city}, {client.address.country}
            </div>
          )}
                
                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {getClientSales(client._id).length} ventas
                    </div>
                    <div className="text-xs text-gray-500">
                      {displayPYGCurrency(getClientTotalSales(client._id))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {getClientBudgets(client._id).length} presupuestos
                    </div>
                    <div className="text-xs text-gray-500">
                      {displayPYGCurrency(getClientTotalBudgets(client._id))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex space-x-2">
                <button 
                  onClick={() => handleViewClientDetails(client)}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <FaEye className="w-3 h-3 mr-1" />
                  Ver
                </button>
                <button 
                  onClick={() => handleEditClient(client)}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <FaEdit className="w-3 h-3 mr-1" />
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredClients.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <FaUsers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron clientes</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros para ver más resultados.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Cargando clientes...</p>
        </div>
      )}
      
      {/* Formulario para crear/editar cliente */}
      {showNewClientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                setShowNewClientForm(false);
                if (selectedClient) {
                  setShowClientDetails(true);
                }
              }}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <IoIosArrowBack className="mr-1" /> 
              Volver
            </button>
            
            <h2 className="text-2xl font-bold">
              {isEditMode ? "Editar Cliente" : "Crear Nuevo Cliente"}
            </h2>
            
                <div></div>
          </div>
          
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de cliente */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Tipo de Cliente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="radio"
                        name="clientType"
                        value="individual"
                        checked={formData.clientType === 'individual'}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">Individual</div>
                        <div className="text-sm text-gray-500">Persona física</div>
                      </div>
                    </label>
                    <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="radio"
                        name="clientType"
                        value="business"
                        checked={formData.clientType === 'business'}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">Empresa</div>
                        <div className="text-sm text-gray-500">Persona jurídica</div>
                      </div>
                    </label>
                  </div>
                </div>

              {/* Información básica */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Información Básica</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">
                        RUC/NIT
                </label>
                <input
                  type="text"
                  id="taxId"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                    </div>
              </div>
            </div>
            
                {/* Información comercial (solo para empresas) */}
                {formData.clientType === 'business' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Información Comercial</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                        <label htmlFor="businessInfo.industry" className="block text-sm font-medium text-gray-700 mb-1">
                          Industria
                        </label>
                        <input
                          type="text"
                          id="businessInfo.industry"
                          name="businessInfo.industry"
                          value={formData.businessInfo.industry}
                          onChange={handleChange}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="businessInfo.size" className="block text-sm font-medium text-gray-700 mb-1">
                          Tamaño de empresa
                        </label>
                        <select
                          id="businessInfo.size"
                          name="businessInfo.size"
                          value={formData.businessInfo.size}
                          onChange={handleChange}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="micro">Micro (1-10 empleados)</option>
                          <option value="pequeña">Pequeña (11-50 empleados)</option>
                          <option value="mediana">Mediana (51-200 empleados)</option>
                          <option value="grande">Grande (200+ empleados)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="businessInfo.website" className="block text-sm font-medium text-gray-700 mb-1">
                          Sitio Web
                        </label>
                        <input
                          type="url"
                          id="businessInfo.website"
                          name="businessInfo.website"
                          value={formData.businessInfo.website}
                          onChange={handleChange}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="businessInfo.contactPerson" className="block text-sm font-medium text-gray-700 mb-1">
                          Persona de Contacto
                        </label>
                        <input
                          type="text"
                          id="businessInfo.contactPerson"
                          name="businessInfo.contactPerson"
                          value={formData.businessInfo.contactPerson}
                          onChange={handleChange}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="businessInfo.position" className="block text-sm font-medium text-gray-700 mb-1">
                          Cargo
                        </label>
                        <input
                          type="text"
                          id="businessInfo.position"
                          name="businessInfo.position"
                          value={formData.businessInfo.position}
                          onChange={handleChange}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferencias */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Preferencias</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="preferences.currency" className="block text-sm font-medium text-gray-700 mb-1">
                        Moneda Preferida
                      </label>
                      <select
                        id="preferences.currency"
                        name="preferences.currency"
                        value={formData.preferences.currency}
                        onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="PYG">Guaraní (₲)</option>
                        <option value="USD">Dólar ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="preferences.paymentTerms" className="block text-sm font-medium text-gray-700 mb-1">
                        Términos de Pago
                      </label>
                      <select
                        id="preferences.paymentTerms"
                        name="preferences.paymentTerms"
                        value={formData.preferences.paymentTerms}
                        onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Pago inmediato">Pago inmediato</option>
                        <option value="15 días">15 días</option>
                        <option value="30 días">30 días</option>
                        <option value="45 días">45 días</option>
                        <option value="60 días">60 días</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="preferences.preferredContact" className="block text-sm font-medium text-gray-700 mb-1">
                        Contacto Preferido
                      </label>
                      <select
                        id="preferences.preferredContact"
                        name="preferences.preferredContact"
                        value={formData.preferences.preferredContact}
                        onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="email">Email</option>
                        <option value="phone">Teléfono</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="preferences.language" className="block text-sm font-medium text-gray-700 mb-1">
                        Idioma
                      </label>
                      <select
                        id="preferences.language"
                        name="preferences.language"
                        value={formData.preferences.language}
                        onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Dirección */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Dirección</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                <label htmlFor="address.street" className="block text-sm font-medium text-gray-700 mb-1">
                  Calle y número
                </label>
                <input
                  type="text"
                  id="address.street"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="address.city" className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  id="address.city"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="address.state" className="block text-sm font-medium text-gray-700 mb-1">
                  Provincia/Estado
                </label>
                <input
                  type="text"
                  id="address.state"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="address.zip" className="block text-sm font-medium text-gray-700 mb-1">
                  Código postal
                </label>
                <input
                  type="text"
                  id="address.zip"
                  name="address.zip"
                  value={formData.address.zip}
                  onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="address.country" className="block text-sm font-medium text-gray-700 mb-1">
                  País
                </label>
                <input
                  type="text"
                  id="address.country"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                    </div>
              </div>
            </div>
            
            {/* Notas */}
                <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notas adicionales
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              ></textarea>
            </div>
            
            {/* Botones de acción */}
                <div className="flex justify-end mt-6 space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewClientForm(false);
                  if (selectedClient && isEditMode) {
                    setShowClientDetails(true);
                  }
                }}
                    className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEditMode ? "Actualizando..." : "Creando..."}
                  </>
                ) : (
                  isEditMode ? "Actualizar Cliente" : "Crear Cliente"
                )}
              </button>
            </div>
          </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Vista de detalles del cliente */}
      {showClientDetails && selectedClient && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                setShowClientDetails(false);
                navigate("/panel-admin/clientes", { replace: true });
              }}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <IoIosArrowBack className="mr-1" /> 
              Volver a la lista
            </button>
            
            <h2 className="text-2xl font-bold flex items-center">
              {selectedClient.clientType === 'business' ? 
                <FaBuilding className="mr-2 text-blue-600" /> : 
                <FaUser className="mr-2 text-blue-600" />
              }
              {selectedClient.name || 'Cliente'}
            </h2>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditClient(selectedClient)}
                className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 flex items-center"
              >
                <FaEdit className="mr-1" /> Editar
              </button>
              <button
                onClick={() => handleDeleteClient(selectedClient._id)}
                className="bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 flex items-center"
              >
                <FaTrash className="mr-1" /> Eliminar
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Información básica */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700">Información Personal</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Nombre</h4>
                  <p className="text-gray-800 font-medium">{selectedClient.name || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Empresa</h4>
                  <p className="text-gray-800">{selectedClient.company || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Email</h4>
                  <p className="text-gray-800">{selectedClient.email || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Teléfono</h4>
                  <p className="text-gray-800">{selectedClient.phone || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">RUC/NIT</h4>
                  <p className="text-gray-800">{selectedClient.taxId || "-"}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Tipo</h4>
                  <p className="text-gray-800">
                    {selectedClient.clientType === 'business' ? 'Empresa' : 'Individual'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Dirección */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700 flex items-center">
                <FaMapMarkerAlt className="mr-2" />
                Dirección
              </h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Calle y número</h4>
                  <p className="text-gray-800">{selectedClient.address?.street || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Ciudad</h4>
                  <p className="text-gray-800">{selectedClient.address?.city || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Provincia/Estado</h4>
                  <p className="text-gray-800">{selectedClient.address?.state || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Código postal</h4>
                  <p className="text-gray-800">{selectedClient.address?.zip || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">País</h4>
                  <p className="text-gray-800">{selectedClient.address?.country || "Paraguay"}</p>
                </div>
              </div>
            </div>

            {/* Preferencias */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700">Preferencias</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Moneda</h4>
                  <p className="text-gray-800">{selectedClient.preferences?.currency || "PYG"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Términos de pago</h4>
                  <p className="text-gray-800">{selectedClient.preferences?.paymentTerms || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Contacto preferido</h4>
                  <p className="text-gray-800">{selectedClient.preferences?.preferredContact || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Idioma</h4>
                  <p className="text-gray-800">{selectedClient.preferences?.language === 'es' ? 'Español' : selectedClient.preferences?.language || 'Español'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Estadísticas de ventas y presupuestos */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-5 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold mb-4 text-green-700 flex items-center">
                <FaShoppingCart className="mr-2" />
                Ventas
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-green-600">Total de ventas:</span>
                  <span className="font-semibold text-green-800">{getClientSales(selectedClient._id).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-600">Monto total:</span>
                  <span className="font-semibold text-green-800">{displayPYGCurrency(getClientTotalSales(selectedClient._id))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-600">Última venta:</span>
                  <span className="font-semibold text-green-800">
                    {getClientSales(selectedClient._id).length > 0 ? 
                      moment(getClientSales(selectedClient._id)[0]?.saleDate).format('DD/MM/YYYY') : 
                      'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold mb-4 text-blue-700 flex items-center">
                <FaFileInvoice className="mr-2" />
                Presupuestos
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">Total de presupuestos:</span>
                  <span className="font-semibold text-blue-800">{getClientBudgets(selectedClient._id).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">Monto total:</span>
                  <span className="font-semibold text-blue-800">{displayPYGCurrency(getClientTotalBudgets(selectedClient._id))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">Último presupuesto:</span>
                  <span className="font-semibold text-blue-800">
                    {getClientBudgets(selectedClient._id).length > 0 ? 
                      moment(getClientBudgets(selectedClient._id)[0]?.createdAt).format('DD/MM/YYYY') : 
                      'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Notas */}
          {selectedClient.notes && (
          <div className="mt-6 bg-gray-50 p-5 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700">Notas adicionales</h3>
            <p className="text-gray-800 whitespace-pre-line">
                {selectedClient.notes}
            </p>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientManagement;