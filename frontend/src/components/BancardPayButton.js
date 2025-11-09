import React, { useState, useEffect } from 'react';
import { FaCreditCard, FaLock, FaSpinner, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { MdSecurity } from 'react-icons/md';

const BancardPayButton = ({ 
  cartItems = [], 
  totalAmount = 0, 
  customerData = {},
  onPaymentStart = () => {},
  onPaymentSuccess = () => {},
  onPaymentError = () => {},
  disabled = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const [processId, setProcessId] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // ✅ FUNCIÓN PARA CAPTURAR DATOS DE TRACKING
  const captureTrackingData = () => {
    return {
      user_agent: navigator.userAgent,
      device_type: window.innerWidth < 768 ? 'mobile' : 
                   window.innerWidth < 1024 ? 'tablet' : 'desktop',
      referrer_url: document.referrer || 'direct',
      payment_session_id: sessionStorage.getItem('payment_session') || 
                          `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cart_total_items: cartItems.length,
      order_notes: customerData.address || '',
      delivery_method: 'pickup',
      invoice_number: `INV-${Date.now()}`,
      tax_amount: (totalAmount * 0.1).toFixed(2),
      utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
      utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
      utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || ''
    };
  };

  // ✅ MEJORAR MANEJO DE MENSAJES DEL IFRAME
  const handleIframeMessage = (event) => {
    console.log('📨 Mensaje recibido del iframe:', {
      origin: event.origin,
      data: event.data,
      type: typeof event.data
    });
    
    try {
        const validOrigins = [
          'https://vpos.infonet.com.py',
          'https://vpos.infonet.com.py:8888'
        ];
        
        if (!validOrigins.includes(event.origin)) {
            // console.warn removed for production
        }

        let data = event.data;
        
        if (typeof event.data === 'string') {
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            
            return;
          }
        }
        
        
        
        if (data && typeof data === 'object') {
          if (data.type === 'payment_success' || data.status === 'success') {
            
            setShowIframe(false);
            setLoading(false);
            setPaymentProcessing(false);
            onPaymentSuccess(data);
            // Redirigir a página de éxito
            setTimeout(() => {
              window.location.href = '/pago-exitoso?shop_process_id=' + (data.shop_process_id || Date.now());
            }, 1000);
          } else if (data.type === 'payment_error' || data.status === 'error') {
            // console.error removed for production
            setShowIframe(false);
            setLoading(false);
            setPaymentProcessing(false);
            onPaymentError(new Error(data.message || 'Error en el proceso de pago'));
          } else if (data.type === 'iframe_loaded' || data.message === 'loaded') {
            
            setLoading(false);
          }
        }
    } catch (error) {
        // console.error removed for production
    }
  };

  // ✅ CARGAR SCRIPT Y MANEJAR IFRAME
  useEffect(() => {
    if (showIframe && processId) {
      
      const timer = setTimeout(() => {
        loadBancardScript();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [showIframe, processId]);

  // ✅ LIMPIAR SCRIPT AL DESMONTAR
  useEffect(() => {
    return () => {
      const script = document.getElementById('bancard-script');
      if (script) {
        script.remove();
      }
      window.removeEventListener('message', handleIframeMessage, false);
    };
  }, []);

  const loadBancardScript = (retryCount = 0) => {
    console.log('🔄 Cargando script de Bancard, intento:', retryCount + 1);
    
    if (retryCount >= 3) {
      console.error('❌ No se pudo cargar el script después de 3 intentos');
      setShowIframe(false);
      setLoading(false);
      setPaymentProcessing(false);
      onPaymentError(new Error('No se pudo cargar el sistema de pagos después de 3 intentos'));
      return;
    }
    
    // Remover script existente
    const existingScript = document.getElementById('bancard-script');
    if (existingScript) {
      existingScript.remove();
      console.log('🗑️ Script anterior removido');
    }

    // ✅ HARDCODEADO A PRODUCCIÓN - NO DEPENDE DE VARIABLES DE ENTORNO
    const baseUrl = 'https://vpos.infonet.com.py'; // SIEMPRE PRODUCCIÓN

    console.log('🌐 URL de Bancard (PRODUCCIÓN FORZADA):', baseUrl);

    const script = document.createElement('script');
    script.id = 'bancard-script';
    script.src = `${baseUrl}/checkout/javascript/dist/bancard-checkout-4.0.0.js`;
    script.async = true;
    
    script.onload = () => {
      console.log('✅ Script de Bancard cargado exitosamente');
      if (window.Bancard && window.Bancard.Checkout) {
        console.log('✅ Bancard.Checkout disponible, inicializando iframe...');
        // Inicializar inmediatamente
        initializeBancardIframe();
      } else {
        console.warn('⚠️ Bancard cargado pero Checkout no disponible, reintentando...');
        setTimeout(() => {
          if (window.Bancard && window.Bancard.Checkout) {
            initializeBancardIframe();
          } else {
            console.error('❌ Bancard.Checkout no disponible después de esperar');
            loadBancardScript(retryCount + 1);
          }
        }, 200);
      }
    };
    
    script.onerror = (error) => {
      console.error('❌ Error cargando script de Bancard:', error);
      setTimeout(() => {
        loadBancardScript(retryCount + 1);
      }, 1000);
    };

    document.head.appendChild(script);
    console.log('📝 Script agregado al DOM');
  };

  const initializeBancardIframe = (retryCount = 0) => {
    try {
      console.log('🎬 Inicializando iframe de Bancard, intento:', retryCount + 1);
      
      if (retryCount >= 5) {
        console.error('❌ No se pudo inicializar después de 5 intentos');
        setLoading(false);
        setPaymentProcessing(false);
        onPaymentError(new Error('No se pudo cargar el formulario después de varios intentos'));
        return;
      }
      
      if (!processId || processId.trim() === '') {
        console.error('❌ Process ID no válido:', processId);
        setLoading(false);
        setPaymentProcessing(false);
        onPaymentError(new Error('Error: Process ID no válido'));
        return;
      }
      
      console.log('🆔 Process ID recibido:', processId);
      
      if (!window.Bancard) {
        console.warn('⚠️ window.Bancard no disponible, reintentando en 1s...');
        setTimeout(() => initializeBancardIframe(retryCount + 1), 1000);
        return;
      }
      
      if (!window.Bancard.Checkout) {
        console.warn('⚠️ window.Bancard.Checkout no disponible, reintentando en 500ms...');
        setTimeout(() => initializeBancardIframe(retryCount + 1), 500);
        return;
      }
      
      console.log('✅ Bancard.Checkout disponible, creando formulario...');
      
      // ✅ ESTILOS OPTIMIZADOS SEGÚN DOCUMENTACIÓN
      const styles = {
        'form-background-color': '#ffffff',
        'input-background-color': '#ffffff',
        'input-text-color': '#1f2937',
        'input-border-color': '#d1d5db',
        'input-placeholder-color': '#9ca3af',
        'button-background-color': '#2563eb',
        'button-text-color': '#ffffff',
        'button-border-color': '#2563eb'
      };
      
      const container = document.getElementById('bancard-iframe-container');
      if (!container) {
        console.error('❌ Contenedor #bancard-iframe-container no encontrado');
        setLoading(false);
        setPaymentProcessing(false);
        onPaymentError(new Error('Error: Contenedor no encontrado'));
        return;
      }
      
      console.log('📦 Contenedor encontrado, limpiando y configurando...');
      container.innerHTML = '';
      container.style.display = 'block';
      container.style.minHeight = '550px';
      container.style.width = '100%';
      container.style.border = 'none';
      container.style.borderRadius = '16px';
      container.style.overflow = 'hidden';
      container.style.backgroundColor = '#ffffff';
      
      try {
        console.log('🚀 Llamando a Bancard.Checkout.createForm con:', {
          container: 'bancard-iframe-container',
          processId: processId,
          hasStyles: !!styles
        });
        
        // ✅ CREAR FORMULARIO SEGÚN DOCUMENTACIÓN DE BANCARD
        window.Bancard.Checkout.createForm('bancard-iframe-container', String(processId), styles);
        
        console.log('✅ Formulario creado exitosamente');
        
        // ✅ LISTENER PARA MENSAJES DEL IFRAME
        window.addEventListener('message', handleIframeMessage, false);
        
        // ✅ QUITAR LOADING DESPUÉS DE UN MOMENTO
        setTimeout(() => {
          console.log('⏰ Removiendo loading state');
          setLoading(false);
        }, 800);
        
      } catch (createFormError) {
        console.error('❌ Error al crear formulario:', createFormError);
        setLoading(false);
        setPaymentProcessing(false);
        onPaymentError(new Error(`Error al crear formulario: ${createFormError.message}`));
        
        if (retryCount < 3) {
          console.log('🔄 Reintentando crear formulario en 2s...');
          setTimeout(() => initializeBancardIframe(retryCount + 1), 2000);
        }
      }
      
    } catch (error) {
      console.error('❌ Error general al inicializar iframe:', error);
      setLoading(false);
      setPaymentProcessing(false);
      onPaymentError(new Error(`Error general: ${error.message}`));
    }
  };

  // Función para formatear moneda PYG
  const displayPYGCurrency = (num) => {
    const formatter = new Intl.NumberFormat('es-PY', {
        style: "currency",
        currency: 'PYG',
        minimumFractionDigits: 0
    });
    return formatter.format(num);
  };

  // ✅ PROCESAR PAGO DIRECTO - UNA SOLA FUNCIÓN
 const processPaymentDirect = async () => {
    // ✅ VALIDACIONES BÁSICAS
    if (cartItems.length === 0) {
        onPaymentError(new Error('No hay productos en el carrito'));
        return;
    }

    if (totalAmount <= 0) {
        onPaymentError(new Error('El monto debe ser mayor a 0'));
        return;
    }

    if (!customerData || !customerData.name) {
        onPaymentError(new Error('Faltan datos del cliente'));
        return;
    }

    setLoading(true);
    setPaymentProcessing(true);
    onPaymentStart();

    try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL;
        console.log('🔗 Configuración de pago:', {
            backendUrl,
            totalAmount,
            customerData,
            hasLocation: !!customerData.location
        });
        
        if (!backendUrl) {
            throw new Error('REACT_APP_BACKEND_URL no está configurada. Verifica tu archivo .env.local');
        }

        // ✅ CAPTURAR DATOS DE TRACKING
        const trackingData = captureTrackingData();

        // ✅ PREPARAR DATOS PARA BACKEND CON UBICACIÓN COMPLETA
        const paymentRequest = {
            amount: totalAmount.toFixed(2),
            currency: 'PYG',
            description: `Compra en Zenn - ${cartItems.length} productos`,
            customer_info: {
                name: customerData.name || '',
                email: customerData.email || '',
                phone: customerData.phone || '',
                city: customerData.city || '',
                address: customerData.address || '',
                houseNumber: customerData.houseNumber || '',
                reference: customerData.reference || '',
                fullAddress: customerData.fullAddress || `${customerData.address}, ${customerData.city}`,
                // ✅ AGREGAR DATOS DE FACTURACIÓN
                invoiceData: customerData.invoiceData || { needsInvoice: false },
                // ✅ AGREGAR UBICACIÓN DEL MAPA
                location: customerData.location || null
            },
            items: cartItems.map(item => ({
                product_id: item.productId?._id || item._id,
                name: item.productId?.productName || item.name || 'Producto',
                quantity: item.quantity,
                unitPrice: item.productId?.sellingPrice || item.unitPrice || 0,
                unit_price: item.productId?.sellingPrice || item.unitPrice || 0,
                total: (item.productId?.sellingPrice || item.unitPrice || 0) * item.quantity,
                category: item.productId?.category || '',
                brand: item.productId?.brandName || ''
            })),
            
            // ✅ AGREGAR DELIVERY_LOCATION COMPLETO
            delivery_location: customerData.location ? {
                lat: customerData.location.lat,
                lng: customerData.location.lng,
                address: customerData.location.address,
                google_maps_url: customerData.location.google_maps_url,
                google_maps_alternative_url: customerData.location.google_maps_alternative_url,
                coordinates_string: customerData.location.coordinates_string,
                manual_address: customerData.address,
                city: customerData.city,
                house_number: customerData.houseNumber,
                reference: customerData.reference,
                source: 'user_selected',
                timestamp: new Date(),
                full_address: customerData.fullAddress || `${customerData.address}, ${customerData.city}`,
                navigation_url: `https://www.google.com/maps/dir/?api=1&destination=${customerData.location.lat},${customerData.location.lng}`,
                delivery_instructions: `📍 UBICACIÓN DE ENTREGA:
📧 Cliente: ${customerData.name} (${customerData.phone})
🏠 Dirección: ${customerData.address}
🏘️ Ciudad: ${customerData.city}
🏡 Casa/Edificio: ${customerData.houseNumber}
📝 Referencia: ${customerData.reference || 'Sin referencia adicional'}

🗺️ VER UBICACIÓN EN GOOGLE MAPS:
${customerData.location.google_maps_url || 'No disponible'}

🧭 COORDENADAS EXACTAS: ${customerData.location.lat}, ${customerData.location.lng}

📱 Para navegación: https://www.google.com/maps/dir/?api=1&destination=${customerData.location.lat},${customerData.location.lng}`
            } : null,
            
            // ✅ DATOS DE TRACKING
            user_type: 'GUEST',
            payment_method: 'new_card',
            user_bancard_id: null,
            ip_address: '',
            user_agent: trackingData.user_agent,
            payment_session_id: trackingData.payment_session_id,
            device_type: trackingData.device_type,
            cart_total_items: trackingData.cart_total_items,
            referrer_url: trackingData.referrer_url,
            order_notes: String(trackingData.order_notes || ''),
            delivery_method: 'delivery', // ✅ CAMBIAR A delivery
            invoice_number: trackingData.invoice_number,
            tax_amount: trackingData.tax_amount,
            utm_source: trackingData.utm_source,
            utm_medium: trackingData.utm_medium,
            utm_campaign: trackingData.utm_campaign
        };

        console.log('📤 Enviando solicitud de pago CON UBICACIÓN:', {
            ...paymentRequest,
            delivery_location: paymentRequest.delivery_location ? {
                lat: paymentRequest.delivery_location.lat,
                lng: paymentRequest.delivery_location.lng,
                google_maps_url: paymentRequest.delivery_location.google_maps_url,
                hasCoordinates: !!(paymentRequest.delivery_location.lat && paymentRequest.delivery_location.lng)
            } : 'SIN UBICACIÓN'
        });

        // ✅ IMPORTAR authFetch SI EL USUARIO ESTÁ AUTENTICADO
        let response;
        try {
            // Intentar obtener el token para verificar si hay usuario autenticado
            let hasAuth = false;
            if (localStorage.getItem('authToken') || document.cookie.includes('token=')) {
                hasAuth = true;
            }

            if (hasAuth) {
                // Usuario autenticado: usar authFetch para incluir token
                const { authPost } = await import('../helpers/authFetch');
                response = await authPost(`${backendUrl}/api/bancard/create-payment`, paymentRequest);
            } else {
                // Usuario invitado: usar fetch normal
                response = await fetch(`${backendUrl}/api/bancard/create-payment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(paymentRequest)
                });
            }
        } catch (importError) {
            // Fallback si no se puede importar authFetch
            console.warn('⚠️ No se pudo importar authFetch, usando fetch normal');
            response = await fetch(`${backendUrl}/api/bancard/create-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(paymentRequest)
            });
        }

        

        if (!response.ok) {
            const errorText = await response.text();
            // console.error removed for production
            
            let errorMessage = `Error HTTP ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (e) {
                errorMessage = errorText;
            }
            
            throw new Error(errorMessage);
        }

        const result = await response.json();
        

        if (result.success && result.data && result.data.process_id) {
            
            
            setProcessId(result.data.process_id);
            setShowIframe(true);
            
            sessionStorage.setItem('bancard_payment', JSON.stringify({
                shop_process_id: result.data.shop_process_id,
                process_id: result.data.process_id,
                amount: totalAmount,
                customer: customerData,
                location: customerData.location, // ✅ GUARDAR UBICACIÓN EN SESIÓN
                timestamp: Date.now()
            }));
            
        } else {
            // console.error removed for production
            throw new Error(result.message || 'La respuesta del servidor no contiene los datos necesarios');
        }
    } catch (error) {
        // console.error removed for production
        setLoading(false);
        setPaymentProcessing(false);
        
        let userMessage = 'Error desconocido';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            userMessage = 'No se puede conectar con el servidor. Verifica que el backend esté funcionando.';
        } else if (error.message.includes('REACT_APP_BACKEND_URL')) {
            userMessage = 'Error de configuración. Contacta al soporte técnico.';
        } else if (error.message.includes('Backend no disponible')) {
            userMessage = 'El servidor de pagos no está disponible. Intenta nuevamente en unos minutos.';
        } else {
            userMessage = error.message;
        }
        
        onPaymentError(new Error(userMessage));
    }
};

  // ✅ CERRAR IFRAME
  const closeIframe = () => {
    setShowIframe(false);
    setProcessId('');
    setLoading(false);
    setPaymentProcessing(false);
    
    const script = document.getElementById('bancard-script');
    if (script) {
      script.remove();
    }
    
    window.removeEventListener('message', handleIframeMessage, false);
  };

  // ✅ MODAL MEJORADO Y OPTIMIZADO - CARGA RÁPIDA
  if (showIframe) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden animate-scaleIn">
          
          {/* Header Premium con Gradiente */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
            
            <div className="relative z-10 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white bg-opacity-20 backdrop-blur-md rounded-2xl shadow-lg">
                  <FaLock className="text-3xl animate-pulse-slow" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-1">Pago Seguro Bancard</h3>
                  <p className="text-xs md:text-sm text-blue-100 flex items-center gap-2">
                    <MdSecurity className="text-base md:text-lg" />
                    Certificado PCI DSS
                  </p>
                </div>
              </div>
              <button
                onClick={closeIframe}
                className="p-3 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all hover:rotate-90 duration-300"
                aria-label="Cerrar"
              >
                <FaTimes className="text-2xl" />
              </button>
            </div>

            {/* Resumen del Pago Premium */}
            <div className="mt-6 bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-5 border border-white border-opacity-20">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-blue-100 text-xs md:text-sm font-medium">Total a pagar:</span>
                  <div className="font-bold text-xl md:text-3xl mt-1">
                    {displayPYGCurrency(totalAmount)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 mb-2">
                    <span className="text-xs md:text-sm font-semibold">{cartItems.length} productos</span>
                  </div>
                  <div className="text-xs md:text-sm text-green-300 font-medium flex items-center gap-1 justify-end">
                    <FaCheckCircle className="text-sm" />
                    Datos verificados
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contenedor del iframe - OPTIMIZADO */}
          <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
            {loading && (
              <div className="text-center py-20">
                <div className="relative inline-block">
                  <FaSpinner className="animate-spin text-4xl md:text-5xl text-blue-600 mx-auto mb-4" />
                </div>
                <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Cargando formulario</h4>
                <p className="text-sm text-gray-600">Conectando con Bancard...</p>
              </div>
            )}
            
            <div 
              id="bancard-iframe-container"
              className="w-full transition-all duration-300"
              style={{ 
                display: loading ? 'none' : 'block',
                minHeight: '550px',
                width: '100%'
              }}
            />
            
            {!loading && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setLoading(true);
                    setTimeout(() => {
                      initializeBancardIframe();
                    }, 300);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline transition-colors flex items-center gap-2 mx-auto"
                >
                  <FaSpinner className="text-xs" />
                  ¿No aparece el formulario? Haz clic para recargar
                </button>
              </div>
            )}
          </div>

          {/* Footer Premium con Certificaciones */}
          <div className="bg-gradient-to-r from-gray-50 via-slate-50 to-gray-50 border-t border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div className="flex items-center justify-center gap-3 bg-white rounded-xl p-4 shadow-sm">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FaLock className="text-green-600 text-xl" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">SSL Seguro</p>
                  <p className="text-xs text-gray-600">Cifrado 256-bit</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 bg-white rounded-xl p-4 shadow-sm">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MdSecurity className="text-blue-600 text-xl" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">PCI DSS</p>
                  <p className="text-xs text-gray-600">Certificado Nivel 1</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 bg-white rounded-xl p-4 shadow-sm">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FaCheckCircle className="text-purple-600 text-xl" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">100% Seguro</p>
                  <p className="text-xs text-gray-600">Datos protegidos</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              🔒 Tus datos están protegidos por Bancard con los más altos estándares de seguridad internacional
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ BOTÓN PRINCIPAL PREMIUM - MODAL MEJORADO
  return (
    <div className="space-y-6">
      {/* Botón principal de pago - DISEÑO PREMIUM */}
      <button
        onClick={processPaymentDirect}
        disabled={disabled || cartItems.length === 0 || totalAmount <= 0 || paymentProcessing}
        className="group relative w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 
                   hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700
                   disabled:from-gray-400 disabled:to-gray-500 text-white py-6 rounded-2xl 
                   transition-all duration-500 shadow-2xl hover:shadow-3xl disabled:cursor-not-allowed 
                   transform hover:scale-[1.03] disabled:transform-none overflow-hidden"
      >
        {/* Efecto de brillo animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        <div className="relative z-10 flex items-center justify-between px-6">
          {paymentProcessing ? (
            <>
              <div className="flex items-center gap-4">
                <FaSpinner className="animate-spin text-3xl" />
                <div className="text-left">
                  <div className="text-xl font-bold">Procesando pago...</div>
                  <div className="text-sm text-blue-100">Por favor espera</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white bg-opacity-20 backdrop-blur-md rounded-xl group-hover:bg-opacity-30 transition-all">
                  <FaCreditCard className="text-3xl" />
                </div>
                <div className="text-left">
                  <div className="text-base md:text-xl font-bold">Pagar con Bancard</div>
                  <div className="text-xs md:text-sm text-blue-100 mt-0.5">
                    Tarjetas, QR, billeteras
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg md:text-2xl font-bold">
                  {displayPYGCurrency(totalAmount)}
                </div>
                <div className="text-xs text-blue-100 flex items-center gap-1 justify-end mt-0.5">
                  <FaCheckCircle className="text-xs" />
                  Seguro
                </div>
              </div>
            </>
          )}
        </div>
      </button>

      {/* Métodos de pago disponibles */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <h4 className="text-center font-semibold text-blue-900 mb-3 flex items-center justify-center gap-2">
          <MdSecurity className="text-lg" />
          Métodos de pago disponibles
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: "Tarjetas de crédito", icon: "💳" },
            { name: "Tarjetas de débito", icon: "💳" },
            { name: "Billeteras digitales", icon: "📱" },
            { name: "Código QR", icon: "📷" }
          ].map((method, index) => (
            <div key={index} className="text-center bg-white rounded-lg p-3 border border-blue-100">
              <div className="text-2xl mb-1">{method.icon}</div>
              <div className="text-xs font-medium text-gray-700">{method.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Certificaciones de seguridad */}
      <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <FaLock className="text-green-500" />
          <span className="font-medium">SSL 256-bit</span>
        </div>
        <div className="flex items-center gap-1">
          <MdSecurity className="text-green-500" />
          <span className="font-medium">PCI DSS Level 1</span>
        </div>
        <div className="flex items-center gap-1">
          <FaCheckCircle className="text-green-500" />
          <span className="font-medium">Bancard Certificado</span>
        </div>
      </div>
    </div>
  );
};

export default BancardPayButton;