import React, { useState, useEffect } from 'react';
import { FaWallet, FaSpinner, FaPlus } from 'react-icons/fa';
import BalanceService from '../services/balanceService';
import displayINRCurrency from '../helpers/displayCurrency';

const BalanceDisplay = ({ className = '', showLoadButton = false, onLoadBalance = null }) => {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetchBalance();
    }, []);

    const fetchBalance = async () => {
        try {
            setLoading(true);
            setError(false);
            const result = await BalanceService.getUserBalance();
            if (result.success) {
                setBalance(result.data.current_balance);
            }
        } catch (error) {
            console.error('Error obteniendo saldo:', error);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`flex items-center gap-2 text-gray-600 ${className}`}>
                <FaSpinner className="animate-spin text-sm" />
                <span className="text-sm">Cargando saldo...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
                <FaWallet className="text-sm" />
                <span className="text-sm">Error al cargar saldo</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="flex items-center gap-2">
                <FaWallet className="text-sm text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                    {displayINRCurrency(balance)}
                </span>
            </div>
            
            {showLoadButton && onLoadBalance && (
                <button
                    onClick={onLoadBalance}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
                    title="Cargar saldo"
                >
                    <FaPlus className="text-xs" />
                    <span>Cargar</span>
                </button>
            )}
        </div>
    );
};

export default BalanceDisplay;
