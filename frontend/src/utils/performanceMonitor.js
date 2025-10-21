// frontend/src/utils/performanceMonitor.js
// ✅ MONITOR DE RENDIMIENTO PARA VERIFICAR OPTIMIZACIONES
import { useState, useEffect } from 'react';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      imageLoadTimes: [],
      componentRenderTimes: [],
      totalLoadTime: 0
    };
    
    this.startTime = performance.now();
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Monitorear carga de imágenes
    this.monitorImageLoads();
    
    // Monitorear métricas de Web Vitals
    this.monitorWebVitals();
    
    // Monitorear memoria (si está disponible)
    this.monitorMemory();
  }

  monitorImageLoads() {
    const images = document.querySelectorAll('img');
    
    images.forEach((img, index) => {
      const startTime = performance.now();
      
      img.addEventListener('load', () => {
        const loadTime = performance.now() - startTime;
        this.metrics.imageLoadTimes.push({
          src: img.src,
          loadTime,
          index
        });
        
        // Log imágenes que tardan más de 500ms
        if (loadTime > 500) {
          console.warn(`🐌 Imagen lenta detectada: ${img.src} (${loadTime.toFixed(2)}ms)`);
        }
      });
    });
  }

  monitorWebVitals() {
    // Core Web Vitals
    if ('web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
      });
    }
  }

  monitorMemory() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
          console.warn('🚨 Alto uso de memoria detectado:', {
            used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
            limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
          });
        }
      }, 10000);
    }
  }

  getMetrics() {
    const totalTime = performance.now() - this.startTime;
    
    return {
      ...this.metrics,
      totalLoadTime: totalTime,
      averageImageLoadTime: this.metrics.imageLoadTimes.length > 0 
        ? this.metrics.imageLoadTimes.reduce((sum, img) => sum + img.loadTime, 0) / this.metrics.imageLoadTimes.length
        : 0,
      slowImages: this.metrics.imageLoadTimes.filter(img => img.loadTime > 500).length,
      totalImages: this.metrics.imageLoadTimes.length
    };
  }

  logPerformanceReport() {
    const metrics = this.getMetrics();
    
    // console.log removed for production
    console.log(`⏱️  Tiempo total de carga: ${metrics.totalLoadTime.toFixed(2)}ms`);
    // console.log removed for production
    console.log(`🐌 Imágenes lentas (>500ms): ${metrics.slowImages}`);
    console.log(`⚡ Tiempo promedio de imagen: ${metrics.averageImageLoadTime.toFixed(2)}ms`);
    
    if (metrics.slowImages > 0) {
      // console.warn removed for production
      // console.log removed for production
      // console.log removed for production
      // console.log removed for production
    }
    
    return metrics;
  }
}

// ✅ INSTANCIA GLOBAL DEL MONITOR
export const performanceMonitor = new PerformanceMonitor();

// ✅ HOOK PARA USAR EN COMPONENTES
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return metrics;
};

// ✅ FUNCIÓN PARA MOSTRAR REPORTE EN DESARROLLO
export const showPerformanceReport = () => {
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      performanceMonitor.logPerformanceReport();
    }, 3000); // Esperar 3 segundos para que cargue todo
  }
};

export default PerformanceMonitor;
