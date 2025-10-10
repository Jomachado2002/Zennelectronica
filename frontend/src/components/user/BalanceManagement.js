import React, { useState, useEffect } from 'react';
import { FaWallet, FaPlus, FaHistory, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaCreditCard } from 'react-icons/fa';
import { toast } from 'react-toastify';
import BalanceService from '../../services/balanceService';
import displayINRCurrency from '../../helpers/displayCurrency';
import LoadBalanceModal from '../LoadBalanceModal';

const BalanceManagement = ({ user }) => {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);

    useEffect(() => {
        fetchBalance();
        fetchHistory();
    }, []);

    const fetchBalance = async () => {
        try {
            setLoading(true);
            const result = await BalanceService.getUserBalance();
            if (result.success) {
                setBalance(result.data.current_balance);
            }
        } catch (error) {
            console.error('Error obteniendo saldo:', error);
            toast.error('Error al cargar saldo');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const result = await BalanceService.getBalanceHistory(20);
            if (result.success) {
                setHistory(result.data.transactions);
            }
        } catch (error) {
            console.error('Error obteniendo historial:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleLoadSuccess = () => {
        fetchBalance();
        fetchHistory();
        setShowLoadModal(false);
    };

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-[#2A3190] flex items-center gap-3">
                                <FaWallet className="text-xl" />
                                Mi Saldo
                            </h1>
                            <p className="text-gray-600 mt-1">Gestiona tu saldo de Zenn Wallet</p>
                        </div>
                        
                        <button
                            onClick={() => setShowLoadModal(true)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                        >
                            <FaPlus className="text-sm" />
                            Cargar Saldo
                        </button>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-medium mb-2">Saldo Disponible</h2>
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <FaSpinner className="animate-spin" />
                                    <span>Cargando...</span>
                                </div>
                            ) : (
                                <div className="text-3xl font-bold">
                                    {displayINRCurrency(balance)}
                                </div>
                            )}
                        </div>
                        
                        <div className="text-right">
                            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                <FaWallet className="text-2xl" />
                            </div>
                            <p className="text-sm mt-2 opacity-90">
                                {balance === 0 ? 'Sin saldo disponible' : 'Listo para usar'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <FaCreditCard className="text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Cargar Saldo</h3>
                                <p className="text-sm text-gray-500">Con tarjeta de crédito</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowLoadModal(true)}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Cargar Ahora
                        </button>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <FaCheckCircle className="text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Estado</h3>
                                <p className="text-sm text-gray-500">
                                    {balance > 0 ? 'Activo' : 'Sin saldo'}
                                </p>
                            </div>
                        </div>
                        <div className={`w-full py-2 rounded-lg text-center font-medium ${
                            balance > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {balance > 0 ? 'Listo para usar' : 'Carga saldo'}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <FaHistory className="text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Historial</h3>
                                <p className="text-sm text-gray-500">
                                    {history.length} transacciones
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => document.getElementById('history-section').scrollIntoView({ behavior: 'smooth' })}
                            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Ver Historial
                        </button>
                    </div>
                </div>

                {/* Información del Usuario */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                        <FaWallet />
                        Información de tu Cuenta
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-blue-700 font-medium">Nombre:</p>
                            <p className="text-blue-900">{user.name}</p>
                        </div>
                        <div>
                            <p className="text-blue-700 font-medium">Email:</p>
                            <p className="text-blue-900">{user.email}</p>
                        </div>
                        <div>
                            <p className="text-blue-700 font-medium">ID Bancard:</p>
                            <p className="text-blue-900">{user.bancardUserId || 'No asignado'}</p>
                        </div>
                        <div>
                            <p className="text-blue-700 font-medium">Estado:</p>
                            <p className="text-blue-900">{user.isActive ? 'Activo' : 'Inactivo'}</p>
                        </div>
                    </div>
                </div>

                {/* Historial de Transacciones */}
                <div id="history-section" className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <FaHistory />
                            Historial de Transacciones
                        </h3>
                        <button
                            onClick={fetchHistory}
                            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <FaSpinner className={`text-sm ${loadingHistory ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                    </div>

                    {loadingHistory ? (
                        <div className="flex items-center justify-center py-8">
                            <FaSpinner className="animate-spin text-blue-600 mr-2" />
                            <span className="text-gray-500">Cargando historial...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12">
                            <FaWallet className="text-6xl text-gray-300 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">No hay transacciones</h4>
                            <p className="text-gray-500 mb-6">
                                Cuando hagas tu primera carga de saldo, aparecerá aquí
                            </p>
                            <button
                                onClick={() => setShowLoadModal(true)}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Cargar Saldo
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {history.map((transaction, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                            transaction.type === 'load' || transaction.type === 'bonus' || transaction.type === 'roulette_win'
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-red-100 text-red-600'
                                        }`}>
                                            {transaction.type === 'load' || transaction.type === 'bonus' || transaction.type === 'roulette_win' ? (
                                                <FaCheckCircle />
                                            ) : (
                                                <FaCreditCard />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {transaction.description}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {new Date(transaction.transaction_date).toLocaleString('es-PY', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            <p className="text-xs text-gray-400 capitalize">
                                                {transaction.type.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold text-lg ${
                                            transaction.type === 'load' || transaction.type === 'bonus' || transaction.type === 'roulette_win'
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}>
                                            {transaction.type === 'load' || transaction.type === 'bonus' || transaction.type === 'roulette_win' ? '+' : '-'}
                                            {displayINRCurrency(transaction.amount)}
                                        </p>
                                        <p className={`text-sm ${
                                            transaction.status === 'completed' ? 'text-green-600' : 
                                            transaction.status === 'pending' ? 'text-yellow-600' : 
                                            'text-red-600'
                                        }`}>
                                            {transaction.status === 'completed' ? 'Completado' :
                                             transaction.status === 'pending' ? 'Pendiente' :
                                             'Fallido'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Información de Seguridad */}
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                        <FaCheckCircle />
                        Seguridad y Confianza
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div>
                            <h4 className="font-medium text-green-800 mb-2">🔒 Pagos Seguros</h4>
                            <p className="text-green-700">
                                Todos los pagos son procesados por Bancard con encriptación SSL de 256 bits.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-green-800 mb-2">⚡ Acreditación Inmediata</h4>
                            <p className="text-green-700">
                                Tu saldo se acredita inmediatamente después de confirmar el pago.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-green-800 mb-2">📱 Disponible 24/7</h4>
                            <p className="text-green-700">
                                Puedes cargar saldo y realizar pagos en cualquier momento.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-green-800 mb-2">🎯 Sin Comisiones</h4>
                            <p className="text-green-700">
                                No cobramos comisiones por cargar saldo o realizar pagos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de carga de saldo */}
            <LoadBalanceModal
                isOpen={showLoadModal}
                onClose={() => setShowLoadModal(false)}
                onSuccess={handleLoadSuccess}
            />
        </>
    );
};

export default BalanceManagement;
