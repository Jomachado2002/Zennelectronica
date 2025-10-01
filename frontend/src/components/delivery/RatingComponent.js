// frontend/src/components/delivery/RatingComponent.js
import React, { useState } from 'react';
import { FaStar, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import StatusBadge from '../common/StatusBadge';


const RatingComponent = ({ transaction, onClose, onRated }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Por favor selecciona una calificación');
      return;
    }

    setLoading(true);

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
        onRated && onRated();
        onClose();
      } else {
        toast.error(result.message || 'Error al enviar calificación');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-[#2A3190]">⭐ Califica tu Pedido</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div className="p-6">
          {/* Info del Pedido */}
         <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-green-900">📦 Pedido #{transaction.shop_process_id}</h3>
                <StatusBadge transaction={transaction} size="xs" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-green-700 font-medium">Total:</span>
                    <p className="font-bold text-green-900">
                        {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(transaction.amount)}
                    </p>
                </div>
                <div>
                    <span className="text-green-700 font-medium">Productos:</span>
                    <p className="font-bold text-green-900">{transaction.items?.length || 0} item(s)</p>
                </div>
            </div>
            <div className="mt-3 text-xs text-green-600">
                ✅ Pedido entregado exitosamente
            </div>
        </div>

          <form onSubmit={handleSubmit}>
            {/* Rating con Estrellas */}
            <div className="text-center mb-6">
              <p className="text-gray-700 mb-4">¿Cómo fue tu experiencia?</p>
              
              <div className="flex justify-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="text-3xl transition-all duration-200 hover:scale-110"
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
              
              <p className={`text-sm font-medium ${
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
                Comentarios (opcional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Cuéntanos sobre tu experiencia..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2A3190] focus:border-[#2A3190] resize-none"
                rows="3"
                maxLength="500"
              />
              <div className="text-xs text-gray-500 mt-1">
                {feedback.length}/500 caracteres
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || rating === 0}
                className="flex-1 px-4 py-2 bg-[#2A3190] text-white rounded-lg hover:bg-[#1e236b] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <FaSpinner className="animate-spin" /> : '⭐'}
                {loading ? 'Enviando...' : 'Calificar'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 rounded-b-xl">
          <p className="text-xs text-gray-600 text-center">
            Tu calificación nos ayuda a mejorar nuestro servicio
          </p>
        </div>
      </div>
    </div>
  );
};

export default RatingComponent;