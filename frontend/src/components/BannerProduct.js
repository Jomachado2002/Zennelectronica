// frontend/src/components/BannerProduct.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCelularesListingHref } from '../config/homeSlotRoutes';
import scrollTop from '../helpers/scrollTop';

const BannerProduct = () => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const celularesHref = useMemo(() => getCelularesListingHref(), []);
  const lastSwipeAtRef = useRef(0);

  // Hook para detectar si es móvil
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // ✅ IMÁGENES ESPECÍFICAS PARA MÓVIL Y DESKTOP
  const bannersDesktop = React.useMemo(() => [
    {
      id: 1,
      image: '/banners/banner1.webp',
      alt: 'Banner 1 Desktop'
    },
    {
      id: 2,
      image: '/banners/banner2.webp',
      alt: 'Banner 2 Desktop'
    },
    {
      id: 3,
      image: '/banners/banner3.webp',
      alt: 'Banner 3 Desktop'
    },
    {
      id: 4,
      image: '/banners/banner4.webp',
      alt: 'Banner 4 Desktop'
    },
    {
      id: 5,
      image: '/banners/banner5.webp',
      alt: 'Banner 5 Desktop'
    }
  ], []);

  const bannersMobile = React.useMemo(() => [
    {
      id: 1,
      image: '/banners/banner1mob.webp', // Dimensiones 466x700
      alt: 'Banner 1 Mobile'
    },
    {
      id: 2,
      image: '/banners/banner2mob.webp',
      alt: 'Banner 2 Mobile'
    },
    {
      id: 3,
      image: '/banners/banner3mob.webp',
      alt: 'Banner 3 Mobile'
    },
    {
      id: 4,
      image: '/banners/banner4mob.webp',
      alt: 'Banner 4 Mobile'
    },
    {
      id: 5,
      image: '/banners/banner5mob.webp',
      alt: 'Banner 5 Mobile'
    }
  ], []);

  // Seleccionar banners según el dispositivo
  const banners = isMobile ? bannersMobile : bannersDesktop;

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
      lastSwipeAtRef.current = Date.now();
      nextSlide();
    } else if (isRightSwipe) {
      lastSwipeAtRef.current = Date.now();
      prevSlide();
    }
  };

  /** En móvil, tocar el banner (fuera de flechas) lleva al listado de celulares configurado en home slots. */
  const handleBannerClick = (e) => {
    if (!isMobile) return;
    if (e.target.closest('button')) return;
    if (Date.now() - lastSwipeAtRef.current < 450) return;
    navigate(celularesHref);
    scrollTop();
  };

  // ✅ PRECARGAR TODAS LAS IMÁGENES DEL BANNER INMEDIATAMENTE
  useEffect(() => {
    const preloadBannerImages = () => {
      // Precargar imágenes del dispositivo actual
      banners.forEach((banner, index) => {
        const img = new Image();
        img.fetchPriority = 'high';
        img.src = banner.image;
      });
      
      // También precargar las imágenes del otro dispositivo para cambio rápido
      const otherBanners = isMobile ? bannersDesktop : bannersMobile;
      otherBanners.forEach((banner) => {
        const img = new Image();
        img.fetchPriority = 'low';
        img.src = banner.image;
      });
    };

    preloadBannerImages();
  }, [banners, bannersDesktop, bannersMobile, isMobile]);

  // Resetear slide cuando cambie el dispositivo
  useEffect(() => {
    setActiveSlide(0);
  }, [isMobile]);

  // Auto-play cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSlide, nextSlide]);

  return (
    <div className="w-full mt-0 sm:mx-auto sm:max-w-7xl sm:px-4">
      {/* Contenedor principal con aspect-ratio responsivo */}
      <div 
        className="relative w-full overflow-hidden rounded-none sm:rounded-xl shadow-lg"
        style={{
          // Aspect-ratio optimizado para evitar espacios en blanco
          // Móvil: usar proporción más ancha para llenar mejor la pantalla
          // Desktop: mantener proporción original
          aspectRatio: isMobile ? '4/5' : '1374/438',
          minHeight: isMobile ? '200px' : '180px',
          maxHeight: isMobile ? '50vh' : '60vh',
          // Asegurar que en móviles no haya espacios en blanco
          width: '100%'
        }}
      >
          {/* Imágenes del carrusel - Con soporte táctil */}
          <div 
            className="relative w-full h-full touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleBannerClick}
            role={isMobile ? 'link' : undefined}
            aria-label={isMobile ? 'Ver celulares y tablets' : undefined}
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
                    // Posicionamiento optimizado para móvil y desktop
                    objectPosition: isMobile ? 'center center' : 'center center',
                    width: '100%',
                    height: '100%',
                    // Asegurar que la imagen llene completamente el contenedor
                    minWidth: '100%',
                    minHeight: '100%'
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
  );
};

export default BannerProduct;