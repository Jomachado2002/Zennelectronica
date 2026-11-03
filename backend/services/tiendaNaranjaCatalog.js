'use strict';

const { keys, status, saveCatalogProduct } = require('./tiendaNaranjaClient');
const { formatTnWeight, estimateWeight } = require('./productWeightService');
const { toMerchantJpegUrl } = require('../helpers/merchantJpeg');
const { tnListPrice } = require('./tiendaNaranjaPricing');

/** Precio TN = sellingPrice web × 1.10 (misma regla que el sync masivo). */
function tnPrices(product) {
  const price = tnListPrice(product);
  return {
    price,
    specialPrice: 0,
    promo: false
  };
}

function weightOf(product) {
  const saved = Number(product.shippingWeightKg);
  if (Number.isFinite(saved) && saved > 0) return saved;
  return estimateWeight(product).kg;
}

const IMAGE_OK = /\.(jpe?g|png|gif)(\?|#|$)/i;

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '').trim()}`;
}

function shortDescriptionOf(product) {
  const name = clip(product.productName, 160);
  const extra = clip(stripHtml(product.seoDescription || product.description || ''), 160);
  const brand = String(product.brandName || '').trim();
  const parts = [name];
  if (extra && extra.toLowerCase() !== name.toLowerCase()) parts.push(extra);
  if (brand) parts.push(`Marca ${brand}`);
  parts.push('Producto original disponible en Zenn Electrónica, con garantía y stock.');
  let text = parts.join('. ').replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').trim();
  text = clip(text, 180);
  if (text.length < 50) {
    text = clip(`${name}. Producto original disponible en Zenn Electrónica, con garantía y stock para entrega.`, 180);
  }
  if (text.length < 50) {
    text = 'Producto original disponible en Zenn Electrónica, con garantía y stock para entrega.';
  }
  return text;
}

function skuOf(product) {
  const prefix = keys().skuPrefix;
  const codigo = String(product.codigo || '').toUpperCase().replace(/\s+/g, '');
  if (!prefix || !codigo) return '';
  return `${prefix}-${codigo}`;
}

function galleryOf(product) {
  return (product.productImage || [])
    .map((url) => (typeof url === 'string' ? toMerchantJpegUrl(url) : ''))
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url) && IMAGE_OK.test(url))
    .slice(0, 8);
}

function categoryIdsOf(product) {
  if (Array.isArray(product.tnCategoryIds) && product.tnCategoryIds.length === 3) {
    return product.tnCategoryIds.map(String);
  }
  const raw = String(process.env.TN_DEFAULT_CATEGORY_IDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return raw.length === 3 ? raw : [];
}

function money(value) {
  const number = Math.round(Number(value) || 0);
  return number > 0 ? String(number) : '';
}

function readiness(product) {
  const missing = [];
  const sku = skuOf(product);
  const categories = categoryIdsOf(product);
  const images = galleryOf(product);
  if (!status().hasSellerLogin && !status().hasBearer) missing.push('credenciales');
  if (!sku) missing.push('prefijo de SKU');
  if (categories.length !== 3) missing.push('tres IDs de categoría');
  if (!product.productName) missing.push('nombre');
  if (!money(product.sellingPrice || product.price)) missing.push('precio');
  if (!images.length) missing.push('imagen JPG/PNG/GIF pública');
  return {
    ok: missing.length === 0,
    sku,
    categories,
    images,
    missing
  };
}

function createPayload(product) {
  const ready = readiness(product);
  if (!ready.ok) {
    const error = new Error(`Falta ${ready.missing.join(', ')} para mandar ${product.codigo || 'el producto'} a Tienda Naranja`);
    error.statusCode = 400;
    throw error;
  }
  const prices = tnPrices(product);
  const description = product.description || `<p>${clip(product.productName, 180)}</p>`;
  const weight = formatTnWeight(weightOf(product));
  return {
    type: 'simple',
    set: '4',
    product: {
      name: clip(product.productName, 180),
      sku: ready.sku,
      category_ids: ready.categories,
      short_description: shortDescriptionOf(product),
      description,
      price: money(prices.price),
      special_price: '',
      quantity_and_stock_status: {
        qty: String(Math.max(0, Number(product.stock) || 0)),
        is_in_stock: Number(product.stock) > 0 ? '1' : '0'
      },
      visibility: '4',
      weight,
      ts_dimensions_width: String(process.env.TN_DEFAULT_WIDTH || '10'),
      ts_dimensions_height: String(process.env.TN_DEFAULT_HEIGHT || '10'),
      ts_dimensions_length: String(process.env.TN_DEFAULT_LENGTH || '10'),
      product_gallery: ready.images
    }
  };
}

function updatePayload(product, fields = {}) {
  const entityId = String(product.tiendaNaranja && product.tiendaNaranja.entityId || fields.entityId || '');
  if (!entityId) {
    const error = new Error(`Ese producto todavía no tiene entity_id de Tienda Naranja`);
    error.statusCode = 400;
    throw error;
  }
  const list = Number(product.price) || 0;
  const sell = Number(product.sellingPrice) || list;
  const body = {
    type: 'simple',
    product: {
      entity_id: entityId,
      product_gallery_mode: 'noop'
    }
  };
  if (fields.price !== false) {
    const { tnListPrice } = require('./tiendaNaranjaPricing');
    body.product.price = money(tnListPrice(product) || sell || list);
    body.product.special_price = '';
  }
  if (fields.stock !== false) {
    body.product.quantity_and_stock_status = {
      qty: String(Math.max(0, Number(product.stock) || 0))
    };
  }
  if (fields.images === 'replace' || fields.images === 'append') {
    const images = galleryOf(product);
    if (images.length) {
      body.product.product_gallery_mode = fields.images;
      body.product.product_gallery = images;
      if (fields.images === 'replace') body.product.product_gallery_set_main = 1;
    }
  }
  return body;
}

function readResult(data) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: 1, message: 'Tienda Naranja no devolvió confirmación' };
  return {
    error: Number(row.error) || 0,
    productId: String(row.product_id || ''),
    message: String(row.message || ''),
    rowId: String(row.row_id || '')
  };
}

async function pushProduct(product, { images } = {}) {
  const sku = skuOf(product);
  if (!sku) {
    const error = new Error('Falta el SKU para Tienda Naranja');
    error.statusCode = 400;
    throw error;
  }
  const prices = tnPrices(product);
  const qty = Math.max(0, Number(product.stock) || 0);
  const cats = categoryIdsOf(product);
  const weight = Number(formatTnWeight(weightOf(product)));
  const saved = await saveCatalogProduct(sku, {
    sku,
    name: clip(product.productName, 180),
    price: prices.price,
    weight,
    status: 1,
    visibility: 4,
    type_id: 'simple',
    attribute_set_id: 4,
    extension_attributes: {
      stock_item: { qty, is_in_stock: qty > 0 },
      category_links: cats.map((id, position) => ({ position, category_id: String(id) }))
    },
    custom_attributes: [
      keys().sellerId ? { attribute_code: 'seller_id', value: keys().sellerId } : null,
      { attribute_code: 'description', value: product.description || clip(product.productName, 400) },
      { attribute_code: 'short_description', value: clip(product.productName, 180) },
      { attribute_code: 'special_price', value: '' },
      { attribute_code: 'special_from_date', value: '' },
      { attribute_code: 'special_to_date', value: '' }
    ].filter(Boolean)
  });
  return {
    error: 0,
    productId: String(saved.id || ''),
    message: 'Producto enviado a Tienda Naranja',
    sku,
    price: prices.price,
    specialPrice: prices.specialPrice,
    weight,
    images
  };
}

module.exports = {
  skuOf,
  galleryOf,
  categoryIdsOf,
  readiness,
  tnPrices,
  weightOf,
  shortDescriptionOf,
  createPayload,
  updatePayload,
  readResult,
  pushProduct
};
