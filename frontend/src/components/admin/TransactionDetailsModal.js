// frontend/src/components/admin/TransactionDetailsModal.js
import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaShoppingCart, FaMapMarkerAlt, FaCreditCard, FaChartLine, FaInfoCircle } from 'react-icons/fa';
import DeliveryProgress from '../delivery/DeliveryProgress';
import { formatDeliveryDate } from '../../helpers/deliveryHelpers';
import { getTransactionDisplayStatus, getStatusBadgeClass, canManageDelivery } from '../../helpers/transactionStatusHelper';
import { formatCurrencyWithOptions } from '../../helpers/displayCurrency';

const TransactionDetailsModal = ({ transaction, onClose }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactionDetails();
  }, [transaction._id]);

  const fetchTransactionDetails = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/transactions/${transaction._id}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setTransactionDetails(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayPYGCurrency = (num) => {
    return new Intl.NumberFormat('es-PY', {
      style: "currency",
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(num);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: FaInfoCircle },
    { id: 'customer', label: 'Cliente', icon: FaUser },
    { id: 'products', label: 'Productos', icon: FaShoppingCart },
    { id: 'delivery', label: 'Entrega', icon: FaMapMarkerAlt },
    { id: 'payment', label: 'Pago', icon: FaCreditCard },
    { id: 'analytics', label: 'Analytics', icon: FaChartLine }
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin w-12 h-12 border-4 border-[#2A3190] border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-center">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  const details = transactionDetails || transaction;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-[#2A3190] text-white">
          <div>
            <h2 className="text-xl font-bold">📋 Detalles Completos</h2>
            <p className="text-blue-100">Transacción #{details.shop_process_id}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-300 text-2xl">
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#2A3190] text-[#2A3190] bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-[#2A3190] hover:bg-gray-50'
                }`}
              >
                <Icon className="text-sm" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          
          {/* Tab: General */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">💳 Información de Transacción</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Shop Process ID:</span>
                        <span className="font-medium text-lg">#{details.shop_process_id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Bancard Process ID:</span>
                        <span className="font-medium font-mono text-xs">{details.bancard_process_id || 'N/A'}</span>
                    </div>
                    
                    {/* Estado de Pago Mejorado */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Estado de Pago:</span>
                        <span className={getStatusBadgeClass(details)}>
                            {details.status === 'approved' ? '✅' : 
                            details.status === 'rejected' ? '❌' : 
                            details.status === 'pending' ? '⏳' : '❓'} 
                            {details.status === 'approved' ? 'Aprobado' :
                            details.status === 'rejected' ? 'Rechazado' :
                            details.status === 'pending' ? 'Pendiente' : details.status}
                        </span>
                    </div>
                    
                    {/* Estado de Delivery solo si está aprobado */}
                    {canManageDelivery(details) && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Estado de Entrega:</span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {getTransactionDisplayStatus(details).data.icon} {getTransactionDisplayStatus(details).data.title}
                            </span>
                        </div>
                    )}
                    
                    <div className="flex justify-between">
                        <span className="text-gray-600">Autorización:</span>
                        <span className="font-medium font-mono text-xs">{details.authorization_number || 'Pendiente'}</span>
                    </div>
                    
                    {/* Información adicional si está rechazado */}
                    {details.status === 'rejected' && details.response_description && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                            <span className="text-red-800 font-medium text-xs">
                                ❌ Motivo: {details.response_description}
                            </span>
                        </div>
                    )}
                </div>
            </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">💰 Información Financiera</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monto Total:</span>
                      <span className="font-bold text-green-600">{displayPYGCurrency(details.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Moneda:</span>
                      <span className="font-medium">{details.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Método de Pago:</span>
                      <span className="font-medium">
                        {details.payment_method === 'saved_card' ? '💳 Tarjeta Guardada' : '🆕 Nueva Tarjeta'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo de Pago:</span>
                      <span className="font-medium">
                        {details.is_token_payment ? 'Token' : 'Ocasional'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Progress */}
              <DeliveryProgress
                deliveryStatus={details.delivery_status}
                timeline={details.delivery_timeline}
                estimatedDate={details.estimated_delivery_date}
                actualDate={details.actual_delivery_date}
                trackingNumber={details.tracking_number}
                transaction={details}
            />
            </div>
          )}

          {/* Tab: Customer */}
          {activeTab === 'customer' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-3">👤 Datos Personales</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-blue-600 font-medium">Nombre:</span>
                      <p className="text-gray-800">{details.customer_info?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Email:</span>
                      <p className="text-gray-800">{details.customer_info?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Teléfono:</span>
                      <p className="text-gray-800">{details.customer_info?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Ciudad:</span>
                      <p className="text-gray-800">{details.customer_info?.city || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-3">🏠 Dirección</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-green-600 font-medium">Dirección:</span>
                      <p className="text-gray-800">{details.customer_info?.address || details.customer_info?.fullAddress || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-green-600 font-medium">Casa/Dpto:</span>
                      <p className="text-gray-800">{details.customer_info?.houseNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-green-600 font-medium">Referencia:</span>
                      <p className="text-gray-800">{details.customer_info?.reference || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de Usuario */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">📊 Información del Usuario</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <p className="font-medium">{details.user_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">IP:</span>
                    <p className="font-medium">{details.ip_address || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Dispositivo:</span>
                    <p className="font-medium capitalize">{details.device_type || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">ID Bancard:</span>
                    <p className="font-medium">{details.user_bancard_id || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Products */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">🛍️ Productos Comprados ({details.items?.length || 0})</h3>
              
              {details.items && details.items.length > 0 ? (
                <div className="grid gap-4">
                  {details.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex gap-4">
                        {/* Imagen del Producto */}
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.product_details?.productImage?.[0] ? (
                            <img 
                              src={item.product_details.productImage[0]} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-400 text-2xl">📦</span>
                          )}
                        </div>
                        
                        {/* Detalles del Producto */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-800">{item.name}</h4>
                              <p className="text-sm text-gray-600">{item.brand || 'N/A'}</p>
                              <p className="text-sm text-gray-500">{item.category || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                {displayPYGCurrency(item.total || (item.quantity * item.unitPrice))}
                              </p>
                              <p className="text-sm text-gray-500">
                                {item.quantity} × {displayPYGCurrency(item.unitPrice)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Información Adicional del Producto */}
                          {item.product_details && (
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <div>SKU: {item.sku || 'N/A'}</div>
                              <div>Stock: {item.product_details.stock || 'N/A'}</div>
                              <div>Precio Lista: {displayPYGCurrency(item.product_details.price || 0)}</div>
                              <div>Precio Venta: {displayPYGCurrency(item.product_details.sellingPrice || 0)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  📦 No hay información detallada de productos
                </div>
              )}

              {/* Resumen de Compra */}
              <div className="border-t pt-4 mt-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center text-lg font-bold text-[#2A3190]">
                    <span>Total de la Compra:</span>
                    <span>{displayPYGCurrency(details.amount)}</span>
                  </div>
                  {details.tax_amount > 0 && (
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>IVA incluido:</span>
                      <span>{displayPYGCurrency(details.tax_amount)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Delivery */}
          {activeTab === 'delivery' && (
            <div className="space-y-6">
              {/* Información de Entrega */}
              {details.delivery_location && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-3">📍 Ubicación de Entrega</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-blue-600 font-medium">Dirección:</span>
                      <p className="text-gray-800">{details.delivery_location.address || details.delivery_location.manual_address}</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Ciudad:</span>
                      <p className="text-gray-800">{details.delivery_location.city}</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Casa/Edificio:</span>
                      <p className="text-gray-800">{details.delivery_location.house_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Referencia:</span>
                      <p className="text-gray-800">{details.delivery_location.reference || 'N/A'}</p>
                    </div>
                    {details.delivery_location.lat && details.delivery_location.lng && (
                      <div>
                        <span className="text-blue-600 font-medium">Coordenadas:</span>
                        <p className="text-gray-800">
                          {details.delivery_location.lat}, {details.delivery_location.lng}
                        </p>

                        <div className="mt-2 flex gap-2">
                          <a
                            href={`https://maps.google.com/?q=${details.delivery_location.lat},${details.delivery_location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                          >
                            🗺️ Ver en Google Maps
                          </a>

                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${details.delivery_location.lat},${details.delivery_location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                          >
                            🧭 Navegar
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Instrucciones de Entrega */}
              {details.delivery_location?.delivery_instructions && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">📝 Instrucciones de Entrega</h3>
                  <pre className="text-sm text-yellow-700 whitespace-pre-wrap">
                    {details.delivery_location.delivery_instructions}
                  </pre>
                </div>
              )}

              {/* Información de Tracking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">🚚 Información de Envío</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Método:</span>
                      <span className="font-medium capitalize">{details.delivery_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tracking:</span>
                      <span className="font-medium">{details.tracking_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Courier:</span>
                      <span className="font-medium">{details.courier_company || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">📅 Fechas</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Estimada:</span>
                      <p className="font-medium">{formatDeliveryDate(details.estimated_delivery_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Real:</span>
                      <p className="font-medium">{formatDeliveryDate(details.actual_delivery_date)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Payment */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-3">💳 Detalles de Pago</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">Método:</span>
                      <span className="font-medium">
                        {details.payment_method === 'saved_card' ? '💳 Tarjeta Guardada' : '🆕 Nueva Tarjeta'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Tipo:</span>
                      <span className="font-medium">{details.is_token_payment ? 'Pago con Token' : 'Pago Ocasional'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Autorización:</span>
                      <span className="font-medium">{details.authorization_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Ticket:</span>
                      <span className="font-medium">{details.ticket_number || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-3">🏦 Respuesta Bancard</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Respuesta:</span>
                      <span className={`font-medium ${details.response === 'S' ? 'text-green-600' : 'text-red-600'}`}>
                        {details.response === 'S' ? '✅ Aprobado' : details.response === 'N' ? '❌ Rechazado' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Código:</span>
                      <span className="font-medium">{details.response_code || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-yellow-600">Descripción:</span>
                      <p className="font-medium text-gray-800">{details.response_description || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Promociones */}
              {details.has_promotion && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800 mb-2">🎟️ Promoción Aplicada</h3>
                  <p className="text-purple-700">{details.promotion_code || 'Promoción aplicada'}</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Analytics */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-3">🌐 Información de Sesión</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-blue-600">IP Address:</span>
                      <p className="font-medium">{details.ip_address || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">User Agent:</span>
                      <p className="font-medium text-xs break-all">{details.user_agent || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Dispositivo:</span>
                      <p className="font-medium capitalize">{details.device_type}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Referrer:</span>
                      <p className="font-medium text-xs break-all">{details.referrer_url || 'Directo'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-3">📊 Datos UTM</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">Source:</span>
                      <span className="font-medium">{details.utm_source || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Medium:</span>
                      <span className="font-medium">{details.utm_medium || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Campaign:</span>
                      <span className="font-medium">{details.utm_campaign || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Term:</span>
                      <span className="font-medium">{details.utm_term || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fechas Importantes */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">📅 Timeline de la Transacción</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Creada:</span>
                    <p className="font-medium">{formatDeliveryDate(details.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Confirmada:</span>
                    <p className="font-medium">{formatDeliveryDate(details.confirmation_date)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Última actualización:</span>
                    <p className="font-medium">{formatDeliveryDate(details.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Calificación del Cliente */}
              {details.customer_satisfaction && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-3">⭐ Calificación del Cliente</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`text-xl ${star <= details.customer_satisfaction.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                          ⭐
                        </span>
                      ))}
                    </div>
                    <span className="font-medium">{details.customer_satisfaction.rating}/5</span>
                  </div>
                  {details.customer_satisfaction.feedback && (
                    <p className="mt-2 text-yellow-700 italic">"{details.customer_satisfaction.feedback}"</p>
                  )}
                  <p className="text-xs text-yellow-600 mt-2">
                    Calificado el {formatDeliveryDate(details.customer_satisfaction.submitted_at)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailsModal;