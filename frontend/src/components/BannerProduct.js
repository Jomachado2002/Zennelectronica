// frontend/src/components/BannerProduct.js
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import scrollTop from '../helpers/scrollTop';

/**
 * Contenedor del banner: proporción fija desde el primer paint vía CSS
 * (evita CLS al hidratar: no depende de useState(isMobile)).
 * Mobile &lt;640px: 1545×1329 | Desktop: 1374×438
 */
export const BANNER_SHELL_CLASS =
  'w-full overflow-hidden rounded-none sm:rounded-xl bg-gray-200 ' +
  '[aspect-ratio:1545/1329] sm:[aspect-ratio:1374/438] sm:min-h-[180px] sm:max-h-[60vh]';

/**
 * Solo banners del CMS (Admin → Home Media).
 * El hueco del banner siempre está reservado → mejor LCP/CLS.
 */
const BannerProduct = ({ banners: bannersProp = null, pending = false }) => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
  const lastSwipeAtRef = useRef(0);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 640);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const banners = useMemo(() => {
    if (!Array.isArray(bannersProp)) return [];
    return bannersProp
      .filter((b) => b && (b.imageDesktop || b.imageMobile || b.image))
      .map((b, i) => ({
        id: b._id || `api-${i}`,
        image: isMobile
          ? b.imageMobile || b.imageDesktop || b.image
          : b.imageDesktop || b.image || b.imageMobile,
        alt: b.alt || b.title || `Banner ${i + 1}`,
        href: b.href || ''
      }));
  }, [bannersProp, isMobile]);

  useEffect(() => {
    setActiveSlide(0);
  }, [isMobile, banners.length]);

  const nextSlide = useCallback(() => {
    if (isAnimating || banners.length < 2) return;
    setIsAnimating(true);
    setActiveSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, banners.length]);

  const prevSlide = useCallback(() => {
    if (isAnimating || banners.length < 2) return;
    setIsAnimating(true);
    setActiveSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, banners.length]);

  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || touchEnd == null) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) > 50) {
      lastSwipeAtRef.current = Date.now();
      if (distance > 0) nextSlide();
      else prevSlide();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const goToHref = (href) => {
    if (!href) return;
    if (/^https?:\/\//i.test(href)) {
      window.location.href = href;
      return;
    }
    navigate(href.startsWith('/') ? href : `/${href}`);
    scrollTop();
  };

  const handleBannerClick = (e, banner) => {
    if (e.target.closest('button')) return;
    if (Date.now() - lastSwipeAtRef.current < 450) return;
    if (!banner?.href) return;
    goToHref(banner.href);
  };

  useEffect(() => {
    if (!banners.length) return undefined;
    const warm = (src, priority = 'low') => {
      if (!src) return;
      const img = new Image();
      if ('fetchPriority' in img) img.fetchPriority = priority;
      img.src = src;
    };
    warm(banners[activeSlide]?.image, 'high');
    if (banners.length > 1) {
      warm(banners[(activeSlide + 1) % banners.length]?.image, 'low');
    }
  }, [banners, activeSlide]);

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [activeSlide, nextSlide, banners.length]);

  // Siempre reservar el hueco mientras carga; si ya cargó y no hay banners, no ocupar espacio
  if (!banners.length) {
    if (!pending && Array.isArray(bannersProp)) return null;
    return (
      <div className="w-full mt-0 sm:mx-auto sm:max-w-7xl sm:px-4">
        <div
          className={`${BANNER_SHELL_CLASS} animate-pulse`}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="w-full mt-0 sm:mx-auto sm:max-w-7xl sm:px-4">
      <div className={`relative shadow-lg ${BANNER_SHELL_CLASS} bg-gray-100`}>
        <div
          className={`relative w-full h-full touch-pan-y ${
            banners[activeSlide]?.href ? 'cursor-pointer' : ''
          }`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => handleBannerClick(e, banners[activeSlide])}
          role={banners[activeSlide]?.href ? 'link' : undefined}
          aria-label={banners[activeSlide]?.alt || 'Banner'}
        >
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-500 ease-out ${
                index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={banner.image}
                alt={banner.alt}
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center center' }}
                width={isMobile ? 1545 : 1374}
                height={isMobile ? 1329 : 438}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === activeSlide ? 'high' : 'low'}
                decoding={index === 0 ? 'sync' : 'async'}
              />
            </div>
          ))}
        </div>

        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full p-3 sm:p-2.5 transition-all z-20 shadow-lg"
              style={{ minWidth: '44px', minHeight: '44px' }}
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full p-3 sm:p-2.5 transition-all z-20 shadow-lg"
              style={{ minWidth: '44px', minHeight: '44px' }}
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5 text-gray-800" />
            </button>
            <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`Ir al banner ${i + 1}`}
                  onClick={() => setActiveSlide(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === activeSlide ? 'w-6 bg-[#00B5D8]' : 'w-2 bg-white/70'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BannerProduct;
