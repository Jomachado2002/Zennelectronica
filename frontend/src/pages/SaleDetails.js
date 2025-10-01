// frontend/src/pages/SaleDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaPrint, FaFileInvoiceDollar, FaUser, FaCalendarAlt, FaMoneyBillWave, FaFileUpload, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const SaleDetails = () => {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [fileUpload, setFileUpload] = useState(null);
  const [editData, setEditData] = useState({
    paymentStatus: '',
    paymentMethod: '',
    notes: ''
  });

  useEffect(() => {
    if (saleId) {
      fetchSaleDetails();
    }
  }, [saleId]);

  const fetchSaleDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/${saleId}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setSale(result.data);
        setEditData({
          paymentStatus: result.data.paymentStatus,
          paymentMethod: result.data.paymentMethod,
          notes: result.data.notes || ''
        });
      } else {
        toast.error(result.message || "Error al cargar los detalles de la venta");
        navigate('/panel-admin/ventas');
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
      navigate('/panel-admin/ventas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateSale = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/${saleId}/pago`, {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(editData)
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Venta actualizada correctamente");
        setShowEditModal(false);
        fetchSaleDetails();
      } else {
        toast.error(result.message || "Error al actualizar la venta");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!fileUpload) {
      toast.error("Debe seleccionar un archivo");
      return;
    }

    const formData = new FormData();
    formData.append('invoice', fileUpload);

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/ventas/${saleId}/factura`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Factura subida correctamente");
        setShowFileUploadModal(false);
        setFileUpload(null);
        fetchSaleDetails();
      } else {
        toast.error(result.message || "Error al subir la factura");
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando detalles de la venta...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Venta no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/panel-admin/ventas')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-bold">
            Venta {sale.saleNumber}
          </h1>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <FaEdit className="mr-2" /> Editar
          </button>
          <button
            onClick={handlePrint}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
          >
            <FaPrint className="mr-2" /> Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detalles de la Venta */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaFileInvoiceDollar className="mr-2 text-blue-600" />
              Información de la Venta
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Número de Venta</label>
                <p className="text-lg font-semibold">{sale.saleNumber}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de Venta</label>
                <p className="text-gray-900">{getSaleTypeLabel(sale.saleType)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de Venta</label>
                <p className="text-gray-900 flex items-center">
                  <FaCalendarAlt className="mr-1 text-gray-400" />
                  {formatDate(sale.saleDate)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
                <p className="text-gray-900">{sale.paymentMethod}</p>
              </div>
              
              {sale.dueDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
                  <p className="text-gray-900">{formatDate(sale.dueDate)}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Estado de Pago</label>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sale.paymentStatus)}`}>
                  {getStatusLabel(sale.paymentStatus)}
                </span>
              </div>
            </div>

            {sale.notes && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Notas</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{sale.notes}</p>
              </div>
            )}
          </div>

          {/* Items de la Venta */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Items de la Venta</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sale.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {displayPYGCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {displayPYGCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Información del Cliente */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaUser className="mr-2 text-green-600" />
              Cliente
            </h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <p className="text-gray-900 font-medium">
                  {sale.clientSnapshot?.name || sale.client?.name}
                </p>
              </div>
              
              {(sale.clientSnapshot?.company || sale.client?.company) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Empresa</label>
                  <p className="text-gray-900">
                    {sale.clientSnapshot?.company || sale.client?.company}
                  </p>
                </div>
              )}
              
              {(sale.clientSnapshot?.email || sale.client?.email) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">
                    {sale.clientSnapshot?.email || sale.client?.email}
                  </p>
                </div>
              )}
              
              {(sale.clientSnapshot?.phone || sale.client?.phone) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <p className="text-gray-900">
                    {sale.clientSnapshot?.phone || sale.client?.phone}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Resumen de Totales */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaMoneyBillWave className="mr-2 text-green-600" />
              Totales
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{displayPYGCurrency(sale.subtotal)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">IVA ({sale.tax}%):</span>
                <span className="font-medium">{displayPYGCurrency(sale.taxAmount)}</span>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-lg font-bold text-green-600">
                    {displayPYGCurrency(sale.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Factura */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Factura</h2>
            
            {sale.invoiceFile ? (
              <div className="space-y-3">
                <p className="text-green-600 text-sm">✓ Factura adjunta</p>
                <div className="flex space-x-2">
                  <a
                    href={sale.invoiceFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm"
                  >
                    <FaEye className="mr-1" /> Ver
                  </a>
                  <button
                    onClick={() => setShowFileUploadModal(true)}
                    className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center text-sm"
                  >
                    <FaFileUpload className="mr-1" /> Cambiar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-yellow-600 text-sm">⚠ Sin factura adjunta</p>
                <button
                  onClick={() => setShowFileUploadModal(true)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <FaFileUpload className="mr-2" /> Subir Factura
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para editar venta */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-lg text-gray-800">Editar Venta</h2>
              <button 
                className="text-2xl text-gray-600 hover:text-black" 
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateSale} className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado de Pago
                  </label>
                  <select
                    name="paymentStatus"
                    value={editData.paymentStatus}
                    onChange={handleEditChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Parcial</option>
                    <option value="pagado">Pagado</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    name="paymentMethod"
                    value={editData.paymentMethod}
                    onChange={handleEditChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    name="notes"
                    value={editData.notes}
                    onChange={handleEditChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg"
                    rows="3"
                    placeholder="Observaciones adicionales..."
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para subir factura */}
      {showFileUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-lg text-gray-800">
                Subir Factura
              </h2>
              <button 
                className="text-2xl text-gray-600 hover:text-black" 
                onClick={() => {
                  setShowFileUploadModal(false);
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

export default SaleDetails;