'use strict';

const sharp = require('sharp');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const { normalizeBrandSlug } = require('../helpers/brandSlug');
const { getLogoMap } = require('./brandLogoService');
const { getLogoColorDataUri, getBrandLogoDataUri } = require('./creativeImage');
const { getSharedBrowser } = require('../helpers/sharedChrome');
const { FORMATS } = require('./creativePayload');

const PER_PAGE = 12;
const MAX_BRANDS = PER_PAGE * 6;
const SIZE = FORMATS.story;
const CACHE_MS = 90 * 1000;

let cache = null;
let cacheAt = 0;

const ICONS = {
  notebook: '<rect x="3" y="4" width="18" height="11" rx="1.6"/><path d="M2 19h20l-2-4H4z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="1.6"/><path d="M8 20h8M12 16v4"/>',
  desktop: '<rect x="2" y="4" width="13" height="10" rx="1.4"/><path d="M5 18h7"/><rect x="17" y="6" width="5" height="12" rx="1"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>',
  mouse: '<rect x="7" y="2" width="10" height="20" rx="5"/><path d="M12 2v7"/>',
  mousepad: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M14 9h4v6h-4z"/>',
  headphones: '<path d="M4 13a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="7" rx="1.2"/><rect x="17" y="13" width="4" height="7" rx="1.2"/>',
  case: '<rect x="7" y="2" width="10" height="20" rx="1.6"/><path d="M10 6h4M10 12h4M10 15h4M10 18h4"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  tablet: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',
  ssd: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h4M7 14h8"/>',
  ram: '<rect x="3" y="7" width="18" height="10" rx="1.4"/><path d="M7 7V4M12 7V4M17 7V4"/>',
  cpu: '<rect x="7" y="7" width="10" height="10" rx="1.4"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  gpu: '<rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 10h5M13 14h5"/>',
  motherboard: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6" y="6" width="6" height="6"/><path d="M15 8h3M15 12h3M7 16h10"/>',
  charger: '<rect x="7" y="7" width="10" height="14" rx="2"/><path d="M10 3v4M14 3v4"/>',
  printer: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="1.4"/><path d="M7 16v5h10v-5"/>',
  camera: '<path d="M8 7l1.4-2h5.2L16 7"/><rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3"/>',
  router: '<rect x="3" y="11" width="18" height="8" rx="2"/><path d="M7 11V7M12 11V4M17 11V7"/>',
  chair: '<path d="M7 3h10v8H7z"/><path d="M5 11h14v3H5zM8 14v6M16 14v6"/>',
  speaker: '<rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="9" r="1.6"/><circle cx="12" cy="15.5" r="2.4"/>',
  mic: '<rect x="9" y="3" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8"/>',
  fan: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.5c1.6-3.4 5.2-3.6 6.2-1.6S15 11 13.2 11.2M12 14.5c-1.6 3.4-5.2 3.6-6.2 1.6S9 13 10.8 12.8M9.5 12c-3.4-1.6-3.6-5.2-1.6-6.2S13 9 13.2 10.8M14.5 12c3.4 1.6 3.6 5.2 1.6 6.2S11 15 10.8 13.2"/>',
  ups: '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M8 7V4h8v3M12 11v5M10 13h4"/>',
  cable: '<path d="M4 9c3.5 0 3.5 6 7.5 6S15.5 9 19 9"/><circle cx="4" cy="9" r="1.4"/><circle cx="20" cy="9" r="1.4"/>',
  bag: '<path d="M6 8h12l-1 13H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  projector: '<rect x="2" y="8" width="13" height="8" rx="1.4"/><circle cx="17.5" cy="12" r="2.6"/><path d="M6 16v3M11 16v3"/>',
  watch: '<rect x="8" y="6" width="8" height="12" rx="2"/><path d="M10 6V3h4v3M10 18v3h4v-3"/>',
  console: '<rect x="2" y="8" width="20" height="8" rx="3"/><circle cx="8" cy="12" r="1.3"/><path d="M15 11h.01M17.5 13h.01"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  product: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>'
};

function plain(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function iconKeyFor(label) {
  const head = plain(label);
  if (head.startsWith('accesorio')) return 'product';
  const rules = [
    [/mousepad|mouse pad|teclado pad/, 'mousepad'],
    [/^mouse\b|trackpad/, 'mouse'],
    [/auricular|airpod|headphone/, 'headphones'],
    [/webcam/, 'camera'],
    [/microfono/, 'mic'],
    [/silla/, 'chair'],
    [/cooler|ventilador/, 'fan'],
    [/cargador|bateria|fuente/, 'charger'],
    [/ssd|nvme|\bhdd\b|disco rigido|disco duro|pendrive|memoria usb/, 'ssd'],
    [/memoria|\bram\b/, 'ram'],
    [/procesador|\bcpu\b/, 'cpu'],
    [/placa madre|motherboard/, 'motherboard'],
    [/placa de video|\bgpu\b|geforce|radeon/, 'gpu'],
    [/notebook|macbook|laptop/, 'notebook'],
    [/soporte/, 'product'],
    [/monitor|\bimac\b/, 'monitor'],
    [/tablet|\bipad\b/, 'tablet'],
    [/iphone|smartphone|celular|telefono/, 'phone'],
    [/impresora|escaner/, 'printer'],
    [/gabinete/, 'case'],
    [/teclado|keyboard/, 'keyboard'],
    [/cable|conector/, 'cable'],
    [/router|wifi|switch|access point/, 'router'],
    [/ups|nobreak|estabilizador/, 'ups'],
    [/camara|camera|filmadora/, 'camera'],
    [/\btv\b|televisor/, 'tv'],
    [/reloj|\bwatch\b/, 'watch'],
    [/consola/, 'console'],
    [/parlante|speaker|soundbar|sonido/, 'speaker'],
    [/servidor|computadora|mini pc|pc montado/, 'desktop'],
    [/proyector/, 'projector'],
    [/mochila|funda|maleta/, 'bag']
  ];
  for (const [re, key] of rules) {
    if (re.test(head)) return key;
  }
  return 'product';
}

function iconSvg(key) {
  const body = ICONS[key] || ICONS.product;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugFile(parts) {
  return parts
    .map((p) => String(p || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('-')
    .slice(0, 90);
}

function fallbackLabel(value) {
  return String(value || '')
    .replace(/__\d+.*/, '')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatGs(value) {
  const n = Math.round(Number(value) || 0);
  if (!n) return '';
  return `Gs. ${n.toLocaleString('es-PY')}`;
}

function layoutFor(count) {
  if (count <= 1) return { cols: 1, logo: 250, name: 34, meta: 22, pad: 36, gap: 24, minH: 460 };
  if (count <= 2) return { cols: 2, logo: 150, name: 26, meta: 18, pad: 26, gap: 24, minH: 340 };
  if (count <= 4) return { cols: 2, logo: 120, name: 24, meta: 16, pad: 22, gap: 22, minH: 280 };
  if (count <= 6) return { cols: 3, logo: 96, name: 20, meta: 15, pad: 16, gap: 18, minH: 220 };
  if (count <= 9) return { cols: 3, logo: 82, name: 18, meta: 14, pad: 14, gap: 16, minH: 190 };
  return { cols: 3, logo: 70, name: 16, meta: 13, pad: 12, gap: 14, minH: 168 };
}

function priorityRank(label) {
  const t = plain(label);
  const order = ['notebook', 'monitor', 'teclado', 'gabinete', 'auricular', 'celular', 'iphone', 'mouse', 'ssd', 'memoria'];
  const index = order.findIndex((key) => t.includes(key));
  return index === -1 ? 50 : index;
}

function invalidateBrandStoryCache() {
  cache = null;
  cacheAt = 0;
}

async function listSubcategoryBrandBoards({ refresh = false } = {}) {
  if (!refresh && cache && Date.now() - cacheAt < CACHE_MS) return cache;

  const [rows, categories, logoMap] = await Promise.all([
    Product.aggregate([
      {
        $match: {
          stock: { $gt: 0 },
          brandName: { $type: 'string', $nin: [''] }
        }
      },
      {
        $group: {
          _id: {
            category: '$category',
            subcategory: '$subcategory',
            brand: '$brandName'
          },
          count: { $sum: 1 },
          minPrice: {
            $min: {
              $cond: [{ $gt: ['$sellingPrice', 0] }, '$sellingPrice', null]
            }
          }
        }
      }
    ]).option({ maxTimeMS: 30000, allowDiskUse: true }),
    Category.find({ isActive: { $ne: false } })
      .select('label value subcategories')
      .lean(),
    getLogoMap()
  ]);

  const catByValue = new Map();
  for (const cat of categories) {
    catByValue.set(cat.value, cat);
  }

  const boards = new Map();
  for (const row of rows) {
    const category = String(row._id?.category || '').trim();
    const subcategory = String(row._id?.subcategory || '').trim();
    const rawName = String(row._id?.brand || '').trim();
    const slug = normalizeBrandSlug(rawName);
    if (!category || !subcategory || !slug) continue;

    const key = `${category}::${subcategory}`;
    if (!boards.has(key)) {
      const cat = catByValue.get(category);
      const sub = (cat?.subcategories || []).find((item) => item.value === subcategory && item.isActive !== false);
      const subcategoryLabel = sub?.label || fallbackLabel(subcategory);
      boards.set(key, {
        id: key,
        category,
        categoryLabel: cat?.label || fallbackLabel(category),
        subcategory,
        subcategoryLabel,
        icon: iconKeyFor(subcategoryLabel),
        productCount: 0,
        brands: new Map()
      });
    }

    const board = boards.get(key);
    const count = Number(row.count) || 0;
    board.productCount += count;
    const hit = logoMap[slug];
    const price = Number(row.minPrice) || 0;
    const prev = board.brands.get(slug);
    if (!prev) {
      board.brands.set(slug, {
        name: (hit && hit.name) || rawName,
        slug,
        logoUrl: (hit && hit.logoUrl) || '',
        productCount: count,
        minPrice: price || 0,
        namedFromLogo: Boolean(hit && hit.name),
        topRawCount: count
      });
      continue;
    }
    prev.productCount += count;
    if (price && (!prev.minPrice || price < prev.minPrice)) prev.minPrice = price;
    if (hit && hit.logoUrl) prev.logoUrl = hit.logoUrl;
    if (hit && hit.name) {
      prev.name = hit.name;
      prev.namedFromLogo = true;
    } else if (!prev.namedFromLogo && count > prev.topRawCount) {
      prev.name = rawName;
      prev.topRawCount = count;
    }
  }

  const data = [...boards.values()].map((board) => {
    const brands = [...board.brands.values()]
      .map((brand) => ({
        name: brand.name,
        slug: brand.slug,
        logoUrl: brand.logoUrl || '',
        productCount: brand.productCount,
        minPrice: brand.minPrice || 0,
        desde: formatGs(brand.minPrice)
      }))
      .sort((a, b) => {
        if (Boolean(a.logoUrl) !== Boolean(b.logoUrl)) return a.logoUrl ? -1 : 1;
        return b.productCount - a.productCount || a.name.localeCompare(b.name, 'es');
      });
    const shown = brands.slice(0, MAX_BRANDS);
    return {
      id: board.id,
      category: board.category,
      categoryLabel: board.categoryLabel,
      subcategory: board.subcategory,
      subcategoryLabel: board.subcategoryLabel,
      icon: board.icon,
      productCount: board.productCount,
      brandCount: brands.length,
      shownBrandCount: shown.length,
      truncated: brands.length > shown.length,
      perPage: PER_PAGE,
      pages: Math.max(1, Math.ceil(shown.length / PER_PAGE)),
      brands: shown
    };
  }).sort((a, b) => (
    priorityRank(a.subcategoryLabel) - priorityRank(b.subcategoryLabel)
    || b.productCount - a.productCount
    || a.subcategoryLabel.localeCompare(b.subcategoryLabel, 'es')
  ));

  cache = data;
  cacheAt = Date.now();
  return data;
}

async function getSubcategoryBrandBoard(category, subcategory) {
  const boards = await listSubcategoryBrandBoards();
  return boards.find((board) => board.category === category && board.subcategory === subcategory) || null;
}

function slicePage(board, page) {
  const pages = board.pages || 1;
  const safe = Math.min(pages, Math.max(1, Number(page) || 1));
  const start = (safe - 1) * PER_PAGE;
  return {
    page: safe,
    pages,
    brands: board.brands.slice(start, start + PER_PAGE)
  };
}

function storyCaption(board, page) {
  const slice = slicePage(board, page);
  const names = slice.brands.map((brand) => brand.name).join(' · ');
  const head = slice.pages > 1
    ? `${board.subcategoryLabel} (${slice.page}/${slice.pages})`
    : board.subcategoryLabel;
  return [
    head,
    names ? `Marcas: ${names}` : '',
    `${board.productCount} productos en stock · Entrega Asunción 24 h`,
    'WhatsApp 0973 345 284'
  ].filter(Boolean).join('\n');
}

function storyFileName(board, page) {
  return `${slugFile(['zenn', 'marcas', board.categoryLabel, board.subcategoryLabel, page])}.png`;
}

function renderBrandStoryHtml(board, pageBrands, assets = {}) {
  const slice = pageBrands;
  const count = slice.brands.length;
  const layout = layoutFor(count);
  const titleSize = board.subcategoryLabel.length > 28 ? 46 : board.subcategoryLabel.length > 16 ? 58 : 72;
  const logo = assets.logoDataUri || '';
  const showPrice = count <= 4;
  const tiles = slice.brands.map((brand) => {
    const src = brand.logoDataUri || brand.logoUrl || '';
    const price = showPrice && brand.desde ? `<div class="price">desde ${esc(brand.desde)}</div>` : '';
    const products = `${brand.productCount} ${brand.productCount === 1 ? 'producto' : 'productos'}`;
    const visual = src
      ? `<div class="logo"><img src="${esc(src)}" alt="" /></div><div class="name">${esc(brand.name)}</div>`
      : `<div class="wordmark">${esc(brand.name)}</div>`;
    return `<article class="tile">
      ${visual}
      <div class="meta">${esc(products)}</div>
      ${price}
    </article>`;
  }).join('');

  const pagePill = slice.pages > 1
    ? `<div class="pill">Historia ${slice.page} de ${slice.pages}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Unbounded:wght@600;800&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${SIZE.w}px; height: ${SIZE.h}px; overflow: hidden; background: #ffffff;
  }
  body { -webkit-font-smoothing: antialiased; }
  .art {
    width: ${SIZE.w}px; height: ${SIZE.h}px;
    background: #ffffff;
    color: #1E1B4B;
    font-family: Outfit, Helvetica, sans-serif;
    display: flex; flex-direction: column; align-items: center;
    padding: 210px 68px 230px;
  }
  .brandlock { height: 78px; display: flex; align-items: center; justify-content: center; }
  .brandlock img { height: 72px; width: auto; object-fit: contain; }
  .accent { width: 112px; height: 6px; border-radius: 99px; margin: 18px 0 8px;
    background: linear-gradient(90deg, #00B5D8, #7B2CBF); }
  .iconwrap {
    width: 132px; height: 132px; border-radius: 40px;
    background: #F4F0FA; color: #373592;
    display: flex; align-items: center; justify-content: center;
    margin-top: 18px;
  }
  .iconwrap svg { width: 74px; height: 74px; }
  h1 {
    margin-top: 22px;
    font-family: Unbounded, Outfit, sans-serif;
    font-weight: 800;
    font-size: ${titleSize}px;
    line-height: 1.02;
    letter-spacing: -0.03em;
    text-align: center;
    text-transform: uppercase;
    max-width: 920px;
  }
  .kicker {
    margin-top: 14px;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: #7B2CBF;
    text-align: center;
  }
  .sub {
    margin-top: 10px;
    font-size: 26px;
    font-weight: 500;
    color: #4B5563;
    text-align: center;
  }
  .pill {
    margin-top: 14px;
    font-size: 18px;
    font-weight: 700;
    color: #373592;
    background: #F4F0FA;
    border-radius: 999px;
    padding: 8px 16px;
  }
  .grid {
    width: 100%;
    flex: 1;
    display: grid;
    grid-template-columns: repeat(${layout.cols}, minmax(0, 1fr));
    gap: ${layout.gap}px;
    align-content: center;
    margin-top: 28px;
  }
  .tile {
    background: #ffffff;
    border: 2px solid #ECEAF4;
    border-radius: 28px;
    min-height: ${layout.minH}px;
    padding: ${layout.pad}px 14px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center;
  }
  .logo {
    height: ${layout.logo}px;
    width: 100%;
    display: flex; align-items: center; justify-content: center;
  }
  .logo img { max-width: 82%; max-height: ${layout.logo}px; object-fit: contain; }
  .wordmark {
    font-family: Unbounded, Outfit, sans-serif;
    font-weight: 800;
    font-size: ${Math.max(18, Math.round(layout.name * 0.9))}px;
    letter-spacing: -0.03em;
    line-height: 1.05;
    color: #1E1B4B;
  }
  .name {
    margin-top: 10px;
    font-size: ${layout.name}px;
    font-weight: 700;
    line-height: 1.15;
    max-width: 100%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .meta { margin-top: 4px; font-size: ${layout.meta}px; font-weight: 600; color: #6D28D9; }
  .price { margin-top: 2px; font-size: ${Math.max(13, layout.meta - 1)}px; color: #6B7280; font-weight: 500; }
  .foot {
    width: 100%;
    margin-top: 26px;
    padding-top: 18px;
    border-top: 2px solid #E7E3F2;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px;
    font-size: 22px;
    font-weight: 600;
    color: #1E1B4B;
  }
  .wa { color: #0E7490; font-weight: 800; }
</style>
</head>
<body>
  <div class="art">
    <div class="brandlock">${logo ? `<img src="${esc(logo)}" alt="Zenn" />` : '<strong>ZENN</strong>'}</div>
    <div class="accent"></div>
    <div class="iconwrap">${iconSvg(board.icon)}</div>
    <h1>${esc(board.subcategoryLabel)}</h1>
    <div class="kicker">${esc(board.categoryLabel)}</div>
    <div class="sub">${board.brandCount} ${board.brandCount === 1 ? 'marca' : 'marcas'} · ${board.productCount} en stock</div>
    ${pagePill}
    <div class="grid">${tiles}</div>
    <div class="foot">
      <span>Entrega en Asunción · 24 h</span>
      <span class="wa">WhatsApp 0973 345 284</span>
    </div>
  </div>
</body>
</html>`;
}

async function waitForAssets(page, ms = 5000) {
  try {
    await Promise.race([
      page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await Promise.all(Array.from(document.images).map((img) => new Promise((resolve) => {
          if (img.complete) return resolve();
          img.onload = img.onerror = () => resolve();
        })));
      }),
      new Promise((resolve) => setTimeout(resolve, ms))
    ]);
  } catch {
    /* seguir */
  }
}

async function withLogoData(brands) {
  const out = [];
  const queue = brands.map((brand, index) => ({ brand, index }));
  const slots = Math.min(4, queue.length || 1);
  await Promise.all(Array.from({ length: slots }, async () => {
    while (queue.length) {
      const job = queue.shift();
      if (!job) return;
      const logoDataUri = job.brand.logoUrl ? await getBrandLogoDataUri(job.brand.logoUrl) : '';
      out[job.index] = { ...job.brand, logoDataUri };
    }
  }));
  return out;
}

async function renderBrandStoryPng(board, page) {
  const slice = slicePage(board, page);
  const [logoDataUri, brands] = await Promise.all([
    getLogoColorDataUri(),
    withLogoData(slice.brands)
  ]);
  const html = renderBrandStoryHtml(board, { ...slice, brands }, { logoDataUri });
  const browser = await getSharedBrowser();
  const tab = await browser.newPage();
  try {
    await tab.setViewport({ width: SIZE.w, height: SIZE.h, deviceScaleFactor: 2 });
    await tab.setContent(html, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await waitForAssets(tab, 7000);
    const png = await tab.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: SIZE.w, height: SIZE.h },
      omitBackground: false
    });
    return sharp(png)
      .resize(SIZE.w, SIZE.h, { kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toBuffer();
  } finally {
    try {
      await tab.close();
    } catch {
      /* ignore */
    }
  }
}

async function renderBrandStoryPreviewHtml(board, page) {
  const slice = slicePage(board, page);
  const logoDataUri = await getLogoColorDataUri();
  return renderBrandStoryHtml(board, slice, { logoDataUri });
}

module.exports = {
  PER_PAGE,
  invalidateBrandStoryCache,
  listSubcategoryBrandBoards,
  getSubcategoryBrandBoard,
  renderBrandStoryPreviewHtml,
  renderBrandStoryPng,
  storyCaption,
  storyFileName,
  slicePage
};
