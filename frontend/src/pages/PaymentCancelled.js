import React, { useEffect, useState } from 'react';
import { FaTimesCircle, FaWhatsapp, FaEnvelope, FaPhone, FaHome, FaShoppingCart } from 'react-icons/fa';
import { MdHelp, MdRefresh } from 'react-icons/md';

const PaymentCancelled = () => {
  const [paymentInfo, setPaymentInfo] = useState({
    shop_process_id: '',
    amount: 0,
    reason: 'cancelled'
  });
  const [loading, setLoading] = useState(true);

  // Función para obtener parámetros de URL
  const getUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      processId: urlParams.get('shop_process_id') || urlParams.get('id'),
      reason: urlParams.get('reason') || 'cancelled',
      amount: urlParams.get('amount') || '0'
    };
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

  useEffect(() => {
    // Obtener parámetros de la URL
    const { processId, reason, amount } = getUrlParams();

    console.log('Pago cancelado - Parámetros:', { processId, reason, amount });

    setPaymentInfo({
      shop_process_id: processId,
      amount: parseFloat(amount),
      reason: reason
    });

    setLoading(false);
  }, []);

  const contactWhatsApp = () => {
    const message = `Hola! Tuve un problema al procesar mi pago en Zenn.%0A%0AID de transacción: ${paymentInfo.shop_process_id}%0AMonto: ${displayPYGCurrency(paymentInfo.amount)}%0AMotivo: Pago cancelado%0A%0A¿Pueden ayudarme a completar mi compra? Gracias!`;
    window.open(`https://wa.me/595981150393?text=${message}`, '_blank');
  };

  const sendEmail = () => {
    const subject = `Problema con pago - ${paymentInfo.shop_process_id}`;
    const body = `Estimados,%0A%0ATuve un problema al procesar mi pago en Zenn:%0A%0AID de transacción: ${paymentInfo.shop_process_id}%0AMonto: ${displayPYGCurrency(paymentInfo.amount)}%0AMotivo: Pago cancelado%0A%0APor favor ayúdenme a completar mi compra.%0A%0AGracias!`;
    window.location.href = `mailto:ventas@zenn.com.py?subject=${subject}&body=${body}`;
  };

  const retryPayment = () => {
    // Redirigir de vuelta al carrito o página de pago
    window.location.href = '/carrito';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando información...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Mensaje de cancelación */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center mb-8 border-l-4 border-red-500">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaTimesCircle className="text-4xl text-red-500" />
          </div>
          
          <h1 className="text-3xl font-bold text-red-600 mb-2">
            Pago Cancelado
          </h1>
          
          <p className="text-gray-600 text-lg mb-6">
            Tu pago ha sido cancelado o no se pudo procesar. No te preocupes, tus productos siguen en el carrito.
          </p>

          {/* Detalles de la transacción cancelada */}
          {paymentInfo.shop_process_id && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="font-semibold text-gray-800 mb-4">Detalles de la transacción</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">ID de transacción:</span>
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {paymentInfo.shop_process_id}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Monto:</span>
                  <span className="font-bold text-gray-700 text-lg">
                    {displayPYGCurrency(paymentInfo.amount)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Estado:</span>
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                    Cancelado
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">
                    {new Date().toLocaleDateString('es-PY', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Posibles motivos */}
          <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">🤔 Posibles motivos</h3>
            <ul className="text-yellow-700 text-sm space-y-1 text-left">
              <li>• Cancelaste el pago en Bancard</li>
              <li>• Problemas con la tarjeta o datos bancarios</li>
              <li>• Conexión interrumpida durante el proceso</li>
              <li>• Límites de la tarjeta superados</li>
              <li>• Problema técnico temporal</li>
            </ul>
          </div>

          {/* Botón para reintentar */}
          <button
            onClick={retryPayment}
            className="w-full bg-[#2A3190] text-white py-4 rounded-lg hover:bg-[#1e236b] transition-all duration-300 flex items-center justify-center gap-3 font-semibold text-lg shadow-lg mb-4"
          >
            <MdRefresh className="text-xl" />
            Intentar Pago Nuevamente
          </button>

          <p className="text-gray-500 text-sm">
            Tus productos siguen guardados en el carrito
          </p>
        </div>

        {/* Opciones de ayuda */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center flex items-center justify-center gap-2">
            <MdHelp className="text-[#2A3190]" />
            ¿Necesitas ayuda?
          </h2>
          
          <p className="text-gray-600 text-center mb-6">
            Nuestro equipo está aquí para ayudarte a completar tu compra
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={contactWhatsApp}
              className="flex items-center justify-center gap-3 bg-[#25D366] text-white py-3 px-4 rounded-lg hover:bg-[#128C7E] transition-all duration-300 shadow-md"
            >
              <FaWhatsapp className="text-xl" />
              <span className="font-medium">Contactar por WhatsApp</span>
            </button>
            
            <button
              onClick={sendEmail}
              className="flex items-center justify-center gap-3 bg-[#2A3190] text-white py-3 px-4 rounded-lg hover:bg-[#1e236b] transition-all duration-300 shadow-md"
            >
              <FaEnvelope className="text-xl" />
              <span className="font-medium">Enviar Email</span>
            </button>
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-600">
            <p className="flex items-center justify-center gap-2 mb-1">
              <FaPhone className="text-[#2A3190]" />
              También puedes llamarnos al: +595 981 150393
            </p>
            <p>Horario de atención: Lunes a Viernes de 8:00 a 18:00</p>
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            Otras opciones de pago
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Transferencia Bancaria</h3>
              <p className="text-blue-700 text-sm">
                Realiza tu pago por transferencia y envíanos el comprobante
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Pago en Efectivo</h3>
              <p className="text-green-700 text-sm">
                Visita nuestra oficina para pagar en efectivo
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">Pago Contra Entrega</h3>
              <p className="text-purple-700 text-sm">
                Paga cuando recibas tu pedido (sujeto a aprobación)
              </p>
            </div>
          </div>
        </div>

        {/* Botones de navegación */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/carrito'}
            className="flex items-center justify-center gap-2 bg-[#2A3190] text-white py-3 px-6 rounded-lg hover:bg-[#1e236b] transition-all duration-300 shadow-md"
          >
            <FaShoppingCart />
            <span>Ver mi carrito</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center justify-center gap-2 border border-[#2A3190] text-[#2A3190] py-3 px-6 rounded-lg hover:bg-[#2A3190] hover:text-white transition-all duration-300"
          >
            <FaHome />
            <span>Volver al inicio</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            No te preocupes, estamos aquí para ayudarte • Zenn - Tu tecnología de confianza
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled;