// frontend/src/pages/BancardConfirmProxy.js
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const BancardConfirmProxy = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const processConfirmation = async () => {
      try {
        console.log('🔄 === PROXY BANCARD CONFIRMACIÓN ===');
        console.log('🌐 URL completa:', window.location.href);
        console.log('📋 Search params:', window.location.search);
        
        // Obtener todos los parámetros de Bancard
        const params = Object.fromEntries(searchParams);
        console.log('📋 Parámetros extraídos:', params);

        // ✅ VERIFICAR SI TENEMOS PARÁMETROS VÁLIDOS
        const hasValidParams = params.shop_process_id || 
                              params.operation_id || 
                              params.authorization_number ||
                              Object.keys(params).length > 0;

        if (!hasValidParams) {
          console.log('❌ No hay parámetros válidos de Bancard');
          setStatus('error');
          setTimeout(() => {
            navigate('/pago-cancelado?error=no_params');
          }, 2000);
          return;
        }

        // ✅ BUSCAR TRANSACCIÓN EN LOCALSTORAGE PRIMERO
        let transactionData = null;
        try {
          const savedPayment = sessionStorage.getItem('bancard_payment');
          if (savedPayment) {
            transactionData = JSON.parse(savedPayment);
            console.log('💾 Datos de transacción recuperados:', transactionData);
          }
        } catch (e) {
          console.log('⚠️ No se pudieron recuperar datos de transacción');
        }

        // ✅ CONSTRUIR OPERATION OBJECT MEJORADO
        const operation = {
          token: params.token || '',
          shop_process_id: params.shop_process_id || transactionData?.shop_process_id || '',
          response: params.response || (params.response_code === '00' ? 'S' : 'N'),
          response_details: params.response_details || '',
          amount: params.amount || transactionData?.amount || '',
          currency: params.currency || 'PYG',
          authorization_number: params.authorization_number || '',
          ticket_number: params.ticket_number || '',
          response_code: params.response_code || '',
          response_description: params.response_description || '',
          extended_response_description: params.extended_response_description || '',
          security_information: {
            customer_ip: params.customer_ip || '',
            card_source: params.card_source || '',
            card_country: params.card_country || '',
            version: params.version || '0.3',
            risk_index: params.risk_index || '0'
          },
      
          iva_ticket_number: params.iva_ticket_number || ''
        };

        console.log('📤 Enviando al backend:', operation);

        // ✅ ENVIAR AL BACKEND REAL
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://zenn.vercel.app';
        
        try {
          const response = await fetch(`${backendUrl}/api/bancard/confirm`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ operation })
          });

          console.log('📥 Backend response status:', response.status);
          
          if (response.ok) {
            console.log('✅ Backend confirmó correctamente');
          } else {
            console.warn('⚠️ Backend respondió con error:', response.status);
          }
        } catch (backendError) {
          console.error('❌ Error comunicándose con backend:', backendError);
          // Continuar con el flujo aunque falle el backend
        }

        // ✅ DETERMINAR ÉXITO BASADO EN MÚLTIPLES FACTORES
        const isSuccess = (operation.response === 'S' && operation.response_code === '00') ||
                 params.status === 'success' ||
                 params.response_code === '00' ||
                 (params.authorization_number && params.ticket_number);

        console.log('🎯 Análisis de resultado:', {
          response: operation.response,
          response_code: operation.response_code,
          authorization_number: operation.authorization_number,
          isSuccess
        });

        // ✅ CONSTRUIR URL DE DESTINO CON TODOS LOS PARÁMETROS
        const destinationParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value) destinationParams.append(key, value);
        });

        // Agregar datos de transacción si existen
        if (transactionData) {
          if (!destinationParams.has('shop_process_id')) {
            destinationParams.append('shop_process_id', transactionData.shop_process_id);
          }
          if (!destinationParams.has('amount')) {
            destinationParams.append('amount', transactionData.amount);
          }
        }

        if (isSuccess) {
          setStatus('success');
          setTimeout(() => {
            navigate(`/pago-exitoso?${destinationParams.toString()}`);
          }, 1500);
        } else {
          setStatus('failed');
          setTimeout(() => {
            navigate(`/pago-cancelado?${destinationParams.toString()}`);
          }, 1500);
        }

      } catch (error) {
        console.error('❌ Error en proxy:', error);
        setStatus('error');
        setTimeout(() => {
          navigate('/pago-cancelado?error=proxy_error');
        }, 1500);
      }
    };

    processConfirmation();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full mx-4">
        
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#2A3190] mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Procesando pago...</h2>
            <p className="text-gray-600">Confirmando tu transacción con Bancard</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="text-sm">Conexión segura SSL</span>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-800 mb-2">¡Pago Confirmado!</h2>
            <p className="text-green-600">Redirigiendo a la confirmación...</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Pago no procesado</h2>
            <p className="text-red-600">Redirigiendo...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">Error de comunicación</h2>
            <p className="text-yellow-600">Redirigiendo...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default BancardConfirmProxy;