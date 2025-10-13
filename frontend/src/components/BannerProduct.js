// frontend/src/components/BannerProduct.js
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BannerProduct = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // ✅ SOLO IMÁGENES - Sin texto ni botones
  const banners = React.useMemo(() => [
    {
      id: 1,
      image: '/banners/banner1.jpg', // Coloca tus imágenes en public/banners/
      alt: 'Banner 1'
    },
    {
      id: 2,
      image: '/banners/banner2.jpg',
      alt: 'Banner 2'
    },
    {
      id: 3,
      image: '/banners/banner3.jpg',
      alt: 'Banner 3'
    },
    {
      id: 4,
      image: '/banners/banner4.jpg',
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

  // ✅ PRECARGAR IMÁGENES CRÍTICAS DEL BANNER
  useEffect(() => {
    const preloadBannerImages = () => {
      banners.forEach((banner, index) => {
        if (index === 0) {
          // Primera imagen con prioridad alta
          const img = new Image();
          img.fetchPriority = 'high';
          img.src = banner.image;
        } else if (index === 1) {
          // Segunda imagen con prioridad media
          const img = new Image();
          img.fetchPriority = 'high';
          img.src = banner.image;
        } else {
          // Resto con prioridad baja
          setTimeout(() => {
            const img = new Image();
            img.fetchPriority = 'low';
            img.src = banner.image;
          }, index * 200);
        }
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
    <div className="w-full px-0 mt-0">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 w-full overflow-hidden rounded-none sm:rounded-xl shadow-lg">
        
        {/* Imágenes del carrusel */}
        <div className="relative w-full h-full">
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

        {/* Botones de navegación */}
        <button
          onClick={prevSlide}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full p-2 sm:p-2.5 transition-all duration-300 z-20 hover:scale-110 active:scale-95 shadow-lg"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full p-2 sm:p-2.5 transition-all duration-300 z-20 hover:scale-110 active:scale-95 shadow-lg"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
        </button>

        {/* Indicadores (dots) */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === activeSlide 
                  ? 'w-6 sm:w-8 h-1.5 sm:h-2 bg-white' 
                  : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Ir a slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};

export default BannerProduct;