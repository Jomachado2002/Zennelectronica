// frontend/src/pages/SalesManagement.js - CON SOPORTE MULTI-MONEDA
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaFileUpload, FaEye, FaFilter, FaFileInvoiceDollar, FaMoneyBillWave, FaDollarSign } from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const SalesManagement = () => {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [filters, setFilters] = useState({
    saleType: '',
    paymentStatus: '',
    startDate: '',
    endDate: '',
    clientId: ''
  });

  // Estado del formulario de nueva venta CON SOPORTE MULTI-MONEDA
  const [newSaleData, setNewSaleData] = useState({
    saleType: 'terminal',
    clientId: '',
    items: [{ 
      description: '', 
      quantity: 1, 
      unitPrice: 0, 
      currency: 'PYG', 
      exchangeRate: 7300 
    }],
    tax: 10, // ✅ IVA por defecto 10%
    paymentMethod: 'efectivo',
    paymentStatus: 'pendiente',
    dueDate: '',
    saleDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [fileUpload, setFileUpload] = useState(null);

  useEffect(() => {
    fetchSales();
    fetchClients();
  }, []);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setSales(result.data.sales || []);
      } else {
        toast.error(result.message || "Error al cargar las ventas");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/clientes`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setClients(result.data.clients || []);
      }
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchSales();
  };

  const resetFilters = () => {
    setFilters({
      saleType: '',
      paymentStatus: '',
      startDate: '',
      endDate: '',
      clientId: ''
    });
  };

  const handleNewSaleChange = (e) => {
    const { name, value } = e.target;
    setNewSaleData(prev => ({ ...prev, [name]: value }));
  };

  // ✅ MANEJO MEJORADO DE ITEMS CON MÚLTIPLES MONEDAS
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...newSaleData.items];
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
    
    setNewSaleData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setNewSaleData(prev => ({
      ...prev,
      items: [...prev.items, { 
        description: '', 
        quantity: 1, 
        unitPrice: 0, 
        currency: 'PYG', 
        exchangeRate: 1 
      }]
    }));
  };

  const removeItem = (index) => {
    if (newSaleData.items.length > 1) {
      const updatedItems = newSaleData.items.filter((_, i) => i !== index);
      setNewSaleData(prev => ({ ...prev, items: updatedItems }));
    }
  };

  // ✅ CÁLCULO TOTAL CON MÚLTIPLES MONEDAS
  const calculateTotal = () => {
    const subtotal = newSaleData.items.reduce((sum, item) => {
      let unitPriceInPYG = item.unitPrice;
      if (item.currency === 'USD') {
        unitPriceInPYG = item.unitPrice * (item.exchangeRate || 7300);
      } else if (item.currency === 'EUR') {
        unitPriceInPYG = item.unitPrice * (item.exchangeRate || 8000);
      }
      return sum + (item.quantity * unitPriceInPYG);
    }, 0);
    
    const taxAmount = subtotal * (newSaleData.tax / 100);
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

  const handleCreateSale = async (e) => {
    e.preventDefault();

    if (!newSaleData.clientId) {
      toast.error("Debe seleccionar un cliente");
      return;
    }

    if (newSaleData.items.some(item => !item.description || item.quantity <= 0 || item.unitPrice <= 0)) {
      toast.error("Todos los items deben tener descripción, cantidad y precio válidos");
      return;
    }

    // Validar tipos de cambio para monedas extranjeras
    const hasInvalidExchangeRate = newSaleData.items.some(item => 
      (item.currency === 'USD' || item.currency === 'EUR') && (!item.exchangeRate || item.exchangeRate <= 0)
    );

    if (hasInvalidExchangeRate) {
      toast.error("Debe especificar un tipo de cambio válido para monedas extranjeras");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(newSaleData)
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Venta creada correctamente");
        setShowNewSaleModal(false);
        setNewSaleData({
          saleType: 'terminal',
          clientId: '',
          items: [{ 
            description: '', 
            quantity: 1, 
            unitPrice: 0, 
            currency: 'PYG', 
            exchangeRate: 1 
          }],
          tax: 10,
          paymentMethod: 'efectivo',
          paymentStatus: 'pendiente',
          dueDate: '',
          saleDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchSales();
      } else {
        toast.error(result.message || "Error al crear la venta");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async (saleId, newStatus) => {
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/${saleId}/pago`, {
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
        fetchSales();
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
    
    if (!fileUpload || !selectedSale) {
      toast.error("Debe seleccionar un archivo");
      return;
    }

    const formData = new FormData();
    formData.append('invoice', fileUpload);

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/${selectedSale._id}/factura`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Factura subida correctamente");
        setShowFileUploadModal(false);
        setFileUpload(null);
        setSelectedSale(null);
        fetchSales();
      } else {
        toast.error(result.message || "Error al subir la factura");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta venta?')) {
      return;
    }

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/${saleId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Venta eliminada correctamente");
        fetchSales();
      } else {
        toast.error(result.message || "Error al eliminar la venta");
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

  const getSaleTypeLabel = (type) => {
    switch (type) {
      case 'terminal': return 'Terminal';
      case 'logistica': return 'Logística';
      case 'producto': return 'Producto';
      case 'servicio': return 'Servicio';
      case 'otros': return 'Otros';
      default: return type;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <FaMoneyBillWave className="mr-2 text-green-600" />
          Gestión de Ventas
        </h1>
        
        <button
          onClick={() => setShowNewSaleModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
        >
          <FaPlus className="mr-2" /> Nueva Venta
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
              Tipo de Venta
            </label>
            <select
              name="saleType"
              value={filters.saleType}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Todos los tipos</option>
              <option value="terminal">Terminal</option>
              <option value="logistica">Logística</option>
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
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
              Cliente
            </label>
            <select
              name="clientId"
              value={filters.clientId}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Todos los clientes</option>
              {clients.map(client => (
                <option key={client._id} value={client._id}>
                  {client.name} {client.company ? `(${client.company})` : ''}
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

      {/* Tabla de ventas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando ventas...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center">
            <FaFileInvoiceDollar className="text-5xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron ventas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">IVA</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Factura</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {sale.saleNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getSaleTypeLabel(sale.saleType)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>
                        <div className="font-medium">{sale.clientSnapshot?.name || sale.client?.name}</div>
                        {sale.clientSnapshot?.company && (
                          <div className="text-xs text-gray-400">{sale.clientSnapshot.company}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="font-medium">{displayPYGCurrency(sale.totalAmount)}</div>
                      {/* Mostrar si hay items en moneda extranjera */}
                      {sale.items?.some(item => item.currency !== 'PYG') && (
                        <div className="text-xs text-blue-600 flex items-center justify-end">
                          <FaDollarSign className="mr-1" /> Multi-moneda
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {sale.tax}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="relative group">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sale.paymentStatus)}`}>
                          {getStatusLabel(sale.paymentStatus)}
                        </span>
                        
                        {/* Menú desplegable para cambiar estado */}
                        <div className="absolute right-0 mt-2 hidden group-hover:block z-10 w-32 bg-white rounded-md shadow-lg">
                          <div className="py-1">
                            {['pendiente', 'parcial', 'pagado', 'vencido'].map((status) => (
                              <button
                                key={status}
                                className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left ${sale.paymentStatus === status ? 'font-medium' : ''}`}
                                onClick={() => handleUpdatePaymentStatus(sale._id, status)}
                              >
                                {getStatusLabel(status)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {new Date(sale.saleDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sale.invoiceFile ? (
                        <a
                          href={sale.invoiceFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800"
                          title="Ver factura"
                        >
                          <FaEye />
                        </a>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowFileUploadModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Subir factura"
                        >
                          <FaFileUpload />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center space-x-2">
                        <Link
                          to={`/panel-admin/ventas/${sale._id}`}
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver detalles"
                        >
                          <FaEye />
                        </Link>
                        <button
                          onClick={() => handleDeleteSale(sale._id)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar venta"
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

      {/* Modal para nueva venta - CON SOPORTE MULTI-MONEDA */}
      {showNewSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-xl text-gray-800">Nueva Venta</h2>
              <button 
                className="text-3xl text-gray-600 hover:text-black" 
                onClick={() => setShowNewSaleModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSale} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Venta *
                  </label>
                  <select
                    name="saleType"
                    value={newSaleData.saleType}
                    onChange={handleNewSaleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="terminal">Terminal</option>
                    <option value="logistica">Logística</option>
                    <option value="producto">Producto</option>
                    <option value="servicio">Servicio</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <select
                    name="clientId"
                    value={newSaleData.clientId}
                    onChange={handleNewSaleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map(client => (
                      <option key={client._id} value={client._id}>
                        {client.name} {client.company ? `(${client.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Venta
                  </label>
                  <input
                    type="date"
                    name="saleDate"
                    value={newSaleData.saleDate}
                    onChange={handleNewSaleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    name="paymentMethod"
                    value={newSaleData.paymentMethod}
                    onChange={handleNewSaleChange}
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
                    value={newSaleData.tax}
                    onChange={handleNewSaleChange}
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
                    value={newSaleData.dueDate}
                    onChange={handleNewSaleChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Items de la venta CON SOPORTE MULTI-MONEDA */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Items de la Venta</h3>
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
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Moneda</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">T.C.</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal (₲)</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {newSaleData.items.map((item, index) => (
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
                            {newSaleData.items.length > 1 && (
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
                    <span>{displayPYGCurrency(calculateTotal() - (calculateTotal() * newSaleData.tax / (100 + newSaleData.tax)))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA ({newSaleData.tax}%):</span>
                    <span>{displayPYGCurrency(calculateTotal() * newSaleData.tax / (100 + newSaleData.tax))}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center text-lg font-bold">
                    <span>Total de la Venta:</span>
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
                  value={newSaleData.notes}
                  onChange={handleNewSaleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  rows="3"
                  placeholder="Observaciones adicionales..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewSaleModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Creando..." : "Crear Venta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para subir factura */}
      {showFileUploadModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-lg text-gray-800">
                Subir Factura - {selectedSale.saleNumber}
              </h2>
              <button 
                className="text-2xl text-gray-600 hover:text-black" 
                onClick={() => {
                  setShowFileUploadModal(false);
                  setSelectedSale(null);
                  setFileUpload(null);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Archivo de Factura (PDF o Imagen)
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFileUpload(e.target.files[0])}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formatos permitidos: PDF, JPG, PNG (Máx. 5MB)
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFileUploadModal(false);
                    setSelectedSale(null);
                    setFileUpload(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Subir Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManagement;