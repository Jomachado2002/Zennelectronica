// frontend/src/hooks/useImageOptimization.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useImageOptimization = () => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [visibleProducts, setVisibleProducts] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const observerRef = useRef(null);

  // Detectar dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Intersection Observer para lazy loading inteligente
  const setupIntersectionObserver = useCallback((containerRef, productIds) => {
    if (!containerRef.current || !productIds.length) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const productId = entry.target.dataset.productId;
            if (productId) {
              setVisibleProducts(prev => new Set([...prev, productId]));
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: isMobile ? '100px' : '200px', // Más agresivo en desktop
        threshold: 0.1
      }
    );

    // Observar todos los productos
    productIds.forEach(id => {
      const element = containerRef.current?.querySelector(`[data-product-id="${id}"]`);
      if (element) {
        observerRef.current.observe(element);
      }
    });
  }, [isMobile]);

  // Función para marcar imagen como cargada
  const markImageAsLoaded = useCallback((productId) => {
    setLoadedImages(prev => new Set([...prev, productId]));
  }, []);

  // Función para precargar imágenes críticas (solo desktop)
  const preloadCriticalImages = useCallback((products, maxPreload = 6) => {
    if (isMobile || !products.length) return;

    products.slice(0, maxPreload).forEach((product, index) => {
      if (product?.productImage?.[0]) {
        // Precargar con delay escalonado
        setTimeout(() => {
          const img = new Image();
          img.fetchPriority = index < 3 ? 'high' : 'low';
          img.src = product.productImage[0];
        }, index * 100);
      }
    });
  }, [isMobile]);

  // Limpiar observer al desmontar
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    loadedImages,
    visibleProducts,
    isMobile,
    setupIntersectionObserver,
    markImageAsLoaded,
    preloadCriticalImages
  };
};

// Hook para límites optimizados por dispositivo
export const useOptimizedLimits = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getOptimizedLimits = (subcategory) => {
    const mobileLimits = {
      'notebooks': 5,
      'telefonos_moviles': 5,
      'placas_madre': 5,
      'memorias_ram': 5,
      'discos_duros': 5,
      'tarjeta_grafica': 5,
      'gabinetes': 5,
      'procesador': 5,
      'monitores': 5,
      'mouses': 5,
      'teclados': 5,
      'auriculares': 5,
      'microfonos': 5
    };

    const desktopLimits = {
      'notebooks': 10,
      'telefonos_moviles': 10,
      'placas_madre': 10,
      'memorias_ram': 10,
      'discos_duros': 10,
      'tarjeta_grafica': 10,
      'gabinetes': 10,
      'procesador': 10,
      'monitores': 10,
      'mouses': 10,
      'teclados': 10,
      'auriculares': 10,
      'microfonos': 10
    };

    return isMobile 
      ? mobileLimits[subcategory] || 5
      : desktopLimits[subcategory] || 10;
  };

  return {
    isMobile,
    getOptimizedLimits
  };
};
