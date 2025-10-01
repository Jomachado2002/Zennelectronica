// frontend/src/pages/ProfitabilityAnalysis.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaEye, FaEdit, FaTrash, FaCalculator, FaChartLine, FaFileAlt } from 'react-icons/fa';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const ProfitabilityAnalysis = () => {
  const [analyses, setAnalyses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    supplierId: searchParams.get('supplierId') || '',
    clientId: searchParams.get('clientId') || '',
    budgetId: searchParams.get('budgetId') || ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalyses();
  }, [filters]);

  const fetchAnalyses = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/analisis-rentabilidad?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAnalyses(result.data.analyses || []);
      } else {
        toast.error(result.message || "Error al cargar los análisis");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAnalysis = async (analysisId) => {
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
        fetchAnalyses();
      } else {
        toast.error(result.message || "Error al eliminar el análisis");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const handleStatusChange = async (analysisId, newStatus) => {
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
        fetchAnalyses();
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      supplierId: '',
      clientId: '',
      budgetId: ''
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <FaChartLine className="mr-2 text-blue-600" />
            Análisis de Rentabilidad
          </h1>
          <p className="text-gray-600 mt-1">Compara precios y márgenes de ganancia entre proveedores</p>
        </div>
        
        <div className="flex space-x-2">
          <Link 
            to="/panel-admin/analisis-rentabilidad/comparar" 
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 inline-flex items-center"
          >
            <FaCalculator className="mr-2" /> Comparar Precios
          </Link>
          <Link 
            to="/panel-admin/analisis-rentabilidad/nuevo" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center"
          >
            <FaPlus className="mr-2" /> Nuevo Análisis
          </Link>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="budgetId" className="block text-sm font-medium text-gray-700 mb-1">
              ID Presupuesto
            </label>
            <input
              type="text"
              id="budgetId"
              value={filters.budgetId}
              onChange={(e) => handleFilterChange('budgetId', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Buscar por presupuesto"
            />
          </div>
          
          <div>
            <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-1">
              ID Proveedor
            </label>
            <input
              type="text"
              id="supplierId"
              value={filters.supplierId}
              onChange={(e) => handleFilterChange('supplierId', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Buscar por proveedor"
            />
          </div>
          
          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabla de análisis */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando análisis...</p>
          </div>
        ) : analyses.length === 0 ? (
          <div className="p-8 text-center">
            <FaFileAlt className="text-5xl text-gray-300 mx-auto mb-4" />
            <p className="text-lg text-gray-500">No se encontraron análisis de rentabilidad.</p>
            <p className="mt-2">
              <Link 
                to="/panel-admin/analisis-rentabilidad/nuevo" 
                className="text-blue-600 hover:underline font-medium"
              >
                Crear el primer análisis
              </Link>
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº Análisis</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presupuesto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Costos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Ingresos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ganancia</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Margen %</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyses.map((analysis) => (
                  <tr key={analysis._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {analysis.analysisNumber}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {analysis.budget ? (
                        <div>
                          <div className="font-medium">{analysis.budget.budgetNumber}</div>
                          <div className="text-xs text-gray-400">
                            Válido hasta: {new Date(analysis.budget.validUntil).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Presupuesto no disponible</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {analysis.client ? (
                        <div>
                          <div className="font-medium">{analysis.client.name}</div>
                          {analysis.client.company && (
                            <div className="text-xs text-gray-400">{analysis.client.company}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Cliente no disponible</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {displayPYGCurrency(analysis.totals.totalCosts)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {displayPYGCurrency(analysis.totals.totalRevenue)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={analysis.totals.totalGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {displayPYGCurrency(analysis.totals.totalGrossProfit)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`font-semibold ${analysis.totals.averageProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analysis.totals.averageProfitMargin.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="relative inline-block">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(analysis.status)}`}>
                          {getStatusLabel(analysis.status)}
                        </span>
                        
                        {/* Menú desplegable para cambiar estado */}
                        <div className="group relative">
                          <button className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <div className="absolute right-0 mt-2 hidden group-hover:block z-10 w-48 bg-white rounded-md shadow-lg">
                            <div className="py-1">
                              {['draft', 'confirmed', 'completed', 'cancelled'].map((status) => (
                                <button
                                  key={status}
                                  className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left ${analysis.status === status ? 'font-medium' : ''}`}
                                  onClick={() => handleStatusChange(analysis._id, status)}
                                >
                                  {getStatusLabel(status)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <Link
                          to={`/panel-admin/analisis-rentabilidad/${analysis._id}`}
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver detalles"
                        >
                          <FaEye />
                        </Link>
                        <Link
                          to={`/panel-admin/analisis-rentabilidad/${analysis._id}/editar`}
                          className="text-green-600 hover:text-green-800"
                          title="Editar"
                        >
                          <FaEdit />
                        </Link>
                        <button
                          onClick={() => handleDeleteAnalysis(analysis._id)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar análisis"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Resumen estadístico */}
      {analyses.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Total Análisis</div>
            <div className="text-2xl font-bold text-gray-900">{analyses.length}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Ganancia Total</div>
            <div className="text-2xl font-bold text-green-600">
              {displayPYGCurrency(analyses.reduce((sum, a) => sum + a.totals.totalGrossProfit, 0))}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Margen Promedio</div>
            <div className="text-2xl font-bold text-blue-600">
              {(analyses.reduce((sum, a) => sum + a.totals.averageProfitMargin, 0) / analyses.length).toFixed(2)}%
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Análisis Completados</div>
            <div className="text-2xl font-bold text-purple-600">
              {analyses.filter(a => a.status === 'completed').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitabilityAnalysis;