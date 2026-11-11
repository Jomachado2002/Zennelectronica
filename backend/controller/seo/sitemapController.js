'use strict';

/**
 * Sitemap XML dinámico para Google.
 * Preferente: SeoCatalogIndex (indexable=true).
 * Fallback: taxonomía activa + productos con stock (legado).
 */

const productModel = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const SeoCatalogIndex = require('../../models/seoCatalogIndexModel');
const { HOME_SLOT_DEFS } = require('../../config/homeFeaturedSlots');

const SITE = (process.env.PUBLIC_SITE_URL || 'https://www.zenn.com.py').replace(/\/$/, '');
const MAX_URLS_PER_SITEMAP = 45000;

function xmlEscape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoDate(d) {
  try {
    return new Date(d || Date.now()).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${isoDate(lastmod)}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority != null ? `    <priority>${priority}</priority>` : '',
    '  </url>'
  ]
    .filter(Boolean)
    .join('\n');
}

function categoryLoc(category, subcategory) {
  const q = new URLSearchParams();
  q.set('category', category);
  if (subcategory) q.set('subcategory', subcategory);
  return `${SITE}/categoria-producto?${q.toString()}`;
}

async function loadActiveCategoryIndex() {
  const cats = await Category.find({ isActive: true })
    .select('value updatedAt subcategories.value subcategories.isActive subcategories.updatedAt')
    .lean();

  const byLoc = new Map();
  for (const cat of cats) {
    if (!cat?.value) continue;
    const parentLoc = categoryLoc(cat.value, '');
    byLoc.set(parentLoc, {
      loc: parentLoc,
      category: cat.value,
      subcategory: '',
      lastmod: cat.updatedAt || null
    });
    for (const sub of cat.subcategories || []) {
      if (!sub?.value || sub.isActive === false) continue;
      const loc = categoryLoc(cat.value, sub.value);
      byLoc.set(loc, {
        loc,
        category: cat.value,
        subcategory: sub.value,
        lastmod: sub.updatedAt || cat.updatedAt || null
      });
    }
  }
  return byLoc;
}

const STOCK_OR = [
  { stock: { $exists: false } },
  { stock: null },
  { stock: { $gte: 1 } }
];

function priorityForType(entityType) {
  if (entityType === 'brand') return '0.75';
  if (entityType === 'category') return '0.7';
  if (entityType === 'subcategory') return '0.75';
  if (entityType === 'geo_hub') return '0.65';
  if (entityType === 'product') return '0.8';
  return '0.5';
}

function changefreqForType(entityType) {
  if (entityType === 'product') return 'weekly';
  if (entityType === 'brand') return 'daily';
  if (entityType === 'geo_hub') return 'weekly';
  return 'weekly';
}

async function buildEntriesFromSeoIndex() {
  const count = await SeoCatalogIndex.countDocuments({ indexable: true });
  if (count < 1) return null;

  const entries = [];
  const seen = new Set();
  const push = (loc, lastmod, changefreq, priority) => {
    if (!loc || seen.has(loc)) return;
    seen.add(loc);
    entries.push({ loc, lastmod, changefreq, priority });
  };

  push(`${SITE}/`, null, 'daily', '1.0');
  push(`${SITE}/nosotros`, null, 'monthly', '0.5');
  push(`${SITE}/promociones`, null, 'daily', '0.9');
  push(`${SITE}/devoluciones`, null, 'monthly', '0.8');

  const cursor = SeoCatalogIndex.find({ indexable: true })
    .select('canonicalUrl entityType sourceUpdatedAt updatedAt')
    .lean()
    .cursor({ batchSize: 1000 });

  for await (const row of cursor) {
    const loc = String(row.canonicalUrl || '').trim();
    if (!loc.startsWith(SITE)) continue;
    // No incluir búsquedas genéricas: solo brands del índice (/buscar?q=MarcaExacta).
    push(
      loc,
      row.sourceUpdatedAt || row.updatedAt || null,
      changefreqForType(row.entityType),
      priorityForType(row.entityType)
    );
  }

  return { entries, fromIndex: true, indexableCount: count };
}

async function buildEntriesLegacy() {
  const entries = [];
  const seen = new Set();
  const push = (loc, lastmod, changefreq, priority) => {
    if (!loc || seen.has(loc)) return;
    seen.add(loc);
    entries.push({ loc, lastmod, changefreq, priority });
  };

  push(`${SITE}/`, null, 'daily', '1.0');
  push(`${SITE}/nosotros`, null, 'monthly', '0.5');
  push(`${SITE}/promociones`, null, 'daily', '0.9');
  push(`${SITE}/devoluciones`, null, 'monthly', '0.8');

  let activeIndex = new Map();
  try {
    activeIndex = await loadActiveCategoryIndex();
  } catch (_) {
    activeIndex = new Map();
  }

  for (const def of HOME_SLOT_DEFS || []) {
    for (const pair of def.pairs || []) {
      if (!pair?.category) continue;
      const loc = categoryLoc(pair.category, pair.subcategory || '');
      const meta = activeIndex.get(loc);
      if (!meta) continue;
      push(loc, meta.lastmod, 'daily', '0.85');
    }
  }

  // Padres y subcategorías activos (antes se omitían las subs fuera de HOME_SLOT).
  for (const meta of activeIndex.values()) {
    push(meta.loc, meta.lastmod, 'weekly', meta.subcategory ? '0.75' : '0.7');
  }

  const products = await productModel
    .find({ $or: STOCK_OR }, { slug: 1, updatedAt: 1, createdAt: 1 })
    .lean();

  for (const p of products) {
    if (!p.slug) continue;
    push(`${SITE}/producto/${p.slug}`, p.updatedAt || p.createdAt || null, 'weekly', '0.8');
  }

  return { entries, fromIndex: false, indexableCount: entries.length };
}

function renderUrlset(chunk) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...chunk.map((e) => urlEntry(e.loc, e.lastmod, e.changefreq, e.priority)),
    '</urlset>',
    ''
  ].join('\n');
}

function renderSitemapIndex(parts) {
  const now = isoDate(new Date());
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...parts.map(
      (part, index) =>
        [
          '  <sitemap>',
          `    <loc>${xmlEscape(`${SITE}/sitemap-${index + 1}.xml`)}</loc>`,
          `    <lastmod>${now}</lastmod>`,
          '  </sitemap>'
        ].join('\n')
    ),
    '</sitemapindex>',
    ''
  ].join('\n');
}

async function collectSitemapEntries() {
  const fromIndex = await buildEntriesFromSeoIndex();
  if (fromIndex) return fromIndex;
  return buildEntriesLegacy();
}

async function buildSitemapXml() {
  const { entries } = await collectSitemapEntries();
  if (entries.length <= MAX_URLS_PER_SITEMAP) {
    return renderUrlset(entries);
  }
  // Índice: el controlador principal sirve el index; partes vía buildSitemapPartXml.
  const parts = [];
  for (let i = 0; i < entries.length; i += MAX_URLS_PER_SITEMAP) {
    parts.push(entries.slice(i, i + MAX_URLS_PER_SITEMAP));
  }
  return renderSitemapIndex(parts);
}

async function buildSitemapPartXml(partNumber) {
  const { entries } = await collectSitemapEntries();
  const index = Math.max(1, Number(partNumber) || 1) - 1;
  const start = index * MAX_URLS_PER_SITEMAP;
  const chunk = entries.slice(start, start + MAX_URLS_PER_SITEMAP);
  if (!chunk.length) return null;
  return renderUrlset(chunk);
}

let sitemapMem = { xml: '', expiresAt: 0, parts: new Map() };

const sitemapController = async (req, res) => {
  try {
    const now = Date.now();
    if (!sitemapMem.xml || now > sitemapMem.expiresAt) {
      sitemapMem = {
        xml: await buildSitemapXml(),
        expiresAt: now + 6 * 60 * 60 * 1000,
        parts: new Map()
      };
    }
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400'
    });
    res.status(200).send(sitemapMem.xml);
  } catch (err) {
    res.status(500).type('text/plain').send('Error generating sitemap');
  }
};

const sitemapPartController = async (req, res) => {
  try {
    const part = Number(req.params.part) || 1;
    const now = Date.now();
    const cacheKey = String(part);
    if (!sitemapMem.parts.has(cacheKey) || now > sitemapMem.expiresAt) {
      const xml = await buildSitemapPartXml(part);
      if (!xml) {
        res.status(404).type('text/plain').send('Sitemap part not found');
        return;
      }
      sitemapMem.parts.set(cacheKey, xml);
      if (!sitemapMem.expiresAt || now > sitemapMem.expiresAt) {
        sitemapMem.expiresAt = now + 6 * 60 * 60 * 1000;
      }
    }
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400'
    });
    res.status(200).send(sitemapMem.parts.get(cacheKey));
  } catch (err) {
    res.status(500).type('text/plain').send('Error generating sitemap part');
  }
};

function clearSitemapCache() {
  sitemapMem = { xml: '', expiresAt: 0, parts: new Map() };
}

module.exports = {
  sitemapController,
  sitemapPartController,
  buildSitemapXml,
  buildSitemapPartXml,
  collectSitemapEntries,
  loadActiveCategoryIndex,
  clearSitemapCache,
  SITE,
  MAX_URLS_PER_SITEMAP
};
