// frontend/src/components/MetaPixelTracker.js - VERSIÓN CORREGIDA
import { useEffect } from 'react';

const MetaPixelTracker = () => {
  useEffect(() => {
    // Función para cargar Meta Pixel
    const loadMetaPixel = () => {
      // Meta Pixel Code - Versión actualizada con nuevo Pixel ID
      const initPixel = function(f,b,e,v,n,t,s) {
        if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s);
      };
     
      // Ejecutar la función
      initPixel(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
     
      // Inicializar pixel con el nuevo Pixel ID
      if (typeof window.fbq !== 'undefined') {
        window.fbq('init', '1535652171192853');
        window.fbq('track', 'PageView');
      }
    };
     
    // Cargar el pixel
    loadMetaPixel();
  }, []);

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
    if (!product || !product._id) return '';
    
    const id = product._id.toString();
    const brand = (product.brandName || 'prod').substring(0, 3).toLowerCase().replace(/[^a-z0-9]/g, '');
    const category = (product.subcategory || product.category || 'item').substring(0, 3).toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return `${brand}${category}${id}`.substring(0, 50);
};

// ✅ FUNCIÓN HELPER PARA NORMALIZAR CONTENT_IDS
const normalizeContentId = (productData) => {
  if (!productData) return [];
  
  // ✅ USAR LA MISMA FUNCIÓN QUE EL FEED DE CHANNABLE
  const cleanId = generateCleanId(productData);
  return cleanId ? [cleanId] : [];
};

// ✅ FUNCIÓN PARA TRACKEAR CONTACTO POR WHATSAPP
export const trackWhatsAppContact = (productData = null) => {
  
     
  if (typeof window.fbq !== 'undefined') {
    const contentIds = normalizeContentId(productData);
    
    window.fbq('track', 'Contact', {
      content_ids: contentIds, // ✅ Usar IDs normalizados
      content_name: productData?.productName || 'Consulta General',
      content_category: getProductCategory(productData),
      value: productData?.sellingPrice || 0,
      currency: 'PYG'
    });
         
    window.fbq('trackCustom', 'WhatsAppContact', {
      content_ids: contentIds, // ✅ También aquí
      product_name: productData?.productName || 'Consulta General',
      source: 'website_button',
      timestamp: Date.now()
    });
         
    
  } else {
    // console.warn removed for production
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
  
     
  if (typeof window.fbq !== 'undefined') {
    const contentIds = normalizeContentId(product);
    
    window.fbq('track', 'AddToCart', {
      content_ids: contentIds, // ✅ IDs normalizados
      content_name: product.productName,
      content_category: getProductCategory(product),
      value: product.sellingPrice,
      currency: 'PYG'
    });
         
    
  }
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
  
  
  if (typeof window.fbq !== 'undefined') {
    const contentIds = normalizeContentId(product);
    
    window.fbq('track', 'ViewContent', {
      content_ids: contentIds, // ✅ IDs normalizados
      content_name: product.productName,
      content_category: getProductCategory(product),
      value: product.sellingPrice,
      currency: 'PYG'
    });
    
    
  }
};

// ✅ NUEVA FUNCIÓN PARA TRACKEAR INICIO DE CHECKOUT
export const trackInitiateCheckout = (cartItems, totalValue) => {
  
  
  if (typeof window.fbq !== 'undefined') {
    // ✅ Usar generateCleanId para consistencia
    const contentIds = cartItems
      .filter(item => item && item.productId && item.productId._id)
      .map(item => generateCleanId(item.productId))
      .filter(Boolean);
    
    window.fbq('track', 'InitiateCheckout', {
      content_ids: contentIds,
      value: totalValue,
      currency: 'PYG',
      num_items: cartItems.length
    });
    
    
  }
};

// ✅ NUEVA FUNCIÓN PARA TRACKEAR COMPRA COMPLETADA
export const trackPurchase = async (transactionData, cartItems) => {
  if (typeof window.fbq !== 'undefined') {
    // ✅ Generar event_id único para deduplicación
    const transactionId = transactionData.shop_process_id || transactionData.transaction_id;
    const eventId = `purchase_${transactionId}_${Date.now()}`;
    
    // ✅ Usar generateCleanId para consistencia
    const contentIds = cartItems
      .filter(item => item && item.productId && item.productId._id)
      .map(item => generateCleanId(item.productId))
      .filter(Boolean);
    
    // ✅ Trackear con Meta Pixel (client-side)
    window.fbq('track', 'Purchase', {
      content_ids: contentIds,
      value: transactionData.amount,
      currency: 'PYG',
      transaction_id: transactionId,
      num_items: cartItems.length,
      eventID: eventId // ✅ Event ID para deduplicación
    });
    
    // ✅ También enviar al servidor para tracking server-side (deduplicación)
    try {
      // Usar SummaryApi para obtener la URL del backend
      const backendUrl = SummaryApi.baseURL || process.env.REACT_APP_BACKEND_URL || window.location.origin;
      
      if (backendUrl) {
        // Obtener datos del usuario si están disponibles
        const userData = {
          email: transactionData.customer_email,
          phone: transactionData.customer_phone
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
      // No bloquear si falla el tracking server-side
      console.warn('⚠️ Error al enviar tracking al servidor:', error);
    }
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