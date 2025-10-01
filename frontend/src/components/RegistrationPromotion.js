// frontend/src/components/RegistrationPromotion.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUser, 
  FaCreditCard, 
  FaHistory, 
  FaGift, 
  FaShieldAlt, 
  FaTimes,
  FaArrowRight,
  FaStar,
  FaHeart
} from 'react-icons/fa';

const RegistrationPromotion = ({ 
  isVisible, 
  onClose, 
  onContinueAsGuest,
  context = 'cart', // 'cart', 'checkout', 'payment'
  totalAmount = 0 
}) => {
  const [showBenefits, setShowBenefits] = useState(false);
  const navigate = useNavigate();

  if (!isVisible) return null;

  const benefits = [
    {
      icon: FaCreditCard,
      title: "Tarjetas Guardadas",
      description: "Guarda tus tarjetas de forma segura para compras más rápidas",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: FaHistory,
      title: "Historial Completo",
      description: "Accede a todos tus pedidos y transacciones anteriores",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: FaGift,
      title: "Ofertas Exclusivas",
      description: "Recibe promociones y descuentos especiales solo para usuarios registrados",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: FaShieldAlt,
      title: "Compras Seguras",
      description: "Mayor seguridad y protección en todas tus transacciones",
      color: "text-red-600",
      bgColor: "bg-red-50"
    }
  ];

  const getContextMessage = () => {
    switch (context) {
      case 'cart':
        return {
          title: "¡Mejora tu experiencia de compra!",
          subtitle: "Regístrate ahora y disfruta de beneficios exclusivos",
          urgency: ""
        };
      case 'checkout':
        return {
          title: "¡Último paso para una experiencia premium!",
          subtitle: "Registrarte solo toma 2 minutos y te ahorrará tiempo en futuras compras",
          urgency: "⚡ Oferta especial: 10% de descuento en tu primera compra registrada"
        };
      case 'payment':
        return {
          title: "¿Sabías que puedes guardar esta tarjeta?",
          subtitle: "Con una cuenta registrada, no tendrás que volver a ingresar estos datos",
          urgency: "🔒 Tus datos estarán 100% seguros y encriptados"
        };
      default:
        return {
          title: "¡Únete a Zenn!",
          subtitle: "Descubre todas las ventajas de tener una cuenta",
          urgency: ""
        };
    }
  };

  const contextMessage = getContextMessage();

  const handleRegister = () => {
    // Guardar contexto del carrito/pago para restaurar después del registro
    if (totalAmount > 0) {
      sessionStorage.setItem('pre_registration_context', JSON.stringify({
        totalAmount,
        context,
        timestamp: Date.now(),
        returnUrl: window.location.pathname
      }));
    }
    navigate('/registro');
  };

  const handleLogin = () => {
    if (totalAmount > 0) {
      sessionStorage.setItem('pre_login_context', JSON.stringify({
        totalAmount,
        context,
        timestamp: Date.now(),
        returnUrl: window.location.pathname
      }));
    }
    navigate('/iniciar-sesion');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#2A3190] to-[#1e236b] text-white p-6 rounded-t-xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 text-xl transition-colors"
          >
            <FaTimes />
          </button>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaUser className="text-2xl text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{contextMessage.title}</h2>
            <p className="text-blue-100">{contextMessage.subtitle}</p>
            {contextMessage.urgency && (
              <div className="mt-3 bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg text-sm font-medium">
                {contextMessage.urgency}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">2min</div>
              <div className="text-xs text-blue-700">Registro rápido</div>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">50%</div>
              <div className="text-xs text-green-700">Más rápido al pagar</div>
            </div>
            <div className="text-center bg-purple-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">100%</div>
              <div className="text-xs text-purple-700">Seguro y protegido</div>
            </div>
          </div>

          {/* Benefits Preview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaStar className="text-yellow-500" />
              ¿Qué ganas al registrarte?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {benefits.slice(0, showBenefits ? benefits.length : 2).map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className={`${benefit.bgColor} rounded-lg p-4 border border-gray-100`}>
                    <div className="flex items-start gap-3">
                      <div className={`${benefit.color} text-xl mt-1`}>
                        <Icon />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 mb-1">{benefit.title}</h4>
                        <p className="text-sm text-gray-600">{benefit.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!showBenefits && benefits.length > 2 && (
              <button
                onClick={() => setShowBenefits(true)}
                className="w-full mt-3 text-[#2A3190] hover:text-[#1e236b] text-sm font-medium flex items-center justify-center gap-1 py-2 border border-[#2A3190] rounded-lg hover:bg-blue-50 transition-colors"
              >
                Ver todos los beneficios
                <FaArrowRight className="text-xs" />
              </button>
            )}
          </div>

          {/* Social Proof */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} className="text-sm" />
                ))}
              </div>
              <span className="text-sm font-medium text-yellow-800">4.9/5 en satisfacción</span>
            </div>
            <p className="text-yellow-700 text-sm">
              "Registrarme en Zenn fue la mejor decisión. Ahora mis compras son súper rápidas y seguras."
            </p>
            <p className="text-yellow-600 text-xs mt-1">- María G., cliente verificada</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRegister}
              className="w-full bg-gradient-to-r from-[#2A3190] to-[#1e236b] text-white py-4 rounded-lg hover:from-[#1e236b] hover:to-[#15173d] transition-all duration-300 flex items-center justify-center gap-3 font-semibold text-lg shadow-lg"
            >
              <FaUser />
              <span>Crear cuenta gratis</span>
              <div className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                ¡RECOMENDADO!
              </div>
            </button>

            <button
              onClick={handleLogin}
              className="w-full bg-white text-[#2A3190] py-3 rounded-lg border-2 border-[#2A3190] hover:bg-blue-50 transition-all duration-300 flex items-center justify-center gap-2 font-medium"
            >
              <span>Ya tengo cuenta</span>
              <FaArrowRight className="text-sm" />
            </button>

            <button
              onClick={onContinueAsGuest}
              className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm underline transition-colors"
            >
              Continuar como invitado (sin beneficios)
            </button>
          </div>

          {/* Fine Print */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Al registrarte, aceptas nuestros términos y condiciones. 
              Tus datos están protegidos bajo nuestra política de privacidad.
            </p>
          </div>
        </div>

        {/* Footer with Trust Indicators */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FaShieldAlt className="text-green-500" />
              <span>Datos protegidos</span>
            </div>
            <div className="flex items-center gap-2">
              <FaHeart className="text-red-500" />
              <span>+1000 clientes felices</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCreditCard className="text-blue-500" />
              <span>Pagos seguros</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPromotion;