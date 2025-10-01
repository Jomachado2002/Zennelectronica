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
    FaEye, 
    FaSearch, 
    FaFilter, 
    FaExclamationTriangle, 
    FaCheckCircle, 
    FaTimesCircle, 
    FaClock,
    FaSyncAlt,
    FaFileInvoiceDollar,
    FaTruck 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import DeliveryManagement from '../components/admin/DeliveryManagement';
import TransactionDetailsModal from '../components/admin/TransactionDetailsModal';



const BancardTransactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showRollbackModal, setShowRollbackModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [selectedDeliveryTransaction, setSelectedDeliveryTransaction] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedDetailsTransaction, setSelectedDetailsTransaction] = useState(null);
    const [rollbackReason, setRollbackReason] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        delivery_status: '',
        startDate: '',
        endDate: '',
        search: ''
    });
    const [showProductModal, setShowProductModal] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });

    // ✅ FUNCIÓN PARA FORMATEAR MONEDA PYG
    const displayPYGCurrency = (num) => {
        const formatter = new Intl.NumberFormat('es-PY', {
            style: "currency",
            currency: 'PYG',
            minimumFractionDigits: 0
        });
        return formatter.format(num);
    };

    const fetchTransactions = useCallback(async () => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });
            
            queryParams.append('page', pagination.page);
            queryParams.append('limit', pagination.limit);

            const response = await fetch(`${SummaryApi.baseURL}/api/bancard/transactions?${queryParams.toString()}`, {
                method: 'GET',
                credentials: 'include'
            });

            const result = await response.json();
            if (result.success) {
                setTransactions(result.data.transactions || []);
                setPagination(prev => ({
                    ...prev,
                    total: result.data.pagination.total,
                    pages: result.data.pagination.pages
                }));
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

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const resetFilters = () => {
        setFilters({
            status: '',
            startDate: '',
            endDate: '',
            search: ''
        });
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleRollback = async () => {
        if (!selectedTransaction || !rollbackReason.trim()) {
            toast.error("Debe proporcionar una razón para el rollback");
            return;
        }

        try {
            setIsLoading(true);
            
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/transactions/${selectedTransaction._id}/rollback`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: 'include',
                body: JSON.stringify({ reason: rollbackReason })
            });

            const result = await response.json();
            
            if (result.success) {
                toast.success("✅ Transacción reversada exitosamente");
                setShowRollbackModal(false);
                setSelectedTransaction(null);
                setRollbackReason('');
                fetchTransactions();
            } else {
                if (result.requiresManualReversal) {
                    toast.warn("⚠️ La transacción requiere reversión manual. Contacte a Bancard.");
                } else {
                    toast.error(result.message || "Error al reversar transacción");
                }
            }
        } catch (error) {
            console.error("❌ Error en rollback:", error);
            toast.error("Error de conexión al hacer rollback");
        } finally {
            setIsLoading(false);
        }
    };

    const checkTransactionStatus = async (transaction) => {
        try {
            const response = await fetch(`${SummaryApi.baseURL}/api/bancard/transactions/${transaction._id}/status`, {
                method: 'GET',
                credentials: 'include'
            });

            const result = await response.json();
            if (result.success) {
                toast.success("Estado consultado correctamente");
                console.log("Estado de la transacción:", result.data);
            } else {
                toast.error("Error al consultar estado");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error de conexión");
        }
    };

    const getPaymentStatusIcon = (status) => {
    switch (status) {
        case 'approved': return <FaCheckCircle className="text-green-500" />;
        case 'rejected': return <FaTimesCircle className="text-red-500" />;
        case 'rolled_back': return <FaUndo className="text-orange-500" />;
        case 'pending': return <FaClock className="text-yellow-500" />;
        case 'failed': return <FaExclamationTriangle className="text-red-500" />;
        default: return <FaClock className="text-gray-500" />;
    }
};

    const getStatusLabel = (status) => {
        switch (status) {
            case 'approved': return 'Aprobado';
            case 'rejected': return 'Rechazado';
            case 'rolled_back': return 'Reversado';
            case 'pending': return 'Pendiente';
            case 'failed': return 'Fallido';
            default: return status;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'rolled_back': return 'bg-orange-100 text-orange-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'failed': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const testRollbackForCertification = async () => {
        try {
            console.log("🧪 === INICIANDO PRUEBA DE ROLLBACK PARA CERTIFICACIÓN ===");
            
            const approvedTransaction = transactions.find(t => t.status === 'approved' && !t.is_rolled_back);
            
            if (!approvedTransaction) {
                toast.error("❌ No hay transacciones aprobadas para probar rollback. Haz un pago de prueba primero.");
                return;
            }

            const shopProcessId = approvedTransaction.shop_process_id;
            console.log("🎯 Usando transacción para prueba:", shopProcessId);
            
            const userConfirmed = window.confirm(
                `🔄 PRUEBA DE ROLLBACK PARA CERTIFICACIÓN\n\n` +
                `Se reversará la transacción #${shopProcessId}\n` +
                `Monto: ${displayPYGCurrency(approvedTransaction.amount)}\n\n` +
                `⚠️ Esta es una prueba requerida por Bancard.\n` +
                `¿Continuar con la prueba?`
            );

            if (!userConfirmed) {
                toast.info("Prueba de rollback cancelada");
                return;
            }

            setIsLoading(true);
            toast.info("🔄 Ejecutando prueba de rollback...");

            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/test-rollback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    shop_process_id: shopProcessId
                })
            });

            const result = await response.json();
            
            console.log("📥 Resultado de prueba de rollback:", result);

            if (result.success) {
                toast.success("✅ PRUEBA DE ROLLBACK EXITOSA - Bancard debería marcar como completado");
                console.log("✅ Detalles de la prueba:", result.data);
                
                alert(
                    `✅ PRUEBA DE ROLLBACK COMPLETADA\n\n` +
                    `Shop Process ID: ${result.data.shop_process_id}\n` +
                    `Respuesta Bancard: ${result.data.bancard_response?.status || 'N/A'}\n` +
                    `Transacción local actualizada: ${result.data.local_transaction_updated ? 'Sí' : 'No'}\n\n` +
                    `🎯 Ahora Bancard debería marcar "Recibir rollback" como completado.`
                );
                
                fetchTransactions();
            } else {
                console.warn("⚠️ Respuesta de prueba:", result);
                
                if (result.details?.messages) {
                    const errorKey = result.details.messages[0]?.key;
                    if (errorKey === 'TransactionAlreadyConfirmed') {
                        toast.warn("⚠️ Transacción ya confirmada - Esto es normal. Bancard igual marca como completado.");
                        alert(
                            `⚠️ TRANSACCIÓN YA CONFIRMADA\n\n` +
                            `La transacción ya fue confirmada en Bancard.\n` +
                            `Esto es normal y Bancard igual marcará como completado.\n\n` +
                            `✅ La prueba de rollback se ejecutó correctamente.`
                        );
                    } else {
                        toast.error(`❌ Error: ${result.message || 'Error en prueba de rollback'}`);
                    }
                } else {
                    toast.error(result.message || "❌ Error en prueba de rollback");
                }
            }
            
        } catch (error) {
            console.error("❌ Error en prueba de rollback:", error);
            toast.error("❌ Error de conexión en prueba de rollback");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-100 rounded-xl">
                    <FaCreditCard className="text-blue-600 text-xl" />
                </div>
                Gestión de Transacciones Bancard
            </h1>
            <p className="text-gray-600">
                Panel administrativo para gestionar pagos y entregas
            </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
            <button
                onClick={testRollbackForCertification}
                disabled={isLoading}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 flex items-center disabled:opacity-50 shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                title="Probar rollback para certificación Bancard"
            >
                <FaUndo className="mr-2" />
                Test Rollback
            </button>
            
            <button
                onClick={fetchTransactions}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center disabled:opacity-50 shadow-md hover:shadow-lg transition-all transform hover:scale-105"
            >
                <FaSyncAlt className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Cargando...' : 'Actualizar'}
            </button>
            
            <Link
                to="/panel-admin/dashboard"
                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 flex items-center shadow-md hover:shadow-lg transition-all"
            >
                📊 Dashboard
            </Link>
        </div>
    </div>

    {/* Estadísticas rápidas */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-200">
        <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{pagination.total}</div>
            <div className="text-sm text-gray-600">Total Transacciones</div>
        </div>
        <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
                {transactions.filter(t => t.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600">Aprobadas</div>
        </div>
        <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
                {transactions.filter(t => t.status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-600">Rechazadas</div>
        </div>
        <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
                {transactions.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pendientes</div>
        </div>
    </div>
</div>

            {/* Filtros */}
            <OrderSearchAndFilters
                filters={filters}
                onFiltersChange={(newFilters) => {
                    setFilters(newFilters);
                    setPagination(prev => ({ ...prev, page: 1 }));
                }}
                onReset={resetFilters}
                showExport={true}
                onExport={() => {
                    // Funcionalidad de exportar (implementar después)
                    toast.info('🚀 Funcionalidad de exportar próximamente');
                }}
                totalResults={pagination.total}
                loading={isLoading}
            />

            {/* Tabla de transacciones */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Cargando transacciones...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="p-8 text-center">
                        <FaCreditCard className="text-5xl text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No se encontraron transacciones.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo Usuario</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Método Pago</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Productos</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Delivery</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Venta</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {transactions.map((transaction) => (
                                    <tr key={transaction._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm">
                                            <div>
                                                <div className="font-medium text-gray-900">#{transaction.shop_process_id}</div>
                                                <div className="text-xs text-gray-500">{transaction.bancard_process_id}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {transaction.customer_info?.name || 'N/A'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {transaction.customer_info?.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            <div className="flex flex-col items-center">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    transaction.user_type === 'REGISTERED' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {transaction.user_type === 'REGISTERED' ? '👤 Registrado' : '👥 Invitado'}
                                                </span>
                                                {transaction.device_type && (
                                                    <span className="text-xs text-gray-500 mt-1">
                                                        📱 {transaction.device_type}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            <div className="flex flex-col items-center">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    transaction.payment_method === 'saved_card' 
                                                        ? 'bg-blue-100 text-blue-800' 
                                                        : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                    {transaction.payment_method === 'saved_card' ? '💳 Guardada' : '🆕 Nueva'}
                                                </span>
                                                {transaction.is_token_payment && (
                                                    <span className="text-xs text-green-600 mt-1">
                                                        🔐 Token
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            <div className="flex flex-col items-center">
                                                <span className="font-medium text-gray-900">
                                                    {transaction.cart_total_items || transaction.items?.length || 0} items
                                                </span>
                                                {transaction.items && transaction.items.length > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1 max-w-32 truncate">
                                                        {transaction.items[0].name}
                                                        {transaction.items.length > 1 && ` +${transaction.items.length - 1}`}
                                                    </div>
                                                )}
                                                {transaction.invoice_number && (
                                                    <span className="text-xs text-blue-600 mt-1">
                                                        📄 {transaction.invoice_number}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            <div className="font-medium text-gray-900">
                                                {displayPYGCurrency(transaction.amount)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {transaction.currency}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge transaction={transaction} showBoth={true} size="xs" />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col items-center min-w-32">
                                                <StatusWithProgress transaction={transaction} showProgress={true} />
                                                {transaction.tracking_number && (
                                                    <div className="text-xs text-blue-600 mt-2 bg-blue-50 px-2 py-1 rounded-full">
                                                        📦 {transaction.tracking_number}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                                            <div>{formatDate(transaction.transaction_date)}</div>
                                            {transaction.confirmation_date && (
                                                <div className="text-xs text-gray-400">
                                                    Conf: {formatDate(transaction.confirmation_date)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {transaction.sale_id ? (
                                                <Link
                                                    to={`/panel-admin/ventas/${transaction.sale_id._id}`}
                                                    className="text-blue-600 hover:text-blue-800 flex items-center justify-center"
                                                    title="Ver venta relacionada"
                                                >
                                                    <FaFileInvoiceDollar className="mr-1" />
                                                    {transaction.sale_id.saleNumber}
                                                </Link>
                                            ) : (
                                                <span className="text-gray-400 text-sm">Sin venta</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <AdminOrderActions
                                                transaction={transaction}
                                                onDeliveryManage={(trans) => {
                                                    setSelectedDeliveryTransaction(trans);
                                                    setShowDeliveryModal(true);
                                                }}
                                                onRollback={(trans) => {
                                                    setSelectedTransaction(trans);
                                                    setShowRollbackModal(true);
                                                }}
                                                onViewDetails={(trans) => {
                                                    setSelectedDetailsTransaction(trans);
                                                    setShowDetailsModal(true);
                                                }}
                                                onViewProducts={(trans) => {
                                                    setSelectedTransaction(trans);
                                                    setShowProductModal(true);
                                                }}
                                            />
                                                                                        
                                            {/* Información adicional si está rollback */}
                                            {transaction.is_rolled_back && (
                                                <div className="text-xs text-orange-600 mt-2 bg-orange-50 px-2 py-1 rounded">
                                                    <div>Reversado</div>
                                                    <div>{formatDate(transaction.rollback_date)}</div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Paginación */}
            {!isLoading && transactions.length > 0 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                disabled={pagination.page === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                                disabled={pagination.page === pagination.pages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Mostrando{' '}
                                    <span className="font-medium">
                                        {((pagination.page - 1) * pagination.limit) + 1}
                                    </span>{' '}
                                    a{' '}
                                    <span className="font-medium">
                                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                                    </span>{' '}
                                    de{' '}
                                    <span className="font-medium">{pagination.total}</span>{' '}
                                    resultados
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                        disabled={pagination.page === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Anterior
                                    </button>
                                    
                                    {[...Array(Math.min(5, pagination.pages))].map((_, index) => {
                                        const pageNumber = Math.max(1, pagination.page - 2) + index;
                                        if (pageNumber > pagination.pages) return null;
                                        
                                        return (
                                            <button
                                                key={pageNumber}
                                                onClick={() => setPagination(prev => ({ ...prev, page: pageNumber }))}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                    pageNumber === pagination.page
                                                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                }`}
                                            >
                                                {pageNumber}
                                            </button>
                                        );
                                    })}
                                    
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                                        disabled={pagination.page === pagination.pages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Siguiente
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Rollback */}
            {showRollbackModal && selectedTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="font-bold text-lg text-gray-800 flex items-center">
                                <FaUndo className="mr-2 text-orange-600" />
                                🔄 Reversar Transacción
                            </h2>
                            <button 
                                className="text-2xl text-gray-600 hover:text-black" 
                                onClick={() => {
                                    setShowRollbackModal(false);
                                    setSelectedTransaction(null);
                                    setRollbackReason('');
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center">
                                    <FaExclamationTriangle className="text-yellow-600 mr-2" />
                                    <h3 className="font-medium text-yellow-800">⚠️ ¡Atención!</h3>
                                </div>
                                <p className="text-yellow-700 text-sm mt-1">
                                    Esta acción reversará la transacción #{selectedTransaction.shop_process_id} 
                                    por {displayPYGCurrency(selectedTransaction.amount)}. 
                                    <strong>Esta acción no se puede deshacer.</strong>
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    📝 Razón del rollback *
                                </label>
                                <textarea
                                    value={rollbackReason}
                                    onChange={(e) => setRollbackReason(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    rows="3"
                                    placeholder="Explique el motivo de la reversión (ej: Cliente solicitó cancelación, Error en el pedido, etc.)"
                                    required
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm mb-4 bg-gray-50 p-3 rounded-lg">
                                <div>
                                    <span className="text-gray-600">👤 Cliente:</span>
                                    <div className="font-medium">{selectedTransaction.customer_info?.name || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">📅 Fecha:</span>
                                    <div className="font-medium">{formatDate(selectedTransaction.transaction_date)}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">🔐 Autorización:</span>
                                    <div className="font-medium">{selectedTransaction.authorization_number || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">🌐 Ambiente:</span>
                                    <div className="font-medium capitalize">{selectedTransaction.environment}</div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRollbackModal(false);
                                        setSelectedTransaction(null);
                                        setRollbackReason('');
                                    }}
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    ❌ Cancelar
                                </button>
                                <button
                                    onClick={handleRollback}
                                    disabled={!rollbackReason.trim() || isLoading}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            🔄 Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <FaUndo className="mr-2" />
                                            ✅ Confirmar Rollback
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalles de Productos */}
            {selectedTransaction && showProductModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="font-bold text-lg text-gray-800 flex items-center">
                                <FaFileInvoiceDollar className="mr-2 text-blue-600" />
                                🛒 Detalles de la Compra
                            </h2>
                            <button 
                                className="text-2xl text-gray-600 hover:text-black" 
                                onClick={() => setShowProductModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-4 max-h-96 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                <div>
                                    <span className="text-gray-600">💳 Transacción:</span>
                                    <div className="font-medium">#{selectedTransaction.shop_process_id}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">👤 Cliente:</span>
                                    <div className="font-medium">{selectedTransaction.customer_info?.name || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">📱 Dispositivo:</span>
                                    <div className="font-medium capitalize">{selectedTransaction.device_type || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">🌐 Origen:</span>
                                    <div className="font-medium">{selectedTransaction.referrer_url || 'Directo'}</div>
                                </div>
                            </div>

                            {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-3">🛍️ Productos Comprados:</h3>
                                    <div className="space-y-3">
                                        {selectedTransaction.items.map((item, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                                                        {item.category && (
                                                            <p className="text-sm text-gray-500">{item.category}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium text-gray-800">
                                                            {displayPYGCurrency(item.total || (item.quantity * item.unitPrice))}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {item.quantity} × {displayPYGCurrency(item.unitPrice)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    📦 No hay información detallada de productos
                                </div>
                            )}

                            {selectedTransaction.order_notes && (
                                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                                    <h4 className="font-medium text-yellow-800 mb-1">📝 Notas del Pedido:</h4>
                                    <p className="text-yellow-700 text-sm">{selectedTransaction.order_notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
             {showDeliveryModal && selectedDeliveryTransaction && (
                <DeliveryManagement
                    transaction={selectedDeliveryTransaction}
                    onClose={() => {
                        setShowDeliveryModal(false);
                        setSelectedDeliveryTransaction(null);
                    }}
                    onUpdate={fetchTransactions}
                />
            )}
            {/* Modal de Detalles Completos */}
            {showDetailsModal && selectedDetailsTransaction && (
                <TransactionDetailsModal
                    transaction={selectedDetailsTransaction}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedDetailsTransaction(null);
                    }}
                />
            )}
        </div>
    );
};

export default BancardTransactions;