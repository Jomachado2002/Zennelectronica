import React, { useRef, useCallback, useMemo } from 'react';
import { FaAngleLeft, FaAngleRight } from 'react-icons/fa';

const OptimizedCarousel = ({ 
  children, 
  showArrows = true, 
  autoScroll = false,
  className = '' 
}) => {
  const scrollRef = useRef(null);
  
  // SCROLL OPTIMIZADO - Sin delays
  const scrollLeft = useCallback(() => {
    if (!scrollRef.current) return;
    
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.8; // 80% del ancho visible
    
    container.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  const scrollRight = useCallback(() => {
    if (!scrollRef.current) return;
    
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  // THROTTLED TOUCH para móvil
  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStart.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEnd.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;
    
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      scrollRight();
    } else if (isRightSwipe) {
      scrollLeft();
    }
    
    touchStart.current = null;
    touchEnd.current = null;
  }, [scrollLeft, scrollRight]);

  // MEMOIZAR BOTONES para evitar re-renders
  const ArrowButtons = useMemo(() => {
    if (!showArrows) return null;
    
    return (
      <>
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 
                     bg-white/90 hover:bg-white shadow-lg rounded-full p-2
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200
                     focus:opacity-100 focus:outline-none hidden sm:block"
          aria-label="Anterior"
        >
          <FaAngleLeft className="text-gray-700 text-lg" />
        </button>
        
        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10
                     bg-white/90 hover:bg-white shadow-lg rounded-full p-2
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200
                     focus:opacity-100 focus:outline-none hidden sm:block"
          aria-label="Siguiente"
        >
          <FaAngleRight className="text-gray-700 text-lg" />
        </button>
      </>
    );
  }, [showArrows, scrollLeft, scrollRight]);

  return (
    <div className={`relative group ${className}`}>
      {ArrowButtons}
      
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth
                   snap-x snap-mandatory touch-pan-x"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

// PRODUCTO CARD ULTRA-OPTIMIZADO
export const ProductCardOptimized = React.memo(({ 
  product, 
  className = '',
  showSecondImage = false 
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (showSecondImage) setIsHovered(true);
  }, [showSecondImage]);

  const handleMouseLeave = useCallback(() => {
    if (showSecondImage) setIsHovered(false);
  }, [showSecondImage]);

  return (
    <div 
      className={`snap-center flex-none bg-white rounded-lg shadow-sm 
                  hover:shadow-md transition-shadow duration-200 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Imagen container */}
      <div className="relative h-32 bg-gray-50 rounded-t-lg overflow-hidden">
        {/* Loading placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        
        {/* Imagen principal */}
        <img
          src={product.productImage[0]}
          alt={product.productName}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          } ${isHovered && product.productImage[1] ? 'opacity-0' : 'opacity-100'}`}
          loading="lazy"
          onLoad={handleImageLoad}
        />
        
        {/* Segunda imagen (hover) */}
        {showSecondImage && product.productImage[1] && (
          <img
            src={product.productImage[1]}
            alt={product.productName}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />
        )}
        
        {/* Badge de descuento */}
        {product.price > product.sellingPrice && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            -{Math.round(((product.price - product.sellingPrice) / product.price) * 100)}%
          </div>
        )}
      </div>
      
      {/* Contenido */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-700 line-clamp-2 h-10 mb-2">
          {product.productName}
        </h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-blue-600">
              ₲ {product.sellingPrice?.toLocaleString()}
            </p>
            {product.price > product.sellingPrice && (
              <p className="text-xs text-gray-400 line-through">
                ₲ {product.price?.toLocaleString()}
              </p>
            )}
          </div>
          
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors">
            +
          </button>
        </div>
      </div>
    </div>
  );
});

ProductCardOptimized.displayName = 'ProductCardOptimized';

export default OptimizedCarousel;