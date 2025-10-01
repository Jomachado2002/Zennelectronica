// frontend/src/components/InfiniteCarousel.js - CARRUSEL INFINITO OPTIMIZADO
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaAngleLeft, FaAngleRight, FaShoppingCart } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import displayPYGCurrency from '../../helpers/displayCurrency';
import addToCart from '../../helpers/addToCart';
import scrollTop from '../../helpers/scrollTop';

const InfiniteCarousel = ({ 
  products = [], 
  visibleCount = 6, 
  totalLoaded = 20,
  category,
  subcategory,
  heading,
  size = 'large' // 'large' para notebooks, 'small' para mouse/teclado
}) => {
  // ✅ ESTADOS DEL CARRUSEL
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayProducts, setDisplayProducts] = useState([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [hoveredProductId, setHoveredProductId] = useState(null);
  const intervalRef = useRef(null);

  // ✅ CONFIGURACIÓN SEGÚN TAMAÑO
  const config = {
    large: {
      cardWidth: 'w-[200px] sm:w-[220px]',
      cardHeight: 'h-[300px]',
      autoPlaySpeed: 4000, // 4 segundos
      gap: 'gap-4'
    },
    small: {
      cardWidth: 'w-[160px] sm:w-[180px]',
      cardHeight: 'h-[260px]',
      autoPlaySpeed: 3000, // 3 segundos
      gap: 'gap-3'
    }
  };

  const currentConfig = config[size];

  // ✅ LIMITAR PRODUCTOS SEGÚN CONFIGURACIÓN
  const limitedProducts = products.slice(0, totalLoaded);

  // ✅ CREAR ARRAY CIRCULAR PARA MOSTRAR
  useEffect(() => {
    if (limitedProducts.length === 0) {
      setDisplayProducts([]);
      return;
    }

    // Si tenemos menos productos que los visibles, repetir el array
    if (limitedProducts.length < visibleCount) {
      const repeated = [];
      while (repeated.length < visibleCount) {
        repeated.push(...limitedProducts);
      }
      setDisplayProducts(repeated.slice(0, visibleCount));
    } else {
      // Crear array circular para navegación infinita
      const circular = [];
      for (let i = 0; i < visibleCount; i++) {
        const index = (currentIndex + i) % limitedProducts.length;
        circular.push(limitedProducts[index]);
      }
      setDisplayProducts(circular);
    }
  }, [limitedProducts, currentIndex, visibleCount]);

  // ✅ AUTO-PLAY FUNCIONALIDAD
  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      if (isAutoPlaying && limitedProducts.length > visibleCount) {
        setCurrentIndex(prev => (prev + 1) % limitedProducts.length);
      }
    }, currentConfig.autoPlaySpeed);
  }, [isAutoPlaying, limitedProducts.length, visibleCount, currentConfig.autoPlaySpeed]);

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ✅ EFECTOS PARA AUTO-PLAY
  useEffect(() => {
    if (isAutoPlaying && limitedProducts.length > visibleCount) {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }

    return () => stopAutoPlay();
  }, [startAutoPlay, stopAutoPlay, isAutoPlaying, limitedProducts.length, visibleCount]);

  // ✅ NAVEGACIÓN MANUAL
  const goToNext = () => {
    if (limitedProducts.length > visibleCount) {
      setCurrentIndex(prev => (prev + 1) % limitedProducts.length);
    }
  };

  const goToPrev = () => {
    if (limitedProducts.length > visibleCount) {
      setCurrentIndex(prev => (prev - 1 + limitedProducts.length) % limitedProducts.length);
    }
  };

  // ✅ HANDLERS DE INTERACCIÓN
  const handleMouseEnter = () => {
    setIsAutoPlaying(false);
    stopAutoPlay();
  };

  const handleMouseLeave = () => {
    setIsAutoPlaying(true);
  };

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(e, product);
    
    // Actualizar contador si existe la función global
    if (window.fetchUserAddToCart) {
      window.fetchUserAddToCart();
    }
  };

  // ✅ CALCULAR DESCUENTO
  const calculateDiscount = (price, sellingPrice) => {
    if (price && price > 0) {
      const discount = Math.round(((price - sellingPrice) / price) * 100);
      return discount > 0 ? discount : null;
    }
    return null;
  };

  // Si no hay productos, no renderizar nada
  if (limitedProducts.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* ✅ HEADER CON TÍTULO Y ENLACE */}
      {heading && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">{heading}</h2>
            <div className="h-1 w-20 bg-[#002060] mt-2 rounded-full"></div>
            <p className="text-sm text-gray-600 mt-2">
              Mostrando {Math.min(visibleCount, limitedProducts.length)} de {limitedProducts.length} productos
            </p>
          </div>
          
          {category && (
            <Link 
              to={`/categoria-producto?category=${category}${subcategory ? `&subcategory=${subcategory}` : ''}`}
              className="text-[#002060] hover:text-[#003399] text-sm font-semibold transition-colors flex items-center"
              onClick={scrollTop}
            >
              Ver todos <FaAngleRight className="ml-1 transition-transform hover:translate-x-1" />
            </Link>
          )}
        </div>
      )}

      {/* ✅ CARRUSEL PRINCIPAL */}
      <div 
        className="relative group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Botones de navegación */}
        {limitedProducts.length > visibleCount && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 
                        bg-white shadow-lg rounded-full p-3 hover:bg-blue-50 
                        transition-all duration-300 -translate-x-2
                        opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
              aria-label="Anterior"
            >
              <FaAngleLeft className="text-[#002060]" />
            </button>
            
            <button
              onClick={goToNext}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 
                        bg-white shadow-lg rounded-full p-3 hover:bg-blue-50 
                        transition-all duration-300 translate-x-2
                        opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
              aria-label="Siguiente"
            >
              <FaAngleRight className="text-[#002060]" />
            </button>
          </>
        )}

        {/* ✅ CONTENEDOR DE PRODUCTOS */}
        <div className={`flex ${currentConfig.gap} overflow-hidden py-4`}>
          {displayProducts.map((product, index) => {
            const discount = calculateDiscount(product?.price, product?.sellingPrice);
            const isHovered = hoveredProductId === product?._id;
            const secondImage = product.productImage?.[1];
            const showSecondImage = isHovered && secondImage;

            return (
              <Link
                key={`${product._id}-${currentIndex}-${index}`}
                to={`/producto/${product?.slug || product?._id}`}
                className={`${currentConfig.cardWidth} ${currentConfig.cardHeight} 
                          flex-shrink-0 bg-white rounded-lg shadow-sm border 
                          hover:shadow-md transition-all duration-200 flex flex-col
                          group/card relative`}
                onClick={scrollTop}
                onMouseEnter={() => setHoveredProductId(product?._id)}
                onMouseLeave={() => setHoveredProductId(null)}
              >
                {/* Imagen del producto */}
                <div className="h-32 sm:h-36 rounded-t-lg flex items-center justify-center overflow-hidden relative bg-gray-50">
                  {/* Imagen principal */}
                  <img
                    src={product.productImage[0]}
                    alt={product.productName}
                    className={`object-contain h-full w-full transition-all duration-500 ease-in-out ${
                      showSecondImage ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    }`}
                    loading="lazy"
                  />
                  
                  {/* Imagen de hover */}
                  {secondImage && (
                    <img
                      src={secondImage}
                      alt={product.productName}
                      className={`absolute inset-0 object-contain h-full w-full transition-all duration-500 ease-in-out ${
                        showSecondImage ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                      }`}
                      loading="lazy"
                    />
                  )}

                  {/* Badge de descuento */}
                  {discount && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                        -{discount}% OFF
                      </span>
                    </div>
                  )}
                </div>

                {/* Detalles del producto */}
                <div className="p-2.5 flex flex-col flex-grow">
                  {/* Contenido superior */}
                  <div className="flex-grow space-y-1.5">
                    <h3 className="font-medium text-xs text-gray-600 leading-tight line-clamp-3 min-h-[2.8rem]">
                      {product?.productName}
                    </h3>
                    
                    <div className="text-xs text-gray-500 uppercase font-medium tracking-wide">
                      {product?.subcategory || product?.brandName}
                    </div>
                  </div>
                  
                  {/* Contenido inferior fijo */}
                  <div className="mt-auto space-y-2">
                    <div className="space-y-0.5 text-center">
                      <div className="text-lg font-bold text-black">
                        {displayPYGCurrency(product?.sellingPrice)}
                      </div>
                      {product?.price > 0 && product?.price > product?.sellingPrice && (
                        <div className="text-xs text-gray-400 line-through">
                          {displayPYGCurrency(product?.price)}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      className="w-full flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 
                                text-white px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      <FaShoppingCart size={11} /> Agregar
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ✅ INDICADORES DE POSICIÓN */}
        {limitedProducts.length > visibleCount && (
          <div className="flex justify-center mt-4 space-x-2">
            {Array.from({ length: Math.min(limitedProducts.length, 8) }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex % 8 
                    ? 'bg-[#002060] w-6' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Ir a posición ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InfiniteCarousel;