// Performance configuration and constants
export const PERFORMANCE_CONFIG = {
  // Cache settings
  CACHE: {
    DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
    STALE_TIME: 60 * 1000, // 1 minute
    MAX_SIZE: 100, // Maximum cached items
    PERSIST_KEY: 'app_cache',
  },

  // Image optimization
  IMAGES: {
    DEFAULT_QUALITY: 80,
    PLACEHOLDER: '/placeholder.jpg',
    LAZY_LOADING: true,
    WEBP_SUPPORT: true,
    AVIF_SUPPORT: false, // Enable when browser support improves
  },

  // Scroll optimization
  SCROLL: {
    THROTTLE_DELAY: 16, // ~60fps
    DEBOUNCE_DELAY: 100,
    INTERSECTION_THRESHOLD: 0.1,
    INTERSECTION_ROOT_MARGIN: '50px',
  },

  // Virtualization
  VIRTUALIZATION: {
    DEFAULT_ITEM_HEIGHT: 60,
    OVERSCAN: 5,
    CONTAINER_HEIGHT: 400,
  },

  // Network optimization
  NETWORK: {
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000,
    TIMEOUT: 10000, // 10 seconds
    CONCURRENT_REQUESTS: 6,
  },

  // Bundle optimization
  BUNDLE: {
    CHUNK_SIZE: 250000, // 250KB
    PREFETCH_DELAY: 2000, // 2 seconds
    PRELOAD_CRITICAL: true,
  },

  // Animation settings
  ANIMATIONS: {
    DURATION: 300,
    EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
    REDUCED_MOTION: false,
  },
};

// Feature detection
export const FEATURES = {
  WEBP: () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('webp') > -1;
  },
  
  AVIF: () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('avif') > -1;
  },
  
  INTERSECTION_OBSERVER: () => {
    return 'IntersectionObserver' in window;
  },
  
  RESIZE_OBSERVER: () => {
    return 'ResizeObserver' in window;
  },
  
  REQUEST_IDLE_CALLBACK: () => {
    return 'requestIdleCallback' in window;
  },
  
  WEB_WORKERS: () => {
    return typeof Worker !== 'undefined';
  },
  
  SERVICE_WORKER: () => {
    return 'serviceWorker' in navigator;
  },
  
  PUSH_NOTIFICATIONS: () => {
    return 'PushManager' in window;
  },
  
  NOTIFICATIONS: () => {
    return 'Notification' in window;
  },
  
  GEOLOCATION: () => {
    return 'geolocation' in navigator;
  },
  
  DEVICE_MEMORY: () => {
    return 'deviceMemory' in navigator;
  },
  
  HARDWARE_CONCURRENCY: () => {
    return 'hardwareConcurrency' in navigator;
  },
  
  CONNECTION: () => {
    return 'connection' in navigator;
  },
};

// Performance monitoring
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
  }

  // Start measuring
  start(name) {
    this.metrics.set(name, {
      start: performance.now(),
      end: null,
      duration: null,
    });
  }

  // End measuring
  end(name) {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.end = performance.now();
      metric.duration = metric.end - metric.start;
    }
    return metric?.duration;
  }

  // Get metric
  get(name) {
    return this.metrics.get(name);
  }

  // Get all metrics
  getAll() {
    return Object.fromEntries(this.metrics);
  }

  // Clear metrics
  clear() {
    this.metrics.clear();
  }

  // Measure function execution
  measure(name, fn) {
    this.start(name);
    const result = fn();
    this.end(name);
    return result;
  }

  // Measure async function execution
  async measureAsync(name, fn) {
    this.start(name);
    const result = await fn();
    this.end(name);
    return result;
  }

  // Observe performance entries
  observe(type, callback) {
    if (this.observers.has(type)) {
      this.observers.get(type).disconnect();
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback(entry);
      }
    });

    observer.observe({ entryTypes: [type] });
    this.observers.set(type, observer);

    return observer;
  }

  // Get performance entries
  getEntries(type, name) {
    return performance.getEntriesByType(type).filter(entry => 
      !name || entry.name.includes(name)
    );
  }

  // Get navigation timing
  getNavigationTiming() {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (!navigation) return null;

    return {
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      request: navigation.responseStart - navigation.requestStart,
      response: navigation.responseEnd - navigation.responseStart,
      dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      load: navigation.loadEventEnd - navigation.loadEventStart,
      total: navigation.loadEventEnd - navigation.navigationStart,
    };
  }

  // Get resource timing
  getResourceTiming() {
    return performance.getEntriesByType('resource');
  }

  // Get paint timing
  getPaintTiming() {
    const paintEntries = performance.getEntriesByType('paint');
    return {
      firstPaint: paintEntries.find(entry => entry.name === 'first-paint'),
      firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint'),
    };
  }

  // Get largest contentful paint
  getLCP() {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry);
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    });
  }

  // Get first input delay
  getFID() {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0];
        resolve(firstEntry);
      });
      observer.observe({ entryTypes: ['first-input'] });
    });
  }

  // Get cumulative layout shift
  getCLS() {
    return new Promise((resolve) => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        resolve(clsValue);
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    });
  }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export const utils = {
  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle: (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Request idle callback polyfill
  requestIdleCallback: (callback, options = {}) => {
    if (FEATURES.REQUEST_IDLE_CALLBACK()) {
      return window.requestIdleCallback(callback, options);
    }
    return setTimeout(callback, 1);
  },

  // Cancel idle callback polyfill
  cancelIdleCallback: (id) => {
    if (FEATURES.REQUEST_IDLE_CALLBACK()) {
      return window.cancelIdleCallback(id);
    }
    return clearTimeout(id);
  },

  // Format bytes
  formatBytes: (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  // Format time
  formatTime: (ms, decimals = 2) => {
    if (ms < 1000) return `${ms.toFixed(decimals)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(decimals)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(decimals)}m`;
    return `${(ms / 3600000).toFixed(decimals)}h`;
  },
};

export default PERFORMANCE_CONFIG;