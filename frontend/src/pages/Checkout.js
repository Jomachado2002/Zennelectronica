import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
    FaArrowLeft, 
    FaCreditCard, 
    FaLock, 
    FaCheckCircle, 
    FaPlus, 
    FaMinus,
    FaFileInvoice,
    FaBuilding,
    FaHome,
    FaCity,
    FaMapPin,
    FaUser,
    FaEnvelope,
    FaPhone,
    FaReceipt,
    FaShieldAlt,
    FaTruck,
    FaGift,
    FaPercentage,
    FaInfoCircle,
    FaSpinner,
    FaMapMarkerAlt,
    FaExternalLinkAlt,
    FaExclamationTriangle
} from 'react-icons/fa';
import { localCartHelper } from '../helpers/addToCart';
import { formatIVABreakdown } from '../helpers/taxCalculator';
import displayINRCurrency from '../helpers/displayCurrency';
import SimpleLocationSelector from '../components/location/SimpleLocationSelector';
import BancardPayButton from '../components/BancardPayButton';
import SummaryApi from '../common';

// Componente de tarjetas guardadas mejorado
const SavedCardsSection = ({ user, totalAmount, customerData, cartItems, onPaymentSuccess, onPaymentError }) => {
    const [registeredCards, setRegisteredCards] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [loadingCards, setLoadingCards] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        const fetchUserCards = async () => {
            if (!user?.bancardUserId) {
                setLoadingCards(false);
                return;
            }

            try {
                const url = `${process.env.REACT_APP_BACKEND_URL}/api/bancard/tarjetas/${user.bancardUserId}`;
                // ✅ USAR authGet QUE INCLUYE AUTOMÁTICAMENTE EL TOKEN
                const { authGet } = await import('../helpers/authFetch');
                const response = await authGet(url);

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data?.cards) {
                        setRegisteredCards(result.data.cards);
                    }
                }
            } catch (error) {
                // console.error removed for production
            } finally {
                setLoadingCards(false);
            }
        };

        fetchUserCards();
    }, [user?.bancardUserId]);

    const handlePayWithSavedCard = async () => {
        if (!selectedCard) {
            toast.error('Selecciona una tarjeta');
            return;
        }

        setProcessingPayment(true);
        try {
            // ✅ DEFINIR trackingData PRIMERO
            const trackingData = {
                user_agent: navigator.userAgent,
                device_type: window.innerWidth < 768 ? 'mobile' : 
                             window.innerWidth < 1024 ? 'tablet' : 'desktop',
                referrer_url: document.referrer || 'direct',
                payment_session_id: sessionStorage.getItem('payment_session') || 
                                    `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                cart_total_items: cartItems.length,
                order_notes: JSON.stringify(customerData),
                delivery_method: 'delivery',
                invoice_number: `INV-${Date.now()}`,
                tax_amount: (totalAmount * 0.1).toFixed(2),
                utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
                utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
                utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || ''
            };

            // ✅ AHORA SÍ USAR trackingData
            const paymentData = {
                amount: totalAmount.toFixed(2),
                currency: 'PYG',
                alias_token: selectedCard.alias_token,
                number_of_payments: 1,
                description: `Compra Zenn - ${cartItems.length} productos`,
                customer_info: customerData,
                items: cartItems.map(product => ({
                    product_id: product.productId._id,
                    name: product.productId.productName,
                    quantity: product.quantity,
                    unitPrice: product.productId.sellingPrice,
                    unit_price: product.productId.sellingPrice,
                    total: product.quantity * product.productId.sellingPrice,
                    category: product.productId.category,
                    brand: product.productId.brandName
                })),
                user_type: 'REGISTERED',
                payment_method: 'saved_card',
                user_bancard_id: user.bancardUserId,
                
                // ✅ AGREGAR TODOS LOS DATOS DE TRACKING
                ...trackingData,
                
                // ✅ AGREGAR delivery_location SI EXISTE
                delivery_location: customerData.location ? {
                    lat: customerData.location.lat,
                    lng: customerData.location.lng,
                    address: customerData.location.address,
                    manual_address: customerData.address,
                    city: customerData.city,
                    house_number: customerData.houseNumber,
                    reference: customerData.reference,
                    source: 'user_selected',
                    google_address: customerData.location.address,
                    googleMapsUrl: customerData.location.googleMapsUrl,
                    timestamp: new Date()
                } : null
            };

            // ✅ USAR authPost QUE INCLUYE AUTOMÁTICAMENTE EL TOKEN
            const { authPost } = await import('../helpers/authFetch');
            const response = await authPost(
                `${process.env.REACT_APP_BACKEND_URL}/api/bancard/pago-con-token`,
                paymentData
            );

            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                if (result.requires3DS) {
                    toast.info('🔐 Verificación 3DS requerida');
                    if (result.data?.iframe_url) {
                        window.open(result.data.iframe_url, '_blank', 'width=800,height=600');
                    }
                } else {
                    const responseData = result.data?.operation || result.data?.confirmation || result.data;
                    const isApproved = (responseData?.response === 'S' && responseData?.response_code === '00') || 
                                    result.data?.transaction_approved === true;

                    if (isApproved) {
                        toast.success('✅ Pago procesado exitosamente');
                        setTimeout(() => {
                            window.location.href = '/pago-exitoso?shop_process_id=' + (result.data.shop_process_id || Date.now());
                        }, 1500);
                    } else {
                        toast.error(`Pago rechazado: ${responseData?.response_description || 'Error desconocido'}`);
                    }
                }
            } else {
                toast.error(result.message || 'Error en el pago');
            }
        } catch (error) {
            // console.error removed for production
            toast.error('Error de conexión al procesar el pago');
        } finally {
            setProcessingPayment(false);
        }
    };

    if (loadingCards) {
        return (
            <div className="animate-pulse bg-gray-50 rounded-xl p-6">
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-16 bg-gray-300 rounded-lg"></div>
                    <div className="h-16 bg-gray-300 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (registeredCards.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6 shadow-sm">
            <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2 text-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <FaCreditCard className="text-blue-600" />
                </div>
                Tus tarjetas guardadas
            </h3>
            
            <div className="space-y-3">
                {registeredCards.map((card, index) => (
                    <button
                        key={index}
                        onClick={() => setSelectedCard(card)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left transform hover:scale-[1.02]
                            ${selectedCard === card 
                                ? 'border-blue-500 bg-white shadow-lg ring-2 ring-blue-100' 
                                : 'border-gray-200 hover:border-blue-300 bg-white hover:shadow-md'}`}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-lg ${selectedCard === card ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                    <FaCreditCard className={`${selectedCard === card ? 'text-blue-600' : 'text-gray-600'}`} />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800">
                                        {card.card_brand || 'Tarjeta'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {card.card_masked_number || '**** **** **** ****'}
                                    </p>
                                </div>
                            </div>
                            {selectedCard === card && (
                                <div className="p-2 bg-blue-100 rounded-full">
                                    <FaCheckCircle className="text-blue-600 text-lg" />
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>
            
            {selectedCard && (
                <button
                    onClick={handlePayWithSavedCard}
                    disabled={processingPayment}
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold 
                             disabled:opacity-50 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] 
                             hover:shadow-lg disabled:transform-none"
                >
                    {processingPayment ? (
                        <>
                            <FaSpinner className="animate-spin" />
                            Procesando pago...
                        </>
                    ) : (
                        <>
                            <FaLock />
                            Pagar con tarjeta seleccionada ({displayINRCurrency(totalAmount)})
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

const Checkout = () => {
    const navigate = useNavigate();
    const user = useSelector(state => state?.user?.user);
    const isLoggedIn = !!user;
    
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(1); // Mantenemos para compatibilidad pero siempre será 1
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [showLocationSelector, setShowLocationSelector] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [needsInvoice, setNeedsInvoice] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    
    // Formulario mejorado con campos separados
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        houseNumber: '',
        reference: '',
        // Datos de facturación
        companyName: '',
        ruc: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        const loadCartData = () => {
            try {
                const items = localCartHelper.getCart();
                const validItems = items.filter(item => 
                    item && item.productId && 
                    typeof item.productId === 'object' &&
                    item.productId.productImage &&
                    Array.isArray(item.productId.productImage) &&
                    item.productId.productImage.length > 0
                );
                
                if (validItems.length === 0) {
                    toast.error('No hay productos válidos en el carrito');
                    navigate('/carrito');
                    return;
                }
                
                setCartItems(validItems);
            } catch (error) {
                // console.error removed for production
                toast.error('Error al cargar el carrito');
                navigate('/carrito');
            } finally {
                setLoading(false);
            }
        };

        loadCartData();
    }, [navigate]);

    useEffect(() => {
        if (isLoggedIn && user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || ''
            }));
            loadUserLocation();
        }
    }, [isLoggedIn, user]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const loadUserLocation = useCallback(async () => {
        if (!isLoggedIn) return;
        
        try {
            // ✅ USAR authGet QUE INCLUYE AUTOMÁTICAMENTE EL TOKEN
            const { authGet } = await import('../helpers/authFetch');
            const response = await authGet(SummaryApi.location.getUserLocation.url);
            
            const result = await response.json();
            if (result.success && result.data && result.data.lat && result.data.lng) {
                setSelectedLocation({
                    lat: result.data.lat,
                    lng: result.data.lng,
                    address: result.data.address
                });
                setFormData(prev => ({
                    ...prev,
                    address: result.data.address || ''
                }));
            }
        } catch (error) {
            // console.warn removed for production
        }
    }, [isLoggedIn]);

 // Calcular subtotal sin IVA (los precios incluyen IVA)
const totalWithIVA = cartItems.reduce((total, item) => 
    total + (item.quantity * item.productId.sellingPrice), 0
);

const originalSubtotal = Math.round(totalWithIVA / 1.1); // Subtotal sin IVA

// Aplicar descuento al subtotal
const subtotalAfterDiscount = originalSubtotal - discountAmount;

// Calcular IVA sobre el subtotal ya con descuento
const ivaAmount = Math.round(subtotalAfterDiscount * 0.1);

// Total final
const totalPrice = subtotalAfterDiscount + ivaAmount;
    
    const ivaBreakdown = formatIVABreakdown(totalPrice);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Limpiar errores al escribir
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // ✅ FUNCIÓN MEJORADA para capturar datos de tracking con ubicación
    const captureTrackingData = useCallback(() => {
    return {
        user_agent: navigator.userAgent,
        device_type: window.innerWidth < 768 ? 'mobile' : 
                     window.innerWidth < 1024 ? 'tablet' : 'desktop',
        referrer_url: document.referrer || 'direct',
        payment_session_id: sessionStorage.getItem('payment_session') || 
                            `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        cart_total_items: cartItems.length,
        
        // ✅ MEJORAR order_notes CON TODA LA INFORMACIÓN
        order_notes: JSON.stringify({
            customerData: formData,
            needsInvoice: needsInvoice,
            invoiceData: needsInvoice ? {
                companyName: formData.companyName,
                ruc: formData.ruc
            } : null,
            location: selectedLocation || null,
            timestamp: new Date().toISOString()
        }),
        
        delivery_method: 'delivery',
        invoice_number: `INV-${Date.now()}`,
        tax_amount: (totalPrice * 0.1).toFixed(2),
        utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
        
        // ✅ AGREGAR UBICACIÓN COMPLETA EN DELIVERY_LOCATION
        delivery_location: selectedLocation ? {
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            address: selectedLocation.address,
            manual_address: formData.address,
            city: formData.city,
            house_number: formData.houseNumber,
            reference: formData.reference,
            source: 'user_selected',
            google_address: selectedLocation.address,
            google_maps_url: selectedLocation.google_maps_url,
            google_maps_alternative_url: selectedLocation.google_maps_alternative_url,
            coordinates_string: selectedLocation.coordinates_string,
            navigation_url: `https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lng}`,
            timestamp: new Date(),
            
            // ✅ INSTRUCCIONES DETALLADAS PARA EL DELIVERY
            delivery_instructions: `📍 UBICACIÓN DE ENTREGA:
📧 Cliente: ${formData.name} (${formData.phone})
🏠 Dirección: ${formData.address}
🏘️ Ciudad: ${formData.city}
🏡 Casa/Edificio: ${formData.houseNumber}
📝 Referencia: ${formData.reference || 'Sin referencia adicional'}

🗺️ VER UBICACIÓN EN GOOGLE MAPS:
${selectedLocation.google_maps_url || 'No disponible'}

🧭 COORDENADAS EXACTAS: ${selectedLocation.lat}, ${selectedLocation.lng}

📱 Para navegación: https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lng}`,

            full_address: `${formData.address}, ${formData.city}, Casa ${formData.houseNumber}${formData.reference ? ', ' + formData.reference : ''}`,
        } : {
            // Valores por defecto cuando no hay ubicación
            lat: null,
            lng: null,
            google_maps_url: null,
            google_maps_alternative_url: null,
            address: formData.address || '',
            manual_address: formData.address || '',
            full_address: `${formData.address}, ${formData.city}`,
            city: formData.city || '',
            house_number: formData.houseNumber || '',
            reference: formData.reference || '',
            source: 'manual_entry',
            timestamp: new Date(),
            delivery_instructions: `📍 UBICACIÓN MANUAL (SIN MAPA):
📧 Cliente: ${formData.name} (${formData.phone})
🏠 Dirección: ${formData.address}
🏘️ Ciudad: ${formData.city}
🏡 Casa/Edificio: ${formData.houseNumber}
📝 Referencia: ${formData.reference || 'Sin referencia adicional'}

⚠️ NOTA: El cliente no marcó ubicación en el mapa. Contactar para coordinar entrega.`
        }
    };
}, [cartItems.length, totalPrice, formData, needsInvoice, selectedLocation]);


    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) newErrors.name = 'Nombre es requerido';
        if (!formData.phone.trim()) newErrors.phone = 'Teléfono es requerido';
        if (!formData.address.trim()) newErrors.address = 'Dirección es requerida';
        if (!formData.city.trim()) newErrors.city = 'Ciudad es requerida';
        if (!formData.houseNumber.trim()) newErrors.houseNumber = 'Número de casa es requerido';
        
        if (needsInvoice) {
            if (!formData.companyName.trim()) newErrors.companyName = 'Razón social es requerida';
            if (!formData.ruc.trim()) newErrors.ruc = 'RUC es requerido';
        }
        
        return { errors: newErrors, isValid: Object.keys(newErrors).length === 0 };
    };

    // ✅ Función separada para validar sin causar re-renders
    const isFormValid = () => {
    const hasRequiredFields = 
        formData.name.trim() && 
        formData.phone.trim() && 
        formData.address.trim() && 
        formData.city.trim() && 
        formData.houseNumber.trim();
    
    const hasInvoiceData = !needsInvoice || 
        (formData.companyName.trim() && formData.ruc.trim());
    
    const hasLocation = hasValidLocation();
    
    console.log('🔍 Validación de formulario:', {
        hasRequiredFields,
        hasInvoiceData,
        hasLocation,
        selectedLocation
    });
    
    return hasRequiredFields && hasInvoiceData && hasLocation;
};

    // ✅ Función para validar y mostrar errores solo cuando sea necesario
    const validateAndShowErrors = () => {
        const validation = validateForm();
        setErrors(validation.errors);
        return validation.isValid;
    };

    const handleLocationSave = (locationData) => {
    
    
    // ✅ GUARDAR TODOS LOS DATOS DE UBICACIÓN
    setSelectedLocation({
        lat: locationData.lat,
        lng: locationData.lng,
        address: locationData.address,
        google_maps_url: locationData.google_maps_url,
        google_maps_alternative_url: locationData.google_maps_alternative_url,
        coordinates_string: locationData.coordinates_string,
        timestamp: locationData.timestamp
    });
    
    // ✅ ACTUALIZAR TAMBIÉN EL CAMPO DE DIRECCIÓN DEL FORMULARIO
    setFormData(prev => ({
        ...prev,
        address: locationData.address || prev.address
    }));
    
    setShowLocationSelector(false);
    toast.success('📍 Ubicación de entrega confirmada correctamente');
};
const hasValidLocation = () => {
    return selectedLocation && 
           selectedLocation.lat && 
           selectedLocation.lng;
    // ✅ QUITAR LA VALIDACIÓN DE google_maps_url QUE CAUSA EL PROBLEMA
};

    // ✅ REEMPLAZAR tu función prepareBancardData actual con esta:
    const prepareBancardData = () => {
    const baseData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        address: formData.address,
        houseNumber: formData.houseNumber,
        reference: formData.reference,
        fullAddress: `${formData.address}, ${formData.city}, Casa ${formData.houseNumber}${formData.reference ? ', ' + formData.reference : ''}`
    };

    // ✅ AGREGAR DATOS DE FACTURACIÓN SI ES NECESARIO
    if (needsInvoice) {
        baseData.invoiceData = {
            needsInvoice: true,
            companyName: formData.companyName,
            ruc: formData.ruc
        };
    } else {
        baseData.invoiceData = {
            needsInvoice: false
        };
    }

    // ✅ AGREGAR UBICACIÓN COMPLETA SI EXISTE
    if (selectedLocation) {
        baseData.location = {
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            address: selectedLocation.address,
            google_maps_url: selectedLocation.google_maps_url,
            google_maps_alternative_url: selectedLocation.google_maps_alternative_url,
            coordinates_string: selectedLocation.coordinates_string,
            timestamp: selectedLocation.timestamp || new Date().toISOString()
        };
    }

    return baseData;
};

    const handlePaymentSuccess = (paymentData) => {
        
        toast.success('Redirigiendo al procesamiento de pago...');
    };

    const handlePaymentError = (error) => {
        // console.error removed for production
        toast.error('Error al procesar el pago. Intenta nuevamente.');
    };

    const applyCoupon = () => {
    if (!couponCode.trim()) {
        toast.error('Ingresa un código promocional');
        return;
    }
    
       if (couponCode.toUpperCase() === 'ARA10') {
    const discount = Math.round(originalSubtotal * 0.1); // 10% sobre el subtotal sin IVA
    setDiscountAmount(discount);
    setAppliedCoupon({
        code: 'ARA10',
        percentage: 10,
        amount: discount
    });
    setCouponApplied(true);
    toast.success('🎉 Cupón ARA10 aplicado! 10% de descuento');
} else {
    toast.error('Código promocional no válido');
}
    };

        const removeCoupon = () => {
        setCouponApplied(false);
        setCouponCode('');
        setAppliedCoupon(null);
        setDiscountAmount(0);
        toast.info('Cupón removido');
    };

    const updateQuantity = (itemId, change) => {
        try {
            const newItems = [...cartItems];
            const index = newItems.findIndex(i => i._id === itemId);
            
            if (index !== -1) {
                const newQuantity = Math.max(1, newItems[index].quantity + change);
                newItems[index].quantity = newQuantity;
                
                // ✅ USAR localCartHelper.updateCart (que ya existe)
                if (localCartHelper.updateCart(newItems)) {
                    setCartItems(newItems);
                    toast.success('Cantidad actualizada');
                    
                    // Actualizar también el localStorage individualmente para consistencia
                    localCartHelper.updateQuantity(itemId, newQuantity);
                } else {
                    toast.error('Error al actualizar cantidad');
                }
            }
        } catch (error) {
            // console.error removed for production
            toast.error('Error al actualizar el producto');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-xl shadow-lg">
                    <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Preparando tu checkout</h3>
                    <p className="text-gray-600">Cargando datos del carrito...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header mejorado */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <Link 
                            to="/carrito" 
                            className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors 
                                     hover:bg-blue-50 px-3 py-2 rounded-lg group"
                        >
                            <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                            <span className="font-medium">Volver al carrito</span>
                        </Link>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                <FaShieldAlt className="text-sm" />
                                <span className="text-sm font-medium">Compra 100% segura</span>
                            </div>
                            <a href="/contacto" className="text-blue-600 hover:text-blue-800 text-sm font-medium 
                                                         hover:underline transition-all">
                                ¿Necesitas ayuda?
                            </a>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Columna izquierda - Formulario */}
                    <div className="flex-1">
                        {/* Header Simplificado - Sin pasos */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                        <FaCheckCircle className="text-3xl" />
                                    </div>
                                    <div>
                                        <h1 className="text-4xl font-bold">Finalizar Compra</h1>
                                        <p className="text-blue-100 mt-1">Completa tus datos y realiza el pago de forma segura</p>
                                    </div>
                                </div>
                                <div className="hidden md:flex items-center gap-3 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                                    <FaShieldAlt className="text-2xl" />
                                    <div className="text-left">
                                        <p className="font-semibold">100% Seguro</p>
                                        <p className="text-xs text-blue-100">Certificado PCI DSS</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Info rápida */}
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                                    <FaCheckCircle className="text-xl mx-auto mb-1" />
                                    <p className="text-xs">Pago Seguro</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                                    <FaTruck className="text-xl mx-auto mb-1" />
                                    <p className="text-xs">Envío Rápido</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                                    <FaShieldAlt className="text-xl mx-auto mb-1" />
                                    <p className="text-xs">Compra Protegida</p>
                                </div>
                            </div>
                        </div>

                        {/* PASO 1: Datos personales y envío */}
                        {currentStep === 1 && (
                            <div className="space-y-8">
                                {/* Datos personales */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <FaUser className="text-blue-600" />
                                        </div>
                                        Información personal
                                    </h2>
                                    
                                    {/* ✅ ESTRUCTURA CORREGIDA para la sección de datos personales */}
                                    {isLoggedIn ? (
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-green-100 rounded-full">
                                                    <FaCheckCircle className="text-green-600 text-lg" />
                                                </div>
                                                <span className="font-semibold text-green-800">Datos de tu cuenta verificados</span>
                                            </div>
                                            
                                            {/* Mostrar datos del usuario logueado */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-600">Nombre:</span>
                                                    <p className="font-semibold text-gray-900">{user.name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium text-gray-600">Email:</span>
                                                    <p className="font-semibold text-gray-900">{user.email}</p>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium text-gray-600">Teléfono:</span>
                                                    <p className="font-semibold text-gray-900">{user.phone || 'No registrado'}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Campos adicionales para usuarios logueados */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        <FaCity className="inline mr-2" />
                                                        Ciudad *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="city"
                                                        value={formData.city}
                                                        onChange={handleInputChange}
                                                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all
                                                                 ${errors.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                                                        placeholder="Ej: Asunción"
                                                    />
                                                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        <FaMapPin className="inline mr-2" />
                                                        Dirección completa *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="address"
                                                        value={formData.address}
                                                        onChange={handleInputChange}
                                                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all
                                                                 ${errors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                                                        placeholder="Ej: Av. Mariscal López y Brasil"
                                                    />
                                                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        <FaHome className="inline mr-2" />
                                                        Número de casa *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="houseNumber"
                                                        value={formData.houseNumber}
                                                        onChange={handleInputChange}
                                                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all
                                                                 ${errors.houseNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                                                        placeholder="Ej: 1234, Edificio A - Piso 5"
                                                    />
                                                    {errors.houseNumber && <p className="text-red-500 text-xs mt-1">{errors.houseNumber}</p>}
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        <FaInfoCircle className="inline mr-2" />
                                                        Referencia (opcional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="reference"
                                                        value={formData.reference}
                                                        onChange={handleInputChange}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                        placeholder="Ej: Cerca del shopping, portón azul"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Formulario completo para usuarios no logueados
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <FaUser className="inline mr-2" />
                                                    Nombre completo *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all
                                                             ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                                                    placeholder="Tu nombre completo"
                                                />
                                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <FaEnvelope className="inline mr-2" />
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                    placeholder="tu@email.com"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <FaPhone className="inline mr-2" />
                                                    Teléfono *
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleInputChange}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all
                                                             ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                                                    placeholder="Ej: 0981234567"
                                                />
                                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <FaCity className="inline mr-2" />
                                                    Ciudad *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="city"
                                                    value={formData.city}
                                                    onChange={handleInputChange}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all
                                                             ${errors.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                                                    placeholder="Ej: Asunción"
                                                />
                                                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                                            </div>
                                            
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <FaMapPin className="inline mr-2" />
                                                    Dirección completa *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleInputChange}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all
                                                             ${errors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                                                    placeholder="Ej: Av. Mariscal López y Brasil"
                                                />
                                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <FaHome className="inline mr-2" />
                                                    Número de casa *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="houseNumber"
                                                    value={formData.houseNumber}
                                                    onChange={handleInputChange}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all
                                                             ${errors.houseNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                                                    placeholder="Ej: 1234, Edificio A - Piso 5"
                                                />
                                                {errors.houseNumber && <p className="text-red-500 text-xs mt-1">{errors.houseNumber}</p>}
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <FaInfoCircle className="inline mr-2" />
                                                    Referencia (opcional)
                                                </label>
                                                <input
                                                    type="text"
                                                    name="reference"
                                                    value={formData.reference}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                    placeholder="Ej: Cerca del shopping, portón azul"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ✅ MAPA PARA TODOS LOS USUARIOS - FUERA DEL IF/ELSE */}
                                    <div className="mt-6">
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                <FaMapMarkerAlt className="inline mr-2" />
                                                Ubicación en el mapa *
                                            </label>
                                            
                                            {selectedLocation ? (
                                                <div className="border-2 border-green-200 rounded-xl p-6 bg-gradient-to-r from-green-50 to-emerald-50">
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-3 bg-green-100 rounded-full">
                                                            <FaMapMarkerAlt className="text-green-600 text-xl" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-green-900 mb-2">📍 Ubicación de entrega confirmada</h4>
                                                            <p className="text-green-800 mb-3 font-medium">{selectedLocation.address}</p>
                                                            
                                                           {/* ✅ MOSTRAR URL DE GOOGLE MAPS */}
                                                                {selectedLocation.google_maps_url && (
                                                                    <div className="mb-3">
                                                                        <a
                                                                            href={selectedLocation.google_maps_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium bg-blue-100 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors"
                                                                        >
                                                                            <FaExternalLinkAlt />
                                                                            Ver en Google Maps
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            
                                                            <div className="flex gap-3 items-center mb-4">
                                                                <div className="text-xs text-green-600 font-mono bg-green-100 px-3 py-1 rounded-full">
                                                                    📍 {selectedLocation.lat?.toFixed(6)}, {selectedLocation.lng?.toFixed(6)}
                                                                </div>
                                                                <button
                                                                    onClick={() => setShowLocationSelector(true)}
                                                                    className="px-4 py-2 text-green-700 bg-green-100 hover:bg-green-200 rounded-lg 
                                                                            font-medium transition-colors text-sm"
                                                                >
                                                                    Cambiar ubicación
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-red-200 bg-red-50 rounded-xl p-6">
                                                    <button
                                                        onClick={() => setShowLocationSelector(true)}
                                                        className="w-full border-2 border-dashed border-red-300 rounded-xl p-8 
                                                                hover:border-red-500 hover:bg-red-100 transition-all group"
                                                    >
                                                        <div className="text-center">
                                                            <div className="p-4 bg-red-100 rounded-full w-fit mx-auto mb-4 group-hover:bg-red-200 transition-colors">
                                                                <FaMapMarkerAlt className="text-3xl text-red-600" />
                                                            </div>
                                                            <h4 className="text-xl font-semibold text-red-900 mb-2">⚠️ Ubicación requerida</h4>
                                                            <p className="text-red-700 mb-4">
                                                                Es obligatorio marcar tu ubicación en el mapa para poder procesar el envío
                                                            </p>
                                                            <div className="inline-flex items-center gap-2 text-red-600 font-medium">
                                                                <span>Abrir mapa y marcar ubicación</span>
                                                                <FaMapMarkerAlt />
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            )}

                                            {showLocationSelector && (
                                                <div className="mt-6">
                                                    <SimpleLocationSelector
                                                        initialLocation={selectedLocation}
                                                        onLocationSave={handleLocationSave}
                                                        isUserLoggedIn={isLoggedIn}
                                                        title="Marcar Dirección de Entrega"
                                                        onClose={() => setShowLocationSelector(false)}
                                                    />
                                                </div>
                                            )}
                                </div>
                                </div>

                                {/* Facturación */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <FaFileInvoice className="text-purple-600" />
                                        </div>
                                        Información de facturación
                                    </h2>

                                    <div className="mb-6">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="needsInvoice"
                                                checked={needsInvoice}
                                                onChange={(e) => setNeedsInvoice(e.target.checked)}
                                                className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <label htmlFor="needsInvoice" className="text-lg font-medium text-gray-900 cursor-pointer">
                                                Necesito factura
                                            </label>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1 ml-8">
                                            Marca esta opción si necesitas factura para tu compra
                                        </p>
                                    </div>

                                    {needsInvoice && (
                                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
                                            <h3 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                                                <FaBuilding className="text-purple-600" />
                                                Datos para facturación
                                            </h3>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        <FaBuilding className="inline mr-2" />
                                                        Razón social *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="companyName"
                                                        value={formData.companyName}
                                                        onChange={handleInputChange}
                                                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all
                                                                 ${errors.companyName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                                                        placeholder="Ej: Empresa S.A."
                                                    />
                                                    {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        <FaReceipt className="inline mr-2" />
                                                        RUC *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="ruc"
                                                        value={formData.ruc}
                                                        onChange={handleInputChange}
                                                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all
                                                                 ${errors.ruc ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                                                        placeholder="Ej: 80012345-1"
                                                    />
                                                    {errors.ruc && <p className="text-red-500 text-xs mt-1">{errors.ruc}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Sección de Pago - TODO EN UNO */}
                                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mt-8">
                                    <div className="mb-8">
                                        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                            <div className="p-3 bg-gradient-to-r from-green-400 to-green-600 rounded-xl shadow-lg">
                                                <FaCreditCard className="text-white text-2xl" />
                                            </div>
                                            Método de Pago
                                        </h2>
                                        <p className="text-gray-600 ml-14">Selecciona cómo deseas pagar tu pedido</p>
                                    </div>

                                    {/* Tarjetas guardadas si el usuario está logueado */}
                                    {isLoggedIn && (
                                        <>
                                            <SavedCardsSection 
                                                user={user}
                                                totalAmount={totalPrice}
                                                customerData={prepareBancardData()}
                                                cartItems={cartItems}
                                                onPaymentSuccess={handlePaymentSuccess}
                                                onPaymentError={handlePaymentError}
                                            />
                                            
                                            <div className="flex items-center gap-4 my-8">
                                                <hr className="flex-1 border-gray-300" />
                                                <span className="text-gray-500 font-medium bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-2 rounded-full border border-gray-200">
                                                    o pagar con nueva tarjeta
                                                </span>
                                                <hr className="flex-1 border-gray-300" />
                                            </div>
                                        </>
                                    )}

                                    {/* Componente de Pago con Modal Mejorado */}
                                    {!isFormValid() ? (
                                        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-2xl p-8 text-center">
                                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <FaExclamationTriangle className="text-3xl text-yellow-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                Completa tus datos para continuar
                                            </h3>
                                            <p className="text-gray-600 mb-4">
                                                Necesitamos tu información de contacto y ubicación para procesar el pedido
                                            </p>
                                            <button
                                                onClick={() => {
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    validateAndShowErrors();
                                                }}
                                                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-amber-600 transition-all transform hover:scale-105"
                                            >
                                                Completar datos arriba ☝️
                                            </button>
                                        </div>
                                    ) : (
                                        <BancardPayButton
                                            cartItems={cartItems}
                                            totalAmount={totalPrice}
                                            customerData={prepareBancardData()}
                                            onPaymentStart={() => {
                                                toast.info('🔒 Iniciando proceso de pago seguro...');
                                            }}
                                            onPaymentSuccess={handlePaymentSuccess}
                                            onPaymentError={handlePaymentError}
                                            disabled={!isFormValid()}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Columna derecha - Resumen del pedido MEJORADO */}
                    <div className="w-full lg:w-96">
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 sticky top-6 overflow-hidden">
                            {/* Encabezado mejorado */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                                <h3 className="text-xl font-bold flex items-center gap-3">
                                    <FaReceipt />
                                    Resumen del pedido
                                </h3>
                                <p className="text-blue-100 text-sm mt-1">{cartItems.length} productos</p>
                            </div>
                            
                            {/* Lista de productos mejorada */}
                            <div className="p-6 border-b border-gray-200 max-h-80 overflow-y-auto">
                                <div className="space-y-4">
                                    {cartItems.map((item) => (
                                        <div key={item._id} className="flex gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                            <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                                                <img 
                                                    src={item.productId.productImage[0]} 
                                                    alt={item.productId.productName}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-gray-900 line-clamp-2 text-sm mb-2">
                                                    {item.productId.productName}
                                                </h4>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2 bg-white rounded-lg border px-2 py-1">
                                                        <button 
                                                            onClick={() => updateQuantity(item._id, -1)}
                                                            className="text-gray-500 hover:text-blue-600 p-1 rounded transition-colors"
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            <FaMinus className="text-xs" />
                                                        </button>
                                                        <span className="font-medium text-sm min-w-[20px] text-center">
                                                            {item.quantity}
                                                        </span>
                                                        <button 
                                                            onClick={() => updateQuantity(item._id, 1)}
                                                            className="text-gray-500 hover:text-blue-600 p-1 rounded transition-colors"
                                                        >
                                                            <FaPlus className="text-xs" />
                                                        </button>
                                                    </div>
                                                    <span className="font-bold text-blue-600">
                                                        {displayINRCurrency(item.productId.sellingPrice * item.quantity)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Cupón promocional mejorado */}
                            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-amber-50">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <FaGift className="text-yellow-600" />
                                    Código promocional
                                </h4>
                                {couponApplied ? (
                                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-xl p-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <FaCheckCircle className="text-green-600" />
                                                <span className="text-green-800 font-medium">{appliedCoupon?.code || couponCode}</span>
                                            </div>
                                            <button 
                                                onClick={removeCoupon}
                                                className="text-red-500 hover:text-red-700 text-sm font-medium hover:underline transition-all"
                                            >
                                                Quitar
                                            </button>
                                        </div>
                                        <p className="text-green-700 text-xs mt-1">Cupón aplicado correctamente</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                            placeholder="Código promocional"
                                            className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none 
                                                     focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                        />
                                        <button 
                                            onClick={applyCoupon}
                                            disabled={!couponCode.trim()}
                                            className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white 
                                                     rounded-xl font-medium transition-all disabled:cursor-not-allowed"
                                        >
                                            <FaPercentage />
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {/* Resumen de precios mejorado */}
                            <div className="p-6">
                              <div className="space-y-4">
   <div className="flex justify-between items-center">
        <span className="text-gray-600 font-medium">Subtotal</span>
        <span className="font-semibold">{displayINRCurrency(originalSubtotal)}</span>
    </div>
    <div className="flex justify-between items-center">
        <span className="text-gray-600 font-medium">IVA (10%)</span>
        <span className="font-semibold">{displayINRCurrency(ivaAmount)}</span>
    </div>
    {appliedCoupon && (
        <div className="flex justify-between items-center text-green-600">
            <span className="font-medium flex items-center gap-1">
                <FaGift className="text-sm" />
                Descuento {appliedCoupon.code} ({appliedCoupon.percentage}%)
            </span>
            <span className="font-semibold">- {displayINRCurrency(appliedCoupon.amount)}</span>
        </div>
    )}
    <div className="flex justify-between items-center">
        <span className="text-gray-600 font-medium">Envío</span>
        <span className="text-green-600 font-semibold">A calcular</span>
    </div>
</div>                                
                                <div className="border-t border-gray-200 mt-6 pt-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xl font-bold text-gray-900">Total</span>
                                        <span className="text-2xl font-bold text-blue-600">{displayINRCurrency(totalPrice)}</span>                                    </div>
                                </div>
                            </div>
                            
                            {/* Footer de seguridad mejorado */}
                            <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 border-t border-gray-200">
                                <div className="flex items-center justify-center gap-3 text-sm text-gray-600 mb-3">
                                    <FaLock className="text-green-600" />
                                    <span className="font-medium">Compra 100% segura y protegida</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 text-center">
                                    <div>✓ Cifrado SSL</div>
                                    <div>✓ Datos protegidos</div>
                                    <div>✓ Bancard certificado</div>
                                    <div>✓ Transacción segura</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Políticas mejoradas */}
                        <div className="mt-6 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FaInfoCircle className="text-blue-600" />
                                Políticas de compra
                            </h4>
                            <div className="space-y-3 text-sm">
                                {[
                                    { icon: FaTruck, text: "Envíos en 24-48 horas hábiles" },
                                    { icon: FaReceipt, text: "Devoluciones dentro de los 15 días" },
                                    { icon: FaShieldAlt, text: "Garantía en todos los productos" },
                                    { icon: FaPhone, text: "Soporte técnico 24/7" }
                                ].map((policy, index) => (
                                    <div key={index} className="flex items-center gap-3 text-gray-700">
                                        <policy.icon className="text-blue-600 flex-shrink-0" />
                                        <span>{policy.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;