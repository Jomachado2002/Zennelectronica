// JavaScript optimization utilities
export const jsOptimization = {
  // Code splitting utilities
  codeSplitting: {
    // Dynamic import with error handling
    dynamicImport: (modulePath) => {
      return import(modulePath).catch(error => {
        console.error(`Failed to load module: ${modulePath}`, error);
        return null;
      });
    },

    // Lazy load component
    lazyLoadComponent: (importFunc) => {
      return React.lazy(() => importFunc().catch(error => {
        console.error('Failed to load component:', error);
        return { default: () => React.createElement('div', null, 'Error loading component') };
      }));
    },

    // Preload module
    preloadModule: (modulePath) => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = modulePath;
      document.head.appendChild(link);
    },
  },

  // Memory optimization
  memory: {
    // WeakMap for automatic cleanup
    createWeakCache: () => new WeakMap(),

    // Memory leak prevention
    preventMemoryLeaks: () => {
      // Clear intervals and timeouts
      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }

      // Clear intervals
      const highestIntervalId = setInterval(() => {}, 0);
      for (let i = 0; i < highestIntervalId; i++) {
        clearInterval(i);
      }
    },

    // Garbage collection hint
    suggestGC: () => {
      if (window.gc) {
        window.gc();
      }
    },

    // Monitor memory usage
    getMemoryUsage: () => {
      if ('memory' in performance) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
        };
      }
      return null;
    },
  },

  // Event optimization
  events: {
    // Event delegation
    delegate: (container, selector, eventType, handler) => {
      container.addEventListener(eventType, (e) => {
        if (e.target.matches(selector)) {
          handler(e);
        }
      });
    },

    // Throttled event handler
    throttle: (func, limit) => {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    // Debounced event handler
    debounce: (func, wait, immediate = false) => {
      let timeout;
      return function(...args) {
        const later = () => {
          timeout = null;
          if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
      };
    },

    // Remove event listeners
    removeListeners: (element, events) => {
      events.forEach(event => {
        element.removeEventListener(event.type, event.handler);
      });
    },
  },

  // DOM optimization
  dom: {
    // Batch DOM operations
    batchDOMOperations: (operations) => {
      const fragment = document.createDocumentFragment();
      
      operations.forEach(operation => {
        const element = operation();
        if (element) {
          fragment.appendChild(element);
        }
      });
      
      return fragment;
    },

    // Virtual DOM-like updates
    updateDOM: (element, updates) => {
      const temp = element.cloneNode(true);
      
      Object.keys(updates).forEach(key => {
        if (key.startsWith('data-')) {
          temp.setAttribute(key, updates[key]);
        } else if (key === 'textContent') {
          temp.textContent = updates[key];
        } else if (key === 'innerHTML') {
          temp.innerHTML = updates[key];
        } else {
          temp[key] = updates[key];
        }
      });
      
      element.parentNode.replaceChild(temp, element);
      return temp;
    },

    // Intersection Observer for lazy loading
    createIntersectionObserver: (callback, options = {}) => {
      return new IntersectionObserver(callback, {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      });
    },

    // Resize Observer for responsive updates
    createResizeObserver: (callback) => {
      return new ResizeObserver(callback);
    },
  },

  // Performance optimization
  performance: {
    // Request idle callback
    requestIdleCallback: (callback, options = {}) => {
      if ('requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, options);
      }
      return setTimeout(callback, 1);
    },

    // Cancel idle callback
    cancelIdleCallback: (id) => {
      if ('cancelIdleCallback' in window) {
        return window.cancelIdleCallback(id);
      }
      return clearTimeout(id);
    },

    // Performance measurement
    measure: (name, fn) => {
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      
      console.log(`${name}: ${end - start}ms`);
      return result;
    },

    // Async performance measurement
    measureAsync: async (name, fn) => {
      const start = performance.now();
      const result = await fn();
      const end = performance.now();
      
      console.log(`${name}: ${end - start}ms`);
      return result;
    },

    // Mark performance
    mark: (name) => {
      performance.mark(name);
    },

    // Measure between marks
    measureBetween: (startMark, endMark, name) => {
      performance.measure(name, startMark, endMark);
    },
  },

  // Caching optimization
  cache: {
    // LRU Cache implementation
    createLRUCache: (maxSize = 100) => {
      const cache = new Map();
      
      return {
        get: (key) => {
          if (cache.has(key)) {
            const value = cache.get(key);
            cache.delete(key);
            cache.set(key, value);
            return value;
          }
          return undefined;
        },
        
        set: (key, value) => {
          if (cache.has(key)) {
            cache.delete(key);
          } else if (cache.size >= maxSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
          }
          cache.set(key, value);
        },
        
        has: (key) => cache.has(key),
        delete: (key) => cache.delete(key),
        clear: () => cache.clear(),
        size: () => cache.size,
      };
    },

    // Memoization
    memoize: (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
      const cache = new Map();
      
      return (...args) => {
        const key = keyGenerator(...args);
        
        if (cache.has(key)) {
          return cache.get(key);
        }
        
        const result = fn(...args);
        cache.set(key, result);
        return result;
      };
    },

    // Async memoization
    memoizeAsync: (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
      const cache = new Map();
      
      return async (...args) => {
        const key = keyGenerator(...args);
        
        if (cache.has(key)) {
          return cache.get(key);
        }
        
        const result = await fn(...args);
        cache.set(key, result);
        return result;
      };
    },
  },

  // Web Workers
  workers: {
    // Create worker
    createWorker: (script) => {
      return new Worker(script);
    },

    // Create worker with inline script
    createInlineWorker: (fn) => {
      const blob = new Blob([`(${fn.toString()})()`], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      return new Worker(url);
    },

    // Worker pool
    createWorkerPool: (script, poolSize = navigator.hardwareConcurrency || 4) => {
      const workers = [];
      const queue = [];
      let availableWorkers = 0;

      for (let i = 0; i < poolSize; i++) {
        const worker = new Worker(script);
        workers.push(worker);
        availableWorkers++;
      }

      return {
        execute: (data) => {
          return new Promise((resolve, reject) => {
            if (availableWorkers > 0) {
              const worker = workers.find(w => w.available);
              if (worker) {
                worker.available = false;
                availableWorkers--;

                worker.postMessage(data);
                worker.onmessage = (e) => {
                  worker.available = true;
                  availableWorkers++;
                  resolve(e.data);
                };
                worker.onerror = (e) => {
                  worker.available = true;
                  availableWorkers++;
                  reject(e);
                };
              }
            } else {
              queue.push({ data, resolve, reject });
            }
          });
        },

        terminate: () => {
          workers.forEach(worker => worker.terminate());
        },
      };
    },
  },

  // Bundle optimization
  bundle: {
    // Preload chunks
    preloadChunk: (chunkName) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = `/static/js/${chunkName}.js`;
      document.head.appendChild(link);
    },

    // Prefetch chunks
    prefetchChunk: (chunkName) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'script';
      link.href = `/static/js/${chunkName}.js`;
      document.head.appendChild(link);
    },

    // Load chunk on demand
    loadChunk: (chunkName) => {
      return import(`./chunks/${chunkName}`).catch(error => {
        console.error(`Failed to load chunk: ${chunkName}`, error);
        return null;
      });
    },
  },
};

// JavaScript performance monitoring
export class JSPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
  }

  // Monitor script loading
  monitorScriptLoading: (src) => {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.metrics.set(`script_${src}`, {
          duration,
          timestamp: Date.now(),
        });
        
        resolve(duration);
      };
      script.onerror = () => {
        reject(new Error(`Failed to load script: ${src}`));
      };
      
      document.head.appendChild(script);
    });
  },

  // Monitor memory usage
  monitorMemoryUsage: () => {
    const memory = jsOptimization.memory.getMemoryUsage();
    if (memory) {
      this.metrics.set('memory', {
        ...memory,
        timestamp: Date.now(),
      });
    }
    return memory;
  },

  // Monitor long tasks
  monitorLongTasks: () => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.metrics.set(`longtask_${entry.startTime}`, {
            duration: entry.duration,
            timestamp: Date.now(),
          });
        });
        resolve(entries);
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    });
  },

  // Get performance metrics
  getMetrics: () => {
    return Object.fromEntries(this.metrics);
  },

  // Clear metrics
  clearMetrics: () => {
    this.metrics.clear();
  },

  // Disconnect observers
  disconnect: () => {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  },
};

// Create global JS performance monitor
export const jsPerformanceMonitor = new JSPerformanceMonitor();

export default jsOptimization;
