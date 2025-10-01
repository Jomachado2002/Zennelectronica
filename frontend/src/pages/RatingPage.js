// frontend/src/pages/RatingPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaStar, FaSpinner, FaHome } from 'react-icons/fa';
import { toast } from 'react-toastify';

const RatingPage = () => {
  const { shop_process_id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  useEffect(() => {
    fetchTransaction();
  }, [shop_process_id]);

  const fetchTransaction = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/transactions?search=${shop_process_id}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success && result.data.transactions.length > 0) {
        const trans = result.data.transactions[0];
        setTransaction(trans);
        setAlreadyRated(!!trans.customer_satisfaction?.rating);
      } else {
        toast.error('Pedido no encontrado');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar información del pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Por favor selecciona una calificación');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/bancard/transactions/${transaction._id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          rating,
          feedback: feedback.trim()
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('¡Gracias por tu calificación!');
        setAlreadyRated(true);
        setTimeout(() => navigate('/'), 3000);
      } else {
        toast.error(result.message || 'Error al enviar calificación');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = (stars) => {
    switch (stars) {
      case 1: return 'Muy malo';
      case 2: return 'Malo';
      case 3: return 'Regular';
      case 4: return 'Bueno';
      case 5: return 'Excelente';
      default: return 'Selecciona tu calificación';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-[#2A3190] mx-auto mb-4" />
          <p className="text-gray-600">Cargando información del pedido...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">❌ Pedido no encontrado</h1>
          <p className="text-gray-600 mb-6">No pudimos encontrar el pedido que intentas calificar</p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#2A3190] text-white px-6 py-3 rounded-lg hover:bg-[#1e236b] flex items-center gap-2 mx-auto"
          >
            <FaHome /> Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  if (alreadyRated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">✅ ¡Gracias!</h1>
          <p className="text-gray-600 mb-6">Ya has calificado este pedido</p>
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar 
                key={star}
                className={`text-2xl ${
                  star <= (transaction.customer_satisfaction?.rating || 0) 
                    ? 'text-yellow-400' 
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-[#2A3190] text-white px-6 py-3 rounded-lg hover:bg-[#1e236b] flex items-center gap-2 mx-auto"
          >
            <FaHome /> Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2A3190] mb-2">⭐ Califica tu Pedido</h1>
          <p className="text-gray-600">Tu opinión nos ayuda a mejorar</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Info del Pedido */}
          <div className="bg-[#2A3190] text-white p-6">
            <h2 className="text-xl font-bold mb-2">📦 Pedido #{transaction.shop_process_id}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="opacity-80">Cliente:</span>
                <p className="font-medium">{transaction.customer_info?.name}</p>
              </div>
              <div>
                <span className="opacity-80">Total:</span>
                <p className="font-medium">
                  {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(transaction.amount)}
                </p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {/* Rating */}
              <div className="text-center mb-6">
                <p className="text-gray-700 mb-4 font-medium">¿Cómo fue tu experiencia?</p>
                
                <div className="flex justify-center gap-3 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="text-4xl transition-all duration-200 hover:scale-110 focus:outline-none"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <FaStar 
                        className={`${
                          star <= (hoverRating || rating) 
                            ? 'text-yellow-400' 
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                
                <p className={`text-lg font-medium ${
                  rating === 0 ? 'text-gray-500' :
                  rating <= 2 ? 'text-red-600' :
                  rating === 3 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {getRatingText(hoverRating || rating)}
                </p>
              </div>

              {/* Comentarios */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuéntanos más sobre tu experiencia
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="¿Qué tal estuvo el servicio? ¿Algo que podríamos mejorar?"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2A3190] focus:border-[#2A3190] resize-none"
                  rows="4"
                  maxLength="500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {feedback.length}/500 caracteres
                </div>
              </div>

              {/* Botón */}
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="w-full px-6 py-3 bg-[#2A3190] text-white rounded-lg hover:bg-[#1e236b] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium"
              >
                {submitting ? <FaSpinner className="animate-spin" /> : '⭐'}
                {submitting ? 'Enviando calificación...' : 'Enviar Calificación'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-[#2A3190] flex items-center gap-2 mx-auto transition-colors"
          >
            <FaHome /> Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingPage;