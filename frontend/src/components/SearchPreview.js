import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GrSearch } from 'react-icons/gr';
import { FaArrowRight, FaTimes, FaShoppingCart } from 'react-icons/fa';
import { BiCategoryAlt } from 'react-icons/bi';
import SummaryApi from '../common';
import displayPYGCurrency from '../helpers/displayCurrency';
import { productPath } from '../helpers/productPath';
import { getSearchMemory, rememberProduct, rememberQuery } from '../helpers/searchMemory';
import addToCart from '../helpers/addToCart';
import Context from '../context';
import { useContext } from 'react';
import { trackSearch } from './MetaPixelTracker';

const SearchPreview = ({ 
  searchTerm, 
  onSearchChange, 
  isVisible, 
  onClose,
  className = "" 
}) => {
  const navigate = useNavigate();
  const { fetchUserAddToCart } = useContext(Context);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [memoryQueries, setMemoryQueries] = useState(() => getSearchMemory().queries);
  const [memoryProducts, setMemoryProducts] = useState(() => getSearchMemory().products);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const dropdownRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // Función para calcular descuento - MEMOIZADA
  const calculateDiscount = useCallback((originalPrice, sellingPrice) => {
    if (!originalPrice || !sellingPrice) return 0;
    const discount = ((originalPrice - sellingPrice) / originalPrice) * 100;
    return Math.round(discount);
  }, []);

  const trimmedSearchTerm = String(searchTerm || '').trim();
  const memoryMode = trimmedSearchTerm.length < 2;

  // Búsqueda con debounce
  useEffect(() => {
    if (memoryMode) return undefined;
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (trimmedSearchTerm.length >= 2) {
      debounceTimeoutRef.current = setTimeout(async () => {
        await performSearch(trimmedSearchTerm);
      }, 150);
    } else {
      setSearchResults([]);
      setShowPreview(false);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm, memoryMode, trimmedSearchTerm]);

  useEffect(() => {
    if (!memoryMode || !isVisible) return undefined;
    const memory = getSearchMemory();
    setMemoryQueries(memory.queries);
    const lastQuery = memory.queries[0]?.q || '';
    const opened = memory.products || [];
    if (!lastQuery && opened.length === 0) {
      setMemoryProducts([]);
      setMemoryLoading(false);
      return undefined;
    }

    let cancelled = false;
    setMemoryLoading(Boolean(lastQuery));
    (async () => {
      let fromQuery = [];
      if (lastQuery) {
        try {
          const response = await fetch(`${SummaryApi.searchProduct.url}?q=${encodeURIComponent(lastQuery)}&limit=6`);
          const dataResponse = await response.json();
          fromQuery = dataResponse?.data || [];
        } catch {
          fromQuery = [];
        }
      }
      const seen = new Set();
      const merged = [];
      for (const product of [...opened, ...fromQuery]) {
        const id = String(product?._id || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(product);
      }
      if (!cancelled) {
        setMemoryProducts(merged.slice(0, 6));
        setMemoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [memoryMode, isVisible]);

  // Mostrar preview cuando hay resultados
  useEffect(() => {
    if (memoryMode) return;
    setShowPreview(searchResults.length > 0 && trimmedSearchTerm.length >= 2);
  }, [searchResults, searchTerm, memoryMode, trimmedSearchTerm]);

  const performSearch = useCallback(async (query) => {
    setLoading(true);
    try {
      // Optimización: usar AbortController para cancelar requests previos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5s
      
             const response = await fetch(`${SummaryApi.searchProduct.url}?q=${encodeURIComponent(query)}&limit=6`, {
               signal: controller.signal,
             });
      clearTimeout(timeoutId);
      
      const dataResponse = await response.json();
      
      // Ya limitamos en la query, no necesitamos slice
      setSearchResults(dataResponse?.data || []);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setSearchResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleProductClick = useCallback((product) => {
    rememberProduct(product, trimmedSearchTerm || memoryQueries[0]?.q || '');
    setShowPreview(false);
    onSearchChange('');
    onClose();
    
    if (trimmedSearchTerm) trackSearch(trimmedSearchTerm);
    navigate(productPath(product));
  }, [onSearchChange, onClose, navigate, trimmedSearchTerm, memoryQueries]);

  const handleCategoryClick = useCallback((category) => {
    // Cerrar preview
    setShowPreview(false);
    onSearchChange('');
    onClose();
    
    // Navegar al menú de categorías
    navigate(`/categoria-producto?category=${encodeURIComponent(category)}`);
  }, [onSearchChange, onClose, navigate]);

  const handleViewAllResults = useCallback(() => {
    const query = memoryMode ? (memoryQueries[0]?.q || '') : trimmedSearchTerm;
    if (query) rememberQuery(query);
    setShowPreview(false);
    onClose();
    if (!query) return;
    trackSearch(query);
    navigate(`/buscar?q=${encodeURIComponent(query)}`);
  }, [onClose, trimmedSearchTerm, navigate, memoryMode, memoryQueries]);

  const handleRememberedQuery = useCallback((query) => {
    rememberQuery(query);
    onSearchChange(query);
  }, [onSearchChange]);

  const handleAddToCart = useCallback(async (e, product) => {
    e.stopPropagation(); // Evitar que se ejecute handleProductClick
    e.preventDefault();
    addToCart(e, product);
    fetchUserAddToCart();
  }, [fetchUserAddToCart]);

  // Cerrar preview al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setShowPreview(false);
          if (memoryMode) onClose();
        }
    };

    if (showPreview || memoryMode) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPreview, memoryMode, onClose]);

  const lastRememberedQuery = memoryQueries[0]?.q || '';
  const visibleProducts = memoryMode ? memoryProducts : searchResults;
  const busy = memoryMode ? memoryLoading : loading;

  if (!isVisible) return null;
  if (memoryMode) {
    if (!memoryQueries.length && !memoryProducts.length && !memoryLoading) return null;
  } else if (!showPreview && !loading) {
    return null;
  }

  // Obtener categorías únicas de los resultados
  const uniqueCategories = memoryMode
    ? []
    : [...new Set(searchResults.map(product => product.category).filter(Boolean))].slice(0, 3);

  return (
    <div 
      ref={dropdownRef}
      className={`absolute top-full left-0 right-0 z-50 bg-white rounded-xl shadow-2xl mt-2 overflow-hidden border border-gray-100 max-h-[70vh] ${className}`}
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* Header del preview */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
        <div className="flex items-center">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 mr-3">
            <GrSearch className="text-white text-lg" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {busy
                ? 'Buscando...'
                : memoryMode
                  ? (lastRememberedQuery ? `Para vos: ${lastRememberedQuery}` : 'Lo último que viste')
                  : `Resultados para "${searchTerm}"`}
            </h3>
            <p className="text-sm text-gray-600">
              {memoryMode
                ? 'Guardado en este teléfono'
                : `${searchResults.length} productos encontrados`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPreview(false)}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
        >
          <FaTimes className="text-lg" />
        </button>
      </div>

      {/* Contenido del preview */}
      <div className="max-h-96 overflow-y-auto">
        {busy ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 font-medium">Buscando productos...</span>
          </div>
        ) : visibleProducts.length > 0 ? (
          <>
            {memoryMode && memoryQueries.length > 0 && (
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <BiCategoryAlt className="mr-2 text-blue-600" />
                  Tus búsquedas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {memoryQueries.slice(0, 6).map((item) => (
                    <button
                      key={item.q}
                      onClick={() => handleRememberedQuery(item.q)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 shadow-sm"
                    >
                      {item.q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Categorías sugeridas */}
            {uniqueCategories.length > 0 && (
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <BiCategoryAlt className="mr-2 text-blue-600" />
                  Categorías relacionadas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {uniqueCategories.map((category, index) => (
                    <button
                      key={index}
                      onClick={() => handleCategoryClick(category)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 shadow-sm"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de productos */}
            <div className="p-2">
              {visibleProducts.slice(0, 6).map((product) => {
                const discount = calculateDiscount(product?.price, product?.sellingPrice);
                
                return (
                  <div
                    key={product._id}
                    onClick={() => handleProductClick(product)}
                    className="group flex items-center p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0 rounded-lg mx-2 my-1"
                  >
                    {/* Imagen del producto */}
                    <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 mr-4 group-hover:shadow-lg transition-shadow duration-200">
                      {product?.productImage?.[0] ? (
                        <img
                          src={product.productImage[0]}
                          alt={product.productName}
                               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                               loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <GrSearch className="text-gray-400 text-xl" />
                        </div>
                      )}
                    </div>

                    {/* Información del producto */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                        {product.productName}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">
                        {product.brandName} • {product.category}
                      </p>
                      <div className="flex items-center mt-2">
                        <span className="text-lg font-bold text-green-600">
                          {displayPYGCurrency(product.sellingPrice)}
                        </span>
                        {discount > 0 && (
                          <span className="ml-3 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
                            -{discount}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botón de carrito y flecha */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleAddToCart(e, product)}
                        className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <FaShoppingCart className="text-sm" />
                      </button>
                      <FaArrowRight className="text-gray-400 text-sm group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón para ver todos los resultados */}
            {(memoryMode ? Boolean(lastRememberedQuery) : searchResults.length >= 6) && (
              <div className="p-4 border-t border-gray-100" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
                <button
                  onClick={handleViewAllResults}
                  className="w-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition-all duration-200"
                >
                  {memoryMode ? `Ver ${lastRememberedQuery}` : `Ver todos los resultados (${searchResults.length}+)`}
                  <FaArrowRight className="ml-2" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GrSearch className="text-2xl text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">No se encontraron productos</h3>
            <p className="text-sm">Intenta con otros términos de búsqueda</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPreview;
