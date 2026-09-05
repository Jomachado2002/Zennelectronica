/**
 * Genera creativos PNG listos para Instagram, Meta y Google Ads.
 * Paleta Zenn: navy #1E1B4B · violeta #7B2CBF · cian #00B5D8 · gris #E8EAED
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/creativos');
const FOTOS = path.join(OUT, 'fotos');
const LOGO_SVG = path.join(ROOT, 'frontend/public/logozenn.svg');

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(FOTOS, { recursive: true });

const C = {
  navy: '#1E1B4B',
  purple: '#7B2CBF',
  cyan: '#00B5D8',
  gray: '#E8EAED',
  gray2: '#F1F3F4',
  dark: '#111827',
  muted: '#6B7280',
  white: '#FFFFFF',
};

async function logoPng(width) {
  return sharp(LOGO_SVG, { density: 300 })
    .resize({ width, withoutEnlargement: false })
    .png()
    .toBuffer();
}

function overlaySvg(w, h, inner) {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style>
      .t { font-family: Helvetica, Arial, sans-serif; }
    </style>
  </defs>
  ${inner}
</svg>`);
}

async function compose(bg, overlay, outfile) {
  await sharp(bg)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 8 })
    .toFile(outfile);
  console.log('OK', path.basename(outfile));
}

async function cover(src, w, h, fit = 'cover') {
  return sharp(src)
    .resize(w, h, { fit, position: 'centre', background: C.gray })
    .png()
    .toBuffer();
}

async function solid(w, h, color) {
  return sharp({
    create: { width: w, height: h, channels: 4, background: color },
  })
    .png()
    .toBuffer();
}

async function run() {
  const logo160 = await logoPng(160);
  const logo220 = await logoPng(220);
  const logoWhite = await sharp(LOGO_SVG, { density: 300 })
    .resize({ width: 200 })
    .modulate({ brightness: 3 })
    .png()
    .toBuffer();

  // Logo blanco aproximado: si el SVG es color, lo dejamos original sobre barras oscuras.
  const logoBar = await logoPng(180);

  /* ---------- 00 Brand kit ---------- */
  {
    const w = 1920, h = 1080;
    const svg = overlaySvg(w, h, `
      <rect width="${w}" height="${h}" fill="${C.white}"/>
      <rect width="${w}" height="90" fill="${C.navy}"/>
      <text x="60" y="58" class="t" font-size="28" fill="${C.white}" font-weight="bold">Zenn Electrónicos  ·  Sistema visual</text>
      <text x="1860" y="58" class="t" font-size="18" fill="#C4B5FD" text-anchor="end">www.zenn.com.py</text>

      <text x="60" y="160" class="t" font-size="22" fill="${C.navy}" font-weight="bold">Paleta</text>
      <rect x="60" y="180" width="200" height="120" rx="8" fill="${C.navy}"/>
      <text x="70" y="320" class="t" font-size="14" fill="${C.navy}">Navy #1E1B4B</text>
      <rect x="280" y="180" width="200" height="120" rx="8" fill="${C.purple}"/>
      <text x="290" y="320" class="t" font-size="14" fill="${C.navy}">Violeta #7B2CBF</text>
      <rect x="500" y="180" width="200" height="120" rx="8" fill="${C.cyan}"/>
      <text x="510" y="320" class="t" font-size="14" fill="${C.navy}">Cian #00B5D8</text>
      <rect x="720" y="180" width="200" height="120" rx="8" fill="${C.gray}" stroke="#D1D5DB"/>
      <text x="730" y="320" class="t" font-size="14" fill="${C.navy}">Gris producto #E8EAED</text>
      <rect x="940" y="180" width="200" height="120" rx="8" fill="${C.dark}"/>
      <text x="950" y="320" class="t" font-size="14" fill="${C.navy}">Gamer #111827</text>
      <rect x="1160" y="180" width="200" height="120" rx="8" fill="${C.white}" stroke="#D1D5DB"/>
      <text x="1170" y="320" class="t" font-size="14" fill="${C.navy}">Blanco #FFFFFF</text>

      <text x="60" y="380" class="t" font-size="22" fill="${C.navy}" font-weight="bold">Tipografía</text>
      <text x="60" y="430" class="t" font-size="42" fill="${C.navy}" font-weight="bold">Título · Helvetica Bold / Inter Bold</text>
      <text x="60" y="475" class="t" font-size="24" fill="${C.muted}">Cuerpo · Helvetica / Inter Regular  ·  18–22 pt</text>
      <text x="60" y="525" class="t" font-size="56" fill="${C.cyan}" font-weight="bold">Gs. 3.787.229</text>
      <text x="60" y="555" class="t" font-size="16" fill="${C.muted}">Precio siempre en cian, con puntos, nunca “3,7 millones”</text>

      <text x="1100" y="380" class="t" font-size="22" fill="${C.navy}" font-weight="bold">Reglas</text>
      <text x="1100" y="420" class="t" font-size="18" fill="${C.dark}">1. Un producto. Un precio. Un CTA.</text>
      <text x="1100" y="452" class="t" font-size="18" fill="${C.dark}">2. Sello obligatorio: Entrega Asunción 24 h</text>
      <text x="1100" y="484" class="t" font-size="18" fill="${C.dark}">3. Nunca “retiro” ni “stock en Asunción”</text>
      <text x="1100" y="516" class="t" font-size="18" fill="${C.dark}">4. Logo arriba izquierda, 8–10% del ancho</text>
      <text x="1100" y="548" class="t" font-size="18" fill="${C.dark}">5. Fondo gris para producto. Navy para confianza.</text>
      <text x="1100" y="580" class="t" font-size="18" fill="${C.dark}">6. Gamer oscuro solo Redragon / setup</text>

      <text x="60" y="640" class="t" font-size="22" fill="${C.navy}" font-weight="bold">Fondos a usar</text>
      <rect x="60" y="660" width="420" height="320" rx="12" fill="${C.gray}"/>
      <text x="270" y="820" class="t" font-size="20" fill="${C.navy}" text-anchor="middle" font-weight="bold">A · Producto</text>
      <text x="270" y="850" class="t" font-size="16" fill="${C.muted}" text-anchor="middle">Gris #E8EAED</text>
      <rect x="510" y="660" width="420" height="320" rx="12" fill="${C.navy}"/>
      <text x="720" y="820" class="t" font-size="20" fill="${C.white}" text-anchor="middle" font-weight="bold">B · Confianza</text>
      <text x="720" y="850" class="t" font-size="16" fill="${C.cyan}" text-anchor="middle">Navy #1E1B4B</text>
      <rect x="960" y="660" width="420" height="320" rx="12" fill="${C.dark}"/>
      <text x="1170" y="820" class="t" font-size="20" fill="${C.white}" text-anchor="middle" font-weight="bold">C · Gamer</text>
      <text x="1170" y="850" class="t" font-size="16" fill="${C.purple}" text-anchor="middle">#111827 + violeta</text>
      <rect x="1410" y="660" width="450" height="320" rx="12" fill="${C.white}" stroke="#E5E7EB"/>
      <text x="1635" y="820" class="t" font-size="20" fill="${C.navy}" text-anchor="middle" font-weight="bold">D · Google</text>
      <text x="1635" y="850" class="t" font-size="16" fill="${C.muted}" text-anchor="middle">Blanco + cian</text>
    `);
    await sharp(svg).png().toFile(path.join(OUT, '00-sistema-visual.png'));
    console.log('OK 00-sistema-visual.png');
  }

  /* ---------- 01 IG post notebook 1080x1350 ---------- */
  {
    const w = 1080, h = 1350;
    const photo = await cover(path.join(FOTOS, 'notebook-gris.png'), w, 780, 'cover');
    const canvas = await solid(w, h, C.gray);
    const ov = overlaySvg(w, h, `
      <rect width="${w}" height="88" fill="${C.navy}"/>
      <text x="900" y="54" class="t" font-size="22" fill="${C.cyan}" text-anchor="end" font-weight="bold">ENTREGA ASUNCIÓN 24 H</text>
      <rect y="1020" width="${w}" height="330" fill="${C.white}"/>
      <text x="48" y="1070" class="t" font-size="18" fill="${C.purple}" font-weight="bold">NOTEBOOK  ·  ESTUDIO Y OFICINA</text>
      <text x="48" y="1122" class="t" font-size="36" fill="${C.navy}" font-weight="bold">ASUS Vivobook 15</text>
      <text x="48" y="1160" class="t" font-size="20" fill="${C.muted}">Intel Core 5  ·  8GB RAM  ·  512GB SSD  ·  Win11</text>
      <text x="48" y="1230" class="t" font-size="52" fill="${C.cyan}" font-weight="bold">Gs. 3.787.229</text>
      <rect x="48" y="1255" width="520" height="56" rx="28" fill="${C.purple}"/>
      <text x="308" y="1292" class="t" font-size="22" fill="${C.white}" text-anchor="middle" font-weight="bold">Comprá en zenn.com.py</text>
      <text x="1032" y="1290" class="t" font-size="16" fill="${C.muted}" text-anchor="end">WhatsApp 0973 345 284</text>
    `);
    const ovPng = await sharp(ov).png().toBuffer();
    await sharp(canvas)
      .composite([
        { input: photo, top: 88, left: 0 },
        { input: ovPng, top: 0, left: 0 },
        { input: logoBar, top: 18, left: 28 },
      ])
      .png()
      .toFile(path.join(OUT, '01-ig-post-notebook.png'));
    console.log('OK 01-ig-post-notebook.png');
  }

  /* ---------- 02 Story 9:16 notebook ---------- */
  {
    const w = 1080, h = 1920;
    const photo = await cover(path.join(FOTOS, 'notebook-gris.png'), w, 1100, 'cover');
    const canvas = await solid(w, h, C.gray);
    const ov = overlaySvg(w, h, `
      <rect width="${w}" height="96" fill="${C.navy}"/>
      <text x="1040" y="58" class="t" font-size="22" fill="${C.cyan}" text-anchor="end" font-weight="bold">ENTREGA 24 H</text>
      <rect y="1280" width="${w}" height="640" fill="${C.navy}"/>
      <text x="540" y="1360" class="t" font-size="22" fill="${C.cyan}" text-anchor="middle" font-weight="bold">PAGÁS HOY  ·  TE LLEGA MAÑANA</text>
      <text x="540" y="1440" class="t" font-size="48" fill="${C.white}" text-anchor="middle" font-weight="bold">ASUS Vivobook 15</text>
      <text x="540" y="1490" class="t" font-size="22" fill="#C4B5FD" text-anchor="middle">8GB  ·  512GB SSD  ·  Win11</text>
      <text x="540" y="1580" class="t" font-size="56" fill="${C.cyan}" text-anchor="middle" font-weight="bold">Gs. 3.787.229</text>
      <rect x="240" y="1630" width="600" height="64" rx="32" fill="${C.purple}"/>
      <text x="540" y="1672" class="t" font-size="24" fill="${C.white}" text-anchor="middle" font-weight="bold">Escribí al WhatsApp</text>
      <text x="540" y="1760" class="t" font-size="18" fill="#9CA3AF" text-anchor="middle">Depósito CDE  ·  Oficinas en Asunción</text>
      <text x="540" y="1800" class="t" font-size="18" fill="#9CA3AF" text-anchor="middle">zenn.com.py  ·  0973 345 284</text>
    `);
    const ovPng = await sharp(ov).png().toBuffer();
    await sharp(canvas)
      .composite([
        { input: photo, top: 96, left: 0 },
        { input: ovPng, top: 0, left: 0 },
        { input: logoBar, top: 22, left: 28 },
      ])
      .png()
      .toFile(path.join(OUT, '02-ig-story-notebook.png'));
    console.log('OK 02-ig-story-notebook.png');
  }

  /* ---------- 03 Meta square Xiaomi ---------- */
  {
    const w = 1080, h = 1080;
    const photo = await cover(path.join(FOTOS, 'celular-gris.png'), w, 680, 'cover');
    const canvas = await solid(w, h, C.gray);
    const ov = overlaySvg(w, h, `
      <rect width="${w}" height="80" fill="${C.navy}"/>
      <text x="1040" y="50" class="t" font-size="20" fill="${C.cyan}" text-anchor="end" font-weight="bold">ENTREGA ASUNCIÓN 24 H</text>
      <rect y="760" width="${w}" height="320" fill="${C.white}"/>
      <text x="48" y="810" class="t" font-size="18" fill="${C.purple}" font-weight="bold">CELULAR  ·  XIAOMI</text>
      <text x="48" y="860" class="t" font-size="36" fill="${C.navy}" font-weight="bold">POCO C71  3/64</text>
      <text x="48" y="900" class="t" font-size="18" fill="${C.muted}">Dual SIM LTE  ·  6.88"  ·  Global</text>
      <text x="48" y="970" class="t" font-size="48" fill="${C.cyan}" font-weight="bold">Gs. 758.675</text>
      <rect x="48" y="995" width="430" height="52" rx="26" fill="${C.purple}"/>
      <text x="263" y="1029" class="t" font-size="20" fill="${C.white}" text-anchor="middle" font-weight="bold">Enviar mensaje</text>
    `);
    const ovPng = await sharp(ov).png().toBuffer();
    await sharp(canvas)
      .composite([
        { input: photo, top: 80, left: 0 },
        { input: ovPng, top: 0, left: 0 },
        { input: logoBar, top: 16, left: 24 },
      ])
      .png()
      .toFile(path.join(OUT, '03-meta-cuadrado-xiaomi.png'));
    console.log('OK 03-meta-cuadrado-xiaomi.png');
  }

  /* ---------- 04 Google Display 1200x628 ---------- */
  {
    const w = 1200, h = 628;
    const photo = await cover(path.join(FOTOS, 'notebook-gris.png'), 560, 628, 'cover');
    const canvas = await solid(w, h, C.white);
    const ov = overlaySvg(w, h, `
      <rect width="40" height="${h}" fill="${C.cyan}"/>
      <text x="80" y="70" class="t" font-size="16" fill="${C.purple}" font-weight="bold">ZENN ELECTRÓNICOS  ·  PARAGUAY</text>
      <text x="80" y="150" class="t" font-size="36" fill="${C.navy}" font-weight="bold">Notebook para</text>
      <text x="80" y="196" class="t" font-size="36" fill="${C.navy}" font-weight="bold">estudiar y trabajar</text>
      <text x="80" y="250" class="t" font-size="20" fill="${C.muted}">ASUS Vivobook 15  ·  8GB  ·  512GB SSD</text>
      <text x="80" y="330" class="t" font-size="44" fill="${C.cyan}" font-weight="bold">Gs. 3.787.229</text>
      <rect x="80" y="370" width="360" height="52" rx="8" fill="${C.purple}"/>
      <text x="260" y="404" class="t" font-size="20" fill="${C.white}" text-anchor="middle" font-weight="bold">Comprar en zenn.com.py</text>
      <text x="80" y="560" class="t" font-size="16" fill="${C.navy}">Entrega en Asunción en 24 h  ·  Depósito en CDE</text>
      <text x="80" y="590" class="t" font-size="14" fill="${C.muted}">WhatsApp 0973 345 284</text>
    `);
    const ovPng = await sharp(ov).png().toBuffer();
    await sharp(canvas)
      .composite([
        { input: photo, top: 0, left: 640 },
        { input: ovPng, top: 0, left: 0 },
      ])
      .png()
      .toFile(path.join(OUT, '04-google-display-notebook.png'));
    console.log('OK 04-google-display-notebook.png');
  }

  /* ---------- 05 Confianza Story ---------- */
  {
    const w = 1080, h = 1920;
    const photo = await cover(path.join(FOTOS, 'paquete-navy.png'), w, h, 'cover');
    const ov = overlaySvg(w, h, `
      <rect width="${w}" height="96" fill="${C.navy}"/>
      <text x="1040" y="58" class="t" font-size="22" fill="${C.cyan}" text-anchor="end" font-weight="bold">ENTREGAS REALES</text>
      <rect y="1320" width="${w}" height="600" fill="${C.navy}" fill-opacity="0.92"/>
      <text x="540" y="1410" class="t" font-size="28" fill="${C.cyan}" text-anchor="middle" font-weight="bold">¿Y SI PAGO Y NO ME LLEGA?</text>
      <text x="540" y="1500" class="t" font-size="42" fill="${C.white}" text-anchor="middle" font-weight="bold">Pedís hoy. Pagás.</text>
      <text x="540" y="1555" class="t" font-size="42" fill="${C.white}" text-anchor="middle" font-weight="bold">Mañana te llega.</text>
      <text x="540" y="1640" class="t" font-size="22" fill="#C4B5FD" text-anchor="middle">Foto del paquete el mismo día</text>
      <text x="540" y="1678" class="t" font-size="22" fill="#C4B5FD" text-anchor="middle">Depósito CDE  ·  Asunción 24 h</text>
      <rect x="240" y="1730" width="600" height="64" rx="32" fill="${C.cyan}"/>
      <text x="540" y="1772" class="t" font-size="22" fill="${C.navy}" text-anchor="middle" font-weight="bold">Escribí al WhatsApp</text>
    `);
    const ovPng = await sharp(ov).png().toBuffer();
    await sharp(photo)
      .composite([
        { input: ovPng, top: 0, left: 0 },
        { input: logoBar, top: 22, left: 28 },
      ])
      .png()
      .toFile(path.join(OUT, '05-story-confianza-24h.png'));
    console.log('OK 05-story-confianza-24h.png');
  }

  /* ---------- 06 Redragon gamer post ---------- */
  {
    const w = 1080, h = 1350;
    const photo = await cover(path.join(FOTOS, 'gamer.png'), w, 820, 'cover');
    const canvas = await solid(w, h, C.dark);
    const ov = overlaySvg(w, h, `
      <rect width="${w}" height="88" fill="${C.dark}"/>
      <text x="1040" y="54" class="t" font-size="22" fill="${C.purple}" text-anchor="end" font-weight="bold">SETUP GAMER</text>
      <rect y="908" width="${w}" height="442" fill="${C.dark}"/>
      <text x="48" y="960" class="t" font-size="18" fill="${C.cyan}" font-weight="bold">REDRAGON  ·  TECLADO + MOUSE</text>
      <text x="48" y="1020" class="t" font-size="36" fill="${C.white}" font-weight="bold">Combo gamer desde</text>
      <text x="48" y="1100" class="t" font-size="56" fill="${C.cyan}" font-weight="bold">Gs. 120.325</text>
      <text x="48" y="1155" class="t" font-size="20" fill="#9CA3AF">Pagás hoy  ·  te llega mañana a Asunción</text>
      <rect x="48" y="1195" width="500" height="56" rx="28" fill="${C.purple}"/>
      <text x="298" y="1232" class="t" font-size="22" fill="${C.white}" text-anchor="middle" font-weight="bold">Armá tu setup</text>
      <text x="1032" y="1230" class="t" font-size="16" fill="#6B7280" text-anchor="end">zenn.com.py</text>
    `);
    const ovPng = await sharp(ov).png().toBuffer();
    await sharp(canvas)
      .composite([
        { input: photo, top: 88, left: 0 },
        { input: ovPng, top: 0, left: 0 },
        { input: logoBar, top: 18, left: 28 },
      ])
      .png()
      .toFile(path.join(OUT, '06-ig-post-redragon.png'));
    console.log('OK 06-ig-post-redragon.png');
  }

  /* ---------- 07 Google square 1200x1200 ---------- */
  {
    const w = 1200, h = 1200;
    const photo = await cover(path.join(FOTOS, 'celular-gris.png'), w, 760, 'cover');
    const canvas = await solid(w, h, C.white);
    const ov = overlaySvg(w, h, `
      <rect width="${w}" height="80" fill="${C.navy}"/>
      <text x="1160" y="50" class="t" font-size="22" fill="${C.cyan}" text-anchor="end" font-weight="bold">GOOGLE  ·  24 H ASUNCIÓN</text>
      <rect y="840" width="${w}" height="360" fill="${C.white}"/>
      <text x="48" y="900" class="t" font-size="20" fill="${C.purple}" font-weight="bold">XIAOMI EN PARAGUAY</text>
      <text x="48" y="960" class="t" font-size="40" fill="${C.navy}" font-weight="bold">POCO C71  ·  Gs. 758.675</text>
      <text x="48" y="1010" class="t" font-size="22" fill="${C.muted}">Pagás hoy en zenn.com.py  ·  llega mañana</text>
      <rect x="48" y="1050" width="420" height="56" rx="8" fill="${C.cyan}"/>
      <text x="258" y="1086" class="t" font-size="22" fill="${C.navy}" text-anchor="middle" font-weight="bold">Ver producto</text>
    `);
    const ovPng = await sharp(ov).png().toBuffer();
    await sharp(canvas)
      .composite([
        { input: photo, top: 80, left: 0 },
        { input: ovPng, top: 0, left: 0 },
        { input: logoBar, top: 16, left: 28 },
      ])
      .png()
      .toFile(path.join(OUT, '07-google-cuadrado-xiaomi.png'));
    console.log('OK 07-google-cuadrado-xiaomi.png');
  }

  /* ---------- 08 Catálogo de marcas ---------- */
  {
    const w = 1920, h = 1080;
    const groups = [
      { t: 'Búsqueda (pauta Search)', items: 'Xiaomi  ·  ASUS  ·  Dell  ·  HP  ·  Lenovo  ·  Apple  ·  MSI  ·  Acer' },
      { t: 'Gaming (Reels / Meta)', items: 'Redragon  ·  Razer  ·  Logitech  ·  Corsair  ·  JBL' },
      { t: 'Componentes (educativo + Shopping)', items: 'Kingston  ·  Gigabyte  ·  Intel  ·  AMD  ·  Samsung  ·  WD  ·  SanDisk  ·  ADATA  ·  ASRock' },
      { t: 'Red y pyme', items: 'TP-Link  ·  Hikvision  ·  Epson  ·  Mercusys' },
      { t: 'Volumen / precio (no hero de marca)', items: 'Satellite  ·  FTX  ·  Macrovip  ·  Mtek  ·  Kolke  ·  Quanta' },
    ];
    let cards = '';
    groups.forEach((g, i) => {
      const y = 200 + i * 150;
      cards += `
        <rect x="60" y="${y}" width="1800" height="130" rx="12" fill="${i % 2 ? C.gray2 : C.white}" stroke="#E5E7EB"/>
        <rect x="60" y="${y}" width="12" height="130" rx="6" fill="${i === 4 ? C.muted : C.purple}"/>
        <text x="100" y="${y + 50}" class="t" font-size="26" fill="${C.navy}" font-weight="bold">${g.t}</text>
        <text x="100" y="${y + 92}" class="t" font-size="22" fill="${C.muted}">${g.items}</text>
      `;
    });
    const svg = overlaySvg(w, h, `
      <rect width="${w}" height="${h}" fill="${C.white}"/>
      <rect width="${w}" height="110" fill="${C.navy}"/>
      <text x="60" y="50" class="t" font-size="28" fill="${C.white}" font-weight="bold">Catálogo de marcas para contenido y pauta</text>
      <text x="60" y="85" class="t" font-size="18" fill="${C.cyan}">No publiques las 5.000 SKUs. Publicá estas marcas, en este orden.</text>
      ${cards}
    `);
    await sharp(svg).png().toFile(path.join(OUT, '08-catalogo-marcas.png'));
    console.log('OK 08-catalogo-marcas.png');
  }

  /* ---------- 09 Meta landscape 1200x628 gamer ---------- */
  {
    const w = 1200, h = 628;
    const photo = await cover(path.join(FOTOS, 'gamer.png'), 560, 628, 'cover');
    const canvas = await solid(w, h, C.dark);
    const ov = overlaySvg(w, h, `
      <text x="48" y="70" class="t" font-size="16" fill="${C.cyan}" font-weight="bold">REDRAGON  ·  ZENN</text>
      <text x="48" y="180" class="t" font-size="40" fill="${C.white}" font-weight="bold">Setup gamer</text>
      <text x="48" y="230" class="t" font-size="40" fill="${C.white}" font-weight="bold">sin ir a CDE</text>
      <text x="48" y="300" class="t" font-size="22" fill="#9CA3AF">Teclado + mouse  ·  entrega Asunción 24 h</text>
      <text x="48" y="390" class="t" font-size="48" fill="${C.cyan}" font-weight="bold">Gs. 120.325</text>
      <rect x="48" y="430" width="340" height="52" rx="26" fill="${C.purple}"/>
      <text x="218" y="464" class="t" font-size="20" fill="${C.white}" text-anchor="middle" font-weight="bold">Enviar WhatsApp</text>
    `);
    const ovPng = await sharp(ov).png().toBuffer();
    await sharp(canvas)
      .composite([
        { input: photo, top: 0, left: 640 },
        { input: ovPng, top: 0, left: 0 },
      ])
      .png()
      .toFile(path.join(OUT, '09-meta-paisaje-redragon.png'));
    console.log('OK 09-meta-paisaje-redragon.png');
  }

  console.log('\nCreativos en', OUT);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
