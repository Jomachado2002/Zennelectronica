// frontend/src/components/BannerProduct.js
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BannerProduct = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // ✅ SOLO IMÁGENES - Sin texto ni botones
  const banners = React.useMemo(() => [
    {
      id: 1,
      image: '/banners/banner1.webp', // Coloca tus imágenes en public/banners/
      alt: 'Banner 1'
    },
    {
      id: 2,
      image: '/banners/banner2.webp',
      alt: 'Banner 2'
    },
    {
      id: 3,
      image: '/banners/banner3.webp',
      alt: 'Banner 3'
    },
    {
      id: 4,
      image: '/banners/banner4.webp',
      alt: 'Banner 4'
    },
    {
      id: 5,
      image: '/banners/banner5.jpg',
      alt: 'Banner 5'
    }
  ], []);

  const nextSlide = React.useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, banners.length]);

  const prevSlide = React.useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, banners.length]);

  // ✅ GESTOS TÁCTILES PARA MÓVILES
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  // ✅ PRECARGAR TODAS LAS IMÁGENES DEL BANNER INMEDIATAMENTE
  useEffect(() => {
    const preloadBannerImages = () => {
      banners.forEach((banner, index) => {
        const img = new Image();
        img.fetchPriority = 'high';
        // Removido crossOrigin para evitar errores CORS con Firebase Storage
        img.src = banner.image;
      });
    };

    preloadBannerImages();
  }, [banners]);

  // Auto-play cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSlide, nextSlide]);

  return (
    <div className="w-full mt-0">
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-4">
        {/* Contenedor principal con aspect-ratio optimizado para imágenes 1374x438 */}
        <div 
          className="relative w-full overflow-hidden rounded-none sm:rounded-xl shadow-lg"
          style={{
            aspectRatio: '1374/438',
            minHeight: '200px'
          }}
        >
          {/* Imágenes del carrusel - Con soporte táctil */}
          <div 
            className="relative w-full h-full touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <img
                  src={banner.image}
                  alt={banner.alt}
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: 'center center',
                    width: '100%',
                    height: '100%'
                  }}
                  loading={index === activeSlide ? "eager" : "lazy"}
                  fetchpriority={index === activeSlide ? "high" : "low"}
                  onError={(e) => {
                    // Imagen por defecto si no existe
                    if (e && e.target) {
                      e.target.src = '/banners/default.jpg';
                    }
                  }}
                />
                {/* Overlay sutil para mejor contraste con los controles */}
                <div className="absolute inset-0 bg-black/5"></div>
              </div>
            ))}
          </div>

          {/* Botones de navegación - Optimizados para táctil */}
          <button
            onClick={prevSlide}
            className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full p-3 sm:p-2.5 transition-all duration-300 z-20 hover:scale-110 active:scale-95 shadow-lg touch-manipulation"
            style={{ minWidth: '44px', minHeight: '44px' }} // Tamaño mínimo táctil
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 sm:w-5 sm:h-5 text-gray-800" />
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full p-3 sm:p-2.5 transition-all duration-300 z-20 hover:scale-110 active:scale-95 shadow-lg touch-manipulation"
            style={{ minWidth: '44px', minHeight: '44px' }} // Tamaño mínimo táctil
            aria-label="Siguiente"
          >
            <ChevronRight className="w-5 h-5 sm:w-5 sm:h-5 text-gray-800" />
          </button>


        </div>
      </div>
    </div>
  );
};

export default BannerProduct;