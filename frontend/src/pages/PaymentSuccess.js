/* global fbq */
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
    FaCheckCircle, 
    FaHome, 
    FaShoppingCart, 
    FaReceipt, 
    FaCreditCard,
    FaExclamationTriangle,
    FaFileInvoice
} from 'react-icons/fa';
import displayPYGCurrency from '../helpers/displayCurrency';
import { localCartHelper } from '../helpers/addToCart';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [paymentData, setPaymentData] = useState(null);
    const [transactionDetails, setTransactionDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Obtener parámetros de la URL Bancard
    const shop_process_id = searchParams.get('shop_process_id');
    const operation_id = searchParams.get('operation_id');
    const currency_id = searchParams.get('currency_id');
    const amount = searchParams.get('amount');
    const authorization_number = searchParams.get('authorization_number');
    const displayAmount = amount || paymentData?.amount || transactionDetails?.confirmation?.amount;
    const ticket_number = searchParams.get('ticket_number');
    const response_code = searchParams.get('response_code');
    const response_description = searchParams.get('response_description');
    const security_information = searchParams.get('security_information');
    const card_source = searchParams.get('card_source');
    const customer_ip = searchParams.get('customer_ip');
    const card_country = searchParams.get('card_country');
    const version = searchParams.get('version');
    const risk_index = searchParams.get('risk_index');

    // Determinar si el pago fue exitoso
    const isPaymentSuccessful = response_code === '00' || 
                           (!response_code && shop_process_id) ||
                           (authorization_number && ticket_number) ||
                           searchParams.get('status') === 'payment_success';

    useEffect(() => {
        
        console.log("📋 Parámetros recibidos:", {
            shop_process_id,
            operation_id,
            currency_id,
            amount,
            authorization_number,
            ticket_number,
            response_code,
            response_description,
            security_information,
            card_source,
            customer_ip,
            card_country,
            version,
            risk_index
        });

        // Verificar si hay datos del pago en sessionStorage
        const savedPaymentData = sessionStorage.getItem('bancard_payment');
        if (savedPaymentData) {
            try {
                const parsedData = JSON.parse(savedPaymentData);
                setPaymentData(parsedData);
                
            } catch (e) {
                console.error("Error parseando datos de pago:", e);
            }
        }

        // Consultar detalles de la transacción si hay ID
        if (shop_process_id) {
            fetchTransactionDetails(shop_process_id);
        } else {
            setIsLoading(false);
            setError("No se recibió ID de transacción");
        }

        // Limpiar carrito si el pago fue exitoso
        if (isPaymentSuccessful) {
            setTimeout(() => {
                localCartHelper.clearCart();
                
            }, 2000);

            // Facebook Pixel Tracking, solo si fbq está definido
            if (typeof fbq === 'function') {
                fbq('track', 'Purchase', {
                    content_ids: transactionDetails?.items?.map(item => item.product_slug || item.slug) || [shop_process_id],
                    value: parseFloat(amount || 0),
                    currency: currency_id === 'PYG' ? 'PYG' : 'USD',
                    content_type: 'product'
                });
                
            }
        }
    }, [shop_process_id, response_code]);

    const fetchTransactionDetails = async (transactionId) => {
        try {
            setIsLoading(true);
            

            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/status/${transactionId}`, {
                method: 'GET',
                credentials: 'include'
            });

            const result = await response.json();
            

            if (result.success) {
                setTransactionDetails(result.data);
            } else {
                console.warn("⚠️ No se pudieron obtener detalles:", result.message);
                // No mostrar error, seguir con los datos de URL
            }
        } catch (error) {
            console.error("❌ Error consultando transacción:", error);
            // No mostrar error, seguir con los datos de URL
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinueShopping = () => {
        // Limpiar datos de pago
        sessionStorage.removeItem('bancard_payment');
        sessionStorage.removeItem('payment_in_progress');
        navigate('/');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full mx-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Verificando pago...</h2>
                    <p className="text-gray-600">Estamos confirmando los detalles de tu transacción.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
            <div className="container mx-auto max-w-4xl">
                {/* Header de estado */}
                <div className="text-center mb-8">
                    {isPaymentSuccessful ? (
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full mb-4">
                            <FaCheckCircle className="text-4xl" />
                        </div>
                    ) : (
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 text-red-600 rounded-full mb-4">
                            <FaExclamationTriangle className="text-4xl" />
                        </div>
                    )}
                    <h1 className={`text-3xl font-bold mb-2 ${isPaymentSuccessful ? 'text-green-800' : 'text-red-800'}`}>
                        {isPaymentSuccessful ? '¡Pago Exitoso!' : 'Error en el Pago'}
                    </h1>
                    <p className={`text-lg ${isPaymentSuccessful ? 'text-green-600' : 'text-red-600'}`}>
                        {isPaymentSuccessful 
                            ? 'Tu pago ha sido procesado correctamente'
                            : 'Hubo un problema al procesar tu pago'
                        }
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Detalles de la transacción */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <FaReceipt className="mr-2 text-blue-600" />
                            Detalles de la Transacción
                        </h2>
                        <div className="space-y-4">
                            {shop_process_id && (
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">ID de Transacción:</span>
                                    <span className="font-medium text-gray-900">#{shop_process_id}</span>
                                </div>
                            )}
                            {operation_id && (
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">ID de Operación:</span>
                                    <span className="font-medium text-gray-900">{operation_id}</span>
                                </div>
                            )}
                            {displayAmount && (
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Monto:</span>
                                    <span className="font-bold text-lg text-green-600">
                                        {displayPYGCurrency(parseFloat(displayAmount))}
                                    </span>
                                </div>
                            )}
                            {authorization_number && (
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Nº de Autorización:</span>
                                    <span className="font-medium text-gray-900">{authorization_number}</span>
                                </div>
                            )}
                            {ticket_number && (
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Nº de Ticket:</span>
                                    <span className="font-medium text-gray-900">{ticket_number}</span>
                                </div>
                            )}
                            {response_description && (
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Estado:</span>
                                    <span className={`font-medium ${isPaymentSuccessful ? 'text-green-600' : 'text-red-600'}`}>
                                        {response_description}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Fecha:</span>
                                <span className="font-medium text-gray-900">
                                    {new Date().toLocaleString('es-ES', {
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

                    {/* Información adicional y acciones */}
                    <div className="space-y-6">
                        {/* Información de seguridad */}
                        {(card_source || customer_ip || risk_index) && (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                    <FaCreditCard className="mr-2 text-green-600" />
                                    Información de Seguridad
                                </h3>
                                <div className="space-y-3 text-sm">
                                    {card_source && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Origen de tarjeta:</span>
                                            <span className="font-medium">
                                                {card_source === 'L' ? 'Local' : 'Internacional'}
                                            </span>
                                        </div>
                                    )}
                                    {card_country && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">País de tarjeta:</span>
                                            <span className="font-medium">{card_country}</span>
                                        </div>
                                    )}
                                    {customer_ip && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">IP del cliente:</span>
                                            <span className="font-medium">{customer_ip}</span>
                                        </div>
                                    )}
                                    {risk_index && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Índice de riesgo:</span>
                                            <span className="font-medium">{risk_index}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Datos del cliente si están disponibles */}
                        {paymentData?.customer && (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                    Datos del Cliente
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Nombre:</span>
                                        <span className="font-medium">{paymentData.customer.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Email:</span>
                                        <span className="font-medium">{paymentData.customer.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Teléfono:</span>
                                        <span className="font-medium">{paymentData.customer.phone}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Acciones */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                ¿Qué deseas hacer ahora?
                            </h3>
                            <div className="space-y-3">
                                <button
                                    onClick={handleContinueShopping}
                                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                                >
                                    <FaShoppingCart />
                                    Continuar Comprando
                                </button>
                                <Link
                                    to="/"
                                    className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 font-medium"
                                >
                                    <FaHome />
                                    Ir al Inicio
                                </Link>
                                {isPaymentSuccessful && (
                                    <button
                                        onClick={() => window.print()}
                                        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                                    >
                                        <FaFileInvoice />
                                        Imprimir Comprobante
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Información adicional */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                        Información Importante
                    </h3>
                    {isPaymentSuccessful ? (
                        <div className="text-blue-700 space-y-2 text-sm">
                            <p>• Recibirás un email de confirmación en los próximos minutos.</p>
                            <p>• Guarda este comprobante para tus registros.</p>
                            <p>• Si tienes alguna consulta, contacta a nuestro soporte.</p>
                            <p>• El cargo aparecerá en tu estado de cuenta como "Zenn".</p>
                        </div>
                    ) : (
                        <div className="text-red-700 space-y-2 text-sm">
                            <p>• No se ha realizado ningún cargo a tu tarjeta.</p>
                            <p>• Puedes intentar el pago nuevamente.</p>
                            <p>• Si el problema persiste, contacta a tu banco.</p>
                            <p>• También puedes contactar a nuestro soporte para asistencia.</p>
                        </div>
                    )}
                </div>

                {/* Footer de soporte */}
                <div className="mt-8 text-center">
                    <p className="text-gray-600 mb-2">¿Necesitas ayuda?</p>
                    <div className="flex justify-center gap-4">
                        <a
                            href="https://wa.me/+595981150393"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700 font-medium"
                        >
                            WhatsApp: +595 981 150393
                        </a>
                        <span className="text-gray-400">|</span>
                        <a
                            href="mailto:ventas@zenn.com.py"
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            ventas@zenn.com.py
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
