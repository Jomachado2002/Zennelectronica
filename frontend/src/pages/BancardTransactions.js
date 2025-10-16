// frontend/src/pages/BancardTransactions.js - MEJORADO CON INTERFAZ OPTIMIZADA
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { deliveryStatuses, calculateProgress } from '../helpers/deliveryHelpers';
import { getTransactionDisplayStatus, getStatusBadgeClass, getStatusIcon, getStatusTitle, canManageDelivery, canRollback } from '../helpers/transactionStatusHelper';
import StatusBadge, { StatusWithProgress } from '../components/common/StatusBadge';
import { AdminOrderActions } from '../components/order/OrderActionButtons';
import OrderSearchAndFilters from '../components/order/OrderSearchAndFilters';

import { 
    FaCreditCard, 
    FaUndo, 
    FaExclamationTriangle, 
    FaCheckCircle, 
    FaTimesCircle, 
    FaClock,
    FaSyncAlt,
    FaFileInvoiceDollar,
    FaTruck,
    FaSearch,
    FaFilter,
    FaDownload,
    FaEye,
    FaChartLine,
    FaMoneyBillWave,
    FaUsers,
    FaCalendarAlt,
    FaSort,
    FaTimes,
    FaCheck,
    FaExclamationCircle,
    FaInfoCircle,
    FaFileExcel,
    FaPrint,
    FaExpand,
    FaCompress,
    FaArrowUp,
    FaArrowDown
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import DeliveryManagement from '../components/admin/DeliveryManagement';
import TransactionDetailsModal from '../components/admin/TransactionDetailsModal';
import * as XLSX from 'xlsx';
import displayPYGCurrency from '../helpers/displayCurrency';

const BancardTransactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showRollbackModal, setShowRollbackModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [selectedDeliveryTransaction, setSelectedDeliveryTransaction] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedDetailsTransaction, setSelectedDetailsTransaction] = useState(null);
    const [rollbackReason, setRollbackReason] = useState('');
    
    // Filtros mejorados
    const [filters, setFilters] = useState({
        status: '',
        delivery_status: '',
        startDate: '',
        endDate: '',
        search: '',
        amountRange: { min: '', max: '' },
        paymentMethod: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // 'table' o 'card'
    const [selectedTransactions, setSelectedTransactions] = useState([]);
    
    const [showProductModal, setShowProductModal] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 25,
        total: 0,
        pages: 0
    });

    // Estadísticas
    const [stats, setStats] = useState({
        total: 0,
        successful: 0,
        pending: 0,
        failed: 0,
        totalAmount: 0,
        averageAmount: 0,
        todayCount: 0,
        todayAmount: 0
    });

    const fetchTransactions = useCallback(async () => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value && key !== 'amountRange' && key !== 'sortBy' && key !== 'sortOrder') {
                    queryParams.append(key, value);
                }
            });
            
            // Agregar filtros de rango de monto
            if (filters.amountRange.min) {
                queryParams.append('amount_min', filters.amountRange.min);
            }
            if (filters.amountRange.max) {
                queryParams.append('amount_max', filters.amountRange.max);
            }
            
            queryParams.append('page', pagination.page);
            queryParams.append('limit', pagination.limit);
            queryParams.append('sortBy', filters.sortBy);
            queryParams.append('sortOrder', filters.sortOrder);

            const response = await fetch(`${SummaryApi.baseURL}/api/bancard/transactions?${queryParams.toString()}`, {
                method: 'GET',
                credentials: 'include'
            });

            const result = await response.json();
            if (result.success) {
                const transactionsData = result.data.transactions || [];
                setTransactions(transactionsData);
                setFilteredTransactions(transactionsData);
                setPagination(prev => ({
                    ...prev,
                    total: result.data.pagination.total,
                    pages: result.data.pagination.pages
                }));
                
                // Calcular estadísticas
                calculateStats(transactionsData);
            } else {
                toast.error(result.message || "Error al cargar las transacciones");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error de conexión");
        } finally {
            setIsLoading(false);
        }
    }, [filters, pagination.page, pagination.limit]);

    const calculateStats = (transactions) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const total = transactions.length;
        const successful = transactions.filter(t => t.status === 'successful').length;
        const pending = transactions.filter(t => t.status === 'pending').length;
        const failed = transactions.filter(t => t.status === 'failed').length;
        
        const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const averageAmount = total > 0 ? totalAmount / total : 0;
        
        const todayTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.createdAt);
            return transactionDate >= today;
        });
        
        const todayCount = todayTransactions.length;
        const todayAmount = todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        setStats({
            total,
            successful,
            pending,
            failed,
            totalAmount,
            averageAmount,
            todayCount,
            todayAmount
        });
    };

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

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
            status: '',
            delivery_status: '',
            startDate: '',
            endDate: '',
            search: '',
            amountRange: { min: '', max: '' },
            paymentMethod: '',
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });
    };

    const exportToExcel = () => {
        const excelData = filteredTransactions.map(transaction => ({
            'ID': transaction.id || '',
            'Usuario': transaction.user?.name || transaction.user?.email || 'N/A',
            'Monto': transaction.amount || 0,
            'Moneda': transaction.currency || 'PYG',
            'Estado': transaction.status || '',
            'Estado de Envío': transaction.delivery_status || 'N/A',
            'Método de Pago': transaction.payment_method || 'N/A',
            'Fecha': transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : '',
            'Hora': transaction.createdAt ? new Date(transaction.createdAt).toLocaleTimeString() : '',
            'Descripción': transaction.description || '',
            'IP': transaction.customer_ip || '',
            'País': transaction.card_country || '',
            'Número de Ticket': transaction.ticket_number || '',
            'Número de Autorización': transaction.authorization_number || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Ajustar anchos de columna
        ws['!cols'] = [
            { wch: 15 }, // ID
            { wch: 25 }, // Usuario
            { wch: 15 }, // Monto
            { wch: 10 }, // Moneda
            { wch: 15 }, // Estado
            { wch: 20 }, // Estado de Envío
            { wch: 20 }, // Método de Pago
            { wch: 12 }, // Fecha
            { wch: 12 }, // Hora
            { wch: 30 }, // Descripción
            { wch: 15 }, // IP
            { wch: 10 }, // País
            { wch: 20 }, // Número de Ticket
            { wch: 20 }  // Número de Autorización
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Transacciones Bancard');
        XLSX.writeFile(wb, `Transacciones_Bancard_${new Date().toLocaleDateString()}.xlsx`);
        toast.success("Transacciones exportadas a Excel");
    };

    const handleTransactionAction = async (transactionId, action, additionalData = {}) => {
        try {
            let endpoint = '';
            let method = 'POST';
            let body = { transactionId, ...additionalData };

            switch (action) {
                case 'rollback':
                    endpoint = `${SummaryApi.baseURL}/api/bancard/rollback`;
                    break;
                case 'update_delivery':
                    endpoint = `${SummaryApi.baseURL}/api/bancard/update-delivery`;
                    break;
                default:
                    throw new Error('Acción no válida');
            }

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            const result = await response.json();
            
            if (result.success) {
                toast.success(result.message || 'Acción realizada exitosamente');
                fetchTransactions();
                // Cerrar modales
                setShowRollbackModal(false);
                setShowDeliveryModal(false);
                setSelectedTransaction(null);
                setSelectedDeliveryTransaction(null);
            } else {
                toast.error(result.message || 'Error al realizar la acción');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error de conexión');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'successful':
                return <FaCheckCircle className="w-4 h-4 text-green-600" />;
            case 'pending':
                return <FaClock className="w-4 h-4 text-yellow-600" />;
            case 'failed':
                return <FaTimesCircle className="w-4 h-4 text-red-600" />;
            default:
                return <FaExclamationCircle className="w-4 h-4 text-gray-600" />;
        }
    };

    const getStatusColor = (status) => {
    switch (status) {
            case 'successful':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getDeliveryStatusColor = (status) => {
        switch (status) {
            case 'delivered':
                return 'bg-green-100 text-green-800';
            case 'in_transit':
                return 'bg-blue-100 text-blue-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const toggleTransactionSelection = (transactionId) => {
        setSelectedTransactions(prev => 
            prev.includes(transactionId) 
                ? prev.filter(id => id !== transactionId)
                : [...prev, transactionId]
        );
    };

    const selectAllTransactions = () => {
        setSelectedTransactions(filteredTransactions.map(t => t.id));
    };

    const clearSelection = () => {
        setSelectedTransactions([]);
    };

    const getFilterDescription = () => {
        let description = `Mostrando ${filteredTransactions.length} de ${transactions.length} transacciones`;
        
        if (filters.status) {
            description += ` • Estado: "${filters.status}"`
        }
        
        if (filters.search) {
            description += ` • Buscando: "${filters.search}"`
        }

        if (filters.startDate && filters.endDate) {
            description += ` • Período: ${filters.startDate} - ${filters.endDate}`
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
                            <FaCreditCard className="mr-3 text-blue-600" />
                            Transacciones Bancard
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Gestiona y monitorea todas las transacciones de pago
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
                            onClick={fetchTransactions}
                            className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            <FaSyncAlt className="w-4 h-4 mr-2" />
                            Actualizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <FaCreditCard className="w-5 h-5 text-blue-600" />
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
                            <FaCheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Exitosas</p>
                            <p className="text-xl font-bold text-gray-900">{stats.successful}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-2 bg-yellow-50 rounded-lg">
                            <FaClock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Pendientes</p>
                            <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-50 rounded-lg">
                            <FaTimesCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Fallidas</p>
                            <p className="text-xl font-bold text-gray-900">{stats.failed}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <FaMoneyBillWave className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Monto Total</p>
                            <p className="text-lg font-bold text-gray-900">{displayPYGCurrency(stats.totalAmount)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <FaChartLine className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Promedio</p>
                            <p className="text-lg font-bold text-gray-900">{displayPYGCurrency(stats.averageAmount)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-2 bg-teal-50 rounded-lg">
                            <FaCalendarAlt className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Hoy</p>
                            <p className="text-xl font-bold text-gray-900">{stats.todayCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <FaMoneyBillWave className="w-5 h-5 text-indigo-600" />
                </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Hoy (₲)</p>
                            <p className="text-lg font-bold text-gray-900">{displayPYGCurrency(stats.todayAmount)}</p>
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
                            placeholder="Buscar por ID, usuario, ticket o descripción..."
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
                                <option value="successful">Exitosas</option>
                                <option value="pending">Pendientes</option>
                                <option value="failed">Fallidas</option>
                            </select>
        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Envío</label>
                            <select
                                name="delivery_status"
                                value={filters.delivery_status}
                                onChange={handleFilterChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Todos los estados</option>
                                <option value="pending">Pendiente</option>
                                <option value="in_transit">En tránsito</option>
                                <option value="delivered">Entregado</option>
                                <option value="cancelled">Cancelado</option>
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
                                <option value="createdAt">Fecha</option>
                                <option value="amount">Monto</option>
                                <option value="status">Estado</option>
                                <option value="user">Usuario</option>
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
            {selectedTransactions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <span className="text-sm font-medium text-blue-900">
                                {selectedTransactions.length} transacciones seleccionadas
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

            {/* Lista de transacciones */}
            {viewMode === 'table' ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <input
                                            type="checkbox"
                                            checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                                            onChange={selectedTransactions.length === filteredTransactions.length ? clearSelection : selectAllTransactions}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID / Usuario
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Monto
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Envío
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredTransactions.map((transaction, index) => (
                                    <tr key={transaction.id || index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedTransactions.includes(transaction.id)}
                                                onChange={() => toggleTransactionSelection(transaction.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <FaUsers className="h-5 w-5 text-gray-400" />
                                                </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {transaction.id || 'N/A'}
                                            </div>
                                                    <div className="text-sm text-gray-500">
                                                        {transaction.user?.name || transaction.user?.email || 'Usuario no disponible'}
                                            </div>
                                            </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="font-medium">
                                                {displayPYGCurrency(transaction.amount || 0)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {transaction.currency || 'PYG'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {getStatusIcon(transaction.status)}
                                                <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                                                    {transaction.status || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDeliveryStatusColor(transaction.delivery_status)}`}>
                                                {transaction.delivery_status || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>
                                                {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A'}
                                                    </div>
                                            <div className="text-xs">
                                                {transaction.createdAt ? new Date(transaction.createdAt).toLocaleTimeString() : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedDetailsTransaction(transaction);
                                                        setShowDetailsModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Ver detalles"
                                                >
                                                    <FaEye className="w-4 h-4" />
                                                </button>
                                                
                                                {canRollback(transaction) && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTransaction(transaction);
                                                    setShowRollbackModal(true);
                                                }}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Reversar transacción"
                                                    >
                                                        <FaUndo className="w-4 h-4" />
                                                    </button>
                                                )}
                                                
                                                {canManageDelivery(transaction) && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDeliveryTransaction(transaction);
                                                            setShowDeliveryModal(true);
                                                        }}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Gestionar envío"
                                                    >
                                                        <FaTruck className="w-4 h-4" />
                                                    </button>
                                                )}
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
                    {filteredTransactions.map((transaction, index) => (
                        <div key={transaction.id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Transacción #{transaction.id || 'N/A'}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {transaction.user?.name || transaction.user?.email || 'Usuario no disponible'}
                                    </p>
                                </div>
                                <div className="flex items-center">
                                    {getStatusIcon(transaction.status)}
                                </div>
            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Monto:</span>
                                    <span className="text-sm font-bold text-gray-900">
                                        {displayPYGCurrency(transaction.amount || 0)}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Estado:</span>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                                        {transaction.status || 'N/A'}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Envío:</span>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDeliveryStatusColor(transaction.delivery_status)}`}>
                                        {transaction.delivery_status || 'N/A'}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Fecha:</span>
                                    <span className="text-sm text-gray-900">
                                        {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="mt-4 flex space-x-2">
                            <button
                                    onClick={() => {
                                        setSelectedDetailsTransaction(transaction);
                                        setShowDetailsModal(true);
                                    }}
                                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                >
                                    <FaEye className="w-3 h-3 mr-1" />
                                    Ver
                            </button>
                                
                                {canRollback(transaction) && (
                            <button
                                        onClick={() => {
                                            setSelectedTransaction(transaction);
                                            setShowRollbackModal(true);
                                        }}
                                        className="flex-1 flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                                    >
                                        <FaUndo className="w-3 h-3 mr-1" />
                                        Reversar
                            </button>
                                )}
                                
                                {canManageDelivery(transaction) && (
                                    <button
                                        onClick={() => {
                                            setSelectedDeliveryTransaction(transaction);
                                            setShowDeliveryModal(true);
                                        }}
                                        className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                    >
                                        <FaTruck className="w-3 h-3 mr-1" />
                                        Envío
                                    </button>
                                )}
                        </div>
                        </div>
                    ))}
                </div>
            )}

            {filteredTransactions.length === 0 && !isLoading && (
                <div className="text-center py-12">
                    <FaCreditCard className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron transacciones</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Intenta ajustar los filtros para ver más resultados.
                                </p>
                            </div>
            )}

            {isLoading && (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Cargando transacciones...</p>
                </div>
            )}

            {/* Paginación */}
            {pagination.pages > 1 && (
                <div className="mt-6 flex justify-center">
                    <div className="flex space-x-2">
                                    <button
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={pagination.page === 1}
                            className="px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Anterior
                                    </button>
                                    
                        <span className="px-3 py-2 text-gray-600">
                            Página {pagination.page} de {pagination.pages}
                        </span>
                        
                                            <button
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={pagination.page === pagination.pages}
                            className="px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Siguiente
                                    </button>
                    </div>
                </div>
            )}

            {/* Modales */}
            {showRollbackModal && selectedTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-semibold">Reversar Transacción</h2>
                            <button 
                                onClick={() => setShowRollbackModal(false)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">
                                    Transacción: #{selectedTransaction.id}
                                </p>
                                <p className="text-sm text-gray-600 mb-2">
                                    Monto: {displayPYGCurrency(selectedTransaction.amount || 0)}
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Motivo de la reversión
                                </label>
                                <textarea
                                    value={rollbackReason}
                                    onChange={(e) => setRollbackReason(e.target.value)}
                                    rows={3}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Describe el motivo de la reversión..."
                                />
                                </div>
                            </div>

                        <div className="flex justify-end space-x-3 p-6 border-t">
                                <button
                                onClick={() => setShowRollbackModal(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                            >
                                Cancelar
                                </button>
                                <button
                                onClick={() => handleTransactionAction(selectedTransaction.id, 'rollback', { reason: rollbackReason })}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Confirmar Reversión
                                </button>
                        </div>
                    </div>
                </div>
            )}

             {showDeliveryModal && selectedDeliveryTransaction && (
                <DeliveryManagement
                    transaction={selectedDeliveryTransaction}
                    onClose={() => setShowDeliveryModal(false)}
                    onUpdate={() => fetchTransactions()}
                />
            )}

            {showDetailsModal && selectedDetailsTransaction && (
                <TransactionDetailsModal
                    transaction={selectedDetailsTransaction}
                    onClose={() => setShowDetailsModal(false)}
                />
            )}
        </div>
    );
};

export default BancardTransactions;