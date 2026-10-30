'use strict';

const XLSX = require('xlsx');
const Product = require('../models/productModel');
const { keys } = require('./tiendaNaranjaClient');
const { toMerchantJpegUrl } = require('../helpers/merchantJpeg');
const { weightOf, shortDescriptionOf } = require('./tiendaNaranjaCatalog');
const { formatTnWeight } = require('./productWeightService');
const { tnCategoryOf, DEFAULT_CATEGORY } = require('./tiendaNaranjaCategories');

const IVA = 1.1;
const ZENN_MARGIN = 1.15;
const ITAU_MARGIN = 1.05;
const TN_MARKUP = IVA * ZENN_MARGIN * ITAU_MARGIN;

const COLUMNS = [
  'nombre',
  'sku',
  'categoria',
  'breve_descripcion',
  'descripcion',
  'precio',
  'precio_especial',
  'precio_especial_fecha_desde',
  'precio_especial_fecha_hasta',
  'stock',
  'peso',
  'ancho',
  'alto',
  'largo',
  'imagenes'
];

function hash01(sku) {
  let n = 0;
  for (const char of String(sku)) n = (n * 33 + char.charCodeAt(0)) >>> 0;
  return (n % 10000) / 10000;
}

function visaoGs(product, usdRate) {
  const fuente = String(product.visaoPrecioFuente || '').toUpperCase();
  const pyg = Number(product.purchasePrice) || 0;
  const usd = Number(product.purchasePriceUSD) || 0;
  const rate = Number(usdRate || product.exchangeRate || 6200);
  if (fuente === 'PYG' && pyg > 0) return pyg;
  if (usd > 0 && rate > 0) return usd * rate;
  if (pyg > 0) return pyg;
  return Number(product.sellingPrice) || 0;
}

function tnSalePrice(product, usdRate) {
  const base = visaoGs(product, usdRate);
  if (base <= 0) return 0;
  return Math.round(base * TN_MARKUP);
}

function randomSpecial(sku, list) {
  if (!list) return { special: '', pct: 0 };
  const pct = 40 + Math.round(hash01(sku) * 30);
  const special = Math.max(1, Math.round(list * (1 - pct / 100)));
  return { special, pct };
}

function prefix() {
  return keys().skuPrefix || 'ZEEL';
}

function skuOf(product) {
  const codigo = String(product.codigo || '').toUpperCase().replace(/\s+/g, '');
  if (!codigo) return '';
  return `${prefix()}-${codigo}`;
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '').trim()}`;
}

function humanize(key) {
  return String(key || '').replace(/_/g, ' ').trim().replace(/\b\w/g, (char) => char.toUpperCase());
}

function specsOf(product) {
  const a = product.specifications && typeof product.specifications === 'object' ? product.specifications : {};
  const b = product.technicalSpecifications && typeof product.technicalSpecifications === 'object'
    ? product.technicalSpecifications
    : {};
  return { ...a, ...b };
}

function descriptionOf(product) {
  const specs = specsOf(product);
  const lines = Object.entries(specs)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([key, value]) => `${humanize(key)}: ${String(value).trim()}`);
  if (lines.length) return lines.join('\n');
  return clip(String(product.description || product.productName || '').replace(/<[^>]+>/g, ' '), 2000);
}

function galleryOf(product) {
  return (product.productImage || [])
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url))
    .map((url) => toMerchantJpegUrl(url))
    .filter((url) => /\.(jpe?g|png|gif)(\?|#|$)/i.test(url) || /\/api\/gmc\/image\.jpg/i.test(url))
    .slice(0, 8);
}

function money(value) {
  const number = Math.round(Number(value) || 0);
  return number > 0 ? number : '';
}

function parseBox(product) {
  const raw = String(specsOf(product).dimensiones_de_embalaje || '').replace(/,/g, '.');
  const nums = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*mm/gi)].map((item) => Number(item[1]));
  if (nums.length >= 3) {
    return {
      ancho: Math.max(1, Math.round(nums[0] / 10)),
      alto: Math.max(1, Math.round(nums[1] / 10)),
      largo: Math.max(1, Math.round(nums[2] / 10))
    };
  }
  return {
    ancho: Number(process.env.TN_DEFAULT_WIDTH || 10),
    alto: Number(process.env.TN_DEFAULT_HEIGHT || 10),
    largo: Number(process.env.TN_DEFAULT_LENGTH || 10)
  };
}

function pesoOf(product) {
  const box = parseBox(product);
  const liters = (box.ancho * box.alto * box.largo) / 1000;
  if (liters >= 40) return 8.5;
  if (liters >= 20) return 3.8;
  if (liters >= 8) return 1.5;
  return Number(process.env.TN_DEFAULT_WEIGHT || 0.5);
}

function categoryOf(product) {
  if (product && (product.category || product.productName)) return tnCategoryOf(product);
  return String(process.env.TN_EXCEL_CATEGORY || DEFAULT_CATEGORY);
}

function rowOf(product, { usdRate } = {}) {
  const list = tnSalePrice(product, usdRate);
  const sku = skuOf(product);
  const promo = randomSpecial(sku, list);
  const box = parseBox(product);
  const images = galleryOf(product);
  return {
    nombre: clip(product.productName, 180),
    sku,
    categoria: categoryOf(product),
    breve_descripcion: shortDescriptionOf(product),
    descripcion: descriptionOf(product),
    precio: list,
    precio_especial: promo.special || '',
    precio_especial_fecha_desde: '2026-11-02 00:00:00',
    precio_especial_fecha_hasta: '2026-11-08 23:59:00',
    stock: Math.max(0, Number(product.stock) || 0),
    peso: Number(formatTnWeight(weightOf(product))),
    ancho: box.ancho,
    alto: box.alto,
    largo: box.largo,
    imagenes: images.join(',')
  };
}

async function listProducts({ onlyStock = true } = {}) {
  const filter = {
    codigo: { $exists: true, $nin: ['', null] },
    productName: { $exists: true, $nin: ['', null] },
    'productImage.0': { $exists: true, $ne: '' }
  };
  if (onlyStock) {
    filter.stock = { $gt: 0 };
    filter.stockStatus = { $ne: 'out_of_stock' };
  }
  return Product.find(filter)
    .select('codigo productName brandName category subcategory description seoDescription price sellingPrice purchasePrice purchasePriceUSD exchangeRate visaoPrecioFuente stock stockStatus productImage specifications technicalSpecifications shippingWeightKg')
    .sort({ codigo: 1 })
    .lean();
}

function workbookOf(products, { usdRate } = {}) {
  const rows = products
    .filter((product) => Number(product.stock) > 0)
    .map((product) => rowOf(product, { usdRate }))
    .filter((row) => row.sku && row.nombre && row.imagenes && row.precio && Number(row.stock) > 0);
  const sheet = XLSX.utils.json_to_sheet(rows, { header: COLUMNS });
  sheet['!cols'] = COLUMNS.map((name) => ({ wch: name === 'descripcion' || name === 'imagenes' ? 60 : 22 }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Hoja1');
  return { book, rows };
}

async function buildExcel({ onlyStock = true, usdRate } = {}) {
  let rate = Number(usdRate) || 0;
  if (!rate) {
    try {
      const ExchangeRate = require('../models/exchangeRateModel');
      const current = await ExchangeRate.getCurrentRate('USD');
      rate = Number(current && current.toPYG) || 6200;
    } catch {
      rate = 6200;
    }
  }
  const products = await listProducts({ onlyStock });
  const { book, rows } = workbookOf(products, { usdRate: rate });
  const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xls' });
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date());
  return {
    buffer,
    filename: `zenn-tienda-naranja-${day}.xls`,
    count: rows.length
  };
}

module.exports = {
  COLUMNS,
  skuOf,
  rowOf,
  listProducts,
  workbookOf,
  buildExcel,
  tnSalePrice,
  visaoGs,
  TN_MARKUP
};
