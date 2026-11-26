'use strict';

const fs = require('fs');
const path = require('path');
const Product = require('../models/productModel');
const tn = require('./tiendaNaranjaClient');
const { skuOf, pushProduct, weightOf } = require('./tiendaNaranjaCatalog');
const { formatTnWeight } = require('./productWeightService');
const { fillMissingWeights, needsWeight } = require('./productWeightService');
const {
  getDiscountBrands,
  getTnSettings,
  resolveUsdRate,
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

function catalogPage(data) {
  if (Array.isArray(data)) {
    const first = data[0] || {};
    if (first && Array.isArray(first.items)) {
      return { items: first.items, total: Number(first.total_count) || 0 };
    }
    return { items: data, total: data.length };
  }
  return {
    items: (data && data.items) || [],
    total: Number(data && data.total_count) || 0
  };
}

/**
 * Catálogo completo del seller. Pide solo sku/id: el producto entero pesa tanto
 * que Magento cortaba la paginación cerca de los 2000 y el panel veía ~2800
 * “pendientes” que en realidad ya estaban publicados (el total real ronda 4600).
 */
async function listRemoteSellerSkus() {
  const found = new Set();
  const pageSize = 100;
  const maxPages = Math.max(60, Number(process.env.TN_LIST_MAX_PAGES) || 80);
  const sellerId = process.env.TN_SELLER_ID || tn.keys().sellerId || '353511';
  let total = 0;
  let page = 1;
  let failures = 0;
  let repeats = 0;

  while (page <= maxPages) {
    let parsed;
    try {
      parsed = catalogPage(await tn.listCatalog({
        page,
        pageSize,
        field: 'seller_id',
        value: sellerId,
        fields: 'total_count,items[sku,id]',
        sortField: 'entity_id',
        sortDir: 'ASC'
      }));
      failures = 0;
    } catch (error) {
      failures += 1;
      console.log(`[tn] catálogo página ${page} error ${failures}: ${error.message}`);
      if (failures >= 4) break;
      await sleep(1000 * failures);
      continue;
    }

    const { items, total: reported } = parsed;
    if (reported > total) total = reported;
    const before = found.size;
    for (const item of items) {
      if (item && item.sku) found.add(String(item.sku).toUpperCase());
    }
    if (page === 1 || page % 10 === 0 || items.length < pageSize) {
      console.log(`[tn] catálogo seller página ${page} · SKUs ${found.size}${total ? ` / ${total}` : ''}`);
    }
    if (found.size === before) {
      repeats += 1;
      if (repeats >= 2) break;
    } else {
      repeats = 0;
    }
    if (!items.length) {
      if (total && found.size >= total) break;
      if (repeats >= 2) break;
      page += 1;
      continue;
    }
    if (total && found.size >= total) break;
    // Una página corta es la última solo si ya cubrimos total_count.
    // Cortar antes dejaba afuera ~2600 productos que sí están en TN.
    if (!total && items.length < pageSize) break;
    page += 1;
  }

  console.log(`[tn] catálogo seller total SKUs ${found.size}${total ? ` / ${total}` : ''}`);
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
  // Magento rechaza special_price en la raíz del producto
  // ("%fieldName" / SpecialPrice is not supported). Va solo como custom attribute.
  // El POST /mpapi/sellers/me/addproduct de la doc v3.0 responde ReCaptcha, no sirve para el worker.
  const custom = [];
  if (display.promo && display.specialPrice > 0) {
    custom.push(
      { attribute_code: 'special_price', value: String(display.specialPrice) },
      { attribute_code: 'special_from_date', value: display.from },
      { attribute_code: 'special_to_date', value: display.to }
    );
  } else {
    custom.push(
      { attribute_code: 'special_price', value: '' },
      { attribute_code: 'special_from_date', value: '' },
      { attribute_code: 'special_to_date', value: '' }
    );
  }
  const name = String(product.productName || '')
    .replace(/(\d)\s*"/g, '$1 pulg.')
    .replace(/"/g, '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return {
    sku,
    price: display.price,
    specialPrice: display.promo ? display.specialPrice : 0,
    qty,
    body: {
      product: {
        sku,
        name: name || undefined,
        price: display.price,
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

function pendingCreateFilter() {
  return {
    codigo: { $exists: true, $nin: ['', null] },
    productName: { $exists: true, $nin: ['', null] },
    'productImage.0': { $exists: true, $ne: '' },
    sellingPrice: { $gt: 0 },
    stock: { $gt: 0 },
    stockStatus: { $ne: 'out_of_stock' },
    'tiendaNaranja.onTn': { $ne: true }
  };
}

/** Marca qué códigos locales están publicados en TN, según el catálogo remoto. */
async function markOnTn(remote) {
  if (!remote || !remote.size) return 0;
  const prefix = (tn.keys().skuPrefix || 'ZEEL').toUpperCase();
  const locals = await Product.find({
    codigo: { $exists: true, $nin: ['', null] }
  }).select('_id codigo').lean();
  const ops = [];
  for (const product of locals) {
    const code = String(product.codigo || '').toUpperCase().replace(/\s+/g, '');
    ops.push({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { 'tiendaNaranja.onTn': Boolean(code) && remote.has(`${prefix}-${code}`) } }
      }
    });
  }
  for (let i = 0; i < ops.length; i += 1000) {
    await Product.bulkWrite(ops.slice(i, i + 1000), { ordered: false });
  }
  return ops.length;
}

async function listPendingCreates({ limit = 400, offset = 0 } = {}) {
  const filter = pendingCreateFilter();
  const total = await Product.countDocuments(filter);
  const rows = await Product.find(filter)
    .select('codigo productName category subcategory stock sellingPrice')
    .sort({ stock: -1, codigo: 1 })
    .skip(Number(offset) || 0)
    .limit(Math.max(1, Math.min(1000, Number(limit) || 400)))
    .lean();
  const prefix = (tn.keys().skuPrefix || 'ZEEL').toUpperCase();
  return {
    total,
    items: rows.map((product) => ({
      codigo: product.codigo,
      sku: `${prefix}-${String(product.codigo || '').toUpperCase().replace(/\s+/g, '')}`,
      nombre: product.productName,
      category: product.category || '',
      subcategory: product.subcategory || '',
      stock: Number(product.stock) || 0,
      sellingPrice: Math.round(Number(product.sellingPrice) || 0)
    }))
  };
}

/** Baja en TN un SKU remoto sin producto local (eliminado en Zenn). */
function orphanOffPayload(sku) {
  return {
    sku,
    body: {
      product: {
        sku,
        status: 2,
        extension_attributes: {
          stock_item: { qty: 0, is_in_stock: false }
        }
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
    let remote = new Set();
    const prefix = (tn.keys().skuPrefix || 'ZEEL').toUpperCase();

    if (useRemote) {
      console.log('[tn price-stock] listando SKUs remotos (catálogo seller completo)…');
      remote = await listRemoteSellerSkus();
      const skus = [...remote];
      const max = Number(limit) > 0 ? Math.min(skus.length, Number(limit)) : skus.length;
      const sliceSkus = skus.slice(0, max);
      const codes = sliceSkus.map((sku) => sku.replace(new RegExp(`^${prefix}-`, 'i'), ''));
      const codeSet = new Set(codes.map((c) => String(c).toUpperCase()));
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
    console.log(`[tn price-stock] ${slice.length} SKUs a actualizar (venta/anterior × 1.10 · stock 5/0)`);

    let ok = 0;
    let fail = 0;
    let skipped = 0;
    let orphansOff = 0;
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
        if (!payload.price && payload.qty > 0) {
          skipped += 1;
          fs.appendFileSync(logFile, `${JSON.stringify({ sku, ok: false, skipped: true, message: 'sin precio' })}\n`);
          continue;
        }
        try {
          let saved;
          let lastError;
          for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
              saved = await tn.request('PUT', `/rest/V1/products/${encodeURIComponent(sku)}`, {
                auth: 'bearer',
                environment: 'production',
                body: payload.body
              });
              lastError = null;
              break;
            } catch (error) {
              lastError = error;
              const status = Number(error.status) || 0;
              if (status && status < 500 && status !== 429) break;
              await sleep(400 * attempt);
            }
          }
          if (lastError) throw lastError;
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

    // SKUs en TN sin producto local (borrados en Zenn) → stock 0 + status disabled.
    if (useRemote && remote.size) {
      const localCodes = new Set(
        (await Product.find({ codigo: { $exists: true, $nin: ['', null] } }).select('codigo').lean())
          .map((p) => String(p.codigo || '').toUpperCase().replace(/\s+/g, ''))
      );
      const orphans = [...remote].filter((sku) => {
        const upper = String(sku).toUpperCase();
        if (!upper.startsWith(`${prefix}-`)) return false;
        const code = upper.replace(new RegExp(`^${prefix}-`), '');
        return code && !localCodes.has(code);
      });
      console.log(`[tn price-stock] huérfanos en TN (sin local): ${orphans.length}`);
      for (const sku of orphans) {
        try {
          const payload = orphanOffPayload(sku);
          await tn.request('PUT', `/rest/V1/products/${encodeURIComponent(sku)}`, {
            auth: 'bearer',
            environment: 'production',
            body: payload.body
          });
          orphansOff += 1;
          fs.appendFileSync(logFile, `${JSON.stringify({ sku, ok: true, orphanOff: true })}\n`);
        } catch (error) {
          fail += 1;
          fs.appendFileSync(logFile, `${JSON.stringify({
            sku,
            ok: false,
            orphanOff: true,
            message: String(error.message || error).slice(0, 220)
          })}\n`);
        }
        await sleep(5);
      }
    }

    // Productos con stock en Zenn que aún no están en TN → lista y Excel de altas.
    let pendingCreate = 0;
    let zennStockCount = 0;
    if (useRemote && remote.size) {
      await markOnTn(remote);
      pendingCreate = await Product.countDocuments(pendingCreateFilter());
      zennStockCount = await Product.countDocuments({
        codigo: { $exists: true, $nin: ['', null] },
        stock: { $gt: 0 },
        stockStatus: { $ne: 'out_of_stock' },
        sellingPrice: { $gt: 0 },
        'productImage.0': { $exists: true, $ne: '' }
      });
    }

    const summary = {
      ok,
      fail,
      skipped,
      orphansOff,
      pendingCreate,
      remoteCount: remote.size,
      scanned: slice.length,
      seconds: Math.round((Date.now() - started) / 1000),
      message: `ok ${ok} · fail ${fail} · omitidos ${skipped} · bajas huérfanas ${orphansOff} · en TN ${remote.size} · pendientes Excel ${pendingCreate}`
    };
    const settings = await getTnSettings();
    settings.lastPriceStockSyncAt = new Date();
    settings.lastPriceStockSync = {
      ok,
      fail,
      skipped,
      scanned: slice.length,
      orphansOff,
      pendingCreate,
      remoteCount: remote.size,
      message: summary.message
    };
    settings.pendingCreateCount = pendingCreate;
    settings.pendingCreateUpdatedAt = new Date();
    if (useRemote) {
      settings.remoteCatalogCount = remote.size;
      settings.zennStockCount = zennStockCount;
    }
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

  // Respaldo cada N horas. La pasada que manda es la del final del worker Visão.
  // Desactivar con TN_PRICE_SYNC_SCHEDULE_ENABLED=0.
  if (String(process.env.TN_PRICE_SYNC_SCHEDULE_ENABLED || '1') !== '0') {
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
    // La pasada principal corre al terminar Visão. Esta queda de respaldo, sin disparar al boot.
    const priceTimer = setInterval(() => {
      kickPriceSync('schedule');
    }, everyMs);
    if (typeof priceTimer.unref === 'function') priceTimer.unref();
    console.log(
      `[tn price-stock] Respaldo cada ${Math.round(everyMs / 3600000)}h · la pasada principal corre al terminar Visão`
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
    .select('codigo productName brandName price sellingPrice purchasePrice purchasePriceUSD exchangeRate visaoPrecioFuente stock stockStatus tiendaNaranja')
    .lean();

  const rows = [];
  for (const product of products) {
    const sku = skuOf(product);
    if (!sku) continue;
    const zenn = Math.round(Number(product.sellingPrice) || 0);
    const zennList = Math.round(Number(product.price) || 0);
    const display = tnDisplayPrices(product, usdRate, brands, sku);
    const tnPrice = display.promo ? display.specialPrice : display.price;
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
      zennListPrice: zennList,
      tnPrice,
      tnListPrice: display.price,
      tnSpecialPrice: display.promo ? display.specialPrice : 0,
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
  listPendingCreates,
  listDiferencias,
  productExistsOnTn
};
