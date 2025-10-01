// frontend/src/pages/BudgetsList.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import { FaFilePdf, FaEdit, FaTrashAlt, FaEye, FaFileDownload } from 'react-icons/fa';
import displayPYGCurrency from '../helpers/displayCurrency';

const BudgetsList = () => {
  const [budgets, setBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    clientName: ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBudgets(result.data.budgets || []);
      } else {
        toast.error(result.message || "Error al cargar los presupuestos");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (budgetId, newStatus) => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos/${budgetId}/estado`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Estado actualizado a "${newStatus}"`);
        // Actualizar el estado local
        setBudgets(budgets.map(budget => 
          budget._id === budgetId ? { ...budget, status: newStatus } : budget
        ));
      } else {
        toast.error(result.message || "Error al actualizar el estado");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) {
      return;
    }
    
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos/${budgetId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Presupuesto eliminado correctamente");
        // Actualizar la lista local
        setBudgets(budgets.filter(budget => budget._id !== budgetId));
      } else {
        toast.error(result.message || "Error al eliminar el presupuesto");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const downloadPDF = (budgetId, budgetNumber) => {
    // Crear un enlace temporal para la descarga
    const link = document.createElement('a');
    link.href = `${SummaryApi.baseURL}/api/finanzas/presupuestos/${budgetId}/pdf`;
    link.setAttribute('download', `presupuesto-${budgetNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrar presupuestos según los criterios
  const filteredBudgets = budgets.filter(budget => {
    const matchStatus = filter.status === '' || budget.status === filter.status;
    const matchClient = filter.clientName === '' || 
      (budget.client && budget.client.name && 
       budget.client.name.toLowerCase().includes(filter.clientName.toLowerCase()));
    
    return matchStatus && matchClient;
  });

  // Obtener el color según el estado
  const getStatusColor = (status) => {
    switch(status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtener etiqueta según el estado
  const getStatusLabel = (status) => {
    switch(status) {
      case 'draft': return 'Borrador';
      case 'sent': return 'Enviado';
      case 'accepted': return 'Aceptado';
      case 'rejected': return 'Rechazado';
      case 'expired': return 'Expirado';
      case 'converted': return 'Convertido';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Presupuestos</h1>
        
        <Link 
          to="/panel-admin/presupuestos/nuevo" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center"
        >
          <FaFilePdf className="mr-2" /> Crear Nuevo Presupuesto
        </Link>
      </div>
      
      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="status"
              value={filter.status}
              onChange={(e) => setFilter({...filter, status: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="sent">Enviado</option>
              <option value="accepted">Aceptado</option>
              <option value="rejected">Rechazado</option>
              <option value="expired">Expirado</option>
              <option value="converted">Convertido</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <input
              type="text"
              id="clientName"
              value={filter.clientName}
              onChange={(e) => setFilter({...filter, clientName: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Buscar por nombre de cliente"
            />
          </div>
          
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFilter({ status: '', clientName: '' })}
              className="p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabla de presupuestos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando presupuestos...</p>
          </div>
        ) : filteredBudgets.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No se encontraron presupuestos.</p>
            <p className="mt-2">
              <Link 
                to="/panel-admin/presupuestos/nuevo" 
                className="text-blue-600 hover:underline font-medium"
              >
                Crear el primer presupuesto
              </Link>
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Importe</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Válido hasta</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBudgets.map((budget) => (
                  <tr key={budget._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {budget.budgetNumber}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {budget.client ? (
                        <div>
                          <div className="font-medium">{budget.client.name}</div>
                          {budget.client.company && (
                            <div className="text-xs text-gray-400">{budget.client.company}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Cliente no disponible</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {displayPYGCurrency(budget.finalAmount)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="relative inline-block">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(budget.status)}`}>
                          {getStatusLabel(budget.status)}
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
                              {['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'].map((status) => (
                                <button
                                  key={status}
                                  className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left ${budget.status === status ? 'font-medium' : ''}`}
                                  onClick={() => handleStatusChange(budget._id, status)}
                                >
                                  {getStatusLabel(status)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                      {new Date(budget.validUntil).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => downloadPDF(budget._id, budget.budgetNumber)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Descargar PDF"
                        >
                          <FaFileDownload />
                        </button>
                        <Link
                          to={`/panel-admin/presupuestos/${budget._id}`}
                          className="text-green-600 hover:text-green-800"
                          title="Ver detalles"
                        >
                          <FaEye />
                        </Link>
                        <button
                          onClick={() => handleDeleteBudget(budget._id)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar presupuesto"
                        >
                          <FaTrashAlt />
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
    </div>
  );
};

export default BudgetsList;