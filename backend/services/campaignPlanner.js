'use strict';

/**
 * Marketing IA — campañas B2B de regalos empresariales.
 * Visual: plantilla fija controlada (NO Claude HTML: produce basura).
 * Claude/Gemini: solo copy. Productos: packs reales del catálogo.
 */

const Product = require('../models/productModel');
const Sale = require('../models/saleModel');
const ProductDailyStat = require('../models/productDailyStat');
const SearchDailyStat = require('../models/searchDailyStat');
const MarketingCampaign = require('../models/marketingCampaignModel');
const { askGeminiText, parseJson, communityAiReady } = require('./communityAi');
const { formatGs } = require('./creativePayload');
const { getSharedBrowser } = require('../helpers/sharedChrome');
const {
  getCutoutDataUri,
  getCommunityLogoLight
} = require('./creativeImage');

const ZONE = 'America/Asuncion';
const SIZE = { w: 1080, h: 1350 };

const GIFT_REJECT = [
  'pila', 'battery', 'bateria', 'cr2016', 'cr2032', 'litio', 'lithium',
  'sfp', 'transceiver', 'modulo optico', 'pasta termica', 'thermal paste',
  'mousepad', 'mouse pad', 'pad gamer', 'alfombrilla',
  'cable hdmi', 'cable vga', 'cable power', 'cable de poder',
  'adaptador', 'conector', 'fusible', 'tornillo', 'bracket', 'riel',
  'repuesto', 'placa de video', 'rtx '
];

/** Packs que piden las empresas a fin de año (volumen 100–400+). */
const PACKS = [
  {
    id: 'pack_auriculares',
    label: 'Pack auriculares',
    role: 'auricular',
    title: 'Pack auriculares',
    hook: 'Fin de año: cotizá 100, 300 o 400 auriculares para tu equipo.',
    cta: 'Cotizá 300+ unidades',
    qtyHint: '100 · 300 · 400 unidades',
    match: /auricular|headset|headphone/,
    minPrice: 70000,
    maxPrice: 900000
  },
  {
    id: 'pack_mochilas',
    label: 'Pack mochilas',
    role: 'mochila',
    title: 'Pack mochilas',
    hook: 'Mochilas para todo el equipo. Pedí cotización en cantidad.',
    cta: 'Cotizá el pack',
    qtyHint: '50 · 100 · 200 unidades',
    match: /mochila|backpack|maletin/,
    minPrice: 80000,
    maxPrice: 1200000
  },
  {
    id: 'pack_pendrives',
    label: 'Pack pendrives',
    role: 'pendrive',
    title: 'Pack pendrives',
    hook: 'Pendrives para regalos empresariales en cantidad. Cotizá el lote.',
    cta: 'Cotizá pendrives',
    qtyHint: '200 · 300 · 500 unidades',
    match: /pendrive|flash drive|usb.?3/,
    minPrice: 40000,
    maxPrice: 400000
  },
  {
    id: 'pack_perifericos',
    label: 'Pack periféricos',
    role: 'periferico',
    title: 'Pack periféricos',
    hook: 'Mouse y teclado para oficinas. Cotizá packs cerrados.',
    cta: 'Cotizá periféricos',
    qtyHint: '100 · 200 · 300 unidades',
    match: null, // roles mouse|teclado
    roles: ['mouse', 'teclado'],
    minPrice: 60000,
    maxPrice: 800000
  },
  {
    id: 'pack_parlantes',
    label: 'Pack parlantes',
    role: 'parlante',
    title: 'Pack parlantes',
    hook: 'Parlantes Bluetooth para regalos empresariales en volumen.',
    cta: 'Cotizá parlantes',
    qtyHint: '50 · 100 · 200 unidades',
    match: /parlante|speaker|\bjbl\b/,
    minPrice: 100000,
    maxPrice: 1500000
  },
  {
    id: 'pack_mixto',
    label: 'Pack mixto oficina',
    role: 'mixto',
    title: 'Pack oficina',
    hook: 'Auriculares + periféricos + mochila. Armamos el kit y cotizamos el volumen.',
    cta: 'Armá tu pack',
    qtyHint: 'kits × 50 · 100 · 200',
    match: null,
    roles: ['auricular', 'mouse', 'teclado', 'mochila', 'pendrive', 'energia'],
    mixed: true,
    minPrice: 60000,
    maxPrice: 900000
  }
];

const THEMES = [
  {
    id: 'regalos_empresariales',
    label: 'Regalos empresariales',
    audience: 'RR.HH. y compras que regalan 100–400 piezas a fin de año',
    goal: 'whatsapp_cotizacion_mayorista',
    hookSeed: 'Fin de año en Paraguay: cotizá packs empresariales en cantidad.',
    packs: true
  },
  ...PACKS.map((pack) => ({
    id: pack.id,
    label: pack.label,
    audience: 'Compras corporativas · volumen',
    goal: 'whatsapp_cotizacion_mayorista',
    hookSeed: pack.hook,
    packId: pack.id
  }))
];

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(new Date());
}

function fold(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function roleOf(product) {
  const blob = fold(`${product.productName || ''} ${product.category || ''} ${product.subcategory || ''}`);
  if (/mochila|backpack|maletin/.test(blob)) return 'mochila';
  if (/auricular|headset|headphone/.test(blob)) return 'auricular';
  if (/termo|thermos|botella term|tumbler|botella acero/.test(blob)) return 'termo';
  if (/licuadora|cafetera|aspiradora|plancha|microondas|ventilador|freidora|air.?fry|hervidor|electrodomest/.test(blob)) {
    return 'electro';
  }
  if (/mousepad|mouse pad|alfombrilla/.test(blob)) return 'rechazo';
  if (/\bmouse\b|raton/.test(blob)) return 'mouse';
  if (/teclado|keyboard/.test(blob)) return 'teclado';
  if (/parlante|speaker|\bjbl\b/.test(blob)) return 'parlante';
  if (/power.?bank|cargador portatil/.test(blob)) return 'energia';
  if (/pendrive|flash drive/.test(blob)) return 'pendrive';
  if (/webcam/.test(blob)) return 'webcam';
  return 'otro';
}

function isRejected(product) {
  const blob = fold(`${product.productName || ''} ${product.brandName || ''} ${product.category || ''} ${product.subcategory || ''}`);
  return GIFT_REJECT.some((word) => blob.includes(fold(word))) || roleOf(product) === 'rechazo';
}

function detectThemeFromNote(note) {
  const text = fold(note);
  if (!text) return null;
  if (/auricular|headset|headphone/.test(text)) return THEMES.find((t) => t.id === 'pack_auriculares');
  if (/mochila|backpack/.test(text)) return THEMES.find((t) => t.id === 'pack_mochilas');
  if (/termo|botella|thermos|pendrive/.test(text)) return THEMES.find((t) => t.id === 'pack_pendrives');
  if (/parlante|speaker|jbl/.test(text)) return THEMES.find((t) => t.id === 'pack_parlantes');
  if (/mouse|teclado|periferic/.test(text)) return THEMES.find((t) => t.id === 'pack_perifericos');
  if (/mixto|kit|oficina/.test(text)) return THEMES.find((t) => t.id === 'pack_mixto');
  if (/regalo|empresarial|fin de a|cantidad|300|400|volumen|cotiz/.test(text)) {
    return THEMES.find((t) => t.id === 'regalos_empresariales');
  }
  return null;
}

function resolvePack(theme, note) {
  if (theme && theme.packId) {
    return PACKS.find((p) => p.id === theme.packId) || PACKS[0];
  }
  const fromNote = detectThemeFromNote(note);
  if (fromNote && fromNote.packId) {
    return PACKS.find((p) => p.id === fromNote.packId) || PACKS[0];
  }
  // Rotar pack del día para “Regalos empresariales” genérico
  const day = new Date().getDate();
  return PACKS[day % PACKS.length];
}

async function gatherSignals() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [salesAgg, topSearch, stockCount] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $nin: ['cancelled', 'anulada'] } } },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            name: {
              $ifNull: [
                '$items.productSnapshot.name',
                { $ifNull: ['$items.description', 'Producto'] }
              ]
            }
          },
          qty: { $sum: { $ifNull: ['$items.quantity', 1] } }
        }
      },
      { $sort: { qty: -1 } },
      { $limit: 8 }
    ]).catch(() => []),
    SearchDailyStat.aggregate([
      { $match: { date: { $gte: since.toISOString().slice(0, 10) } } },
      { $group: { _id: '$query', count: { $sum: '$count' } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]).catch(() => []),
    Product.countDocuments({ stock: { $gt: 0 } }).catch(() => 0)
  ]);

  return {
    salesTop: (salesAgg || []).map((row) => ({ name: row._id && row._id.name, qty: row.qty })),
    viewsTop: [],
    searches: (topSearch || []).map((row) => ({ query: row._id, count: row.count })),
    stockCount,
    note: 'Meta Ads → WhatsApp (CONTACT). Esta campaña busca cotizaciones B2B de volumen.'
  };
}

function mapProduct(product, role) {
  const sell = Number(product.sellingPrice) || Number(product.price) || 0;
  const images = Array.isArray(product.productImage) ? product.productImage.filter(Boolean) : [];
  return {
    productId: String(product._id),
    codigo: product.codigo || '',
    name: clip(product.productName, 72),
    shortName: clip(product.productName, 38),
    brand: product.brandName || '',
    price: sell,
    priceText: formatGs(sell),
    imageUrl: images[0] || '',
    role: role || roleOf(product),
    stock: Number(product.stock) || 0
  };
}

function nameKey(product) {
  return fold(product.productName || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(negro|blanco|azul|rojo|gris|black|white|rgb|wireless|cable)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(' ');
}

function scoreGift(p) {
  const price = Number(p.sellingPrice) || 0;
  const stock = Number(p.stock) || 0;
  const sweet = price >= 100000 && price <= 700000 ? 50 : 20;
  return sweet + Math.min(40, stock * 4);
}

async function queryGiftPool({ minPrice, maxPrice, nameRegex, roles }) {
  const query = {
    stock: { $gt: 0 },
    stockStatus: { $ne: 'out_of_stock' },
    'productImage.0': { $exists: true, $ne: '' },
    sellingPrice: { $gte: minPrice, $lte: maxPrice }
  };
  if (nameRegex) {
    query.productName = { $regex: nameRegex, $options: 'i' };
  }
  const docs = await Product.find(query)
    .select('codigo productName brandName category subcategory sellingPrice price productImage stock')
    .limit(400)
    .lean();
  return docs
    .filter((p) => !isRejected(p))
    .filter((p) => !roles || roles.includes(roleOf(p)))
    .sort((a, b) => scoreGift(b) - scoreGift(a));
}

function diversify(pool, limit, roleFallback) {
  const out = [];
  const seenId = new Set();
  const seenName = new Set();
  for (const p of pool) {
    const id = String(p._id);
    const key = nameKey(p);
    if (seenId.has(id) || seenName.has(key)) continue;
    seenId.add(id);
    seenName.add(key);
    out.push(mapProduct(p, roleFallback || roleOf(p)));
    if (out.length >= limit) break;
  }
  return out;
}

async function pickPackProducts(pack, { limit = 4 } = {}) {
  const min = Number(pack.minPrice) || 50000;
  const max = Number(pack.maxPrice) || 2000000;

  if (pack.mixed) {
    const roles = pack.roles || ['auricular', 'mouse', 'teclado', 'mochila'];
    const picked = [];
    for (const role of roles) {
      const regex = {
        auricular: 'auricular|headset|headphone',
        mouse: '\\bmouse\\b|rat[oó]n',
        teclado: 'teclado|keyboard',
        mochila: 'mochila|backpack|maletin',
        pendrive: 'pendrive',
        energia: 'power\\s*bank'
      }[role];
      const pool = await queryGiftPool({
        minPrice: min,
        maxPrice: max,
        nameRegex: regex
      });
      const hit = diversify(pool, 1, role)[0];
      if (hit) picked.push(hit);
      if (picked.length >= limit) break;
    }
    return picked;
  }

  if (pack.roles) {
    const regex = 'mouse|teclado|keyboard|rat[oó]n';
    const pool = await queryGiftPool({
      minPrice: min,
      maxPrice: max,
      nameRegex: regex,
      roles: pack.roles
    });
    return diversify(pool, limit);
  }

  const source = pack.match ? String(pack.match).replace(/^\/|\/[a-z]*$/g, '') : '';
  const pool = await queryGiftPool({
    minPrice: Math.min(min, 60000),
    maxPrice: max,
    nameRegex: source || undefined
  });
  return diversify(pool, limit, pack.role);
}

function fallbackCopy(pack, products) {
  const from = products.length
    ? Math.min(...products.map((p) => p.price || 0).filter(Boolean))
    : 0;
  return {
    title: pack.title,
    hook: pack.hook,
    brief: `Flyer B2B limpio: pack ${pack.label}, ${products.length} opciones reales, CTA volumen ${pack.qtyHint}.`,
    caption: [
      `${pack.title} · regalos empresariales`,
      '',
      pack.hook,
      '',
      ...products.map((item) => `· ${item.name} — desde ${item.priceText}`),
      '',
      from ? `Desde ${formatGs(from)} / unidad (según modelo y cantidad).` : '',
      `Volúmenes típicos: ${pack.qtyHint}.`,
      '',
      'Escribinos por WhatsApp y te armamos la cotización.',
      '0973 345 284 · Zenn · Asunción',
      '',
      '#regalosempresariales #paraguay #asuncion #zenn #findeaño'
    ].filter(Boolean).join('\n'),
    cta: pack.cta,
    why: 'Fin de año: empresas buscan packs cerrados (auriculares, mochilas, termos…) en 100–400 piezas.'
  };
}

async function aiCopy(pack, products, note) {
  if (!communityAiReady()) return fallbackCopy(pack, products);
  const prompt = `Sos vendedor B2B de Zenn Electrónicos (Asunción).
Campaña: regalos empresariales de FIN DE AÑO en Paraguay.
Las empresas piden PACKS EN CANTIDAD (100, 300, 400 piezas): a veces TODO auriculares, a veces TODO mochilas, a veces termos.
NO es venta unitaria al consumidor. El copy tiene que hacer que escriban por WhatsApp a cotizar volumen.

Pack: ${pack.label}
Pedido del usuario: ${note || 'ninguno'}
Opciones reales del stock:
${products.map((item, i) => `${i + 1}. ${item.name} · desde ${item.priceText}`).join('\n')}

Prohibido: "imperdible", "aprovechá", "nuevo ingreso", tono de catálogo gamer.
JSON solo:
{"title":"máx 4 palabras, nombre del pack","hook":"frase de volumen / fin de año","caption":"IG con salto de línea","cta":"máx 4 palabras","why":"por qué cotizan ahora"}`;
  try {
    const raw = await askGeminiText(prompt);
    const parsed = parseJson(raw);
    const base = fallbackCopy(pack, products);
    if (!parsed || !parsed.title) return base;
    return {
      title: clip(parsed.title, 36) || base.title,
      hook: clip(parsed.hook || base.hook, 140),
      brief: base.brief,
      caption: String(parsed.caption || base.caption).slice(0, 1200),
      cta: clip(parsed.cta || base.cta, 32),
      why: clip(parsed.why || base.why, 220)
    };
  } catch {
    return fallbackCopy(pack, products);
  }
}

/**
 * Plantilla fija tipo retail B2B — limpia, legible, vende cotización.
 * Nada de fondo rojo, papeles rotos ni “dirección de arte” IA.
 */
function packFlyerHtml(campaign, { logo, photos }) {
  const items = (campaign.products || []).slice(0, 4);
  const from = items.length
    ? Math.min(...items.map((p) => Number(p.price) || 0).filter(Boolean))
    : 0;
  const rows = items.map((item, index) => `
    <div class="row">
      <div class="shot">
        <img id="product-${index + 1}" src="${photos[index] || ''}" alt="" />
      </div>
      <div class="info">
        <div class="brand">${esc(item.brand || campaign.packLabel || '')}</div>
        <div class="name">${esc(item.shortName || clip(item.name, 42))}</div>
        <div class="price">desde ${esc(item.priceText || '')}</div>
      </div>
    </div>`).join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=IBM+Plex+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${SIZE.w}px;height:${SIZE.h}px;overflow:hidden;background:#fff}
  body{-webkit-font-smoothing:antialiased}
  .art{
    width:${SIZE.w}px;height:${SIZE.h}px;display:flex;flex-direction:column;
    background:#FFFFFF;color:#0F172A;font-family:"IBM Plex Sans",Helvetica,sans-serif;
  }
  .topbar{
    height:10px;background:#2563EB;
  }
  .head{
    padding:28px 48px 0;display:flex;justify-content:space-between;align-items:center;
  }
  .logo{height:52px;width:auto}
  .wa{font-size:20px;font-weight:700;color:#334155}
  .badge{
    margin:22px 48px 0;display:inline-block;
    font-family:Montserrat,sans-serif;font-size:15px;font-weight:800;
    letter-spacing:.12em;text-transform:uppercase;color:#2563EB;
    border:2px solid #2563EB;padding:8px 14px;
  }
  h1{
    margin:16px 48px 0;font-family:Montserrat,sans-serif;
    font-size:58px;line-height:1.02;font-weight:800;letter-spacing:-.03em;max-width:920px;
  }
  .hook{
    margin:14px 48px 0;font-size:26px;line-height:1.35;color:#334155;max-width:900px;font-weight:600;
  }
  .qty{
    margin:18px 48px 0;font-family:Montserrat,sans-serif;font-size:22px;font-weight:800;color:#0F172A;
  }
  .from{
    margin:6px 48px 0;font-size:28px;font-weight:700;color:#2563EB;
  }
  .list{
    flex:1;min-height:0;margin:22px 40px 0;display:flex;flex-direction:column;gap:12px;
  }
  .row{
    flex:1;min-height:0;display:grid;grid-template-columns:220px 1fr;gap:18px;
    align-items:center;background:#F8FAFC;border:1px solid #E2E8F0;padding:10px 18px 10px 10px;
  }
  .shot{
    height:100%;min-height:120px;display:flex;align-items:center;justify-content:center;background:#fff;
  }
  .shot img{max-width:100%;max-height:160px;object-fit:contain}
  .brand{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B}
  .name{margin-top:4px;font-size:24px;font-weight:700;line-height:1.15}
  .price{margin-top:8px;font-size:26px;font-weight:800;color:#0F172A}
  .foot{
    margin-top:auto;background:#0F172A;color:#F8FAFC;
    padding:28px 48px;display:flex;justify-content:space-between;align-items:center;gap:16px;
  }
  .cta{font-family:Montserrat,sans-serif;font-size:32px;font-weight:800}
  .foot-sub{font-size:20px;font-weight:600;opacity:.92;text-align:right}
</style>
</head>
<body>
  <div class="art">
    <div class="topbar"></div>
    <div class="head">
      <img class="logo" src="${logo}" alt=""/>
      <span class="wa">0973 345 284</span>
    </div>
    <div class="badge">Regalos empresariales · fin de año</div>
    <h1>${esc(clip(campaign.title, 36))}</h1>
    <p class="hook">${esc(clip(campaign.hook, 140))}</p>
    <div class="qty">${esc(campaign.qtyHint || '100 · 300 · 400 unidades')}</div>
    ${from ? `<div class="from">Desde ${esc(formatGs(from))} / unidad</div>` : ''}
    <div class="list">${rows}</div>
    <div class="foot">
      <div class="cta">${esc(clip(campaign.cta || 'Cotizá por WhatsApp', 34))}</div>
      <div class="foot-sub">WhatsApp<br/>Zenn · Asunción</div>
    </div>
  </div>
</body>
</html>`;
}

async function renderCampaignPng(html) {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: SIZE.w, height: SIZE.h, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 90000 });
    await page.evaluate(async () => {
      const imgs = [...document.images];
      await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      }))));
    });
    return await page.screenshot({ type: 'png' });
  } finally {
    await page.close().catch(() => {});
  }
}

async function uploadIfPossible(buffer) {
  try {
    const { uploadJpeg } = require('./socialPublishService');
    if (typeof uploadJpeg === 'function') {
      return uploadJpeg(buffer, `campaign-pack-${Date.now()}`);
    }
  } catch { /* data URL */ }
  return '';
}

async function buildCampaignArt(draft) {
  const products = draft.products || [];
  const photos = await Promise.all(products.map((item) => getCutoutDataUri(item.imageUrl)));
  if (!photos.some(Boolean)) {
    throw new Error('No se pudieron cargar las fotos de los productos.');
  }
  const logo = await getCommunityLogoLight();
  // Siempre plantilla fija. Claude no diseña el flyer de campañas B2B.
  const html = packFlyerHtml(draft, { logo, photos });
  const png = await renderCampaignPng(html);
  let mediaUrl = await uploadIfPossible(png);
  if (!mediaUrl) mediaUrl = `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
  return { mediaUrl, html, source: 'pack-template' };
}

async function composeCampaign({ note = '', themeId = '' } = {}) {
  const signals = await gatherSignals();
  const theme = THEMES.find((item) => item.id === themeId)
    || detectThemeFromNote(note)
    || THEMES[0];
  const pack = resolvePack(theme, note);
  const products = await pickPackProducts(pack, { limit: 4 });
  if (products.length < 2) {
    const error = new Error(
      `No hay stock suficiente para “${pack.label}”. Probá otro pack (auriculares, mochilas, periféricos…).`
    );
    error.statusCode = 400;
    throw error;
  }

  const copy = await aiCopy(pack, products, note);
  const draft = {
    key: `${pack.id}-${todayKey()}`,
    themeId: pack.id,
    themeLabel: pack.label,
    packId: pack.id,
    packLabel: pack.label,
    qtyHint: pack.qtyHint,
    planDate: todayKey(),
    note: String(note || '').trim(),
    title: copy.title,
    hook: copy.hook,
    brief: copy.brief,
    caption: copy.caption,
    cta: copy.cta,
    audience: theme.audience || 'Compras corporativas',
    why: copy.why,
    signals: {
      stockCount: signals.stockCount,
      searches: (signals.searches || []).slice(0, 5),
      salesTop: (signals.salesTop || []).slice(0, 5),
      pack: pack.id
    },
    products,
    status: 'ready'
  };

  try {
    const art = await buildCampaignArt(draft);
    draft.mediaUrl = art.mediaUrl;
    draft.artSource = art.source;
  } catch (error) {
    console.error('[campaign] render', error.message || error);
    draft.mediaUrl = '';
    draft.artError = error.message || 'No se pudo renderizar el flyer';
  }

  const saved = await MarketingCampaign.findOneAndUpdate(
    { key: draft.key },
    { $set: draft },
    { upsert: true, new: true }
  );
  return saved.toObject();
}

async function listCampaigns({ limit = 20 } = {}) {
  return MarketingCampaign.find({})
    .sort({ updatedAt: -1 })
    .limit(Math.min(50, Number(limit) || 20))
    .lean();
}

async function listThemes() {
  return [
    {
      id: 'regalos_empresariales',
      label: 'Regalos empresariales (auto)',
      audience: 'Rota packs del día',
      hookSeed: 'Fin de año: cotizá packs en cantidad.'
    },
    ...PACKS.map((pack) => ({
      id: pack.id,
      label: pack.label,
      audience: 'Compras · volumen 100–400',
      hookSeed: pack.hook
    }))
  ];
}

module.exports = {
  THEMES,
  PACKS,
  gatherSignals,
  composeCampaign,
  listCampaigns,
  listThemes,
  campaignHtml: (campaign) => packFlyerHtml(campaign, { logo: '', photos: [] })
};
