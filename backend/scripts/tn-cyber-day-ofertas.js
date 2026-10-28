'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Product = require('../models/productModel');
const { tnPrices } = require('../services/tiendaNaranjaCatalog');

const TEMPLATE = '/Users/josiasnicolas02gmail.com/Downloads/Nueva Planilla base de ofertas para acciones - sellers.xlsx';
const CATALOG = '/Users/josiasnicolas02gmail.com/Downloads/zenn-tn-23.xls';
const DEST = '/Users/josiasnicolas02gmail.com/Downloads/ZENN-CyberDay-TiendaNaranja-2026.xlsx';
const SELLER = 'ZENN';
const BRANDS = ['redragon', 'kolke', 'xiaomi', 'msi', 'macrovip'];
const MIN_PRICE = 20000;

function skuOf(codigo) {
  return `ZEEL-${String(codigo || '').toUpperCase().replace(/\s+/g, '')}`;
}

function codigoOf(sku) {
  return String(sku || '').replace(/^ZEEL-/i, '').toUpperCase();
}

function brandOf(product) {
  const text = `${product.brandName || ''} ${product.productName || ''}`.toLowerCase();
  return BRANDS.find((brand) => text.includes(brand)) || '';
}

function isRedragon(product) {
  return brandOf(product) === 'redragon';
}

function hash01(sku) {
  let n = 0;
  for (const char of String(sku)) n = (n * 33 + char.charCodeAt(0)) >>> 0;
  return (n % 10000) / 10000;
}

function pickDiscount(sku) {
  return 40 + Math.round(hash01(sku) * 30);
}

function money(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function listForDiscount(finalPrice, pct) {
  let list = money(finalPrice / (1 - pct / 100));
  let real = Math.round((1 - finalPrice / list) * 100);
  if (real < 40) list = money(finalPrice / 0.6);
  if (real > 70) list = money(finalPrice / 0.3);
  real = Math.round((1 - finalPrice / list) * 100);
  if (real < 40) list = money(finalPrice / 0.598);
  if (real > 70) list = money(finalPrice / 0.305);
  return money(list);
}

function pctOf(list, finalPrice) {
  if (!list || !finalPrice || list <= finalPrice) return 0;
  return Math.round((1 - finalPrice / list) * 100);
}

(async () => {
  const catalogRows = XLSX.utils.sheet_to_json(XLSX.readFile(CATALOG).Sheets.Hoja1);
  const catalogBySku = new Map();
  for (const row of catalogRows) {
    if (row.sku) catalogBySku.set(String(row.sku).toUpperCase(), row);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 25000 });
  const products = await Product.find({
    stock: { $gt: 0 },
    codigo: { $exists: true, $nin: ['', null] },
    productName: { $exists: true, $nin: ['', null] }
  })
    .select('codigo productName brandName price sellingPrice purchasePrice stock isVipOffer category subcategory')
    .lean();
  await mongoose.disconnect();

  const byCode = new Map(products.map((p) => [String(p.codigo).toUpperCase(), p]));
  const picked = new Map();

  function addRow(product, kind) {
    const sku = skuOf(product.codigo);
    if (picked.has(sku)) {
      if (kind === 'promo') picked.get(sku).kind = 'promo';
      return;
    }
    const tn = tnPrices(product);
    const catalog = catalogBySku.get(sku);
    const current = catalog && Number(catalog.precio) > 0
      ? money(catalog.precio)
      : money(tn.promo ? tn.specialPrice : tn.price);
    if (current < MIN_PRICE) return;
    const stock = Math.max(Number(product.stock) || 0, Number(catalog && catalog.stock) || 0);
    if (stock <= 0) return;

    let finalPrice = current;
    let list = current;
    let pct = 0;
    const promo = Number(product.price) > Number(product.sellingPrice) && Number(product.sellingPrice) > 0;

    if (promo || kind === 'promo') {
      finalPrice = money(tn.specialPrice || current);
      if (isRedragon(product)) finalPrice = money(finalPrice * 0.95);
    } else if (isRedragon(product)) {
      finalPrice = money(current * 0.95);
    }
    const disc = pickDiscount(sku);
    list = listForDiscount(finalPrice, disc);
    pct = pctOf(list, finalPrice);

    if (pct < 40 || pct > 70 || finalPrice <= 0 || list <= finalPrice) return;
    picked.set(sku, {
      seller: SELLER,
      sku,
      name: String(product.productName || (catalog && catalog.nombre) || '').trim(),
      list,
      finalPrice,
      pct,
      stock,
      brand: brandOf(product),
      kind: promo ? 'promo' : kind,
      category: String(product.category || '')
    });
  }

  for (const product of products) {
    const promo = Number(product.price) > Number(product.sellingPrice) && Number(product.sellingPrice) > 0;
    const branded = Boolean(brandOf(product));
    const inCatalog = catalogBySku.has(skuOf(product.codigo));
    if (promo) addRow(product, 'promo');
    else if (branded) addRow(product, 'marca');
    else if (inCatalog && branded) addRow(product, 'marca');
  }

  for (const [sku, row] of catalogBySku) {
    if (picked.has(sku)) continue;
    const product = byCode.get(codigoOf(sku));
    if (!product) continue;
    if (!brandOf(product)) continue;
    addRow(product, 'marca');
  }

  const rows = [...picked.values()].sort((a, b) => {
    const brandRank = (item) => {
      const order = { redragon: 0, xiaomi: 1, kolke: 2, msi: 3, macrovip: 4 };
      return order[item.brand] ?? 9;
    };
    return brandRank(a) - brandRank(b) || b.pct - a.pct || b.stock - a.stock;
  });

  const preferredKillers = ['ZEEL-16730', 'ZEEL-22141', 'ZEEL-15420', 'ZEEL-43950', 'ZEEL-60067'];
  const bySku = new Map(rows.map((item) => [item.sku, item]));
  const killers = preferredKillers.map((sku) => bySku.get(sku)).filter(Boolean);
  const killerPool = rows
    .filter((item) => item.stock >= 5 && item.finalPrice >= 80000 && item.finalPrice <= 900000)
    .sort((a, b) => b.pct - a.pct);
  for (const item of killerPool) {
    if (killers.length >= 5) break;
    if (!killers.includes(item)) killers.push(item);
  }

  const wb = XLSX.readFile(TEMPLATE);
  const sheet = wb.Sheets.Hoja1;
  rows.forEach((item, index) => {
    const r = index + 4;
    XLSX.utils.sheet_add_aoa(sheet, [[
      item.seller,
      item.sku,
      item.name,
      item.list,
      item.finalPrice,
      `${item.pct}%`,
      item.stock
    ]], { origin: `A${r}` });
  });
  killers.forEach((item, index) => {
    const r = index + 4;
    XLSX.utils.sheet_add_aoa(sheet, [[
      item.sku,
      item.name,
      item.list,
      item.finalPrice,
      `${item.pct}%`
    ]], { origin: `I${r}` });
  });

  const killerSheet = XLSX.utils.aoa_to_sheet([
    ['OFERTAS KILLERS - CYBER DAY / CYBER WEEK TIENDA NARANJA 2026'],
    ['Vigencia Cyber Day: 2 al 4 de noviembre 2026'],
    ['Vigencia CyberWeek: 5 al 8 de noviembre 2026'],
    ['Descuentos programados: 2 al 8 de noviembre 2026'],
    [],
    ['SELLER', 'SKU', 'Nombre del producto', 'Precio de lista', 'Monto final descontado', '% de descuento', 'Stock disponible en TN'],
    ...killers.map((item) => [item.seller, item.sku, item.name, item.list, item.finalPrice, `${item.pct}%`, item.stock])
  ]);
  killerSheet['!cols'] = [
    { wch: 10 }, { wch: 14 }, { wch: 70 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, killerSheet, 'Ofertas Killers');

  sheet['!ref'] = `A1:N${Math.max(1000, rows.length + 20)}`;
  XLSX.writeFile(wb, DEST);
  const copy = path.join(__dirname, '..', '..', 'tienda-naranja', 'ZENN-CyberDay-TiendaNaranja-2026.xlsx');
  fs.mkdirSync(path.dirname(copy), { recursive: true });
  fs.copyFileSync(DEST, copy);

  const byBrand = {};
  for (const item of rows) {
    const key = item.brand || (item.kind === 'promo' ? 'promo' : 'otro');
    byBrand[key] = (byBrand[key] || 0) + 1;
  }
  console.log(JSON.stringify({
    dest: DEST,
    copy,
    total: rows.length,
    promos: rows.filter((item) => item.kind === 'promo').length,
    byBrand,
    pctMin: Math.min(...rows.map((item) => item.pct)),
    pctMax: Math.max(...rows.map((item) => item.pct)),
    killers: killers.map((item) => ({
      sku: item.sku,
      name: item.name.slice(0, 70),
      list: item.list,
      final: item.finalPrice,
      pct: item.pct,
      stock: item.stock,
      brand: item.brand
    }))
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
