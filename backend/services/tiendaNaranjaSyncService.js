'use strict';

const fs = require('fs');
const path = require('path');
const Product = require('../models/productModel');
const tn = require('./tiendaNaranjaClient');
const { skuOf, pushProduct, shortDescriptionOf, weightOf } = require('./tiendaNaranjaCatalog');
const { formatTnWeight } = require('./productWeightService');
const { fillMissingWeights, needsWeight } = require('./productWeightService');
const {
  getDiscountBrands,
  getTnSettings,
  resolveUsdRate,
  tnListPrice,
  tnDisplayPrices,
  tnStockQty,
  isDiscountBrand,
  TN_MARKUP
} = require('./tiendaNaranjaPricing');
const excel = require('./tiendaNaranjaExcel');

let timer = null;
let running = false;
let priceStockRunning = false;

const LOG_DIR = path.join(__dirname, '..', '..', 'tienda-naranja');

function batchSize() {
  return Math.max(5, Math.min(40, Number(process.env.TN_SYNC_BATCH || 15)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listRemoteSellerSkus() {
  const found = new Set();
  const pageSize = 100;
  // Antes el tope era 40×80=3200 y se cortaba el catálogo a medias.
  const maxPages = Math.max(50, Number(process.env.TN_LIST_MAX_PAGES) || 200);
  for (let page = 1; page <= maxPages; page += 1) {
    const catalog = await tn.listCatalog({
      page,
      pageSize,
      field: 'seller_id',
      value: process.env.TN_SELLER_ID || tn.keys().sellerId || '353511'
    });
    const items = catalog.items || [];
    for (const item of items) {
      if (item.sku) found.add(String(item.sku).toUpperCase());
    }
    if (page === 1 || page % 10 === 0) {
      console.log(`[tn] catálogo seller página ${page} · SKUs ${found.size}`);
    }
    if (!items.length || items.length < pageSize) break;
  }
  console.log(`[tn] catálogo seller total SKUs ${found.size}`);
  return found;
}

async function productExistsOnTn(sku) {
  try {
    await tn.request('GET', `/rest/V1/products/${encodeURIComponent(sku)}`, {
      auth: 'bearer',
      environment: 'production',
      query: { fields: 'id,sku' }
    });
    return true;
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
}

async function collectExistingSkus({ probeMissing = true } = {}) {
  const remote = await listRemoteSellerSkus();
  if (!probeMissing) return remote;

  const prefix = (tn.keys().skuPrefix || 'ZEEL').toUpperCase();
  const locals = await Product.find({
    codigo: { $exists: true, $nin: ['', null] },
    stock: { $gt: 0 }
  })
    .select('codigo')
    .lean();

  const candidates = [];
  for (const product of locals) {
    const sku = `${prefix}-${String(product.codigo).toUpperCase().replace(/\s+/g, '')}`;
    if (!remote.has(sku)) candidates.push(sku);
  }

  const CONCURRENCY = 8;
  let index = 0;
  async function worker() {
    while (index < candidates.length) {
      const i = index;
      index += 1;
      const sku = candidates[i];
      try {
        if (await productExistsOnTn(sku)) remote.add(sku);
      } catch {
        /* ignore probe errors; excel will still try create */
      }
      if ((i + 1) % 200 === 0) {
        console.log(`[tn] existencia ${i + 1}/${candidates.length} · remotos ${remote.size}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return remote;
}

function putPayload(product, { usdRate, brands }) {
  const sku = skuOf(product);
  const qty = tnStockQty(product);
  const display = tnDisplayPrices(product, usdRate, brands, sku);
  const weight = Number(formatTnWeight(weightOf(product)));
  const short = shortDescriptionOf(product);
  const description = String(product.description || product.productName || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000) || short;
  // Siempre precio único = venta Zenn × 1.10.
  // BORRAR special_price/from/to: si queda valor viejo Magento muestra tachado.
  const custom = [
    { attribute_code: 'short_description', value: short },
    { attribute_code: 'description', value: description },
    { attribute_code: 'special_price', value: '' },
    { attribute_code: 'special_from_date', value: '' },
    { attribute_code: 'special_to_date', value: '' }
  ];
  return {
    sku,
    price: display.price,
    specialPrice: 0,
    qty,
    body: {
      product: {
        sku,
        price: display.price,
        special_price: '',
        status: qty > 0 ? 1 : 2,
        visibility: 4,
        weight,
        extension_attributes: {
          stock_item: { qty, is_in_stock: qty > 0 }
        },
        custom_attributes: custom
      }
    }
  };
}

async function runTnPriceStockSync({ limit, fromRemote } = {}) {
  if (priceStockRunning) {
    return { ok: 0, fail: 0, skipped: 0, scanned: 0, message: 'Ya hay un sync TN en curso' };
  }
  priceStockRunning = true;
  const started = Date.now();
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, 'tn-price-stock-sync.jsonl');
  try {
    const usdRate = await resolveUsdRate();
    const brands = await getDiscountBrands();

    // Catálogo completo del seller en TN (no tope 3200). Local-only solo si fromRemote:false o env=0.
    const forceLocal = fromRemote === false || String(process.env.TN_PRICE_SYNC_FROM_REMOTE || '') === '0';
    const useRemote = !forceLocal;
    let products;
    if (useRemote) {
      console.log('[tn price-stock] listando SKUs remotos (catálogo seller completo)…');
      const remote = await listRemoteSellerSkus();
      const skus = [...remote];
      const max = Number(limit) > 0 ? Math.min(skus.length, Number(limit)) : skus.length;
      const sliceSkus = skus.slice(0, max);
      const codes = sliceSkus.map((sku) => sku.replace(/^ZEEL-/i, ''));
      const codeSet = new Set(codes.map((c) => String(c).toUpperCase()));
      // Match case-insensitive: codigo puede venir en distinto casing.
      const locals = await Product.find({
        codigo: { $exists: true, $nin: ['', null] },
        sellingPrice: { $gt: 0 }
      })
        .select('codigo productName brandName description seoDescription price sellingPrice purchasePrice purchasePriceUSD exchangeRate visaoPrecioFuente stock stockStatus shippingWeightKg tiendaNaranja')
        .lean();
      products = locals.filter((p) => codeSet.has(String(p.codigo || '').toUpperCase().replace(/\s+/g, '')));
      console.log(`[tn price-stock] remotos ${remote.size} · match local ${products.length}`);
    } else {
      const max = Number(limit) > 0 ? Number(limit) : 0;
      let q = Product.find({
        codigo: { $exists: true, $nin: ['', null] },
        sellingPrice: { $gt: 0 },
        $or: [
          { 'tiendaNaranja.sku': { $exists: true, $nin: ['', null] } },
          { 'tiendaNaranja.lastSyncAt': { $exists: true, $ne: null } },
          { 'tiendaNaranja.lastRemotePrice': { $gt: 0 } },
          { 'tiendaNaranja.entityId': { $exists: true, $nin: ['', null] } }
        ]
      })
        .select('codigo productName brandName description seoDescription price sellingPrice purchasePrice purchasePriceUSD exchangeRate visaoPrecioFuente stock stockStatus shippingWeightKg tiendaNaranja')
        .sort({ 'tiendaNaranja.lastSyncAt': -1, stock: -1 });
      if (max) q = q.limit(max);
      products = await q.lean();
    }

    const bySku = new Map();
    const slice = [];
    for (const product of products) {
      const sku = skuOf(product).toUpperCase();
      if (!sku || bySku.has(sku)) continue;
      bySku.set(sku, product);
      slice.push(sku);
    }
    console.log(`[tn price-stock] ${slice.length} SKUs a actualizar (sellingPrice × 1.10)`);

    let ok = 0;
    let fail = 0;
    let skipped = 0;
    let index = 0;
    const CONCURRENCY = Math.max(4, Math.min(16, Number(process.env.TN_PRICE_SYNC_CONCURRENCY) || 12));

    async function worker() {
      while (index < slice.length) {
        const i = index;
        index += 1;
        const sku = slice[i];
        const product = bySku.get(sku);
        if (!product) {
          skipped += 1;
          fs.appendFileSync(logFile, `${JSON.stringify({ sku, ok: false, skipped: true, message: 'sin producto local' })}\n`);
          continue;
        }
        const payload = putPayload(product, { usdRate, brands });
        if (!payload.price) {
          skipped += 1;
          fs.appendFileSync(logFile, `${JSON.stringify({ sku, ok: false, skipped: true, message: 'sin precio' })}\n`);
          continue;
        }
        try {
          const saved = await tn.request('PUT', `/rest/V1/products/${encodeURIComponent(sku)}`, {
            auth: 'bearer',
            environment: 'production',
            body: payload.body
          });
          ok += 1;
          await Product.updateOne({ _id: product._id }, {
            $set: {
              'tiendaNaranja.sku': sku,
              'tiendaNaranja.entityId': String(saved.id || (product.tiendaNaranja && product.tiendaNaranja.entityId) || ''),
              'tiendaNaranja.environment': 'production',
              'tiendaNaranja.lastSyncAt': new Date(),
              'tiendaNaranja.lastError': '',
              'tiendaNaranja.lastRemotePrice': payload.specialPrice || payload.price,
              'tiendaNaranja.lastRemoteStock': payload.qty,
              'tiendaNaranja.inVisao': payload.qty > 0
            }
          });
          fs.appendFileSync(logFile, `${JSON.stringify({
            sku,
            ok: true,
            price: payload.price,
            special: payload.specialPrice || 0,
            qty: payload.qty
          })}\n`);
        } catch (error) {
          fail += 1;
          await Product.updateOne({ _id: product._id }, {
            $set: {
              'tiendaNaranja.sku': sku,
              'tiendaNaranja.lastError': String(error.message || 'error').slice(0, 240)
            }
          });
          fs.appendFileSync(logFile, `${JSON.stringify({
            sku,
            ok: false,
            status: error.status || 0,
            message: String(error.message || error).slice(0, 220)
          })}\n`);
        }
        await sleep(5);
        const done = ok + fail + skipped;
        if (done % 100 === 0 || done === slice.length) {
          const elapsed = Math.max(1, (Date.now() - started) / 1000);
          const rate = done / elapsed;
          const eta = Math.round((slice.length - done) / Math.max(0.1, rate));
          console.log(`[tn price-stock] ${done}/${slice.length} · ok ${ok} · fail ${fail} · ~${eta}s restantes`);
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const summary = {
      ok,
      fail,
      skipped,
      scanned: slice.length,
      seconds: Math.round((Date.now() - started) / 1000),
      message: `ok ${ok} · fail ${fail} · omitidos ${skipped}`
    };
    const settings = await getTnSettings();
    settings.lastPriceStockSyncAt = new Date();
    settings.lastPriceStockSync = {
      ok,
      fail,
      skipped,
      scanned: slice.length,
      message: summary.message
    };
    await settings.save();
    console.log(`[tn price-stock] ${summary.message} · ${summary.seconds}s`);
    return summary;
  } finally {
    priceStockRunning = false;
  }
}

async function syncProduct(product) {
  const sku = skuOf(product);
  try {
    const result = await pushProduct(product);
    await Product.updateOne({ _id: product._id }, {
      $set: {
        'tiendaNaranja.entityId': result.productId || (product.tiendaNaranja && product.tiendaNaranja.entityId) || '',
        'tiendaNaranja.sku': sku,
        'tiendaNaranja.environment': process.env.TN_ENV || 'production',
        'tiendaNaranja.lastSyncAt': new Date(),
        'tiendaNaranja.lastError': ''
      }
    });
    return { ok: true, sku, productId: result.productId };
  } catch (error) {
    await Product.updateOne({ _id: product._id }, {
      $set: {
        'tiendaNaranja.sku': sku,
        'tiendaNaranja.lastError': String(error.message || 'error').slice(0, 240)
      }
    });
    return { ok: false, sku, message: error.message };
  }
}

async function runTnDaily({ limit } = {}) {
  const missing = await Product.countDocuments({
    $or: [
      { shippingWeightKg: { $exists: false } },
      { shippingWeightKg: null },
      { shippingWeightKg: { $lte: 0 } }
    ]
  });
  const weights = missing
    ? await fillMissingWeights({ useAi: true, limit: 80 })
    : { scanned: 0, updated: 0, ai: 0, defaulted: 0 };
  const take = Number(limit) || batchSize();
  const products = await Product.find({
    stock: { $gt: 0 },
    codigo: { $exists: true, $nin: ['', null] },
    productName: { $exists: true, $nin: ['', null] },
    'productImage.0': { $exists: true, $ne: '' },
    $or: [
      { 'tiendaNaranja.lastSyncAt': { $exists: false } },
      { 'tiendaNaranja.lastSyncAt': null },
      { 'tiendaNaranja.lastError': { $exists: true, $nin: ['', null] } }
    ]
  })
    .sort({ 'tiendaNaranja.lastSyncAt': 1, updatedAt: -1 })
    .limit(take)
    .lean();
  const sent = [];
  for (const product of products) {
    if (needsWeight(product)) {
      await fillMissingWeights({ useAi: true, limit: 20 });
    }
    const fresh = await Product.findById(product._id).lean();
    sent.push(await syncProduct(fresh || product));
  }
  return {
    weights,
    scanned: products.length,
    ok: sent.filter((item) => item.ok).length,
    failed: sent.filter((item) => !item.ok).length,
    sent
  };
}

function startTnScheduleIfEnabled() {
  if (process.env.VERCEL) return;

  // Sync masivo de precios TN (venta×1.10 + borrar special_price) al boot y cada N horas.
  // Desactivar con TN_PRICE_SYNC_SCHEDULE_ENABLED=0.
  if (String(process.env.TN_PRICE_SYNC_SCHEDULE_ENABLED || '1') !== '0') {
    const delayMs = Math.max(5_000, Number(process.env.TN_PRICE_SYNC_BOOT_DELAY_MS) || 12_000);
    const everyMs = Math.max(
      30 * 60 * 1000,
      Number(process.env.TN_PRICE_SYNC_INTERVAL_MS) || 6 * 60 * 60 * 1000
    );
    const kickPriceSync = async (label) => {
      if (priceStockRunning) {
        console.log(`[tn price-stock][${label}] ya en curso, skip`);
        return;
      }
      try {
        console.log(`[tn price-stock][${label}] arrancando sync completo seller…`);
        const result = await runTnPriceStockSync({ fromRemote: true });
        console.log(
          `[tn price-stock][${label}] ${result.message || ''} · scanned=${result.scanned || 0} · ${result.seconds || 0}s`
        );
      } catch (error) {
        console.error(`[tn price-stock][${label}]`, error.message || error);
      }
    };
    setTimeout(() => {
      kickPriceSync('boot');
    }, delayMs);
    const priceTimer = setInterval(() => {
      kickPriceSync('schedule');
    }, everyMs);
    if (typeof priceTimer.unref === 'function') priceTimer.unref();
    console.log(
      `[tn price-stock] Schedule ON · boot en ${Math.round(delayMs / 1000)}s · cada ${Math.round(everyMs / 3600000)}h · venta×1.10 sin tachado`
    );
  }

  // Alta masiva por API (create) — opcional, suele fallar 401.
  if (String(process.env.TN_CREATE_SYNC_ENABLED || '') !== '1') {
    return;
  }
  if (timer) return;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runTnDaily();
      if (result.scanned) {
        console.log(`[tn sync] pesos ${result.weights.updated} · enviados ${result.ok}/${result.scanned} · fallidos ${result.failed}`);
      }
    } catch (error) {
      console.error('[tn sync]', error.message || error);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, 2 * 60 * 1000);
  if (typeof timer.unref === 'function') timer.unref();
  setTimeout(tick, 15 * 1000);
}

/**
 * Solo datos locales que dejó el worker (lastSyncAt / lastRemotePrice).
 * No llama a la API de Tienda Naranja en cada carga del panel.
 */
async function listDiferencias({ limit = 100, offset = 0, onlyGap, onlyPromo, onlyNew } = {}) {
  const settings = await getTnSettings();
  if (!settings.lastPriceStockSyncAt) {
    return {
      total: 0,
      published: 0,
      unpublished: 0,
      items: [],
      usdRate: 0,
      markup: TN_MARKUP,
      discountBrands: await getDiscountBrands(),
      fromWorker: false,
      message: 'Todavía no hay sync del worker. Cuando corra Visão + TN, acá aparecen las diferencias.'
    };
  }

  const usdRate = await resolveUsdRate();
  const brands = await getDiscountBrands();
  const products = await Product.find({
    codigo: { $exists: true, $nin: ['', null] },
    $or: [
      { 'tiendaNaranja.lastSyncAt': { $exists: true, $ne: null } },
      { 'tiendaNaranja.lastRemotePrice': { $gt: 0 } },
      { 'tiendaNaranja.lastError': { $exists: true, $nin: ['', null] } }
    ]
  })
    .select('codigo productName brandName sellingPrice purchasePrice purchasePriceUSD exchangeRate visaoPrecioFuente stock stockStatus tiendaNaranja')
    .lean();

  const rows = [];
  for (const product of products) {
    const sku = skuOf(product);
    if (!sku) continue;
    const zenn = Math.round(Number(product.sellingPrice) || 0);
    const tnPrice = tnListPrice(product, usdRate, brands);
    const qty = tnStockQty(product);
    const tn = product.tiendaNaranja || {};
    const remotePrice = Number(tn.lastRemotePrice) || null;
    const published = Boolean(tn.lastSyncAt || remotePrice);
    const delta = zenn > 0 && tnPrice > 0
      ? Math.round(((tnPrice - zenn) / zenn) * 1000) / 10
      : null;
    const promo = isDiscountBrand(product, brands);
    const hasGap = remotePrice != null && tnPrice > 0 && Math.abs(remotePrice - tnPrice) >= 1;
    if (onlyNew && published) continue;
    if (onlyPromo && !promo) continue;
    if (onlyGap) {
      const minGap = Number(onlyGap) || 0;
      if (!(hasGap || (delta != null && Math.abs(delta) >= minGap))) continue;
    }
    rows.push({
      sku,
      nombre: product.productName,
      brandName: product.brandName || '',
      zennPrice: zenn,
      tnPrice,
      remotePrice,
      deltaPct: delta,
      tnStock: qty,
      published,
      discountBrand: promo,
      inVisao: qty > 0,
      lastError: tn.lastError || '',
      lastSyncAt: tn.lastSyncAt || null
    });
  }
  rows.sort((a, b) => {
    const ae = a.lastError ? 1 : 0;
    const be = b.lastError ? 1 : 0;
    if (be !== ae) return be - ae;
    return Math.abs(b.deltaPct || 0) - Math.abs(a.deltaPct || 0);
  });
  const slice = rows.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 100));
  return {
    total: rows.length,
    published: rows.filter((r) => r.published).length,
    unpublished: rows.filter((r) => !r.published).length,
    items: slice,
    usdRate,
    markup: TN_MARKUP,
    discountBrands: brands,
    fromWorker: true,
    lastPriceStockSyncAt: settings.lastPriceStockSyncAt,
    lastPriceStockSync: settings.lastPriceStockSync || null
  };
}

module.exports = {
  runTnDaily,
  syncProduct,
  startTnScheduleIfEnabled,
  runTnPriceStockSync,
  listRemoteSellerSkus,
  collectExistingSkus,
  listDiferencias,
  productExistsOnTn
};
