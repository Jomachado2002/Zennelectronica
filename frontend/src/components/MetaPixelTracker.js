// frontend/src/components/MetaPixelTracker.js - VERSIÓN CORREGIDA
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SummaryApi from '../common';

const PIXEL_ID = '1535652171192853';

const MetaPixelTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (window.fbq) return;
    const n = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    window.fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    window.fbq('init', PIXEL_ID);
    if (!document.querySelector('script[src*="fbevents.js"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (typeof window.fbq !== 'function') return;
    window.fbq('track', 'PageView');
  }, [location.pathname, location.search]);

  return null;
};

// ✅ FUNCIÓN HELPER PARA OBTENER CATEGORY CORRECTA
const getProductCategory = (product) => {
  if (!product) return 'Sin categoría';
  
  // Verificar diferentes posibles ubicaciones de la categoría
  return product.category || 
         product.productId?.category || 
         product.categoryName || 
         'Sin categoría';
};

// ✅ FUNCIÓN PARA GENERAR IDS CONSISTENTES CON CHANNABLE
const generateCleanId = (product) => {
    if (!product) return '';
    const code = String(product.codigo || product.sku || '').trim();
    if (code) return code.replace(/[^A-Za-z0-9_-]/g, '_').substring(0, 50);
    if (product._id) return String(product._id);
    return '';
};

// ✅ FUNCIÓN HELPER PARA NORMALIZAR CONTENT_IDS
const normalizeContentId = (productData) => {
  if (!productData) return [];
  
  // ✅ USAR LA MISMA FUNCIÓN QUE EL FEED DE CHANNABLE
  const cleanId = generateCleanId(productData);
  return cleanId ? [cleanId] : [];
};

function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

export function metaClickIds() {
  return { fbp: readCookie('_fbp'), fbc: readCookie('_fbc') };
}

function send(eventName, data, eventId) {
  if (typeof window.fbq !== 'function') return;
  const options = eventId ? { eventID: eventId } : undefined;
  window.fbq('track', eventName, data, options);
}

function productEvent(product) {
  const id = generateCleanId(product);
  const value = Number(product?.sellingPrice || product?.price || 0) || 0;
  return {
    content_ids: id ? [id] : [],
    content_type: 'product',
    content_name: product?.productName || product?.name || 'Producto',
    content_category: getProductCategory(product),
    value,
    currency: 'PYG',
    contents: id ? [{ id, quantity: 1, item_price: value }] : []
  };
}

let lastSearch = '';

export const trackSearch = (term) => {
  const search = String(term || '').trim();
  const key = search.toLowerCase();
  if (key.length < 2 || key === lastSearch) return;
  lastSearch = key;
  send('Search', { search_string: search.slice(0, 100) });
};

export const trackWhatsAppContact = (productData = null) => {
  const payload = productEvent(productData);
  send('Contact', payload);
  if (typeof window.fbq === 'function') {
    window.fbq('trackCustom', 'WhatsAppContact', {
      content_ids: payload.content_ids,
      content_type: 'product',
      product_name: payload.content_name,
      value: payload.value,
      currency: 'PYG'
    });
  }
};

// ✅ FUNCIÓN PARA TRACKEAR DESCARGA DE PDF
export const trackPDFDownload = (customerData, cartTotal, cartItems = []) => {
  
     
  if (typeof window.fbq !== 'undefined') {
    // ✅ Extraer IDs de todos los productos en el carrito usando generateCleanId
    const contentIds = cartItems
      .filter(item => item && (item.productId || item._id))
      .map(item => {
        const product = item.productId || item;
        return generateCleanId(product);
      })
      .filter(Boolean);
    
    window.fbq('track', 'Lead', {
      content_ids: contentIds, // ✅ IDs consistentes con Channable
      content_name: 'PDF_Presupuesto',
      value: cartTotal,
      currency: 'PYG',
      customer_name: customerData.name
    });
         
    window.fbq('trackCustom', 'PDFDownload', {
      content_ids: contentIds, // ✅ También aquí
      lead_type: 'budget_request',
      customer_provided_info: Boolean(customerData.name),
      cart_items_count: cartItems.length
    });
         
    
  }
};

// ✅ FUNCIÓN PARA TRACKEAR AGREGAR AL CARRITO
export const trackAddToCart = (product) => {
  send('AddToCart', productEvent(product));
};

// ✅ FUNCIÓN PARA TRACKEAR INTERÉS EN PRODUCTO
export const trackProductInterest = (product, interestLevel, score) => {
  if (typeof window.fbq !== 'undefined') {
    const contentIds = normalizeContentId(product);
    
    window.fbq('trackCustom', 'ProductInterest', {
      content_ids: contentIds, // ✅ IDs normalizados
      content_name: product?.productName || 'Producto',
      content_category: getProductCategory(product),
      interest_level: interestLevel,
      score: score,
      timestamp: Date.now()
    });
    
    
  }
};

// ✅ FUNCIÓN PARA TRACKEAR VIEW CONTENT
export const trackViewContent = (product) => {
  send('ViewContent', productEvent(product));
};

// ✅ NUEVA FUNCIÓN PARA TRACKEAR INICIO DE CHECKOUT
export const trackInitiateCheckout = (cartItems, totalValue) => {
  
  
  if (typeof window.fbq !== 'undefined') {
    // ✅ Usar generateCleanId para consistencia
    const contentIds = (cartItems || [])
      .map((item) => generateCleanId(item?.productId || item))
      .filter(Boolean);
    
    send('InitiateCheckout', {
      content_ids: contentIds,
      content_type: 'product',
      value: totalValue,
      currency: 'PYG',
      num_items: cartItems.length
    });
    
    
  }
};

// ✅ NUEVA FUNCIÓN PARA TRACKEAR COMPRA COMPLETADA
export const trackPurchase = async (transactionData, cartItems) => {
  const transactionId = transactionData.shop_process_id || transactionData.transaction_id;
  const eventId = `purchase_${transactionId}`;
  const contentIds = (cartItems || [])
    .map((item) => {
      const product = item?.productId || item || {};
      return generateCleanId({
        codigo: product.codigo || item.codigo || item.sku,
        _id: product._id || item.product_id
      });
    })
    .filter(Boolean);

  send('Purchase', {
    content_ids: contentIds,
    content_type: 'product',
    value: transactionData.amount,
    currency: 'PYG',
    order_id: String(transactionId || ''),
    num_items: (cartItems || []).length
  }, eventId);

  try {
      // Usar SummaryApi para obtener la URL del backend
      const backendUrl = SummaryApi.baseURL || process.env.REACT_APP_BACKEND_URL || window.location.origin;
      
      if (backendUrl) {
        // Obtener datos del usuario si están disponibles
        const click = metaClickIds();
        const userData = {
          email: transactionData.customer_email,
          phone: transactionData.customer_phone,
          fbp: click.fbp,
          fbc: click.fbc
        };

        await fetch(`${backendUrl}/api/meta/track-purchase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            transactionId: String(transactionId),
            value: transactionData.amount,
            currency: 'PYG',
            contentIds: contentIds,
            userData: userData,
            eventId: eventId, // ✅ Mismo event_id para deduplicación
            eventSourceUrl: window.location.href
          })
        });
      }
  } catch (error) {
    console.warn('⚠️ Error al enviar tracking al servidor:', error);
  }
};

// ✅ FUNCIÓN PARA TRACKEAR PAGEVIEW CON CONTEXTO
export const trackPageView = (pageData = {}) => {
  if (typeof window.fbq !== 'undefined') {
    // PageView básico
    window.fbq('track', 'PageView');
    
    // PageView personalizado con contexto si es necesario
    if (pageData.content_ids && pageData.content_ids.length > 0) {
      window.fbq('trackCustom', 'PageViewWithContent', {
        content_ids: pageData.content_ids,
        page_type: pageData.page_type || 'general',
        content_category: pageData.content_category || 'general'
      });
    }
    
    
  }
};

export default MetaPixelTracker;