'use strict';

const TnSettings = require('../models/tnSettingsModel');
const { DEFAULT_DISCOUNT_BRANDS } = require('../models/tnSettingsModel');

/**
 * Precio TN = precio de venta de la web (sellingPrice) × 1.10.
 * Nada de Visão × márgenes × marcas.
 */
const WEB_MARKUP = 1.1;
const TN_MARKUP = WEB_MARKUP;
const TN_STOCK_IN_VISAO = 5;

/** Compat: ya no se usa para armar precio, se deja exportado por si algo lo lee. */
const IVA = 1.1;
const ZENN_MARGIN = 1;
const ITAU_MARGIN = 1;
const BRAND_DISCOUNT = 1;

let brandsCache = { at: 0, list: [...DEFAULT_DISCOUNT_BRANDS] };

function normalizeBrand(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function getTnSettings() {
  let doc = await TnSettings.findOne({ key: 'tienda-naranja' });
  if (!doc) {
    doc = await TnSettings.create({
      key: 'tienda-naranja',
      discountBrands: [...DEFAULT_DISCOUNT_BRANDS]
    });
  }
  if (!Array.isArray(doc.discountBrands) || !doc.discountBrands.length) {
    doc.discountBrands = [...DEFAULT_DISCOUNT_BRANDS];
    await doc.save();
  }
  brandsCache = {
    at: Date.now(),
    list: doc.discountBrands.map(normalizeBrand).filter(Boolean)
  };
  return doc;
}

async function getDiscountBrands() {
  if (Date.now() - brandsCache.at < 30_000 && brandsCache.list.length) {
    return brandsCache.list;
  }
  const doc = await getTnSettings();
  return (doc.discountBrands || []).map(normalizeBrand).filter(Boolean);
}

async function setDiscountBrands(brands) {
  const cleaned = [...new Set(
    (Array.isArray(brands) ? brands : String(brands || '').split(/[,;\n]+/))
      .map(normalizeBrand)
      .filter(Boolean)
  )];
  const doc = await getTnSettings();
  doc.discountBrands = cleaned.length ? cleaned : [...DEFAULT_DISCOUNT_BRANDS];
  await doc.save();
  brandsCache = { at: Date.now(), list: doc.discountBrands.map(normalizeBrand) };
  return doc.discountBrands;
}

function brandHaystack(product) {
  return normalizeBrand(`${product.brandName || ''} ${product.productName || ''}`);
}

function isDiscountBrand(product, brands) {
  const list = Array.isArray(brands) && brands.length ? brands : brandsCache.list;
  const hay = brandHaystack(product);
  return list.some((brand) => brand && hay.includes(brand));
}

function inVisao(product) {
  if (product && product.tiendaNaranja && product.tiendaNaranja.inVisao === true) return true;
  if (product && product.tiendaNaranja && product.tiendaNaranja.inVisao === false) return false;
  return Number(product && product.stock) > 0 && String(product.stockStatus || '') !== 'out_of_stock';
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

function webSellGs(product) {
  const sell = Math.round(Number(product && product.sellingPrice) || 0);
  if (sell > 0) return sell;
  return Math.round(Number(product && product.price) || 0);
}

/** Precio a enviar a Tienda Naranja: venta web + 10%. */
function tnListPrice(product) {
  const base = webSellGs(product);
  if (base <= 0) return 0;
  return Math.max(1, Math.round(base * WEB_MARKUP));
}

/**
 * Mismo precio en list y sin special inventado.
 * (Antes había un “tachado” fake hasta el 20/11; eso distorsionaba lo que ve el cliente.)
 */
function tnDisplayPrices(product) {
  const price = tnListPrice(product);
  return {
    price,
    specialPrice: 0,
    pct: 0,
    promo: false,
    from: '',
    to: ''
  };
}

function tnStockQty(product) {
  return inVisao(product) ? TN_STOCK_IN_VISAO : 0;
}

function displayPromoActive() {
  return false;
}

async function resolveUsdRate(usdRate) {
  let rate = Number(usdRate) || 0;
  if (rate) return rate;
  try {
    const ExchangeRate = require('../models/exchangeRateModel');
    const current = await ExchangeRate.getCurrentRate('USD');
    rate = Number(current && current.toPYG) || 6200;
  } catch {
    rate = 6200;
  }
  return rate;
}

module.exports = {
  IVA,
  ZENN_MARGIN,
  ITAU_MARGIN,
  BRAND_DISCOUNT,
  WEB_MARKUP,
  TN_MARKUP,
  TN_STOCK_IN_VISAO,
  DEFAULT_DISCOUNT_BRANDS,
  normalizeBrand,
  getTnSettings,
  getDiscountBrands,
  setDiscountBrands,
  isDiscountBrand,
  inVisao,
  visaoGs,
  webSellGs,
  tnListPrice,
  tnDisplayPrices,
  tnStockQty,
  displayPromoActive,
  DISPLAY_PROMO_FROM: '',
  DISPLAY_PROMO_UNTIL: '',
  resolveUsdRate
};
