'use strict';

const crypto = require('crypto');

const API_URL = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

function pixelCode() {
  return String(process.env.TIKTOK_PIXEL_ID || 'DB619J3C77U6DDDLCUBG').trim();
}

function accessToken() {
  return String(process.env.TIKTOK_EVENTS_ACCESS_TOKEN || '').trim();
}

function hashValue(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  return crypto.createHash('sha256').update(text).digest('hex');
}

function catalogId(item = {}) {
  const product = item.productId && typeof item.productId === 'object' ? item.productId : {};
  const raw = String(item.codigo || product.codigo || item.sku || product.sku || item.product_id || product._id || '').trim();
  if (!raw) return '';
  return raw.replace(/[^A-Za-z0-9_-]/g, '_').substring(0, 50);
}

async function sendEvent({
  event,
  eventId,
  value = 0,
  currency = 'PYG',
  contentIds = [],
  userData = {},
  eventSourceUrl = 'https://www.zenn.com.py',
  userAgent = '',
  clientIp = ''
}) {
  const code = pixelCode();
  const token = accessToken();
  if (!code || !token) {
    return { success: false, error: 'TikTok Events API no configurada' };
  }

  const contents = (contentIds || [])
    .filter(Boolean)
    .map((id) => ({ content_id: String(id), content_type: 'product' }));

  const user = {};
  const email = hashValue(userData.email);
  const phone = hashValue(String(userData.phone || '').replace(/\D/g, ''));
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (userData.ttclid) user.ttclid = String(userData.ttclid);
  if (userData.ttp) user.ttp = String(userData.ttp);
  if (clientIp) user.ip = String(clientIp);
  if (userAgent) user.user_agent = String(userAgent);

  const body = {
    event_source: 'web',
    event_source_id: code,
    data: [{
      event,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId || `${event}_${Date.now()}`,
      user,
      page: { url: eventSourceUrl || 'https://www.zenn.com.py' },
      properties: {
        currency,
        value: Number(value) || 0,
        contents,
        content_type: 'product'
      }
    }]
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Access-Token': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || Number(payload.code) !== 0) {
    return { success: false, error: payload.message || 'TikTok rechazó el evento', details: payload };
  }
  return { success: true, event_id: body.data[0].event_id };
}

async function trackStoredPurchase(transaction, extras = {}) {
  if (!transaction?.shop_process_id) return { success: false, error: 'Sin pedido' };
  const items = transaction.items || [];
  const info = transaction.customer_info || {};
  const click = transaction.browser_info || {};
  return sendEvent({
    event: 'CompletePayment',
    eventId: `purchase_${transaction.shop_process_id}`,
    value: parseFloat(transaction.amount || 0),
    currency: transaction.currency || 'PYG',
    contentIds: items.map((item) => catalogId(item)).filter(Boolean),
    userData: {
      email: info.email,
      phone: info.phone,
      ttclid: click.ttclid || extras.ttclid,
      ttp: click.ttp || extras.ttp
    },
    eventSourceUrl: extras.eventSourceUrl || 'https://www.zenn.com.py/pago-exitoso',
    userAgent: extras.userAgent || transaction.user_agent,
    clientIp: extras.clientIp || transaction.ip_address
  });
}

module.exports = {
  sendEvent,
  trackStoredPurchase
};
