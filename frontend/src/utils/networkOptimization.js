// Network optimization utilities
export const networkOptimization = {
  // Request queue for managing concurrent requests
  requestQueue: new Map(),
  maxConcurrentRequests: 6,
  activeRequests: 0,

  // Queue management
  queueRequest: (url, options) => {
    return new Promise((resolve, reject) => {
      const requestId = `${url}_${Date.now()}`;
      
      networkOptimization.requestQueue.set(requestId, {
        url,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
      });
      
      networkOptimization.processQueue();
    });
  },

  processQueue: () => {
    if (networkOptimization.activeRequests >= networkOptimization.maxConcurrentRequests) {
      return;
    }

    const nextRequest = networkOptimization.getNextRequest();
    if (!nextRequest) return;

    networkOptimization.activeRequests++;
    
    fetch(nextRequest.url, nextRequest.options)
      .then(nextRequest.resolve)
      .catch(nextRequest.reject)
      .finally(() => {
        networkOptimization.activeRequests--;
        networkOptimization.requestQueue.delete(nextRequest.id);
        networkOptimization.processQueue();
      });
  },

  getNextRequest: () => {
    const requests = Array.from(networkOptimization.requestQueue.entries());
    if (requests.length === 0) return null;

    // Sort by timestamp (FIFO)
    requests.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const [id, request] = requests[0];
    return { id, ...request };
  },

  // Optimized fetch with retry logic
  fetchWithRetry: async (url, options = {}, retryCount = 3) => {
    const { retryDelay = 1000, ...fetchOptions } = options;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok && attempt < retryCount) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return response;
      } catch (error) {
        if (attempt === retryCount) {
          throw error;
        }
        
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  // Batch requests
  batchRequests: async (requests) => {
    const results = await Promise.allSettled(
      requests.map(request => 
        networkOptimization.fetchWithRetry(request.url, request.options)
      )
    );
    
    return results.map((result, index) => ({
      ...requests[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));
  },

  // Request deduplication
  requestCache: new Map(),
  
  deduplicateRequest: (url, options) => {
    const key = JSON.stringify({ url, options });
    
    if (networkOptimization.requestCache.has(key)) {
      return networkOptimization.requestCache.get(key);
    }
    
    const requestPromise = networkOptimization.fetchWithRetry(url, options);
    networkOptimization.requestCache.set(key, requestPromise);
    
    // Clean up after request completes
    requestPromise.finally(() => {
      networkOptimization.requestCache.delete(key);
    });
    
    return requestPromise;
  },

  // Connection-aware requests
  getConnectionInfo: () => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    return null;
  },

  // Adaptive quality based on connection
  getAdaptiveQuality: (connectionInfo) => {
    if (!connectionInfo) return 'high';
    
    if (connectionInfo.saveData || connectionInfo.effectiveType === 'slow-2g') {
      return 'low';
    }
    
    if (connectionInfo.effectiveType === '2g' || connectionInfo.effectiveType === '3g') {
      return 'medium';
    }
    
    return 'high';
  },

  // Preload critical resources
  preloadResources: (resources) => {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.url;
      link.as = resource.as || 'fetch';
      
      if (resource.crossorigin) {
        link.crossOrigin = resource.crossorigin;
      }
      
      document.head.appendChild(link);
    });
  },

  // Prefetch resources
  prefetchResources: (resources) => {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource.url;
      
      if (resource.crossorigin) {
        link.crossOrigin = resource.crossorigin;
      }
      
      document.head.appendChild(link);
    });
  },

  // DNS prefetch
  prefetchDNS: (domains) => {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });
  },

  // Connection preconnect
  preconnect: (domains) => {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  },

  // Request timing
  measureRequestTime: async (url, options = {}) => {
    const startTime = performance.now();
    
    try {
      const response = await networkOptimization.fetchWithRetry(url, options);
      const endTime = performance.now();
      
      return {
        success: true,
        response,
        duration: endTime - startTime,
      };
    } catch (error) {
      const endTime = performance.now();
      
      return {
        success: false,
        error,
        duration: endTime - startTime,
      };
    }
  },

  // Resource hints based on user behavior
  addResourceHints: (hints) => {
    hints.forEach(hint => {
      const link = document.createElement('link');
      link.rel = hint.rel;
      link.href = hint.href;
      
      if (hint.as) link.as = hint.as;
      if (hint.crossorigin) link.crossOrigin = hint.crossorigin;
      if (hint.media) link.media = hint.media;
      
      document.head.appendChild(link);
    });
  },

  // Clean up resources
  cleanup: () => {
    networkOptimization.requestQueue.clear();
    networkOptimization.requestCache.clear();
    networkOptimization.activeRequests = 0;
  },
};

// Network status monitoring
export class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.connectionInfo = networkOptimization.getConnectionInfo();
    this.listeners = new Set();
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('online');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline');
    });
    
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        this.connectionInfo = networkOptimization.getConnectionInfo();
        this.notifyListeners('connectionchange');
      });
    }
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event, {
          isOnline: this.isOnline,
          connectionInfo: this.connectionInfo,
        });
      } catch (error) {
        console.error('Network monitor listener error:', error);
      }
    });
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      connectionInfo: this.connectionInfo,
      adaptiveQuality: networkOptimization.getAdaptiveQuality(this.connectionInfo),
    };
  }
}

// Create global network monitor
export const networkMonitor = new NetworkMonitor();

export default networkOptimization;
