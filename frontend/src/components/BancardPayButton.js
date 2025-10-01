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
            console.warn('⚠️ Mensaje de origen no confiable:', event.origin);
        }

        let data = event.data;
        
        if (typeof event.data === 'string') {
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.log('📝 Mensaje como string:', event.data);
            return;
          }
        }
        
        console.log('📋 Datos parseados del iframe:', data);
        
        if (data && typeof data === 'object') {
          if (data.type === 'payment_success' || data.status === 'success') {
            console.log('✅ Pago exitoso desde iframe:', data);
            setShowIframe(false);
            setLoading(false);
            setPaymentProcessing(false);
            onPaymentSuccess(data);
            // Redirigir a página de éxito
            setTimeout(() => {
              window.location.href = '/pago-exitoso?shop_process_id=' + (data.shop_process_id || Date.now());
            }, 1000);
          } else if (data.type === 'payment_error' || data.status === 'error') {
            console.error('❌ Error en el pago desde iframe:', data);
            setShowIframe(false);
            setLoading(false);
            setPaymentProcessing(false);
            onPaymentError(new Error(data.message || 'Error en el proceso de pago'));
          } else if (data.type === 'iframe_loaded' || data.message === 'loaded') {
            console.log('✅ Iframe cargado correctamente');
            setLoading(false);
          }
        }
    } catch (error) {
        console.error('❌ Error procesando mensaje del iframe:', error);
    }
  };

  // ✅ CARGAR SCRIPT Y MANEJAR IFRAME
  useEffect(() => {
    if (showIframe && processId) {
      console.log('🎯 Efecto para cargar script:', { showIframe, processId });
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
    console.log('🔄 Cargando script de Bancard... (intento', retryCount + 1, ')');
    
    if (retryCount >= 3) {
      console.error('❌ Máximo de intentos alcanzado para cargar script');
      setShowIframe(false);
      setLoading(false);
      setPaymentProcessing(false);
      onPaymentError(new Error('No se pudo cargar el sistema de pagos después de 3 intentos'));
      return;
    }
    
    const existingScript = document.getElementById('bancard-script');
    if (existingScript) {
      existingScript.remove();
      console.log('🗑️ Script anterior removido');
    }

    const environment = process.env.REACT_APP_BANCARD_ENVIRONMENT || 'staging';
    const baseUrl = environment === 'production' 
      ? 'https://vpos.infonet.com.py' 
      : 'https://vpos.infonet.com.py:8888';

    console.log('🌐 Environment detectado:', environment, '- Base URL:', baseUrl);

    const script = document.createElement('script');
    script.id = 'bancard-script';
    script.src = `${baseUrl}/checkout/javascript/dist/bancard-checkout-4.0.0.js`;
    script.async = true;
    
    script.onload = () => {
      console.log('✅ Script de Bancard cargado exitosamente en intento', retryCount + 1);
      if (window.Bancard) {
        console.log('✅ window.Bancard disponible:', Object.keys(window.Bancard));
        setTimeout(initializeBancardIframe, 200);
      } else {
        console.warn('⚠️ window.Bancard no disponible después de cargar script');
        setTimeout(() => {
          if (window.Bancard) {
            initializeBancardIframe();
          } else {
            console.error('❌ window.Bancard sigue no disponible, reintentando...');
            loadBancardScript(retryCount + 1);
          }
        }, 500);
      }
    };
    
    script.onerror = () => {
      console.error('❌ Error cargando script de Bancard en intento', retryCount + 1);
      setTimeout(() => {
        loadBancardScript(retryCount + 1);
      }, 1000);
    };

    document.head.appendChild(script);
    console.log('📤 Script agregado al DOM:', script.src);
  };

  const initializeBancardIframe = (retryCount = 0) => {
    try {
      console.log('🎯 Inicializando iframe de PAGO con processId:', processId, '(intento', retryCount + 1, ')');
      
      if (retryCount >= 5) {
        console.error('❌ Máximo de intentos alcanzado para inicializar iframe');
        setLoading(false);
        setPaymentProcessing(false);
        onPaymentError(new Error('No se pudo cargar el formulario después de varios intentos'));
        return;
      }
      
      if (!processId || processId.trim() === '') {
        console.error('❌ processId está vacío:', processId);
        setLoading(false);
        setPaymentProcessing(false);
        onPaymentError(new Error('Error: Process ID no válido'));
        return;
      }
      
      if (!window.Bancard) {
        console.warn('⚠️ window.Bancard no existe, reintentando en 1 segundo...');
        setTimeout(() => initializeBancardIframe(retryCount + 1), 1000);
        return;
      }
      
      if (!window.Bancard.Checkout) {
        console.warn('⚠️ window.Bancard.Checkout no existe, reintentando...');
        setTimeout(() => initializeBancardIframe(retryCount + 1), 500);
        return;
      }
      
      console.log('✅ window.Bancard.Checkout disponible, creando formulario...');
      
      const styles = {
        'input-background-color': '#ffffff',
        'input-text-color': '#374151',
        'input-border-color': '#d1d5db',
        'button-background-color': '#2563eb',
        'button-text-color': '#ffffff',
        'button-border-color': '#2563eb',
        'form-background-color': '#ffffff',
        'form-border-color': '#e5e7eb'
      };
      
      const container = document.getElementById('bancard-iframe-container');
      if (!container) {
        console.error('❌ Contenedor bancard-iframe-container no encontrado');
        setLoading(false);
        setPaymentProcessing(false);
        onPaymentError(new Error('Error: Contenedor no encontrado'));
        return;
      }
      
      container.innerHTML = '';
      container.style.display = 'block';
      container.style.minHeight = '500px';
      container.style.width = '100%';
      container.style.border = 'none';
      container.style.borderRadius = '12px';
      container.style.overflow = 'hidden';
      
      try {
        console.log('🚀 Creando formulario con processId:', String(processId));
        window.Bancard.Checkout.createForm('bancard-iframe-container', String(processId), styles);
        console.log('✅ Iframe de pago inicializado exitosamente');
        
        window.addEventListener('message', handleIframeMessage, false);
        
        setTimeout(() => {
          setLoading(false);
        }, 1000);
        
      } catch (createFormError) {
        console.error('❌ Error en createForm:', createFormError);
        setLoading(false);
        setPaymentProcessing(false);
        onPaymentError(new Error(`Error al crear formulario: ${createFormError.message}`));
        
        if (retryCount < 3) {
          console.log('🔄 Reintentando crear formulario...');
          setTimeout(() => initializeBancardIframe(retryCount + 1), 2000);
        }
      }
      
    } catch (error) {
      console.error('❌ Error general inicializando iframe:', error);
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

        const response = await fetch(`${backendUrl}/api/bancard/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(paymentRequest)
        });

        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            
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
        console.log('📥 Respuesta del backend:', result);

        if (result.success && result.data && result.data.process_id) {
            console.log('✅ Pago creado exitosamente:', result.data);
            
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
            console.error('❌ Respuesta inválida:', result);
            throw new Error(result.message || 'La respuesta del servidor no contiene los datos necesarios');
        }
    } catch (error) {
        console.error('❌ Error completo en processPaymentDirect:', error);
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

  // ✅ SI MOSTRAMOS EL IFRAME - DISEÑO COMPLETAMENTE MEJORADO
  if (showIframe) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          
          {/* Header mejorado */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-full">
                  <FaLock className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Pago Seguro</h3>
                  <p className="text-blue-100">Procesado por Bancard</p>
                </div>
              </div>
              <button
                onClick={closeIframe}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
          </div>

          {/* Información del pago */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-700 font-medium">Total a pagar:</span>
                <span className="font-bold text-2xl text-blue-600 ml-2">
                  {displayPYGCurrency(totalAmount)}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">{cartItems.length} productos</div>
                <div className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <FaCheckCircle />
                  Datos verificados
                </div>
              </div>
            </div>
          </div>

          {/* Contenedor del iframe */}
          <div className="p-6">
            {loading && (
              <div className="text-center py-16">
                <FaSpinner className="animate-spin text-5xl text-blue-600 mx-auto mb-6" />
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Cargando formulario de pago</h4>
                <p className="text-gray-600">Conectando con Bancard de forma segura...</p>
              </div>
            )}
            
            <div 
              id="bancard-iframe-container"
              className="w-full"
              style={{ 
                display: loading ? 'none' : 'block',
                minHeight: '500px',
                width: '100%'
              }}
            />
            
            {!loading && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    console.log('🔄 Reintentando cargar iframe...');
                    setLoading(true);
                    setTimeout(() => {
                      initializeBancardIframe();
                    }, 500);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm underline transition-colors"
                >
                  ¿No aparece el formulario? Haz clic para recargar
                </button>
              </div>
            )}
          </div>

          {/* Footer con información de seguridad */}
          <div className="bg-gray-50 border-t p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <FaLock />
                <span className="text-sm font-medium">Conexión SSL Segura</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-green-600">
                <MdSecurity />
                <span className="text-sm font-medium">Certificado PCI DSS</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-green-600">
                <FaCheckCircle />
                <span className="text-sm font-medium">Datos Encriptados</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              Tus datos están protegidos por Bancard con los más altos estándares de seguridad internacional
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ BOTÓN PRINCIPAL MEJORADO - DIRECTO AL PAGO
  return (
    <div className="space-y-4">
      {/* Botón principal de pago - MÁS LLAMATIVO */}
      <button
        onClick={processPaymentDirect}
        disabled={disabled || cartItems.length === 0 || totalAmount <= 0 || paymentProcessing}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                   disabled:from-gray-400 disabled:to-gray-500 text-white py-5 rounded-xl 
                   transition-all duration-300 flex items-center justify-center gap-4 font-bold text-xl 
                   shadow-lg hover:shadow-xl disabled:cursor-not-allowed transform hover:scale-[1.02] 
                   disabled:transform-none"
      >
        {paymentProcessing ? (
          <>
            <FaSpinner className="animate-spin text-xl" />
            <span>Procesando pago...</span>
          </>
        ) : (
          <>
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <FaCreditCard className="text-xl" />
            </div>
            <div className="text-left">
              <div>Pagar con Bancard</div>
              <div className="text-sm font-normal opacity-90">
                {displayPYGCurrency(totalAmount)}
              </div>
            </div>
          </>
        )}
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