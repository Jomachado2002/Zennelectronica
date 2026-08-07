'use strict';

/**
 * Sitemap XML dinámico para Google.
 * Canónico: https://www.zenn.com.py
 */

const productModel = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const { HOME_SLOT_DEFS } = require('../../config/homeFeaturedSlots');

const SITE = (process.env.PUBLIC_SITE_URL || 'https://www.zenn.com.py').replace(/\/$/, '');

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

const STOCK_OR = [
  { stock: { $exists: false } },
  { stock: null },
  { stock: { $gte: 1 } }
];

async function buildSitemapXml() {
  const today = isoDate(new Date());
  const entries = [];

  // Home + estáticas
  entries.push(urlEntry(`${SITE}/`, today, 'daily', '1.0'));
  entries.push(urlEntry(`${SITE}/nosotros`, today, 'monthly', '0.5'));
  entries.push(urlEntry(`${SITE}/promociones`, today, 'daily', '0.9'));

  // Hubs de vitrinas / home slots
  const seenCatUrls = new Set();
  for (const def of HOME_SLOT_DEFS || []) {
    for (const pair of def.pairs || []) {
      if (!pair?.category) continue;
      const q = new URLSearchParams();
      q.set('category', pair.category);
      if (pair.subcategory) q.set('subcategory', pair.subcategory);
      const loc = `${SITE}/categoria-producto?${q.toString()}`;
      if (seenCatUrls.has(loc)) continue;
      seenCatUrls.add(loc);
      entries.push(urlEntry(loc, today, 'daily', '0.85'));
    }
  }

  // Categorías activas (hub sin sub)
  try {
    const cats = await Category.find({ isActive: true })
      .select('value updatedAt')
      .lean();
    for (const cat of cats) {
      if (!cat?.value) continue;
      const loc = `${SITE}/categoria-producto?category=${encodeURIComponent(cat.value)}`;
      if (seenCatUrls.has(loc)) continue;
      seenCatUrls.add(loc);
      entries.push(urlEntry(loc, cat.updatedAt || today, 'weekly', '0.7'));
    }
  } catch (_) {
    /* ignore */
  }

  // Productos con stock
  const products = await productModel
    .find({ $or: STOCK_OR }, { slug: 1, updatedAt: 1, createdAt: 1 })
    .lean();

  for (const p of products) {
    const pathId = p.slug || String(p._id);
    if (!pathId) continue;
    entries.push(
      urlEntry(
        `${SITE}/producto/${encodeURIComponent(pathId)}`,
        p.updatedAt || p.createdAt || today,
        'weekly',
        '0.8'
      )
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    ''
  ].join('\n');
}

const sitemapController = async (req, res) => {
  try {
    const xml = await buildSitemapXml();
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
    });
    res.status(200).send(xml);
  } catch (err) {
    res.status(500).type('text/plain').send('Error generating sitemap');
  }
};

module.exports = { sitemapController, buildSitemapXml, SITE };
