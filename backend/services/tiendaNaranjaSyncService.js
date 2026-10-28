'use strict';

const Product = require('../models/productModel');
const { skuOf, pushProduct } = require('./tiendaNaranjaCatalog');
const { fillMissingWeights, needsWeight } = require('./productWeightService');

let timer = null;
let running = false;

function batchSize() {
  return Math.max(5, Math.min(40, Number(process.env.TN_SYNC_BATCH || 15)));
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

module.exports = { runTnDaily, syncProduct, startTnScheduleIfEnabled };
