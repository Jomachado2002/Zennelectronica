import React, { useState, useEffect } from 'react';
import { FaDollarSign, FaChartLine, FaHistory, FaCalculator, FaSave, FaEye, FaRefresh } from 'react-icons/fa';
import SummaryApi from '../common';
import { toast } from 'react-toastify';

const ExchangeRateConfig = () => {
    const [currentRate, setCurrentRate] = useState(7300);
    const [lastUpdate, setLastUpdate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({});
    
    // Formulario de actualización
    const [newRate, setNewRate] = useState('');
    const [notes, setNotes] = useState('');
    const [updateProducts, setUpdateProducts] = useState(true);
    
    // Simulación
    const [simulationResults, setSimulationResults] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Cargar datos iniciales
    useEffect(() => {
        fetchCurrentRate();
        fetchHistory();
        fetchStats();
    }, []);

    // Obtener tipo de cambio actual
    const fetchCurrentRate = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(SummaryApi.exchangeRate.current.url);
            const data = await response.json();
            if (data.success) {
                setCurrentRate(data.data.rate);
                setLastUpdate(new Date(data.data.effectiveDate).toLocaleString());
            }
        } catch (error) {
            console.error('Error obteniendo tipo de cambio:', error);
            toast.error('Error al obtener el tipo de cambio actual');
        } finally {
            setIsLoading(false);
        }
    };

    // Obtener historial
    const fetchHistory = async () => {
        try {
            const response = await fetch(`${SummaryApi.exchangeRate.history.url}?days=30`);
            const data = await response.json();
            if (data.success) {
                setHistory(data.data);
            }
        } catch (error) {
            console.error('Error obteniendo historial:', error);
        }
    };

    // Obtener estadísticas
    const fetchStats = async () => {
        try {
            const response = await fetch(`${SummaryApi.exchangeRate.stats.url}?days=30`);
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
        }
    };

    // Simular actualización
    const handleSimulate = async () => {
        if (!newRate || newRate <= 0) {
            toast.error('Ingrese un tipo de cambio válido');
            return;
        }

        try {
            setIsSimulating(true);
            const response = await fetch(SummaryApi.exchangeRate.simulate.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    currency: 'USD',
                    newRate: parseFloat(newRate)
                })
            });
            
            const data = await response.json();
            if (data.success) {
                setSimulationResults(data.data);
            } else {
                toast.error(data.message || 'Error en la simulación');
            }
        } catch (error) {
            console.error('Error simulando:', error);
            toast.error('Error al simular la actualización');
        } finally {
            setIsSimulating(false);
        }
    };

    // Actualizar tipo de cambio
    const handleUpdate = async () => {
        if (!newRate || newRate <= 0) {
            toast.error('Ingrese un tipo de cambio válido');
            return;
        }

        if (!window.confirm('¿Está seguro de que desea actualizar el tipo de cambio? Esta acción afectará todos los productos.')) {
            return;
        }

        try {
            setIsUpdating(true);
            const response = await fetch(SummaryApi.exchangeRate.update.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    currency: 'USD',
                    newRate: parseFloat(newRate),
                    notes: notes,
                    updateProducts: updateProducts,
                    source: 'manual'
                })
            });
            
            const data = await response.json();
            if (data.success) {
                toast.success('Tipo de cambio actualizado exitosamente');
                setNewRate('');
                setNotes('');
                setSimulationResults(null);
                fetchCurrentRate();
                fetchHistory();
                fetchStats();
            } else {
                toast.error(data.message || 'Error al actualizar el tipo de cambio');
            }
        } catch (error) {
            console.error('Error actualizando:', error);
            toast.error('Error al actualizar el tipo de cambio');
        } finally {
            setIsUpdating(false);
        }
    };

    // Formatear fecha
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('es-PY');
    };

    // Calcular cambio porcentual
    const calculateChangePercentage = (current, previous) => {
        if (!previous || previous === 0) return 0;
        return ((current - previous) / previous * 100).toFixed(2);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                    <FaDollarSign className="mr-3 text-green-600" />
                    Gestión del Tipo de Cambio USD/PYG
                </h1>
                <p className="text-gray-600 mt-2">
                    Administre el tipo de cambio y actualice los precios de los productos automáticamente
                </p>
            </div>

            {/* Card Principal - Tipo de Cambio Actual */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Tipo de Cambio Actual</h2>
                        <div className="text-4xl font-bold text-green-600 mb-2">
                            {currentRate.toLocaleString()} Gs
                        </div>
                        <p className="text-sm text-gray-500">
                            Última actualización: {lastUpdate}
                        </p>
                    </div>
                    <button
                        onClick={fetchCurrentRate}
                        disabled={isLoading}
                        className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <FaRefresh className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Formulario de Actualización */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <FaCalculator className="mr-2 text-blue-600" />
                    Actualizar Tipo de Cambio
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nuevo Tipo de Cambio (USD/PYG)
                        </label>
                        <input
                            type="number"
                            value={newRate}
                            onChange={(e) => setNewRate(e.target.value)}
                            placeholder="Ej: 6900"
                            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            step="1"
                            min="0"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Notas sobre la actualización
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Actualización por cambio de mercado"
                            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={updateProducts}
                            onChange={(e) => setUpdateProducts(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                            Actualizar precios de productos automáticamente
                        </span>
                    </label>
                </div>

                <div className="flex gap-4 mt-6">
                    <button
                        onClick={handleSimulate}
                        disabled={isSimulating || !newRate}
                        className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors flex items-center"
                    >
                        <FaEye className="mr-2" />
                        {isSimulating ? 'Simulando...' : 'Vista Previa'}
                    </button>
                    
                    <button
                        onClick={handleUpdate}
                        disabled={isUpdating || !newRate}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
                    >
                        <FaSave className="mr-2" />
                        {isUpdating ? 'Actualizando...' : 'Actualizar y Aplicar'}
                    </button>
                </div>
            </div>

            {/* Resultados de Simulación */}
            {simulationResults && (
                <div className="bg-blue-50 rounded-lg p-6 mb-6 border-2 border-blue-200">
                    <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                        <FaChartLine className="mr-2" />
                        Impacto Estimado de la Actualización
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Cambio</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {simulationResults.change > 0 ? '+' : ''}{simulationResults.change.toLocaleString()} Gs
                            </p>
                            <p className="text-sm text-gray-500">
                                ({simulationResults.changePercentage}%)
                            </p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Productos Afectados</p>
                            <p className="text-2xl font-bold text-green-600">
                                {simulationResults.affectedProducts}
                            </p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Precios Aumentarían</p>
                            <p className="text-2xl font-bold text-red-600">
                                {simulationResults.priceIncreaseCount}
                            </p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Precios Disminuirían</p>
                            <p className="text-2xl font-bold text-green-600">
                                {simulationResults.priceDecreaseCount}
                            </p>
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <p className="text-sm text-gray-600">
                            Cambio promedio de precio: {simulationResults.averagePriceChange.toLocaleString()} Gs
                        </p>
                    </div>
                </div>
            )}

            {/* Estadísticas Generales */}
            {stats && Object.keys(stats).length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <FaChartLine className="mr-2 text-purple-600" />
                        Estadísticas (Últimos 30 días)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Total de Actualizaciones</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {stats.totalUpdates || 0}
                            </p>
                        </div>
                        
                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Productos Promedio Afectados</p>
                            <p className="text-2xl font-bold text-green-600">
                                {Math.round(stats.avgAffectedProducts || 0)}
                            </p>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Duración Promedio</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {Math.round(stats.avgUpdateDuration || 0)}ms
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Historial de Cambios */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <FaHistory className="mr-2 text-gray-600" />
                    Historial de Cambios
                </h3>
                
                {history.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay historial disponible</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo de Cambio</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Cambio</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Productos Afectados</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Fuente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item, index) => {
                                    const previousRate = index < history.length - 1 ? history[index + 1].toPYG : null;
                                    const change = previousRate ? item.toPYG - previousRate : 0;
                                    const changePercentage = calculateChangePercentage(item.toPYG, previousRate);
                                    
                                    return (
                                        <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {formatDate(item.effectiveDate)}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-semibold text-gray-800">
                                                {item.toPYG.toLocaleString()} Gs
                                            </td>
                                            <td className="py-3 px-4 text-sm">
                                                <span className={`font-semibold ${
                                                    change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-600'
                                                }`}>
                                                    {change > 0 ? '+' : ''}{change.toLocaleString()} Gs
                                                    {changePercentage !== 0 && ` (${changePercentage}%)`}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {item.updateMetadata?.affectedProducts || 0}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    item.source === 'manual' ? 'bg-blue-100 text-blue-800' :
                                                    item.source === 'api' ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {item.source}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExchangeRateConfig;
