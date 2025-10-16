// frontend/src/pages/SuppliersManagement.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import { IoMdAdd, IoMdClose, IoIosArrowBack } from 'react-icons/io';
import { FaEdit, FaTrash, FaSearch, FaIndustry, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

const SuppliersManagement = () => {
  // Estados principales
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Estado del formulario de proveedor
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
    contactPerson: {
      name: '',
      position: '',
      phone: '',
      email: ''
    },
    businessInfo: {
      website: '',
      specialty: '',
      paymentTerms: '30 días',
      deliveryTime: '5-7 días laborables',
      minimumOrder: 0,
      currency: 'USD'
    },
    notes: ''
  });
  
  const navigate = useNavigate();
  const { supplierId } = useParams();
  
  // Cargar proveedores al iniciar el componente
  useEffect(() => {
    fetchSuppliers();
  }, []);
  
  // Si hay un supplierId en la URL, mostrar detalles de ese proveedor
  useEffect(() => {
    if (supplierId) {
      const supplier = suppliers.find(s => s._id === supplierId);
      if (supplier) {
        setSelectedSupplier(supplier);
        setShowSupplierDetails(true);
      }
    }
  }, [supplierId, suppliers]);
  
  // Función para obtener todos los proveedores
  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(SummaryApi.getAllSuppliers.url, {
        method: SummaryApi.getAllSuppliers.method,
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setSuppliers(result.data.suppliers || []);
      } else {
        toast.error(result.message || "Error al cargar los proveedores");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para abrir el formulario para un nuevo proveedor
  const handleNewSupplier = () => {
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
      contactPerson: {
        name: '',
        position: '',
        phone: '',
        email: ''
      },
      businessInfo: {
        website: '',
        specialty: '',
        paymentTerms: '30 días',
        deliveryTime: '5-7 días laborables',
        minimumOrder: 0,
        currency: 'USD'
      },
      notes: ''
    });
    setIsEditMode(false);
    setShowNewSupplierForm(true);
    setShowSupplierDetails(false);
  };
  
  // Función para abrir el formulario en modo de edición
  const handleEditSupplier = (supplier) => {
    setFormData({
      _id: supplier._id,
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      company: supplier.company || '',
      taxId: supplier.taxId || '',
      address: {
        street: supplier.address?.street || '',
        city: supplier.address?.city || '',
        state: supplier.address?.state || '',
        zip: supplier.address?.zip || '',
        country: supplier.address?.country || 'Paraguay'
      },
      contactPerson: {
        name: supplier.contactPerson?.name || '',
        position: supplier.contactPerson?.position || '',
        phone: supplier.contactPerson?.phone || '',
        email: supplier.contactPerson?.email || ''
      },
      businessInfo: {
        website: supplier.businessInfo?.website || '',
        specialty: supplier.businessInfo?.specialty || '',
        paymentTerms: supplier.businessInfo?.paymentTerms || '30 días',
        deliveryTime: supplier.businessInfo?.deliveryTime || '5-7 días laborables',
        minimumOrder: supplier.businessInfo?.minimumOrder || 0,
        currency: supplier.businessInfo?.currency || 'USD'
      },
      notes: supplier.notes || ''
    });
    setIsEditMode(true);
    setShowNewSupplierForm(true);
    setShowSupplierDetails(false);
  };
  
  // Función para ver detalles de un proveedor
  const handleViewSupplierDetails = (supplier) => {
    setSelectedSupplier(supplier);
    setShowSupplierDetails(true);
    setShowNewSupplierForm(false);
    
    // Actualizar la URL sin recargar la página
    navigate(`/panel-admin/proveedores/${supplier._id}`, { replace: true });
  };
  
  // Función para eliminar un proveedor
  const handleDeleteSupplier = async (supplierId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este proveedor? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/proveedores/${supplierId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success("Proveedor eliminado correctamente");
        fetchSuppliers();
        setShowSupplierDetails(false);
        navigate("/panel-admin/proveedores", { replace: true });
      } else {
        toast.error(result.message || "Error al eliminar el proveedor");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };
  
  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Manejar campos anidados
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
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
        ? `${SummaryApi.baseURL}/api/finanzas/proveedores/${formData._id}`
        : SummaryApi.createSupplier.url;
      
      const method = isEditMode ? 'PUT' : SummaryApi.createSupplier.method;
      
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
        toast.success(isEditMode ? "Proveedor actualizado correctamente" : "Proveedor creado correctamente");
        fetchSuppliers();
        setShowNewSupplierForm(false);
        
        // Si estamos editando, actualizar vista de detalles
        if (isEditMode && result.data) {
          setSelectedSupplier(result.data);
          setShowSupplierDetails(true);
        }
      } else {
        toast.error(result.message || `Error al ${isEditMode ? 'actualizar' : 'crear'} el proveedor`);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filtrar proveedores por término de búsqueda
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.businessInfo?.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 relative">
      {/* Vista principal de lista de proveedores */}
      {!showNewSupplierForm && !showSupplierDetails && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Gestión de Proveedores</h1>
            
            <button
              onClick={handleNewSupplier}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <IoMdAdd className="text-lg" /> Crear Nuevo Proveedor
            </button>
          </div>
          
          {/* Barra de búsqueda */}
          <div className="mb-6 relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar proveedores..."
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
          
          {/* Lista de proveedores */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <FaIndustry className="text-5xl text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-500">
                {searchTerm ? "No se encontraron proveedores que coincidan con la búsqueda." : "No hay proveedores registrados."}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condiciones</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSuppliers.map(supplier => (
                    <tr key={supplier._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        {supplier.company && <div className="text-sm text-gray-500">{supplier.company}</div>}
                        {supplier.taxId && <div className="text-xs text-gray-400">RUC: {supplier.taxId}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {supplier.email && (
                          <div className="flex items-center text-sm text-gray-900 mb-1">
                            <FaEnvelope className="mr-1 text-gray-400" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <FaPhone className="mr-1 text-gray-400" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.contactPerson?.name && (
                          <div className="text-xs text-gray-400 mt-1">
                            Contacto: {supplier.contactPerson.name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {supplier.businessInfo?.specialty || 'Sin especificar'}
                        </div>
                        {supplier.businessInfo?.currency && (
                          <div className="text-xs text-gray-500">
                            Moneda: {supplier.businessInfo.currency}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {supplier.businessInfo?.paymentTerms || 'Sin especificar'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Entrega: {supplier.businessInfo?.deliveryTime || 'Sin especificar'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm flex justify-center space-x-2">
                        <button
                          onClick={() => handleViewSupplierDetails(supplier)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Ver detalles"
                        >
                          Ver Detalles
                        </button>
                        <button
                          onClick={() => handleEditSupplier(supplier)}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier._id)}
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
      
      {/* Formulario para crear/editar proveedor */}
      {showNewSupplierForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                setShowNewSupplierForm(false);
                if (selectedSupplier) {
                  setShowSupplierDetails(true);
                }
              }}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <IoIosArrowBack className="mr-1" /> 
              Volver
            </button>
            
            <h2 className="text-2xl font-bold">
              {isEditMode ? "Editar Proveedor" : "Crear Nuevo Proveedor"}
            </h2>
            
            <div></div>
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del proveedor *
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
                  RUC/NIT
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
            
            {/* Información de contacto */}
            <h3 className="text-lg font-semibold mb-2 mt-6 text-gray-800 border-t pt-4">Persona de Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="contactPerson.name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del contacto
                </label>
                <input
                  type="text"
                  id="contactPerson.name"
                  name="contactPerson.name"
                  value={formData.contactPerson.name}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="contactPerson.position" className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  id="contactPerson.position"
                  name="contactPerson.position"
                  value={formData.contactPerson.position}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="contactPerson.phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono del contacto
                </label>
                <input
                  type="tel"
                  id="contactPerson.phone"
                  name="contactPerson.phone"
                  value={formData.contactPerson.phone}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="contactPerson.email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email del contacto
                </label>
                <input
                  type="email"
                  id="contactPerson.email"
                  name="contactPerson.email"
                  value={formData.contactPerson.email}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Información comercial */}
            <h3 className="text-lg font-semibold mb-2 mt-6 text-gray-800 border-t pt-4">Información Comercial</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="businessInfo.specialty" className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidad
                </label>
                <input
                  type="text"
                  id="businessInfo.specialty"
                  name="businessInfo.specialty"
                  value={formData.businessInfo.specialty}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Importador de Hardware, Distribuidor de Software"
                />
              </div>
              
              <div>
                <label htmlFor="businessInfo.website" className="block text-sm font-medium text-gray-700 mb-1">
                  Sitio Web
                </label>
                <input
                  type="url"
                  id="businessInfo.website"
                  name="businessInfo.website"
                  value={formData.businessInfo.website}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="businessInfo.paymentTerms" className="block text-sm font-medium text-gray-700 mb-1">
                  Términos de pago
                </label>
                <select
                  id="businessInfo.paymentTerms"
                  name="businessInfo.paymentTerms"
                  value={formData.businessInfo.paymentTerms}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Pago anticipado">Pago anticipado</option>
                  <option value="15 días">15 días</option>
                  <option value="30 días">30 días</option>
                  <option value="45 días">45 días</option>
                  <option value="60 días">60 días</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="businessInfo.deliveryTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Tiempo de entrega
                </label>
                <input
                  type="text"
                  id="businessInfo.deliveryTime"
                  name="businessInfo.deliveryTime"
                  value={formData.businessInfo.deliveryTime}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 5-7 días laborables"
                />
              </div>
              
              <div>
                <label htmlFor="businessInfo.currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda
                </label>
                <select
                  id="businessInfo.currency"
                  name="businessInfo.currency"
                  value={formData.businessInfo.currency}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USD">USD - Dólar Americano</option>
                  <option value="PYG">PYG - Guaraní Paraguayo</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="businessInfo.minimumOrder" className="block text-sm font-medium text-gray-700 mb-1">
                  Pedido mínimo
                </label>
                <input
                  type="number"
                  id="businessInfo.minimumOrder"
                  name="businessInfo.minimumOrder"
                  value={formData.businessInfo.minimumOrder}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
            </div>
            
            {/* Dirección */}
            <h3 className="text-lg font-semibold mb-2 mt-6 text-gray-800 border-t pt-4">Dirección</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                  setShowNewSupplierForm(false);
                  if (selectedSupplier && isEditMode) {
                    setShowSupplierDetails(true);
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
                  isEditMode ? "Actualizar Proveedor" : "Crear Proveedor"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Vista de detalles del proveedor */}
      {showSupplierDetails && selectedSupplier && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                setShowSupplierDetails(false);
                navigate("/panel-admin/proveedores", { replace: true });
              }}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <IoIosArrowBack className="mr-1" /> 
              Volver a la lista
            </button>
            
            <h2 className="text-2xl font-bold">Detalles del Proveedor</h2>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditSupplier(selectedSupplier)}
                className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 flex items-center"
              >
                <FaEdit className="mr-1" /> Editar
              </button>
              <button
                onClick={() => handleDeleteSupplier(selectedSupplier._id)}
                className="bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 flex items-center"
              >
                <FaTrash className="mr-1" /> Eliminar
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Información básica */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700">Información General</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Nombre</h4>
                  <p className="text-gray-800 font-medium">{selectedSupplier.name || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Empresa</h4>
                  <p className="text-gray-800">{selectedSupplier.company || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Email</h4>
                  <p className="text-gray-800">{selectedSupplier.email || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Teléfono</h4>
                  <p className="text-gray-800">{selectedSupplier.phone || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">RUC/NIT</h4>
                  <p className="text-gray-800">{selectedSupplier.taxId || "-"}</p>
                </div>
              </div>
            </div>
            
            {/* Información de contacto */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700">Persona de Contacto</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Nombre</h4>
                  <p className="text-gray-800">{selectedSupplier.contactPerson?.name || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Cargo</h4>
                  <p className="text-gray-800">{selectedSupplier.contactPerson?.position || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Teléfono</h4>
                  <p className="text-gray-800">{selectedSupplier.contactPerson?.phone || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Email</h4>
                  <p className="text-gray-800">{selectedSupplier.contactPerson?.email || "-"}</p>
                </div>
              </div>
            </div>
            
            {/* Información comercial */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700">Información Comercial</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Especialidad</h4>
                  <p className="text-gray-800">{selectedSupplier.businessInfo?.specialty || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Términos de pago</h4>
                  <p className="text-gray-800">{selectedSupplier.businessInfo?.paymentTerms || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Tiempo de entrega</h4>
                  <p className="text-gray-800">{selectedSupplier.businessInfo?.deliveryTime || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Moneda</h4>
                  <p className="text-gray-800">{selectedSupplier.businessInfo?.currency || "-"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Pedido mínimo</h4>
                  <p className="text-gray-800">
                    {selectedSupplier.businessInfo?.minimumOrder ? 
                      `${selectedSupplier.businessInfo.minimumOrder} ${selectedSupplier.businessInfo.currency}` : 
                      "-"
                    }
                  </p>
                </div>
                
                {selectedSupplier.businessInfo?.website && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Sitio Web</h4>
                    <a 
                      href={selectedSupplier.businessInfo.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {selectedSupplier.businessInfo.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Dirección */}
          <div className="mt-6 bg-gray-50 p-5 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700 flex items-center">
              <FaMapMarkerAlt className="mr-2" />
              Dirección
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Calle y número</h4>
                <p className="text-gray-800">{selectedSupplier.address?.street || "-"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Ciudad</h4>
                <p className="text-gray-800">{selectedSupplier.address?.city || "-"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Provincia/Estado</h4>
                <p className="text-gray-800">{selectedSupplier.address?.state || "-"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">País</h4>
                <p className="text-gray-800">{selectedSupplier.address?.country || "Paraguay"}</p>
              </div>
            </div>
          </div>
          
          {/* Notas */}
          {selectedSupplier.notes && (
            <div className="mt-6 bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-700">Notas adicionales</h3>
              <p className="text-gray-800 whitespace-pre-line">
                {selectedSupplier.notes}
              </p>
            </div>
          )}
          
          {/* Estadísticas y análisis del proveedor */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold mb-2 text-green-700">Compras Realizadas</h3>
              <p className="text-green-800">
                Total de compras realizadas a este proveedor
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold mb-2 text-blue-700">Productos Suministrados</h3>
              <p className="text-blue-800">
                Lista de productos que suministra este proveedor
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="text-lg font-semibold mb-2 text-purple-700">Rendimiento</h3>
              <p className="text-purple-800">
                Análisis de calidad y cumplimiento de entregas
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersManagement;