// frontend/src/pages/BankTransferManagement.js - ACTUALIZADO CON DATOS REALES
import React, { useState, useEffect } from 'react';
import { 
    FaUniversity, 
    FaEye, 
    FaCheck, 
    FaTimes, 
    FaFilter, 
    FaDownload, 
    FaClock, 
    FaExclamationTriangle,
    FaFileImage,
    FaFilePdf,
    FaSpinner,
    FaCheckCircle,
    FaTimesCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayINRCurrency from '../helpers/displayCurrency';

const BankTransferManagement = () => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // Para loading de botones específicos
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [approvalAction, setApprovalAction] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [verificationAmount, setVerificationAmount] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [stats, setStats] = useState({});
    const [filters, setFilters] = useState({
        status: 'pending',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchTransfers();
        fetchStats();
    }, [filters]);

    // ✅ FUNCIÓN REAL PARA OBTENER TRANSFERENCIAS
 const fetchTransfers = async () => {
    setLoading(true);
    try {
        console.log('🔄 Obteniendo transferencias con filtros:', filters);
        
        let url = `${SummaryApi.baseURL}/api/admin/bank-transfers`;
        const queryParams = new URLSearchParams();
        
        // Agregar filtros
        Object.entries(filters).forEach(([key, value]) => {
            if (value) queryParams.append(key, value);
        });

        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }

        console.log('📡 URL de solicitud:', url);

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        console.log('📥 Respuesta del servidor:', result);

        if (result.success) {
            const transfersData = result.data?.transfers || [];
            console.log('✅ Transferencias obtenidas:', transfersData.length);
            
            // ✅ PROCESAR TRANSFERENCIAS PARA MOSTRAR CORRECTAMENTE
            const processedTransfers = transfersData.map(transfer => ({
                ...transfer,
                // Asegurar que los campos necesarios existen
                transfer_id: transfer.transfer_id || `TRF-${transfer._id}`,
                customer_transfer_info: transfer.customer_transfer_info || {},
                admin_verification: transfer.admin_verification || { status: 'pending' },
                order_id: transfer.order_id || {},
                transfer_proof: transfer.transfer_proof || null,
                days_since_submission: transfer.createdAt ? 
                    Math.ceil((new Date() - new Date(transfer.createdAt)) / (1000 * 60 * 60 * 24)) : 0
            }));
            
            setTransfers(processedTransfers);
            
            // Actualizar estadísticas si están disponibles
            if (result.data?.overall_stats) {
                setStats(result.data);
            }
        } else {
            console.warn('⚠️ No se pudieron obtener transferencias:', result.message);
            toast.warn(result.message || 'No se pudieron cargar las transferencias');
            setTransfers([]);
        }
    } catch (error) {
        console.error('❌ Error obteniendo transferencias:', error);
        toast.error('Error de conexión al cargar transferencias');
        setTransfers([]);
    } finally {
        setLoading(false);
    }
};

    // ✅ FUNCIÓN REAL PARA OBTENER ESTADÍSTICAS
    const fetchStats = async () => {
        try {
            const response = await fetch(`${SummaryApi.baseURL}/api/admin/bank-transfers/stats`, {
                method: 'GET',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                console.log('📊 Estadísticas obtenidas:', result.data);
                setStats(result.data);
            } else {
                console.warn('⚠️ Error obteniendo estadísticas:', result.message);
            }
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
        }
    };

    // ✅ FUNCIÓN MEJORADA PARA APROBAR TRANSFERENCIA
    const handleApproveTransfer = async () => {
        if (!selectedTransfer) return;

        setActionLoading('approve');
        try {
            console.log('✅ Aprobando transferencia:', selectedTransfer.transfer_id);
            
            const response = await fetch(`${SummaryApi.baseURL}/api/admin/bank-transfers/${selectedTransfer.transfer_id}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    notes: approvalNotes,
                    verification_amount: parseFloat(verificationAmount) || selectedTransfer.customer_transfer_info?.transfer_amount
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('✅ Transferencia aprobada exitosamente');
                await fetchTransfers(); // Recargar datos
                await fetchStats(); // Actualizar estadísticas
                closeApprovalModal();
            } else {
                console.error('❌ Error del servidor:', result);
                toast.error(result.message || 'Error al aprobar transferencia');
            }
        } catch (error) {
            console.error('❌ Error aprobando transferencia:', error);
            toast.error('Error de conexión al aprobar transferencia');
        } finally {
            setActionLoading(null);
        }
    };

    // ✅ FUNCIÓN MEJORADA PARA RECHAZAR TRANSFERENCIA
   const handleRejectTransfer = async () => {
    if (!selectedTransfer) return;

    setActionLoading('reject');
    try {
        console.log('❌ Rechazando transferencia:', selectedTransfer.transfer_id);
        
        const response = await fetch(`${SummaryApi.baseURL}/api/admin/bank-transfers/${selectedTransfer.transfer_id}/reject`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                notes: approvalNotes,
                reason: rejectionReason
            })
        });

        const result = await response.json();

        if (result.success) {
            toast.success('✅ Transferencia rechazada correctamente');
            await fetchTransfers(); // Recargar datos
            await fetchStats(); // Actualizar estadísticas
            closeApprovalModal();
        } else {
            console.error('❌ Error del servidor:', result);
            toast.error(result.message || 'Error al rechazar transferencia');
        }
    } catch (error) {
        console.error('❌ Error rechazando transferencia:', error);
        toast.error('Error de conexión al rechazar transferencia');
    } finally {
        setActionLoading(null);
    }
};

    // ✅ MODAL DE CONFIRMACIÓN ANTES DE APROBAR/RECHAZAR
    const openConfirmationModal = (transfer, action) => {
        setSelectedTransfer(transfer);
        setApprovalAction(action);
        setShowConfirmModal(true);
    };

    const closeConfirmModal = () => {
        setShowConfirmModal(false);
        setSelectedTransfer(null);
        setApprovalAction('');
    };

    const confirmAction = () => {
        setShowConfirmModal(false);
        openApprovalModal(selectedTransfer, approvalAction);
    };

    const openApprovalModal = (transfer, action) => {
        setSelectedTransfer(transfer);
        setApprovalAction(action);
        setApprovalNotes('');
        setVerificationAmount(transfer.customer_transfer_info?.transfer_amount?.toString() || '');
        setRejectionReason('');
        setShowApprovalModal(true);
    };

    const closeApprovalModal = () => {
        setShowApprovalModal(false);
        setSelectedTransfer(null);
        setApprovalAction('');
        setApprovalNotes('');
        setVerificationAmount('');
        setRejectionReason('');
    };

    // ✅ COMPONENTE PARA ESTADO DE COMPROBANTE
    const ProofStatus = ({ transfer }) => {
        const hasProof = transfer.transfer_proof?.file_url;
        const isFirebaseUrl = hasProof && transfer.transfer_proof.file_url.includes('firebasestorage.googleapis.com');
        const isPdf = transfer.transfer_proof?.file_type?.includes('pdf');
        
        if (!hasProof) {
            return (
                <div className="flex items-center gap-1 text-yellow-600">
                    <FaExclamationTriangle className="text-sm" />
                    <span className="text-sm font-medium">Pendiente</span>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-green-600">
                    <FaCheckCircle className="text-sm" />
                    <span className="text-sm font-medium">Subido</span>
                </div>
                <button
                    onClick={() => window.open(transfer.transfer_proof.file_url, '_blank')}
                    className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                    title="Ver comprobante"
                >
                    {isPdf ? <FaFilePdf /> : <FaFileImage />}
                    Ver
                </button>
            </div>
        );
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente', icon: FaClock },
            approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprobado', icon: FaCheck },
            rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rechazado', icon: FaTimes },
            requires_review: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Requiere Revisión', icon: FaExclamationTriangle }
        };

        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                <Icon className="text-xs" />
                {config.label}
            </span>
        );
    };

    const getDaysColor = (days) => {
        if (days <= 1) return 'text-green-600';
        if (days <= 3) return 'text-yellow-600';
        return 'text-red-600';
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({
            status: 'pending',
            startDate: '',
            endDate: ''
        });
    };

    const exportTransfers = () => {
        toast.info('Función de exportación en desarrollo');
    };

    // ✅ COMPONENTE RESPONSIVE PARA MOBILE
    const TransferCard = ({ transfer }) => (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-semibold text-[#2A3190] text-sm">{transfer.transfer_id}</h3>
                    <p className="text-xs text-gray-500">Ref: {transfer.customer_transfer_info?.reference_number}</p>
                </div>
                {getStatusBadge(transfer.admin_verification?.status)}
            </div>
            
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium">{transfer.order_id?.customer_info?.name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Monto:</span>
                    <span className="font-bold text-green-600">
                        {displayINRCurrency(transfer.customer_transfer_info?.transfer_amount)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Banco:</span>
                    <span>{transfer.customer_transfer_info?.customer_bank}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Comprobante:</span>
                    <ProofStatus transfer={transfer} />
                </div>
            </div>
            
            <div className="flex gap-2 mt-4">
                <button
                    onClick={() => {
                        setSelectedTransfer(transfer);
                        setShowDetailsModal(true);
                    }}
                    className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-center gap-1"
                >
                    <FaEye className="text-xs" />
                    Ver
                </button>
                
                {transfer.admin_verification?.status === 'pending' && (
                    <>
                        <button
                            onClick={() => openConfirmationModal(transfer, 'approve')}
                            disabled={actionLoading === 'approve'}
                            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                            {actionLoading === 'approve' ? (
                                <FaSpinner className="animate-spin text-xs" />
                            ) : (
                                <FaCheck className="text-xs" />
                            )}
                            Aprobar
                        </button>
                        <button
                            onClick={() => openConfirmationModal(transfer, 'reject')}
                            disabled={actionLoading === 'reject'}
                            className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                            {actionLoading === 'reject' ? (
                                <FaSpinner className="animate-spin text-xs" />
                            ) : (
                                <FaTimes className="text-xs" />
                            )}
                            Rechazar
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#2A3190] flex items-center gap-3">
                            <FaUniversity className="text-xl" />
                            Gestión de Transferencias Bancarias
                        </h1>
                        <p className="text-gray-600 mt-1">Administra y verifica las transferencias bancarias</p>
                    </div>
                    
                    <div className="flex gap-3">
                        <button
                            onClick={exportTransfers}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <FaDownload />
                            Exportar
                        </button>
                        <button
                            onClick={fetchTransfers}
                            disabled={loading}
                            className="bg-[#2A3190] text-white px-4 py-2 rounded-lg hover:bg-[#1e236b] transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : null}
                            Actualizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Transferencias</p>
                            <p className="text-2xl font-bold text-[#2A3190]">
                                {stats.overall_stats?.total_transfers || 0}
                            </p>
                        </div>
                        <FaUniversity className="text-3xl text-[#2A3190] opacity-20" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Pendientes</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {stats.overall_stats?.pending_transfers || 0}
                            </p>
                        </div>
                        <FaClock className="text-3xl text-yellow-600 opacity-20" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Aprobadas</p>
                            <p className="text-2xl font-bold text-green-600">
                                {stats.overall_stats?.approved_transfers || 0}
                            </p>
                        </div>
                        <FaCheck className="text-3xl text-green-600 opacity-20" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Tasa Aprobación</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {stats.overall_stats?.approval_rate || 0}%
                            </p>
                        </div>
                        <FaUniversity className="text-3xl text-blue-600 opacity-20" />
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center mb-4">
                    <FaFilter className="mr-2 text-gray-600" />
                    <h3 className="font-medium">Filtrar Transferencias</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1">Estado</label>
                        <select
                            name="status"
                            value={filters.status}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
                        >
                            <option value="">Todos</option>
                            <option value="pending">Pendientes</option>
                            <option value="approved">Aprobadas</option>
                            <option value="rejected">Rechazadas</option>
                            <option value="requires_review">Requiere Revisión</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1">Desde</label>
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1">Hasta</label>
                        <input
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista de transferencias */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4">
                    Transferencias ({transfers.length})
                </h3>
                
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin w-12 h-12 border-4 border-[#2A3190] border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600">Cargando transferencias...</p>
                    </div>
                ) : transfers.length === 0 ? (
                    <div className="text-center py-12">
                        <FaUniversity className="text-6xl text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay transferencias</h3>
                        <p className="text-gray-500">No se encontraron transferencias con los filtros aplicados</p>
                    </div>
                ) : (
                    <>
                        {/* Vista Desktop */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-2 font-medium text-gray-700">Transferencia</th>
                                        <th className="text-left py-3 px-2 font-medium text-gray-700">Pedido</th>
                                        <th className="text-left py-3 px-2 font-medium text-gray-700">Cliente</th>
                                        <th className="text-left py-3 px-2 font-medium text-gray-700">Monto</th>
                                        <th className="text-left py-3 px-2 font-medium text-gray-700">Banco Cliente</th>
                                        <th className="text-left py-3 px-2 font-medium text-gray-700">Comprobante</th>
                                        <th className="text-left py-3 px-2 font-medium text-gray-700">Estado</th>
                                        <th className="text-left py-3 px-2 font-medium text-gray-700">Días</th>
                                        <th className="text-left py-3 px-2 font-medium text-gray-700">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transfers.map((transfer) => (
                                        <tr key={transfer._id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-2">
                                                <div>
                                                    <p className="font-medium text-[#2A3190]">{transfer.transfer_id}</p>
                                                    <p className="text-xs text-gray-500">Ref: {transfer.customer_transfer_info?.reference_number}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2">
                                                <p className="font-medium text-gray-900">{transfer.order_id?.order_id}</p>
                                            </td>
                                            <td className="py-3 px-2">
                                                <div>
                                                    <p className="font-medium">{transfer.order_id?.customer_info?.name}</p>
                                                    <p className="text-sm text-gray-600">{transfer.order_id?.customer_info?.email}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2">
                                                <p className="font-bold text-green-600">
                                                    {displayINRCurrency(transfer.customer_transfer_info?.transfer_amount)}
                                                </p>
                                            </td>
                                            <td className="py-3 px-2">
                                                <div>
                                                    <p className="text-sm font-medium">{transfer.customer_transfer_info?.customer_bank}</p>
                                                    <p className="text-xs text-gray-500">{transfer.customer_transfer_info?.customer_account}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2">
                                                <ProofStatus transfer={transfer} />
                                            </td>
                                            <td className="py-3 px-2">
                                                {getStatusBadge(transfer.admin_verification?.status)}
                                            </td>
                                            <td className="py-3 px-2">
                                                <p className={`text-sm font-medium ${getDaysColor(transfer.days_since_submission || 0)}`}>
                                                    {transfer.days_since_submission || 0} días
                                                </p>
                                            </td>
                                            <td className="py-3 px-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTransfer(transfer);
                                                            setShowDetailsModal(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 p-1"
                                                        title="Ver detalles"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    
                                                    {transfer.admin_verification?.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => openConfirmationModal(transfer, 'approve')}
                                                                disabled={actionLoading}
                                                                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                                title="Aprobar"
                                                            >
                                                                {actionLoading === 'approve' ? (
                                                                    <FaSpinner className="animate-spin text-xs" />
                                                                ) : (
                                                                    <FaCheck className="text-xs" />
                                                                )}
                                                                Aprobar
                                                            </button>
                                                            <button
                                                                onClick={() => openConfirmationModal(transfer, 'reject')}
                                                                disabled={actionLoading}
                                                                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                                title="Rechazar"
                                                            >
                                                                {actionLoading === 'reject' ? (
                                                                    <FaSpinner className="animate-spin text-xs" />
                                                                ) : (
                                                                    <FaTimes className="text-xs" />
                                                                )}
                                                                Rechazar
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista Mobile */}
                        <div className="lg:hidden">
                            {transfers.map((transfer) => (
                                <TransferCard key={transfer._id} transfer={transfer} />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Modal de confirmación */}
            {showConfirmModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                {approvalAction === 'approve' ? (
                                    <FaCheckCircle className="text-3xl text-green-600" />
                                ) : (
                                    <FaTimesCircle className="text-3xl text-red-600" />
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {approvalAction === 'approve' ? '¿Aprobar Transferencia?' : '¿Rechazar Transferencia?'}
                                    </h3>
                                    <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                <p className="text-sm"><strong>Transferencia:</strong> {selectedTransfer.transfer_id}</p>
                                <p className="text-sm"><strong>Cliente:</strong> {selectedTransfer.order_id?.customer_info?.name}</p>
                                <p className="text-sm"><strong>Monto:</strong> {displayINRCurrency(selectedTransfer.customer_transfer_info?.transfer_amount)}</p>
                            </div>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={closeConfirmModal}
                                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmAction}
                                    className={`flex-1 px-4 py-2 rounded-lg transition-colors text-white ${
                                        approvalAction === 'approve' 
                                            ? 'bg-green-600 hover:bg-green-700' 
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    {approvalAction === 'approve' ? 'Sí, Aprobar' : 'Sí, Rechazar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de detalles */}
            {showDetailsModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold text-[#2A3190]">
                                Detalles de Transferencia {selectedTransfer.transfer_id}
                            </h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-96">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Información del pedido */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Información del Pedido</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Pedido:</strong> {selectedTransfer.order_id?.order_id}</p>
                                        <p><strong>Cliente:</strong> {selectedTransfer.order_id?.customer_info?.name}</p>
                                        <p><strong>Email:</strong> {selectedTransfer.order_id?.customer_info?.email}</p>
                                        <p><strong>Teléfono:</strong> {selectedTransfer.order_id?.customer_info?.phone}</p>
                                        <p><strong>Total Pedido:</strong> {displayINRCurrency(selectedTransfer.order_id?.total_amount)}</p>
                                    </div>
                                </div>

                                {/* Información de la transferencia */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Datos de Transferencia</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Referencia:</strong> {selectedTransfer.customer_transfer_info?.reference_number}</p>
                                        <p><strong>Monto:</strong> {displayINRCurrency(selectedTransfer.customer_transfer_info?.transfer_amount)}</p>
                                        <p><strong>Banco Cliente:</strong> {selectedTransfer.customer_transfer_info?.customer_bank}</p>
                                        <p><strong>Cuenta Cliente:</strong> {selectedTransfer.customer_transfer_info?.customer_account}</p>
                                        <p><strong>Fecha Transferencia:</strong> {selectedTransfer.customer_transfer_info?.transfer_date ? new Date(selectedTransfer.customer_transfer_info.transfer_date).toLocaleDateString('es-ES') : 'No especificada'}</p>
                                    </div>
                                </div>

                                {/* Comprobante */}
                                {selectedTransfer.transfer_proof?.file_url && (
                                    <div className="md:col-span-2">
                                        <h3 className="font-semibold text-gray-900 mb-3">Comprobante de Transferencia</h3>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <p className="text-sm mb-2">
                                                <strong>Archivo:</strong> {selectedTransfer.transfer_proof.file_name}
                                            </p>
                                            <div className="flex gap-2">
                                                <a
                                                    href={selectedTransfer.transfer_proof.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                                >
                                                    {selectedTransfer.transfer_proof.file_type?.includes('pdf') ? <FaFilePdf /> : <FaFileImage />}
                                                    Ver comprobante
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Estado de verificación */}
                                <div className="md:col-span-2">
                                    <h3 className="font-semibold text-gray-900 mb-3">Estado de Verificación</h3>
                                    <div className="space-y-2">
                                        <p><strong>Estado:</strong> {getStatusBadge(selectedTransfer.admin_verification?.status)}</p>
                                        {selectedTransfer.admin_verification?.verification_date && (
                                            <p><strong>Fecha Verificación:</strong> {new Date(selectedTransfer.admin_verification.verification_date).toLocaleDateString('es-ES')}</p>
                                        )}
                                        {selectedTransfer.admin_verification?.admin_notes && (
                                            <p><strong>Notas Admin:</strong> {selectedTransfer.admin_verification.admin_notes}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t p-6 bg-gray-50">
                            <div className="flex justify-end gap-3">
                                {selectedTransfer.admin_verification?.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setShowDetailsModal(false);
                                                openConfirmationModal(selectedTransfer, 'approve');
                                            }}
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                        >
                                            <FaCheck />
                                            Aprobar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDetailsModal(false);
                                                openConfirmationModal(selectedTransfer, 'reject');
                                            }}
                                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                        >
                                            <FaTimes />
                                            Rechazar
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de aprobación/rechazo */}
            {showApprovalModal && selectedTransfer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold text-[#2A3190]">
                                {approvalAction === 'approve' ? 'Aprobar' : 'Rechazar'} Transferencia
                            </h2>
                            <button
                                onClick={closeApprovalModal}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-gray-700 mb-2">
                                    <strong>Transferencia:</strong> {selectedTransfer.transfer_id}
                                </p>
                                <p className="text-gray-700 mb-2">
                                    <strong>Monto:</strong> {displayINRCurrency(selectedTransfer.customer_transfer_info?.transfer_amount)}
                                </p>
                                <p className="text-gray-700 mb-4">
                                    <strong>Cliente:</strong> {selectedTransfer.order_id?.customer_info?.name}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {approvalAction === 'approve' && (
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">
                                            Monto Verificado
                                        </label>
                                        <input
                                            type="number"
                                            value={verificationAmount}
                                            onChange={(e) => setVerificationAmount(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
                                            placeholder="Monto verificado"
                                        />
                                    </div>
                                )}

                                {approvalAction === 'reject' && (
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">
                                            Motivo del Rechazo
                                        </label>
                                        <select
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
                                        >
                                            <option value="">Seleccionar motivo</option>
                                            <option value="amount_mismatch">Monto no coincide</option>
                                            <option value="invalid_proof">Comprobante inválido</option>
                                            <option value="duplicate_transfer">Transferencia duplicada</option>
                                            <option value="expired_order">Pedido expirado</option>
                                            <option value="other">Otro motivo</option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Notas del Administrador
                                    </label>
                                    <textarea
                                        value={approvalNotes}
                                        onChange={(e) => setApprovalNotes(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
                                        rows="3"
                                        placeholder="Notas adicionales sobre la verificación..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t p-6 bg-gray-50">
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={closeApprovalModal}
                                    disabled={actionLoading}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                
                                {approvalAction === 'approve' ? (
                                    <button
                                        onClick={handleApproveTransfer}
                                        disabled={!verificationAmount || actionLoading}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {actionLoading === 'approve' ? (
                                            <FaSpinner className="animate-spin" />
                                        ) : (
                                            <FaCheck />
                                        )}
                                        {actionLoading === 'approve' ? 'Aprobando...' : 'Aprobar Transferencia'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleRejectTransfer}
                                        disabled={!rejectionReason || actionLoading}
                                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {actionLoading === 'reject' ? (
                                            <FaSpinner className="animate-spin" />
                                        ) : (
                                            <FaTimes />
                                        )}
                                        {actionLoading === 'reject' ? 'Rechazando...' : 'Rechazar Transferencia'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankTransferManagement;