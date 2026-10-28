'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const tn = require('../services/tiendaNaranjaClient');
const excel = require('../services/tiendaNaranjaExcel');
const { tnPrices } = require('../services/tiendaNaranjaCatalog');

const MAX_PRICE = Number(process.argv[2] || 6000000);

async function existingSkus() {
  const found = new Set();
  try {
    for (let page = 1; page <= 5; page += 1) {
      const catalog = await tn.listCatalog({
        page,
        pageSize: 80,
        field: 'seller_id',
        value: process.env.TN_SELLER_ID || '353511'
      });
      for (const item of catalog.items || []) {
        if (item.sku) found.add(String(item.sku).toUpperCase());
      }
      if (!catalog.items || catalog.items.length < 80) break;
    }
  } catch {
    /* si TN no responde, igual armamos el Excel */
  }
  return found;
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 25000 });
  const remote = await existingSkus();
  const products = await excel.listProducts({ onlyStock: true });
  const under = products.filter((product) => {
    const prices = tnPrices(product);
    const sku = excel.skuOf(product).toUpperCase();
    return prices.price > 0 && prices.price <= MAX_PRICE && !remote.has(sku);
  });
  const { book, rows } = excel.workbookOf(under);
  const shortBad = rows.filter((row) => {
    const len = String(row.breve_descripcion || '').length;
    return len < 50 || len > 180;
  }).length;
  const destDir = path.join(__dirname, '..', '..', 'tienda-naranja');
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, `zenn-tn-hasta-${MAX_PRICE}.xls`);
  fs.writeFileSync(dest, require('xlsx').write(book, { type: 'buffer', bookType: 'xls' }));
  const max = rows.reduce((acc, row) => Math.max(acc, Number(row.precio) || 0), 0);
  const min = rows.reduce((acc, row) => Math.min(acc, Number(row.precio) || Infinity), Infinity);
  await mongoose.disconnect();
  console.log(JSON.stringify({
    maxPrice: MAX_PRICE,
    inStock: products.length,
    rows: rows.length,
    skippedExisting: remote.size,
    shortBad,
    min,
    max,
    dest
  }, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
