// frontend/src/hooks/useAuthFlow.js
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

const useAuthFlow = () => {
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [authContext, setAuthContext] = useState(null);
  const [userCapabilities, setUserCapabilities] = useState({});
  
  const user = useSelector(state => state?.user?.user);
  const navigate = useNavigate();
  const location = useLocation();
  
  const isLoggedIn = !!user;
  const isGuest = !isLoggedIn;

  // ✅ DEFINIR CAPACIDADES SEGÚN TIPO DE USUARIO
  useEffect(() => {
    if (isLoggedIn) {
      setUserCapabilities({
        canSaveCards: true,
        canViewHistory: true,
        canManageProfile: true,
        canAccessPremiumFeatures: true,
        canGetExclusiveOffers: true,
        canFasterCheckout: true,
        hasFullAccess: true,
        userType: 'REGISTERED'
      });
    } else {
      setUserCapabilities({
        canBrowse: true,
        canAddToCart: true,
        canCheckout: true,
        canRequestQuote: true,
        canPayAsGuest: true,
        cannotSaveCards: true,
        cannotViewProfile: true,
        cannotViewHistory: true,
        shouldPromptRegistration: true,
        hasLimitedAccess: true,
        userType: 'GUEST'
      });
    }
  }, [isLoggedIn]);

  // ✅ DETECTAR CONTEXTO DE USO
  useEffect(() => {
    const path = location.pathname;
    const search = location.search;
    
    if (path.includes('/carrito')) {
      setAuthContext('cart');
    } else if (path.includes('/checkout') || search.includes('checkout')) {
      setAuthContext('checkout');
    } else if (path.includes('/pago') || search.includes('payment')) {
      setAuthContext('payment');
    } else if (path.includes('/mi-perfil')) {
      setAuthContext('profile');
    } else {
      setAuthContext('browse');
    }
  }, [location]);

  // ✅ FUNCIÓN PARA VERIFICAR SI UNA ACCIÓN REQUIERE REGISTRO
  const requiresRegistration = (action) => {
    const restrictedActions = [
      'save_cards',
      'view_history',
      'manage_profile',
      'exclusive_offers',
      'faster_checkout'
    ];
    
    return restrictedActions.includes(action) && isGuest;
  };

  // ✅ FUNCIÓN PARA INTENTAR UNA ACCIÓN
  const attemptAction = async (action, callback, options = {}) => {
    
    
    if (requiresRegistration(action)) {
      
      
      if (options.showPrompt !== false) {
        setShowRegistrationPrompt(true);
      }
      
      return {
        success: false,
        requiresAuth: true,
        message: `Para ${action.replace('_', ' ')}, necesitas registrarte`,
        benefits: getActionBenefits(action)
      };
    }
    
    try {
      
      const result = await callback();
      return {
        success: true,
        result
      };
    } catch (error) {
      console.error(`❌ Error en acción ${action}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // ✅ OBTENER BENEFICIOS ESPECÍFICOS DE UNA ACCIÓN
  const getActionBenefits = (action) => {
    const benefits = {
      save_cards: [
        "Guarda hasta 5 tarjetas de forma segura",
        "Paga con un solo clic en futuras compras",
        "Tus datos protegidos con encriptación bancaria"
      ],
      view_history: [
        "Accede a todos tus pedidos anteriores",
        "Rastrea el estado de tus compras",
        "Descarga facturas y comprobantes"
      ],
      manage_profile: [
        "Personaliza tu experiencia de compra",
        "Guarda direcciones de entrega",
        "Recibe notificaciones personalizadas"
      ],
      exclusive_offers: [
        "Descuentos exclusivos para usuarios registrados",
        "Acceso anticipado a ofertas especiales",
        "Cupones personalizados"
      ],
      faster_checkout: [
        "Checkout en menos de 30 segundos",
        "Datos pre-cargados automáticamente",
        "Experiencia de compra optimizada"
      ]
    };
    
    return benefits[action] || ["Funcionalidad premium para usuarios registrados"];
  };

  // ✅ FUNCIÓN PARA PROMOVER REGISTRO
  const promoteRegistration = (context = authContext, options = {}) => {
    
    
    const promotionData = {
      context,
      totalAmount: options.totalAmount || 0,
      urgency: options.urgency || false,
      benefits: options.benefits || getContextBenefits(context)
    };
    
    setShowRegistrationPrompt(true);
    
    // Analytics/tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'registration_prompt_shown', {
        event_category: 'Auth Flow',
        event_label: context,
        value: options.totalAmount || 0
      });
    }
    
    return promotionData;
  };

  // ✅ OBTENER BENEFICIOS SEGÚN CONTEXTO
  const getContextBenefits = (context) => {
    const contextBenefits = {
      cart: [
        "Guarda productos en tu lista de favoritos",
        "Checkout más rápido con tarjetas guardadas",
        "Recibe ofertas personalizadas"
      ],
      checkout: [
        "Pago con un solo clic",
        "Direcciones guardadas",
        "Historial de compras"
      ],
      payment: [
        "Tarjetas guardadas de forma segura",
        "No vuelvas a ingresar datos",
        "Pagos más rápidos"
      ],
      profile: [
        "Gestiona tu cuenta completa",
        "Configuraciones personalizadas",
        "Soporte prioritario"
      ]
    };
    
    return contextBenefits[context] || contextBenefits.cart;
  };

  // ✅ FUNCIÓN PARA MANEJAR REDIRECCIÓN POST-AUTENTICACIÓN
  const handlePostAuthRedirect = () => {
    try {
      const savedContext = sessionStorage.getItem('pre_registration_context') || 
                           sessionStorage.getItem('pre_login_context');
      
      if (savedContext) {
        const context = JSON.parse(savedContext);
        
        
        // Limpiar storage
        sessionStorage.removeItem('pre_registration_context');
        sessionStorage.removeItem('pre_login_context');
        
        // Redirigir con contexto
        if (context.returnUrl && context.returnUrl !== '/iniciar-sesion' && context.returnUrl !== '/registro') {
          navigate(context.returnUrl);
          
          if (context.totalAmount > 0) {
            toast.success(`¡Bienvenido! Puedes continuar con tu compra de ${formatCurrency(context.totalAmount)}`);
          }
        }
      }
    } catch (error) {
      console.error('Error restaurando contexto:', error);
    }
  };

  // ✅ FUNCIÓN PARA VERIFICAR CAPACIDADES
  const canPerform = (action) => {
    return userCapabilities[`can${action.charAt(0).toUpperCase() + action.slice(1)}`] || false;
  };

  // ✅ FUNCIÓN PARA FORMATEAR MONEDA
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // ✅ FUNCIÓN PARA OBTENER MENSAJE DE UPGRADE
  const getUpgradeMessage = (action) => {
    const messages = {
      save_cards: "Regístrate para guardar tus tarjetas y pagar más rápido",
      view_history: "Crea una cuenta para ver tu historial de compras",
      manage_profile: "Registrarte te permite personalizar tu experiencia",
      exclusive_offers: "Los usuarios registrados reciben ofertas exclusivas",
      faster_checkout: "Con una cuenta, el checkout es 3x más rápido"
    };
    
    return messages[action] || "Regístrate para acceder a todas las funcionalidades";
  };

  // ✅ FUNCIÓN PARA CERRAR PROMPT DE REGISTRO
  const closeRegistrationPrompt = () => {
    setShowRegistrationPrompt(false);
  };

  // ✅ FUNCIÓN PARA CONTINUAR COMO INVITADO
  const continueAsGuest = () => {
    
    setShowRegistrationPrompt(false);
    
    // Analytics/tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'continue_as_guest', {
        event_category: 'Auth Flow',
        event_label: authContext
      });
    }
    
    toast.info('Continuando como invitado. Puedes registrarte en cualquier momento para obtener beneficios adicionales.');
  };

  return {
    // Estado
    isLoggedIn,
    isGuest,
    user,
    authContext,
    userCapabilities,
    showRegistrationPrompt,
    
    // Funciones principales
    attemptAction,
    requiresRegistration,
    promoteRegistration,
    canPerform,
    
    // Utilidades
    getUpgradeMessage,
    getActionBenefits,
    getContextBenefits,
    handlePostAuthRedirect,
    
    // Controles de UI
    closeRegistrationPrompt,
    continueAsGuest,
    
    // Navegación
    navigate,
    location
  };
};

export default useAuthFlow;