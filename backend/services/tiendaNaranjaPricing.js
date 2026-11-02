'use strict';

const TnSettings = require('../models/tnSettingsModel');
const { DEFAULT_DISCOUNT_BRANDS } = require('../models/tnSettingsModel');

const IVA = 1.1;
const ZENN_MARGIN = 1.15;
const ITAU_MARGIN = 1.1;
const BRAND_DISCOUNT = 0.95;
const TN_MARKUP = IVA * ZENN_MARGIN * ITAU_MARGIN;
const TN_STOCK_IN_VISAO = 5;
/** Hasta esta fecha se manda precio tachado + especial para que se vea el descuento en TN. */
const DISPLAY_PROMO_UNTIL = '2026-11-20';
const DISPLAY_PROMO_FROM = '2026-11-01';
const DISPLAY_DISCOUNT_MIN = 40;
const DISPLAY_DISCOUNT_MAX = 70;

let brandsCache = { at: 0, list: [...DEFAULT_DISCOUNT_BRANDS] };

function hash01(sku) {
  let n = 0;
  for (const char of String(sku || '')) n = (n * 33 + char.charCodeAt(0)) >>> 0;
  return (n % 10000) / 10000;
}

function asuncionYmd(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(date);
}

function displayPromoActive(now = new Date()) {
  const day = asuncionYmd(now);
  return day >= DISPLAY_PROMO_FROM && day <= DISPLAY_PROMO_UNTIL;
}

function displayDiscountPct(sku) {
  const span = DISPLAY_DISCOUNT_MAX - DISPLAY_DISCOUNT_MIN;
  return DISPLAY_DISCOUNT_MIN + Math.round(hash01(sku) * span);
}

function listFromSpecial(special, pct) {
  const sell = Math.max(1, Math.round(Number(special) || 0));
  const factor = 1 - Number(pct) / 100;
  if (!(factor > 0 && factor < 1)) return sell;
  return Math.max(sell + 1, Math.round(sell / factor));
}

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

function tnListPrice(product, usdRate, brands) {
  const base = visaoGs(product, usdRate);
  if (base <= 0) return 0;
  let price = Math.round(base * TN_MARKUP);
  if (isDiscountBrand(product, brands)) {
    price = Math.max(1, Math.round(price * BRAND_DISCOUNT));
  }
  return price;
}

/**
 * Precio real de venta TN (special) + precio tachado (list) para que se vea el descuento.
 * Vigente hasta DISPLAY_PROMO_UNTIL inclusive (America/Asuncion).
 */
function tnDisplayPrices(product, usdRate, brands, sku) {
  const special = tnListPrice(product, usdRate, brands);
  if (special <= 0) {
    return {
      price: 0,
      specialPrice: 0,
      pct: 0,
      promo: false,
      from: '',
      to: ''
    };
  }
  if (!displayPromoActive()) {
    return {
      price: special,
      specialPrice: 0,
      pct: 0,
      promo: false,
      from: '',
      to: ''
    };
  }
  const code = sku || product.codigo || product.sku || '';
  const pct = displayDiscountPct(code);
  const price = listFromSpecial(special, pct);
  return {
    price,
    specialPrice: special,
    pct,
    promo: true,
    from: `${DISPLAY_PROMO_FROM} 00:00:00`,
    to: `${DISPLAY_PROMO_UNTIL} 23:59:00`
  };
}

function tnStockQty(product) {
  return inVisao(product) ? TN_STOCK_IN_VISAO : 0;
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
  tnListPrice,
  tnDisplayPrices,
  tnStockQty,
  displayPromoActive,
  DISPLAY_PROMO_FROM,
  DISPLAY_PROMO_UNTIL,
  resolveUsdRate
};
