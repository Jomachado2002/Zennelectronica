// Corregir el archivo frontend/src/pages/ClientsList.js

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import { FaUserEdit, FaUserMinus, FaSearch, FaFilePdf } from 'react-icons/fa';

const ClientsList = () => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(SummaryApi.getAllClients.url, {
        method: SummaryApi.getAllClients.method,
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        // Asegurarse que clients contiene un array (corrige el problema)
        setClients(result.data?.clients || []);
      } else {
        toast.error(result.message || "Error al cargar los clientes");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión al cargar clientes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDeleteClient = async (clientId, clientName) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al cliente ${clientName}?`)) {
      return;
    }
    
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/clientes/${clientId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Cliente eliminado correctamente");
        // Actualizar la lista local
        setClients(clients.filter(client => client._id !== clientId));
      } else {
        toast.error(result.message || "Error al eliminar el cliente");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión al eliminar cliente");
    }
  };

  // Filtrar clientes según búsqueda
  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Clientes</h1>
        
        <Link 
          to="/panel-admin/clientes/nuevo" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center"
        >
          <FaUserEdit className="mr-2" /> Crear Nuevo Cliente
        </Link>
      </div>
      
      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre, email, teléfono o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          {searchTerm ? (
            <p className="text-gray-500">No se encontraron clientes que coincidan con "{searchTerm}".</p>
          ) : (
            <>
              <p className="text-gray-500">No hay clientes registrados aún.</p>
              <Link 
                to="/panel-admin/clientes/nuevo" 
                className="mt-4 inline-block text-blue-600 hover:underline font-medium"
              >
                Registra tu primer cliente
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Presupuestos</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.map(client => (
                <tr key={client._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{client.name}</div>
                    {client.taxId && <div className="text-xs text-gray-500">RUC/CI: {client.taxId}</div>}
                  </td>
                  <td className="px-4 py-4">
                    {client.email && <div className="text-sm text-gray-900">{client.email}</div>}
                    {client.phone && <div className="text-sm text-gray-500">{client.phone}</div>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{client.company || '-'}</div>
                    {client.address && client.address.city && (
                      <div className="text-xs text-gray-500">{client.address.city}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {client.budgets && client.budgets.length > 0 ? (
                      <Link 
                        to={`/panel-admin/presupuestos?clientId=${client._id}`}
                        className="inline-flex items-center text-blue-600 hover:underline"
                      >
                        <FaFilePdf className="mr-1" />
                        {client.budgets.length}
                      </Link>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <Link 
                        to={`/panel-admin/clientes/${client._id}`} 
                        className="text-blue-600 hover:text-blue-800"
                        title="Ver detalles"
                      >
                        <FaUserEdit />
                      </Link>
                      <button
                        onClick={() => handleDeleteClient(client._id, client.name)}
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar cliente"
                      >
                        <FaUserMinus />
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
  );
};

export default ClientsList;