// frontend/src/pages/PurchaseManagement.js - CON SOPORTE MULTI-MONEDA
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaFileUpload, FaEye, FaFilter, FaShoppingCart, FaReceipt, FaDollarSign } from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const PurchaseManagement = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [filters, setFilters] = useState({
    purchaseType: '',
    paymentStatus: '',
    startDate: '',
    endDate: '',
    supplierId: ''
  });

  // Estado del formulario de nueva compra CON SOPORTE MULTI-MONEDA
  const [newPurchaseData, setNewPurchaseData] = useState({
    purchaseType: 'inventario',
    supplierId: '',
    supplierInfo: {
      name: '',
      company: '',
      ruc: '',
      contact: ''
    },
    items: [{ 
      description: '', 
      category: 'producto', 
      quantity: 1, 
      unitPrice: 0, 
      currency: 'USD', 
      exchangeRate: 7300 
    }],
    tax: 10, // ✅ IVA por defecto 10%
    paymentMethod: 'transferencia', // Para compras, más común transferencia
    paymentStatus: 'pendiente',
    dueDate: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [fileUpload, setFileUpload] = useState({
    invoice: null,
    receipt: null
  });

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
  }, []);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setPurchases(result.data.purchases || []);
      } else {
        toast.error(result.message || "Error al cargar las compras");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/proveedores`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setSuppliers(result.data.suppliers || []);
      }
    } catch (error) {
      console.error("Error al cargar proveedores:", error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchPurchases();
  };

  const resetFilters = () => {
    setFilters({
      purchaseType: '',
      paymentStatus: '',
      startDate: '',
      endDate: '',
      supplierId: ''
    });
  };

  const handleNewPurchaseChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('supplierInfo.')) {
      const field = name.split('.')[1];
      setNewPurchaseData(prev => ({
        ...prev,
        supplierInfo: { ...prev.supplierInfo, [field]: value }
      }));
    } else {
      setNewPurchaseData(prev => ({ ...prev, [name]: value }));
    }
  };

  // ✅ MANEJO MEJORADO DE ITEMS CON MÚLTIPLES MONEDAS
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...newPurchaseData.items];
    updatedItems[index][field] = value;
    
    // Si cambia la moneda, ajustar el tipo de cambio por defecto
    if (field === 'currency') {
      if (value === 'USD') {
        updatedItems[index].exchangeRate = 7300; // Valor por defecto USD
      } else if (value === 'EUR') {
        updatedItems[index].exchangeRate = 8000; // Valor por defecto EUR
      } else if (value === 'PYG') {
        updatedItems[index].exchangeRate = 1;
      }
    }
    
    setNewPurchaseData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setNewPurchaseData(prev => ({
      ...prev,
      items: [...prev.items, { 
        description: '', 
        category: 'producto', 
        quantity: 1, 
        unitPrice: 0, 
        currency: 'USD', 
        exchangeRate: 7300 
      }]
    }));
  };

  const removeItem = (index) => {
    if (newPurchaseData.items.length > 1) {
      const updatedItems = newPurchaseData.items.filter((_, i) => i !== index);
      setNewPurchaseData(prev => ({ ...prev, items: updatedItems }));
    }
  };

  // ✅ CÁLCULO TOTAL CON MÚLTIPLES MONEDAS
  const calculateTotal = () => {
    const subtotal = newPurchaseData.items.reduce((sum, item) => {
      let unitPriceInPYG = item.unitPrice;
      if (item.currency === 'USD') {
        unitPriceInPYG = item.unitPrice * (item.exchangeRate || 7300);
      } else if (item.currency === 'EUR') {
        unitPriceInPYG = item.unitPrice * (item.exchangeRate || 8000);
      }
      return sum + (item.quantity * unitPriceInPYG);
    }, 0);
    
    const taxAmount = subtotal * (newPurchaseData.tax / 100);
    return subtotal + taxAmount;
  };

  // ✅ FUNCIÓN PARA FORMATEAR MONEDA
  const formatCurrency = (amount, currency = 'PYG') => {
    if (currency === 'PYG') {
      return displayPYGCurrency(amount);
    } else if (currency === 'USD') {
      return `US$ ${amount.toFixed(2)}`;
    } else if (currency === 'EUR') {
      return `€ ${amount.toFixed(2)}`;
    }
    return `${currency} ${amount.toFixed(2)}`;
  };

  const handleCreatePurchase = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!newPurchaseData.supplierId && !newPurchaseData.supplierInfo.name) {
      toast.error("Debe seleccionar un proveedor o proporcionar información del proveedor");
      return;
    }

    if (newPurchaseData.items.some(item => !item.description || item.quantity <= 0 || item.unitPrice <= 0)) {
      toast.error("Todos los items deben tener descripción, cantidad y precio válidos");
      return;
    }

    // Validar tipos de cambio para monedas extranjeras
    const hasInvalidExchangeRate = newPurchaseData.items.some(item => 
      (item.currency === 'USD' || item.currency === 'EUR') && (!item.exchangeRate || item.exchangeRate <= 0)
    );

    if (hasInvalidExchangeRate) {
      toast.error("Debe especificar un tipo de cambio válido para monedas extranjeras");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(newPurchaseData)
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Compra registrada correctamente");
        setShowNewPurchaseModal(false);
        setNewPurchaseData({
          purchaseType: 'inventario',
          supplierId: '',
          supplierInfo: {
            name: '',
            company: '',
            ruc: '',
            contact: ''
          },
          items: [{ 
            description: '', 
            category: 'producto', 
            quantity: 1, 
            unitPrice: 0, 
            currency: 'USD', 
            exchangeRate: 7300 
          }],
          tax: 10,
          paymentMethod: 'transferencia',
          paymentStatus: 'pendiente',
          dueDate: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchPurchases();
      } else {
        toast.error(result.message || "Error al registrar la compra");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async (purchaseId, newStatus) => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras/${purchaseId}/pago`, {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify({ paymentStatus: newStatus })
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Estado de pago actualizado");
        fetchPurchases();
      } else {
        toast.error(result.message || "Error al actualizar estado");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if ((!fileUpload.invoice && !fileUpload.receipt) || !selectedPurchase) {
      toast.error("Debe seleccionar al menos un archivo");
      return;
    }

    const formData = new FormData();
    if (fileUpload.invoice) formData.append('invoice', fileUpload.invoice);
    if (fileUpload.receipt) formData.append('receipt', fileUpload.receipt);

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras/${selectedPurchase._id}/documentos`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Documentos subidos correctamente");
        setShowFileUploadModal(false);
        setFileUpload({ invoice: null, receipt: null });
        setSelectedPurchase(null);
        fetchPurchases();
      } else {
        toast.error(result.message || "Error al subir los documentos");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta compra?')) {
      return;
    }

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras/${purchaseId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Compra eliminada correctamente");
        fetchPurchases();
      } else {
        toast.error(result.message || "Error al eliminar la compra");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pagado': return 'bg-green-100 text-green-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'parcial': return 'bg-blue-100 text-blue-800';
      case 'vencido': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pagado': return 'Pagado';
      case 'pendiente': return 'Pendiente';
      case 'parcial': return 'Parcial';
      case 'vencido': return 'Vencido';
      default: return status;
    }
  };

  const getPurchaseTypeLabel = (type) => {
    switch (type) {
      case 'inventario': return 'Inventario';
      case 'equipos': return 'Equipos';
      case 'servicios': return 'Servicios';
      case 'gastos_operativos': return 'Gastos Operativos';
      case 'marketing': return 'Marketing';
      case 'otros': return 'Otros';
      default: return type;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <FaShoppingCart className="mr-2 text-blue-600" />
          Gestión de Compras
        </h1>
        
        <button
          onClick={() => setShowNewPurchaseModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <FaPlus className="mr-2" /> Nueva Compra
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center mb-3">
          <FaFilter className="mr-2 text-gray-600" />
          <h3 className="font-medium">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Compra
            </label>
            <select
              name="purchaseType"
              value={filters.purchaseType}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Todos los tipos</option>
              <option value="inventario">Inventario</option>
              <option value="equipos">Equipos</option>
              <option value="servicios">Servicios</option>
              <option value="gastos_operativos">Gastos Operativos</option>
              <option value="marketing">Marketing</option>
              <option value="otros">Otros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado de Pago
            </label>
            <select
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Parcial</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor
            </label>
            <select
              name="supplierId"
              value={filters.supplierId}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map(supplier => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name} {supplier.company ? `(${supplier.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
          >
            Limpiar
          </button>
          <button
            onClick={applyFilters}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>

      {/* Tabla de compras */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando compras...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-8 text-center">
            <FaShoppingCart className="text-5xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron compras.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">IVA</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Documentos</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchases.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {purchase.purchaseNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getPurchaseTypeLabel(purchase.purchaseType)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>
                        <div className="font-medium">
                          {purchase.supplierSnapshot?.name || purchase.supplier?.name || purchase.supplierInfo?.name}
                        </div>
                        {(purchase.supplierSnapshot?.company || purchase.supplierInfo?.company) && (
                          <div className="text-xs text-gray-400">
                            {purchase.supplierSnapshot?.company || purchase.supplierInfo?.company}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="font-medium">{displayPYGCurrency(purchase.totalAmount)}</div>
                      {/* Mostrar si hay items en moneda extranjera */}
                      {purchase.items?.some(item => item.currency !== 'PYG') && (
                        <div className="text-xs text-blue-600 flex items-center justify-end">
                          <FaDollarSign className="mr-1" /> Multi-moneda
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {purchase.tax}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="relative group">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(purchase.paymentStatus)}`}>
                          {getStatusLabel(purchase.paymentStatus)}
                        </span>
                        
                        {/* Menú desplegable para cambiar estado */}
                        <div className="absolute right-0 mt-2 hidden group-hover:block z-10 w-32 bg-white rounded-md shadow-lg">
                          <div className="py-1">
                            {['pendiente', 'parcial', 'pagado', 'vencido'].map((status) => (
                              <button
                                key={status}
                                className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left ${purchase.paymentStatus === status ? 'font-medium' : ''}`}
                                onClick={() => handleUpdatePaymentStatus(purchase._id, status)}
                              >
                                {getStatusLabel(status)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center space-x-2">
                        {purchase.invoiceFile && (
                          <a
                            href={purchase.invoiceFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800"
                            title="Ver factura"
                          >
                            <FaReceipt />
                          </a>
                        )}
                        {purchase.receiptFile && (
                          <a
                            href={purchase.receiptFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="Ver recibo"
                          >
                            <FaEye />
                          </a>
                        )}
                        {(!purchase.invoiceFile || !purchase.receiptFile) && (
                          <button
                            onClick={() => {
                              setSelectedPurchase(purchase);
                              setShowFileUploadModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Subir documentos"
                          >
                            <FaFileUpload />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center space-x-2">
                        <Link
                          to={`/panel-admin/compras/${purchase._id}`}
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver detalles"
                        >
                          <FaEye />
                        </Link>
                        <button
                          onClick={() => handleDeletePurchase(purchase._id)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar compra"
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

      {/* Modal para nueva compra - CON SOPORTE MULTI-MONEDA */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-xl text-gray-800">Nueva Compra</h2>
              <button 
                className="text-3xl text-gray-600 hover:text-black" 
                onClick={() => setShowNewPurchaseModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Compra *
                  </label>
                  <select
                    name="purchaseType"
                    value={newPurchaseData.purchaseType}
                    onChange={handleNewPurchaseChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="inventario">Inventario</option>
                    <option value="equipos">Equipos</option>
                    <option value="servicios">Servicios</option>
                    <option value="gastos_operativos">Gastos Operativos</option>
                    <option value="marketing">Marketing</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <select
                    name="supplierId"
                    value={newPurchaseData.supplierId}
                    onChange={handleNewPurchaseChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  >
                    <option value="">Seleccionar proveedor registrado</option>
                    {suppliers.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name} {supplier.company ? `(${supplier.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {!newPurchaseData.supplierId && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del Proveedor *
                      </label>
                      <input
                        type="text"
                        name="supplierInfo.name"
                        value={newPurchaseData.supplierInfo.name}
                        onChange={handleNewPurchaseChange}
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                        placeholder="Nombre del proveedor"
                        required={!newPurchaseData.supplierId}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empresa
                      </label>
                      <input
                        type="text"
                        name="supplierInfo.company"
                        value={newPurchaseData.supplierInfo.company}
                        onChange={handleNewPurchaseChange}
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                        placeholder="Nombre de la empresa"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        RUC
                      </label>
                      <input
                        type="text"
                        name="supplierInfo.ruc"
                        value={newPurchaseData.supplierInfo.ruc}
                        onChange={handleNewPurchaseChange}
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                        placeholder="RUC del proveedor"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contacto
                      </label>
                      <input
                        type="text"
                        name="supplierInfo.contact"
                        value={newPurchaseData.supplierInfo.contact}
                        onChange={handleNewPurchaseChange}
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                        placeholder="Teléfono o email"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Compra
                  </label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={newPurchaseData.purchaseDate}
                    onChange={handleNewPurchaseChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    name="paymentMethod"
                    value={newPurchaseData.paymentMethod}
                    onChange={handleNewPurchaseChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>

                {/* ✅ SELECTOR DE IVA */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IVA (%)
                  </label>
                  <select
                    name="tax"
                    value={newPurchaseData.tax}
                    onChange={handleNewPurchaseChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  >
                    <option value={0}>0% (Exento)</option>
                    <option value={5}>5%</option>
                    <option value={10}>10%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={newPurchaseData.dueDate}
                    onChange={handleNewPurchaseChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Items de la compra CON SOPORTE MULTI-MONEDA */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Items de la Compra</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    + Agregar Item
                  </button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Categoría</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Moneda</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">T.C.</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal (₲)</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {newPurchaseData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              className="w-full p-1 border border-gray-300 rounded text-sm"
                              placeholder="Descripción del item"
                              required
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.category}
                              onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                              className="w-full p-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="producto">Producto</option>
                              <option value="servicio">Servicio</option>
                              <option value="gasto_fijo">Gasto Fijo</option>
                              <option value="gasto_variable">Gasto Variable</option>
                              <option value="inversion">Inversión</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                              className="w-16 p-1 border border-gray-300 rounded text-center text-sm"
                              min="1"
                              required
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                              className="w-24 p-1 border border-gray-300 rounded text-right text-sm"
                              min="0"
                              step="0.01"
                              required
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.currency}
                              onChange={(e) => handleItemChange(index, 'currency', e.target.value)}
                              className="w-16 p-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="PYG">₲</option>
                              <option value="USD">$</option>
                              <option value="EUR">€</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            {item.currency !== 'PYG' ? (
                              <input
                                type="number"
                                value={item.exchangeRate}
                                onChange={(e) => handleItemChange(index, 'exchangeRate', Number(e.target.value))}
                                className="w-20 p-1 border border-gray-300 rounded text-right text-sm"
                                min="0"
                                step="0.01"
                                required
                              />
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-medium">
                            {(() => {
                              let unitPriceInPYG = item.unitPrice;
                              if (item.currency === 'USD') {
                                unitPriceInPYG = item.unitPrice * (item.exchangeRate || 7300);
                              } else if (item.currency === 'EUR') {
                                unitPriceInPYG = item.unitPrice * (item.exchangeRate || 8000);
                              }
                              return displayPYGCurrency(item.quantity * unitPriceInPYG);
                            })()}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {newPurchaseData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <FaTrash />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{displayPYGCurrency(calculateTotal() - (calculateTotal() * newPurchaseData.tax / (100 + newPurchaseData.tax)))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA ({newPurchaseData.tax}%):</span>
                    <span>{displayPYGCurrency(calculateTotal() * newPurchaseData.tax / (100 + newPurchaseData.tax))}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center text-lg font-bold">
                    <span>Total de la Compra:</span>
                    <span>{displayPYGCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  name="notes"
                  value={newPurchaseData.notes}
                  onChange={handleNewPurchaseChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  rows="3"
                  placeholder="Observaciones adicionales..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPurchaseModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Registrando..." : "Registrar Compra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para subir documentos */}
      {showFileUploadModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-lg text-gray-800">
                Subir Documentos - {selectedPurchase.purchaseNumber}
              </h2>
              <button 
                className="text-2xl text-gray-600 hover:text-black" 
                onClick={() => {
                  setShowFileUploadModal(false);
                  setSelectedPurchase(null);
                  setFileUpload({ invoice: null, receipt: null });
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factura (PDF o Imagen)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFileUpload(prev => ({ ...prev, invoice: e.target.files[0] }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recibo/Comprobante (PDF o Imagen)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFileUpload(prev => ({ ...prev, receipt: e.target.files[0] }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formatos permitidos: PDF, JPG, PNG (Máx. 5MB cada uno)
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowFileUploadModal(false);
                    setSelectedPurchase(null);
                    setFileUpload({ invoice: null, receipt: null });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Subir Documentos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseManagement;