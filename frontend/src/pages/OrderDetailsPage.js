// frontend/src/pages/OrderDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
    FaArrowLeft, 
    FaMapMarkerAlt, 
    FaPhone, 
    FaEnvelope, 
    FaExternalLinkAlt,
    FaTruck,
    FaDownload,
    FaShare,
    FaPrint,
    FaQuestionCircle,
    FaShieldAlt,
    FaCalendarAlt,
    FaClock,
    FaBoxOpen,
    FaRoute,
    FaStar,
    FaComments,
    FaEye,
    FaSpinner,
    FaWhatsapp
} from 'react-icons/fa';
import StatusBadge, { StatusWithProgress, StatusHistory } from '../components/common/StatusBadge';
import DeliveryProgress from '../components/delivery/DeliveryProgress';
import RatingComponent from '../components/delivery/RatingComponent';
import displayINRCurrency from '../helpers/displayCurrency';
import { formatDeliveryDate, deliveryStatuses } from '../helpers/deliveryHelpers';
import { canManageDelivery } from '../helpers/transactionStatusHelper';

const OrderDetailsPage = () => {
    const { shop_process_id } = useParams();
    const navigate = useNavigate();
    const user = useSelector(state => state?.user?.user);
    
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('tracking');
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        fetchOrderDetails();
    }, [shop_process_id, refreshKey]);

    const fetchOrderDetails = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/transactions?shop_process_id=${shop_process_id}`, {
                method: 'GET',
                credentials: 'include'
            });

            const result = await response.json();
            if (result.success && result.data.transactions.length > 0) {
                const transaction = result.data.transactions[0];
                
                // Verificar permisos
                const canView = !user || 
                               user._id === transaction.created_by ||
                               user.bancardUserId === transaction.user_bancard_id ||
                               user.role === 'ADMIN';
                
                if (!canView) {
                    toast.error('No tienes permisos para ver este pedido');
                    navigate('/');
                    return;
                }
                
                setOrder(transaction);
            } else {
                toast.error('Pedido no encontrado');
                navigate('/');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar información del pedido');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `Pedido #${order.shop_process_id}`,
                text: `Mira el estado de mi pedido en Zenn`,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('🔗 Enlace copiado al portapapeles');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const tabs = [
        { id: 'tracking', label: 'Seguimiento', icon: FaTruck },
        { id: 'details', label: 'Detalles', icon: FaBoxOpen },
        { id: 'location', label: 'Ubicación', icon: FaMapMarkerAlt },
        { id: 'history', label: 'Historial', icon: FaClock }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    <FaSpinner className="animate-spin text-4xl text-[#2A3190] mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Cargando pedido</h3>
                    <p className="text-gray-600">Obteniendo información detallada...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">📦</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Pedido no encontrado</h1>
                    <p className="text-gray-600 mb-6">El pedido que buscas no existe o no tienes permisos para verlo</p>
                    <Link
                        to="/"
                        className="bg-[#2A3190] text-white px-6 py-3 rounded-lg hover:bg-[#1e236b] inline-flex items-center gap-2 transition-colors"
                    >
                        <FaArrowLeft /> Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header mejorado */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 text-gray-600 hover:text-[#2A3190] transition-colors hover:bg-blue-50 px-3 py-2 rounded-lg group"
                            >
                                <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                                <span className="font-medium">Volver</span>
                            </button>
                            
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Pedido #{order.shop_process_id}
                                </h1>
                                <p className="text-gray-600 text-sm">
                                    Realizado el {formatDeliveryDate(order.createdAt)}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <StatusBadge transaction={order} size="md" />
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={handleShare}
                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Compartir pedido"
                                >
                                    <FaShare />
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Imprimir"
                                >
                                    <FaPrint />
                                </button>
                                <Link
                                    to="/contacto"
                                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="Ayuda"
                                >
                                    <FaQuestionCircle />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Columna Principal */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Tabs de navegación */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="flex border-b border-gray-200 overflow-x-auto">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
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

                            <div className="p-6">
                                {/* Tab: Seguimiento */}
                                {activeTab === 'tracking' && (
                                    <div className="space-y-6">
                                        <DeliveryProgress
                                            deliveryStatus={order.delivery_status}
                                            timeline={order.delivery_timeline}
                                            estimatedDate={order.estimated_delivery_date}
                                            actualDate={order.actual_delivery_date}
                                            trackingNumber={order.tracking_number}
                                            transaction={order}
                                        />

                                        {/* Información de seguimiento */}
                                        {order.tracking_number && (
                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                                                <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                                                    <FaTruck className="text-blue-600" />
                                                    Información de Envío
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-blue-700 text-sm font-medium">Código de Seguimiento:</span>
                                                        <p className="font-mono text-lg font-bold text-blue-900 bg-white px-3 py-2 rounded-lg mt-1">
                                                            {order.tracking_number}
                                                        </p>
                                                    </div>
                                                    {order.courier_company && (
                                                        <div>
                                                            <span className="text-blue-700 text-sm font-medium">Empresa de Envío:</span>
                                                            <p className="font-semibold text-blue-900 mt-1">{order.courier_company}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Próxima actualización esperada */}
                                        {order.status === 'approved' && order.delivery_status !== 'delivered' && (
                                            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
                                                <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                                                    <FaCalendarAlt className="text-yellow-600" />
                                                    Próxima Actualización
                                                </h3>
                                                <p className="text-yellow-800">
                                                    Te notificaremos cuando haya cambios en el estado de tu pedido
                                                </p>
                                                {order.estimated_delivery_date && (
                                                    <p className="text-yellow-700 mt-2 font-medium">
                                                        📅 Entrega estimada: {formatDeliveryDate(order.estimated_delivery_date)}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab: Detalles */}
                                {activeTab === 'details' && (
                                    <div className="space-y-6">
                                        {/* Productos */}
                                        {order.items && order.items.length > 0 && (
                                            <div>
                                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                                    <FaBoxOpen className="text-[#2A3190]" />
                                                    Productos ({order.items.length})
                                                </h3>
                                                <div className="space-y-4">
                                                    {order.items.map((item, index) => (
                                                        <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                                            <div className="flex gap-4">
                                                                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
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
                                                                
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-gray-800 mb-1">{item.name}</h4>
                                                                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                                                        <div>
                                                                            <span>Cantidad: </span>
                                                                            <span className="font-medium">{item.quantity}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span>Precio unitario: </span>
                                                                            <span className="font-medium">{displayINRCurrency(item.unitPrice)}</span>
                                                                        </div>
                                                                        {item.brand && (
                                                                            <div>
                                                                                <span>Marca: </span>
                                                                                <span className="font-medium">{item.brand}</span>
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <span>Subtotal: </span>
                                                                            <span className="font-bold text-[#2A3190]">
                                                                                {displayINRCurrency(item.total || (item.quantity * item.unitPrice))}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Resumen financiero */}
                                        <div className="bg-gray-50 rounded-xl p-6">
                                            <h3 className="font-semibold text-gray-800 mb-4">💰 Resumen de Pago</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Subtotal:</span>
                                                    <span className="font-medium">{displayINRCurrency(order.amount * 0.9)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">IVA (10%):</span>
                                                    <span className="font-medium">{displayINRCurrency(order.amount * 0.1)}</span>
                                                </div>
                                                <div className="border-t pt-3 flex justify-between">
                                                    <span className="text-lg font-bold text-gray-900">Total:</span>
                                                    <span className="text-lg font-bold text-[#2A3190]">{displayINRCurrency(order.amount)}</span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    <span>Método: </span>
                                                    <span className="font-medium">
                                                        {order.payment_method === 'saved_card' ? '💳 Tarjeta Guardada' : '🆕 Nueva Tarjeta'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab: Ubicación */}
                                {activeTab === 'location' && (
                                    <div className="space-y-6">
                                        {order.delivery_location ? (
                                            <div>
                                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                                    <FaMapMarkerAlt className="text-red-500" />
                                                    Dirección de Entrega
                                                </h3>
                                                
                                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <h4 className="font-medium text-green-900 mb-2">📍 Dirección Completa</h4>
                                                            <p className="text-green-800">
                                                                {order.delivery_location.address || order.delivery_location.manual_address}
                                                            </p>
                                                            {order.delivery_location.city && (
                                                                <p className="text-green-700">{order.delivery_location.city}</p>
                                                            )}
                                                            {order.delivery_location.house_number && (
                                                                <p className="text-green-700">Casa/Dpto: {order.delivery_location.house_number}</p>
                                                            )}
                                                            {order.delivery_location.reference && (
                                                                <p className="text-green-700 italic">Referencia: {order.delivery_location.reference}</p>
                                                            )}
                                                        </div>

                                                        {order.delivery_location.lat && order.delivery_location.lng && (
                                                            <div className="flex gap-3">
                                                                <a
                                                                    href={`https://maps.google.com/?q=${order.delivery_location.lat},${order.delivery_location.lng}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                                                >
                                                                    <FaExternalLinkAlt />
                                                                    Ver en Google Maps
                                                                </a>
                                                                <a
                                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${order.delivery_location.lat},${order.delivery_location.lng}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                                                >
                                                                    <FaRoute />
                                                                    Cómo llegar
                                                                </a>
                                                            </div>
                                                        )}

                                                        {order.delivery_location.delivery_instructions && (
                                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                                <h4 className="font-medium text-yellow-900 mb-2">📝 Instrucciones de Entrega</h4>
                                                                <pre className="text-yellow-800 text-sm whitespace-pre-wrap">
                                                                    {order.delivery_location.delivery_instructions}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <FaMapMarkerAlt className="text-4xl text-gray-300 mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-gray-600 mb-2">Sin información de ubicación</h3>
                                                <p className="text-gray-500">No se registró ubicación para este pedido</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab: Historial */}
                                {activeTab === 'history' && (
                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <FaClock className="text-[#2A3190]" />
                                            Historial Completo
                                        </h3>
                                        <StatusHistory transaction={order} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        
                        {/* Información del cliente */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <FaEnvelope className="text-[#2A3190]" />
                                Información de Contacto
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="text-gray-600">Cliente:</span>
                                    <p className="font-medium">{order.customer_info?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Email:</span>
                                    <p className="font-medium">{order.customer_info?.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Teléfono:</span>
                                    <p className="font-medium">{order.customer_info?.phone || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-semibold text-gray-800 mb-4">⚡ Acciones</h3>
                            <div className="space-y-3">
                                
                                {/* Calificar pedido */}
                                {order.delivery_status === 'delivered' && !order.customer_satisfaction?.rating && (
                                    <button
                                        onClick={() => setShowRatingModal(true)}
                                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 font-medium"
                                    >
                                        <FaStar />
                                        Calificar Pedido
                                    </button>
                                )}

                                {/* Contactar soporte */}
                                <button
                                    onClick={() => {
                                        const phoneNumber = "595981150393"; // ← TU NÚMERO DE WHATSAPP
                                        const message = `Hola! Necesito ayuda con mi pedido:

                                    📦 *Pedido #${order.shop_process_id}*
                                    📅 Fecha: ${new Date(order.createdAt).toLocaleDateString('es-ES')}
                                    💰 Total: ${displayINRCurrency(order.amount)}
                                    📋 Estado: ${order.status === 'approved' ? 'Pago Aprobado ✅' : order.status}
                                    🚚 Entrega: ${order.delivery_status || 'Confirmado ✅'}

                                    Por favor, ¿me pueden ayudar?`;
                                        
                                        const encodedMessage = encodeURIComponent(message);
                                        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
                                        window.open(whatsappUrl, '_blank');
                                    }}
                                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 font-medium"
                                    >
                                    <FaWhatsapp />
                                    Contactar por WhatsApp
                                    </button>

                                {/* Ver en mi perfil */}
                                {user && (
                                    <Link
                                        to="/mi-perfil?tab=purchases"
                                        className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2 font-medium"
                                    >
                                        <FaEye />
                                        Ver Mis Pedidos
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Información de seguridad */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                                <FaShieldAlt className="text-green-600" />
                                Compra Protegida
                            </h3>
                            <div className="space-y-2 text-sm text-green-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>Transacción segura con Bancard</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>Datos encriptados SSL</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>Soporte 24/7</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de calificación */}
            {showRatingModal && (
                <RatingComponent
                    transaction={order}
                    onClose={() => setShowRatingModal(false)}
                    onRated={() => {
                        setRefreshKey(prev => prev + 1);
                        toast.success('¡Gracias por tu calificación!');
                    }}
                />
            )}
        </div>
    );
};

export default OrderDetailsPage;