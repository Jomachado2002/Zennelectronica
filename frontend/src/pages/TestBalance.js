import React, { useState, useEffect } from 'react';
import { FaWallet, FaCreditCard, FaHistory, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import BalanceService from '../services/balanceService';
import BalanceWidget from '../components/BalanceWidget';
import LoadBalanceModal from '../components/LoadBalanceModal';
import displayINRCurrency from '../helpers/displayCurrency';

const TestBalance = () => {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

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
            const result = await BalanceService.getBalanceHistory(10);
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

    const testPayment = async () => {
        if (balance < 10000) {
            toast.error('Saldo insuficiente para la prueba');
            return;
        }

        try {
            const result = await BalanceService.payWithBalance({
                amount: 10000,
                description: 'Prueba de pago con saldo',
                items: [{
                    product_id: 'test-product',
                    name: 'Producto de Prueba',
                    quantity: 1,
                    unit_price: 10000,
                    total: 10000
                }],
                customer_info: {
                    name: 'Usuario de Prueba',
                    email: 'test@example.com'
                },
                reference: `TEST-${Date.now()}`
            });

            if (result.success) {
                toast.success('Pago de prueba exitoso!');
                fetchBalance();
                fetchHistory();
            } else {
                toast.error(result.message || 'Error en pago de prueba');
            }
        } catch (error) {
            console.error('Error en pago de prueba:', error);
            toast.error('Error en pago de prueba');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Prueba de Sistema de Saldo
                    </h1>
                    <p className="text-gray-600">
                        Prueba la funcionalidad de carga y pago con saldo
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Balance Widget */}
                    <div>
                        <BalanceWidget showActions={true} />
                    </div>

                    {/* Información detallada */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Estado del Saldo
                        </h3>
                        
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <FaSpinner className="animate-spin text-blue-600 mr-2" />
                                <span className="text-gray-500">Cargando...</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="text-gray-600">Saldo Actual:</span>
                                    <span className="font-semibold text-lg text-gray-900">
                                        {displayINRCurrency(balance)}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="text-gray-600">Estado:</span>
                                    <span className={`flex items-center gap-2 ${
                                        balance > 0 ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                        {balance > 0 ? (
                                            <>
                                                <FaCheckCircle />
                                                Disponible
                                            </>
                                        ) : (
                                            <>
                                                <FaExclamationTriangle />
                                                Sin saldo
                                            </>
                                        )}
                                    </span>
                                </div>

                                {/* Botones de prueba */}
                                <div className="space-y-3 pt-4">
                                    <button
                                        onClick={() => setShowLoadModal(true)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <FaCreditCard />
                                        Cargar Saldo
                                    </button>

                                    {balance >= 10000 && (
                                        <button
                                            onClick={testPayment}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            <FaWallet />
                                            Probar Pago (₲10.000)
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Historial de transacciones */}
                <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Historial de Transacciones
                        </h3>
                        <button
                            onClick={fetchHistory}
                            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <FaHistory />
                            Actualizar
                        </button>
                    </div>

                    {loadingHistory ? (
                        <div className="flex items-center justify-center py-8">
                            <FaSpinner className="animate-spin text-blue-600 mr-2" />
                            <span className="text-gray-500">Cargando historial...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <FaWallet className="text-4xl mx-auto mb-3 text-gray-300" />
                            <p>No hay transacciones registradas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((transaction, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            transaction.type === 'load' || transaction.type === 'bonus' || transaction.type === 'roulette_win'
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-red-100 text-red-600'
                                        }`}>
                                            {transaction.type === 'load' || transaction.type === 'bonus' || transaction.type === 'roulette_win' ? (
                                                <FaCheckCircle />
                                            ) : (
                                                <FaWallet />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {transaction.description}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {new Date(transaction.transaction_date).toLocaleString('es-PY')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${
                                            transaction.type === 'load' || transaction.type === 'bonus' || transaction.type === 'roulette_win'
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}>
                                            {transaction.type === 'load' || transaction.type === 'bonus' || transaction.type === 'roulette_win' ? '+' : '-'}
                                            {displayINRCurrency(transaction.amount)}
                                        </p>
                                        <p className="text-sm text-gray-500 capitalize">
                                            {transaction.type.replace('_', ' ')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Información de API */}
                <div className="mt-8 bg-blue-50 rounded-lg border border-blue-200 p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">
                        Información de API
                    </h3>
                    <div className="text-sm text-blue-800 space-y-2">
                        <p><strong>Backend URL:</strong> {process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080'}</p>
                        <p><strong>Rutas disponibles:</strong></p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>GET /api/perfil/saldo - Obtener saldo</li>
                            <li>POST /api/perfil/cargar-saldo - Cargar saldo</li>
                            <li>POST /api/perfil/pagar-con-saldo - Pagar con saldo</li>
                            <li>GET /api/perfil/historial-saldo - Historial</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Modal de carga de saldo */}
            <LoadBalanceModal
                isOpen={showLoadModal}
                onClose={() => setShowLoadModal(false)}
                onSuccess={handleLoadSuccess}
            />
        </div>
    );
};

export default TestBalance;
