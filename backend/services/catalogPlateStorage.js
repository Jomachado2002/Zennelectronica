'use strict';

const ProductModel = require('../models/productModel');
const { renderCatalogPlate } = require('./catalogPlateImage');
const {
  uploadBufferToR2,
  deleteObjectFromR2,
  r2KeyFromPublicUrl,
  isR2Configured
} = require('./r2StorageService');

const PLATE_VERSION = 'p2';
const VISUAL_FIELDS = new Set(['productName', 'brandName', 'price', 'sellingPrice', 'productImage']);
const MIN_PRICE = 1000;

function imageSignature(images) {
  return (Array.isArray(images) ? images : []).map((url) => {
    const file = String(url || '').split('?')[0].split('/').pop();
    const index = file.match(/_(\d+)\.[a-z0-9]+$/i);
    return index ? index[1] : file;
  }).join(',');
}

function plateStamp(product) {
  const original = Number(product.price) || 0;
  const finalPrice = Number(product.sellingPrice) > 0 ? Number(product.sellingPrice) : original;
  const raw = `${PLATE_VERSION}|${finalPrice}|${original}|${product.productName || ''}|${product.brandName || ''}|${imageSignature(product.productImage)}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 33 + raw.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

function plateKey(codigo, stamp) {
  const safe = String(codigo || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  return `catalog-plates/${safe}-${stamp}.jpg`;
}

function needsPlate(product) {
  const images = Array.isArray(product.productImage) ? product.productImage : [];
  const hasPhoto = images.some((url) => /^https:\/\//.test(String(url || '')));
  const price = Number(product.sellingPrice) > 0 ? Number(product.sellingPrice) : Number(product.price) || 0;
  return Boolean(product.codigo && product.productName && hasPhoto && price >= MIN_PRICE);
}

async function clearPlateFields(ids) {
  if (!ids.length) return;
  await ProductModel.updateMany(
    { _id: { $in: ids } },
    { $set: { catalogPlateUrl: '', catalogPlateStamp: '' } }
  );
}

async function removePlates(docs) {
  const list = (docs || []).filter((doc) => doc && doc.catalogPlateUrl);
  await mapPool(list, 6, async (doc) => {
    await deletePlateUrl(doc.catalogPlateUrl);
    return { codigo: doc.codigo, action: 'removed' };
  });
  await clearPlateFields(list.map((doc) => doc._id));
  return list.length;
}

async function deletePlateUrl(url) {
  const key = r2KeyFromPublicUrl(url);
  if (!key || !key.startsWith('catalog-plates/')) return;
  try {
    await deleteObjectFromR2(key);
  } catch (error) {
    const code = error && (error.name || error.Code);
    if (code !== 'NoSuchKey' && code !== 'NotFound') {
      console.warn('[catalogo] no pude borrar', key, error.message || error);
    }
  }
}

async function publishOne(product) {
  const stamp = plateStamp(product);
  if (product.catalogPlateStamp === stamp && product.catalogPlateUrl) {
    return { codigo: product.codigo, action: 'skipped' };
  }
  const jpeg = await renderCatalogPlate(product);
  const key = plateKey(product.codigo, stamp);
  const url = await uploadBufferToR2(jpeg, key, {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000, immutable',
    metadata: { codigo: String(product.codigo).slice(0, 64), stamp }
  });
  const previous = product.catalogPlateUrl;
  await ProductModel.updateOne(
    { _id: product._id },
    { $set: { catalogPlateUrl: url, catalogPlateStamp: stamp } }
  );
  if (previous && previous !== url) await deletePlateUrl(previous);
  return { codigo: product.codigo, action: previous ? 'replaced' : 'created', url };
}

async function mapPool(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Math.max(1, Math.min(limit, items.length || 1));
  async function worker() {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) break;
      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        results[index] = {
          codigo: items[index] && items[index].codigo,
          action: 'error',
          error: error.message || String(error)
        };
      }
    }
  }
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/**
 * Sube la plantilla al CDN. Si llegan códigos, rehace esos (precio, nombre o foto nuevos)
 * y borra la imagen anterior. includeMissing completa los que todavía no tienen plantilla.
 */
async function syncCatalogPlates(options = {}) {
  if (!isR2Configured()) {
    throw new Error('El CDN no está configurado');
  }
  const concurrency = Math.max(1, Math.min(6, Number(options.concurrency) || 3));
  const wanted = new Set(
    (options.codigos || []).map((code) => String(code || '').trim().toUpperCase()).filter(Boolean)
  );
  const includeMissing = options.includeMissing !== false;

  const docs = await ProductModel.find({
    productName: { $exists: true, $nin: [null, ''] },
    productImage: { $exists: true, $ne: [] },
    $or: [
      { sellingPrice: { $gte: MIN_PRICE } },
      { price: { $gte: MIN_PRICE } }
    ]
  })
    .select('codigo productName brandName price sellingPrice productImage catalogPlateUrl catalogPlateStamp')
    .lean();

  const queue = [];
  for (const product of docs) {
    if (!needsPlate(product)) continue;
    const code = String(product.codigo).toUpperCase();
    const changed = wanted.has(code);
    const missing = !product.catalogPlateUrl || product.catalogPlateStamp !== plateStamp(product);
    if (missing && (changed || includeMissing)) queue.push(product);
  }

  console.log(`[catalogo] plantillas por subir: ${queue.length} (revisados ${docs.length})`);
  const results = await mapPool(queue, concurrency, async (product, index) => {
    const row = await publishOne(product);
    if ((index + 1) % 25 === 0 || index === queue.length - 1) {
      console.log(`[catalogo] ${index + 1}/${queue.length} ${product.codigo} ${row.action}`);
    }
    return row;
  });

  const summary = {
    queued: queue.length,
    created: results.filter((row) => row && row.action === 'created').length,
    replaced: results.filter((row) => row && row.action === 'replaced').length,
    skipped: results.filter((row) => row && row.action === 'skipped').length,
    errors: results.filter((row) => row && row.action === 'error').length
  };
  const firstErrors = results.filter((row) => row && row.action === 'error').slice(0, 8);
  console.log(
    `[catalogo] listas=${summary.created} reemplazadas=${summary.replaced} iguales=${summary.skipped} errores=${summary.errors}`
  );
  firstErrors.forEach((row) => console.warn(`[catalogo] error ${row.codigo}: ${row.error}`));
  return { ...summary, firstErrors };
}

async function removeCatalogPlatesForCodigos(codigos) {
  const wanted = [...new Set(
    (codigos || []).map((code) => String(code || '').trim().toUpperCase()).filter(Boolean)
  )];
  if (!wanted.length || !isR2Configured()) return 0;
  const docs = await ProductModel.find({
    codigo: { $in: wanted },
    catalogPlateUrl: { $gt: '' }
  })
    .select('codigo catalogPlateUrl')
    .lean();
  const removed = await removePlates(docs);
  if (removed) console.log(`[catalogo] plantillas borradas por baja: ${removed}`);
  return removed;
}

async function purgeIneligiblePlates() {
  if (!isR2Configured()) return 0;
  const docs = await ProductModel.find({ catalogPlateUrl: { $gt: '' } })
    .select('codigo productName price sellingPrice productImage catalogPlateUrl')
    .lean();
  const stale = docs.filter((product) => !needsPlate(product));
  const removed = await removePlates(stale);
  if (removed) console.log(`[catalogo] plantillas borradas sin foto o sin precio: ${removed}`);
  return removed;
}

async function refreshCatalogPlatesAfterSync(persistResults, options = {}) {
  const removed = await removeCatalogPlatesForCodigos(options.removedCodigos);
  const codigos = [];
  for (const row of persistResults || []) {
    if (!row || !row.codigo) continue;
    if (row.action === 'created') {
      codigos.push(row.codigo);
      continue;
    }
    if (row.action !== 'updated') continue;
    const fields = Array.isArray(row.changedFields) ? row.changedFields : [];
    if (fields.some((field) => VISUAL_FIELDS.has(field))) codigos.push(row.codigo);
  }
  const summary = await syncCatalogPlates({ codigos, includeMissing: true, concurrency: 3 });
  const purged = await purgeIneligiblePlates();
  return { ...summary, removed, purged };
}

module.exports = {
  plateStamp,
  syncCatalogPlates,
  refreshCatalogPlatesAfterSync,
  removeCatalogPlatesForCodigos
};
