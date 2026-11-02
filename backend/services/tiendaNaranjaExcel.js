'use strict';

const XLSX = require('xlsx');
const Product = require('../models/productModel');
const { keys } = require('./tiendaNaranjaClient');
const { toMerchantJpegUrl } = require('../helpers/merchantJpeg');
const { weightOf, shortDescriptionOf } = require('./tiendaNaranjaCatalog');
const { formatTnWeight } = require('./productWeightService');
const { tnCategoryOf, DEFAULT_CATEGORY } = require('./tiendaNaranjaCategories');
const {
  TN_MARKUP,
  visaoGs,
  tnListPrice,
  tnDisplayPrices,
  tnStockQty,
  getDiscountBrands,
  resolveUsdRate,
  isDiscountBrand
} = require('./tiendaNaranjaPricing');

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

function safeName(value) {
  const text = String(value || '')
    .replace(/(\d)\s*"/g, '$1 pulg.')
    .replace(/"/g, '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clip(text, 180);
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
  if (lines.length) return lines.join(' | ');
  return clip(String(product.description || product.productName || '').replace(/<[^>]+>/g, ' '), 2000);
}

const IMAGE_OK = /^https:\/\/[^\s,]+\.(jpe?g|png|gif|webp)(\?|#|$)/i;

function galleryOf(product) {
  const seen = new Set();
  return (product.productImage || [])
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url))
    .map((url) => toMerchantJpegUrl(url.trim()))
    .map((url) => String(url || '').trim().replace(/,\s*/g, ''))
    .filter((url) => IMAGE_OK.test(url))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .slice(0, 8);
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

function categoryOf(product) {
  if (product && (product.category || product.productName)) return tnCategoryOf(product);
  return String(process.env.TN_EXCEL_CATEGORY || DEFAULT_CATEGORY);
}

function tnSalePrice(product, usdRate, brands) {
  return tnListPrice(product, usdRate, brands);
}

function rowOf(product, { usdRate, brands } = {}) {
  const sku = skuOf(product);
  const display = tnDisplayPrices(product, usdRate, brands, sku);
  const box = parseBox(product);
  const images = galleryOf(product);
  const stock = tnStockQty(product);
  return {
    nombre: safeName(product.productName),
    sku,
    categoria: categoryOf(product),
    breve_descripcion: shortDescriptionOf(product),
    descripcion: descriptionOf(product),
    precio: display.price,
    precio_especial: display.promo ? display.specialPrice : '',
    precio_especial_fecha_desde: display.promo ? display.from : '',
    precio_especial_fecha_hasta: display.promo ? display.to : '',
    stock,
    peso: Number(formatTnWeight(weightOf(product))),
    ancho: box.ancho,
    alto: box.alto,
    largo: box.largo,
    imagenes: images.join(','),
    _discountBrand: isDiscountBrand(product, brands)
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
    .select('codigo productName brandName category subcategory description seoDescription price sellingPrice purchasePrice purchasePriceUSD exchangeRate visaoPrecioFuente stock stockStatus productImage specifications technicalSpecifications shippingWeightKg tiendaNaranja')
    .sort({ codigo: 1 })
    .lean();
}

function workbookOf(products, { usdRate, brands } = {}) {
  const rows = products
    .map((product) => rowOf(product, { usdRate, brands }))
    .filter((row) => row.sku && row.nombre && row.imagenes && row.precio && Number(row.stock) > 0)
    .map(({ _discountBrand, ...row }) => row);
  const sheet = XLSX.utils.json_to_sheet(rows, { header: COLUMNS });
  sheet['!cols'] = COLUMNS.map((name) => ({ wch: name === 'descripcion' || name === 'imagenes' ? 60 : 22 }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Hoja1');
  return { book, rows };
}

function writeXls(book) {
  return XLSX.write(book, { type: 'buffer', bookType: 'xls', bookSST: true });
}

async function buildExcel({ onlyStock = true, usdRate } = {}) {
  const rate = await resolveUsdRate(usdRate);
  const brands = await getDiscountBrands();
  const products = await listProducts({ onlyStock });
  const { book, rows } = workbookOf(products, { usdRate: rate, brands });
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date());
  return {
    buffer: writeXls(book),
    filename: `zenn-tienda-naranja-${day}.xls`,
    count: rows.length
  };
}

async function buildExcelNuevos({ existingSkus, usdRate } = {}) {
  const rate = await resolveUsdRate(usdRate);
  const brands = await getDiscountBrands();
  const remote = existingSkus instanceof Set
    ? existingSkus
    : new Set([...(existingSkus || [])].map((sku) => String(sku).toUpperCase()));
  const products = await listProducts({ onlyStock: true });
  const create = products
    .map((product) => rowOf(product, { usdRate: rate, brands }))
    .filter((row) => {
      if (!row.sku || !row.nombre || !row.imagenes || !row.precio || Number(row.stock) <= 0) return false;
      return !remote.has(String(row.sku).toUpperCase());
    })
    .map(({ _discountBrand, ...row }) => row);
  const sheet = XLSX.utils.json_to_sheet(create, { header: COLUMNS });
  sheet['!cols'] = COLUMNS.map((name) => ({ wch: name === 'descripcion' || name === 'imagenes' ? 70 : 22 }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Hoja1');
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date());
  return {
    buffer: writeXls(book),
    filename: `zenn-tn-solo-nuevos-${day}.xls`,
    count: create.length,
    skippedExisting: remote.size
  };
}

module.exports = {
  COLUMNS,
  skuOf,
  rowOf,
  galleryOf,
  listProducts,
  workbookOf,
  buildExcel,
  buildExcelNuevos,
  writeXls,
  tnSalePrice,
  visaoGs,
  TN_MARKUP
};
