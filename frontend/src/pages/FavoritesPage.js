import React, { useState, useEffect } from 'react';
import { FaHeart, FaShoppingCart, FaTrash, FaArrowLeft } from 'react-icons/fa';

const FavoritesPage = ({ user, onNavigate }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga de favoritos desde localStorage
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    try {
      const savedFavorites = localStorage.getItem(`favorites_${user?.id || 'guest'}`);
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (error) {
      console.error('Error cargando favoritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = (productId) => {
    try {
      const updatedFavorites = favorites.filter(fav => fav.id !== productId);
      setFavorites(updatedFavorites);
      localStorage.setItem(`favorites_${user?.id || 'guest'}`, JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('Error removiendo favorito:', error);
    }
  };

  const addToCart = (product) => {
    // Lógica para agregar al carrito
    console.log('Agregando al carrito:', product);
  };

  const displayPYGCurrency = (amount) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-[#2A3190] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando favoritos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#2A3190] flex items-center gap-3">
                <FaHeart className="text-xl text-red-500" />
                Mis Favoritos
              </h1>
              <p className="text-gray-600 mt-1">
                {favorites.length > 0 
                  ? `Tienes ${favorites.length} producto${favorites.length !== 1 ? 's' : ''} en favoritos`
                  : 'No tienes productos en favoritos'
                }
              </p>
            </div>
            
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-[#2A3190] transition-colors"
            >
              <FaArrowLeft className="text-sm" />
              Volver a la tienda
            </button>
          </div>
        </div>

        {/* Lista de favoritos */}
        {favorites.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FaHeart className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-600 mb-2">No tienes favoritos aún</h2>
            <p className="text-gray-500 mb-6">
              Explora nuestros productos y agrega los que más te gusten a favoritos
            </p>
            <button
              onClick={() => onNavigate('/')}
              className="bg-[#2A3190] text-white px-6 py-3 rounded-lg hover:bg-[#1e236b] transition-colors"
            >
              Explorar Productos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                {/* Imagen del producto */}
                <div className="relative h-48 bg-gray-100">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Sin imagen
                    </div>
                  )}
                  
                  {/* Botón de remover favorito */}
                  <button
                    onClick={() => removeFavorite(product.id)}
                    className="absolute top-2 right-2 bg-white text-red-500 p-2 rounded-full shadow-md hover:bg-red-50 transition-colors"
                    title="Remover de favoritos"
                  >
                    <FaTrash className="text-sm" />
                  </button>
                </div>

                {/* Información del producto */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                    {product.name || 'Producto sin nombre'}
                  </h3>
                  
                  <div className="mb-3">
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-sm text-gray-500 line-through block">
                        {displayPYGCurrency(product.originalPrice)}
                      </span>
                    )}
                    <span className="text-lg font-bold text-[#2A3190]">
                      {displayPYGCurrency(product.price || 0)}
                    </span>
                  </div>

                  {product.category && (
                    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full mb-3">
                      {product.category}
                    </span>
                  )}

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToCart(product)}
                      className="flex-1 bg-[#2A3190] text-white py-2 px-3 rounded-lg hover:bg-[#1e236b] transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <FaShoppingCart className="text-xs" />
                      Agregar al carrito
                    </button>
                    
                    <button
                      onClick={() => onNavigate(`/producto/${product.slug || product.id}`)}
                      className="bg-gray-200 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Información adicional */}
        {favorites.length > 0 && (
          <div className="mt-8">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">💡</span>
                </div>
                <div>
                  <h3 className="font-medium text-blue-800 mb-1">Tip sobre favoritos</h3>
                  <p className="text-blue-700 text-sm">
                    Tus productos favoritos se guardan en tu dispositivo. Para mantenerlos sincronizados 
                    en todos tus dispositivos, inicia sesión con tu cuenta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;