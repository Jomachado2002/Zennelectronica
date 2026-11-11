'use strict';

/**
 * Valida generación local del sitemap (sin tocar producción).
 * Requiere MONGODB_URI para listar taxonomía/productos reales.
 */

require('dotenv').config();
const assert = require('assert');
const mongoose = require('mongoose');
const {
  buildSitemapXml,
  loadActiveCategoryIndex,
  clearSitemapCache,
  SITE
} = require('../controller/seo/sitemapController');

const SSD_BLOCKED = [
  'ssd_m_2_nvme__21_03_03',
  'ssd_2_5__21_03_02',
  'ssd_externo__21_03_01',
  'ssd_m_2_sata__21_03_04'
];

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  );
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  clearSitemapCache();

  const index = await loadActiveCategoryIndex();
  for (const value of SSD_BLOCKED) {
    const loc = `${SITE}/categoria-producto?category=almacenamiento&subcategory=${value}`;
    assert.ok(!index.has(loc), `SSD inactiva sigue en índice: ${value}`);
  }

  const ssdParent = `${SITE}/categoria-producto?category=almacenamiento&subcategory=ssd__21_03`;
  assert.ok(index.has(ssdParent) || [...index.keys()].some((k) => k.includes('ssd__21_03')), 'hub SSD activo debería poder indexarse si está en taxonomía');

  const xml = await buildSitemapXml();
  assert.ok(xml.startsWith('<?xml'), 'no es XML');
  const urls = locs(xml);
  assert.ok(urls.includes(`${SITE}/`), 'falta home');
  assert.ok(urls.includes(`${SITE}/nosotros`), 'falta nosotros');
  assert.ok(urls.every((u) => u.startsWith(SITE)), 'URL fuera del sitio');
  assert.strictEqual(urls.length, new Set(urls).size, 'URLs duplicadas');

  const ssdHits = urls.filter((u) => SSD_BLOCKED.some((v) => u.includes(`subcategory=${v}`)));
  assert.strictEqual(ssdHits.length, 0, `SSD 404 aún en sitemap: ${ssdHits.join(', ')}`);

  // lastmod de home no debe forzarse a "hoy" de forma masiva: las estáticas no llevan lastmod
  const homeBlock = xml.match(/<loc>https:\/\/www\.zenn\.com\.py\/<\/loc>[\s\S]*?<\/url>/);
  assert.ok(homeBlock, 'falta bloque home');
  assert.ok(!homeBlock[0].includes('<lastmod>'), 'home no debe inventar lastmod diario');

  const productUrls = urls.filter((u) => u.includes('/producto/'));
  assert.ok(productUrls.length > 100, 'muy pocos productos en sitemap');

  // Canonical coherencia: cada categoría del sitemap debe estar en el índice activo
  const catUrls = urls.filter((u) => u.includes('/categoria-producto?'));
  for (const u of catUrls) {
    assert.ok(index.has(u), `categoría en sitemap fuera de taxonomía activa: ${u}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        site: SITE,
        totalUrls: urls.length,
        products: productUrls.length,
        categories: catUrls.length,
        ssdExcluded: SSD_BLOCKED.length,
        sampleCats: catUrls.slice(0, 8)
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
