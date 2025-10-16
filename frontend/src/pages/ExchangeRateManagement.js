import React, { useState, useEffect } from 'react';
import { 
  FaDollarSign, 
  FaSync, 
  FaHistory, 
  FaChartLine, 
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaUpload,
  FaDownload
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common/index';

const ExchangeRateManagement = () => {
  const [currentRate, setCurrentRate] = useState(null);
  const [newRate, setNewRate] = useState('');
  const [notes, setNotes] = useState('');
  const [updateProducts, setUpdateProducts] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [history, setHistory] = useState([]);
  const [simulationResults, setSimulationResults] = useState(null);
  const [showSimulation, setShowSimulation] = useState(false);

  // Cargar tipo de cambio actual
  const fetchCurrentRate = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(SummaryApi.exchangeRate.current.url);
      const data = await response.json();
      
      if (data.success) {
        setCurrentRate(data.data);
      } else {
        toast.error('Error al cargar el tipo de cambio actual');
      }
    } catch (error) {
      console.error('Error fetching current rate:', error);
      toast.error('Error al cargar el tipo de cambio actual');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar historial
  const fetchHistory = async () => {
    try {
      const response = await fetch(SummaryApi.exchangeRate.history.url);
      const data = await response.json();
      
      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // Simular actualización
  const simulateUpdate = async () => {
    if (!newRate || newRate <= 0) {
      toast.error('Ingrese un tipo de cambio válido');
      return;
    }

    try {
      setIsUpdating(true);
      const response = await fetch(SummaryApi.exchangeRate.simulate.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          newRate: parseFloat(newRate),
          updateProducts: updateProducts
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSimulationResults(data.data);
        setShowSimulation(true);
        toast.success('Simulación completada');
      } else {
        toast.error(data.message || 'Error en la simulación');
      }
    } catch (error) {
      console.error('Error simulating update:', error);
      toast.error('Error en la simulación');
    } finally {
      setIsUpdating(false);
    }
  };

  // Actualizar tipo de cambio
  const updateExchangeRate = async () => {
    if (!newRate || newRate <= 0) {
      toast.error('Ingrese un tipo de cambio válido');
      return;
    }

    try {
      setIsUpdating(true);
      const response = await fetch(SummaryApi.exchangeRate.update.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
        setShowSimulation(false);
        setSimulationResults(null);
        
        // Recargar datos
        await fetchCurrentRate();
        await fetchHistory();
        
        // Mostrar resultados de actualización
        if (data.data.updateResults) {
          const results = data.data.updateResults;
          toast.info(
            `Actualizados ${results.affectedProducts} productos. ` +
            `Aumentos: ${results.priceIncreases}, ` +
            `Disminuciones: ${results.priceDecreases}`
          );
        }
      } else {
        toast.error(data.message || 'Error al actualizar el tipo de cambio');
      }
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      toast.error('Error al actualizar el tipo de cambio');
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchCurrentRate();
    fetchHistory();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FaDollarSign className="mr-3 text-green-600" />
            Gestión del Tipo de Cambio USD/PYG
          </h1>
          <p className="text-gray-600 mt-2">
            Administre el tipo de cambio y actualice los precios de los productos automáticamente
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel Principal - Actualización */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <FaSync className="mr-2 text-blue-600" />
                Actualizar Tipo de Cambio
              </h2>

              {/* Tipo de cambio actual */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">Tipo de Cambio Actual</h3>
                    {currentRate ? (
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-green-600">
                          1 USD = {currentRate.rate.toLocaleString()} PYG
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          Última actualización: {formatDate(currentRate.effectiveDate)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Fuente: {currentRate.source}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2">
                        {isLoading ? (
                          <div className="flex items-center">
                            <FaSpinner className="animate-spin mr-2" />
                            <span>Cargando...</span>
                          </div>
                        ) : (
                          <span className="text-red-500">No disponible</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={fetchCurrentRate}
                    disabled={isLoading}
                    className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                    title="Actualizar"
                  >
                    <FaSync className={isLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Formulario de actualización */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nuevo Tipo de Cambio (PYG por USD)
                  </label>
                  <input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="Ej: 7600"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Motivo de la actualización..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="updateProducts"
                    checked={updateProducts}
                    onChange={(e) => setUpdateProducts(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="updateProducts" className="ml-2 block text-sm text-gray-700">
                    Actualizar precios de productos automáticamente
                  </label>
                </div>

                {updateProducts && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start">
                      <FaExclamationTriangle className="text-blue-500 mt-0.5 mr-2" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Actualización automática habilitada</p>
                        <p className="mt-1">
                          Se actualizarán todos los productos que tengan precio en USD configurado.
                          Esta acción puede tomar varios segundos.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={simulateUpdate}
                    disabled={isUpdating || !newRate}
                    className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? (
                      <FaSpinner className="animate-spin mr-2" />
                    ) : (
                      <FaChartLine className="mr-2" />
                    )}
                    Simular Actualización
                  </button>

                  <button
                    onClick={updateExchangeRate}
                    disabled={isUpdating || !newRate}
                    className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? (
                      <FaSpinner className="animate-spin mr-2" />
                    ) : (
                      <FaCheckCircle className="mr-2" />
                    )}
                    Actualizar Tipo de Cambio
                  </button>
                </div>
              </div>

              {/* Resultados de simulación */}
              {showSimulation && simulationResults && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <h3 className="text-lg font-medium text-yellow-800 mb-3">
                    Resultados de la Simulación
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Productos afectados:</span>
                      <p className="text-yellow-700">{simulationResults.totalProducts}</p>
                    </div>
                    <div>
                      <span className="font-medium">Aumentos:</span>
                      <p className="text-green-600">{simulationResults.priceIncreases}</p>
                    </div>
                    <div>
                      <span className="font-medium">Disminuciones:</span>
                      <p className="text-red-600">{simulationResults.priceDecreases}</p>
                    </div>
                    <div>
                      <span className="font-medium">Sin cambios:</span>
                      <p className="text-gray-600">{simulationResults.unchangedPrices}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel Lateral - Historial */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <FaHistory className="mr-2 text-gray-600" />
                Historial de Cambios
              </h2>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {history.length > 0 ? (
                  history.map((rate, index) => (
                    <div
                      key={rate._id}
                      className={`p-3 rounded-lg border ${
                        rate.isActive 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">
                          {rate.toPYG.toLocaleString()} PYG
                        </span>
                        {rate.isActive && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(rate.effectiveDate)}
                      </p>
                      {rate.notes && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          "{rate.notes}"
                        </p>
                      )}
                      {rate.change && (
                        <p className={`text-xs mt-1 ${
                          rate.change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {rate.change > 0 ? '+' : ''}{rate.change.toLocaleString()} PYG 
                          ({rate.changePercentage}%)
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No hay historial disponible
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRateManagement;
