#!/usr/bin/env node
'use strict';
/**
 * Sync masivo TN: precio = sellingPrice × 1.10 y borra special_price (sin tachado).
 * Uso: node scripts/tn-full-price-sync.js
 * Corre en background aunque cierres la laptop del panel (mientras el proceso viva).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const dns = require('dns').promises;
const mongoose = require('mongoose');
const { runTnPriceStockSync } = require('../services/tiendaNaranjaSyncService');

async function connectMongo() {
  const srv = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!srv) throw new Error('Falta MONGODB_URI');
  try {
    await mongoose.connect(srv, { serverSelectionTimeoutMS: 25000 });
    return 'srv';
  } catch (err) {
    console.warn('[tn-full] SRV falló, intentando hosts directos…', err.code || err.message);
    const m = srv.match(/^mongodb\+srv:\/\/([^@]+)@([^/]+)\/?([^?]*)(\?.*)?$/);
    if (!m) throw err;
    const auth = decodeURIComponent(m[1]);
    const host = m[2];
    const db = m[3] || '';
    const records = await dns.resolveSrv(`_mongodb._tcp.${host}`);
    const hosts = records.map((r) => `${r.name}:${r.port}`).join(',');
    const direct = `mongodb://${auth}@${hosts}/${db}?tls=true&authSource=admin&retryWrites=true&w=majority`;
    await mongoose.connect(direct, { serverSelectionTimeoutMS: 90000 });
    return 'direct';
  }
}

(async () => {
  process.env.TN_PRICE_SYNC_CONCURRENCY = process.env.TN_PRICE_SYNC_CONCURRENCY || '16';
  console.log('[tn-full] conectando Mongo…');
  const mode = await connectMongo();
  console.log(`[tn-full] Mongo OK (${mode}) · concurrency=${process.env.TN_PRICE_SYNC_CONCURRENCY}`);
  console.log('[tn-full] sync: venta×1.10 + clear special_price en TODO el catálogo seller');
  const result = await runTnPriceStockSync({ fromRemote: true });
  console.log('[tn-full] RESULTADO', JSON.stringify(result, null, 2));
  await mongoose.disconnect();
  process.exit(result.fail && result.ok === 0 ? 1 : 0);
})().catch(async (e) => {
  console.error('[tn-full] FAIL', e.code || '', e.message);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
