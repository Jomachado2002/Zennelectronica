'use strict';

/**
 * Landings SEO de categoría + lugar de envío en Paraguay.
 * URL: /categoria-producto?category=…&subcategory=…&envio={slug}
 * La página muestra el catálogo real; el SEO menciona envío hasta esa ciudad/dpto.
 */

const crypto = require('crypto');
const productModel = require('../models/productModel');
const ParaguayPlace = require('../models/paraguayPlaceModel');
const SeoCatalogIndex = require('../models/seoCatalogIndexModel');
const { GEO_SEO_TARGETS } = require('../data/paraguayPlacesSeed');
const { formatGuaranies } = require('./productSearchCopy');

const SITE = (process.env.PUBLIC_SITE_URL || 'https://www.zenn.com.py').replace(/\/$/, '');
const BATCH = 400;

function sha1(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex');
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1).replace(/\s+\S*$/, '').trim();
  return cut.length > 20 ? cut : text.slice(0, max).trim();
}

function categoryPath(category, subcategory, envioSlug) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (subcategory) params.set('subcategory', subcategory);
  if (envioSlug) params.set('envio', envioSlug);
  return `/categoria-producto?${params.toString()}`;
}

function buildGeoCopy(phrase, place, productCount, minPrice) {
  const placeName = place.name;
  const region =
    place.placeType === 'city' && place.departmentName && place.departmentName !== placeName
      ? `${placeName}, ${place.departmentName}`
      : placeName;
  const minLabel = formatGuaranies(minPrice);
  const seoTitle = clip(`${phrase} en ${placeName} | Zenn`, 60);
  const h1 = clip(`${phrase} con envío a ${placeName}`, 80);
  const seoDescription = clip(
    productCount
      ? `${phrase} en Zenn con envío a ${region}, Paraguay. ${productCount} productos con stock${
          minLabel ? `, desde ${minLabel}` : ''
        }. Consultá por WhatsApp.`
      : `${phrase} en Zenn con envío a ${region}, Paraguay. Consultá disponibilidad por WhatsApp.`,
    160
  );
  const intro = clip(
    `Comprá ${phrase.toLowerCase()} en Zenn con envío a ${region}. Catálogo online, precio en guaraníes y atención por WhatsApp para coordinar tu pedido.`,
    320
  );
  return { seoTitle, h1, seoDescription, intro, region };
}

async function loadStockByTarget() {
  const map = new Map();
  for (const target of GEO_SEO_TARGETS) {
    const query = { category: target.category, stock: { $gt: 0 } };
    if (target.subcategory) query.subcategory = target.subcategory;
    const [count, agg] = await Promise.all([
      productModel.countDocuments(query),
      productModel.aggregate([
        { $match: query },
        { $group: { _id: null, minPrice: { $min: '$sellingPrice' } } }
      ])
    ]);
    map.set(`${target.category}::${target.subcategory || ''}`, {
      count,
      minPrice: Number(agg[0]?.minPrice) || 0,
      phrase: target.phrase,
      category: target.category,
      subcategory: target.subcategory || ''
    });
  }
  return map;
}

/**
 * Genera/actualiza entradas SeoCatalogIndex tipo geo_hub.
 * @returns {{ examined: number, writes: number, unchanged: number, indexable: number, reads: number }}
 */
async function ensurePlacesSeeded() {
  const count = await ParaguayPlace.countDocuments({});
  if (count > 0) return { seeded: false, count };
  const { buildParaguayPlaceDocs } = require('../data/paraguayPlacesSeed');
  const docs = buildParaguayPlaceDocs();
  if (!docs.length) return { seeded: false, count: 0 };
  await ParaguayPlace.bulkWrite(
    docs.map((doc) => ({
      updateOne: { filter: { slug: doc.slug }, update: { $set: doc }, upsert: true }
    })),
    { ordered: false }
  );
  return { seeded: true, count: docs.length };
}

async function syncGeoShippingHubs({ runId, dryRun = false } = {}) {
  const stats = { examined: 0, writes: 0, unchanged: 0, indexable: 0, reads: 0 };
  if (!dryRun) {
    const seed = await ensurePlacesSeeded();
    stats.placeSeed = seed;
  }
  const places = await ParaguayPlace.find({ isActive: true }).sort({ priority: 1, name: 1 }).lean();
  stats.reads += 1;
  if (!places.length) return { ...stats, skipped: true, reason: 'no_places' };

  const stockMap = await loadStockByTarget();
  stats.reads += GEO_SEO_TARGETS.length * 2;

  const existing = await SeoCatalogIndex.find({ entityType: 'geo_hub' })
    .select('entityKey contentHash')
    .lean();
  stats.reads += existing.length;
  const prevMap = new Map(existing.map((row) => [row.entityKey, row]));

  const seenKeys = new Set();
  const ops = [];

  for (const place of places) {
    for (const target of GEO_SEO_TARGETS) {
      stats.examined += 1;
      const stock = stockMap.get(`${target.category}::${target.subcategory || ''}`) || {
        count: 0,
        minPrice: 0,
        phrase: target.phrase
      };
      const indexable = stock.count >= 1;
      if (indexable) stats.indexable += 1;

      const copy = buildGeoCopy(target.phrase, place, stock.count, stock.minPrice);
      const canonicalPath = categoryPath(target.category, target.subcategory, place.slug);
      const entityKey = `geo:${place.slug}:${target.category}:${target.subcategory || '_'}`;
      seenKeys.add(entityKey);

      const contentHash = sha1(
        [
          place.slug,
          target.category,
          target.subcategory,
          stock.count,
          stock.minPrice,
          copy.seoTitle,
          copy.seoDescription,
          indexable
        ].join('|')
      );

      const prev = prevMap.get(entityKey);
      if (prev && prev.contentHash === contentHash) {
        stats.unchanged += 1;
        continue;
      }

      ops.push({
        updateOne: {
          filter: { entityKey },
          update: {
            $set: {
              entityType: 'geo_hub',
              entityKey,
              entityId: place.slug,
              slug: place.slug,
              canonicalPath,
              canonicalUrl: `${SITE}${canonicalPath}`,
              seoTitle: copy.seoTitle,
              seoDescription: copy.seoDescription,
              h1: copy.h1,
              label: `${target.phrase} · ${place.name}`,
              brandName: '',
              category: target.category,
              subcategory: target.subcategory || '',
              productCount: stock.count,
              minPrice: stock.minPrice,
              maxPrice: 0,
              indexable,
              exclusionReason: indexable ? '' : 'sin_stock',
              contentHash,
              sourceUpdatedAt: new Date(),
              lastSyncedAt: new Date(),
              syncRunId: runId || ''
            }
          },
          upsert: true
        }
      });

      if (ops.length >= BATCH) {
        if (!dryRun) {
          await SeoCatalogIndex.bulkWrite(ops, { ordered: false });
        }
        stats.writes += ops.length;
        ops.length = 0;
      }
    }
  }

  if (ops.length) {
    if (!dryRun) await SeoCatalogIndex.bulkWrite(ops, { ordered: false });
    stats.writes += ops.length;
  }

  // Retirar geo hubs de lugares/targets que ya no existen
  const retireOps = [];
  for (const row of existing) {
    if (seenKeys.has(row.entityKey)) continue;
    retireOps.push({
      updateOne: {
        filter: { entityKey: row.entityKey },
        update: {
          $set: {
            indexable: false,
            exclusionReason: 'retirado_sync',
            lastSyncedAt: new Date(),
            syncRunId: runId || '',
            contentHash: sha1(`retired|${row.entityKey}`)
          }
        }
      }
    });
  }
  if (retireOps.length && !dryRun) {
    await SeoCatalogIndex.bulkWrite(retireOps, { ordered: false });
    stats.writes += retireOps.length;
  }

  return { ...stats, places: places.length, targets: GEO_SEO_TARGETS.length };
}

async function getPlaceBySlug(slug) {
  const value = String(slug || '').trim().toLowerCase();
  if (!value) return null;
  return ParaguayPlace.findOne({ slug: value, isActive: true }).lean();
}

async function getGeoHub(category, subcategory, envioSlug) {
  const place = await getPlaceBySlug(envioSlug);
  if (!place) return null;
  const entityKey = `geo:${place.slug}:${category}:${subcategory || '_'}`;
  let hub = await SeoCatalogIndex.findOne({ entityKey, entityType: 'geo_hub' }).lean();
  if (!hub) {
    const target =
      GEO_SEO_TARGETS.find(
        (t) => t.category === category && (t.subcategory || '') === (subcategory || '')
      ) || GEO_SEO_TARGETS.find((t) => t.category === category && !t.subcategory);
    const phrase = target?.phrase || 'Tecnología';
    const query = { category, stock: { $gt: 0 } };
    if (subcategory) query.subcategory = subcategory;
    const count = await productModel.countDocuments(query);
    const agg = await productModel.aggregate([
      { $match: query },
      { $group: { _id: null, minPrice: { $min: '$sellingPrice' } } }
    ]);
    const copy = buildGeoCopy(phrase, place, count, Number(agg[0]?.minPrice) || 0);
    hub = {
      ...copy,
      productCount: count,
      place,
      canonicalPath: categoryPath(category, subcategory, place.slug),
      canonicalUrl: `${SITE}${categoryPath(category, subcategory, place.slug)}`,
      indexable: count >= 1
    };
  } else {
    hub.place = place;
  }
  return { place, hub };
}

async function listPlaces({ placeType } = {}) {
  const filter = { isActive: true };
  if (placeType) filter.placeType = placeType;
  return ParaguayPlace.find(filter).sort({ priority: 1, name: 1 }).lean();
}

module.exports = {
  syncGeoShippingHubs,
  getPlaceBySlug,
  getGeoHub,
  listPlaces,
  categoryPath,
  GEO_SEO_TARGETS,
  SITE
};
