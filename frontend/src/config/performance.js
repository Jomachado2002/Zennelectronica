// frontend/src/config/performance.js
// ✅ CONFIGURACIÓN DE OPTIMIZACIÓN DE RENDIMIENTO

export const PERFORMANCE_CONFIG = {
  // ✅ LÍMITES COMO PEDISTE: 5 en móvil, 10 en desktop
  PRODUCT_LIMITS: {
    mobile: {
      notebooks: 5,
      telefonos_moviles: 5,
      placas_madre: 5,
      memorias_ram: 5,
      discos_duros: 5,
      tarjeta_grafica: 5,
      gabinetes: 5,
      procesador: 5,
      monitores: 5,
      mouses: 5,
      teclados: 5,
      auriculares: 5,
      microfonos: 5
    },
    desktop: {
      notebooks: 10,
      telefonos_moviles: 10,
      placas_madre: 10,
      memorias_ram: 10,
      discos_duros: 10,
      tarjeta_grafica: 10,
      gabinetes: 10,
      procesador: 10,
      monitores: 10,
      mouses: 10,
      teclados: 10,
      auriculares: 10,
      microfonos: 10
    }
  },

  // Configuración de imágenes
  IMAGE_CONFIG: {
    // Parámetros de compresión para URLs externas
    COMPRESSION_PARAMS: {
      width: 400,
      quality: 80,
      format: 'webp'
    },
    
    // Lazy loading
    LAZY_LOADING: {
      rootMargin: '50px',
      threshold: 0.1
    },
    
    // Precarga
    PRELOAD: {
      criticalImages: 3, // Solo precargar las primeras 3 imágenes críticas
      delay: 100 // Delay entre precargas (ms)
    }
  },

  // Configuración de caché
  CACHE_CONFIG: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  },

  // Configuración de animaciones
  ANIMATION_CONFIG: {
    // Reducir animaciones en dispositivos lentos
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    // Duración de transiciones
    transitionDuration: 300,
    // Stagger delay entre elementos
    staggerDelay: 100
  }
};

// ✅ UTILIDADES DE DETECCIÓN
export const isMobile = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export const isSlowConnection = () => {
  // Detectar conexión lenta usando navigator.connection si está disponible
  if ('connection' in navigator) {
    const connection = navigator.connection;
    return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
  }
  return false;
};

// ✅ FUNCIÓN PARA OBTENER LÍMITES OPTIMIZADOS - COMO PEDISTE
export const getOptimizedLimits = (subcategory) => {
  const deviceType = isMobile() ? 'mobile' : 'desktop';
  return PERFORMANCE_CONFIG.PRODUCT_LIMITS[deviceType][subcategory] || 
         (isMobile() ? 5 : 10);
};

// ✅ FUNCIÓN PARA OBTENER CONFIGURACIÓN DE IMAGEN
export const getImageConfig = () => {
  const slowConnection = isSlowConnection();
  
  return {
    ...PERFORMANCE_CONFIG.IMAGE_CONFIG,
    // Ajustar parámetros para conexiones lentas
    COMPRESSION_PARAMS: {
      ...PERFORMANCE_CONFIG.IMAGE_CONFIG.COMPRESSION_PARAMS,
      quality: slowConnection ? 60 : 80, // Calidad más baja en conexiones lentas
      width: slowConnection ? 300 : 400  // Ancho más pequeño en conexiones lentas
    }
  };
};
