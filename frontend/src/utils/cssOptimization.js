// CSS optimization utilities
export const cssOptimization = {
  // Critical CSS extraction
  extractCriticalCSS: () => {
    const criticalSelectors = [
      'body',
      '#root',
      '.loading-skeleton',
      '.optimized-image-container',
      '.virtualized-list-container',
      '.skeleton-item',
      '.skeleton-product',
      '.skeleton-card',
      '.skeleton-list-item',
    ];

    const criticalCSS = criticalSelectors.map(selector => {
      const element = document.querySelector(selector);
      if (element) {
        const styles = window.getComputedStyle(element);
        return `${selector} { ${styles.cssText} }`;
      }
      return '';
    }).join('\n');

    return criticalCSS;
  },

  // Lazy load non-critical CSS
  loadCSS: (href, media = 'all') => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.media = media;
      
      link.onload = () => resolve(link);
      link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
      
      document.head.appendChild(link);
    });
  },

  // Preload CSS
  preloadCSS: (href) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    link.onload = function() {
      this.rel = 'stylesheet';
    };
    document.head.appendChild(link);
  },

  // Inline critical CSS
  inlineCriticalCSS: (css) => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.insertBefore(style, document.head.firstChild);
  },

  // Remove unused CSS
  removeUnusedCSS: (selectors) => {
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        // Remove CSS rule if no elements found
        const stylesheets = document.styleSheets;
        for (let i = 0; i < stylesheets.length; i++) {
          try {
            const rules = stylesheets[i].cssRules || stylesheets[i].rules;
            for (let j = 0; j < rules.length; j++) {
              if (rules[j].selectorText === selector) {
                stylesheets[i].deleteRule(j);
                break;
              }
            }
          } catch (e) {
            // Skip cross-origin stylesheets
          }
        }
      }
    });
  },

  // Optimize CSS animations
  optimizeAnimations: () => {
    const style = document.createElement('style');
    style.textContent = `
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `;
    
    // Apply for users who prefer reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.head.appendChild(style);
    }
  },

  // CSS containment
  addContainment: (selector, containment = 'layout style paint') => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      element.style.contain = containment;
    });
  },

  // Will-change optimization
  optimizeWillChange: (selector, property = 'transform') => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      element.style.willChange = property;
      
      // Remove will-change after animation
      element.addEventListener('animationend', () => {
        element.style.willChange = 'auto';
      });
      
      element.addEventListener('transitionend', () => {
        element.style.willChange = 'auto';
      });
    });
  },

  // CSS custom properties optimization
  optimizeCustomProperties: () => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    // Cache frequently used custom properties
    const customProperties = {};
    for (let i = 0; i < computedStyle.length; i++) {
      const property = computedStyle[i];
      if (property.startsWith('--')) {
        customProperties[property] = computedStyle.getPropertyValue(property);
      }
    }
    
    return customProperties;
  },

  // Responsive images with CSS
  generateResponsiveCSS: (breakpoints = [320, 640, 1024, 1920]) => {
    return breakpoints.map(bp => `
      @media (min-width: ${bp}px) {
        .responsive-image {
          width: 100%;
          max-width: ${bp}px;
        }
      }
    `).join('\n');
  },

  // CSS Grid optimization
  optimizeGrid: (containerSelector, itemSelector) => {
    const container = document.querySelector(containerSelector);
    if (container) {
      container.style.display = 'grid';
      container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
      container.style.gap = '1rem';
      
      const items = container.querySelectorAll(itemSelector);
      items.forEach(item => {
        item.style.contain = 'layout style paint';
      });
    }
  },

  // Flexbox optimization
  optimizeFlexbox: (containerSelector, itemSelector) => {
    const container = document.querySelector(containerSelector);
    if (container) {
      container.style.display = 'flex';
      container.style.flexWrap = 'wrap';
      container.style.gap = '1rem';
      
      const items = container.querySelectorAll(itemSelector);
      items.forEach(item => {
        item.style.flex = '1 1 250px';
        item.style.minWidth = '250px';
      });
    }
  },

  // CSS loading states
  addLoadingStates: () => {
    const style = document.createElement('style');
    style.textContent = `
      .loading {
        opacity: 0.6;
        pointer-events: none;
      }
      
      .loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        margin: -10px 0 0 -10px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  },

  // Dark mode optimization
  optimizeDarkMode: () => {
    const style = document.createElement('style');
    style.textContent = `
      @media (prefers-color-scheme: dark) {
        :root {
          --bg-color: #1a1a1a;
          --text-color: #ffffff;
          --border-color: #333333;
        }
      }
    `;
    document.head.appendChild(style);
  },

  // Print styles optimization
  optimizePrint: () => {
    const style = document.createElement('style');
    style.media = 'print';
    style.textContent = `
      * {
        background: transparent !important;
        color: black !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }
      
      a, a:visited {
        text-decoration: underline;
      }
      
      .no-print {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  },
};

// CSS performance monitoring
export class CSSPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
  }

  // Monitor CSS loading time
  monitorCSSLoading: (href) => {
    const startTime = performance.now();
    
    return cssOptimization.loadCSS(href).then(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.metrics.set(`css_${href}`, {
        duration,
        timestamp: Date.now(),
      });
      
      return duration;
    });
  },

  // Monitor paint timing
  monitorPaintTiming: () => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.metrics.set(`paint_${entry.name}`, {
            duration: entry.startTime,
            timestamp: Date.now(),
          });
        });
        resolve(entries);
      });
      
      observer.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', observer);
    });
  },

  // Monitor layout shifts
  monitorLayoutShifts: () => {
    return new Promise((resolve) => {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        
        this.metrics.set('cls', {
          value: clsValue,
          timestamp: Date.now(),
        });
        
        resolve(clsValue);
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', observer);
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

// Create global CSS performance monitor
export const cssPerformanceMonitor = new CSSPerformanceMonitor();

export default cssOptimization;
