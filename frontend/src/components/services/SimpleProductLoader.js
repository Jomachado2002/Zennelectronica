class SimpleProductLoader {
  constructor() {
    this.cache = new Map();
    this.loading = new Set();
    // Configuración ultra simple
    this.ITEMS_PER_BATCH = window.innerWidth < 768 ? 12 : 20;
    this.CACHE_TIME = 5 * 60 * 1000; // 5 minutos
  }

  async loadProducts(category, subcategory = null, options = {}) {
    const cacheKey = `${category}_${subcategory || 'all'}`;
    
    // Cache hit inmediato
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TIME) {
      return cached.data;
    }

    // Evitar cargas duplicadas
    if (this.loading.has(cacheKey)) {
      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          const newCached = this.cache.get(cacheKey);
          if (newCached && !this.loading.has(cacheKey)) {
            clearInterval(checkInterval);
            resolve(newCached.data);
          }
        }, 50);
      });
    }

    this.loading.add(cacheKey);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/productos-por-categoria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subcategory })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Preparar datos optimizados
        const optimizedData = this.optimizeData(result.data || []);
        
        this.cache.set(cacheKey, {
          data: optimizedData,
          timestamp: Date.now()
        });
        
        return optimizedData;
      }
      
      return [];
    } catch (error) {
      console.error('Error loading products:', error);
      return [];
    } finally {
      this.loading.delete(cacheKey);
    }
  }

  optimizeData(products) {
    return products.map(product => ({
      _id: product._id,
      productName: product.productName,
      sellingPrice: product.sellingPrice,
      price: product.price,
      productImage: product.productImage || [],
      subcategory: product.subcategory,
      slug: product.slug,
      brandName: product.brandName,
      stock: product.stock,
      category: product.category
    }));
  }

  clearCache() {
    this.cache.clear();
  }
}

export const productLoader = new SimpleProductLoader();