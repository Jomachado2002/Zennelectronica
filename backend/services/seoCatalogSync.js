'use strict';

/**
 * Sincronización incremental del catálogo SEO → SeoCatalogIndex.
 * Disparo: post-worker Visão (éxito) o manual.
 * No toca precios/stock comerciales; solo metadatos de URL.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const productModel = require('../models/productModel');
const Category = require('../models/categoryModel');
const CategorySeo = require('../models/categorySeoModel');
const SeoCatalogIndex = require('../models/seoCatalogIndexModel');
const SeoCatalogSyncRun = require('../models/seoCatalogSyncRunModel');
const { priorityCategoryHub } = require('./priorityCategoryHubs');
const { formatGuaranies } = require('./productSearchCopy');

const SITE = (process.env.PUBLIC_SITE_URL || 'https://www.zenn.com.py').replace(/\/$/, '');
const BATCH = Math.max(100, Math.min(1000, Number(process.env.SEO_CATALOG_SYNC_BATCH) || 500));
const LOCK_MS = 45 * 60 * 1000;

let running = false;

function sha1(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex');
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1).replace(/\s+\S*$/, '').trim();
  return cut.length > 20 ? cut : text.slice(0, max).trim();
}

function normalizeBrandKey(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function categoryPath(category, subcategory) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (subcategory) params.set('subcategory', subcategory);
  const q = params.toString();
  return `/categoria-producto${q ? `?${q}` : ''}`;
}

function brandSearchPath(brandName) {
  return `/buscar?q=${encodeURIComponent(String(brandName || '').trim())}`;
}

function humanize(value) {
  return String(value || '')
    .replace(/__[\d_]+$/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function asuncionDay() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Asuncion',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function newRunId() {
  return new mongoose.Types.ObjectId().toString();
}

function makeDoc(partial) {
  const canonicalPath = partial.canonicalPath;
  return {
    ...partial,
    canonicalUrl: `${SITE}${canonicalPath}`,
    lastSyncedAt: new Date()
  };
}

async function flushOps(ops, stats, dryRun) {
  if (!ops.length) return;
  stats.writes += ops.length;
  if (dryRun) {
    ops.length = 0;
    return;
  }
  const result = await SeoCatalogIndex.bulkWrite(ops, { ordered: false });
  stats.inserted += result.upsertedCount || 0;
  stats.updated += result.modifiedCount || 0;
  ops.length = 0;
}

async function loadExistingHashes(entityType) {
  const rows = await SeoCatalogIndex.find({ entityType })
    .select('entityKey contentHash indexable')
    .lean();
  const map = new Map();
  for (const row of rows) map.set(row.entityKey, row);
  return map;
}

async function syncBrands({ runId, stats, dryRun, seenKeys }) {
  stats.checkpoint = 'brands';
  const existing = await loadExistingHashes('brand');
  stats.reads += existing.size;

  const pipeline = [
    {
      $match: {
        brandName: { $nin: ['', null] },
        stock: { $gt: 0 },
        sellingPrice: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: '$brandName',
        productCount: { $sum: 1 },
        minPrice: { $min: '$sellingPrice' },
        maxPrice: { $max: '$sellingPrice' },
        sourceUpdatedAt: { $max: '$updatedAt' }
      }
    },
    { $sort: { productCount: -1 } }
  ];

  const ops = [];
  const cursor = productModel.aggregate(pipeline).cursor({ batchSize: BATCH });
  for await (const row of cursor) {
    stats.reads += 1;
    stats.examined += 1;
    const brandName = String(row._id || '').trim();
    if (!brandName) continue;
    const norm = normalizeBrandKey(brandName);
    if (!norm) continue;
    const entityKey = `brand:${norm}`;
    seenKeys.add(entityKey);
    stats.brands += 1;

    const productCount = Number(row.productCount) || 0;
    const minPrice = Number(row.minPrice) || 0;
    const maxPrice = Number(row.maxPrice) || 0;
    const indexable = productCount >= 1;
    const minLabel = formatGuaranies(minPrice);
    const seoTitle = clip(`${brandName} en Paraguay | Zenn`, 60);
    const h1 = clip(`${brandName} en Paraguay`, 70);
    const seoDescription = clip(
      productCount
        ? `${brandName} en Zenn, Asunción. ${productCount} productos con stock${minLabel ? `, desde ${minLabel}` : ''}. Envío a todo Paraguay.`
        : `${brandName} en Zenn Paraguay.`,
      160
    );
    const contentHash = sha1(
      [brandName, productCount, minPrice, maxPrice, indexable, seoTitle, seoDescription].join('|')
    );
    const prev = existing.get(entityKey);
    if (prev && prev.contentHash === contentHash) {
      stats.unchanged += 1;
      continue;
    }

    const doc = makeDoc({
      entityType: 'brand',
      entityKey,
      entityId: norm,
      slug: norm.replace(/\s+/g, '-'),
      canonicalPath: brandSearchPath(brandName),
      seoTitle,
      seoDescription,
      h1,
      label: brandName,
      brandName,
      productCount,
      minPrice,
      maxPrice,
      indexable,
      exclusionReason: indexable ? '' : 'sin_stock',
      contentHash,
      sourceUpdatedAt: row.sourceUpdatedAt || null,
      syncRunId: runId
    });

    ops.push({
      updateOne: {
        filter: { entityKey },
        update: { $set: doc },
        upsert: true
      }
    });
    if (ops.length >= BATCH) await flushOps(ops, stats, dryRun);
  }
  await flushOps(ops, stats, dryRun);
}

function buildHubCopy(category, subcategory, label, count, minPrice) {
  const priority = priorityCategoryHub(category, subcategory);
  const seoTitle = priority?.seoTitle || clip(`${label} en Paraguay`, 60);
  const intro = priority?.buildIntro
    ? priority.buildIntro({ total: count, minLabel: formatGuaranies(minPrice), brands: [] })
    : clip(
        count
          ? `Hay ${count} ${String(label).toLowerCase()} con stock en Zenn, desde ${formatGuaranies(minPrice)}. Envío a Asunción y todo Paraguay.`
          : `${label} en Zenn, Asunción. Sin stock por ahora.`,
        240
      );
  return { seoTitle, intro, h1: priority?.h1 || seoTitle };
}

async function loadTaxonomyStockStats() {
  const parentRows = await productModel.aggregate([
    { $match: { stock: { $gt: 0 }, category: { $nin: ['', null] } } },
    {
      $group: {
        _id: '$category',
        productCount: { $sum: 1 },
        minPrice: { $min: '$sellingPrice' },
        maxPrice: { $max: '$sellingPrice' }
      }
    }
  ]);
  const subRows = await productModel.aggregate([
    { $match: { stock: { $gt: 0 }, category: { $nin: ['', null] }, subcategory: { $nin: ['', null] } } },
    {
      $group: {
        _id: { category: '$category', subcategory: '$subcategory' },
        productCount: { $sum: 1 },
        minPrice: { $min: '$sellingPrice' },
        maxPrice: { $max: '$sellingPrice' }
      }
    }
  ]);
  const parents = new Map();
  for (const row of parentRows) {
    parents.set(row._id, {
      count: Number(row.productCount) || 0,
      minPrice: Number(row.minPrice) || 0,
      maxPrice: Number(row.maxPrice) || 0
    });
  }
  const subs = new Map();
  for (const row of subRows) {
    const key = `${row._id.category}::${row._id.subcategory}`;
    subs.set(key, {
      count: Number(row.productCount) || 0,
      minPrice: Number(row.minPrice) || 0,
      maxPrice: Number(row.maxPrice) || 0
    });
  }
  return { parents, subs, reads: 2 };
}

async function syncTaxonomy({ runId, stats, dryRun, seenKeys }) {
  stats.checkpoint = 'taxonomy';
  const day = asuncionDay();
  const existingCat = await loadExistingHashes('category');
  const existingSub = await loadExistingHashes('subcategory');
  stats.reads += existingCat.size + existingSub.size;

  const cats = await Category.find({ isActive: true })
    .select('label value updatedAt subcategories.label subcategories.value subcategories.isActive subcategories.updatedAt')
    .lean();
  stats.reads += 1;

  const stockStats = await loadTaxonomyStockStats();
  stats.reads += stockStats.reads;

  const ops = [];
  const categorySeoOps = [];

  for (const cat of cats) {
    if (!cat?.value) continue;
    stats.examined += 1;
    const label = cat.label || humanize(cat.value);
    const stock = stockStats.parents.get(cat.value) || { count: 0, minPrice: 0, maxPrice: 0 };
    const hub = buildHubCopy(cat.value, '', label, stock.count, stock.minPrice);
    const entityKey = `category:${cat.value}`;
    seenKeys.add(entityKey);
    stats.categories += 1;
    const indexable = stock.count >= 1;
    const contentHash = sha1(
      [cat.value, label, stock.count, stock.minPrice, stock.maxPrice, hub.seoTitle, hub.intro, indexable].join('|')
    );
    const prev = existingCat.get(entityKey);
    if (!prev || prev.contentHash !== contentHash) {
      ops.push({
        updateOne: {
          filter: { entityKey },
          update: {
            $set: makeDoc({
              entityType: 'category',
              entityKey,
              entityId: cat.value,
              slug: cat.value,
              canonicalPath: categoryPath(cat.value, ''),
              seoTitle: hub.seoTitle,
              seoDescription: clip(hub.intro, 160),
              h1: hub.h1,
              label,
              category: cat.value,
              subcategory: '',
              productCount: stock.count,
              minPrice: stock.minPrice,
              maxPrice: stock.maxPrice,
              indexable,
              exclusionReason: indexable ? '' : 'sin_stock',
              contentHash,
              sourceUpdatedAt: cat.updatedAt || null,
              syncRunId: runId
            })
          },
          upsert: true
        }
      });
      categorySeoOps.push({
        updateOne: {
          filter: { category: cat.value, subcategory: '' },
          update: {
            $set: {
              category: cat.value,
              subcategory: '',
              label,
              seoTitle: hub.seoTitle,
              intro: hub.intro,
              productCount: stock.count,
              minPrice: stock.minPrice,
              maxPrice: stock.maxPrice,
              updatedOn: day
            }
          },
          upsert: true
        }
      });
    } else {
      stats.unchanged += 1;
    }

    for (const sub of cat.subcategories || []) {
      if (!sub?.value || sub.isActive === false) continue;
      stats.examined += 1;
      const subLabel = sub.label || humanize(sub.value);
      const subStock = stockStats.subs.get(`${cat.value}::${sub.value}`) || {
        count: 0,
        minPrice: 0,
        maxPrice: 0
      };
      const subHub = buildHubCopy(cat.value, sub.value, subLabel, subStock.count, subStock.minPrice);
      const subKey = `subcategory:${cat.value}::${sub.value}`;
      seenKeys.add(subKey);
      stats.subcategories += 1;
      const subIndexable = subStock.count >= 1;
      const subHash = sha1(
        [cat.value, sub.value, subLabel, subStock.count, subStock.minPrice, subHub.seoTitle, subIndexable].join('|')
      );
      const prevSub = existingSub.get(subKey);
      if (!prevSub || prevSub.contentHash !== subHash) {
        ops.push({
          updateOne: {
            filter: { entityKey: subKey },
            update: {
              $set: makeDoc({
                entityType: 'subcategory',
                entityKey: subKey,
                entityId: sub.value,
                slug: sub.value,
                canonicalPath: categoryPath(cat.value, sub.value),
                seoTitle: subHub.seoTitle,
                seoDescription: clip(subHub.intro, 160),
                h1: subHub.h1,
                label: subLabel,
                category: cat.value,
                subcategory: sub.value,
                productCount: subStock.count,
                minPrice: subStock.minPrice,
                maxPrice: subStock.maxPrice,
                indexable: subIndexable,
                exclusionReason: subIndexable ? '' : 'sin_stock',
                contentHash: subHash,
                sourceUpdatedAt: sub.updatedAt || cat.updatedAt || null,
                syncRunId: runId
              })
            },
            upsert: true
          }
        });
        categorySeoOps.push({
          updateOne: {
            filter: { category: cat.value, subcategory: sub.value },
            update: {
              $set: {
                category: cat.value,
                subcategory: sub.value,
                label: subLabel,
                seoTitle: subHub.seoTitle,
                intro: subHub.intro,
                productCount: subStock.count,
                minPrice: subStock.minPrice,
                maxPrice: subStock.maxPrice,
                updatedOn: day
              }
            },
            upsert: true
          }
        });
      } else {
        stats.unchanged += 1;
      }
      if (ops.length >= BATCH) await flushOps(ops, stats, dryRun);
    }
    if (ops.length >= BATCH) await flushOps(ops, stats, dryRun);
  }
  await flushOps(ops, stats, dryRun);

  if (!dryRun && categorySeoOps.length) {
    for (let i = 0; i < categorySeoOps.length; i += BATCH) {
      const chunk = categorySeoOps.slice(i, i + BATCH);
      await CategorySeo.bulkWrite(chunk, { ordered: false });
      stats.writes += chunk.length;
    }
  }
}

async function syncProducts({ runId, stats, dryRun, seenKeys }) {
  stats.checkpoint = 'products';
  const existing = await loadExistingHashes('product');
  stats.reads += existing.size;

  const projection = {
    _id: 1,
    slug: 1,
    productName: 1,
    brandName: 1,
    category: 1,
    subcategory: 1,
    stock: 1,
    sellingPrice: 1,
    productImage: 1,
    codigo: 1,
    updatedAt: 1,
    seoTitle: 1,
    seoDescription: 1
  };

  const ops = [];
  const cursor = productModel.find({}, projection).lean().cursor({ batchSize: BATCH });
  for await (const product of cursor) {
    stats.reads += 1;
    stats.examined += 1;
    const id = String(product._id);
    const entityKey = `product:${id}`;
    seenKeys.add(entityKey);
    stats.products += 1;

    const slug = String(product.slug || '').trim();
    const stock = product.stock == null ? 1 : Number(product.stock);
    const image = Array.isArray(product.productImage)
      ? product.productImage.find((img) => typeof img === 'string' && /^https?:\/\//i.test(img.trim()))
      : '';
    const hasSlug = Boolean(slug);
    const inStock = stock > 0;
    let indexable = false;
    let exclusionReason = '';
    if (!hasSlug) exclusionReason = 'sin_slug';
    else if (!inStock) exclusionReason = 'sin_stock';
    else if (!image) exclusionReason = 'sin_imagen_https';
    else indexable = true;

    const name = clip(product.productName, 80);
    const seoTitle = clip(product.seoTitle || (name ? `${name} | Paraguay` : 'Producto | Paraguay'), 60);
    const price = formatGuaranies(product.sellingPrice);
    const seoDescription = clip(
      product.seoDescription ||
        `${name}.${price ? ` ${price}.` : ''} ${inStock ? 'Hay stock en Zenn.' : 'Sin stock por ahora.'} Envío a Paraguay.`,
      160
    );
    const contentHash = sha1(
      [
        slug,
        product.productName,
        product.brandName,
        product.category,
        product.subcategory,
        stock,
        product.sellingPrice,
        image || '',
        seoTitle,
        seoDescription,
        indexable
      ].join('|')
    );

    const prev = existing.get(entityKey);
    if (prev && prev.contentHash === contentHash) {
      stats.unchanged += 1;
      continue;
    }

    ops.push({
      updateOne: {
        filter: { entityKey },
        update: {
          $set: makeDoc({
            entityType: 'product',
            entityKey,
            entityId: id,
            slug,
            canonicalPath: hasSlug ? `/producto/${slug}` : `/producto/${id}`,
            seoTitle,
            seoDescription,
            h1: clip(product.productName, 120),
            label: product.productName || '',
            brandName: product.brandName || '',
            category: product.category || '',
            subcategory: product.subcategory || '',
            productCount: 1,
            minPrice: Number(product.sellingPrice) || 0,
            maxPrice: Number(product.sellingPrice) || 0,
            indexable,
            exclusionReason,
            contentHash,
            sourceUpdatedAt: product.updatedAt || null,
            syncRunId: runId
          })
        },
        upsert: true
      }
    });
    if (ops.length >= BATCH) await flushOps(ops, stats, dryRun);
  }
  await flushOps(ops, stats, dryRun);
}

async function retireMissing({ runId, stats, dryRun, seenKeys }) {
  stats.checkpoint = 'retire';
  const cursor = SeoCatalogIndex.find({}).select('entityKey indexable').lean().cursor({ batchSize: BATCH });
  const ops = [];
  for await (const row of cursor) {
    stats.reads += 1;
    if (seenKeys.has(row.entityKey)) continue;
    stats.retired += 1;
    ops.push({
      updateOne: {
        filter: { entityKey: row.entityKey },
        update: {
          $set: {
            indexable: false,
            exclusionReason: 'retirado_sync',
            lastSyncedAt: new Date(),
            syncRunId: runId,
            contentHash: sha1(`retired|${row.entityKey}|${Date.now()}`)
          }
        }
      }
    });
    if (ops.length >= BATCH) await flushOps(ops, stats, dryRun);
  }
  await flushOps(ops, stats, dryRun);
}

async function countIndexable(stats, dryRun) {
  if (dryRun) {
    stats.indexable = stats.brands + stats.categories + stats.subcategories; // approx lower bound
    return;
  }
  stats.indexable = await SeoCatalogIndex.countDocuments({ indexable: true });
  stats.reads += 1;
}

/**
 * @param {{ trigger?: string, dryRun?: boolean, force?: boolean }} opts
 */
async function runSeoCatalogSync({ trigger = 'worker', dryRun = false, force = false } = {}) {
  if (running && !force) {
    return { ok: false, status: 'skipped', reason: 'already_running' };
  }

  const active = await SeoCatalogSyncRun.findOne({ status: 'running' }).sort({ startedAt: -1 }).lean();
  if (active && !force) {
    const age = Date.now() - new Date(active.startedAt || 0).getTime();
    if (age < LOCK_MS) {
      return { ok: false, status: 'skipped', reason: 'lock_active', runId: active.runId };
    }
  }

  running = true;
  const runId = newRunId();
  const startedAt = new Date();
  const stats = {
    examined: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    retired: 0,
    indexable: 0,
    writes: 0,
    reads: 0,
    brands: 0,
    categories: 0,
    subcategories: 0,
    products: 0,
    checkpoint: 'start'
  };

  let runDoc = null;
  if (!dryRun) {
    runDoc = await SeoCatalogSyncRun.create({
      runId,
      trigger,
      status: 'running',
      startedAt,
      dryRun: false
    });
  }

  const seenKeys = new Set();

  try {
    await syncBrands({ runId, stats, dryRun, seenKeys });
    await syncTaxonomy({ runId, stats, dryRun, seenKeys });
    await syncProducts({ runId, stats, dryRun, seenKeys });

    // Landings categoría + ciudad/departamento (envío Paraguay).
    try {
      const { syncGeoShippingHubs } = require('./geoShippingSeo');
      const geo = await syncGeoShippingHubs({ runId, dryRun });
      stats.examined += geo.examined || 0;
      stats.writes += geo.writes || 0;
      stats.unchanged += geo.unchanged || 0;
      stats.reads += geo.reads || 0;
      stats.geoHubs = geo.indexable || 0;
      stats.geoPlaces = geo.places || 0;
      // Marcar keys geo como vistas para no retirarlas en retireMissing genérico
      if (!dryRun) {
        const geoKeys = await SeoCatalogIndex.find({ entityType: 'geo_hub' }).select('entityKey').lean();
        stats.reads += geoKeys.length;
        for (const row of geoKeys) seenKeys.add(row.entityKey);
      }
    } catch (geoError) {
      stats.geoError = geoError.message;
    }

    await retireMissing({ runId, stats, dryRun, seenKeys });
    await countIndexable(stats, dryRun);

    try {
      const { clearSitemapCache } = require('../controller/seo/sitemapController');
      clearSitemapCache();
    } catch (_) {
      /* sitemap cache optional */
    }

    const finishedAt = new Date();
    const durationMs = finishedAt - startedAt;
    const payload = {
      ok: true,
      runId,
      status: 'done',
      trigger,
      dryRun,
      durationMs,
      ...stats,
      startedAt,
      finishedAt
    };

    if (runDoc) {
      Object.assign(runDoc, {
        status: 'done',
        finishedAt,
        durationMs,
        examined: stats.examined,
        inserted: stats.inserted,
        updated: stats.updated,
        unchanged: stats.unchanged,
        retired: stats.retired,
        indexable: stats.indexable,
        writes: stats.writes,
        reads: stats.reads,
        brands: stats.brands,
        categories: stats.categories,
        subcategories: stats.subcategories,
        products: stats.products,
        checkpoint: 'done',
        error: ''
      });
      await runDoc.save();
    }

    return payload;
  } catch (error) {
    if (runDoc) {
      runDoc.status = 'error';
      runDoc.error = error.message;
      runDoc.finishedAt = new Date();
      runDoc.durationMs = Date.now() - startedAt.getTime();
      runDoc.checkpoint = stats.checkpoint;
      await runDoc.save().catch(() => {});
    }
    throw error;
  } finally {
    running = false;
  }
}

async function getBrandSeoByQuery(q) {
  const raw = String(q || '').trim();
  if (!raw) return null;
  const norm = normalizeBrandKey(raw);
  if (!norm) return null;
  const exact = await SeoCatalogIndex.findOne({
    entityType: 'brand',
    indexable: true,
    $or: [{ brandName: raw }, { entityId: norm }, { slug: norm.replace(/\s+/g, '-') }]
  }).lean();
  if (exact) return exact;
  return SeoCatalogIndex.findOne({
    entityType: 'brand',
    indexable: true,
    brandName: new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
  }).lean();
}

module.exports = {
  runSeoCatalogSync,
  getBrandSeoByQuery,
  normalizeBrandKey,
  brandSearchPath,
  categoryPath,
  SITE
};
