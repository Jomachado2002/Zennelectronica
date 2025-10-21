class CacheService {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100; // Maximum number of cached items
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  // Generate cache key
  generateKey(url, options = {}) {
    const { method = 'GET', body, headers } = options;
    return JSON.stringify({ url, method, body, headers });
  }

  // Set cache item
  set(key, data, ttl = this.defaultTTL) {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const item = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, item);
  }

  // Get cache item
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  // Check if key exists and is valid
  has(key) {
    return this.get(key) !== null;
  }

  // Delete specific key
  delete(key) {
    return this.cache.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Get cache size
  size() {
    return this.cache.size;
  }

  // Cache with automatic key generation
  cacheRequest(url, options = {}, ttl = this.defaultTTL) {
    const key = this.generateKey(url, options);
    
    return {
      get: () => this.get(key),
      set: (data) => this.set(key, data, ttl),
      has: () => this.has(key),
      delete: () => this.delete(key),
    };
  }

  // Cache with custom key
  cacheWithKey(key, data, ttl = this.defaultTTL) {
    return {
      get: () => this.get(key),
      set: (data) => this.set(key, data, ttl),
      has: () => this.has(key),
      delete: () => this.delete(key),
    };
  }

  // Clean expired items
  cleanExpired() {
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const item of this.cache.values()) {
      if (now - item.timestamp > item.ttl) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize,
    };
  }

  // Persist cache to localStorage (for page refresh)
  persist() {
    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem('app_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to persist cache:', error);
    }
  }

  // Restore cache from localStorage
  restore() {
    try {
      const cacheData = localStorage.getItem('app_cache');
      if (cacheData) {
        const entries = JSON.parse(cacheData);
        this.cache = new Map(entries);
        
        // Clean expired items after restore
        this.cleanExpired();
      }
    } catch (error) {
      console.warn('Failed to restore cache:', error);
    }
  }

  // Cache with automatic persistence
  persistentCache(key, data, ttl = this.defaultTTL) {
    this.set(key, data, ttl);
    this.persist();
    
    return {
      get: () => this.get(key),
      set: (data) => {
        this.set(key, data, ttl);
        this.persist();
      },
      has: () => this.has(key),
      delete: () => {
        this.delete(key);
        this.persist();
      },
    };
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Auto-restore cache on initialization
cacheService.restore();

// Clean expired items every 5 minutes
setInterval(() => {
  cacheService.cleanExpired();
}, 5 * 60 * 1000);

// Persist cache before page unload
window.addEventListener('beforeunload', () => {
  cacheService.persist();
});

export default cacheService;
