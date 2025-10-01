// frontend/src/pages/PurchaseDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaPrint, FaShoppingCart, FaBuilding, FaCalendarAlt, FaMoneyBillWave, FaFileUpload, FaEye, FaReceipt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const PurchaseDetails = () => {
  const { purchaseId } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [fileUpload, setFileUpload] = useState({
    invoice: null,
    receipt: null
  });
  const [editData, setEditData] = useState({
    paymentStatus: '',
    paymentMethod: '',
    notes: ''
  });

  useEffect(() => {
    if (purchaseId) {
      fetchPurchaseDetails();
    }
  }, [purchaseId]);

  const fetchPurchaseDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras/${purchaseId}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setPurchase(result.data);
        setEditData({
          paymentStatus: result.data.paymentStatus,
          paymentMethod: result.data.paymentMethod,
          notes: result.data.notes || ''
        });
      } else {
        toast.error(result.message || "Error al cargar los detalles de la compra");
        navigate('/panel-admin/compras');
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
      navigate('/panel-admin/compras');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePurchase = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras/${purchaseId}/pago`, {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(editData)
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Compra actualizada correctamente");
        setShowEditModal(false);
        fetchPurchaseDetails();
      } else {
        toast.error(result.message || "Error al actualizar la compra");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!fileUpload.invoice && !fileUpload.receipt) {
      toast.error("Debe seleccionar al menos un archivo");
      return;
    }

    const formData = new FormData();
    if (fileUpload.invoice) formData.append('invoice', fileUpload.invoice);
    if (fileUpload.receipt) formData.append('receipt', fileUpload.receipt);

    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/compras/${purchaseId}/documentos`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Documentos subidos correctamente");
        setShowFileUploadModal(false);
        setFileUpload({ invoice: null, receipt: null });
        fetchPurchaseDetails();
      } else {
        toast.error(result.message || "Error al subir los documentos");
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

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'producto': return 'Producto';
      case 'servicio': return 'Servicio';
      case 'gasto_fijo': return 'Gasto Fijo';
      case 'gasto_variable': return 'Gasto Variable';
      case 'inversion': return 'Inversión';
      default: return category;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount, currency = 'PYG') => {
    if (currency === 'PYG') {
      return displayPYGCurrency(amount);
    }
    return `${currency} ${amount.toFixed(2)}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando detalles de la compra...</p>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Compra no encontrada</p>
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
            onClick={() => navigate('/panel-admin/compras')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-bold">
            Compra {purchase.purchaseNumber}
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
          {/* Detalles de la Compra */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaShoppingCart className="mr-2 text-blue-600" />
              Información de la Compra
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Número de Compra</label>
                <p className="text-lg font-semibold">{purchase.purchaseNumber}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de Compra</label>
                <p className="text-gray-900">{getPurchaseTypeLabel(purchase.purchaseType)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de Compra</label>
                <p className="text-gray-900 flex items-center">
                  <FaCalendarAlt className="mr-1 text-gray-400" />
                  {formatDate(purchase.purchaseDate)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
                <p className="text-gray-900">{purchase.paymentMethod}</p>
              </div>
              
              {purchase.dueDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
                  <p className="text-gray-900">{formatDate(purchase.dueDate)}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Estado de Pago</label>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(purchase.paymentStatus)}`}>
                  {getStatusLabel(purchase.paymentStatus)}
                </span>
              </div>
            </div>

            {purchase.notes && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Notas</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{purchase.notes}</p>
              </div>
            )}
          </div>

          {/* Items de la Compra */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Items de la Compra</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Categoría</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Moneda</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal (PYG)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchase.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {getCategoryLabel(item.category)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {formatCurrency(item.unitPrice, item.currency)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {item.currency}
                        {item.currency !== 'PYG' && item.exchangeRate && (
                          <div className="text-xs text-gray-400">
                            TC: {item.exchangeRate}
                          </div>
                        )}
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
          {/* Información del Proveedor */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaBuilding className="mr-2 text-blue-600" />
              Proveedor
            </h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <p className="text-gray-900 font-medium">
                  {purchase.supplierSnapshot?.name || purchase.supplier?.name || purchase.supplierInfo?.name}
                </p>
              </div>
              
              {(purchase.supplierSnapshot?.company || purchase.supplier?.company || purchase.supplierInfo?.company) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Empresa</label>
                  <p className="text-gray-900">
                    {purchase.supplierSnapshot?.company || purchase.supplier?.company || purchase.supplierInfo?.company}
                  </p>
                </div>
              )}
              
              {(purchase.supplierSnapshot?.email || purchase.supplier?.email) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">
                    {purchase.supplierSnapshot?.email || purchase.supplier?.email}
                  </p>
                </div>
              )}
              
              {(purchase.supplierSnapshot?.phone || purchase.supplier?.phone || purchase.supplierInfo?.contact) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contacto</label>
                  <p className="text-gray-900">
                    {purchase.supplierSnapshot?.phone || purchase.supplier?.phone || purchase.supplierInfo?.contact}
                  </p>
                </div>
              )}

              {purchase.supplierInfo?.ruc && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">RUC</label>
                  <p className="text-gray-900">{purchase.supplierInfo.ruc}</p>
                </div>
              )}
            </div>
          </div>

          {/* Resumen de Totales */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaMoneyBillWave className="mr-2 text-red-600" />
              Totales
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{displayPYGCurrency(purchase.subtotal)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">IVA ({purchase.tax}%):</span>
                <span className="font-medium">{displayPYGCurrency(purchase.taxAmount)}</span>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-lg font-bold text-red-600">
                    {displayPYGCurrency(purchase.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Documentos</h2>
            
            <div className="space-y-4">
              {/* Factura */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Factura</h3>
                {purchase.invoiceFile ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600 text-sm flex-1">✓ Adjunta</span>
                    <a
                      href={purchase.invoiceFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                      title="Ver factura"
                    >
                      <FaEye />
                    </a>
                  </div>
                ) : (
                  <p className="text-yellow-600 text-sm">⚠ Sin factura</p>
                )}
              </div>

              {/* Recibo */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Recibo/Comprobante</h3>
                {purchase.receiptFile ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600 text-sm flex-1">✓ Adjunto</span>
                    <a
                      href={purchase.receiptFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                      title="Ver recibo"
                    >
                      <FaReceipt />
                    </a>
                  </div>
                ) : (
                  <p className="text-yellow-600 text-sm">⚠ Sin recibo</p>
                )}
              </div>

              {(!purchase.invoiceFile || !purchase.receiptFile) && (
                <button
                  onClick={() => setShowFileUploadModal(true)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <FaFileUpload className="mr-2" /> Subir Documentos
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para editar compra */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-lg text-gray-800">Editar Compra</h2>
              <button 
                className="text-2xl text-gray-600 hover:text-black" 
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdatePurchase} className="p-4">
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

      {/* Modal para subir documentos */}
      {showFileUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-lg text-gray-800">
                Subir Documentos
              </h2>
              <button 
                className="text-2xl text-gray-600 hover:text-black" 
                onClick={() => {
                  setShowFileUploadModal(false);
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

export default PurchaseDetails;