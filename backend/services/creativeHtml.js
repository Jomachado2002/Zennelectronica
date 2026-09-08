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

function specsHtml(specs) {
  if (!specs.length) return '';
  return `<div class="specs">${specs.map((s) => `
    <div class="spec ${s.icon === 'gpu' ? 'gpu' : ''}">
      <span class="ico">${ICONS[s.icon] || ICONS.cpu}</span>
      <span>${esc(s.text)}</span>
    </div>`).join('')}</div>`;
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
  const brand = payload.brandName
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
    background:
      radial-gradient(1200px 700px at 50% -10%, rgba(123,44,191,.38), transparent 58%),
      radial-gradient(900px 520px at 110% 18%, rgba(0,181,216,.28), transparent 62%),
      linear-gradient(180deg, #16143A 0%, #1E1B4B 42%, #14122F 100%);
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
    position: absolute; left: 48px; right: 48px; z-index: 5;
    display: flex; align-items: stretch; justify-content: center; gap: 12px;
  }
  .spec {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px; color: #fff;
    font-size: 15px; font-weight: 700; letter-spacing: .02em;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 999px;
    backdrop-filter: blur(10px);
  }
  .spec .ico { width: 18px; height: 18px; color: #00B5D8; display: flex; }
  .spec .ico svg { width: 18px; height: 18px; }
  .spec.gpu {
    color: #EDE9FE;
    border-color: rgba(123,44,191,.55);
    background: rgba(123,44,191,.28);
  }
  .gamer .spec.gpu .ico { color: #C4B5FD; }
  footer {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 6;
    background: linear-gradient(180deg, rgba(20,18,47,0) 0%, rgba(20,18,47,.88) 22%, #14122F 62%);
  }
  .brand {
    display: inline-flex; align-items: center;
    font-size: 13px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
    color: #fff; background: #1E1B4B;
    border: 1px solid rgba(0,181,216,.35);
    padding: 6px 12px; border-radius: 999px; margin-bottom: 10px;
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
  .rule {
    width: 72px; height: 4px; border-radius: 4px;
    background: linear-gradient(90deg, #00B5D8, #7B2CBF);
    margin: 14px 0 0;
  }
  .price {
    font-family: Unbounded, sans-serif; font-weight: 800;
    color: #5CE1F6;
    text-shadow: 0 0 28px rgba(0,181,216,.35);
  }
  .row { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
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
  .fmt-feed .specs { top: 812px; }
  .fmt-feed footer { height: 478px; padding: 92px 52px 42px; }
  .fmt-feed .title { margin-top: 10px; font-size: 50px; }
  .fmt-feed .price { font-size: 54px; }
  .fmt-feed .cta { height: 58px; padding: 0 28px; font-size: 19px; min-width: 300px; }
  .fmt-feed .row { margin-top: 22px; }

  .fmt-story .hero { top: 118px; height: 1080px; }
  .fmt-story .plate { width: 760px; height: 800px; border-radius: 40px; }
  .fmt-story .thumbs {
    left: 50%; top: auto; bottom: 22px;
    transform: translateX(-50%);
    flex-direction: row;
  }
  .fmt-story .shots { left: auto; right: 28px; bottom: 28px; }
  .fmt-story .specs { top: 1214px; }
  .fmt-story footer { height: 690px; padding: 128px 56px 70px; text-align: center; }
  .fmt-story .brand, .fmt-story .kicker, .fmt-story .title { text-align: center; }
  .fmt-story .brand { margin-left: auto; margin-right: auto; }
  .fmt-story .rule { margin-left: auto; margin-right: auto; }
  .fmt-story .title { margin-top: 14px; font-size: 54px; }
  .fmt-story .price { font-size: 60px; }
  .fmt-story .row { flex-direction: column; align-items: center; margin-top: 28px; }
  .fmt-story .cta { height: 64px; padding: 0 34px; font-size: 22px; min-width: 400px; }
  .fmt-story .wa { margin-top: 16px; }

  .fmt-square .hero { top: 92px; height: 560px; }
  .fmt-square .plate { width: 620px; height: 500px; border-radius: 30px; }
  .fmt-square .thumb { width: 74px; height: 72px; border-radius: 16px; }
  .fmt-square .thumbs { left: 22px; }
  .fmt-square .specs { top: 662px; }
  .fmt-square .spec { padding: 10px 13px; font-size: 13px; }
  .fmt-square header { padding: 24px 36px 0 44px; }
  .fmt-square footer { height: 368px; padding: 68px 40px 30px; }
  .fmt-square .title { margin-top: 8px; font-size: 36px; }
  .fmt-square .price { font-size: 42px; }
  .fmt-square .cta { height: 50px; padding: 0 20px; font-size: 16px; min-width: 240px; }
  .fmt-square .row { margin-top: 14px; }
  .fmt-square .mark { font-size: 112px; top: 120px; }
</style>
</head>
<body>
  <div class="art ${theme} fmt-${format}">
    <div class="line"></div>
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
    ${specsHtml(payload.specs || [])}
    <footer>
      ${brand}
      <div class="kicker">${esc(payload.kicker)}</div>
      <div class="title">${esc(payload.title)}</div>
      <div class="rule"></div>
      <div class="row">
        <div>
          <div class="price">${esc(payload.price)}</div>
          <div class="wa" style="margin-top:10px">${format === 'story' ? `${esc(payload.site)}  ·  ${esc(payload.whatsapp)}` : `WhatsApp ${esc(payload.whatsapp)}`}</div>
        </div>
        <div class="cta">${esc(payload.cta)}</div>
      </div>
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
