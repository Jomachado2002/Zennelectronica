// General performance optimization utilities
import { PERFORMANCE_CONFIG, FEATURES, performanceMonitor } from '../config/performance';
import { networkOptimization, networkMonitor } from './networkOptimization';
import { imageOptimization } from './imageOptimization';
import { cssOptimization, cssPerformanceMonitor } from './cssOptimization';
import { jsOptimization, jsPerformanceMonitor } from './jsOptimization';

export const performanceOptimization = {
  // Initialize all optimizations
  init: () => {
    console.log('Initializing performance optimizations...');
    
    // Initialize performance monitoring
    performanceOptimization.initPerformanceMonitoring();
    
    // Initialize network optimizations
    performanceOptimization.initNetworkOptimizations();
    
    // Initialize image optimizations
    performanceOptimization.initImageOptimizations();
    
    // Initialize CSS optimizations
    performanceOptimization.initCSSOptimizations();
    
    // Initialize JavaScript optimizations
    performanceOptimization.initJSOptimizations();
    
    // Initialize service worker
    performanceOptimization.initServiceWorker();
    
    console.log('Performance optimizations initialized');
  },

  // Performance monitoring
  initPerformanceMonitoring: () => {
    // Monitor Core Web Vitals
    performanceOptimization.monitorCoreWebVitals();
    
    // Monitor resource loading
    performanceOptimization.monitorResourceLoading();
    
    // Monitor user interactions
    performanceOptimization.monitorUserInteractions();
    
    // Monitor memory usage
    performanceOptimization.monitorMemoryUsage();
  },

  // Network optimizations
  initNetworkOptimizations: () => {
    // Add DNS prefetch for external domains
    const externalDomains = [
      '//fonts.googleapis.com',
      '//fonts.gstatic.com',
      '//zennelectronica02.vercel.app',
    ];
    
    networkOptimization.prefetchDNS(externalDomains);
    
    // Add preconnect for critical domains
    const criticalDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://zennelectronica02.vercel.app',
    ];
    
    networkOptimization.preconnect(criticalDomains);
    
    // Preload critical resources
    const criticalResources = [
      { url: '/static/css/main.css', as: 'style' },
      { url: '/static/js/main.js', as: 'script' },
      { url: '/placeholder.jpg', as: 'image' },
    ];
    
    networkOptimization.preloadResources(criticalResources);
    
    // Monitor network status
    networkMonitor.addListener((event, status) => {
      console.log('Network status changed:', event, status);
      
      if (event === 'offline') {
        performanceOptimization.handleOfflineMode();
      } else if (event === 'online') {
        performanceOptimization.handleOnlineMode();
      }
    });
  },

  // Image optimizations
  initImageOptimizations: () => {
    // Optimize existing images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.hasAttribute('data-optimized')) {
        imageOptimization.lazyLoadImage(img, img.src);
        img.setAttribute('data-optimized', 'true');
      }
    });
    
    // Add intersection observer for lazy loading
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px',
    });
    
    // Observe images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));
  },

  // CSS optimizations
  initCSSOptimizations: () => {
    // Add loading states
    cssOptimization.addLoadingStates();
    
    // Optimize animations for reduced motion
    cssOptimization.optimizeAnimations();
    
    // Add dark mode optimization
    cssOptimization.optimizeDarkMode();
    
    // Add print styles
    cssOptimization.optimizePrint();
    
    // Monitor CSS performance
    cssPerformanceMonitor.monitorPaintTiming();
    cssPerformanceMonitor.monitorLayoutShifts();
  },

  // JavaScript optimizations
  initJSOptimizations: () => {
    // Prevent memory leaks
    jsOptimization.memory.preventMemoryLeaks();
    
    // Add event delegation for better performance
    jsOptimization.events.delegate(document, '.clickable', 'click', (e) => {
      // Handle click events efficiently
    });
    
    // Monitor JavaScript performance
    jsPerformanceMonitor.monitorLongTasks();
    jsPerformanceMonitor.monitorMemoryUsage();
    
    // Add performance marks
    jsOptimization.performance.mark('js-optimization-start');
  },

  // Service worker
  initServiceWorker: () => {
    if (FEATURES.SERVICE_WORKER()) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                performanceOptimization.showUpdateNotification();
              }
            });
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  },

  // Core Web Vitals monitoring
  monitorCoreWebVitals: () => {
    // Largest Contentful Paint
    performanceOptimization.getLCP().then(lcp => {
      if (lcp) {
        performanceMonitor.set('lcp', lcp.startTime);
        console.log('LCP:', lcp.startTime);
      }
    });
    
    // First Input Delay
    performanceOptimization.getFID().then(fid => {
      if (fid) {
        performanceMonitor.set('fid', fid.processingStart - fid.startTime);
        console.log('FID:', fid.processingStart - fid.startTime);
      }
    });
    
    // Cumulative Layout Shift
    performanceOptimization.getCLS().then(cls => {
      performanceMonitor.set('cls', cls);
      console.log('CLS:', cls);
    });
  },

  // Resource loading monitoring
  monitorResourceLoading: () => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'resource') {
          performanceMonitor.set(`resource_${entry.name}`, {
            duration: entry.duration,
            size: entry.transferSize,
            timestamp: Date.now(),
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['resource'] });
  },

  // User interactions monitoring
  monitorUserInteractions: () => {
    let interactionCount = 0;
    
    const interactionTypes = ['click', 'keydown', 'scroll', 'touchstart'];
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, () => {
        interactionCount++;
        performanceMonitor.set('interaction_count', interactionCount);
      }, { passive: true });
    });
  },

  // Memory usage monitoring
  monitorMemoryUsage: () => {
    setInterval(() => {
      const memory = jsOptimization.memory.getMemoryUsage();
      if (memory) {
        performanceMonitor.set('memory_usage', memory);
        
        // Suggest GC if memory usage is high
        if (memory.used / memory.limit > 0.8) {
          jsOptimization.memory.suggestGC();
        }
      }
    }, 30000); // Check every 30 seconds
  },

  // Offline mode handling
  handleOfflineMode: () => {
    console.log('Handling offline mode');
    
    // Show offline notification
    performanceOptimization.showOfflineNotification();
    
    // Disable non-critical features
    performanceOptimization.disableNonCriticalFeatures();
  },

  // Online mode handling
  handleOnlineMode: () => {
    console.log('Handling online mode');
    
    // Hide offline notification
    performanceOptimization.hideOfflineNotification();
    
    // Re-enable features
    performanceOptimization.enableFeatures();
    
    // Sync pending data
    performanceOptimization.syncPendingData();
  },

  // Show offline notification
  showOfflineNotification: () => {
    const notification = document.createElement('div');
    notification.id = 'offline-notification';
    notification.textContent = 'You are offline. Some features may be limited.';
    notification.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      padding: 1rem;
      text-align: center;
      z-index: 1000;
    `;
    
    document.body.appendChild(notification);
  },

  // Hide offline notification
  hideOfflineNotification: () => {
    const notification = document.getElementById('offline-notification');
    if (notification) {
      notification.remove();
    }
  },

  // Show update notification
  showUpdateNotification: () => {
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.innerHTML = `
      <div style="position: fixed; bottom: 20px; right: 20px; background: #4CAF50; color: white; padding: 1rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 1000;">
        <p>New version available!</p>
        <button onclick="window.location.reload()" style="background: white; color: #4CAF50; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-top: 0.5rem;">
          Update Now
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
  },

  // Disable non-critical features
  disableNonCriticalFeatures: () => {
    // Disable non-critical animations
    document.body.classList.add('offline-mode');
  },

  // Enable features
  enableFeatures: () => {
    document.body.classList.remove('offline-mode');
  },

  // Sync pending data
  syncPendingData: () => {
    // Implement data synchronization logic
    console.log('Syncing pending data...');
  },

  // Get performance metrics
  getPerformanceMetrics: () => {
    return {
      coreWebVitals: {
        lcp: performanceMonitor.get('lcp'),
        fid: performanceMonitor.get('fid'),
        cls: performanceMonitor.get('cls'),
      },
      network: networkMonitor.getStatus(),
      memory: jsOptimization.memory.getMemoryUsage(),
      interactions: performanceMonitor.get('interaction_count'),
      resources: performanceMonitor.getAll(),
    };
  },

  // Export performance data
  exportPerformanceData: () => {
    const metrics = performanceOptimization.getPerformanceMetrics();
    const blob = new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  },

  // Cleanup
  cleanup: () => {
    networkOptimization.cleanup();
    jsPerformanceMonitor.disconnect();
    cssPerformanceMonitor.disconnect();
    performanceMonitor.clear();
  },
};

// Initialize optimizations when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', performanceOptimization.init);
} else {
  performanceOptimization.init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', performanceOptimization.cleanup);

export default performanceOptimization;
