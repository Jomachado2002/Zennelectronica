// frontend/src/pages/ClientDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaArrowLeft, FaFilePdf } from 'react-icons/fa';
import SummaryApi from '../common';
import { toast } from 'react-toastify';

const ClientDetails = () => {
  const { clientId } = useParams();
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClientDetails();
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/clientes/${clientId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setClient(result.data);
      } else {
        toast.error(result.message || "Error al cargar los detalles del cliente");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClient = () => {
    navigate(`/panel-admin/clientes/editar/${clientId}`);
  };

  const handleDeleteClient = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/clientes/${clientId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Cliente eliminado correctamente");
        navigate("/panel-admin/clientes");
      } else {
        toast.error(result.message || "Error al eliminar el cliente");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Cargando detalles del cliente...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 p-4 rounded-lg border border-red-300 mb-4">
          <p className="text-red-800">No se pudo cargar el cliente solicitado.</p>
        </div>
        <Link to="/panel-admin/clientes" className="text-blue-600 hover:underline inline-flex items-center">
          <FaArrowLeft className="mr-2" /> Volver a la lista de clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Link to="/panel-admin/clientes" className="text-blue-600 hover:underline mb-6 inline-flex items-center">
        <FaArrowLeft className="mr-2" /> Volver a la lista de clientes
      </Link>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow mb-6">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.company && <p className="text-gray-600">{client.company}</p>}
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <button
            onClick={handleEditClient}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center"
          >
            <FaEdit className="mr-2" /> Editar
          </button>
          
          <button
            onClick={handleDeleteClient}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 inline-flex items-center"
          >
            <FaTrash className="mr-2" /> Eliminar
          </button>
        </div>
      </div>
      
      {/* Client Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Información Personal</h3>
          
          <div className="space-y-2">
            <p>
              <span className="font-medium">Nombre:</span> {client.name}
            </p>
            
            {client.email && (
              <p>
                <span className="font-medium">Email:</span> {client.email}
              </p>
            )}
            
            {client.phone && (
              <p>
                <span className="font-medium">Teléfono:</span> {client.phone}
              </p>
            )}
            
            {client.company && (
              <p>
                <span className="font-medium">Empresa:</span> {client.company}
              </p>
            )}
            
            {client.taxId && (
              <p>
                <span className="font-medium">NIF/CIF:</span> {client.taxId}
              </p>
            )}
          </div>
        </div>
        
        {/* Address */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Dirección</h3>
          
          {client.address ? (
            <div className="space-y-2">
              {client.address.street && (
                <p>
                  <span className="font-medium">Calle:</span> {client.address.street}
                </p>
              )}
              
              {client.address.city && (
                <p>
                  <span className="font-medium">Ciudad:</span> {client.address.city}
                </p>
              )}
              
              {client.address.state && (
                <p>
                  <span className="font-medium">Provincia/Estado:</span> {client.address.state}
                </p>
              )}
              
              {client.address.zip && (
                <p>
                  <span className="font-medium">Código Postal:</span> {client.address.zip}
                </p>
              )}
              
              {client.address.country && (
                <p>
                  <span className="font-medium">País:</span> {client.address.country}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">No hay información de dirección disponible</p>
          )}
        </div>
      </div>
      
      {/* Notes */}
      {client.notes && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Notas</h3>
          <p className="whitespace-pre-line">{client.notes}</p>
        </div>
      )}
      
      {/* Budgets & Sales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Budgets */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b flex justify-between items-center">
            <span>Presupuestos</span>
            <Link 
              to={`/panel-admin/presupuestos/nuevo?clientId=${clientId}`} 
              className="text-sm text-blue-600 hover:underline"
            >
              Crear nuevo
            </Link>
          </h3>
          
          {client.budgets && client.budgets.length > 0 ? (
            <div className="space-y-2">
              {client.budgets.map(budget => (
                <div key={budget._id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{budget.budgetNumber}</p>
                    <p className="text-sm text-gray-500">{new Date(budget.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 text-xs rounded-full mr-2 ${
                      budget.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      budget.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      budget.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      budget.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      budget.status === 'expired' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {budget.status === 'draft' ? 'Borrador' :
                       budget.status === 'sent' ? 'Enviado' :
                       budget.status === 'accepted' ? 'Aceptado' :
                       budget.status === 'rejected' ? 'Rechazado' :
                       budget.status === 'expired' ? 'Expirado' : 'Convertido'}
                    </span>
                    <Link
                      to={`/panel-admin/presupuestos/${budget._id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaFilePdf />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">Este cliente no tiene presupuestos</p>
          )}
        </div>
        
        {/* Sales */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Ventas</h3>
          
          {client.sales && client.sales.length > 0 ? (
            <div className="space-y-2">
              {client.sales.map(sale => (
                <div key={sale._id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{sale.saleNumber}</p>
                    <p className="text-sm text-gray-500">{new Date(sale.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 text-xs rounded-full mr-2 ${
                      sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sale.status === 'pending' ? 'Pendiente' :
                       sale.status === 'completed' ? 'Completada' : sale.status}
                    </span>
                    <Link
                      to={`/panel-admin/ventas/${sale._id}`}
                      className="text-green-600 hover:text-green-800"
                    >
                      <FaFilePdf />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">Este cliente no tiene ventas registradas</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;