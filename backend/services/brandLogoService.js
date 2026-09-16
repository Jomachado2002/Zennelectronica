'use strict';

const Brand = require('../models/brandModel');
const Product = require('../models/productModel');
const { normalizeBrandSlug, uniqueStrings, uniqueSlugs } = require('../helpers/brandSlug');
const { processBrandLogo, clampSize } = require('./brandLogoImage');
const { uploadLogoBuffer, deleteLogoObject } = require('./logoStorageService');

let logoMapCache = null;
let logoMapCacheAt = 0;
const CACHE_MS = 5 * 60 * 1000;
let syncPromise = null;

function invalidateBrandLogoCache() {
  logoMapCache = null;
  logoMapCacheAt = 0;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickCanonicalName(variants) {
  const entries = [...variants.entries()].sort((a, b) => b[1] - a[1]);
  return (entries[0] && entries[0][0]) || '';
}

async function getLogoMap() {
  if (logoMapCache && Date.now() - logoMapCacheAt < CACHE_MS) {
    return logoMapCache;
  }

  try {
    const brands = await Brand.find({
      isActive: { $ne: false },
      logoUrl: { $gt: '' }
    })
      .select('name slug aliasSlugs logoUrl')
      .limit(2000)
      .maxTimeMS(4000)
      .lean();

    const map = Object.create(null);
    for (const brand of brands) {
      if (!brand.logoUrl) continue;
      const entry = {
        id: String(brand._id),
        name: brand.name,
        logoUrl: brand.logoUrl
      };
      const keys = uniqueSlugs([brand.slug, ...(brand.aliasSlugs || [])]);
      for (const key of keys) {
        if (!map[key]) map[key] = entry;
      }
    }

    logoMapCache = map;
    logoMapCacheAt = Date.now();
    return map;
  } catch (err) {
    console.error('[brands] getLogoMap', err.message);
    if (!logoMapCache) logoMapCache = Object.create(null);
    logoMapCacheAt = Date.now();
    return logoMapCache;
  }
}

function attachBrandLogoSync(product, map) {
  if (!product) return product;
  const slug = normalizeBrandSlug(product.brandName);
  const hit = slug ? map[slug] : null;
  product.brandLogoUrl = (hit && hit.logoUrl) || null;
  product.brandSlug = slug || null;
  return product;
}

async function attachBrandLogo(product) {
  if (!product) return product;
  const obj = product.toObject ? product.toObject() : { ...product };
  try {
    return attachBrandLogoSync(obj, await getLogoMap());
  } catch {
    obj.brandLogoUrl = obj.brandLogoUrl || null;
    return obj;
  }
}

async function attachBrandLogos(products) {
  if (!Array.isArray(products) || !products.length) return products || [];
  let map = Object.create(null);
  try {
    map = await getLogoMap();
  } catch {
    map = Object.create(null);
  }
  return products.map((product) => {
    const obj = product && product.toObject ? product.toObject() : { ...product };
    return attachBrandLogoSync(obj, map);
  });
}

async function findBrandByName(name) {
  const slug = normalizeBrandSlug(name);
  if (!slug) return null;
  return Brand.findOne({ $or: [{ slug }, { aliasSlugs: slug }] })
    .maxTimeMS(3000)
    .lean();
}

async function runSyncBrandsFromProducts() {
  const grouped = await Product.aggregate([
    { $match: { brandName: { $exists: true, $nin: [null, ''] } } },
    {
      $group: {
        _id: '$brandName',
        count: { $sum: 1 }
      }
    }
  ]).option({ maxTimeMS: 20000, allowDiskUse: true });

  const bySlug = new Map();
  for (const row of grouped) {
    const name = String(row._id || '').trim();
    const slug = normalizeBrandSlug(name);
    if (!slug) continue;
    if (!bySlug.has(slug)) {
      bySlug.set(slug, { variants: new Map(), count: 0 });
    }
    const bucket = bySlug.get(slug);
    bucket.variants.set(name, (bucket.variants.get(name) || 0) + row.count);
    bucket.count += row.count;
  }

  const ops = [];
  for (const [slug, bucket] of bySlug.entries()) {
    const canonical = pickCanonicalName(bucket.variants);
    const aliases = uniqueStrings([...bucket.variants.keys()]).slice(0, 40);
    const aliasSlugs = uniqueSlugs([slug, ...aliases]);
    ops.push({
      updateOne: {
        filter: { slug },
        update: {
          $set: { productCount: bucket.count },
          $setOnInsert: {
            name: canonical,
            slug,
            isActive: true,
            logoUrl: '',
            logoKey: ''
          },
          $addToSet: {
            aliases: { $each: aliases },
            aliasSlugs: { $each: aliasSlugs }
          }
        },
        upsert: true
      }
    });
  }

  let upserted = 0;
  let modified = 0;
  const chunkSize = 25;
  for (let i = 0; i < ops.length; i += chunkSize) {
    const chunk = ops.slice(i, i + chunkSize);
    try {
      const result = await Brand.bulkWrite(chunk, { ordered: false });
      upserted += result.upsertedCount || 0;
      modified += result.modifiedCount || 0;
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }

  const seenSlugs = [...bySlug.keys()];
  let keptWithoutProducts = 0;
  if (seenSlugs.length) {
    const kept = await Brand.updateMany(
      { slug: { $nin: seenSlugs } },
      { $set: { productCount: 0 } }
    );
    keptWithoutProducts = kept.modifiedCount || 0;
  }

  invalidateBrandLogoCache();

  return {
    distinctNames: grouped.length,
    groupedBrands: bySlug.size,
    created: upserted,
    updated: modified,
    keptWithoutProducts
  };
}

async function syncBrandsFromProducts() {
  if (syncPromise) return syncPromise;
  syncPromise = runSyncBrandsFromProducts().finally(() => {
    syncPromise = null;
  });
  return syncPromise;
}

async function listAdminBrands({ q = '', filter = 'all', limit = 400, skip = 0 } = {}) {
  const query = {};
  const search = String(q || '').trim();
  if (search) {
    const slug = normalizeBrandSlug(search);
    const safe = escapeRegex(search);
    query.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { aliases: { $regex: safe, $options: 'i' } }
    ];
    if (slug) query.$or.push({ slug }, { aliasSlugs: slug });
  }
  if (filter === 'with-logo') query.logoUrl = { $gt: '' };
  if (filter === 'without-logo') {
    query.$and = [
      ...(query.$or ? [{ $or: query.$or }] : []),
      { $or: [{ logoUrl: { $exists: false } }, { logoUrl: '' }, { logoUrl: null }] }
    ];
    delete query.$or;
  }

  const cap = Math.min(1000, Math.max(1, Number(limit) || 400));
  const offset = Math.max(0, Number(skip) || 0);

  const [brands, withLogo, allCount] = await Promise.all([
    Brand.find(query).sort({ name: 1 }).skip(offset).limit(cap).maxTimeMS(8000).lean(),
    Brand.countDocuments({ logoUrl: { $gt: '' } }).maxTimeMS(5000),
    Brand.countDocuments().maxTimeMS(5000)
  ]);

  return {
    brands,
    stats: {
      total: allCount,
      withLogo,
      withoutLogo: Math.max(0, allCount - withLogo)
    }
  };
}

async function createBrand({ name, aliases = [] }) {
  const trimmed = String(name || '').trim();
  const slug = normalizeBrandSlug(trimmed);
  if (!slug) {
    const err = new Error('El nombre de la marca es requerido');
    err.status = 400;
    throw err;
  }

  const existing = await Brand.findOne({ $or: [{ slug }, { aliasSlugs: slug }] });
  if (existing) {
    const merged = uniqueStrings([existing.name, ...(existing.aliases || []), trimmed, ...aliases]);
    existing.aliases = merged;
    existing.aliasSlugs = uniqueSlugs([existing.slug, ...merged]);
    await existing.save();
    invalidateBrandLogoCache();
    return existing.toObject();
  }

  const allNames = uniqueStrings([trimmed, ...aliases]);
  const brand = await Brand.create({
    name: trimmed,
    slug,
    aliases: allNames,
    aliasSlugs: uniqueSlugs(allNames),
    isActive: true
  });
  invalidateBrandLogoCache();
  return brand.toObject();
}

async function updateBrand(id, body = {}) {
  const brand = await Brand.findById(id);
  if (!brand) {
    const err = new Error('Marca no encontrada');
    err.status = 404;
    throw err;
  }

  if (body.name) {
    const nextName = String(body.name).trim();
    const nextSlug = normalizeBrandSlug(nextName);
    if (nextSlug && nextSlug !== brand.slug) {
      const clash = await Brand.findOne({
        _id: { $ne: brand._id },
        $or: [{ slug: nextSlug }, { aliasSlugs: nextSlug }]
      });
      if (clash) {
        const err = new Error(`Ya existe la marca "${clash.name}"`);
        err.status = 409;
        throw err;
      }
      brand.slug = nextSlug;
    }
    brand.name = nextName;
  }
  if (Array.isArray(body.aliases)) {
    brand.aliases = uniqueStrings([brand.name, ...body.aliases]);
  }
  if (typeof body.isActive === 'boolean') brand.isActive = body.isActive;
  if (typeof body.logoUrl === 'string') brand.logoUrl = body.logoUrl;
  if (typeof body.logoKey === 'string') brand.logoKey = body.logoKey;
  if (body.logoWidth != null) brand.logoWidth = Number(body.logoWidth) || null;
  if (body.logoHeight != null) brand.logoHeight = Number(body.logoHeight) || null;
  brand.aliasSlugs = uniqueSlugs([brand.slug, brand.name, ...(brand.aliases || [])]);
  await brand.save();
  invalidateBrandLogoCache();
  return brand.toObject();
}

async function deleteBrand(id) {
  const brand = await Brand.findById(id);
  if (!brand) {
    const err = new Error('Marca no encontrada');
    err.status = 404;
    throw err;
  }
  try {
    await deleteLogoObject({ logoUrl: brand.logoUrl, logoKey: brand.logoKey });
  } catch {
    /* keep going */
  }
  await brand.deleteOne();
  invalidateBrandLogoCache();
  return { deleted: true };
}

async function uploadBrandLogo(id, fileBuffer, { size, removeBackground = true } = {}) {
  const brand = await Brand.findById(id);
  if (!brand) {
    const err = new Error('Marca no encontrada');
    err.status = 404;
    throw err;
  }

  const processed = await processBrandLogo(fileBuffer, {
    size: clampSize(size),
    removeBackground
  });
  const key = `brands/logos/${brand.slug}-${Date.now()}.png`;
  let uploaded;
  try {
    uploaded = await uploadLogoBuffer(processed.buffer, key, 'image/png');
  } catch (storageErr) {
    return {
      ...brand.toObject(),
      clientUpload: true,
      processedPng: processed.buffer.toString('base64'),
      logoWidth: processed.width,
      logoHeight: processed.height,
      storageError: storageErr.message
    };
  }

  const previous = { logoUrl: brand.logoUrl, logoKey: brand.logoKey };
  brand.logoUrl = uploaded.url;
  brand.logoKey = uploaded.key;
  brand.logoWidth = processed.width;
  brand.logoHeight = processed.height;
  await brand.save();

  if (previous.logoKey && previous.logoKey !== key) {
    try {
      await deleteLogoObject(previous);
    } catch {
      /* ignore stale delete */
    }
  }

  invalidateBrandLogoCache();
  return brand.toObject();
}

async function deleteBrandLogo(id) {
  const brand = await Brand.findById(id);
  if (!brand) {
    const err = new Error('Marca no encontrada');
    err.status = 404;
    throw err;
  }
  try {
    await deleteLogoObject({ logoUrl: brand.logoUrl, logoKey: brand.logoKey });
  } catch {
    /* ignore */
  }
  brand.logoUrl = '';
  brand.logoKey = '';
  brand.logoWidth = null;
  brand.logoHeight = null;
  await brand.save();
  invalidateBrandLogoCache();
  return brand.toObject();
}

module.exports = {
  normalizeBrandSlug,
  invalidateBrandLogoCache,
  getLogoMap,
  attachBrandLogo,
  attachBrandLogos,
  findBrandByName,
  syncBrandsFromProducts,
  listAdminBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  uploadBrandLogo,
  deleteBrandLogo
};
