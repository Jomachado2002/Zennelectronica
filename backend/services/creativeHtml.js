'use strict';

const fs = require('fs');
const path = require('path');
const { FORMATS } = require('./creativePayload');

const RIBBON_PNG = path.join(__dirname, '../assets/octubre-rosa-ribbon.png');
let ribbonDataUri = '';
function octubreRosaRibbon() {
  if (!ribbonDataUri && fs.existsSync(RIBBON_PNG)) {
    ribbonDataUri = `data:image/png;base64,${fs.readFileSync(RIBBON_PNG).toString('base64')}`;
  }
  return ribbonDataUri;
}

const ICONS = {
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>',
  ram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 7V5M12 7V5M17 7V5M7 17v2M12 17v2M17 17v2"/></svg>',
  ssd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h5M8 16h3"/></svg>',
  gpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/></svg>',
  screen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  hz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  res: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8V5h3M20 8V5h-3M4 16v3h3M20 16v3h-3"/></svg>',
  panel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>'
};

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SPEC_FIRST = [
  'procesador', 'processor', 'cpu',
  'memoria', 'ram',
  'almacen', 'storage', 'ssd', 'disco',
  'pantalla', 'screen',
  'gpu', 'grafi', 'video',
  'resoluc', 'frecuencia', 'refresh',
  'panel', 'bateria', 'sistema',
  'conex', 'bluetooth', 'wifi', 'teclado', 'peso'
];

const SPEC_NOISE = /^(marca|brand|color|colour|c[oó]digo|sku|ean|garant[ií]a|origen|procedencia|categor[ií]a|subcategor[ií]a|tipo|descripci[oó]n|certificaci[oó]n|certificaciones|estado|condici[oó]n|compatibilidad|voltaje|alimentaci[oó]n|peso|dimensiones)$/i;
const SPEC_SOFT = /^(modelo|model|referencia|serie|versi[oó]n)$/i;
const SPEC_DULL = /^(s[ií]|no|n\/?a|est[aá]ndar|standard|gen[eé]rico|generico|negro|blanco|gris|plata|silver|gold|dorado|azul|rojo|verde|rosa|black|white|gray|grey)$/i;

function specText(spec) {
  return String(spec && spec.text || '').replace(/\s+/g, ' ').trim();
}

function specScore(spec, title) {
  const label = String(spec.label || '').replace(/\s+/g, ' ').trim();
  const name = String(spec.name || '').replace(/\s+/g, ' ').trim();
  const text = specText(spec);
  if (!text || text.length < 2) return -1;
  if (SPEC_NOISE.test(label) || SPEC_NOISE.test(name) || SPEC_DULL.test(text)) return -1;
  if (text.length > 42 && !/\d/.test(text)) return -1;
  const titleNorm = String(title || '').toLowerCase();
  if (titleNorm && text.length > 8 && titleNorm.includes(text.toLowerCase())) return -1;
  const specific = /\d|\brtx\b|\bgtx\b|\bryzen\b|\bsnapdragon\b|\boled\b|\bips\b|\banc\b|\bdpi\b|\bssd\b|\bnvme\b|\b5g\b/i.test(text);
  if (SPEC_SOFT.test(label) || SPEC_SOFT.test(name)) return specific ? 48 : -1;

  const blob = `${label} ${name}`.toLowerCase();
  const rank = SPEC_FIRST.findIndex((key) => blob.includes(key));
  let score = rank === -1 ? 0 : 36 - rank;
  if (/\d/.test(text)) score += 24;
  if (specific) score += 28;
  if (text.length <= 18) score += 8;
  if (text.length > 32) score -= 10;
  return score;
}

function chipValue(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const inch = text.match(/(\d{1,2}(?:[.,]\d)?)\s*(pulgadas|pulg|"|''|inch)/i);
  if (inch) return `${inch[1].replace(',', '.')}"`;
  const hz = text.match(/(\d{2,3})\s*hz/i);
  if (hz && text.length < 24) return `${hz[1]}Hz`;
  const mem = text.match(/(\d+)\s*(gb|tb)/i);
  if (mem && text.length < 36) {
    const kind = /ssd|nvme/i.test(text) ? ' SSD' : '';
    return `${mem[1]}${mem[2].toUpperCase()}${kind}`;
  }
  if (text.length <= 26) return text;
  return `${text.slice(0, 25).trim()}…`;
}

function highlightSpecs(specs) {
  return (Array.isArray(specs) ? specs : [])
    .filter((spec) => specText(spec).length >= 2)
    .slice(0, 3);
}

function specsHtml(specs) {
  const items = highlightSpecs(specs);
  if (!items.length) return '';
  return `<div class="specs">${items.map((spec) => `<div class="chip"><div class="v">${esc(chipValue(spec.text))}</div><div class="k">${esc(spec.label || '')}</div></div>`).join('')}</div>`;
}

function galleryHtml(gallery) {
  if (!Array.isArray(gallery) || gallery.length < 2) return '';
  return `<aside class="thumbs">${gallery.slice(0, 5).map((g) => `
    <div class="thumb ${g.active ? 'is-on' : ''}">
      <img src="${esc(g.uri)}" alt="" />
    </div>`).join('')}
  </aside>`;
}

function renderCreativeHtml(payload, format = 'feed', assets = {}) {
  const size = FORMATS[format] || FORMATS.feed;
  const theme = payload.theme === 'gamer' ? 'gamer' : 'studio';
  const scene = ['orbita', 'neon', 'haz', 'malla', 'cielo', 'rosa'].includes(payload.scene) ? payload.scene : 'orbita';
  const logo = assets.logoDataUri || '';
  const gallery = Array.isArray(assets.gallery) ? assets.gallery.filter((g) => g && g.uri) : [];
  const photo = assets.photoDataUri || gallery.find((g) => g.active)?.uri || payload.imageUrl || '';
  const mark = esc((payload.categoryLabel || 'ZENN').slice(0, 12));
  const img = photo
    ? `<img class="photo" src="${esc(photo)}" alt="" />`
    : `<div class="photo-fallback">Sin imagen</div>`;
  const shot = gallery.length > 1
    ? `<div class="shots">${(payload.imageIndex || 0) + 1} / ${gallery.length}</div>`
    : '';
  const gpuChip = payload.hasGpu
    ? '<div class="gpu-chip">GPU dedicada</div>'
    : '';
  const brandLogo = assets.brandLogoDataUri || '';
  const brand = brandLogo
    ? `<div class="brand has-logo"><img class="brand-logo" src="${esc(brandLogo)}" alt="${esc(payload.brandName || '')}" /></div>`
    : payload.brandName
      ? `<div class="brand">${esc(payload.brandName)}</div>`
      : '';
  const seal = 'Entrega Asunción 24 h';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Unbounded:wght@500;700;800&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${size.w}px; height: ${size.h}px; overflow: hidden;
    background: #1E1B4B;
  }
  body { -webkit-font-smoothing: antialiased; }
  .art {
    width: ${size.w}px; height: ${size.h}px;
    position: relative; overflow: hidden;
    display: flex; flex-direction: column;
    font-family: Outfit, Helvetica, sans-serif;
    color: #fff;
    background: #1E1B4B;
  }
  .scene-orbita {
    background:
      radial-gradient(980px 640px at 18% 8%, rgba(0,181,216,.42), transparent 58%),
      radial-gradient(820px 560px at 100% 18%, rgba(123,44,191,.48), transparent 62%),
      radial-gradient(700px 480px at 50% 100%, rgba(30,27,75,.2), transparent 70%),
      linear-gradient(165deg, #24165A 0%, #1E1B4B 46%, #12102C 100%);
  }
  .scene-neon {
    background:
      radial-gradient(760px 520px at 88% -8%, rgba(236,72,153,.55), transparent 56%),
      radial-gradient(680px 480px at -10% 78%, rgba(0,181,216,.4), transparent 60%),
      linear-gradient(180deg, #070414 0%, #16082E 52%, #05030F 100%);
  }
  .scene-haz {
    background:
      radial-gradient(900px 500px at 50% 0%, rgba(123,44,191,.4), transparent 62%),
      linear-gradient(155deg, #071428 0%, #1A0C3C 42%, #08141C 100%);
  }
  .scene-malla {
    background:
      radial-gradient(640px 420px at 0% 0%, rgba(0,181,216,.28), transparent 62%),
      radial-gradient(720px 480px at 100% 100%, rgba(123,44,191,.4), transparent 64%),
      linear-gradient(180deg, #101628 0%, #0C1020 100%);
  }
  .scene-cielo {
    color: #1E293B;
    background:
      radial-gradient(900px 520px at 0% 0%, rgba(125,211,252,.85), transparent 62%),
      radial-gradient(760px 480px at 100% 100%, rgba(186,230,253,.9), transparent 58%),
      linear-gradient(180deg, #F3FAFF 0%, #D7EEFB 48%, #C5E6F8 100%);
  }
  .scene-rosa {
    color: #4C0519;
    background:
      radial-gradient(820px 520px at 0% 0%, rgba(255,255,255,.85), transparent 58%),
      radial-gradient(760px 560px at 100% 8%, rgba(244,114,182,.55), transparent 60%),
      radial-gradient(680px 480px at 18% 100%, rgba(190,24,93,.22), transparent 62%),
      linear-gradient(165deg, #FFF5F8 0%, #FBCFE8 46%, #F9A8D4 100%);
  }
  .deco { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
  .mesh, .dots, .beam, .ring { display: none; }
  .scene-neon .mesh {
    display: block;
    background-image:
      linear-gradient(rgba(0,181,216,.16) 1px, transparent 1px),
      linear-gradient(90deg, rgba(196,181,253,.14) 1px, transparent 1px);
    background-size: 78px 78px;
    mask-image: radial-gradient(circle at 50% 38%, #000 10%, transparent 72%);
  }
  .scene-haz .beam { display: block; position: absolute; width: 160px; height: 160%; top: -20%; filter: blur(1px); }
  .scene-haz .b1 {
    left: 8%;
    background: linear-gradient(180deg, transparent, rgba(0,181,216,.22), transparent);
    transform: rotate(18deg);
  }
  .scene-haz .b2 {
    right: 6%;
    background: linear-gradient(180deg, transparent, rgba(123,44,191,.32), transparent);
    transform: rotate(18deg);
  }
  .scene-malla .dots {
    display: block;
    background-image: radial-gradient(rgba(255,255,255,.22) 1.3px, transparent 1.4px);
    background-size: 26px 26px;
    mask-image: radial-gradient(circle at 50% 42%, #000 25%, transparent 78%);
  }
  .scene-orbita .ring {
    display: block;
    position: absolute; left: 50%; top: 38%;
    width: 860px; height: 860px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,.08);
    box-shadow: inset 0 0 0 46px rgba(0,181,216,.05), 0 0 0 80px rgba(123,44,191,.05);
  }
  .glow { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(2px); }
  .studio .g1 {
    width: 880px; height: 760px; left: 50%; top: 140px; transform: translateX(-50%);
    background: radial-gradient(circle, rgba(0,181,216,.28) 0%, rgba(123,44,191,.18) 48%, transparent 72%);
  }
  .studio .g2 {
    width: 420px; height: 380px; left: -120px; bottom: 180px;
    background: radial-gradient(circle, rgba(123,44,191,.32), transparent 70%);
  }
  .gamer .g1 {
    width: 920px; height: 820px; left: 50%; top: 110px; transform: translateX(-50%);
    background: radial-gradient(circle, rgba(123,44,191,.55) 0%, rgba(0,181,216,.2) 46%, transparent 72%);
  }
  .gamer .g2 {
    width: 480px; height: 420px; right: -80px; top: 80px;
    background: radial-gradient(circle, rgba(0,181,216,.34), transparent 68%);
  }
  .grain {
    position: absolute; inset: 0; z-index: 8; pointer-events: none; opacity: .045;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  }
  .mark {
    position: absolute; left: -24px; top: 210px;
    font-family: Unbounded, sans-serif; font-weight: 800;
    font-size: 148px; letter-spacing: .06em; color: #fff;
    opacity: .045; white-space: nowrap; transform: rotate(-12deg); z-index: 1;
  }
  .line {
    position: absolute; left: 0; top: 0; width: 8px; height: 100%;
    background: linear-gradient(180deg, #00B5D8, #7B2CBF 55%, #00B5D8);
  }
  header {
    position: relative; flex: 0 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    padding: 28px 44px 0 52px; z-index: 6;
  }
  .logo { height: 50px; width: auto; }
  .seal {
    font-size: 13px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    padding: 12px 18px; border-radius: 999px; color: #fff;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.16);
    backdrop-filter: blur(8px);
  }
  .hero {
    position: relative; flex: 1 1 auto; min-height: 0;
    z-index: 3;
  }
  .plate {
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    width: 90%; height: 94%;
    border-radius: 32px;
    background:
      linear-gradient(#fff, #fff) padding-box,
      linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%) border-box;
    border: 3px solid transparent;
    box-shadow: 0 24px 56px rgba(8,7,31,.38);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .gamer .plate {
    background:
      linear-gradient(#fff, #fff) padding-box,
      linear-gradient(135deg, #7B2CBF 0%, #00B5D8 100%) border-box;
  }
  .orb { display: none; }
  .c { position: absolute; width: 22px; height: 22px; z-index: 4; }
  .c.tl { left: 16px; top: 16px; border-left: 3px solid #00B5D8; border-top: 3px solid #00B5D8; }
  .c.tr { right: 16px; top: 16px; border-right: 3px solid #7B2CBF; border-top: 3px solid #7B2CBF; }
  .c.bl { left: 16px; bottom: 16px; border-left: 3px solid #7B2CBF; border-bottom: 3px solid #7B2CBF; }
  .c.br { right: 16px; bottom: 16px; border-right: 3px solid #00B5D8; border-bottom: 3px solid #00B5D8; }
  .photo {
    position: relative; z-index: 2;
    width: 94%; height: 94%;
    object-fit: contain; object-position: center;
    filter: none;
  }
  .photo-fallback { font-size: 28px; color: #94A3B8; }
  .thumbs {
    position: absolute; left: 28px; top: 50%;
    transform: translateY(-50%);
    display: flex; flex-direction: column; gap: 12px;
    z-index: 5;
  }
  .thumb {
    width: 92px; height: 92px; border-radius: 18px;
    background: #fff;
    border: 2px solid rgba(255,255,255,.7);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    box-shadow: 0 10px 24px rgba(8,7,31,.28);
  }
  .thumb.is-on {
    border-color: transparent;
    background:
      linear-gradient(#fff, #fff) padding-box,
      linear-gradient(135deg, #00B5D8, #7B2CBF) border-box;
    border: 3px solid transparent;
    box-shadow: 0 0 0 3px rgba(0,181,216,.28), 0 10px 22px rgba(8,7,31,.28);
  }
  .gamer .thumb.is-on {
    box-shadow: 0 0 0 3px rgba(123,44,191,.32), 0 10px 22px rgba(8,7,31,.28);
  }
  .thumb img { width: 100%; height: 100%; object-fit: contain; object-position: center; }
  .gpu-chip {
    position: absolute; right: 22px; top: 22px; z-index: 4;
    font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
    color: #fff; padding: 8px 14px; border-radius: 999px;
    background: linear-gradient(135deg, #7B2CBF, #5B21B6);
    box-shadow: 0 8px 18px rgba(123,44,191,.35);
  }
  .shots {
    position: absolute; left: 22px; bottom: 22px; z-index: 4;
    font-size: 13px; font-weight: 700; letter-spacing: .08em;
    color: #1E1B4B; background: rgba(255,255,255,.94);
    border: 1px solid rgba(30,27,75,.08);
    padding: 7px 12px; border-radius: 999px;
  }
  .specs {
    position: relative; z-index: 5; flex: 0 0 auto;
    display: flex; align-items: stretch; justify-content: center;
    padding: 0 56px;
  }
  .chip {
    min-width: 160px; max-width: 420px;
    text-align: center;
    padding: 0 32px;
  }
  .chip + .chip { border-left: 1px solid rgba(255,255,255,.35); }
  .chip .v {
    font-family: Unbounded, Outfit, sans-serif;
    font-size: 36px; font-weight: 800; letter-spacing: -.03em; line-height: 1.05;
    color: #fff;
  }
  .chip .k {
    margin-top: 4px;
    font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
    color: rgba(255,255,255,.72);
  }
  footer {
    position: relative; flex: 0 0 auto; z-index: 6;
  }
  .brand {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
    color: #fff; background: #1E1B4B;
    border: 1px solid rgba(0,181,216,.35);
    padding: 6px 12px; border-radius: 999px; margin-bottom: 10px;
  }
  .brand.has-logo {
    background: #fff;
    color: #1E1B4B;
    border: 1px solid rgba(255,255,255,.7);
    padding: 8px 14px;
    box-shadow: 0 8px 18px rgba(8,7,31,.22);
  }
  .brand-logo {
    height: 36px; width: auto; max-width: 168px;
    object-fit: contain; object-position: center;
    display: block;
  }
  .kicker {
    font-size: 14px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase;
    color: #00B5D8;
  }
  .gamer .kicker { color: #C4B5FD; }
  .title {
    font-family: Unbounded, Outfit, sans-serif; font-weight: 800;
    line-height: 1.06; letter-spacing: -.03em;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .detail {
    margin-top: 6px;
    font-size: 15px; line-height: 1.3; font-weight: 500; color: #D1D5DB;
    display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
  }
  .scene-cielo .chip .v { color: #0F172A; }
  .scene-cielo .chip .k { color: #475569; }
  .scene-cielo .chip + .chip { border-color: rgba(15,23,42,.2); }
  .scene-cielo .detail { color: #475569; }
  .scene-cielo .seal {
    color: #0F172A;
    background: rgba(255,255,255,.78);
    border-color: rgba(14,116,144,.18);
  }
  .scene-cielo .kicker { color: #0369A1; }
  .scene-cielo .title, .scene-cielo .wa, .scene-cielo .phone { color: #0F172A; }
  .scene-cielo .mark { color: #0369A1; opacity: .08; }
  .scene-cielo .promises span {
    color: #0F172A;
    background: rgba(255,255,255,.72);
    border-color: rgba(14,116,144,.2);
  }
  .rule {
    width: 72px; height: 4px; border-radius: 4px;
    background: linear-gradient(90deg, #00B5D8, #7B2CBF);
    margin: 14px 0 0;
  }
  .offer {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    margin-top: 16px;
  }
  .offer .off {
    font-family: Unbounded, Outfit, sans-serif;
    font-weight: 800; font-size: 22px; color: #fff;
    background: #E11D48; border-radius: 999px;
    padding: 8px 14px; letter-spacing: -.02em;
  }
  .offer .before {
    font-size: 22px; font-weight: 700; color: rgba(255,255,255,.55);
    text-decoration: line-through;
  }
  .offer .now {
    font-family: Unbounded, Outfit, sans-serif;
    font-size: 40px; font-weight: 800; color: #67E8F9; letter-spacing: -.03em;
  }
  .scene-cielo .offer .before { color: #64748B; }
  .scene-cielo .offer .now { color: #0369A1; }
  .asof {
    width: 100%;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: .01em;
    color: rgba(255,255,255,.78);
  }
  .scene-cielo .asof { color: #475569; }
  .scene-rosa .chip .v { color: #4C0519; }
  .scene-rosa .chip .k { color: #9D174D; }
  .scene-rosa .chip + .chip { border-color: rgba(157,23,77,.28); }
  .scene-rosa header { padding-bottom: 118px; }
  .scene-rosa .detail {
    color: #9F1239;
    font-size: 18px;
    font-weight: 600;
    -webkit-line-clamp: 2;
  }
  .scene-rosa .seal {
    color: #fff;
    background: linear-gradient(135deg, #E11D48, #BE185D);
    border-color: transparent;
  }
  .scene-rosa .kicker { color: #BE185D; }
  .scene-rosa .title, .scene-rosa .wa, .scene-rosa .phone { color: #4C0519; }
  .scene-rosa .mark { display: none; }
  .scene-rosa .c.tl { border-left-color: #E11D48; border-top-color: #E11D48; }
  .scene-rosa .c.tr { border-right-color: #BE185D; border-top-color: #BE185D; }
  .scene-rosa .c.bl { border-left-color: #BE185D; border-bottom-color: #BE185D; }
  .scene-rosa .c.br { border-right-color: #E11D48; border-bottom-color: #E11D48; }
  .scene-rosa .line { background: linear-gradient(180deg, #FB7185, #9D174D 55%, #FB7185); }
  .scene-rosa .promises span {
    color: #4C0519;
    background: rgba(255,255,255,.72);
    border-color: rgba(190,24,93,.22);
  }
  .scene-rosa .rule { background: linear-gradient(90deg, #FB7185, #9D174D); }
  .scene-rosa .offer .before { color: #9F1239; }
  .scene-rosa .offer .now { color: #9D174D; }
  .scene-rosa .asof { color: #9F1239; }
  .scene-rosa .cta {
    background: linear-gradient(135deg, #F43F5E 0%, #9D174D 100%);
    box-shadow: 0 12px 30px rgba(190,24,93,.32);
  }
  .scene-rosa .plate {
    z-index: 3;
    background:
      linear-gradient(#fff, #fff) padding-box,
      linear-gradient(135deg, #FB7185 0%, #9D174D 100%) border-box;
  }
  .rosa-sash, .rosa-badge, .rosa-pattern { display: none; }
  .scene-rosa .rosa-pattern {
    display: block;
    position: absolute;
    inset: -80px -40px;
    z-index: 0;
    pointer-events: none;
    opacity: .55;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='340' height='150' viewBox='0 0 340 150'><text x='0' y='42' fill='%23F472B6' fill-opacity='0.28' font-family='Arial' font-size='28' font-weight='700' letter-spacing='6'>OCTUBRE ROSA</text><text x='40' y='118' fill='%23FB7185' fill-opacity='0.22' font-family='Arial' font-size='28' font-weight='700' letter-spacing='6'>OCTUBRE ROSA</text></svg>");
    background-size: 340px 150px;
    transform: rotate(-8deg);
  }
  .scene-rosa .rosa-badge {
    display: block;
    position: absolute;
    left: 50%;
    top: 8px;
    width: 118px;
    transform: translateX(-50%);
    z-index: 9;
    pointer-events: none;
  }
  .scene-rosa .rosa-badge img {
    width: 100%;
    height: auto;
    display: block;
  }
  .promises {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .promises span {
    font-size: 14px; font-weight: 700; letter-spacing: .04em;
    color: #E0F2FE;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 999px;
    padding: 8px 12px;
  }
  .row { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
  .cta {
    display: inline-flex; align-items: center; justify-content: center;
    font-weight: 800; color: #fff; white-space: nowrap;
    background: linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%);
    border-radius: 999px;
    box-shadow: 0 12px 30px rgba(123,44,191,.38);
  }
  .wa { font-size: 15px; color: rgba(255,255,255,.55); font-weight: 500; }
  .phone {
    margin-top: 16px;
    font-family: Unbounded, Outfit, sans-serif;
    font-size: 28px; font-weight: 800; letter-spacing: .04em;
    color: #fff;
  }

  .fmt-story .rosa-badge { width: 156px; top: 16px; }
  .fmt-feed .rosa-badge { width: 112px; top: 6px; }
  .fmt-feed .plate { width: 92%; height: 96%; }
  .fmt-feed.scene-rosa header { padding-bottom: 132px; }
  .fmt-feed .title { margin-top: 4px; font-size: 32px; }
  .fmt-feed .offer .now { font-size: 36px; }
  .fmt-feed .cta { height: 48px; padding: 0 22px; font-size: 17px; min-width: 240px; }
  .fmt-feed .row { margin-top: 10px; }
  .fmt-feed footer { padding: 10px 48px 32px; }

  .fmt-story .plate { width: 94%; height: 96%; border-radius: 40px; }
  .fmt-story .hero.has-thumbs .plate { width: 88%; height: 78%; top: 42%; }
  .fmt-story.scene-rosa header { padding-bottom: 196px; }
  .fmt-story .chip .v { font-size: 34px; }
  .fmt-story .thumbs {
    left: 50%; top: auto; bottom: 10px;
    transform: translateX(-50%);
    flex-direction: row;
    z-index: 6;
  }
  .fmt-story .thumb { width: 78px; height: 78px; }
  .fmt-story .shots { left: auto; right: 28px; bottom: 28px; }
  .fmt-story footer { padding: 8px 52px 220px; text-align: center; }
  .fmt-story .brand, .fmt-story .kicker, .fmt-story .title, .fmt-story .detail { text-align: center; }
  .fmt-story .brand { margin-left: auto; margin-right: auto; }
  .fmt-story .rule { margin-left: auto; margin-right: auto; }
  .fmt-story .title { margin-top: 4px; font-size: 34px; }
  .fmt-story .offer { justify-content: center; }
  .fmt-story .offer .now { font-size: 38px; }
  .fmt-story .asof { text-align: center; }
  .fmt-story .promises { justify-content: center; }
  .fmt-story .row { flex-direction: column; align-items: center; margin-top: 10px; }
  .fmt-story .cta { height: 52px; padding: 0 26px; font-size: 18px; min-width: 300px; }
  .fmt-story .wa { margin-top: 8px; }

  .fmt-square .plate { width: 88%; height: 94%; border-radius: 30px; }
  .fmt-square .chip .v { font-size: 22px; }
  .fmt-square .thumb { width: 68px; height: 66px; border-radius: 16px; }
  .fmt-square .thumbs { left: 22px; }
  .fmt-square header { padding: 20px 36px 0 44px; }
  .fmt-square footer { padding: 6px 36px 24px; }
  .fmt-square .title { margin-top: 4px; font-size: 26px; }
  .fmt-square .offer .now { font-size: 30px; }
  .fmt-square .cta { height: 44px; padding: 0 16px; font-size: 15px; min-width: 200px; }
  .fmt-square .row { margin-top: 8px; }
  .fmt-square .mark { font-size: 112px; top: 120px; }
</style>
</head>
<body>
  <div class="art ${theme} fmt-${format} scene-${scene}">
    <div class="line"></div>
    <div class="deco mesh"></div>
    <div class="deco dots"></div>
    <div class="deco beam b1"></div>
    <div class="deco beam b2"></div>
    <div class="deco ring"></div>
    <div class="glow g1"></div>
    <div class="glow g2"></div>
    <div class="rosa-pattern"></div>
    <div class="rosa-badge"><img src="${octubreRosaRibbon()}" alt="" /></div>
    <div class="mark">${mark}</div>
    <header>
      ${logo ? `<img class="logo" src="${logo}" alt="Zenn" />` : '<div></div>'}
      <div class="seal">${esc(seal)}</div>
    </header>
    <div class="hero${gallery.length > 1 ? ' has-thumbs' : ''}">
      ${galleryHtml(gallery)}
      <div class="plate">
        <div class="orb"></div>
        <span class="c tl"></span><span class="c tr"></span>
        <span class="c bl"></span><span class="c br"></span>
        ${gpuChip}
        ${shot}
        ${img}
      </div>
    </div>
    ${specsHtml(payload.specs || [])}
    <footer>
      ${brand}
      <div class="kicker">${esc(payload.kicker)}</div>
      <div class="title">${esc(payload.title)}</div>
      <div class="rule"></div>
      ${payload.showPrice === false ? '' : `<div class="offer">${payload.onOffer ? `<span class="off">-${payload.discountPercent}%</span><span class="before">${esc(payload.listPrice)}</span>` : ''}<span class="now">${esc(payload.price)}</span><span class="asof">Precio al ${esc(payload.priceAsOf)}</span></div>`}
      <div class="row">
        <div class="promises">
          <span>Stock disponible</span>
          <span>Entrega 24 h</span>
        </div>
      </div>
      <div class="phone">${esc(payload.whatsapp)}</div>
    </footer>
    <div class="grain"></div>
  </div>
</body>
</html>`;
}

module.exports = {
  renderCreativeHtml,
  FORMATS
};
