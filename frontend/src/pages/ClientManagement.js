// frontend/src/pages/ClientManagement.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import { IoMdAdd, IoMdClose, IoIosArrowBack } from 'react-icons/io';
import { FaEdit, FaTrash, FaSearch, FaUser } from 'react-icons/fa';

const ClientManagement = () => {
  // Estados principales
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Estado del formulario de cliente
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    taxId: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'Paraguay'
    },
    notes: ''
  });
  
  const navigate = useNavigate();
  const { clientId } = useParams();
  
  // Cargar clientes al iniciar el componente
  useEffect(() => {
    fetchClients();
  }, []);
  
  // Si hay un clientId en la URL, mostrar detalles de ese cliente
  useEffect(() => {
    if (clientId) {
      const client = clients.find(c => c._id === clientId);
      if (client) {
        setSelectedClient(client);
        setShowClientDetails(true);
      }
    }
  }, [clientId, clients]);
  
  // Función para obtener todos los clientes
  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(SummaryApi.getAllClients.url, {
        method: SummaryApi.getAllClients.method,
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setClients(result.data);
      } else {
        toast.error(result.message || "Error al cargar los clientes");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para abrir el formulario para un nuevo cliente
  const handleNewClient = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      taxId: '',
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'Paraguay'
      },
      notes: ''
    });
    setIsEditMode(false);
    setShowNewClientForm(true);
    setShowClientDetails(false);
  };
  
  // Función para abrir el formulario en modo de edición
  const handleEditClient = (client) => {
    setFormData({
      _id: client._id,
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      taxId: client.taxId || '',
      address: {
        street: client.address?.street || '',
        city: client.address?.city || '',
        state: client.address?.state || '',
        zip: client.address?.zip || '',
        country: client.address?.country || 'Paraguay'
      },
      notes: client.notes || ''
    });
    setIsEditMode(true);
    setShowNewClientForm(true);
    setShowClientDetails(false);
  };
  
  // Función para ver detalles de un cliente
  const handleViewClientDetails = (client) => {
    setSelectedClient(client);
    setShowClientDetails(true);
    setShowNewClientForm(false);
    
    // Actualizar la URL sin recargar la página
    navigate(`/panel-admin/clientes/${client._id}`, { replace: true });
  };
  
  // Función para eliminar un cliente
  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este cliente? Esta acción no se puede deshacer.')) {
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
        fetchClients();
        setShowClientDetails(false);
        navigate("/panel-admin/clientes", { replace: true });
      } else {
        toast.error(result.message || "Error al eliminar el cliente");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };
  
  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Manejar campos anidados (dirección)
    if (name.includes('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Determinar si es crear o actualizar
      const url = isEditMode 
        ? `${SummaryApi.baseURL}/api/finanzas/clientes/${formData._id}`
        : SummaryApi.createClient.url;
      
      const method = isEditMode ? 'PUT' : SummaryApi.createClient.method;
      
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(isEditMode ? "Cliente actualizado correctamente" : "Cliente creado correctamente");
        fetchClients();
        setShowNewClientForm(false);
        
        // Si estamos editando, actualizar vista de detalles
        if (isEditMode && result.data) {
          setSelectedClient(result.data);
          setShowClientDetails(true);
        }
      } else {
        toast.error(result.message || `Error al ${isEditMode ? 'actualizar' : 'crear'} el cliente`);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filtrar clientes por término de búsqueda
  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 relative">
      {/* Vista principal de lista de clientes */}
      {!showNewClientForm && !showClientDetails && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Gestión de Clientes</h1>
            
            <button
              onClick={handleNewClient}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <IoMdAdd className="text-lg" /> Crear Nuevo Cliente
            </button>
          </div>
          
          {/* Barra de búsqueda */}
          <div className="mb-6 relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <IoMdClose className="text-lg" />
                </button>
              )}
            </div>
          </div>
          
          {/* Lista de clientes */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <FaUser className="text-5xl text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-500">
                {searchTerm ? "No se encontraron clientes que coincidan con la búsqueda." : "No hay clientes registrados."}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredClients.map(client => (
                    <tr key={client._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{client.name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{client.email || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{client.phone || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{client.company || "-"}</td>
                      <td className="px-4 py-3 text-sm flex justify-center space-x-2">
                        <button
                          onClick={() => handleViewClientDetails(client)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Ver detalles"
                        >
                          Ver Detalles
                        </button>
                        <button
                          onClick={() => handleEditClient(client)}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client._id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Eliminar"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      
      {/* Formulario para crear/editar cliente */}
      {showNewClientForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                setShowNewClientForm(false);
                if (selectedClient) {
                  setShowClientDetails(true);
                }
              }}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <IoIosArrowBack className="mr-1" /> 
              Volver
            </button>
            
            <h2 className="text-2xl font-bold">
              {isEditMode ? "Editar Cliente" : "Crear Nuevo Cliente"}
            </h2>
            
            <div></div> {/* Elemento vacío para mantener el espaciado del flex */}
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Información básica */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">
                  NIF/CIF
                </label>
                <input
                  type="text"
                  id="taxId"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Dirección */}
            <h3 className="text-lg font-semibold mb-2 mt-6 text-gray-800 border-t pt-4">Dirección</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="address.street" className="block text-sm font-medium text-gray-700 mb-1">
                  Calle y número
                </label>
                <input
                  type="text"
                  id="address.street"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="address.city" className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  id="address.city"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="address.state" className="block text-sm font-medium text-gray-700 mb-1">
                  Provincia/Estado
                </label>
                <input
                  type="text"
                  id="address.state"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="address.zip" className="block text-sm font-medium text-gray-700 mb-1">
                  Código postal
                </label>
                <input
                  type="text"
                  id="address.zip"
                  name="address.zip"
                  value={formData.address.zip}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="address.country" className="block text-sm font-medium text-gray-700 mb-1">
                  País
                </label>
                <input
                  type="text"
                  id="address.country"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Notas */}
            <div className="mb-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notas adicionales
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              ></textarea>
            </div>
            
            {/* Botones de acción */}
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowNewClientForm(false);
                  if (selectedClient && isEditMode) {
                    setShowClientDetails(true);
                  }
                }}
                className="px-4 py-2 mr-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEditMode ? "Actualizando..." : "Creando..."}
                  </>
                ) : (
                  isEditMode ? "Actualizar Cliente" : "Crear Cliente"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Vista de detalles del cliente */}
      {showClientDetails && selectedClient && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                setShowClientDetails(false);
                navigate("/panel-admin/clientes", { replace: true });
              }}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <IoIosArrowBack className="mr-1" /> 
              Volver a la lista
            </button>
            
            <h2 className="text-2xl font-bold">Detalles del Cliente</h2>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditClient(selectedClient)}
                className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 flex items-center"
              >
                <FaEdit className="mr-1" /> Editar
              </button>
              <button
                onClick={() => handleDeleteClient(selectedClient._id)}
                className="bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 flex items-center"
              >
                <FaTrash className="mr-1" /> Eliminar
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información básica */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700">Información Personal</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Nombre</h4>
                  <p className="text-gray-800 font-medium">{selectedClient.name || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Empresa</h4>
                  <p className="text-gray-800">{selectedClient.company || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Email</h4>
                  <p className="text-gray-800">{selectedClient.email || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Teléfono</h4>
                  <p className="text-gray-800">{selectedClient.phone || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">NIF/CIF</h4>
                  <p className="text-gray-800">{selectedClient.taxId || "-"}</p>
                </div>
              </div>
            </div>
            
            {/* Dirección */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700">Dirección</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Calle y número</h4>
                  <p className="text-gray-800">{selectedClient.address?.street || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Ciudad</h4>
                  <p className="text-gray-800">{selectedClient.address?.city || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Provincia/Estado</h4>
                  <p className="text-gray-800">{selectedClient.address?.state || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Código postal</h4>
                  <p className="text-gray-800">{selectedClient.address?.zip || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">País</h4>
                  <p className="text-gray-800">{selectedClient.address?.country || "Paraguay"}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Notas */}
          <div className="mt-6 bg-gray-50 p-5 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700">Notas adicionales</h3>
            <p className="text-gray-800 whitespace-pre-line">
              {selectedClient.notes || "No hay notas adicionales."}
            </p>
          </div>
          
          {/* Futuras secciones para presupuestos y pedidos del cliente */}
          <div className="mt-6 p-5 rounded-lg border border-blue-100 bg-blue-50">
            <h3 className="text-lg font-semibold mb-2 text-blue-700">Presupuestos y Pedidos</h3>
            <p className="text-blue-800">
              Esta sección está en desarrollo. Pronto podrás ver todos los presupuestos y pedidos asociados a este cliente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;