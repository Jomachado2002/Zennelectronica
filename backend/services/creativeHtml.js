'use strict';

const { FORMATS } = require('./creativePayload');

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

function filledSpecs(specs) {
  const rows = (Array.isArray(specs) ? specs : []).filter((spec) => spec && String(spec.text || '').trim());
  return rows
    .map((spec, index) => {
      const blob = `${spec.label || ''} ${spec.name || ''}`.toLowerCase();
      const rank = SPEC_FIRST.findIndex((key) => blob.includes(key));
      return { spec, index, rank: rank === -1 ? 100 : rank };
    })
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((row) => row.spec);
}

function specLayout(count, format) {
  const band = format === 'story' ? 300 : format === 'square' ? 100 : 150;
  let cols = count <= 2 ? 1 : 2;
  if (count > 5 && Math.ceil(count / 2) * 34 > band) cols = 3;
  const rows = Math.ceil(count / cols);
  const lines = rows * 2 * 15 > band ? 1 : 2;
  const lineH = band / Math.max(1, rows * lines);
  const font = Math.max(11, Math.min(format === 'square' ? 14 : 18, Math.floor(lineH * 0.7)));
  return { cols, lines, font };
}

function specsHtml(specs, format) {
  const items = filledSpecs(specs);
  if (!items.length) return '';
  const { cols, lines, font } = specLayout(items.length, format);
  const size = Math.ceil(items.length / cols);
  const columns = [];
  for (let i = 0; i < cols; i += 1) {
    const slice = items.slice(i * size, (i + 1) * size);
    if (slice.length) columns.push(slice);
  }
  return `<div class="specs" style="--spec-size:${font}px;--spec-lines:${lines}">${columns.map((col) => `
    <div class="col">${col.map((spec) => `<p class="sp"><span class="k">${esc(spec.label)}:</span> ${esc(spec.text)}</p>`).join('')}</div>`).join('')}
  </div>`;
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
  const scene = ['orbita', 'neon', 'haz', 'malla', 'cielo'].includes(payload.scene) ? payload.scene : 'orbita';
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
    position: absolute; left: 0; right: 0; top: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 32px 44px 0 52px; z-index: 6;
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
    position: absolute; left: 0; right: 0;
    z-index: 3;
  }
  .plate {
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    width: 700px; height: 620px;
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
    width: 88%; height: 88%;
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
    position: absolute; z-index: 5;
    display: flex; align-items: center; justify-content: center;
  }
  .col {
    flex: 1; min-width: 0;
    text-align: center;
    padding: 0 18px;
  }
  .col + .col { border-left: 1px solid rgba(255,255,255,.4); }
  .sp {
    margin: 0 0 3px;
    font-size: var(--spec-size);
    line-height: 1.28;
    font-weight: 500;
    color: rgba(226,232,240,.86);
    display: -webkit-box;
    -webkit-line-clamp: var(--spec-lines);
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .sp .k { font-weight: 700; color: rgba(255,255,255,.96); }
  footer {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 6;
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
    margin-top: 8px;
    font-size: 15px; line-height: 1.35; font-weight: 500; color: #D1D5DB;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .scene-cielo .sp, .scene-cielo .sp .k { color: #64748B; }
  .scene-cielo .sp .k { color: #475569; }
  .scene-cielo .col + .col { border-color: rgba(15,23,42,.2); }
  .scene-cielo .detail { color: #475569; }
  .scene-cielo .seal {
    color: #0F172A;
    background: rgba(255,255,255,.78);
    border-color: rgba(14,116,144,.18);
  }
  .scene-cielo .kicker { color: #0369A1; }
  .scene-cielo .title, .scene-cielo .wa { color: #0F172A; }
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
  .price { display: none; }
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

  .fmt-feed .hero { top: 108px; height: 690px; }
  .fmt-feed .plate { width: 690px; height: 620px; }
  .fmt-feed .specs { top: 788px; height: 150px; left: 48px; right: 48px; }
  .fmt-feed footer { height: 400px; padding: 28px 52px 28px; }
  .fmt-feed .title { margin-top: 8px; font-size: 40px; }
  .fmt-feed .cta { height: 52px; padding: 0 24px; font-size: 18px; min-width: 280px; }
  .fmt-feed .row { margin-top: 12px; }

  .fmt-story .hero { top: 118px; height: 1080px; }
  .fmt-story .plate { width: 760px; height: 800px; border-radius: 40px; }
  .fmt-story .thumbs {
    left: 50%; top: auto; bottom: 22px;
    transform: translateX(-50%);
    flex-direction: row;
  }
  .fmt-story .shots { left: auto; right: 28px; bottom: 28px; }
  .fmt-story .specs { top: 1088px; height: 300px; left: 56px; right: 56px; }
  .fmt-story footer { height: 500px; padding: 24px 56px 48px; text-align: center; }
  .fmt-story .brand, .fmt-story .kicker, .fmt-story .title, .fmt-story .detail { text-align: center; }
  .fmt-story .brand { margin-left: auto; margin-right: auto; }
  .fmt-story .rule { margin-left: auto; margin-right: auto; }
  .fmt-story .title { margin-top: 8px; font-size: 46px; }
  .fmt-story .promises { justify-content: center; }
  .fmt-story .row { flex-direction: column; align-items: center; margin-top: 14px; }
  .fmt-story .cta { height: 56px; padding: 0 28px; font-size: 20px; min-width: 340px; }
  .fmt-story .wa { margin-top: 12px; }

  .fmt-square .hero { top: 92px; height: 560px; }
  .fmt-square .plate { width: 620px; height: 500px; border-radius: 30px; }
  .fmt-square .thumb { width: 74px; height: 72px; border-radius: 16px; }
  .fmt-square .thumbs { left: 22px; }
  .fmt-square .specs { top: 640px; height: 100px; left: 36px; right: 36px; }
  .fmt-square header { padding: 24px 36px 0 44px; }
  .fmt-square footer { height: 320px; padding: 16px 40px 22px; }
  .fmt-square .title { margin-top: 6px; font-size: 32px; }
  .fmt-square .cta { height: 46px; padding: 0 18px; font-size: 15px; min-width: 220px; }
  .fmt-square .row { margin-top: 10px; }
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
    <div class="mark">${mark}</div>
    <header>
      ${logo ? `<img class="logo" src="${logo}" alt="Zenn" />` : '<div></div>'}
      <div class="seal">${esc(seal)}</div>
    </header>
    <div class="hero">
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
    ${specsHtml(payload.specs || [], format)}
    <footer>
      ${brand}
      <div class="kicker">${esc(payload.kicker)}</div>
      <div class="title">${esc(payload.title)}</div>
      ${payload.detail ? `<div class="detail">${esc(payload.detail)}</div>` : ''}
      <div class="rule"></div>
      <div class="row">
        <div class="promises">
          <span>Stock disponible</span>
          <span>Entrega 24 h</span>
          <span>Precio por WhatsApp</span>
        </div>
        <div class="cta">${esc(payload.cta)}</div>
      </div>
      <div class="wa" style="margin-top:14px">${format === 'story' ? `${esc(payload.site)}  ·  ${esc(payload.whatsapp)}` : `WhatsApp ${esc(payload.whatsapp)}`}</div>
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
