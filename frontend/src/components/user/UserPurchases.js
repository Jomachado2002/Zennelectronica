// frontend/src/components/user/UserPurchases.js - VERSIÓN FINAL CON IMÁGENES CORREGIDAS

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaShoppingBag, 
  FaEye, 
  FaFilter, 
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUndo,
  FaExclamationTriangle,
  FaSearch,
  FaTimes,
  FaChevronDown,
  FaSpinner,
  FaStar,
  FaWhatsapp
} from 'react-icons/fa';
import displayPYGCurrency from '../../helpers/displayCurrency';
import StatusBadge, { StatusWithProgress } from '../common/StatusBadge';
import RatingComponent from '../delivery/RatingComponent';
import { toast } from 'react-toastify';

const UserPurchases = ({ user }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRatingPurchase, setSelectedRatingPurchase] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    delivery_status: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  useEffect(() => {
    if (user) {
      fetchUserPurchases();
    }
  }, [user, filters]);

  const fetchUserPurchases = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (user) {
        if (user.bancardUserId) {
          queryParams.append('user_bancard_id', user.bancardUserId);
        }
        if (user._id) {
          queryParams.append('created_by', user._id);
        }
      }
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/transactions?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success) {
        setPurchases(result.data.transactions || []);
        console.log("🔍 DEBUG - Estructura de compras:", result.data.transactions[0]);
        console.log("🔍 DEBUG - Items del primer pedido:", result.data.transactions[0]?.items);
        console.log("🔍 DEBUG - Primer item completo:", result.data.transactions[0]?.items?.[0]);
      }
    } catch (error) {
      console.error('Error al cargar compras:', error);
      toast.error('Error al cargar tus compras');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FaCheckCircle className="text-green-500" />;
      case 'rejected': return <FaTimesCircle className="text-red-500" />;
      case 'rolled_back': return <FaUndo className="text-orange-500" />;
      case 'pending': return <FaClock className="text-yellow-500" />;
      case 'failed': return <FaExclamationTriangle className="text-red-500" />;
      default: return <FaClock className="text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      delivery_status: '',
      startDate: '',
      endDate: '',
      search: ''
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value && value.trim() !== '').length;
  };

  // ✅ FUNCIÓN MEJORADA PARA WHATSAPP CON DATOS DEL PEDIDO
  const handleWhatsAppContact = (purchase) => {
    const phoneNumber = "595981150393"; // ← TU NÚMERO DE WHATSAPP SIN + NI ESPACIOS
    
    const message = `Hola! Necesito ayuda con mi pedido:

📦 *Pedido #${purchase.shop_process_id}*
📅 Fecha: ${formatDate(purchase.createdAt)}
💰 Total: ${displayPYGCurrency(purchase.amount)}
📋 Estado Pago: ${purchase.status === 'approved' ? 'Pago Aprobado ✅' : purchase.status === 'rejected' ? 'Pago Rechazado ❌' : 'Pendiente ⏳'}
🚚 Estado Entrega: ${purchase.delivery_status === 'delivered' ? 'Entregado ✅' : purchase.delivery_status === 'in_transit' ? 'En Camino 🚚' : purchase.delivery_status === 'preparing_order' ? 'Preparando 📦' : 'Confirmado ✅'}

${purchase.items && purchase.items.length > 0 ? `
📋 *Productos:*
${purchase.items.slice(0, 3).map(item => `• ${item.name} (Cant: ${item.quantity})`).join('\n')}
${purchase.items.length > 3 ? `• +${purchase.items.length - 3} productos más` : ''}
` : ''}
${purchase.customer_info?.email ? `📧 Email: ${purchase.customer_info.email}\n` : ''}
${purchase.customer_info?.phone ? `📱 Teléfono: ${purchase.customer_info.phone}\n` : ''}

Por favor, ¿me pueden ayudar?`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    toast.success('Abriendo WhatsApp...');
  };

  // ✅ FUNCIÓN PARA OBTENER IMAGEN DEL PRODUCTO - MEJORADA
  const getProductImage = (item) => {
    // Buscar imagen en diferentes ubicaciones posibles
    if (item.product_details?.productImage && Array.isArray(item.product_details.productImage) && item.product_details.productImage.length > 0) {
      return item.product_details.productImage[0];
    }
    
    if (item.productImage && Array.isArray(item.productImage) && item.productImage.length > 0) {
      return item.productImage[0];
    }
    
    if (item.product?.productImage && Array.isArray(item.product.productImage) && item.product.productImage.length > 0) {
      return item.product.productImage[0];
    }
    
    if (item.image) {
      return item.image;
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12">
          <FaSpinner className="animate-spin w-12 h-12 text-[#2A3190] mx-auto mb-4" />
          <p className="text-gray-600">Cargando tus compras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Simplificado */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2A3190] flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaShoppingBag className="text-xl" />
              </div>
              Mis Compras
            </h1>
            <p className="text-gray-600 mt-2">
              {purchases.length > 0 
                ? `${purchases.length} compra${purchases.length !== 1 ? 's' : ''} encontrada${purchases.length !== 1 ? 's' : ''}`
                : 'No tienes compras registradas'
              }
            </p>
          </div>

          {purchases.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                showFilters 
                  ? 'bg-[#2A3190] text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaFilter />
              Filtros
              {getActiveFiltersCount() > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {getActiveFiltersCount()}
                </span>
              )}
              <FaChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Panel de Filtros Compacto */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Buscar</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="ID del pedido..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                {filters.search && (
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>

            {/* Estado de Pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">💳 Estado Pago</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
              >
                <option value="">Todos</option>
                <option value="pending">⏳ Pendiente</option>
                <option value="approved">✅ Aprobado</option>
                <option value="rejected">❌ Rechazado</option>
              </select>
            </div>

            {/* Estado de Delivery */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🚚 Estado Entrega</label>
              <select
                value={filters.delivery_status}
                onChange={(e) => handleFilterChange('delivery_status', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
              >
                <option value="">Todos</option>
                <option value="payment_confirmed">✅ Confirmado</option>
                <option value="preparing_order">📦 Preparando</option>
                <option value="in_transit">🚚 En Camino</option>
                <option value="delivered">📍 Entregado</option>
              </select>
            </div>

            {/* Acciones */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Compras */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        {purchases.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaShoppingBag className="text-4xl text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No tienes compras registradas</h3>
            <p className="text-gray-500 mb-6">Cuando realices compras, aparecerán aquí</p>
            <Link
              to="/"
              className="bg-[#2A3190] text-white px-6 py-3 rounded-lg hover:bg-[#1e236b] transition-colors inline-flex items-center gap-2"
            >
              <FaShoppingBag />
              Comenzar a Comprar
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {purchases.map((purchase) => (
              <div key={purchase._id} className="p-6 hover:bg-gray-50 transition-colors">
                
                {/* Header Compacto del Pedido */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                      #{purchase.shop_process_id.toString().slice(-3)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        Pedido #{purchase.shop_process_id}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <FaCalendarAlt className="text-xs" />
                        {formatDate(purchase.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-bold text-[#2A3190]">
                      {displayPYGCurrency(purchase.amount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {purchase.items?.length || 0} producto(s)
                    </div>
                  </div>
                </div>

                {/* Estado del Pedido - Más Compacto */}
                <div className="mb-4">
                  <StatusWithProgress transaction={purchase} showProgress={true} />
                </div>

                {/* Productos - DISEÑO COMPACTO CON IMÁGENES CORREGIDAS */}
                {purchase.items && purchase.items.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-3">
                      {purchase.items.slice(0, 4).map((item, index) => {
                        const productImage = getProductImage(item);
                        
                        return (
                          <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 min-w-0 flex-1 max-w-sm">
                            {/* Imagen del Producto - CORREGIDA */}
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border">
                              {productImage ? (
                                <img 
                                  src={productImage} 
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    console.log('Error cargando imagen:', productImage);
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <span 
                                className="text-gray-400 text-lg" 
                                style={{ display: productImage ? 'none' : 'flex' }}
                              >
                                📦
                              </span>
                            </div>
                            
                            {/* Info del Producto */}
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-800 text-sm truncate">{item.name}</h5>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-xs text-gray-500">Cant: {item.quantity}</span>
                                <span className="font-medium text-[#2A3190] text-sm">
                                  {displayPYGCurrency(item.total || (item.quantity * (item.unitPrice || item.unit_price || 0)))}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {purchase.items.length > 4 && (
                        <div className="flex items-center justify-center bg-gray-100 rounded-lg p-3 min-w-24">
                          <span className="text-gray-600 text-sm font-medium">
                            +{purchase.items.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Acciones - MÁS COMPACTAS */}
                <div className="flex flex-wrap gap-3">
                  
                  {/* Ver Pedido Completo - ACCIÓN PRINCIPAL */}
                  <Link
                    to={`/pedido/${purchase.shop_process_id}`}
                    className="bg-[#2A3190] text-white px-6 py-2 rounded-lg hover:bg-[#1e236b] transition-all flex items-center gap-2 font-medium text-sm"
                  >
                    <FaEye />
                    Ver Pedido Completo
                  </Link>

                  {/* WhatsApp para Problemas */}
                  <button
                    onClick={() => handleWhatsAppContact(purchase)}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-medium text-sm"
                  >
                    <FaWhatsapp />
                    Reportar Problema
                  </button>

                  {/* Calificar Pedido */}
                  {purchase.delivery_status === 'delivered' && !purchase.customer_satisfaction?.rating && (
                    <button
                      onClick={() => {
                        setSelectedRatingPurchase(purchase);
                        setShowRatingModal(true);
                      }}
                      className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-all flex items-center gap-2 font-medium text-sm"
                    >
                      <FaStar />
                      Calificar
                    </button>
                  )}
                </div>

                {/* Calificación Si Existe - MÁS COMPACTA */}
                {purchase.customer_satisfaction?.rating && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-800 font-medium text-sm">⭐ Tu Calificación</span>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FaStar 
                              key={star} 
                              className={`text-sm ${star <= purchase.customer_satisfaction.rating ? 'text-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-green-700 font-bold text-sm">
                          {purchase.customer_satisfaction.rating}/5
                        </span>
                      </div>
                    </div>
                    {purchase.customer_satisfaction.feedback && (
                      <p className="text-green-700 text-sm mt-2 italic">
                        "{purchase.customer_satisfaction.feedback}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Calificación */}
      {showRatingModal && selectedRatingPurchase && (
        <RatingComponent
          transaction={selectedRatingPurchase}
          onClose={() => {
            setShowRatingModal(false);
            setSelectedRatingPurchase(null);
          }}
          onRated={() => {
            fetchUserPurchases();
            toast.success('¡Gracias por tu calificación!');
          }}
        />
      )}
    </div>
  );
};

export default UserPurchases;