// Performance optimization utilities
import React from 'react';

// Lazy load components
export const lazyLoadComponent = (importFunc) => {
  return React.lazy(() => importFunc);
};

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
  fontLink.as = 'style';
  fontLink.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink);

  // Preload critical images
  const criticalImages = [
    '/logozenn.svg',
    '/favicon.ico'
  ];

  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = src;
    link.as = 'image';
    document.head.appendChild(link);
  });
};

// Optimize image loading
export const optimizeImageLoading = () => {
  // Add loading="lazy" to all images that don't have it
  const images = document.querySelectorAll('img:not([loading])');
  images.forEach(img => {
    img.loading = 'lazy';
    img.decoding = 'async';
  });
};

// Reduce JavaScript execution time
export const optimizeJavaScript = () => {
  // Use requestIdleCallback for non-critical tasks
  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => {
      // Non-critical optimizations
      optimizeImageLoading();
    });
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    setTimeout(optimizeImageLoading, 100);
  }
};

// Initialize performance optimizations
export const initPerformanceOptimizations = () => {
  // Run critical optimizations immediately
  preloadCriticalResources();
  
  // Run non-critical optimizations when the browser is idle
  optimizeJavaScript();
};

// Web Vitals monitoring
export const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};
