import React, { useState, useEffect } from 'react';
import { FaCreditCard, FaWallet, FaSpinner, FaCheckCircle, FaTimes, FaShieldAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import BalanceService from '../services/balanceService';
import displayINRCurrency from '../helpers/displayCurrency';
import BancardPayButton from './BancardPayButton';

const LoadBalanceModal = ({ isOpen, onClose, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [paymentData, setPaymentData] = useState(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);

    // Montos predefinidos
    const predefinedAmounts = [50000, 100000, 200000, 500000, 1000000];

    useEffect(() => {
        if (isOpen) {
            fetchCurrentBalance();
        }
    }, [isOpen]);

    const fetchCurrentBalance = async () => {
        try {
            const result = await BalanceService.getUserBalance();
            if (result.success) {
                setCurrentBalance(result.data.current_balance);
            }
        } catch (error) {
            console.error('Error obteniendo saldo actual:', error);
        }
    };

    const handleAmountSelect = (selectedAmount) => {
        setAmount(selectedAmount.toString());
    };

    const handleLoadBalance = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Por favor ingresa un monto válido');
            return;
        }

        setLoading(true);
        try {
            // Usar el mismo servicio que el carrito para crear el pago
            const result = await BalanceService.loadBalanceWithBancard(amount);
            
            if (result.success) {
                // Preparar datos para el componente de pago
                setPaymentData({
                    amount: parseFloat(amount),
                    currency: 'PYG',
                    description: `Carga de saldo - ${displayINRCurrency(amount)}`,
                    shop_process_id: result.data.shop_process_id,
                    process_id: result.data.process_id,
                    iframe_config: result.data.iframe_config,
                    return_url: result.data.return_url,
                    cancel_url: result.data.cancel_url
                });
                setShowPaymentForm(true);
                toast.success('Procesando carga de saldo...');
            } else {
                toast.error(result.message || 'Error al iniciar carga de saldo');
            }
        } catch (error) {
            console.error('Error cargando saldo:', error);
            toast.error('Error al cargar saldo. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = (paymentResult) => {
        toast.success('¡Saldo cargado exitosamente!');
        setShowPaymentForm(false);
        setPaymentData(null);
        setAmount('');
        fetchCurrentBalance();
        if (onSuccess) onSuccess();
    };

    const handlePaymentError = (error) => {
        console.error('Error en pago:', error);
        toast.error('Error al procesar el pago. Intenta nuevamente.');
        setShowPaymentForm(false);
        setPaymentData(null);
    };

    const handlePaymentCancel = () => {
        setShowPaymentForm(false);
        setPaymentData(null);
        toast.info('Carga de saldo cancelada');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FaWallet className="text-blue-600 text-lg" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Cargar Saldo</h2>
                            <p className="text-sm text-gray-500">Tu saldo actual: {displayINRCurrency(currentBalance)}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <FaTimes className="text-xl" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!showPaymentForm ? (
                        <>
                            {/* Montos predefinidos */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Monto sugerido</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {predefinedAmounts.map((predefinedAmount) => (
                                        <button
                                            key={predefinedAmount}
                                            onClick={() => handleAmountSelect(predefinedAmount)}
                                            className={`p-4 rounded-lg border-2 text-center transition-all ${
                                                amount === predefinedAmount.toString()
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            }`}
                                        >
                                            <div className="font-semibold text-lg">{displayINRCurrency(predefinedAmount)}</div>
                                            <div className="text-xs text-gray-500 mt-1">PYG</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Input personalizado */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    O ingresa un monto personalizado
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                                        min="1000"
                                        step="1000"
                                    />
                                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                                        PYG
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Monto mínimo: {displayINRCurrency(1000)}
                                </p>
                            </div>

                            {/* Información de pago */}
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 mb-6 border border-blue-200">
                                <div className="flex items-start gap-3">
                                    <FaShieldAlt className="text-blue-600 mt-1 text-lg" />
                                    <div>
                                        <h4 className="font-medium text-blue-900 mb-1">Pago 100% Seguro</h4>
                                        <p className="text-sm text-blue-700">
                                            Tu pago será procesado por Bancard con encriptación SSL. El saldo se acreditará inmediatamente después de la confirmación.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleLoadBalance}
                                    disabled={!amount || parseFloat(amount) < 1000 || loading}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                                >
                                    {loading ? (
                                        <>
                                            <FaSpinner className="animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <FaCreditCard />
                                            Cargar Saldo
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Formulario de pago mejorado */}
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <FaCreditCard className="text-white text-2xl" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    Completar Pago
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Monto a cargar: <span className="font-bold text-blue-600 text-lg">{displayINRCurrency(amount)}</span>
                                </p>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-sm text-green-700">
                                        <FaCheckCircle className="inline mr-1" />
                                        Pago seguro procesado por Bancard
                                    </p>
                                </div>
                            </div>

                            {/* Usar el componente BancardPayButton */}
                            {paymentData && (
                                <BancardPayButton
                                    paymentData={paymentData}
                                    onSuccess={handlePaymentSuccess}
                                    onError={handlePaymentError}
                                    onCancel={handlePaymentCancel}
                                    customContainerId="bancard-balance-container"
                                />
                            )}

                            {/* Botón de cancelar */}
                            <button
                                onClick={handlePaymentCancel}
                                className="w-full mt-4 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancelar Pago
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadBalanceModal;
