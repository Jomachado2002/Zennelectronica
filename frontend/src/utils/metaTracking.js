// frontend/src/utils/metaTracking.js
// Utilidades optimizadas para tu modelo de negocio (sin login, enfoque en leads)

/* eslint-disable no-undef */
// fbq es una variable global definida por el Meta Pixel

export const MetaTracking = {
  // ✅ EVENTO PRINCIPAL: WhatsApp Click - ESTE ES TU OBJETIVO PRINCIPAL
  trackWhatsAppClick: (productData = {}) => {
    if (typeof fbq !== 'undefined') {
      // Evento de Lead (más importante para tu negocio)
      fbq('track', 'Lead', {
        content_name: productData.productName || 'Consulta Producto',
        content_category: productData.category || 'general',
        value: productData.sellingPrice || 0,
        currency: 'PYG',
        content_type: 'product'
      });
      
      // Evento de Contact
      fbq('track', 'Contact', {
        content_name: productData.productName || 'Producto',
        content_category: productData.category || 'general',
        value: productData.sellingPrice || 0,
        currency: 'PYG'
      });
      
      // Evento personalizado para métricas internas
      fbq('trackCustom', 'WhatsAppProductInquiry', {
        product_name: productData.productName,
        product_id: productData._id,
        product_price: productData.sellingPrice,
        product_brand: productData.brandName,
        source_page: window.location.pathname,
        timestamp: new Date().toISOString()
      });
      
      
    }
  },

  // ✅ EVENTO SECUNDARIO: Generación de Presupuesto PDF
  trackBudgetGeneration: (budgetData = {}) => {
    if (typeof fbq !== 'undefined') {
      // Este es un lead calificado (tomó tiempo en generar presupuesto)
      fbq('track', 'Lead', {
        content_name: 'Presupuesto Generado',
        value: budgetData.totalPrice || 0,
        currency: 'PYG',
        content_category: 'budget'
      });
      
      fbq('trackCustom', 'BudgetGenerated', {
        total_value: budgetData.totalPrice,
        num_items: budgetData.totalQty,
        customer_name: budgetData.customerName,
        has_contact_info: !!(budgetData.customerPhone || budgetData.customerEmail)
      });
      
      
    }
  },

  // ✅ EVENTO TERCIARIO: WhatsApp desde presupuesto (lead muy calificado)
  trackWhatsAppFromBudget: (budgetData = {}) => {
    if (typeof fbq !== 'undefined') {
      // Este es un lead MUY calificado
      fbq('track', 'Lead', {
        content_name: 'Presupuesto WhatsApp',
        value: budgetData.totalPrice || 0,
        currency: 'PYG',
        content_category: 'qualified_budget'
      });
      
      fbq('trackCustom', 'QualifiedBudgetInquiry', {
        total_value: budgetData.totalPrice,
        num_items: budgetData.totalQty,
        customer_name: budgetData.customerName
      });
      
      
    }
  },

  // ⚠️ USAR CON MODERACIÓN: Solo para productos de alto valor
  trackHighValueProductView: (productData = {}) => {
    // Solo trackear si el producto vale más de 1,000,000 PYG
    if (productData.sellingPrice && productData.sellingPrice > 1000000) {
      if (typeof fbq !== 'undefined') {
        fbq('track', 'ViewContent', {
          content_name: productData.productName,
          content_category: productData.category,
          content_ids: [productData._id],
          content_type: 'product',
          value: productData.sellingPrice,
          currency: 'PYG'
        });
        
        
      }
    }
  },

  // ⚠️ USAR SOLO PARA CATEGORÍAS ESTRATÉGICAS
  trackStrategicCategoryView: (categoryData = {}) => {
    // Solo trackear categorías principales como 'informatica'
    const strategicCategories = ['informatica', 'perifericos'];
    
    if (strategicCategories.includes(categoryData.category)) {
      if (typeof fbq !== 'undefined') {
        fbq('trackCustom', 'StrategicCategoryView', {
          category: categoryData.category,
          subcategory: categoryData.subcategory || '',
          num_products: categoryData.productCount || 0
        });
        
        
      }
    }
  },

  // ❌ REMOVIDO: AddToCart (no es relevante sin compras reales)
  // ❌ REMOVIDO: InitiateCheckout (no es relevante sin compras reales)
  // ❌ REMOVIDO: Search tracking (genera ruido innecesario)
};