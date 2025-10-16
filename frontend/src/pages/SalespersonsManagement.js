import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSave, 
  FaTimes, 
  FaSearch,
  FaUser,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPercent,
  FaCheck,
  FaExclamationTriangle,
  FaCrown,
  FaChartLine
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';

const SalespersonsManagement = () => {
  const [salespersons, setSalespersons] = useState([]);
  const [filteredSalespersons, setFilteredSalespersons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSalesperson, setEditingSalesperson] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    document: '',
    documentType: 'CI',
    phone: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'Paraguay'
    },
    commissionRate: 0,
    isManager: false,
    metadata: {
      employeeId: '',
      hireDate: '',
      department: 'Ventas'
    }
  });

  const documentTypes = [
    { value: 'CI', label: 'Cédula de Identidad' },
    { value: 'RUC', label: 'RUC' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'CEDULA', label: 'Cédula' }
  ];

  const fetchSalespersons = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/vendedores?includeInactive=${showInactive}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setSalespersons(result.data);
      } else {
        toast.error(result.message || "Error al cargar los vendedores");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalespersons();
  }, [showInactive]);

  useEffect(() => {
    let filtered = salespersons;

    if (searchTerm) {
      filtered = filtered.filter(salesperson => 
        salesperson.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesperson.document.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (salesperson.email && salesperson.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (salesperson.phone && salesperson.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredSalespersons(filtered);
  }, [salespersons, searchTerm]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else if (name.startsWith('metadata.')) {
      const metadataField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [metadataField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.document.trim()) {
      toast.error("Nombre y documento son requeridos");
      return;
    }

    try {
      const url = editingSalesperson 
        ? `${SummaryApi.baseURL}/api/finanzas/vendedores/${editingSalesperson._id}`
        : `${SummaryApi.baseURL}/api/finanzas/vendedores`;
      
      const method = editingSalesperson ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(editingSalesperson ? "Vendedor actualizado" : "Vendedor creado");
        setShowForm(false);
        setEditingSalesperson(null);
        resetForm();
        fetchSalespersons();
      } else {
        toast.error(result.message || "Error al guardar");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      document: '',
      documentType: 'CI',
      phone: '',
      email: '',
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'Paraguay'
      },
      commissionRate: 0,
      isManager: false,
      metadata: {
        employeeId: '',
        hireDate: '',
        department: 'Ventas'
      }
    });
  };

  const handleEdit = (salesperson) => {
    setEditingSalesperson(salesperson);
    setFormData({
      name: salesperson.name,
      document: salesperson.document,
      documentType: salesperson.documentType || 'CI',
      phone: salesperson.phone || '',
      email: salesperson.email || '',
      address: {
        street: salesperson.address?.street || '',
        city: salesperson.address?.city || '',
        state: salesperson.address?.state || '',
        zip: salesperson.address?.zip || '',
        country: salesperson.address?.country || 'Paraguay'
      },
      commissionRate: salesperson.commissionRate || 0,
      isManager: salesperson.isManager || false,
      metadata: {
        employeeId: salesperson.metadata?.employeeId || '',
        hireDate: salesperson.metadata?.hireDate ? new Date(salesperson.metadata.hireDate).toISOString().split('T')[0] : '',
        department: salesperson.metadata?.department || 'Ventas'
      }
    });
    setShowForm(true);
  };

  const handleDelete = async (salespersonId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este vendedor?")) {
      return;
    }

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/vendedores/${salespersonId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success("Vendedor eliminado");
        fetchSalespersons();
      } else {
        toast.error(result.message || "Error al eliminar");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSalesperson(null);
    resetForm();
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <FaCheck className="w-3 h-3 mr-1" />
        Activo
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <FaExclamationTriangle className="w-3 h-3 mr-1" />
        Inactivo
      </span>
    );
  };

  const getManagerBadge = (isManager) => {
    return isManager ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <FaCrown className="w-3 h-3 mr-1" />
        Gerente
      </span>
    ) : null;
  };

  const formatPerformance = (performance) => {
    if (!performance) return { totalSales: 0, totalCommission: 0, averageSaleValue: 0 };
    return {
      totalSales: performance.totalSales || 0,
      totalCommission: performance.totalCommission || 0,
      averageSaleValue: performance.averageSaleValue || 0
    };
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center text-gray-900">
              <FaUser className="mr-3 text-purple-600" />
              Vendedores
            </h1>
            <p className="text-gray-600 mt-1">
              Gestiona los vendedores y representantes de ventas
            </p>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FaPlus className="w-4 h-4 mr-2" />
            Nuevo Vendedor
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar vendedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Mostrar inactivos</span>
            </label>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingSalesperson ? 'Editar Vendedor' : 'Nuevo Vendedor'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Nombre completo del vendedor"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Documento
                  </label>
                  <select
                    name="documentType"
                    value={formData.documentType}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {documentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Documento *
                  </label>
                  <input
                    type="text"
                    name="document"
                    value={formData.document}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Número de documento"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comisión (%)
                  </label>
                  <input
                    type="number"
                    name="commissionRate"
                    value={formData.commissionRate}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <FaPhone className="w-4 h-4 mr-2" />
                  Información de Contacto
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Número de teléfono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Email de contacto"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <FaMapMarkerAlt className="w-4 h-4 mr-2" />
                  Dirección
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calle
                    </label>
                    <input
                      type="text"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Calle y número"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Ciudad"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado/Departamento
                    </label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Estado/Departamento"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      name="address.zip"
                      value={formData.address.zip}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Código postal"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      País
                    </label>
                    <input
                      type="text"
                      name="address.country"
                      value={formData.address.country}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="País"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <FaIdCard className="w-4 h-4 mr-2" />
                  Información Adicional
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID de Empleado
                    </label>
                    <input
                      type="text"
                      name="metadata.employeeId"
                      value={formData.metadata.employeeId}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="ID interno del empleado"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Contratación
                    </label>
                    <input
                      type="date"
                      name="metadata.hireDate"
                      value={formData.metadata.hireDate}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departamento
                    </label>
                    <input
                      type="text"
                      name="metadata.department"
                      value={formData.metadata.department}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Departamento"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isManager"
                      checked={formData.isManager}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Es Gerente
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <FaSave className="w-4 h-4 mr-2" />
                  {editingSalesperson ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salespersons List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando vendedores...</p>
          </div>
        ) : filteredSalespersons.length === 0 ? (
          <div className="text-center py-12">
            <FaUser className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron vendedores</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Intenta ajustar los filtros de búsqueda.' : 'Comienza creando tu primer vendedor.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comisión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rendimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSalespersons.map((salesperson) => {
                  const performance = formatPerformance(salesperson.metadata?.performance);
                  return (
                    <tr key={salesperson._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            {salesperson.name}
                            {getManagerBadge(salesperson.isManager)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {salesperson.documentType}: {salesperson.document}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {salesperson.phone || '-'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {salesperson.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <FaPercent className="w-3 h-3 mr-1" />
                          {salesperson.commissionRate}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {performance.totalSales} ventas
                        </div>
                        <div className="text-sm text-gray-500">
                          Promedio: {performance.averageSaleValue.toLocaleString()} ₲
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(salesperson.isActive)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(salesperson)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Editar"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(salesperson._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
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

export default SalespersonsManagement;
