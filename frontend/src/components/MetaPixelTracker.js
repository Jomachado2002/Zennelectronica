// frontend/src/components/MetaPixelTracker.js - VERSIÓN CORREGIDA
import { useEffect } from 'react';

const MetaPixelTracker = () => {
  useEffect(() => {
    // Función para cargar Meta Pixel
    const loadMetaPixel = () => {
      // Meta Pixel Code en una función asignada
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
     
      // Inicializar pixel
      if (typeof window.fbq !== 'undefined') {
        window.fbq('init', '1668993647830344');
        window.fbq('track', 'PageView');
        console.log('✅ Meta Pixel de Zenn cargado correctamente');
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
  console.log('🟢 Tracking WhatsApp contact:', productData?.productName || 'Consulta General');
     
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
         
    console.log('✅ Evento WhatsApp enviado a Meta exitosamente con IDs:', contentIds);
  } else {
    console.warn('⚠️ Meta Pixel no está disponible');
  }
};

// ✅ FUNCIÓN PARA TRACKEAR DESCARGA DE PDF
export const trackPDFDownload = (customerData, cartTotal, cartItems = []) => {
  console.log('🟢 Tracking PDF download');
     
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
         
    console.log('✅ PDF Download enviado a Meta con IDs:', contentIds);
  }
};

// ✅ FUNCIÓN PARA TRACKEAR AGREGAR AL CARRITO
export const trackAddToCart = (product) => {
  console.log('🟢 Tracking Add to Cart:', product?.productName);
     
  if (typeof window.fbq !== 'undefined') {
    const contentIds = normalizeContentId(product);
    
    window.fbq('track', 'AddToCart', {
      content_ids: contentIds, // ✅ IDs normalizados
      content_name: product.productName,
      content_category: getProductCategory(product),
      value: product.sellingPrice,
      currency: 'PYG'
    });
         
    console.log('✅ Add to Cart enviado a Meta con IDs:', contentIds);
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
    
    console.log('✅ Product Interest enviado con IDs:', contentIds);
  }
};

// ✅ FUNCIÓN PARA TRACKEAR VIEW CONTENT
export const trackViewContent = (product) => {
  console.log('🟢 Tracking View Content:', product?.productName);
  
  if (typeof window.fbq !== 'undefined') {
    const contentIds = normalizeContentId(product);
    
    window.fbq('track', 'ViewContent', {
      content_ids: contentIds, // ✅ IDs normalizados
      content_name: product.productName,
      content_category: getProductCategory(product),
      value: product.sellingPrice,
      currency: 'PYG'
    });
    
    console.log('✅ View Content enviado a Meta con IDs:', contentIds);
  }
};

// ✅ NUEVA FUNCIÓN PARA TRACKEAR INICIO DE CHECKOUT
export const trackInitiateCheckout = (cartItems, totalValue) => {
  console.log('🟢 Tracking Initiate Checkout');
  
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
    
    console.log('✅ Initiate Checkout enviado con IDs:', contentIds);
  }
};

// ✅ NUEVA FUNCIÓN PARA TRACKEAR COMPRA COMPLETADA
export const trackPurchase = (transactionData, cartItems) => {
  console.log('🟢 Tracking Purchase');
  
  if (typeof window.fbq !== 'undefined') {
    // ✅ Usar generateCleanId para consistencia
    const contentIds = cartItems
      .filter(item => item && item.productId && item.productId._id)
      .map(item => generateCleanId(item.productId))
      .filter(Boolean);
    
    window.fbq('track', 'Purchase', {
      content_ids: contentIds,
      value: transactionData.amount,
      currency: 'PYG',
      transaction_id: transactionData.shop_process_id || transactionData.transaction_id,
      num_items: cartItems.length
    });
    
    console.log('✅ Purchase enviado con IDs:', contentIds);
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
    
    console.log('✅ PageView enviado');
  }
};

export default MetaPixelTracker;