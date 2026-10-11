import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SummaryApi from '../common';

const PIXEL_ID = String(process.env.REACT_APP_TIKTOK_PIXEL_ID || 'DB619J3C77U6DDDLCUBG').trim();

function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function writeCookie(name, value, days) {
  if (typeof document === 'undefined' || !value) return;
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function captureTikTokClickId() {
  if (typeof window === 'undefined') return '';
  const fromUrl = String(new URLSearchParams(window.location.search).get('ttclid') || '').trim();
  if (fromUrl) {
    writeCookie('_ttclid', fromUrl, 90);
    return fromUrl;
  }
  return readCookie('_ttclid');
}

export function tiktokClickIds() {
  return {
    ttclid: captureTikTokClickId(),
    ttp: readCookie('_ttp')
  };
}

function generateCleanId(product) {
  if (!product) return '';
  const code = String(product.codigo || product.sku || '').trim();
  if (code) return code.replace(/[^A-Za-z0-9_-]/g, '_').substring(0, 50);
  if (product._id) return String(product._id);
  return '';
}

function productPayload(product) {
  const id = generateCleanId(product);
  const value = Number(product?.sellingPrice || product?.price || 0) || 0;
  return {
    contents: id
      ? [{
          content_id: id,
          content_type: 'product',
          content_name: product?.productName || product?.name || 'Producto'
        }]
      : [],
    content_type: 'product',
    value,
    currency: 'PYG'
  };
}

function ready() {
  return typeof window !== 'undefined' && typeof window.ttq?.track === 'function';
}

function track(event, payload) {
  if (!ready()) return;
  window.ttq.track(event, payload);
}

export function ttPageView() {
  if (typeof window?.ttq?.page === 'function') window.ttq.page();
}

export function ttViewContent(product) {
  track('ViewContent', productPayload(product));
}

export function ttAddToCart(product) {
  track('AddToCart', productPayload(product));
}

export function ttSearch(term) {
  const query = String(term || '').trim().slice(0, 100);
  if (query.length < 2) return;
  track('Search', { query, content_type: 'product' });
}

export function ttContact(product) {
  track('Contact', productPayload(product));
}

export function ttLead(cartItems, value) {
  const contents = (cartItems || [])
    .map((item) => {
      const id = generateCleanId(item?.productId || item);
      return id
        ? { content_id: id, content_type: 'product', content_name: item?.productName || item?.productId?.productName || 'Producto' }
        : null;
    })
    .filter(Boolean);
  track('SubmitForm', { contents, content_type: 'product', value: Number(value) || 0, currency: 'PYG' });
}

export function ttCheckout(cartItems, value) {
  const contents = (cartItems || [])
    .map((item) => {
      const id = generateCleanId(item?.productId || item);
      return id ? { content_id: id, content_type: 'product' } : null;
    })
    .filter(Boolean);
  track('InitiateCheckout', {
    contents,
    content_type: 'product',
    value: Number(value) || 0,
    currency: 'PYG'
  });
}

export function ttPurchase(transactionData, cartItems) {
  const transactionId = transactionData?.shop_process_id || transactionData?.transaction_id;
  const contents = (cartItems || [])
    .map((item) => {
      const product = item?.productId || item || {};
      const id = generateCleanId({
        codigo: product.codigo || item.codigo || item.sku,
        _id: product._id || item.product_id
      });
      return id ? { content_id: id, content_type: 'product', content_name: product.productName || item.productName } : null;
    })
    .filter(Boolean);
  const payload = {
    contents,
    content_type: 'product',
    value: Number(transactionData?.amount) || 0,
    currency: 'PYG'
  };
  if (ready()) {
    window.ttq.track('CompletePayment', payload, { event_id: `purchase_${transactionId}` });
  }
  const click = tiktokClickIds();
  const backendUrl = SummaryApi.baseURL || process.env.REACT_APP_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!backendUrl || !transactionId) return;
  fetch(`${backendUrl}/api/tiktok/track-purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      transactionId: String(transactionId),
      value: Number(transactionData?.amount) || 0,
      currency: 'PYG',
      contentIds: contents.map((item) => item.content_id),
      eventId: `purchase_${transactionId}`,
      eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
      userData: {
        email: transactionData?.customer_email,
        phone: transactionData?.customer_phone,
        ttclid: click.ttclid,
        ttp: click.ttp
      }
    })
  }).catch(() => {});
}

const TikTokPixelTracker = () => {
  const location = useLocation();

  useEffect(() => {
    captureTikTokClickId();
    if (!PIXEL_ID || window.ttq) return;
    const t = 'ttq';
    window.TiktokAnalyticsObject = t;
    const ttq = window[t] = window[t] || [];
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    ttq.setAndDefer = function setAndDefer(target, method) {
      target[method] = function deferred() {
        target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    ttq.methods.forEach((method) => ttq.setAndDefer(ttq, method));
    ttq.instance = function instance(id) {
      const inst = ttq._i[id] || [];
      ttq.methods.forEach((method) => ttq.setAndDefer(inst, method));
      return inst;
    };
    ttq.load = function load(id, opts) {
      const src = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {};
      ttq._i[id] = [];
      ttq._i[id]._u = src;
      ttq._t = ttq._t || {};
      ttq._t[id] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[id] = opts || {};
      const script = document.createElement('script');
      script.async = true;
      script.src = `${src}?sdkid=${id}&lib=${t}`;
      const first = document.getElementsByTagName('script')[0];
      first.parentNode.insertBefore(script, first);
    };
    ttq.load(PIXEL_ID);
    ttq.page();
  }, []);

  useEffect(() => {
    captureTikTokClickId();
    ttPageView();
  }, [location.pathname, location.search]);

  return null;
};

export default TikTokPixelTracker;
