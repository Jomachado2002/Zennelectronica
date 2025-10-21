// System-wide performance optimization
import { performanceOptimization } from './performanceOptimization';
import { networkOptimization } from './networkOptimization';
import { imageOptimization } from './imageOptimization';
import { cssOptimization } from './cssOptimization';
import { jsOptimization } from './jsOptimization';

export const systemOptimization = {
  // Initialize all system optimizations
  init: () => {
    console.log('🚀 Initializing system-wide optimizations...');
    
    try {
      // Initialize performance monitoring
      systemOptimization.initPerformanceMonitoring();
      
      // Initialize network optimizations
      systemOptimization.initNetworkOptimizations();
      
      // Initialize image optimizations
      systemOptimization.initImageOptimizations();
      
      // Initialize CSS optimizations
      systemOptimization.initCSSOptimizations();
      
      // Initialize JavaScript optimizations
      systemOptimization.initJSOptimizations();
      
      // Initialize system monitoring
      systemOptimization.initSystemMonitoring();
      
      console.log('✅ System-wide optimizations initialized successfully!');
    } catch (error) {
      console.error('❌ System optimization initialization failed:', error);
      throw error;
    }
  },

  // Performance monitoring
  initPerformanceMonitoring: () => {
    // Monitor Core Web Vitals
    systemOptimization.monitorCoreWebVitals();
    
    // Monitor resource loading
    systemOptimization.monitorResourceLoading();
    
    // Monitor user interactions
    systemOptimization.monitorUserInteractions();
    
    // Monitor memory usage
    systemOptimization.monitorMemoryUsage();
    
    // Monitor performance metrics
    systemOptimization.monitorPerformanceMetrics();
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
    networkOptimization.networkMonitor.addListener((event, status) => {
      console.log('Network status changed:', event, status);
      
      if (event === 'offline') {
        systemOptimization.handleOfflineMode();
      } else if (event === 'online') {
        systemOptimization.handleOnlineMode();
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
    cssOptimization.cssPerformanceMonitor.monitorPaintTiming();
    cssOptimization.cssPerformanceMonitor.monitorLayoutShifts();
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
    jsOptimization.jsPerformanceMonitor.monitorLongTasks();
    jsOptimization.jsPerformanceMonitor.monitorMemoryUsage();
    
    // Add performance marks
    jsOptimization.performance.mark('js-optimization-start');
  },

  // System monitoring
  initSystemMonitoring: () => {
    // Monitor system resources
    systemOptimization.monitorSystemResources();
    
    // Monitor user behavior
    systemOptimization.monitorUserBehavior();
    
    // Monitor errors
    systemOptimization.monitorErrors();
    
    // Monitor performance
    systemOptimization.monitorPerformance();
  },

  // Core Web Vitals monitoring
  monitorCoreWebVitals: () => {
    // Largest Contentful Paint
    systemOptimization.getLCP().then(lcp => {
      if (lcp) {
        console.log('LCP:', lcp.startTime);
      }
    });
    
    // First Input Delay
    systemOptimization.getFID().then(fid => {
      if (fid) {
        console.log('FID:', fid.processingStart - fid.startTime);
      }
    });
    
    // Cumulative Layout Shift
    systemOptimization.getCLS().then(cls => {
      console.log('CLS:', cls);
    });
  },

  // Resource loading monitoring
  monitorResourceLoading: () => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'resource') {
          console.log(`Resource loaded: ${entry.name} - ${entry.duration}ms`);
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
        console.log(`User interaction: ${type} (${interactionCount})`);
      }, { passive: true });
    });
  },

  // Memory usage monitoring
  monitorMemoryUsage: () => {
    setInterval(() => {
      const memory = jsOptimization.memory.getMemoryUsage();
      if (memory) {
        console.log('Memory usage:', memory);
        
        // Suggest GC if memory usage is high
        if (memory.used / memory.limit > 0.8) {
          jsOptimization.memory.suggestGC();
        }
      }
    }, 30000); // Check every 30 seconds
  },

  // Performance metrics monitoring
  monitorPerformanceMetrics: () => {
    // Monitor paint timing
    systemOptimization.monitorPaintTiming();
    
    // Monitor navigation timing
    systemOptimization.monitorNavigationTiming();
    
    // Monitor resource timing
    systemOptimization.monitorResourceTiming();
  },

  // Paint timing monitoring
  monitorPaintTiming: () => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        console.log(`Paint timing: ${entry.name} - ${entry.startTime}ms`);
      });
    });
    
    observer.observe({ entryTypes: ['paint'] });
  },

  // Navigation timing monitoring
  monitorNavigationTiming: () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      console.log('Navigation timing:', {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        request: navigation.responseStart - navigation.requestStart,
        response: navigation.responseEnd - navigation.responseStart,
        dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        load: navigation.loadEventEnd - navigation.loadEventStart,
        total: navigation.loadEventEnd - navigation.navigationStart,
      });
    }
  },

  // Resource timing monitoring
  monitorResourceTiming: () => {
    const resources = performance.getEntriesByType('resource');
    resources.forEach(resource => {
      console.log(`Resource timing: ${resource.name} - ${resource.duration}ms`);
    });
  },

  // System resources monitoring
  monitorSystemResources: () => {
    // Monitor CPU usage
    systemOptimization.monitorCPUUsage();
    
    // Monitor memory usage
    systemOptimization.monitorMemoryUsage();
    
    // Monitor network usage
    systemOptimization.monitorNetworkUsage();
  },

  // CPU usage monitoring
  monitorCPUUsage: () => {
    // Monitor long tasks
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        console.log(`Long task detected: ${entry.duration}ms`);
      });
    });
    
    observer.observe({ entryTypes: ['longtask'] });
  },

  // Network usage monitoring
  monitorNetworkUsage: () => {
    // Monitor network requests
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'resource') {
          console.log(`Network request: ${entry.name} - ${entry.transferSize} bytes`);
        }
      });
    });
    
    observer.observe({ entryTypes: ['resource'] });
  },

  // User behavior monitoring
  monitorUserBehavior: () => {
    // Monitor page visibility
    document.addEventListener('visibilitychange', () => {
      console.log('Page visibility changed:', document.visibilityState);
    });
    
    // Monitor focus events
    window.addEventListener('focus', () => {
      console.log('Window focused');
    });
    
    window.addEventListener('blur', () => {
      console.log('Window blurred');
    });
  },

  // Error monitoring
  monitorErrors: () => {
    // Monitor JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('JavaScript error:', event.error);
    });
    
    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  },

  // Performance monitoring
  monitorPerformance: () => {
    // Monitor performance entries
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        console.log(`Performance entry: ${entry.entryType} - ${entry.name}`);
      });
    });
    
    observer.observe({ entryTypes: ['measure', 'mark'] });
  },

  // Offline mode handling
  handleOfflineMode: () => {
    console.log('Handling offline mode');
    
    // Show offline notification
    systemOptimization.showOfflineNotification();
    
    // Disable non-critical features
    systemOptimization.disableNonCriticalFeatures();
  },

  // Online mode handling
  handleOnlineMode: () => {
    console.log('Handling online mode');
    
    // Hide offline notification
    systemOptimization.hideOfflineNotification();
    
    // Re-enable features
    systemOptimization.enableFeatures();
    
    // Sync pending data
    systemOptimization.syncPendingData();
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
        lcp: systemOptimization.getLCP(),
        fid: systemOptimization.getFID(),
        cls: systemOptimization.getCLS(),
      },
      network: networkOptimization.networkMonitor.getStatus(),
      memory: jsOptimization.memory.getMemoryUsage(),
      performance: performance.getEntriesByType('navigation')[0],
    };
  },

  // Export performance data
  exportPerformanceData: () => {
    const metrics = systemOptimization.getPerformanceMetrics();
    const blob = new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-performance-metrics-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  },

  // Cleanup
  cleanup: () => {
    networkOptimization.cleanup();
    jsOptimization.jsPerformanceMonitor.disconnect();
    cssOptimization.cssPerformanceMonitor.disconnect();
  },
};

// Initialize optimizations when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', systemOptimization.init);
} else {
  systemOptimization.init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', systemOptimization.cleanup);

export default systemOptimization;