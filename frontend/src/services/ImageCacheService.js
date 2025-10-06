// frontend/src/services/ImageCacheService.js - ARCHIVO NUEVO
class ImageCacheService {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  async preloadImages(urls, priority = 'high') {
    
    
    const promises = urls.map(url => this.loadImage(url, priority));
    const results = await Promise.allSettled(promises);
    
    const loaded = results.filter(r => r.status === 'fulfilled').length;
    
    
    return results;
  }

  async loadImage(url, priority = 'normal') {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }

    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      
      if (priority === 'high') {
        img.fetchPriority = 'high';
        img.loading = 'eager';
      } else {
        img.loading = 'lazy';
      }
      
      img.onload = () => {
        this.cache.set(url, img);
        this.loadingPromises.delete(url);
        resolve(img);
      };
      
      img.onerror = () => {
        this.loadingPromises.delete(url);
        reject(new Error(`Failed to load: ${url}`));
      };
      
      img.src = url;
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  isImageCached(url) {
    return this.cache.has(url);
  }

  getCachedImage(url) {
    return this.cache.get(url);
  }

  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

export const imageCache = new ImageCacheService();