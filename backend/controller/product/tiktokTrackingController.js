'use strict';

const tiktokEventsService = require('../../services/tiktokEventsService');

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
    } = req.body || {};

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transactionId es requerido' });
    }

    const clientIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0];
    const result = await tiktokEventsService.sendEvent({
      event: 'CompletePayment',
      eventId: eventId || `purchase_${transactionId}`,
      value,
      currency,
      contentIds,
      userData,
      eventSourceUrl: eventSourceUrl || req.headers.referer || 'https://www.zenn.com.py',
      userAgent: req.headers['user-agent'],
      clientIp
    });

    return res.status(result.success ? 200 : 200).json({
      success: result.success,
      message: result.success ? 'Compra enviada a TikTok' : result.error
    });
  } catch (error) {
    return res.status(200).json({ success: false, message: 'No se pudo enviar a TikTok' });
  }
}

async function trackEventController(req, res) {
  try {
    const { eventName, eventData = {}, userData = {}, eventId = null, eventSourceUrl = null } = req.body || {};
    if (!eventName) {
      return res.status(400).json({ success: false, message: 'eventName es requerido' });
    }
    const clientIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0];
    const result = await tiktokEventsService.sendEvent({
      event: eventName,
      eventId,
      value: eventData.value,
      currency: eventData.currency || 'PYG',
      contentIds: eventData.content_ids || eventData.contentIds || [],
      userData,
      eventSourceUrl: eventSourceUrl || req.headers.referer || 'https://www.zenn.com.py',
      userAgent: req.headers['user-agent'],
      clientIp
    });
    return res.json({ success: result.success, message: result.success ? 'Evento enviado' : result.error });
  } catch (error) {
    return res.status(200).json({ success: false, message: 'No se pudo enviar a TikTok' });
  }
}

module.exports = {
  trackPurchaseController,
  trackEventController
};
