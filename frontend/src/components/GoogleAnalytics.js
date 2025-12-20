// frontend/src/components/GoogleAnalytics.js
// Componente para tracking avanzado de Google Analytics 4
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GoogleAnalytics = () => {
  const location = useLocation();

  // Función helper para trackear eventos en GA4
  const trackEvent = (eventName, eventParams = {}) => {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', eventName, eventParams);
    }
  };

  // Trackear cambio de página cuando cambia la ruta
  useEffect(() => {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('config', 'G-M2BDLSJF39', {
        page_path: location.pathname + location.search,
        page_title: document.title
      });
      
      // Trackear evento de vista de página
      trackEvent('page_view', {
        page_path: location.pathname,
        page_title: document.title
      });
    }
  }, [location]);

  // Función global para trackear eventos personalizados desde otros componentes
  useEffect(() => {
    window.trackGAEvent = trackEvent;
    
    return () => {
      delete window.trackGAEvent;
    };
  }, []);

  return null;
};

// Funciones helper exportadas para usar en otros componentes
export const trackGAEvent = (eventName, eventParams = {}) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, eventParams);
  }
};

// Tracking específico para e-commerce
export const trackProductView = (product) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'view_item', {
      currency: 'PYG',
      value: product.sellingPrice || product.price || 0,
      items: [{
        item_id: product._id || product.id,
        item_name: product.productName || product.name,
        item_category: product.category || 'general',
        item_category2: product.subcategory || '',
        item_brand: product.brandName || product.brand || '',
        price: product.sellingPrice || product.price || 0,
        quantity: 1
      }]
    });
  }
};

export const trackAddToCart = (product, quantity = 1) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'add_to_cart', {
      currency: 'PYG',
      value: (product.sellingPrice || product.price || 0) * quantity,
      items: [{
        item_id: product._id || product.id,
        item_name: product.productName || product.name,
        item_category: product.category || 'general',
        item_category2: product.subcategory || '',
        item_brand: product.brandName || product.brand || '',
        price: product.sellingPrice || product.price || 0,
        quantity: quantity
      }]
    });
  }
};

export const trackPurchase = (transaction) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'purchase', {
      transaction_id: transaction.id || transaction.transaction_id,
      value: transaction.total || transaction.amount || 0,
      currency: 'PYG',
      items: transaction.items || []
    });
  }
};

export const trackSearch = (searchTerm) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'search', {
      search_term: searchTerm
    });
  }
};

export const trackWhatsAppClick = (product = null) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'contact', {
      method: 'whatsapp',
      content_name: product?.productName || 'Consulta General',
      content_category: product?.category || 'general',
      value: product?.sellingPrice || 0,
      currency: 'PYG'
    });
  }
};

export const trackCategoryView = (category, subcategory = null) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'view_item_list', {
      item_list_id: category,
      item_list_name: subcategory || category,
      items: []
    });
  }
};

export default GoogleAnalytics;

