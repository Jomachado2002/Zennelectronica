import React, { useState, useEffect } from 'react';
import { FaWallet, FaPlus, FaHistory, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import BalanceService from '../services/balanceService';
import displayINRCurrency from '../helpers/displayCurrency';
import LoadBalanceModal from './LoadBalanceModal';

const BalanceWidget = ({ className = '', showActions = true }) => {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showLoadModal, setShowLoadModal] = useState(false);

    useEffect(() => {
        fetchBalance();
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

    const handleLoadSuccess = () => {
        fetchBalance();
        setShowLoadModal(false);
    };

    return (
        <>
            <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
                <div className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <FaWallet className="text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Mi Saldo</h3>
                                <p className="text-sm text-gray-500">Zenn Wallet</p>
                            </div>
                        </div>
                        
                        {showActions && (
                            <button
                                onClick={() => setShowLoadModal(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                <FaPlus className="text-xs" />
                                Cargar
                            </button>
                        )}
                    </div>

                    {/* Balance */}
                    <div className="mb-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-4">
                                <FaSpinner className="animate-spin text-blue-600 mr-2" />
                                <span className="text-gray-500">Cargando saldo...</span>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900 mb-1">
                                    {displayINRCurrency(balance)}
                                </div>
                                <p className="text-sm text-gray-500">
                                    {balance === 0 ? 'Sin saldo disponible' : 'Saldo disponible'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    {showActions && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowLoadModal(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                <FaPlus className="text-xs" />
                                Cargar Saldo
                            </button>
                            <button
                                onClick={() => {
                                    // Aquí podrías abrir un modal con el historial
                                    toast.info('Historial de transacciones - Próximamente');
                                }}
                                className="flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Ver historial"
                            >
                                <FaHistory className="text-sm" />
                            </button>
                        </div>
                    )}
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

export default BalanceWidget;
