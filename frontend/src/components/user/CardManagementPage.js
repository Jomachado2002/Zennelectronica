// frontend/src/components/user/CardManagementPage.js - VERSIÓN MEJORADA
import React, { useState, useEffect } from 'react';
import { 
  FaCreditCard, 
  FaPlus, 
  FaTrash, 
  FaShieldAlt,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaHistory
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const CardManagementPage = ({ 
  user, 
  onRegisterCard, 
  onDeleteCard, 
  onFetchCards 
}) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registeringCard, setRegisteringCard] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const [processId, setProcessId] = useState('');
  const [errors, setErrors] = useState({});
  const [showTestPayment, setShowTestPayment] = useState(false);
  const [testAmount, setTestAmount] = useState('10000');
  const [selectedCardForTest, setSelectedCardForTest] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);


  // ✅ CARGAR TARJETAS AL MONTAR EL COMPONENTE
  useEffect(() => {
    
    if (user?.id) {
      fetchUserCards();
    }
}, [user?.id]);

  const fetchUserCards = async () => {
    setLoading(true);
    setErrors({});
    try {
      
      const userCards = await onFetchCards(user.id);
      
      setCards(userCards || []);
    } catch (error) {
      console.error('❌ Error al cargar tarjetas:', error);
      setErrors({ fetch: 'Error al cargar las tarjetas. Intenta nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN PRINCIPAL DE CATASTRO
  const handleRegisterCard = async () => {
    if (!user?.id) {
      setErrors({ register: 'Usuario no válido' });
      return;
    }

    setRegisteringCard(true);
    setErrors({});
    
    try {
      
      
      const cardId = Date.now() + Math.floor(Math.random() * 1000);
      
      const cardData = {
        card_id: cardId,
        user_id: user.id,
        user_cell_phone: user.phone || '12345678',
        user_mail: user.email,
        return_url: `${window.location.origin}/mi-perfil?tab=cards&status=registered`
      };

      

      const result = await onRegisterCard(cardData);
      

      if (result.success && result.data?.process_id) {
        const receivedProcessId = result.data.process_id;
        
        
        setProcessId(receivedProcessId);
        setShowRegisterForm(false);
        setShowIframe(true);
        
        setTimeout(() => {
          loadBancardScript(receivedProcessId);
        }, 300);
        
      } else {
        console.error('❌ Error en catastro:', result);
        setErrors({ register: result.message || 'Error al iniciar registro' });
      }
    } catch (error) {
      console.error('❌ Error al registrar tarjeta:', error);
      setErrors({ register: 'Error al registrar tarjeta. Intenta nuevamente.' });
    } finally {
      setRegisteringCard(false);
    }
  };

  // ✅ FUNCIÓN PARA CARGAR SCRIPT DE BANCARD
  const loadBancardScript = (processIdToUse) => {
    
    
    if (!processIdToUse || processIdToUse.trim() === '') {
      console.error('❌ ProcessId inválido:', processIdToUse);
      setErrors({ iframe: 'Error: Process ID inválido' });
      return;
    }
    
    const existingScript = document.getElementById('bancard-script');
    if (existingScript) {
      existingScript.remove();
    }

    const environment = process.env.REACT_APP_BANCARD_ENVIRONMENT || 'staging';
    const baseUrl = environment === 'production' 
      ? 'https://vpos.infonet.com.py' 
      : 'https://vpos.infonet.com.py:8888';

    const script = document.createElement('script');
    script.id = 'bancard-script';
    script.src = `${baseUrl}/checkout/javascript/dist/bancard-checkout-4.0.0.js`;
    script.async = true;
    
    script.onload = () => {
      
      setTimeout(() => {
        initializeBancardIframe(processIdToUse);
      }, 300);
    };
    
    script.onerror = () => {
      console.error('❌ Error cargando script de Bancard');
      setShowIframe(false);
      setRegisteringCard(false);
      setErrors({ iframe: 'Error cargando el sistema de registro. Intenta nuevamente.' });
    };

    document.head.appendChild(script);
  };

  // ✅ FUNCIÓN PARA INICIALIZAR IFRAME
  const initializeBancardIframe = (processIdToUse) => {
    // ✅ VERIFICAR QUE EL CONTENEDOR EXISTE ANTES DE CONTINUAR
      const container = document.getElementById('bancard-card-container');
      if (!container) {
        console.error('❌ Contenedor bancard-card-container no encontrado');
        setErrors({ iframe: 'Error: Contenedor no encontrado' });
        return;
      }
    try {
      
      
      if (!processIdToUse || processIdToUse.trim() === '') {
        console.error('❌ ProcessId vacío en inicialización:', processIdToUse);
        setErrors({ iframe: 'Error: Process ID no válido' });
        return;
      }
      
      if (window.Bancard && window.Bancard.Cards) {
        const styles = {
          'input-background-color': '#ffffff',
          'input-text-color': '#555555',
          'input-border-color': '#cccccc',
          'button-background-color': '#2A3190',
          'button-text-color': '#ffffff',
          'button-border-color': '#2A3190',
          'form-background-color': '#ffffff'
        };

        const container = document.getElementById('bancard-card-container');
        if (container) {
          container.innerHTML = '';
          container.style.display = 'block';
          container.style.minHeight = '500px';
          container.style.width = '100%';
          
          try {
            
            window.Bancard.Cards.createForm('bancard-card-container', String(processIdToUse), styles);
            
            
            window.addEventListener('message', handleIframeMessage, false);
            
          } catch (iframeError) {
            console.error('❌ Error creando iframe específico:', iframeError);
            setErrors({ iframe: `Error al cargar formulario: ${iframeError.message}` });
          }
        } else {
          console.error('❌ Contenedor no encontrado');
          setErrors({ iframe: 'Error: Contenedor no encontrado' });
        }
      } else {
        
        if (window.Bancard) {
          
        }
        setTimeout(() => initializeBancardIframe(processIdToUse), 500);
      }
    } catch (error) {
      console.error('❌ Error general inicializando iframe:', error);
      setErrors({ iframe: `Error al inicializar: ${error.message}` });
    }
  };

  const handleDeleteCard = async (aliasToken) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta tarjeta?')) {
      return;
    }

    setErrors({});
    try {
      
      const result = await onDeleteCard(user.id, aliasToken);
      if (result.success) {
        
        await fetchUserCards();
        toast.success('Tarjeta eliminada exitosamente');
      } else {
        setErrors({ delete: result.message || 'Error al eliminar tarjeta' });
      }
    } catch (error) {
      console.error('❌ Error al eliminar tarjeta:', error);
      setErrors({ delete: 'Error al eliminar tarjeta. Intenta nuevamente.' });
    }
  };

  // ✅ MANEJAR MENSAJES DEL IFRAME
  const handleIframeMessage = (event) => {
    try {
      
      
      if (typeof event.data === 'object' && event.data.status) {
        if (event.data.status === 'add_new_card_success') {
          
          toast.success('¡Tarjeta registrada exitosamente!');
          setTimeout(() => {
            closeIframe();
            fetchUserCards();
          }, 2000);
        } else if (event.data.status === 'add_new_card_fail') {
          
          setErrors({ iframe: event.data.description || 'Error al catastrar tarjeta' });
          toast.error('Error al registrar tarjeta');
        }
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje del iframe:', error);
    }
  };

  const closeIframe = () => {
    setShowIframe(false);
    setProcessId('');
    
    const script = document.getElementById('bancard-script');
    if (script) {
      script.remove();
    }
    
    window.removeEventListener('message', handleIframeMessage, false);
  };

  // ✅ FUNCIÓN PARA PROBAR PAGO CON TARJETA GUARDADA
  const handleTestPayment = async () => {
    if (!selectedCardForTest) {
      toast.error('Selecciona una tarjeta para probar');
      return;
    }

    try {
      const paymentData = {
        shop_process_id: Date.now(),
        amount: parseFloat(testAmount).toFixed(2),
        currency: 'PYG',
        alias_token: selectedCardForTest.alias_token,
        description: `Pago de prueba Zenn - ${testAmount} PYG`,
        customer_info: {
          name: user.name,
          email: user.email,
          phone: user.phone
        }
      };

      
      toast.info('Procesando pago de prueba...');

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/pago-con-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();
      
      if (result.success) {
        if (result.requires3DS) {
          toast.info('🔐 Verificación 3DS requerida - esto es normal');
          
        } else {
          toast.success('✅ Pago de prueba exitoso');
          
        }
        setShowTestPayment(false);
      } else {
        toast.error(result.message || 'Error en pago de prueba');
        console.error('Error en pago:', result);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión en pago de prueba');
    }
  };

  const getCardBrandColor = (brand) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return 'bg-gradient-to-r from-blue-600 to-blue-700';
      case 'mastercard':
        return 'bg-gradient-to-r from-red-600 to-red-700';
      case 'american express':
        return 'bg-gradient-to-r from-green-600 to-green-700';
      case 'bancard':
        return 'bg-gradient-to-r from-purple-600 to-purple-700';
      default:
        return 'bg-gradient-to-r from-gray-600 to-gray-700';
    }
  };

  const formatCardNumber = (cardNumber) => {
    if (!cardNumber) return '**** **** **** ****';
    return cardNumber.replace(/(.{4})/g, '$1 ').trim();
  };

  // ✅ MOSTRAR IFRAME DE CATASTRO
  if (showIframe) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b bg-[#2A3190] text-white">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FaShieldAlt />
              Registrar Nueva Tarjeta - Bancard
            </h2>
            <button
              onClick={closeIframe}
              className="text-white hover:text-gray-200 text-xl transition-colors"
            >
              ×
            </button>
          </div>

          <div className="p-4 bg-blue-50 border-b">
            <div className="flex items-center gap-3">
              <FaUser className="text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">{user?.name}</p>
                <p className="text-sm text-blue-600">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div 
              id="bancard-card-container" 
              className="w-full border border-gray-200 rounded-lg"
              style={{ 
                minHeight: '500px',
                width: '100%',
                backgroundColor: '#ffffff'
              }}
            >
              <div className="p-4 text-center text-gray-500">
                <FaSpinner className="animate-spin text-2xl mx-auto mb-2" />
                <p>Cargando formulario de registro...</p>
                <p className="text-sm mt-2">
                  Completa los datos de tu tarjeta de forma segura
                </p>
              </div>
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="font-medium text-yellow-800 mb-2">📝 Datos de prueba para testing:</h4>
              <ul className="text-yellow-700 text-sm space-y-1 text-left">
                <li>• <strong>Cédula válida Visa/MasterCard:</strong> 6587520</li>
                <li>• <strong>Cédula válida Bancard:</strong> 9661000</li>
                <li>• Completa los demás campos con datos reales de tu tarjeta</li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
              <FaShieldAlt />
              <span className="text-sm font-medium">Conexión segura SSL</span>
            </div>
            <p className="text-xs text-gray-500">
              Tus datos están protegidos por Bancard y nunca se almacenan en nuestros servidores
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Encabezado */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2A3190] flex items-center gap-3">
              <FaCreditCard className="text-xl" />
              Mis Tarjetas Registradas
            </h1>
            <p className="text-gray-600 mt-1">Gestiona tus métodos de pago para compras rápidas y seguras</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowRegisterForm(true)}
              className="flex items-center gap-2 bg-[#2A3190] text-white px-4 py-2 rounded-lg hover:bg-[#1e236b] transition-colors"
            >
              <FaPlus className="text-sm" />
              Registrar Nueva Tarjeta
            </button>
            
            {cards.length > 0 && (
              <button
                onClick={() => setShowTestPayment(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <FaCheckCircle className="text-sm" />
                Probar Pago
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mensajes de error */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <FaExclamationTriangle />
            <span className="font-medium">Errores encontrados:</span>
          </div>
          {Object.values(errors).map((error, index) => (
            <p key={index} className="text-red-700 text-sm">{error}</p>
          ))}
        </div>
      )}

      {/* Modal de confirmación para registrar tarjeta */}
      {showRegisterForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[#2A3190] mb-4">Registrar Nueva Tarjeta</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-blue-800 mb-2">👤 Usuario:</h3>
                <p className="text-blue-700 text-sm mb-1"><strong>Nombre:</strong> {user?.name}</p>
                <p className="text-blue-700 text-sm mb-1"><strong>Email:</strong> {user?.email}</p>
                <p className="text-blue-700 text-sm"><strong>ID Bancard:</strong> {user?.id}</p>
              </div>
              
              <p className="text-gray-600 mb-6">
                Al continuar, se abrirá un formulario seguro de Bancard para registrar tu tarjeta.
                Tus datos estarán protegidos y encriptados.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <FaShieldAlt />
                  <span className="font-medium">Información Importante</span>
                </div>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• Tus datos de tarjeta no se guardan en nuestros servidores</li>
                  <li>• El proceso está certificado por Bancard</li>
                  <li>• Cumplimos con estándares PCI DSS</li>
                  <li>• Máximo 5 tarjetas por usuario</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRegisterForm(false);
                    setErrors({});
                  }}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegisterCard}
                  disabled={registeringCard}
                  className="flex-1 bg-[#2A3190] text-white py-2 rounded-lg hover:bg-[#1e236b] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {registeringCard ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle />
                      Continuar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para probar pago */}
      {showTestPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[#2A3190] mb-4">Probar Pago con Tarjeta</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Selecciona una tarjeta:
                  </label>
                  <div className="space-y-2">
                    {cards.map((card, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedCardForTest(card)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          selectedCardForTest === card 
                            ? 'border-[#2A3190] bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-800">
                              {card.card_brand || 'Tarjeta'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatCardNumber(card.card_masked_number)}
                            </p>
                          </div>
                          {selectedCardForTest === card && (
                            <div className="text-[#2A3190]">
                              <FaCheckCircle />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Monto de prueba (PYG):
                  </label>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3190]"
                    placeholder="10000"
                    min="1000"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ Este es un pago de prueba real. El monto será cargado a tu tarjeta.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowTestPayment(false)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTestPayment}
                  disabled={!selectedCardForTest || !testAmount}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FaLock />
                  Procesar Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de tarjetas */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Tarjetas Registradas</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <FaSpinner className="animate-spin text-3xl text-[#2A3190] mx-auto mb-4" />
            <p className="text-gray-600">Cargando tus tarjetas...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12">
            <FaCreditCard className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No tienes tarjetas registradas</h3>
            <p className="text-gray-500 mb-6">Registra tu primera tarjeta para realizar pagos más rápidos</p>
            <button
              onClick={() => setShowRegisterForm(true)}
              className="bg-[#2A3190] text-white px-6 py-3 rounded-lg hover:bg-[#1e236b] transition-colors flex items-center gap-2 mx-auto"
            >
              <FaPlus />
              Registrar Primera Tarjeta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card, index) => (
              <div key={index} className="relative">
                <div className={`${getCardBrandColor(card.card_brand)} rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm opacity-80">Tarjeta</p>
                      <p className="font-semibold text-lg">{card.card_brand || 'Tarjeta'}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteCard(card.alias_token)}
                      className="text-white/80 hover:text-white p-1 rounded transition-colors bg-black/20 hover:bg-black/40"
                      title="Eliminar tarjeta"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-lg font-mono tracking-wider">
                      {formatCardNumber(card.card_masked_number)}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs opacity-80">Vence</p>
                      <p className="text-sm">{card.expiration_date || '--/--'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs opacity-80">Tipo</p>
                      <p className="text-sm capitalize">{card.card_type || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Botón de acción rápida */}
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <button
                      onClick={() => {
                        setSelectedCardForTest(card);
                        setShowTestPayment(true);
                      }}
                      className="w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Probar pago
                    </button>
                  </div>
                </div>
                
                {card.bancard_proccessed && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    ✓ Bancard
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">💳</span>
          </div>
          <div>
            <h3 className="font-medium text-blue-800 mb-1">Información sobre tus tarjetas</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Las tarjetas registradas te permiten realizar pagos más rápidos en el carrito</li>
              <li>• Tus datos están protegidos con encriptación de nivel bancario</li>
              <li>• Puedes eliminar una tarjeta en cualquier momento</li>
              <li>• Máximo 5 tarjetas por usuario</li>
              <li>• Para testing usa: Cédula 6587520 (Visa/MasterCard) o 9661000 (Bancard)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Estadísticas de uso (si hay tarjetas) */}
      {cards.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaHistory />
            Estadísticas de uso
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{cards.length}</div>
              <div className="text-sm text-green-700">Tarjetas registradas</div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-blue-700">Pagos realizados</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">100%</div>
              <div className="text-sm text-purple-700">Tasa de éxito</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardManagementPage;