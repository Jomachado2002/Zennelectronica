// frontend/src/components/user/CardManagementPage.js - VERSIÓN PREMIUM CON MODAL
import React, { useState, useEffect } from 'react';
import { 
  FaCreditCard, 
  FaPlus, 
  FaTrash, 
  FaShieldAlt,
  FaSpinner,
  FaCheckCircle,
  FaLock
} from 'react-icons/fa';
import { MdSecurity } from 'react-icons/md';
import { toast } from 'react-toastify';
import CardRegistrationModal from '../CardRegistrationModal';

const CardManagementPage = ({ 
  user, 
  onRegisterCard, 
  onDeleteCard, 
  onFetchCards 
}) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState(null);

  // ✅ FUNCIÓN PARA CARGAR TARJETAS (DECLARADA PRIMERO)
  const fetchUserCards = React.useCallback(async () => {
    if (!user?._id && !user?.bancardUserId) {
      return;
    }
    
    setLoading(true);
    try {
      const userId = user.bancardUserId || 'me';
      const userCards = await onFetchCards(userId);
      setCards(userCards || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
      toast.error('Error al cargar tarjetas');
    } finally {
      setLoading(false);
    }
  }, [user, onFetchCards]);

  // ✅ CARGAR TARJETAS AL MONTAR
  useEffect(() => {
    if (user?._id || user?.bancardUserId) {
      fetchUserCards();
    }
  }, [user?._id, user?.bancardUserId, fetchUserCards]);

  // ✅ ESCUCHAR EVENTO DE TARJETA REGISTRADA (DESDE CatastroResult O IFRAME)
  useEffect(() => {
    const handleCardRegistered = (event) => {
      console.log('🔄 Evento de tarjeta registrada recibido, recargando tarjetas...', event.detail);
      // ✅ RECARGAR TARJETAS AUTOMÁTICAMENTE
      setTimeout(() => {
        fetchUserCards();
      }, 1000); // Esperar 1 segundo para que Bancard sincronice
    };

    window.addEventListener('bancard_card_registered', handleCardRegistered);
    
    return () => {
      window.removeEventListener('bancard_card_registered', handleCardRegistered);
    };
  }, [fetchUserCards]);

  // ✅ ELIMINAR TARJETA
  const handleDelete = async (card) => {
    if (!window.confirm(`¿Estás seguro de eliminar la tarjeta ${card.card_masked_number}?`)) {
      return;
    }

    try {
      setDeletingCardId(card.alias_token);
      const userId = user.bancardUserId || 'me';
      const result = await onDeleteCard(userId, card.alias_token);
      
      if (result.success) {
        toast.success('✅ Tarjeta eliminada exitosamente');
        fetchUserCards();
      } else {
        toast.error(result.message || 'Error al eliminar tarjeta');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Error al eliminar tarjeta');
    } finally {
      setDeletingCardId(null);
    }
  };

  // ✅ RENDERIZAR COMPONENTE
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Modal de Registro de Tarjeta */}
      <CardRegistrationModal
        user={user}
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={fetchUserCards}
      />

      {/* Header Premium */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-white bg-opacity-20 backdrop-blur-md rounded-2xl shadow-xl">
              <FaCreditCard className="text-4xl" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">Mis Tarjetas</h1>
              <p className="text-xs md:text-sm text-purple-100 flex items-center gap-2">
                <MdSecurity className="text-base" />
                Gestiona tus métodos de pago
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 bg-white text-purple-600 px-4 md:px-6 py-3 rounded-xl text-sm md:text-base font-bold hover:bg-purple-50 transition-all transform hover:scale-105 shadow-lg"
          >
            <FaPlus />
            Agregar
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-3xl p-16 text-center shadow-xl">
          <FaSpinner className="animate-spin text-6xl text-purple-600 mx-auto mb-6" />
          <p className="text-xl text-gray-600">Cargando tus tarjetas...</p>
        </div>
      )}

      {/* No Cards */}
      {!loading && cards.length === 0 && (
        <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-2 border-dashed border-purple-300 rounded-3xl p-16 text-center shadow-lg">
          <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <FaCreditCard className="text-5xl text-purple-600" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
            No tienes tarjetas guardadas
          </h3>
          <p className="text-sm md:text-base text-gray-600 mb-6 max-w-2xl mx-auto">
            Registra una tarjeta para pagos más rápidos.
          </p>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm md:text-base font-bold hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 flex items-center gap-2 mx-auto shadow-xl"
          >
            <FaPlus />
            Registrar tarjeta
          </button>
        </div>
      )}

      {/* Lista de Tarjetas con Diseño Premium */}
      {!loading && cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 text-white shadow-2xl hover:shadow-3xl transition-all transform hover:-translate-y-3 duration-500 overflow-hidden"
            >
              {/* Background Decorations */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/5 to-transparent rounded-full -ml-16 -mb-16"></div>
              
              {/* Card Content */}
              <div className="relative z-10">
                {/* Chip y Logo */}
                <div className="flex items-center justify-between mb-10">
                  <div className="w-14 h-11 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                    <div className="w-10 h-7 border-2 border-gray-800 rounded-md"></div>
                  </div>
                  <FaCreditCard className="text-4xl text-white/40 group-hover:text-white/60 transition-all" />
                </div>

                {/* Número de Tarjeta */}
                <div className="mb-6">
                  <p className="text-lg md:text-xl font-mono tracking-wider font-bold">
                    {card.card_masked_number || '**** **** **** ****'}
                  </p>
                </div>

                {/* Info de la Tarjeta */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1 uppercase">Card Holder</p>
                    <p className="font-bold text-sm truncate max-w-[150px]">
                      {user.name || 'Usuario'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1 uppercase">Type</p>
                    <p className="font-bold text-lg uppercase">
                      {card.card_brand || 'CARD'}
                    </p>
                  </div>
                </div>

                {/* Botón de Eliminar */}
                <button
                  onClick={() => handleDelete(card)}
                  disabled={deletingCardId === card.alias_token}
                  className="absolute top-4 right-4 p-3 bg-red-500/20 hover:bg-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md disabled:opacity-50"
                  title="Eliminar tarjeta"
                >
                  {deletingCardId === card.alias_token ? (
                    <FaSpinner className="animate-spin text-white" />
                  ) : (
                    <FaTrash className="text-white" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info de Seguridad */}
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200">
        <div className="flex items-start gap-6">
          <div className="p-4 bg-green-100 rounded-2xl shadow-lg">
            <FaShieldAlt className="text-3xl text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Tus tarjetas están protegidas</h3>
            <p className="text-sm text-gray-600 mb-4">
              Tus datos están encriptados con certificación <strong>PCI DSS</strong>. 
              Solo guardamos un token seguro, nunca tu información completa.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4">
                <FaLock className="text-2xl text-green-600" />
                <div>
                  <p className="font-bold text-gray-900 text-sm">SSL 256-bit</p>
                  <p className="text-xs text-gray-600">Encriptación total</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
                <MdSecurity className="text-2xl text-blue-600" />
                <div>
                  <p className="font-bold text-gray-900 text-sm">PCI DSS Level 1</p>
                  <p className="text-xs text-gray-600">Certificado máximo</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-purple-50 rounded-xl p-4">
                <FaCheckCircle className="text-2xl text-purple-600" />
                <div>
                  <p className="font-bold text-gray-900 text-sm">Tokenización</p>
                  <p className="text-xs text-gray-600">Datos seguros</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips de Uso */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
        <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2 text-lg">
          <FaCheckCircle className="text-blue-600" />
          Para registrar tarjetas en Staging (Pruebas)
        </h4>
        <div className="space-y-2 text-blue-800 text-sm">
          <p>• <strong>Cédula para Visa/MasterCard:</strong> 6587520</p>
          <p>• <strong>Cédula para Bancard Prepaga:</strong> 9661000</p>
          <p>• <strong>Número de tarjeta:</strong> Cualquier número válido (ej: 4111 1111 1111 1111)</p>
          <p>• <strong>CVV:</strong> Cualquier 3 dígitos (ej: 123)</p>
          <p>• <strong>Fecha:</strong> Cualquier fecha futura (ej: 12/25)</p>
        </div>
      </div>
    </div>
  );
};

export default CardManagementPage;
