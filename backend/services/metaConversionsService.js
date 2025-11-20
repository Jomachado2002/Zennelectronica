// backend/services/metaConversionsService.js
// Servicio para enviar eventos a Meta Conversions API (server-side tracking)

const axios = require('axios');
const crypto = require('crypto');

/**
 * Servicio para tracking de eventos en Meta Conversions API
 * 
 * IMPORTANTE: Necesitas configurar estas variables de entorno:
 * - META_PIXEL_ID: Tu Pixel ID de Meta (ej: 1535652171192853)
 * - META_ACCESS_TOKEN: Tu Access Token de Meta Conversions API
 * - META_API_VERSION: Versión de la API (default: v21.0)
 */
class MetaConversionsService {
  constructor() {
    this.pixelId = process.env.META_PIXEL_ID;
    this.accessToken = process.env.META_ACCESS_TOKEN;
    this.apiVersion = process.env.META_API_VERSION || 'v21.0';
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}/${this.pixelId}/events`;
    
    // Validar configuración
    if (!this.pixelId || !this.accessToken) {
      console.warn('⚠️ Meta Conversions API no configurada. Variables requeridas: META_PIXEL_ID, META_ACCESS_TOKEN');
    }
  }

  /**
   * Hashea datos del usuario para privacidad (SHA256)
   */
  hashUserData(data) {
    if (!data) return '';
    const normalized = String(data).toLowerCase().trim();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Normaliza datos del usuario para envío a Meta
   */
  normalizeUserData(userData = {}) {
    const normalized = {};
    
    if (userData.email) {
      normalized.em = [this.hashUserData(userData.email)];
    }
    if (userData.phone) {
      normalized.ph = [this.hashUserData(userData.phone)];
    }
    if (userData.firstName) {
      normalized.fn = [this.hashUserData(userData.firstName)];
    }
    if (userData.lastName) {
      normalized.ln = [this.hashUserData(userData.lastName)];
    }
    if (userData.city) {
      normalized.ct = [this.hashUserData(userData.city)];
    }
    if (userData.state) {
      normalized.st = [this.hashUserData(userData.state)];
    }
    if (userData.zipCode) {
      normalized.zp = [this.hashUserData(userData.zipCode)];
    }
    if (userData.country) {
      normalized.country = [this.hashUserData(userData.country)];
    }
    
    return normalized;
  }

  /**
   * Genera un event_id único para deduplicación
   */
  generateEventId(eventName, transactionId = null) {
    if (transactionId) {
      return `${eventName}_${transactionId}_${Date.now()}`;
    }
    return `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Envía un evento a Meta Conversions API
   * 
   * @param {Object} params
   * @param {String} params.eventName - Nombre del evento (PageView, Purchase, AddToCart, etc.)
   * @param {Object} params.eventData - Datos del evento
   * @param {Object} params.userData - Datos del usuario (opcional, para matching)
   * @param {String} params.eventId - ID único del evento (para deduplicación)
   * @param {String} params.eventSourceUrl - URL de origen del evento
   * @param {String} params.userAgent - User agent del navegador
   * @param {String} params.clientIp - IP del cliente
   * @param {Number} params.eventTime - Timestamp del evento (Unix timestamp)
   * @param {String} params.testEventCode - Código de prueba de Meta (para validación)
   */
  async sendEvent({
    eventName,
    eventData = {},
    userData = {},
    eventId = null,
    eventSourceUrl = null,
    userAgent = null,
    clientIp = null,
    eventTime = null,
    testEventCode = null
  }) {
    // Validar configuración
    if (!this.pixelId || !this.accessToken) {
      console.warn('⚠️ Meta Conversions API no configurada. Evento no enviado:', eventName);
      return { success: false, error: 'API no configurada' };
    }

    try {
      // Generar event_id si no se proporciona
      const finalEventId = eventId || this.generateEventId(eventName, eventData.transaction_id);

      // Preparar datos del evento
      const event = {
        event_name: eventName,
        event_time: eventTime || Math.floor(Date.now() / 1000),
        event_id: finalEventId,
        event_source_url: eventSourceUrl || 'https://www.zenn.com.py',
        action_source: 'website',
        user_data: this.normalizeUserData(userData),
        custom_data: {
          currency: eventData.currency || 'PYG',
          value: eventData.value || 0,
          ...(eventData.content_ids && { content_ids: eventData.content_ids }),
          ...(eventData.content_name && { content_name: eventData.content_name }),
          ...(eventData.content_category && { content_category: eventData.content_category }),
          ...(eventData.content_type && { content_type: eventData.content_type }),
          ...(eventData.num_items && { num_items: eventData.num_items }),
          ...(eventData.transaction_id && { order_id: eventData.transaction_id })
        }
      };

      // Agregar información del cliente si está disponible
      if (clientIp) {
        event.user_data.client_ip_address = clientIp;
      }
      if (userAgent) {
        event.user_data.client_user_agent = userAgent;
      }

      // Preparar payload para la API
      const payload = {
        data: [event],
        access_token: this.accessToken
      };

      // Agregar test_event_code si se proporciona (para pruebas de validación)
      if (testEventCode) {
        payload.test_event_code = testEventCode;
      }

      // Enviar a Meta
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 segundos de timeout
      });

      if (response.data && response.data.events_received > 0) {
        console.log(`✅ Meta Conversions API: Evento ${eventName} enviado correctamente`, {
          event_id: finalEventId,
          events_received: response.data.events_received
        });
        return {
          success: true,
          event_id: finalEventId,
          response: response.data
        };
      } else {
        console.warn(`⚠️ Meta Conversions API: Respuesta inesperada para ${eventName}`, response.data);
        return {
          success: false,
          error: 'Respuesta inesperada',
          response: response.data
        };
      }
    } catch (error) {
      console.error(`❌ Error enviando evento ${eventName} a Meta Conversions API:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Métodos helper para eventos comunes
   */

  /**
   * Trackea una compra (Purchase)
   */
  async trackPurchase({
    transactionId,
    value,
    currency = 'PYG',
    contentIds = [],
    userData = {},
    eventSourceUrl = null,
    userAgent = null,
    clientIp = null,
    eventId = null
  }) {
    return this.sendEvent({
      eventName: 'Purchase',
      eventData: {
        transaction_id: transactionId,
        value,
        currency,
        content_ids: contentIds,
        content_type: 'product'
      },
      userData,
      eventSourceUrl,
      userAgent,
      clientIp,
      eventId
    });
  }

  /**
   * Trackea inicio de checkout
   */
  async trackInitiateCheckout({
    value,
    currency = 'PYG',
    contentIds = [],
    numItems = 0,
    userData = {},
    eventSourceUrl = null,
    userAgent = null,
    clientIp = null
  }) {
    return this.sendEvent({
      eventName: 'InitiateCheckout',
      eventData: {
        value,
        currency,
        content_ids: contentIds,
        num_items: numItems
      },
      userData,
      eventSourceUrl,
      userAgent,
      clientIp
    });
  }

  /**
   * Trackea agregar al carrito
   */
  async trackAddToCart({
    value,
    currency = 'PYG',
    contentIds = [],
    contentName = null,
    contentCategory = null,
    userData = {},
    eventSourceUrl = null,
    userAgent = null,
    clientIp = null
  }) {
    return this.sendEvent({
      eventName: 'AddToCart',
      eventData: {
        value,
        currency,
        content_ids: contentIds,
        content_name: contentName,
        content_category: contentCategory
      },
      userData,
      eventSourceUrl,
      userAgent,
      clientIp
    });
  }

  /**
   * Trackea visualización de contenido
   */
  async trackViewContent({
    value,
    currency = 'PYG',
    contentIds = [],
    contentName = null,
    contentCategory = null,
    userData = {},
    eventSourceUrl = null,
    userAgent = null,
    clientIp = null
  }) {
    return this.sendEvent({
      eventName: 'ViewContent',
      eventData: {
        value,
        currency,
        content_ids: contentIds,
        content_name: contentName,
        content_category: contentCategory
      },
      userData,
      eventSourceUrl,
      userAgent,
      clientIp
    });
  }

  /**
   * Trackea un lead (contacto/consulta)
   */
  async trackLead({
    value = 0,
    currency = 'PYG',
    contentName = null,
    contentCategory = null,
    userData = {},
    eventSourceUrl = null,
    userAgent = null,
    clientIp = null
  }) {
    return this.sendEvent({
      eventName: 'Lead',
      eventData: {
        value,
        currency,
        content_name: contentName,
        content_category: contentCategory
      },
      userData,
      eventSourceUrl,
      userAgent,
      clientIp
    });
  }

  /**
   * Trackea contacto por WhatsApp
   */
  async trackContact({
    value = 0,
    currency = 'PYG',
    contentName = null,
    contentCategory = null,
    userData = {},
    eventSourceUrl = null,
    userAgent = null,
    clientIp = null
  }) {
    return this.sendEvent({
      eventName: 'Contact',
      eventData: {
        value,
        currency,
        content_name: contentName,
        content_category: contentCategory
      },
      userData,
      eventSourceUrl,
      userAgent,
      clientIp
    });
  }
}

// Exportar instancia singleton
module.exports = new MetaConversionsService();

