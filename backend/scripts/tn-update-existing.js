'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Product = require('../models/productModel');
const tn = require('../services/tiendaNaranjaClient');
const excel = require('../services/tiendaNaranjaExcel');

const CONCURRENCY = 4;
const LOG = path.join(__dirname, '..', '..', 'tienda-naranja', 'tn-update-664.jsonl');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listRemote() {
  const found = [];
  for (let page = 1; page <= 30; page += 1) {
    const catalog = await tn.listCatalog({
      page,
      pageSize: 80,
      field: 'seller_id',
      value: process.env.TN_SELLER_ID || '353511'
    });
    const items = catalog.items || [];
    for (const item of items) {
      if (item.sku) found.push(String(item.sku).toUpperCase());
    }
    if (!items.length || items.length < 80) break;
  }
  return [...new Set(found)];
}

function loadExcelRows() {
  const sources = [
    '/Users/josiasnicolas02gmail.com/Downloads/zenn-tn-para-subir-2026-10-30.xls',
    path.join(__dirname, '..', '..', 'tienda-naranja', 'zenn-tn-para-subir-2026-10-30.xls')
  ];
  const bySku = new Map();
  for (const src of sources) {
    if (!fs.existsSync(src)) continue;
    const rows = XLSX.utils.sheet_to_json(XLSX.readFile(src).Sheets.Hoja1);
    for (const row of rows) {
      const sku = String(row.sku || '').toUpperCase();
      if (sku) bySku.set(sku, row);
    }
    break;
  }
  return bySku;
}

function payloadOf(row) {
  const sku = String(row.sku).toUpperCase();
  const qty = Math.max(0, Number(row.stock) || 0);
  const price = Math.round(Number(row.precio) || 0);
  const special = Math.round(Number(row.precio_especial) || 0);
  const weight = Number(row.peso) || 0.5;
  const short = String(row.breve_descripcion || row.nombre || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  const description = String(row.descripcion || row.nombre || '').replace(/\r\n/g, '\n').trim().slice(0, 4000);
  const custom = [
    { attribute_code: 'short_description', value: short },
    { attribute_code: 'description', value: description }
  ];
  if (special > 0 && special < price) {
    custom.push({ attribute_code: 'special_price', value: String(special) });
    custom.push({ attribute_code: 'special_from_date', value: String(row.precio_especial_fecha_desde || '2026-11-02 00:00:00') });
    custom.push({ attribute_code: 'special_to_date', value: String(row.precio_especial_fecha_hasta || '2026-11-08 23:59:00') });
  }
  return {
    product: {
      sku,
      price,
      status: qty > 0 ? 1 : 2,
      visibility: 4,
      weight,
      extension_attributes: {
        stock_item: { qty, is_in_stock: qty > 0 }
      },
      custom_attributes: custom
    }
  };
}

async function updateOne(sku, row) {
  if (!row || !Number(row.precio)) {
    return { sku, ok: false, message: 'sin precio local' };
  }
  const body = payloadOf(row);
  const saved = await tn.request('PUT', `/rest/V1/products/${encodeURIComponent(sku)}`, {
    auth: 'bearer',
    environment: 'production',
    body
  });
  return {
    sku,
    ok: true,
    id: saved.id,
    price: saved.price,
    status: saved.status,
    stock: row.stock
  };
}

async function pool(items, worker, size) {
  const out = [];
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      out.push(await worker(current));
    }
  }
  await Promise.all(Array.from({ length: size }, run));
  return out;
}

(async () => {
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  const remote = await listRemote();
  const excelRows = loadExcelRows();
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 25000 });
  const missingCodes = remote
    .filter((sku) => !excelRows.has(sku))
    .map((sku) => sku.replace(/^ZEEL-/i, ''));
  if (missingCodes.length) {
    const products = await Product.find({ codigo: { $in: missingCodes } }).lean();
    for (const product of products) {
      const row = excel.rowOf(product, { usdRate: 6200 });
      if (row.sku) excelRows.set(String(row.sku).toUpperCase(), row);
    }
  }
  await mongoose.disconnect();

  let ok = 0;
  let fail = 0;
  const started = Date.now();
  const results = await pool(remote, async (sku) => {
    let result;
    try {
      result = await updateOne(sku, excelRows.get(sku));
    } catch (error) {
      result = { sku, ok: false, status: error.status || 0, message: String(error.message || error).slice(0, 220) };
    }
    if (result.ok) ok += 1;
    else fail += 1;
    fs.appendFileSync(LOG, `${JSON.stringify(result)}\n`);
    if ((ok + fail) % 25 === 0) {
      const elapsed = Math.round((Date.now() - started) / 1000);
      console.log(`progreso ${ok + fail}/${remote.length} · ok ${ok} · fail ${fail} · ${elapsed}s`);
    }
    await sleep(80);
    return result;
  }, CONCURRENCY);

  const fails = results.filter((item) => !item.ok);
  console.log(JSON.stringify({
    total: remote.length,
    ok,
    fail,
    seconds: Math.round((Date.now() - started) / 1000),
    log: LOG,
    failSample: fails.slice(0, 8)
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
