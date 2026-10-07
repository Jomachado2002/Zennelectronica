'use strict';

const sharp = require('sharp');
const Category = require('../models/categoryModel');
const { getSharedBrowser } = require('../helpers/sharedChrome');
const { iconKeyFor, iconSvg } = require('./brandStory');

const SIZE = 1080;
const CACHE_MS = 60 * 1000;

let cache = null;
let cacheAt = 0;

function fileSlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function listHighlightCovers({ refresh = false } = {}) {
  if (!refresh && cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const categories = await Category.find({ isActive: { $ne: false } })
    .select('label value order subcategories.label subcategories.value subcategories.isActive subcategories.order')
    .sort({ order: 1, label: 1 })
    .lean();
  const covers = [];
  for (const category of categories) {
    const subs = (category.subcategories || [])
      .filter((sub) => sub && sub.isActive !== false && sub.value && sub.label)
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.label).localeCompare(String(b.label), 'es'));
    for (const sub of subs) {
      covers.push({
        id: `${category.value}::${sub.value}`,
        category: category.value,
        categoryLabel: category.label || category.value,
        subcategory: sub.value,
        subcategoryLabel: sub.label,
        icon: iconKeyFor(sub.label)
      });
    }
  }
  cache = covers;
  cacheAt = Date.now();
  return covers;
}

async function findHighlightCover(category, subcategory) {
  const covers = await listHighlightCovers();
  return covers.find((cover) => cover.category === category && cover.subcategory === subcategory) || null;
}

function renderHighlightCoverHtml(cover) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${SIZE}px; height: ${SIZE}px; overflow: hidden; background: #1E1B4B;
  }
  .art {
    width: ${SIZE}px; height: ${SIZE}px; position: relative; overflow: hidden;
    background:
      radial-gradient(720px 520px at 18% 12%, rgba(0,181,216,.5), transparent 60%),
      radial-gradient(680px 520px at 92% 88%, rgba(123,44,191,.62), transparent 62%),
      linear-gradient(160deg, #2A1B6B 0%, #1E1B4B 48%, #120E2E 100%);
    color: #fff;
  }
  .disc {
    position: absolute; left: 50%; top: 50%;
    width: 760px; height: 760px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background:
      radial-gradient(circle at 50% 46%, rgba(255,255,255,.2), rgba(255,255,255,.05) 58%, transparent 72%);
    box-shadow: inset 0 0 0 10px rgba(255,255,255,.14);
  }
  .center {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    z-index: 2;
  }
  .icon {
    width: 560px; height: 560px; color: #fff;
    display: flex; align-items: center; justify-content: center;
    filter: drop-shadow(0 22px 36px rgba(8,7,31,.45));
  }
  .icon svg { width: 520px; height: 520px; stroke-width: 1.85; }
</style>
</head>
<body>
  <div class="art">
    <div class="disc"></div>
    <div class="center">
      <div class="icon">${iconSvg(cover.icon)}</div>
    </div>
  </div>
</body>
</html>`;
}

async function renderHighlightCoverPreviewHtml(cover) {
  return renderHighlightCoverHtml(cover);
}

async function renderHighlightCoverPng(cover) {
  const html = await renderHighlightCoverPreviewHtml(cover);
  const browser = await getSharedBrowser();
  const tab = await browser.newPage();
  try {
    await tab.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 2 });
    await tab.setContent(html, { waitUntil: 'domcontentloaded', timeout: 25000 });
    try {
      await Promise.race([
        tab.evaluate(async () => {
          if (document.fonts && document.fonts.ready) await document.fonts.ready;
        }),
        new Promise((resolve) => setTimeout(resolve, 4000))
      ]);
    } catch {
      /* seguir */
    }
    const png = await tab.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: SIZE, height: SIZE },
      omitBackground: false
    });
    return sharp(png)
      .resize(SIZE, SIZE, { kernel: sharp.kernel.lanczos3 })
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

function highlightFileName(cover) {
  return `zenn-destacada-${fileSlug(cover.categoryLabel)}-${fileSlug(cover.subcategoryLabel)}.png`;
}

module.exports = {
  listHighlightCovers,
  findHighlightCover,
  renderHighlightCoverHtml,
  renderHighlightCoverPreviewHtml,
  renderHighlightCoverPng,
  highlightFileName
};
