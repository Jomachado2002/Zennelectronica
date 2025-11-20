// backend/controller/meta/metaTrackingController.js
// Controlador para tracking de eventos de Meta desde el servidor

const metaConversionsService = require('../../services/metaConversionsService');

/**
 * Endpoint para trackear eventos desde el frontend
 * Permite que el frontend envíe eventos al servidor para tracking server-side
 */
async function trackEventController(req, res) {
  try {
    const {
      eventName,
      eventData = {},
      userData = {},
      eventId = null,
      eventSourceUrl = null
    } = req.body;

    // Validar que se proporcione el nombre del evento
    if (!eventName) {
      return res.status(400).json({
        success: false,
        message: 'eventName es requerido'
      });
    }

    // Obtener información del cliente
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
    const userAgent = req.headers['user-agent'];

    // Enviar evento a Meta
    const result = await metaConversionsService.sendEvent({
      eventName,
      eventData,
      userData,
      eventId,
      eventSourceUrl: eventSourceUrl || req.headers.referer || 'https://www.zenn.com.py',
      userAgent,
      clientIp
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Evento ${eventName} trackeado correctamente`,
        event_id: result.event_id
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Error al trackear evento',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error en trackEventController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Endpoint específico para trackear compras
 */
async function trackPurchaseController(req, res) {
  try {
    const {
      transactionId,
      value,
      currency = 'PYG',
      contentIds = [],
      userData = {},
      eventId = null,
      eventSourceUrl = null
    } = req.body;

    // Validaciones
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'transactionId es requerido'
      });
    }

    if (!value || value <= 0) {
      return res.status(400).json({
        success: false,
        message: 'value debe ser mayor a 0'
      });
    }

    // Obtener información del cliente
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
    const userAgent = req.headers['user-agent'];

    // Trackear compra
    const result = await metaConversionsService.trackPurchase({
      transactionId,
      value,
      currency,
      contentIds,
      userData,
      eventSourceUrl: eventSourceUrl || req.headers.referer || 'https://www.zenn.com.py',
      userAgent,
      clientIp,
      eventId
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Compra trackeada correctamente',
        event_id: result.event_id
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Error al trackear compra',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error en trackPurchaseController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Endpoint de prueba para validar la configuración de Meta Conversions API
 * Usa el test_event_code proporcionado por Meta Events Manager
 */
async function testEventController(req, res) {
  try {
    const {
      testEventCode,
      eventName = 'PageView',
      eventData = {},
      userData = {}
    } = req.body;

    // Validar que se proporcione el código de prueba
    if (!testEventCode) {
      return res.status(400).json({
        success: false,
        message: 'testEventCode es requerido. Obtén el código desde Meta Events Manager → Test Events'
      });
    }

    // Obtener información del cliente
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
    const userAgent = req.headers['user-agent'];

    console.log('🧪 Enviando evento de prueba a Meta con test_event_code:', testEventCode);

    // Enviar evento de prueba a Meta
    const result = await metaConversionsService.sendEvent({
      eventName,
      eventData: {
        ...eventData,
        currency: eventData.currency || 'PYG',
        value: eventData.value || 0
      },
      userData,
      eventSourceUrl: req.headers.referer || 'https://www.zenn.com.py',
      userAgent,
      clientIp,
      testEventCode // ✅ Código de prueba para validación
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: '✅ Evento de prueba enviado correctamente. Verifica en Meta Events Manager → Test Events',
        event_id: result.event_id,
        test_event_code: testEventCode,
        instructions: [
          '1. Ve a Meta Events Manager → Test Events',
          '2. Asegúrate de que la página "Probar eventos" esté abierta',
          '3. Deberías ver el evento aparecer en tiempo real',
          '4. Si aparece, tu configuración está correcta ✅'
        ]
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Error al enviar evento de prueba',
        error: result.error,
        details: result.details,
        troubleshooting: [
          '1. Verifica que META_PIXEL_ID y META_ACCESS_TOKEN estén configurados',
          '2. Verifica que el test_event_code sea correcto',
          '3. Revisa los logs del servidor para más detalles'
        ]
      });
    }
  } catch (error) {
    console.error('❌ Error en testEventController:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

module.exports = {
  trackEventController,
  trackPurchaseController,
  testEventController
};

