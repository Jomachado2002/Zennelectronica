// frontend/src/pages/CatastroResult.js
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';

const CatastroResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [cardsReloaded, setCardsReloaded] = useState(false);
  
  useEffect(() => {
    const status = searchParams.get('status');
    const description = searchParams.get('description');
    const isSuccess = status === 'add_new_card_success';
    
    console.log('📥 CatastroResult - Parámetros recibidos:', {
      status,
      description,
      isSuccess,
      allParams: Object.fromEntries(searchParams)
    });
    
    // ✅ RECARGAR TARJETAS AUTOMÁTICAMENTE SI EL CATASTRO FUE EXITOSO
    if (isSuccess && !cardsReloaded) {
      setCardsReloaded(true);
      console.log('✅ Catastro exitoso, recargando tarjetas...');
      
      // ✅ DISPARAR EVENTO PARA QUE LOS COMPONENTES RECARGUEN TARJETAS
      window.dispatchEvent(new CustomEvent('bancard_card_registered', {
        detail: { status: 'success', description }
      }));
      
      toast.success('✅ Tarjeta registrada exitosamente. Recargando tarjetas...');
      
      // ✅ REDIRIGIR A PERFIL DESPUÉS DE UN MOMENTO
      setTimeout(() => {
        navigate('/mi-perfil?tab=cards&card_registered=true');
      }, 2000);
    }
    
    // Enviar mensaje al parent (si estamos en iframe)
    if (window.parent !== window) {
      const message = {
        type: 'bancard_catastro_result',
        status: status,
        description: decodeURIComponent(description || ''),
        success: isSuccess
      };
      
      console.log('📤 Enviando mensaje al parent:', message);
      window.parent.postMessage(message, '*');
    }
  }, [searchParams, navigate, cardsReloaded]);

  const status = searchParams.get('status');
  const description = searchParams.get('description');
  
  const isSuccess = status === 'add_new_card_success';
  const isFail = status === 'add_new_card_fail';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        
        {/* Icon y Estado */}
        <div className="mb-6">
          {isSuccess && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheckCircle className="text-3xl text-green-600" />
            </div>
          )}
          
          {isFail && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaExclamationCircle className="text-3xl text-red-600" />
            </div>
          )}
          
          {!isSuccess && !isFail && (
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaSpinner className="text-3xl text-blue-600 animate-spin" />
            </div>
          )}
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold mb-4">
          {isSuccess && '✅ Tarjeta Registrada'}
          {isFail && '❌ Error en Registro'}
          {!isSuccess && !isFail && '🔄 Procesando...'}
        </h1>

        {/* Descripción */}
        <p className="text-gray-600 mb-6">
          {description 
            ? decodeURIComponent(description)
            : isSuccess 
              ? 'Tu tarjeta ha sido registrada exitosamente'
              : 'Procesando resultado del registro...'
          }
        </p>

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            {isSuccess && '🎉 Ahora puedes usar esta tarjeta para pagos rápidos'}
            {isFail && '💡 Verifica los datos de tu tarjeta e intenta nuevamente'}
            {!isSuccess && !isFail && '⏳ Este proceso puede tomar unos segundos...'}
          </p>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500">
          <p>🔒 Proceso seguro certificado por Bancard</p>
          {window.parent === window && (
            <p className="mt-2">Redirigiendo automáticamente...</p>
          )}
        </div>

        {/* Debug info en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left">
            <strong>Debug Info:</strong>
            <pre>{JSON.stringify({
              status,
              description: description ? decodeURIComponent(description) : null,
              isInIframe: window.parent !== window,
              allParams: Object.fromEntries(searchParams)
            }, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatastroResult;