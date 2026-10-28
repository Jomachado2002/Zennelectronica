'use strict';

const crypto = require('crypto');

const HOSTS = {
  staging: 'https://mcstaging.tiendanaranja.com.py',
  production: 'https://tiendanaranja.com.py'
};

let jwtCache = { token: '', exp: 0, environment: '' };

function envName() {
  const raw = String(process.env.TN_ENV || 'staging').toLowerCase();
  return raw === 'production' || raw === 'prod' ? 'production' : 'staging';
}

function baseUrl(environment) {
  return HOSTS[environment || envName()] || HOSTS.staging;
}

function keys() {
  return {
    consumerKey: String(process.env.TN_CONSUMER_KEY || '').trim(),
    consumerSecret: String(process.env.TN_CONSUMER_SECRET || '').trim(),
    accessToken: String(process.env.TN_ACCESS_TOKEN || '').trim(),
    accessTokenSecret: String(process.env.TN_ACCESS_TOKEN_SECRET || '').trim(),
    username: String(process.env.TN_USERNAME || '').trim(),
    password: String(process.env.TN_PASSWORD || '').trim(),
    skuPrefix: String(process.env.TN_SKU_PREFIX || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4),
    sellerId: String(process.env.TN_SELLER_ID || '').trim()
  };
}

function configured() {
  const k = keys();
  return Boolean(k.accessToken || (k.username && k.password));
}

function status() {
  const k = keys();
  return {
    configured: configured(),
    environment: envName(),
    host: baseUrl(),
    hasOauth: Boolean(k.consumerKey && k.consumerSecret && k.accessToken && k.accessTokenSecret),
    hasBearer: Boolean(k.accessToken),
    hasSellerLogin: Boolean(k.username && k.password),
    skuPrefix: k.skuPrefix,
    sellerId: k.sellerId,
    canCreate: Boolean((k.username && k.password) || k.accessToken) && Boolean(k.skuPrefix)
  };
}

function pct(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function messageFrom(data) {
  if (!data) return '';
  if (typeof data === 'string') return data.slice(0, 300);
  if (data.message) return String(data.message).slice(0, 300);
  if (Array.isArray(data) && data[0] && data[0].message) return String(data[0].message).slice(0, 300);
  return '';
}

function oauthHeader(method, url) {
  const k = keys();
  if (!k.consumerKey || !k.accessToken) return '';
  const parsed = new URL(url);
  const oauth = {
    oauth_consumer_key: k.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: k.accessToken,
    oauth_version: '1.0'
  };
  const all = { ...oauth };
  parsed.searchParams.forEach((value, key) => {
    all[key] = value;
  });
  const base = Object.keys(all).sort().map((key) => `${pct(key)}=${pct(all[key])}`).join('&');
  const sigBase = [method.toUpperCase(), pct(`${parsed.origin}${parsed.pathname}`), pct(base)].join('&');
  const signingKey = `${pct(k.consumerSecret)}&${pct(k.accessTokenSecret)}`;
  oauth.oauth_signature = crypto.createHmac('sha256', signingKey).update(sigBase).digest('base64');
  const header = Object.keys(oauth).sort().map((key) => `${key}="${pct(oauth[key])}"`).join(', ');
  return `OAuth ${header}`;
}

async function sellerJwt(environment) {
  const k = keys();
  const env = environment || envName();
  if (!k.username || !k.password) return '';
  if (jwtCache.token && jwtCache.environment === env && jwtCache.exp > Date.now() + 60 * 1000) {
    return jwtCache.token;
  }
  const res = await fetch(`${baseUrl(env)}/rest/V1/integration/customer/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: k.username, password: k.password }),
    signal: AbortSignal.timeout(20000)
  });
  const text = await res.text();
  if (!res.ok) {
    const error = new Error(messageFrom(safeJson(text)) || `Tienda Naranja no aceptó el login (${res.status})`);
    error.status = res.status;
    throw error;
  }
  const parsed = safeJson(text);
  const token = String(parsed || '').replace(/^"|"$/g, '');
  if (!token) {
    const error = new Error('Tienda Naranja no devolvió el token del seller');
    error.status = 502;
    throw error;
  }
  jwtCache = { token, environment: env, exp: Date.now() + 55 * 60 * 1000 };
  return token;
}

function safeJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function request(method, path, { query, body, auth = 'auto', environment } = {}) {
  const env = environment || envName();
  const url = new URL(path.startsWith('http') ? path : `${baseUrl(env)}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
  }
  const k = keys();
  let mode = auth;
  if (mode === 'auto') {
    if (k.accessToken) mode = 'bearer';
    else if (k.username && k.password) mode = 'jwt';
    else mode = 'oauth';
  }
  const headers = { 'Content-Type': 'application/json' };
  if (mode === 'jwt') headers.Authorization = `Bearer ${await sellerJwt(env)}`;
  else if (mode === 'bearer') headers.Authorization = `Bearer ${k.accessToken}`;
  else if (mode === 'oauth') headers.Authorization = oauthHeader(method, url.toString());
  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });
  const data = safeJson(await res.text());
  if (!res.ok) {
    const error = new Error(messageFrom(data) || `Tienda Naranja respondió ${res.status}`);
    error.status = res.status;
    error.body = data;
    error.auth = mode;
    error.environment = env;
    throw error;
  }
  return data;
}

async function probeAuth(environment) {
  const env = environment || envName();
  const attempts = [];
  const checks = [
    { auth: 'bearer', path: '/rest/V1/products', query: { 'searchCriteria[pageSize]': 1, 'searchCriteria[currentPage]': 1 } },
    { auth: 'oauth', path: '/rest/V1/products', query: { 'searchCriteria[pageSize]': 1, 'searchCriteria[currentPage]': 1 } },
    { auth: 'bearer', path: '/rest/V1/mpapi/sellers/me/product' },
    { auth: 'oauth', path: '/rest/V1/mpapi/sellers/me/product' }
  ];
  if (keys().username && keys().password) {
    checks.push({ auth: 'jwt', path: '/rest/V1/mpapi/sellers/me/product' });
  }
  for (const check of checks) {
    const started = Date.now();
    try {
      const data = await request('GET', check.path, { query: check.query, auth: check.auth, environment: env });
      const items = Array.isArray(data) ? data : data && data.items;
      attempts.push({
        ok: true,
        auth: check.auth,
        path: check.path,
        ms: Date.now() - started,
        items: Array.isArray(items) ? items.length : (Array.isArray(data) && data[0] && data[0].items ? data[0].items.length : 0)
      });
    } catch (error) {
      attempts.push({
        ok: false,
        auth: check.auth,
        path: check.path,
        ms: Date.now() - started,
        status: error.status || 0,
        message: error.message
      });
    }
  }
  return {
    environment: env,
    host: baseUrl(env),
    ok: attempts.some((item) => item.ok),
    attempts
  };
}

async function listSellerProducts() {
  return request('GET', '/rest/V1/mpapi/sellers/me/product');
}

async function listCatalog({ page = 1, pageSize = 20, field, value } = {}) {
  const query = {
    'searchCriteria[currentPage]': page,
    'searchCriteria[pageSize]': pageSize
  };
  if (field && value) {
    query['searchCriteria[filter_groups][0][filters][0][field]'] = field;
    query['searchCriteria[filter_groups][0][filters][0][value]'] = value;
  } else if (keys().sellerId) {
    query['searchCriteria[filter_groups][0][filters][0][field]'] = 'seller_id';
    query['searchCriteria[filter_groups][0][filters][0][value]'] = keys().sellerId;
  }
  return request('GET', '/rest/V1/products', { query });
}

async function getBySku(sku, environment) {
  return request('GET', `/rest/V1/products/${encodeURIComponent(sku)}`, {
    environment,
    auth: 'bearer',
    query: { fields: 'id,name,sku,price,extension_attributes[stock_item[qty]]' }
  });
}

async function upsertProduct(payload, environment) {
  return request('POST', '/rest/V1/mpapi/sellers/me/addproduct', { body: payload, environment });
}

async function saveCatalogProduct(sku, product, environment) {
  const env = environment || envName();
  let exists = false;
  try {
    await getBySku(sku, env);
    exists = true;
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  return request(exists ? 'PUT' : 'POST', exists ? `/rest/V1/products/${encodeURIComponent(sku)}` : '/rest/V1/products', {
    environment: env,
    auth: 'bearer',
    body: { product }
  });
}

async function listOrders({ from, to, page = 1, pageSize = 20 } = {}) {
  const query = { current_page: page, page_size: pageSize };
  if (from) query.created_from = from;
  if (to) query.created_to = to;
  return request('GET', '/rest/V2/mpapi/sellers/me/order', { query });
}

async function updateOrderStatus(orderId, items) {
  return request('POST', '/rest/V1/naranja/orders/update-status', {
    body: { orderId, items }
  });
}

module.exports = {
  envName,
  baseUrl,
  keys,
  configured,
  status,
  request,
  probeAuth,
  sellerJwt,
  listSellerProducts,
  listCatalog,
  getBySku,
  upsertProduct,
  saveCatalogProduct,
  listOrders,
  updateOrderStatus
};
