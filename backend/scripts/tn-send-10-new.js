'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/productModel');
const tn = require('../services/tiendaNaranjaClient');
const { skuOf, createPayload, tnPrices, weightOf, readResult } = require('../services/tiendaNaranjaCatalog');
const { formatTnWeight } = require('../services/productWeightService');
const { toMerchantJpegUrl } = require('../helpers/merchantJpeg');

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '').trim()}`;
}

function summarizeError(error) {
  const body = error && error.body;
  const detail = body && (body.message || (Array.isArray(body) && body[0] && body[0].message));
  return {
    status: (error && error.status) || 0,
    auth: (error && error.auth) || '',
    message: String((error && error.message) || detail || 'error').slice(0, 220)
  };
}

async function tryJson(label, method, url, { headers = {}, body } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    });
    const text = await res.text();
    let data = text;
    try { data = text ? JSON.parse(text) : null; } catch { /* keep text */ }
    const token = typeof data === 'string' && data.length > 20 ? data.replace(/^"|"$/g, '') : '';
    return {
      label,
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
      token: token && !/recaptcha|incorrect|disabled/i.test(token) ? `len:${token.length}` : '',
      rawToken: token,
      message: typeof data === 'object' && data && data.message ? String(data.message).slice(0, 180) : String(text).slice(0, 180)
    };
  } catch (error) {
    return { label, ok: false, status: 0, ms: Date.now() - started, message: String(error.message || error).slice(0, 180) };
  }
}

async function findSellerToken() {
  const host = tn.baseUrl('production');
  const username = process.env.TN_USERNAME;
  const password = process.env.TN_PASSWORD;
  const creds = { username, password };
  const attempts = [];
  const paths = [
    '/rest/V1/integration/customer/token',
    '/rest/default/V1/integration/customer/token',
    '/rest/es/V1/integration/customer/token',
    '/rest/all/V1/integration/customer/token',
    '/rest/V1/mpapi/login',
    '/rest/V1/mpapi/sellers/login'
  ];
  for (const path of paths) {
    const result = await tryJson(path, 'POST', `${host}${path}`, { body: creds });
    attempts.push({ ...result, rawToken: undefined });
    if (result.rawToken && result.rawToken.length > 20) return { token: result.rawToken, attempts };
  }

  const graphql = await tryJson('graphql', 'POST', `${host}/graphql`, {
    body: {
      query: 'mutation ($email: String!, $password: String!) { generateCustomerToken(email: $email, password: $password) { token } }',
      variables: { email: username, password }
    }
  });
  const gqlToken = graphql.message && graphql.message.includes('token')
    ? (String(graphql.message).match(/eyJ[a-zA-Z0-9._-]+/) || [])[0]
    : '';
  attempts.push({ ...graphql, rawToken: undefined, token: gqlToken ? `len:${gqlToken.length}` : graphql.token });
  if (gqlToken) return { token: gqlToken, attempts };

  return { token: '', attempts };
}

async function existingSkus() {
  const found = new Set();
  for (let page = 1; page <= 3; page += 1) {
    const catalog = await tn.listCatalog({ page, pageSize: 80, field: 'seller_id', value: process.env.TN_SELLER_ID || '353511' });
    for (const item of catalog.items || []) {
      if (item.sku) found.add(String(item.sku).toUpperCase());
    }
    if (!catalog.items || catalog.items.length < 80) break;
  }
  return found;
}

function buildPayload(product) {
  const payload = createPayload(product);
  const prices = tnPrices(product);
  const images = (product.productImage || [])
    .map((url) => toMerchantJpegUrl(url))
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url) && /\.(jpe?g|png|gif)(\?|#|$)/i.test(url))
    .slice(0, 8);
  payload.product.price = String(prices.price);
  if (prices.promo) payload.product.special_price = String(prices.specialPrice);
  else delete payload.product.special_price;
  payload.product.weight = formatTnWeight(weightOf(product));
  payload.product.short_description = clip(product.productName, 180);
  payload.product.description = product.description || `<p>${clip(product.productName, 180)}</p>`;
  if (images.length) payload.product.product_gallery = images;
  return payload;
}

async function postAddProduct(payload, auth) {
  if (auth.token) {
    return tn.request('POST', '/rest/V1/mpapi/sellers/me/addproduct', {
      environment: 'production',
      auth: 'jwt',
      body: payload
    });
  }
  return tn.upsertProduct(payload, 'production');
}

async function main() {
  const auth = await findSellerToken();
  if (auth.token) {
    tn.sellerJwt._forced = auth.token;
  }

  const remote = await existingSkus();
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 25000 });
  const candidates = await Product.find({
    stock: { $gt: 0 },
    codigo: { $exists: true, $nin: ['', null] },
    productName: { $exists: true, $nin: ['', null] },
    sellingPrice: { $gt: 0 },
    'productImage.0': { $exists: true, $ne: '' }
  })
    .sort({ sellingPrice: 1, stock: -1 })
    .limit(400)
    .lean();

  const picked = [];
  for (const product of candidates) {
    const sku = skuOf(product);
    if (!sku || remote.has(sku.toUpperCase())) continue;
    try {
      await tn.getBySku(sku, 'production');
      continue;
    } catch (error) {
      if (error.status !== 404) continue;
    }
    picked.push(product);
    if (picked.length >= 10) break;
  }

  const sent = [];
  for (const product of picked) {
    const sku = skuOf(product);
    const prices = tnPrices(product);
    try {
      const payload = buildPayload(product);
      let data;
      if (auth.token) {
        const original = tn.sellerJwt;
        tn.sellerJwt = async () => auth.token;
        try {
          data = await tn.request('POST', '/rest/V1/mpapi/sellers/me/addproduct', {
            environment: 'production',
            auth: 'jwt',
            body: payload
          });
        } finally {
          tn.sellerJwt = original;
        }
      } else {
        const attempts = [];
        for (const mode of ['bearer', 'oauth']) {
          try {
            data = await tn.request('POST', '/rest/V1/mpapi/sellers/me/addproduct', {
              environment: 'production',
              auth: mode,
              body: payload
            });
            attempts.push({ mode, ok: true });
            break;
          } catch (error) {
            attempts.push({ mode, ...summarizeError(error) });
          }
        }
        if (!data) {
          throw Object.assign(new Error(attempts.map((item) => `${item.mode}:${item.message}`).join(' | ')), { status: 400, body: attempts });
        }
      }
      const result = readResult(data);
      if (result.error) throw new Error(result.message || 'Tienda Naranja rechazó el alta');
      await Product.updateOne({ _id: product._id }, {
        $set: {
          'tiendaNaranja.entityId': result.productId,
          'tiendaNaranja.sku': sku,
          'tiendaNaranja.environment': 'production',
          'tiendaNaranja.lastSyncAt': new Date(),
          'tiendaNaranja.lastError': ''
        }
      });
      sent.push({
        ok: true,
        sku,
        name: clip(product.productName, 70),
        price: prices.price,
        special: prices.specialPrice || 0,
        weight: formatTnWeight(weightOf(product)),
        stock: product.stock,
        productId: result.productId,
        message: result.message
      });
    } catch (error) {
      await Product.updateOne({ _id: product._id }, {
        $set: {
          'tiendaNaranja.sku': sku,
          'tiendaNaranja.lastError': String(error.message || 'error').slice(0, 240)
        }
      });
      sent.push({
        ok: false,
        sku,
        name: clip(product.productName, 70),
        ...summarizeError(error)
      });
    }
  }

  await mongoose.disconnect();
  console.log(JSON.stringify({
    sellerToken: Boolean(auth.token),
    authAttempts: auth.attempts,
    alreadyOnTn: remote.size,
    picked: picked.length,
    ok: sent.filter((row) => row.ok).length,
    failed: sent.filter((row) => !row.ok).length,
    sent
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error.message, stack: String(error.stack || '').split('\n').slice(0, 4) }, null, 2));
  process.exit(1);
});
