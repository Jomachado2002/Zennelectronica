// frontend/src/pages/BudgetDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaFileDownload, FaEnvelope, FaEdit, FaTrashAlt, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const BudgetDetails = () => {
  const { budgetId } = useParams();
  const [budget, setBudget] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailData, setEmailData] = useState({
    emailTo: '',
    subject: '',
    message: ''
  });
  
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchBudgetDetails();
  }, [budgetId]);
  
  const fetchBudgetDetails = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos/${budgetId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBudget(result.data);
        
        // Pre-llenar datos de email si hay cliente con email
        if (result.data.client && result.data.client.email) {
          setEmailData(prev => ({
            ...prev,
            emailTo: result.data.client.email
          }));
        }
      } else {
        toast.error(result.message || "Error al cargar el presupuesto");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };
  
  const downloadPDF = () => {
    if (!budget) return;
    
    // Crear un enlace temporal para la descarga
    const link = document.createElement('a');
    link.href = `${SummaryApi.baseURL}/api/finanzas/presupuestos/${budgetId}/pdf`;
    link.setAttribute('download', `presupuesto-${budget.budgetNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Descargando PDF...");
  };
  
  const handleSendEmail = async (e) => {
    e.preventDefault();
    
    if (!emailData.emailTo) {
      toast.error("Por favor, proporcione un email de destino");
      return;
    }
    
    setIsSending(true);
    
    try {
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos/${budgetId}/email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Presupuesto enviado por email correctamente");
        setShowEmailForm(false);
        // Actualizar estado del presupuesto si cambió
        if (result.data.status !== budget.status) {
          setBudget({
            ...budget,
            status: result.data.status
          });
        }
      } else {
        toast.error(result.message || "Error al enviar el email");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    } finally {
      setIsSending(false);
    }
  };
  
  const handleDeleteBudget = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer.')) {
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
        navigate("/panel-admin/presupuestos");
      } else {
        toast.error(result.message || "Error al eliminar el presupuesto");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de conexión");
    }
  };
  
  const handleStatusChange = async (newStatus) => {
    try {
      console.log(`Cambiando estado a: ${newStatus}`);
      
      // Mostrar un toast de carga
      const loadingToast = toast.loading("Actualizando estado...");
      
      const response = await fetch(`${SummaryApi.baseURL}/api/finanzas/presupuestos/${budgetId}/estado`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const result = await response.json();
      
      // Actualizar el toast según el resultado
      if (result.success) {
        toast.update(loadingToast, {
          render: `Estado actualizado a "${getStatusLabel(newStatus)}"`,
          type: "success",
          isLoading: false,
          autoClose: 3000
        });
        
        setBudget({
          ...budget,
          status: newStatus
        });
      } else {
        toast.update(loadingToast, {
          render: result.message || "Error al actualizar el estado",
          type: "error",
          isLoading: false,
          autoClose: 5000
        });
        
        console.error("Error del servidor:", result);
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      toast.error("Error de conexión al actualizar estado");
    }
  };
  
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
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Cargando detalles del presupuesto...</p>
      </div>
    );
  }
  
  if (!budget) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 p-4 rounded-lg border border-red-300 mb-4">
          <p className="text-red-800">No se pudo cargar el presupuesto solicitado.</p>
        </div>
        <Link to="/panel-admin/presupuestos" className="text-blue-600 hover:underline inline-flex items-center">
          <FaArrowLeft className="mr-2" /> Volver a la lista de presupuestos
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <Link to="/panel-admin/presupuestos" className="text-blue-600 hover:underline mb-6 inline-flex items-center">
        <FaArrowLeft className="mr-2" /> Volver a la lista de presupuestos
      </Link>
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow mb-6">
        <div>
          <h1 className="text-2xl font-bold">Presupuesto {budget.budgetNumber}</h1>
          <div className="flex items-center mt-1">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mr-2 ${getStatusColor(budget.status)}`}>
              {getStatusLabel(budget.status)}
            </span>
            <span className="text-gray-500 text-sm">
              Creado el {new Date(budget.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <button
            onClick={downloadPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center"
          >
            <FaFileDownload className="mr-2" /> Descargar PDF
          </button>
          
          <button
            onClick={() => setShowEmailForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 inline-flex items-center"
          >
            <FaEnvelope className="mr-2" /> Enviar por Email
          </button>
          
          <button
            onClick={handleDeleteBudget}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 inline-flex items-center"
          >
            <FaTrashAlt className="mr-2" /> Eliminar
          </button>
        </div>
      </div>
      
      {/* Formulario de Email */}
      {showEmailForm && (
        <div className="bg-blue-50 p-6 rounded-lg shadow mb-6 border border-blue-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-blue-800">Enviar Presupuesto por Email</h3>
            <button 
              onClick={() => setShowEmailForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTrashAlt />
            </button>
          </div>
          
          <form onSubmit={handleSendEmail}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label htmlFor="emailTo" className="block text-sm font-medium text-gray-700 mb-1">
                  Destinatario *
                </label>
                <input
                  type="email"
                  id="emailTo"
                  value={emailData.emailTo}
                  onChange={(e) => setEmailData({...emailData, emailTo: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Email del destinatario"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Asunto (opcional)
                </label>
                <input
                  type="text"
                  id="subject"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder={`Presupuesto ${budget.budgetNumber}`}
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje (opcional)
                </label>
                <textarea
                  id="message"
                  value={emailData.message}
                  onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows="4"
                  placeholder={`Estimado cliente,\n\nAdjunto encontrará el presupuesto solicitado número ${budget.budgetNumber}.\n\nSaludos cordiales.`}
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="mr-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <FaEnvelope className="mr-2" /> Enviar Email
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Información del Cliente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Cliente</h3>
          
          {budget.client ? (
            <div className="space-y-2">
              <p className="font-medium">{budget.client.name}</p>
              {budget.client.company && <p>{budget.client.company}</p>}
              
              {budget.client.address && (
                <div className="text-sm text-gray-600">
                  {budget.client.address.street && <p>{budget.client.address.street}</p>}
                  {(budget.client.address.city || budget.client.address.state || budget.client.address.zip) && (
                    <p>
                      {budget.client.address.city && `${budget.client.address.city}, `}
                      {budget.client.address.state && `${budget.client.address.state} `}
                      {budget.client.address.zip && budget.client.address.zip}
                    </p>
                  )}
                  {budget.client.address.country && <p>{budget.client.address.country}</p>}
                </div>
              )}
              
              {budget.client.email && (
                <p className="text-sm">
                  <span className="font-medium">Email:</span> {budget.client.email}
                </p>
              )}
              
              {budget.client.phone && (
                <p className="text-sm">
                  <span className="font-medium">Teléfono:</span> {budget.client.phone}
                </p>
              )}
              
              {budget.client.taxId && (
                <p className="text-sm">
                  <span className="font-medium">NIF/CIF:</span> {budget.client.taxId}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">Información de cliente no disponible</p>
          )}
        </div>
        
        {/* Información del Presupuesto */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Detalles</h3>
          
          <div className="space-y-2">
            <p>
              <span className="font-medium">Válido hasta:</span> {new Date(budget.validUntil).toLocaleDateString()}
            </p>
            
            <p>
              <span className="font-medium">Estado:</span> 
              <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(budget.status)}`}>
                {getStatusLabel(budget.status)}
              </span>
            </p>
            
            {budget.paymentTerms && (
              <p>
                <span className="font-medium">Condiciones de pago:</span> {budget.paymentTerms}
              </p>
            )}
            
            {budget.deliveryMethod && (
              <p>
                <span className="font-medium">Método de entrega:</span> {budget.deliveryMethod}
              </p>
            )}
          </div>
          
          <div className="mt-4">
            <p className="font-medium">Cambiar estado:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'].map(status => (
                <button
                  key={status}
                  className={`px-2 py-1 text-xs rounded-full ${
                    budget.status === status 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => handleStatusChange(status)}
                  disabled={budget.status === status}
                >
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Resumen Financiero */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Resumen</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{displayPYGCurrency(budget.totalAmount)}</span>
            </div>
            
            {budget.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Descuento ({budget.discount}%):</span>
                <span className="font-medium">-{displayPYGCurrency(budget.totalAmount * (budget.discount / 100))}</span>
              </div>
            )}
            
            {budget.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">IVA ({budget.tax}%):</span>
                <span className="font-medium">{displayPYGCurrency(budget.totalAmount * (1 - budget.discount / 100) * (budget.tax / 100))}</span>
              </div>
            )}
            
            <div className="flex justify-between pt-2 border-t font-bold text-lg">
              <span>Total:</span>
              <span>{displayPYGCurrency(budget.finalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabla de Productos */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <h3 className="text-lg font-semibold p-4 border-b">Productos y Servicios</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unitario</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Descuento</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {budget.items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-4">
                    <div className="font-medium">{item.productSnapshot?.name || 'Producto'}</div>
                    {item.productSnapshot?.brandName && (
                      <div className="text-sm text-gray-500">{item.productSnapshot.brandName}</div>
                    )}
                    {item.productSnapshot?.description && (
                      <div className="text-sm text-gray-500 mt-1">{item.productSnapshot.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">{item.quantity}</td>
                  <td className="px-4 py-4 text-right">{displayPYGCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-4 text-center">{item.discount ? `${item.discount}%` : '0%'}</td>
                  <td className="px-4 py-4 text-right font-medium">{displayPYGCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Notas */}
      {budget.notes && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Notas</h3>
          <p className="whitespace-pre-line">{budget.notes}</p>
        </div>
      )}
    </div>
  );
};

export default BudgetDetails;