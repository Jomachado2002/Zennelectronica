// frontend/src/components/CardRegistrationModal.js
// ✅ Modal Premium para Registro de Tarjetas Bancard
import React, { useState, useEffect, useCallback } from 'react';
import { FaCreditCard, FaLock, FaSpinner, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { MdSecurity } from 'react-icons/md';
import { toast } from 'react-toastify';
import { authPost } from '../helpers/authFetch';

const CardRegistrationModal = ({ user, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [processId, setProcessId] = useState('');
  const [iframeReady, setIframeReady] = useState(false);

  // ✅ MANEJAR MENSAJES DEL IFRAME (DECLARADO PRIMERO)
  const handleIframeMessage = useCallback((event) => {
    const validOrigins = [
      'https://vpos.infonet.com.py',
      'https://vpos.infonet.com.py:8888',
      window.location.origin // ✅ PERMITIR MENSAJES DEL MISMO ORIGEN (CatastroResult)
    ];
    
    // ✅ PERMITIR MENSAJES DEL MISMO ORIGEN O DE BANCARD
    if (!validOrigins.includes(event.origin) && event.origin !== window.location.origin) {
      console.log('⚠️ Mensaje de origen no válido:', event.origin);
      return;
    }

    console.log('📨 Mensaje del iframe de catastro:', {
      origin: event.origin,
      data: event.data,
      type: typeof event.data
    });

    try {
      let data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      
      if (data && typeof data === 'object') {
        // ✅ MANEJAR ÉXITO DEL CATASTRO
        if (data.status === 'add_new_card_success' || 
            (data.type === 'bancard_catastro_result' && data.success === true)) {
          console.log('✅ Tarjeta registrada exitosamente');
          toast.success('✅ Tarjeta registrada exitosamente');
          
          // ✅ DISPARAR EVENTO PARA RECARGAR TARJETAS
          window.dispatchEvent(new CustomEvent('bancard_card_registered', {
            detail: { status: 'success', description: data.description }
          }));
          
          // ✅ RECARGAR TARJETAS Y CERRAR MODAL
          setTimeout(() => {
            if (onSuccess) {
              onSuccess(); // ✅ Esto recarga las tarjetas
            }
            onClose();
          }, 1500);
        } 
        // ✅ MANEJAR ERROR DEL CATASTRO
        else if (data.status === 'add_new_card_fail' || 
                 (data.type === 'bancard_catastro_result' && data.success === false)) {
          console.error('❌ Error al registrar tarjeta:', data.description);
          toast.error(data.description || 'Error al registrar la tarjeta');
        } 
        // ✅ MANEJAR CARGA DEL IFRAME
        else if (data.type === 'iframe_loaded' || data.message === 'loaded') {
          console.log('✅ Iframe cargado');
          setIframeReady(true);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }, [onSuccess, onClose]);

  // ✅ AGREGAR Y LIMPIAR LISTENER DE MENSAJES (DESPUÉS DE DECLARAR handleIframeMessage)
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('message', handleIframeMessage, false);
      console.log('✅ Listener de mensajes agregado para catastro');
    }
    
    return () => {
      window.removeEventListener('message', handleIframeMessage, false);
      console.log('🧹 Listener de mensajes removido');
    };
  }, [isOpen, handleIframeMessage]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!isOpen) {
      setProcessId('');
      setLoading(false);
      setIframeReady(false);
      const script = document.getElementById('bancard-card-script');
      if (script) script.remove();
    }
  }, [isOpen]);

  // Cargar script de Bancard
  const loadBancardScript = useCallback((receivedProcessId, retryCount = 0) => {
    console.log('🔄 Cargando script de Bancard para catastro, intento:', retryCount + 1);
    
    if (retryCount >= 3) {
      console.error('❌ No se pudo cargar el script de catastro');
      toast.error('No se pudo cargar el formulario de registro');
      setLoading(false);
      return;
    }
    
    const existingScript = document.getElementById('bancard-card-script');
    if (existingScript) {
      existingScript.remove();
      console.log('🗑️ Script anterior removido');
    }

    const environment = process.env.REACT_APP_BANCARD_ENVIRONMENT || 'staging';
    const baseUrl = environment === 'production' 
      ? 'https://vpos.infonet.com.py' 
      : 'https://vpos.infonet.com.py:8888';

    console.log('🌐 URL de Bancard (catastro):', baseUrl);

    const script = document.createElement('script');
    script.id = 'bancard-card-script';
    script.src = `${baseUrl}/checkout/javascript/dist/bancard-checkout-4.0.0.js`;
    script.async = true;
    
    script.onload = () => {
      console.log('✅ Script de catastro cargado');
      if (window.Bancard && window.Bancard.Cards) {
        console.log('✅ Bancard.Cards disponible');
        initializeBancardCardIframe(receivedProcessId);
      } else {
        console.warn('⚠️ Bancard.Cards no disponible, reintentando...');
        setTimeout(() => {
          if (window.Bancard && window.Bancard.Cards) {
            initializeBancardCardIframe(receivedProcessId);
          } else {
            loadBancardScript(receivedProcessId, retryCount + 1);
          }
        }, 300);
      }
    };
    
    script.onerror = () => {
      console.error('❌ Error cargando script de catastro');
      setTimeout(() => loadBancardScript(receivedProcessId, retryCount + 1), 1000);
    };

    document.head.appendChild(script);
  }, []);

  // Inicializar iframe de catastro
  const initializeBancardCardIframe = useCallback((receivedProcessId, retryCount = 0) => {
    try {
      console.log('🎬 Inicializando iframe de catastro, intento:', retryCount + 1);
      
      if (retryCount >= 5) {
        console.error('❌ No se pudo inicializar iframe de catastro');
        toast.error('No se pudo cargar el formulario');
        setLoading(false);
        return;
      }
      
      if (!receivedProcessId || !window.Bancard || !window.Bancard.Cards) {
        console.warn('⚠️ Esperando que Bancard.Cards esté disponible...');
        setTimeout(() => initializeBancardCardIframe(receivedProcessId, retryCount + 1), 800);
        return;
      }
      
      console.log('✅ Bancard.Cards disponible, creando formulario de catastro...');
      
      // ✅ ESTILOS SEGÚN DOCUMENTACIÓN DE BANCARD
      const styles = {
        'form-background-color': '#ffffff',
        'input-background-color': '#ffffff',
        'input-text-color': '#1f2937',
        'input-border-color': '#d1d5db',
        'input-placeholder-color': '#9ca3af',
        'button-background-color': '#7c3aed',
        'button-text-color': '#ffffff',
        'button-border-color': '#7c3aed'
      };
      
      const container = document.getElementById('bancard-card-iframe-container');
      if (!container) {
        console.error('❌ Contenedor no encontrado');
        setLoading(false);
        return;
      }
      
      console.log('📦 Contenedor encontrado, configurando...');
      container.innerHTML = '';
      container.style.display = 'block';
      container.style.minHeight = '550px';
      container.style.width = '100%';
      
      console.log('🚀 Llamando Bancard.Cards.createForm con processId:', receivedProcessId);
      
      // ✅ CREAR FORMULARIO DE CATASTRO SEGÚN DOCUMENTACIÓN
      window.Bancard.Cards.createForm('bancard-card-iframe-container', String(receivedProcessId), styles);
      
      console.log('✅ Formulario de catastro creado');
      
      // ✅ NOTA: El listener ya se agregó en el useEffect principal
      // No es necesario agregarlo aquí de nuevo
      
      setTimeout(() => {
        console.log('⏰ Removiendo loading del catastro');
        setLoading(false);
        setIframeReady(true);
      }, 800);
      
    } catch (error) {
      console.error('❌ Error al inicializar iframe de catastro:', error);
      setLoading(false);
      toast.error('Error al cargar el formulario de registro');
    }
  }, [handleIframeMessage]);

  // Iniciar registro de tarjeta
  const startCardRegistration = async () => {
    try {
      setLoading(true);
      
      const cardId = Date.now() + Math.floor(Math.random() * 10000);
      const userId = user.bancardUserId || 'me';
      
      console.log('🎫 Iniciando registro de tarjeta:', {
        cardId,
        userId,
        userEmail: user.email
      });
      
      const cardData = {
        card_id: cardId,
        user_id: userId,
        user_cell_phone: user.phone || '12345678',
        user_mail: user.email,
        return_url: `${window.location.origin}/mi-perfil?tab=cards&status=registered`
      };

      // ✅ USAR authPost QUE INCLUYE AUTOMÁTICAMENTE EL TOKEN
      const response = await authPost(
        `${process.env.REACT_APP_BACKEND_URL}/api/bancard/tarjetas`,
        cardData
      );

      const result = await response.json();
      console.log('📬 Respuesta del backend:', result);
      
      if (result.success && result.data?.process_id) {
        const receivedProcessId = result.data.process_id;
        console.log('✅ Process ID recibido:', receivedProcessId);
        setProcessId(receivedProcessId);
        
        // Cargar script e inicializar iframe
        setTimeout(() => {
          loadBancardScript(receivedProcessId);
        }, 200);
      } else {
        console.error('❌ Error en respuesta:', result.message);
        toast.error(result.message || 'Error al iniciar registro');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error al registrar tarjeta:', error);
      toast.error('Error al iniciar el registro de tarjeta');
      setLoading(false);
    }
  };

  // Efecto para iniciar registro cuando se abre el modal
  useEffect(() => {
    if (isOpen && user) {
      startCardRegistration();
    }
    
    // ✅ Limpiar script al desmontar (el listener se limpia en el useEffect principal)
    return () => {
      const script = document.getElementById('bancard-card-script');
      if (script) script.remove();
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden animate-scaleIn">
        
        {/* Header Premium con Gradiente */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white bg-opacity-20 backdrop-blur-md rounded-2xl shadow-lg">
                <FaCreditCard className="text-3xl animate-pulse-slow" />
              </div>
              <div>
                <h3 className="text-lg md:text-2xl font-bold mb-1">Registrar Nueva Tarjeta</h3>
                <p className="text-xs md:text-sm text-purple-100 flex items-center gap-2">
                  <MdSecurity className="text-base md:text-lg" />
                  Registro seguro
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all hover:rotate-90 duration-300"
              aria-label="Cerrar"
            >
              <FaTimes className="text-2xl" />
            </button>
          </div>

          {/* Info de seguridad */}
          <div className="mt-6 bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
            <div className="flex items-center gap-3">
              <FaLock className="text-2xl" />
              <div>
                <p className="font-semibold">Tus datos están protegidos</p>
                <p className="text-xs text-purple-100">Certificado PCI DSS Level 1 - Máxima seguridad</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenedor del iframe */}
        <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
          {loading && (
            <div className="text-center py-20">
                <div className="relative inline-block">
                <FaSpinner className="animate-spin text-4xl md:text-5xl text-purple-600 mx-auto mb-4" />
              </div>
              <h4 className="text-base md:text-lg font-bold text-gray-900 mb-2">Cargando formulario</h4>
              <p className="text-sm text-gray-600">Preparando registro...</p>
            </div>
          )}
          
          <div 
            id="bancard-card-iframe-container"
            className="w-full transition-all duration-300"
            style={{ 
              display: loading ? 'none' : 'block',
              minHeight: '550px',
              width: '100%'
            }}
          />
          
          {!loading && iframeReady && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-2">
                Para pruebas en staging usa: <strong>Cédula: 9661000</strong>
              </p>
              <button
                onClick={() => {
                  setLoading(true);
                  setIframeReady(false);
                  setTimeout(() => {
                    loadBancardScript(processId);
                  }, 300);
                }}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium hover:underline transition-colors"
              >
                ¿No aparece el formulario? Haz clic para recargar
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 via-slate-50 to-gray-50 border-t border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="p-2 bg-purple-100 rounded-lg">
                <MdSecurity className="text-purple-600 text-xl" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 text-sm">PCI DSS</p>
                <p className="text-xs text-gray-600">Nivel 1</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 bg-white rounded-xl p-4 shadow-sm">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaCheckCircle className="text-blue-600 text-xl" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 text-sm">Tokenización</p>
                <p className="text-xs text-gray-600">Segura</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">
            🔒 No almacenamos tus datos de tarjeta - Todo es procesado por Bancard
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardRegistrationModal;

