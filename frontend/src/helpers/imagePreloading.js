// Archivo: src/helpers/imagePreloading.js

/**
 * Estrategia de precarga selectiva para imágenes
 * Esta utilidad ayuda a cargar imágenes críticas de manera proactiva
 * y aplica técnicas para mejorar el rendimiento de carga de imágenes
 */

// Función para precargar las imágenes más importantes (banners, etc.)
export const preloadCriticalImages = (imageUrls = []) => {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) return;
  
    // Solo precargar un número limitado de imágenes (máximo 3-5)
    const limitedUrls = imageUrls.slice(0, 5);
    
    // Precargar imágenes usando el objeto Image
    limitedUrls.forEach(url => {
      try {
        if (!url) return;
        
        const img = new Image();
        // Prioridad alta para estas imágenes críticas
        img.fetchpriority = "high";
        img.src = url;
      } catch (error) {
        console.warn('Error precargando imagen:', error);
      }
    });
  };
  
  // Función para aplicar técnicas de optimización a BannerProduct
  export const optimizeBannerImages = () => {
    // Seleccionar todos los banners
    const bannerImages = document.querySelectorAll('.banner-slide img');
    if (!bannerImages.length) return;
    
    // Aplicar atributos de optimización a las imágenes del banner
    bannerImages.forEach((img, index) => {
      // Solo la primera imagen tiene alta prioridad
      img.fetchpriority = index === 0 ? "high" : "low";
      img.decoding = "async";
      img.loading = index === 0 ? "eager" : "lazy";
      
      // Atributos importantes para SEO y accesibilidad
      if (!img.alt) img.alt = "Banner promocional";
      
      // Añadir dimensiones si no existen
      if (!img.width && !img.height) {
        img.width = 1200;
        img.height = 400;
      }
    });
  };
  
  // Función para detectar imágenes rotas y reemplazarlas
  export const detectBrokenImages = () => {
    window.addEventListener('load', () => {
      const allImages = document.querySelectorAll('img');
      
      allImages.forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
          // Establecer una imagen de respaldo para imágenes rotas
          img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"%3E%3Crect width="100%25" height="100%25" fill="%23f3f4f6"/%3E%3C/svg%3E';
          img.classList.add('broken-image');
        }
      });
    });
  };
  
  // Función para liberar memoria de imágenes fuera de vista
  export const cleanupOffscreenImages = () => {
    // Esta función usa Intersection Observer para descargar imágenes que llevan mucho tiempo fuera de la vista
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // Si la imagen ha estado fuera de vista por un tiempo
        if (!entry.isIntersecting) {
          const img = entry.target;
          // Almacenar la URL original
          if (!img.dataset.originalSrc && img.src) {
            img.dataset.originalSrc = img.src;
            
            // Después de 30 segundos fuera de vista, liberamos memoria
            setTimeout(() => {
              if (!entry.isIntersecting) {
                // Reemplazar con placeholder liviano
                img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
                img.classList.add('offscreen-optimized');
              }
            }, 30000);
          }
        } else if (img.classList.contains('offscreen-optimized') && img.dataset.originalSrc) {
          // Restaurar imagen cuando vuelva a entrar en vista
          img.src = img.dataset.originalSrc;
          img.classList.remove('offscreen-optimized');
        }
      });
    }, { rootMargin: '200px' });
    
    // Observar todas las imágenes del documento
    document.querySelectorAll('img').forEach(img => {
      if (img.classList.contains('permanent-image')) return; // Ignorar imágenes que siempre deben permanecer
      observer.observe(img);
    });
  };
  
  // Función principal para implementar todas las estrategias
  export const implementImageOptimizations = () => {
    // Detectar tipo de conexión
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSaveData = connection?.saveData || false;
    const isSlowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';
    
    // En conexiones lentas o modo ahorro de datos, ajustar estrategias
    if (isSaveData || isSlowConnection) {
      // No precargar imágenes en conexiones lentas
      console.log('Conexión lenta detectada: optimizando carga de imágenes');
    } else {
      // Precargar solo imágenes críticas en conexiones normales
      // Banners y productos destacados (a implementar según tus necesidades)
    }
    
    // Siempre aplicar estas optimizaciones
    detectBrokenImages();
    window.addEventListener('load', () => {
      optimizeBannerImages();
      cleanupOffscreenImages();
    });
  };
  
  // Exportar todas las utilidades
  export default {
    preloadCriticalImages,
    optimizeBannerImages,
    detectBrokenImages,
    cleanupOffscreenImages,
    implementImageOptimizations
  };