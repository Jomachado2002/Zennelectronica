'use strict';

require('dotenv').config();
const tn = require('../services/tiendaNaranjaClient');
const Product = require('../models/productModel');
const mongoose = require('mongoose');
const { createPayload } = require('../services/tiendaNaranjaCatalog');
const { toMerchantJpegUrl } = require('../helpers/merchantJpeg');

function summarize(error, data, status) {
  if (error) {
    return {
      ok: false,
      status: error.status || 0,
      auth: error.auth || '',
      message: String(error.message || '').slice(0, 220),
      fields: error.body && error.body.parameters ? error.body.parameters : undefined
    };
  }
  return { ok: true, status: status || 200, data: typeof data === 'object' ? data : String(data).slice(0, 180) };
}

async function raw(method, path, { auth = 'bearer', body, headers = {}, cookie } = {}) {
  const url = `${tn.baseUrl('production')}${path}`;
  const k = tn.keys();
  const hdrs = { 'Content-Type': 'application/json', ...headers };
  if (cookie) hdrs.Cookie = cookie;
  else if (auth === 'bearer') hdrs.Authorization = `Bearer ${k.accessToken}`;
  else if (auth === 'oauth') hdrs.Authorization = require('../services/tiendaNaranjaClient').oauthHeader
    ? undefined
    : `Bearer ${k.accessToken}`;
  const res = await fetch(url, {
    method,
    headers: hdrs,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(25000)
  });
  const text = await res.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch { /* keep */ }
  if (!res.ok) {
    const error = new Error((data && data.message) || text.slice(0, 220));
    error.status = res.status;
    error.body = data;
    error.auth = auth;
    throw error;
  }
  return data;
}

async function webLogin() {
  const host = tn.baseUrl('production');
  const jar = [];
  const save = (res) => {
    const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const item of list) jar.push(item.split(';')[0]);
  };
  const cookie = () => jar.join('; ');
  const page = await fetch(`${host}/customer/account/login`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(20000)
  });
  save(page);
  const html = await page.text();
  const formKey = (html.match(/name="form_key"[^>]*value="([^"]+)"/) || html.match(/form_key["']\s*(?:value|:)\s*["']([^"']+)/) || [])[1] || '';
  const body = new URLSearchParams({
    form_key: formKey,
    'login[username]': process.env.TN_USERNAME,
    'login[password]': process.env.TN_PASSWORD,
    send: ''
  });
  const res = await fetch(`${host}/customer/account/loginPost/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie(),
      'User-Agent': 'Mozilla/5.0',
      Referer: `${host}/customer/account/login`
    },
    body,
    redirect: 'manual',
    signal: AbortSignal.timeout(20000)
  });
  save(res);
  const loc = res.headers.get('location') || '';
  return {
    status: res.status,
    formKey: Boolean(formKey),
    location: loc.slice(0, 120),
    cookies: jar.length,
    cookie: cookie()
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const product = await Product.findOne({ codigo: '10320' }).lean();
  await mongoose.disconnect();
  if (!product) throw new Error('no está el 10320');
  const payload = createPayload(product);
  payload.product.product_gallery = (payload.product.product_gallery || []).map(toMerchantJpegUrl);
  const sellerId = String(process.env.TN_SELLER_ID || '353511');
  const variants = [
    { label: 'addproduct+id', path: '/rest/V1/mpapi/sellers/me/addproduct', body: { id: sellerId, ...payload } },
    { label: 'addproduct+seller_id', path: '/rest/V1/mpapi/sellers/me/addproduct', body: { seller_id: sellerId, ...payload } },
    { label: 'sellers/{id}/addproduct', path: `/rest/V1/mpapi/sellers/${sellerId}/addproduct`, body: payload },
    { label: 'addproduct nested id', path: '/rest/V1/mpapi/sellers/me/addproduct', body: { ...payload, product: { ...payload.product, id: sellerId } } },
    { label: 'catalog POST', path: '/rest/V1/products', body: {
      product: {
        sku: payload.product.sku,
        name: payload.product.name,
        price: Number(payload.product.price),
        weight: Number(payload.product.weight),
        status: 1,
        visibility: 4,
        type_id: 'simple',
        attribute_set_id: 4,
        extension_attributes: {
          stock_item: { qty: Number(payload.product.quantity_and_stock_status.qty), is_in_stock: true },
          category_links: payload.product.category_ids.map((id, position) => ({ position, category_id: String(id) }))
        },
        custom_attributes: [
          { attribute_code: 'seller_id', value: sellerId },
          { attribute_code: 'description', value: payload.product.description }
        ]
      }
    } }
  ];
  const results = [];
  for (const item of variants) {
    try {
      const data = await tn.request('POST', item.path, { environment: 'production', auth: 'bearer', body: item.body });
      results.push({ label: item.label, ...summarize(null, data) });
      break;
    } catch (error) {
      results.push({ label: item.label, ...summarize(error) });
    }
  }

  let session = null;
  try {
    session = await webLogin();
    if (session.cookie) {
      try {
        const me = await raw('GET', '/rest/V1/customers/me', { cookie: session.cookie });
        results.push({ label: 'web session customers/me', ok: true, id: me && me.id, email: me && me.email });
        try {
          const created = await raw('POST', '/rest/V1/mpapi/sellers/me/addproduct', { cookie: session.cookie, body: payload });
          results.push({ label: 'web session addproduct', ok: true, data: created });
        } catch (error) {
          results.push({ label: 'web session addproduct', ...summarize(error) });
        }
      } catch (error) {
        results.push({ label: 'web session customers/me', ...summarize(error) });
      }
    }
  } catch (error) {
    results.push({ label: 'web login', ...summarize(error) });
  }

  console.log(JSON.stringify({
    sku: payload.product.sku,
    session: session && { status: session.status, formKey: session.formKey, location: session.location, cookies: session.cookies },
    results
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2));
  process.exit(1);
});
