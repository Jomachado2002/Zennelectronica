// frontend/src/components/QuickPayWithCard.js
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  FaCreditCard, 
  FaLock, 
  FaSpinner, 
  FaTimes, 
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlus
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';

const QuickPayWithCard = ({ 
  cartItems = [], 
  totalAmount = 0, 
  customerData = {},
  onPaymentStart = () => {},
  onPaymentSuccess = () => {},
  onPaymentError = () => {},
  onRegisterNewCard = () => {},
  disabled = false 
}) => {
  const user = useSelector(state => state?.user?.user);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCards, setLoadingCards] = useState(true);
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [show3DSIframe, setShow3DSIframe] = useState(false);
  const [processId, setProcessId] = useState('');

  // Cargar tarjetas del usuario al montar
  useEffect(() => {
    if (user?.bancardUserId || user?._id) {
      fetchUserCards();
    }
  }, [user]);

  const fetchUserCards = async () => {
    try {
      setLoadingCards(true);
      const userId = user.bancardUserId || user._id;
      
      const response = await fetch(`${SummaryApi.baseURL}/api/bancard/tarjetas/${userId}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success && result.data?.cards) {
        setCards(result.data.cards);
        console.log('✅ Tarjetas cargadas:', result.data.cards);
      } else {
        setCards([]);
        console.log('ℹ️ Usuario sin tarjetas registradas');
      }
    } catch (error) {
      console.error('❌ Error cargando tarjetas:', error);
      setCards([]);
    } finally {
      setLoadingCards(false);
    }
  };

  const generateShopProcessId = () => {
    return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
  };

  const handlePayWithCard = async (card) => {
    if (!card?.alias_token) {
      toast.error('Token de tarjeta no válido');
      return;
    }

    setLoading(true);
    onPaymentStart();

    try {
      console.log('💳 Iniciando pago con tarjeta:', card.card_masked_number);

      const shopProcessId = generateShopProcessId();
      
      const paymentData = {
        shop_process_id: shopProcessId,
        amount: totalAmount.toFixed(2),
        currency: 'PYG',
        alias_token: card.alias_token,
        number_of_payments: 1,
        description: `Compra Zenn - ${cartItems.length} productos`,
        return_url: `${window.location.origin}/pago-exitoso`,
        additional_data: '',
      };

      console.log('📤 Datos de pago:', paymentData);

      const response = await fetch(`${SummaryApi.baseURL}/api/bancard/pago-con-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();
      
      console.log('📥 Respuesta de pago:', result);

      if (result.success) {
        // ✅ VERIFICAR SI NECESITA 3DS
        if (result.requires3DS && result.data?.operation?.process_id) {
          console.log('🔐 Pago requiere autenticación 3DS');
          setProcessId(result.data.operation.process_id);
          setShow3DSIframe(true);
          setShowCardSelection(false);
          toast.info('🔐 Verificación de seguridad requerida');
        } else {
          // ✅ PAGO PROCESADO DIRECTAMENTE
          console.log('✅ Pago procesado exitosamente');
          toast.success('✅ Pago realizado exitosamente');
          setShowCardSelection(false);
          onPaymentSuccess({
            ...result.data,
            card_used: card.card_masked_number,
            shop_process_id: shopProcessId
          });
        }
      } else {
        throw new Error(result.message || 'Error en el pago');
      }
    } catch (error) {
      console.error('❌ Error en pago:', error);
      toast.error(`Error: ${error.message}`);
      onPaymentError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelection = (card) => {
    setSelectedCard(card);
    setShowConfirmation(true);
  };

  const confirmPayment = () => {
    setShowConfirmation(false);
    handlePayWithCard(selectedCard);
  };

  const getCardBrandColor = (brand) => {
    switch (brand?.toLowerCase()) {
      case 'visa': return 'bg-blue-600';
      case 'mastercard': return 'bg-red-600';
      case 'american express': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const load3DSScript = () => {
    // Remover script anterior si existe
    const existingScript = document.getElementById('bancard-3ds-script');
    if (existingScript) {
      existingScript.remove();
    }

    const environment = process.env.REACT_APP_BANCARD_ENVIRONMENT || 'staging';
    const baseUrl = environment === 'production' 
      ? 'https://vpos.infonet.com.py' 
      : 'https://vpos.infonet.com.py:8888';

    const script = document.createElement('script');
    script.id = 'bancard-3ds-script';
    script.src = `${baseUrl}/checkout/javascript/dist/bancard-checkout-4.0.0.js`;
    script.async = true;
    
    script.onload = () => {
      console.log('✅ Script 3DS cargado');
      setTimeout(initialize3DSIframe, 100);
    };
    
    script.onerror = () => {
      console.error('❌ Error cargando script 3DS');
      setShow3DSIframe(false);
      toast.error('Error cargando verificación de seguridad');
    };

    document.head.appendChild(script);
  };

  const initialize3DSIframe = () => {
    try {
      if (window.Bancard && window.Bancard.Charge3DS) {
        const styles = {
          'input-background-color': '#ffffff',
          'input-text-color': '#555555',
          'button-background-color': '#2A3190',
          'button-text-color': '#ffffff',
          'form-background-color': '#ffffff'
        };

        const container = document.getElementById('bancard-3ds-container');
        if (container) {
          container.innerHTML = '';
          window.Bancard.Charge3DS.createForm('bancard-3ds-container', processId, styles);
          console.log('✅ Iframe 3DS inicializado');
        }
      } else {
        console.log('⏳ Bancard.Charge3DS no disponible, reintentando...');
        setTimeout(initialize3DSIframe, 1000);
      }
    } catch (error) {
      console.error('❌ Error inicializando 3DS:', error);
      toast.error('Error en verificación de seguridad');
    }
  };

  useEffect(() => {
    if (show3DSIframe && processId) {
      load3DSScript();
    }
  }, [show3DSIframe, processId]);

  const close3DSIframe = () => {
    setShow3DSIframe(false);
    setProcessId('');
    
    // Limpiar script
    const script = document.getElementById('bancard-3ds-script');
    if (script) {
      script.remove();
    }
    
    // El comercio recibirá confirmación en su URL de confirmación
    toast.info('Verificando resultado del pago...');
  };

  // Si no hay usuario autenticado
  if (!user) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-center">
        <FaLock className="text-3xl text-blue-600 mx-auto mb-2" />
        <h3 className="font-medium text-blue-800 mb-2">Pago Rápido</h3>
        <p className="text-blue-700 text-sm mb-3">
          Inicia sesión para pagar con tus tarjetas registradas
        </p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
          Iniciar Sesión
        </button>
      </div>
    );
  }

  // Iframe 3DS
  if (show3DSIframe) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="flex justify-between items-center p-4 border-b bg-[#2A3190] text-white">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FaLock />
              Verificación de Seguridad
            </h2>
            <button
              onClick={close3DSIframe}
              className="text-white hover:text-gray-200 text-xl"
            >
              <FaTimes />
            </button>
          </div>

          <div className="p-4">
            <div 
              id="bancard-3ds-container" 
              className="w-full"
              style={{ 
                minHeight: '400px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px'
              }}
            >
              <div className="p-4 text-center text-gray-500">
                <FaSpinner className="animate-spin text-2xl mx-auto mb-2" />
                <p>Cargando verificación de seguridad...</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t text-center">
            <p className="text-xs text-gray-500">
              Verificación requerida por tu banco para mayor seguridad
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Modal de confirmación
  if (showConfirmation && selectedCard) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="p-6">
            <h2 className="text-xl font-bold text-[#2A3190] mb-4">Confirmar Pago</h2>
            
            <div className="mb-4">
              <div className={`${getCardBrandColor(selectedCard.card_brand)} rounded-lg p-4 text-white mb-4`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm opacity-80">Tarjeta</p>
                    <p className="font-semibold">{selectedCard.card_brand}</p>
                  </div>
                </div>
                <p className="text-lg font-mono mt-2">
                  {selectedCard.card_masked_number}
                </p>
                <div className="flex justify-between mt-2">
                  <span className="text-sm">{selectedCard.expiration_date}</span>
                  <span className="text-sm capitalize">{selectedCard.card_type}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total a pagar:</span>
                  <span className="text-xl font-bold text-[#2A3190]">
                    {displayPYGCurrency(totalAmount)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {cartItems.length} producto{cartItems.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setSelectedCard(null);
                }}
                className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPayment}
                disabled={loading}
                className="flex-1 bg-[#2A3190] text-white py-3 rounded-lg hover:bg-[#1e236b] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    Confirmar Pago
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal de selección de tarjetas
  if (showCardSelection) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-bold text-[#2A3190]">Seleccionar Tarjeta</h2>
            <button
              onClick={() => setShowCardSelection(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              <FaTimes />
            </button>
          </div>

          <div className="p-4">
            <div className="mb-4 bg-blue-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Total a pagar:</span>
                <span className="font-bold text-xl text-[#2A3190]">
                  {displayPYGCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {loadingCards ? (
              <div className="text-center py-8">
                <FaSpinner className="animate-spin text-3xl text-[#2A3190] mx-auto mb-4" />
                <p className="text-gray-600">Cargando tus tarjetas...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-8">
                <FaCreditCard className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No tienes tarjetas registradas</h3>
                <p className="text-gray-500 mb-4">Registra una tarjeta para pagos más rápidos</p>
                <button
                  onClick={() => {
                    setShowCardSelection(false);
                    onRegisterNewCard();
                  }}
                  className="bg-[#2A3190] text-white px-6 py-3 rounded-lg hover:bg-[#1e236b] transition-colors flex items-center gap-2 mx-auto"
                >
                  <FaPlus />
                  Registrar Tarjeta
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map((card, index) => (
                  <button
                    key={index}
                    onClick={() => handleCardSelection(card)}
                    disabled={loading}
                    className="w-full text-left hover:bg-gray-50 p-3 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
                  >
                    <div className={`${getCardBrandColor(card.card_brand)} rounded-lg p-4 text-white`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm opacity-80">Tarjeta</p>
                          <p className="font-semibold">{card.card_brand}</p>
                        </div>
                        {card.bancard_proccessed && (
                          <span className="bg-green-500 text-xs px-2 py-1 rounded-full">
                            Bancard
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-mono mt-2">
                        {card.card_masked_number}
                      </p>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm">{card.expiration_date}</span>
                        <span className="text-sm capitalize">{card.card_type}</span>
                      </div>
                    </div>
                  </button>
                ))}
                
                <button
                  onClick={() => {
                    setShowCardSelection(false);
                    onRegisterNewCard();
                  }}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#2A3190] hover:text-[#2A3190] transition-colors flex items-center justify-center gap-2"
                >
                  <FaPlus />
                  Registrar Nueva Tarjeta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Botón principal
  return (
    <div className="space-y-3">
      {/* Botón de pago rápido */}
      <button
        onClick={() => setShowCardSelection(true)}
        disabled={disabled || cartItems.length === 0 || totalAmount <= 0 || loading}
        className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition-all duration-300 flex items-center justify-center gap-3 font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FaCreditCard className="text-xl" />
        <span>Pago Rápido con Mis Tarjetas</span>
        <span className="text-sm font-normal">
          ({displayPYGCurrency(totalAmount)})
        </span>
      </button>

      {/* Información sobre pago rápido */}
      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
        <div className="flex items-center justify-center gap-2 text-green-800 mb-2">
          <FaLock className="text-sm" />
          <span className="font-semibold text-sm">Pago Rápido y Seguro</span>
        </div>
        <div className="text-xs text-green-700 space-y-1 text-center">
          <div>✓ Un solo clic para pagar</div>
          <div>✓ Tus tarjetas están seguras</div>
          <div>✓ Procesamiento instantáneo</div>
        </div>
      </div>

      {/* Resumen de tarjetas disponibles */}
      {!loadingCards && cards.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          <FaCreditCard className="inline mr-1" />
          {cards.length} tarjeta{cards.length !== 1 ? 's' : ''} registrada{cards.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default QuickPayWithCard;