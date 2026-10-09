'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');
const { getLogoMap } = require('./brandLogoService');
const { normalizeBrandSlug } = require('../helpers/brandSlug');

const SIZE = 1080;
const LINE = 8;
const PAD = 36;
const ZENN_LOGO = path.join(__dirname, '..', 'assets', 'logozenn.svg');
function loadFont(file) {
  const buf = fs.readFileSync(file);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

const FONT = loadFont(path.join(__dirname, '..', 'assets', 'fonts', 'Inter-SemiBold.ttf'));

const cache = new Map();
const CACHE_MAX = 40;

function money(value) {
  const amount = Math.round(Number(value) || 0);
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function offerOf(product) {
  const original = Number(product.price) || 0;
  const finalPrice = Number(product.sellingPrice) > 0 ? Number(product.sellingPrice) : original;
  const hasDiscount = original > finalPrice && finalPrice > 0
    && Math.round((original - finalPrice) / original * 100) >= 1;
  return {
    hasDiscount,
    finalPrice,
    originalPrice: original,
    percent: hasDiscount ? Math.round((original - finalPrice) / original * 100) : 0
  };
}

function textPath(text, x, baseline, size, fill) {
  const d = FONT.getPath(String(text || ''), x, baseline, size).toPathData(1);
  if (!d) return '';
  return `<path d="${d}" fill="${fill}"/>`;
}

function textWidth(text, size) {
  return FONT.getAdvanceWidth(String(text || ''), size);
}

function wrapName(name, size, maxWidth) {
  const words = String(name || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 6);
}

function footerSvg(product) {
  const offer = offerOf(product);
  const amount = money(offer.finalPrice);
  const gsSize = 26;
  const amountSize = 52;
  const gap = 10;
  const priceW = textWidth('Gs.', gsSize) + gap + textWidth(amount, amountSize);
  const listLabel = `Gs. ${money(offer.originalPrice)}`;
  const listW = offer.hasDiscount ? textWidth(listLabel, 26) : 0;
  const pillW = Math.min(520, Math.max(320, Math.max(priceW, listW) + 64));
  const pillX = SIZE - 28 - pillW;
  const nameSize = 30;
  const lineH = 38;
  const lines = wrapName(product.productName, nameSize, pillX - PAD - 20);
  const nameH = Math.max(lineH, lines.length * lineH);
  const priceH = amountSize + (offer.hasDiscount ? 78 : 0);
  const footerH = Math.max(156, Math.max(nameH, priceH) + 52);
  const pillY = 22;
  const pillH = footerH - 44;
  const right = pillX + pillW - 28;

  const nameTop = (footerH - lines.length * lineH) / 2;
  const nameSvg = lines.map((line, index) => (
    textPath(line, PAD, nameTop + (index + 1) * lineH - 8, nameSize, '#14122e')
  )).join('');

  const amountBaseline = pillY + pillH - 30;
  const amountX = right - textWidth(amount, amountSize);
  const gsX = amountX - gap - textWidth('Gs.', gsSize);
  let offerSvg = '';
  if (offer.hasDiscount && offer.percent > 0) {
    const badge = `-${offer.percent}%`;
    const badgeBaseline = Math.max(pillY + 36, amountBaseline - 78);
    offerSvg += textPath(badge, right - textWidth(badge, 24), badgeBaseline, 24, '#ffffff');
  }
  if (offer.hasDiscount) {
    const listX = right - listW;
    const listBaseline = Math.max(pillY + 64, amountBaseline - 42);
    offerSvg += textPath(listLabel, listX, listBaseline, 24, '#ffffff');
    const strike = listBaseline - 8;
    offerSvg += `<line x1="${listX}" y1="${strike}" x2="${listX + listW}" y2="${strike}" stroke="#ffffff" stroke-width="2"/>`;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${footerH}" viewBox="0 0 ${SIZE} ${footerH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="zenn" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00B5D8"/>
      <stop offset="100%" stop-color="#7B2CBF"/>
    </linearGradient>
  </defs>
  <rect x="${pillX}" y="${pillY}" rx="28" ry="28" width="${pillW}" height="${pillH}" fill="url(#zenn)"/>
  ${offerSvg}
  ${textPath('Gs.', gsX, amountBaseline, gsSize, '#ffffff')}
  ${textPath(amount, amountX, amountBaseline, amountSize, '#ffffff')}
  ${nameSvg}
</svg>`;
  return { footerH, svg };
}

function remember(key, buffer) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, buffer);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

async function fetchBuffer(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`imagen ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function fitLogo(source, height) {
  return sharp(source, { density: 180 })
    .resize({ height, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
}

async function renderCatalogPlate(product) {
  const offer = offerOf(product);
  const key = `${product.codigo}|${offer.finalPrice}|${offer.originalPrice}|${product.productName}|${(product.productImage || [])[0] || ''}`;
  if (cache.has(key)) return cache.get(key);

  const { footerH, svg } = footerSvg(product);
  const photoH = SIZE - LINE - footerH;
  const sourceUrl = (product.productImage || []).find((url) => /^https:\/\//.test(String(url || '')));
  if (!sourceUrl) throw new Error('sin foto');

  const photo = await sharp(await fetchBuffer(sourceUrl))
    .rotate()
    .resize(SIZE - PAD * 2, photoH - PAD, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
  const photoMeta = await sharp(photo).metadata();
  const photoLeft = Math.round((SIZE - photoMeta.width) / 2);
  const photoTop = LINE + Math.round((photoH - photoMeta.height) / 2);

  const layers = [
    { input: photo, left: photoLeft, top: photoTop },
    { input: Buffer.from(svg), left: 0, top: SIZE - footerH },
    {
      input: Buffer.from(`<svg width="${SIZE}" height="${LINE}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00B5D8"/><stop offset="100%" stop-color="#7B2CBF"/></linearGradient></defs><rect width="${SIZE}" height="${LINE}" fill="url(#l)"/></svg>`),
      left: 0,
      top: 0
    }
  ];

  try {
    const zenn = await fitLogo(fs.readFileSync(ZENN_LOGO), 52);
    const zennMeta = await sharp(zenn).metadata();
    layers.push({ input: zenn, left: SIZE - PAD - zennMeta.width, top: 28 });
  } catch (_) {
    /* el precio sale igual si el logo no entra */
  }

  try {
    const map = await getLogoMap();
    const brand = map[normalizeBrandSlug(product.brandName)];
    if (brand && brand.logoUrl) {
      const logo = await fitLogo(await fetchBuffer(brand.logoUrl), 64);
      layers.push({ input: logo, left: PAD, top: 28 });
    }
  } catch (_) {
    /* sin logo de marca se ve igual el producto */
  }

  const jpeg = await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: '#ffffff' }
  })
    .composite(layers)
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  remember(key, jpeg);
  return jpeg;
}

module.exports = { renderCatalogPlate, offerOf };
