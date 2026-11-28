'use strict';

const TnSettings = require('../models/tnSettingsModel');
const { DEFAULT_DISCOUNT_BRANDS } = require('../models/tnSettingsModel');

/**
 * Precio TN = lo mismo que Zenn, +10%.
 * - venta TN   = sellingPrice × 1.10
 * - anterior TN = price × 1.10 (si price > sellingPrice)
 * En Magento/TN: `price` = anterior (tachado), `special_price` = venta.
 */
const WEB_MARKUP = 1.1;
const TN_MARKUP = WEB_MARKUP;
const TN_STOCK_IN_VISAO = 5;

/** Compat legacy exports */
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

/** Stock vendible real en Zenn (no usa el flag viejo inVisao). */
function hasZennStock(product) {
  const qty = Number(product && product.stock);
  if (!Number.isFinite(qty) || qty <= 0) return false;
  if (String(product && product.stockStatus || '') === 'out_of_stock') return false;
  return true;
}

function inVisao(product) {
  // El stock de Mongo manda: sin stock en Zenn = sin stock en TN / Excel.
  return hasZennStock(product);
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

function webListGs(product) {
  return Math.round(Number(product && product.price) || 0);
}

function withMarkup(amount) {
  const base = Math.round(Number(amount) || 0);
  if (base <= 0) return 0;
  return Math.max(1, Math.round(base * WEB_MARKUP));
}

/** Precio de venta a enviar a TN (sellingPrice × 1.10). */
function tnListPrice(product) {
  return withMarkup(webSellGs(product));
}

/** Promos TN: desde hoy 00:00 hasta dentro de 3 días 23:59 (hora Asunción aproximada local). */
function promoDateRange({ days = 3 } = {}) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(days || 3), 23, 59, 0);
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  };
  return { from: fmt(from), to: fmt(to) };
}

/**
 * Misma lógica que ve el cliente en Zenn, pero ×1.10.
 * Si hay precio anterior mayor → TN muestra tachado (price) + especial (venta).
 */
function tnDisplayPrices(product) {
  const sell = webSellGs(product);
  const list = webListGs(product);
  const saleTn = withMarkup(sell);
  if (saleTn <= 0) {
    return {
      price: 0,
      specialPrice: 0,
      pct: 0,
      promo: false,
      from: '',
      to: '',
      zennSell: sell,
      zennList: list
    };
  }

  const hasStrike = list > sell && list > 0;
  if (hasStrike) {
    const listTn = withMarkup(list);
    const dates = promoDateRange();
    return {
      price: listTn,
      specialPrice: saleTn,
      pct: listTn > 0 ? Math.round(((listTn - saleTn) / listTn) * 1000) / 10 : 0,
      promo: true,
      from: dates.from,
      to: dates.to,
      zennSell: sell,
      zennList: list
    };
  }

  return {
    price: saleTn,
    specialPrice: 0,
    pct: 0,
    promo: false,
    from: '',
    to: '',
    zennSell: sell,
    zennList: list
  };
}

function pastStamp() {
  const date = new Date();
  date.setDate(date.getDate() - 2);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day} 00:00:00`;
}

/**
 * Atributos que se pueden mandar a Magento.
 * Nunca incluye 0 ni vacío: un especial vacío Magento lo guarda como Gs. 0.
 * Sin promo, el especial es el mismo precio de venta y ya está vencido.
 */
function tnPriceAttributes(display) {
  const price = Math.round(Number(display && display.price) || 0);
  const special = Math.round(Number(display && display.specialPrice) || 0);
  if (!(price > 0)) return null;
  const promo = Boolean(display && display.promo) && special > 0 && special < price;
  if (promo) {
    return {
      price,
      specialPrice: special,
      promo: true,
      custom: [
        { attribute_code: 'special_price', value: String(special) },
        { attribute_code: 'special_from_date', value: display.from },
        { attribute_code: 'special_to_date', value: display.to }
      ]
    };
  }
  const past = pastStamp();
  return {
    price,
    specialPrice: price,
    promo: false,
    custom: [
      { attribute_code: 'special_price', value: String(price) },
      { attribute_code: 'special_from_date', value: past },
      { attribute_code: 'special_to_date', value: past }
    ]
  };
}

function tnStockQty(product) {
  return hasZennStock(product) ? TN_STOCK_IN_VISAO : 0;
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
  hasZennStock,
  visaoGs,
  webSellGs,
  webListGs,
  withMarkup,
  tnListPrice,
  tnDisplayPrices,
  tnPriceAttributes,
  tnStockQty,
  displayPromoActive,
  promoDateRange,
  DISPLAY_PROMO_FROM: '',
  DISPLAY_PROMO_UNTIL: '',
  resolveUsdRate
};
