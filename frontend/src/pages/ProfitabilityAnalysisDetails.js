// frontend/src/pages/ProfitabilityAnalysisDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaEdit, FaTrash, FaFileDownload, FaChartLine, FaTrophy } from 'react-icons/fa';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const ProfitabilityAnalysisDetails = () => {
  const { analysisId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchAnalysisDetails();
  }, [analysisId]);
  
  const fetchAnalysisDetails = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/analisis-rentabilidad/${analysisId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAnalysis(result.data);
      } else {
        toast.error(result.message || "Error al cargar el análisis");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteAnalysis = async () => {
    if (!window.confirm('¿Está seguro de que desea eliminar este análisis? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/analisis-rentabilidad/${analysisId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Análisis eliminado correctamente");
        navigate("/panel-admin/analisis-rentabilidad");
      } else {
        toast.error(result.message || "Error al eliminar el análisis");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };
  
  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/analisis-rentabilidad/${analysisId}/estado`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Estado actualizado a "${getStatusLabel(newStatus)}"`);
        setAnalysis({
          ...analysis,
          status: newStatus
        });
      } else {
        toast.error(result.message || "Error al actualizar el estado");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };
  
  // Obtener el color según el estado
  const getStatusColor = (status) => {
    switch(status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Obtener etiqueta según el estado
  const getStatusLabel = (status) => {
    switch(status) {
      case 'draft': return 'Borrador';
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };
  
  const getBestMarginItem = () => {
    if (!analysis || !analysis.items) return null;
    return analysis.items.reduce((best, current) => 
      (best.profitMargin > current.profitMargin) ? best : current
    );
  };
  
  const getWorstMarginItem = () => {
    if (!analysis || !analysis.items) return null;
    return analysis.items.reduce((worst, current) => 
      (worst.profitMargin < current.profitMargin) ? worst : current
    );
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Cargando detalles del análisis...</p>
      </div>
    );
  }
  
  if (!analysis) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 p-4 rounded-lg border border-red-300 mb-4">
          <p className="text-red-800">No se pudo cargar el análisis de rentabilidad solicitado.</p>
        </div>
        <Link to="/panel-admin/analisis-rentabilidad" className="text-blue-600 hover:underline inline-flex items-center">
          <FaArrowLeft className="mr-2" /> Volver a la lista de análisis
        </Link>
      </div>
    );
  }
  
  const bestItem = getBestMarginItem();
  const worstItem = getWorstMarginItem();
  
  return (
    <div className="container mx-auto p-4">
      <Link to="/panel-admin/analisis-rentabilidad" className="text-blue-600 hover:underline mb-6 inline-flex items-center">
        <FaArrowLeft className="mr-2" /> Volver a la lista de análisis
      </Link>
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <FaChartLine className="mr-2 text-blue-600" />
            Análisis {analysis.analysisNumber}
          </h1>
          <div className="flex items-center mt-1">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mr-2 ${getStatusColor(analysis.status)}`}>
              {getStatusLabel(analysis.status)}
            </span>
            <span className="text-gray-500 text-sm">
              Creado el {new Date(analysis.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <button
            onClick={handleDeleteAnalysis}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 inline-flex items-center"
          >
            <FaTrash className="mr-2" /> Eliminar
          </button>
        </div>
      </div>
      
      {/* Información del presupuesto y cliente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Presupuesto</h3>
          
          {analysis.budget ? (
            <div className="space-y-2">
              <p className="font-medium">{analysis.budget.budgetNumber}</p>
              <p className="text-sm text-gray-600">
                Estado: <span className="font-medium">{analysis.budget.status}</span>
              </p>
              <p className="text-sm text-gray-600">
                Monto: <span className="font-medium">{displayPYGCurrency(analysis.budget.finalAmount)}</span>
              </p>
              <p className="text-sm text-gray-600">
                Válido hasta: {new Date(analysis.budget.validUntil).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-gray-500 italic">Información de presupuesto no disponible</p>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Cliente</h3>
          
          {analysis.client ? (
            <div className="space-y-2">
              <p className="font-medium">{analysis.client.name}</p>
              {analysis.client.company && <p>{analysis.client.company}</p>}
              {analysis.client.email && (
                <p className="text-sm">
                  <span className="font-medium">Email:</span> {analysis.client.email}
                </p>
              )}
              {analysis.client.phone && (
                <p className="text-sm">
                  <span className="font-medium">Teléfono:</span> {analysis.client.phone}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">Información de cliente no disponible</p>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Resumen</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Costos:</span>
              <span className="font-medium">{displayPYGCurrency(analysis.totals.totalCosts)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Total Ingresos:</span>
              <span className="font-medium">{displayPYGCurrency(analysis.totals.totalRevenue)}</span>
            </div>
            
            <div className="flex justify-between pt-2 border-t font-bold text-lg">
              <span>Ganancia:</span>
              <span className={analysis.totals.totalGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {displayPYGCurrency(analysis.totals.totalGrossProfit)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Margen Promedio:</span>
              <span className={`font-semibold ${analysis.totals.averageProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.totals.averageProfitMargin.toFixed(2)}%
              </span>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="font-medium">Cambiar estado:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['draft', 'confirmed', 'completed', 'cancelled'].map(status => (
                <button
                  key={status}
                  className={`px-2 py-1 text-xs rounded-full ${
                    analysis.status === status 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => handleStatusChange(status)}
                  disabled={analysis.status === status}
                >
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mejores y peores márgenes */}
      {bestItem && worstItem && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 pb-2 border-b border-green-200 flex items-center">
              <FaTrophy className="mr-2 text-yellow-500" />
              Mejor Margen
            </h3>
            <div>
              <p className="font-medium">{bestItem.productSnapshot.name}</p>
              <p className="text-sm text-gray-600">{bestItem.supplierSnapshot.name}</p>
              <p className="text-lg font-bold text-green-600 mt-2">
                {bestItem.profitMargin.toFixed(2)}% - {displayPYGCurrency(bestItem.totalGrossProfit)}
              </p>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 pb-2 border-b border-red-200">
              Menor Margen
            </h3>
            <div>
              <p className="font-medium">{worstItem.productSnapshot.name}</p>
              <p className="text-sm text-gray-600">{worstItem.supplierSnapshot.name}</p>
              <p className="text-lg font-bold text-red-600 mt-2">
                {worstItem.profitMargin.toFixed(2)}% - {displayPYGCurrency(worstItem.totalGrossProfit)}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabla de productos */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <h3 className="text-lg font-semibold p-4 border-b">Análisis Detallado por Producto</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Compra</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Venta</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ganancia</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Margen</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Entrega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analysis.items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-4">
                    <div className="font-medium">{item.productSnapshot?.name || 'Producto'}</div>
                    {item.productSnapshot?.brandName && (
                      <div className="text-sm text-gray-500">{item.productSnapshot.brandName}</div>
                    )}
                    {item.productSnapshot?.description && (
                      <div className="text-xs text-gray-400 mt-1">{item.productSnapshot.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium">{item.supplierSnapshot?.name || 'Proveedor'}</div>
                    {item.supplierSnapshot?.phone && (
                      <div className="text-sm text-gray-500">{item.supplierSnapshot.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">{item.quantity}</td>
                  <td className="px-4 py-4 text-right">
                    <div>{displayPYGCurrency(item.purchasePricePYG)}</div>
                    <div className="text-xs text-gray-500">
                      {item.purchasePrice} {item.purchaseCurrency}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-medium">
                    {displayPYGCurrency(item.totalCostPerUnit * item.quantity)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {displayPYGCurrency(item.sellingPrice * item.quantity)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium">
                    <span className={item.totalGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {displayPYGCurrency(item.totalGrossProfit)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`font-semibold ${item.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.profitMargin.toFixed(2)}%
                    </span>
                    {item === bestItem && (
                      <FaTrophy className="text-yellow-500 ml-1 inline" />
                    )}
                  </td>
                  <td className="px-4 py-4 text-center text-sm">
                    {item.deliveryTime || 'No especificado'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analysis.estimatedDeliveryDate && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Información de Entrega</h3>
            <p>
              <span className="font-medium">Fecha estimada:</span> {new Date(analysis.estimatedDeliveryDate).toLocaleDateString()}
            </p>
            {analysis.actualDeliveryDate && (
              <p className="mt-2">
                <span className="font-medium">Fecha real:</span> {new Date(analysis.actualDeliveryDate).toLocaleDateString()}
              </p>
            )}
            {analysis.orderPlacedDate && (
              <p className="mt-2">
                <span className="font-medium">Pedido realizado:</span> {new Date(analysis.orderPlacedDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
        
        {analysis.notes && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Notas</h3>
            <p className="whitespace-pre-line">{analysis.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitabilityAnalysisDetails;