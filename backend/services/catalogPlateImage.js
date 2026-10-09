'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getLogoMap } = require('./brandLogoService');
const { normalizeBrandSlug } = require('../helpers/brandSlug');

const SIZE = 1080;
const LINE = 8;
const PAD = 36;
const ZENN_LOGO = path.join(__dirname, '..', 'assets', 'logozenn.svg');

const cache = new Map();
const CACHE_MAX = 60;

function money(value) {
  const amount = Math.round(Number(value) || 0);
  return amount.toLocaleString('es-PY');
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapName(name) {
  const words = String(name || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > 34 && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 6);
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

function footerSvg(lines, offer) {
  const lineHeight = 34;
  const textHeight = Math.max(lineHeight, lines.length * lineHeight);
  const footerH = Math.max(168, textHeight + 56);
  const nameSvg = lines.map((line, index) => (
    `<tspan x="36" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  )).join('');
  const list = offer.hasDiscount
    ? `<text x="1044" y="${footerH - 118}" text-anchor="end" fill="#ffffff" fill-opacity="0.9" font-size="28" font-family="system-ui, Segoe UI, sans-serif" text-decoration="line-through">Gs. ${escapeXml(money(offer.originalPrice))}</text>`
    : '';
  const badge = offer.hasDiscount && offer.percent > 0
    ? `<text x="1044" y="${footerH - 154}" text-anchor="end" fill="#ffffff" font-size="28" font-weight="700" font-family="system-ui, Segoe UI, sans-serif">-${offer.percent}%</text>`
    : '';
  return {
    footerH,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${footerH}" viewBox="0 0 ${SIZE} ${footerH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="zenn" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00B5D8"/>
      <stop offset="100%" stop-color="#7B2CBF"/>
    </linearGradient>
  </defs>
  <rect x="620" y="28" rx="28" ry="28" width="424" height="${footerH - 56}" fill="url(#zenn)"/>
  ${badge}
  ${list}
  <text x="1044" y="${footerH - 48}" text-anchor="end" fill="#ffffff" font-family="system-ui, Segoe UI, sans-serif">
    <tspan font-size="26" font-weight="700">Gs.</tspan>
    <tspan font-size="52" font-weight="800"> ${escapeXml(money(offer.finalPrice))}</tspan>
  </text>
  <text y="${Math.max(40, footerH - textHeight)}" fill="#14122e" font-size="30" font-weight="650" font-family="system-ui, Segoe UI, sans-serif">${nameSvg}</text>
</svg>`
  };
}

async function renderCatalogPlate(product) {
  const original = Number(product.price) || 0;
  const finalPrice = Number(product.sellingPrice) > 0 ? Number(product.sellingPrice) : original;
  const hasDiscount = original > finalPrice && finalPrice > 0
    && Math.round((original - finalPrice) / original * 100) >= 1;
  const offer = {
    hasDiscount,
    finalPrice,
    originalPrice: original,
    percent: hasDiscount ? Math.round((original - finalPrice) / original * 100) : 0
  };
  const key = `${product.codigo}|${finalPrice}|${original}|${(product.productImage || [])[0] || ''}`;
  if (cache.has(key)) return cache.get(key);

  const lines = wrapName(product.productName);
  const { footerH, svg } = footerSvg(lines, offer);
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

module.exports = { renderCatalogPlate };
