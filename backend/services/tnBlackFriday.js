'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const Product = require('../models/productModel');
const SocialPost = require('../models/socialPostModel');
const { NARANJA, campaignOn, dateKeyOf } = require('./storeCampaign');
const { buildCreativePayload, formatGs } = require('./creativePayload');
const { uploadBufferToR2 } = require('./r2StorageService');

const ASSETS = {
  story: path.join(__dirname, '../assets/tn-bf-story.png'),
  feed: path.join(__dirname, '../assets/tn-bf-feed.jpg'),
  square: path.join(__dirname, '../assets/tn-bf-square.png')
};

const PER_POST = 9;
const MIN_SELL = 200000;
const MAX_SELL = 4500000;
const FEED_PLAN = [
  { slot: 'feed-1', time: '08:00' },
  { slot: 'feed-2', time: '09:15' },
  { slot: 'feed-3', time: '10:30' },
  { slot: 'reel', time: '11:20' },
  { slot: 'feed-4', time: '12:30' },
  { slot: 'feed-5', time: '14:00' },
  { slot: 'imagen', time: '15:10' },
  { slot: 'feed-6', time: '16:20' },
  { slot: 'feed-7', time: '17:40' },
  { slot: 'dato', time: '19:00' },
  { slot: 'feed-8', time: '20:20' }
];
const STORY_TIMES = ['08:45', '12:00', '16:00', '20:00'];
const OPENER = 'Este 27 de noviembre aprovechá los beneficios que tenemos para vos en Tienda Naranja.';
const REINTEGRO = 'El reintegro de Tienda Naranja es solo el 27 de noviembre. Los descuentos y las mejoras de precio ya están disponibles en Tienda Naranja.';
const TERMS = 'El 27 de noviembre: 20% de reintegro con tarjeta de crédito Itaú, tope Gs. 500.000. 25% con Amex Platinum o Visa Infinite, tope Gs. 700.000. Hasta 18 cuotas sin interés.';
const PDF_PATH = path.join(__dirname, '../../tienda-naranja/black-friday-26-27.pdf');

function zonedParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Asuncion',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function atAsuncion(dateKey, hhmm) {
  const [hour, minute] = hhmm.split(':').map(Number);
  let utc = Date.UTC(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(5, 7)) - 1,
    Number(dateKey.slice(8, 10)),
    hour + 3,
    minute
  );
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = zonedParts(new Date(utc));
    const got = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
    const want = `${dateKey} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    if (got === want) return new Date(utc);
    const gotMs = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`);
    const wantMs = Date.parse(`${want.replace(' ', 'T')}:00Z`);
    utc += wantMs - gotMs;
  }
  return new Date(utc);
}

function addDays(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function offerOf(product) {
  const list = Number(product && product.price) || 0;
  const sell = Number(product && product.sellingPrice) || 0;
  if (list <= sell || sell <= 0) return null;
  const discountPercent = Math.round(((list - sell) / list) * 100);
  if (discountPercent < 1) return null;
  return { list, sell, discountPercent };
}

function blocked(product) {
  const sub = String(product.subcategory || '');
  const name = String(product.productName || '');
  if (/^cpu_/i.test(sub)) return true;
  if (/^procesador\b/i.test(name)) return true;
  if (/yoga 260|latitude 54|chromebook|celeron|pentium|atom\b|gt\s?1030|gtx\s?7[35]0|gt\s?710|r7[\s-]?240|geforce gt(?!x)|quadro|2gb geforce|1gb geforce/i.test(name)) return true;
  return /cartuchos_toners|camaras_de_vigilancia|cctv_|impresoras_termicas|impresoras_matriciales|lector_de_codigo|cables_de_red|hub__|router_y_repetidor|herramientas__|impresoras_3d/i.test(sub);
}

function familyOf(subcategory) {
  const sub = String(subcategory || '');
  if (/gabinete/i.test(sub)) return { key: 'gabinete', label: 'gabinetes', appeal: 100 };
  if (/monitor/i.test(sub)) return { key: 'monitor', label: 'monitores', appeal: 96 };
  if (/memoria_ram|ssd|disco_duro/i.test(sub)) return { key: 'disco', label: 'discos y memoria', appeal: 66 };
  if (/notebook/i.test(sub)) return { key: 'notebook', label: 'notebooks', appeal: 94 };
  if (/silla/i.test(sub)) return { key: 'silla', label: 'sillas', appeal: 93 };
  if (/consola/i.test(sub)) return { key: 'consola', label: 'consolas', appeal: 92 };
  if (/auricular|headset/i.test(sub)) return { key: 'audio', label: 'auriculares', appeal: 90 };
  if (/tarjetas_graficas/i.test(sub)) return { key: 'gpu', label: 'placas de video', appeal: 88 };
  if (/mousepad/i.test(sub)) return { key: 'pad', label: 'mousepads', appeal: 58 };
  if (/^mouse__/i.test(sub)) return { key: 'mouse', label: 'mouses', appeal: 82 };
  if (/teclado/i.test(sub)) return { key: 'teclado', label: 'teclados', appeal: 84 };
  if (/tablet|smartphone|smartwatch|reloj_inteligente|pulsera/i.test(sub)) return { key: 'movil', label: 'celulares y tablets', appeal: 82 };
  if (/speaker|soundbar|home_theater/i.test(sub)) return { key: 'parlante', label: 'parlantes', appeal: 78 };
  if (/water_cooler/i.test(sub)) return { key: 'cooler', label: 'coolers', appeal: 76 };
  if (/mini_pc/i.test(sub)) return { key: 'mini', label: 'mini PC', appeal: 74 };
  if (/microfono|placa_captura|controles/i.test(sub)) return { key: 'stream', label: 'streaming', appeal: 70 };
  if (/placa_madre|placas_madre/i.test(sub)) return { key: 'mother', label: 'placas madre', appeal: 64 };
  if (/fuente/i.test(sub)) return { key: 'fuente', label: 'fuentes', appeal: 60 };
  if (/cooler_para_cpu/i.test(sub)) return { key: 'fan', label: 'coolers', appeal: 54 };
  if (/aire_acondicionado|electrodomest/i.test(sub)) return { key: 'casa', label: 'hogar', appeal: 62 };
  return { key: '', label: '', appeal: 0 };
}

function takeCarousel(pool, used, start) {
  const fresh = pool.filter((item) => !used.has(item.id));
  const byKey = new Map();
  for (const item of fresh) {
    if (!byKey.has(item.family)) byKey.set(item.family, []);
    byKey.get(item.family).push(item);
  }
  const keys = [...byKey.keys()];
  if (!keys.length) return [];
  const picked = [];
  let cursor = 0;
  let idle = 0;
  while (picked.length < PER_POST && idle < keys.length) {
    const key = keys[(start + cursor) % keys.length];
    const next = (byKey.get(key) || []).find((item) => !picked.includes(item));
    cursor += 1;
    if (!next) {
      idle += 1;
      continue;
    }
    idle = 0;
    picked.push(next);
  }
  return picked;
}

function splitPool(pool, days) {
  const byKey = new Map();
  for (const item of pool) {
    if (!byKey.has(item.family)) byKey.set(item.family, []);
    byKey.get(item.family).push(item);
  }
  const parts = Array.from({ length: Math.max(1, days) }, () => []);
  for (const list of byKey.values()) {
    list.forEach((item, index) => parts[index % parts.length].push(item));
  }
  return parts.map((list) => list.sort((a, b) => b.appeal - a.appeal || b.discountPercent - a.discountPercent));
}

async function rankedOnTn() {
  const products = await Product.find({
    'tiendaNaranja.onTn': true,
    stock: { $gt: 0 },
    sellingPrice: { $gte: MIN_SELL, $lte: MAX_SELL },
    price: { $gt: 0 },
    'productImage.0': { $exists: true, $ne: '' }
  }).select('productName brandName category subcategory sellingPrice price codigo').lean();
  return products
    .map((product) => {
      if (blocked(product)) return null;
      const offer = offerOf(product);
      const family = familyOf(product.subcategory);
      if (!offer || !family.appeal) return null;
      const sweet = offer.sell >= 250000 && offer.sell <= 2800000 ? 12 : 0;
      const discount = Math.min(offer.discountPercent, 35) / 8;
      return {
        ...product,
        id: String(product._id),
        ...offer,
        family: family.key,
        familyLabel: family.label,
        appeal: family.appeal + sweet + discount
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.appeal - a.appeal || b.discountPercent - a.discountPercent);
}

async function jpegOf(file, width, height) {
  return sharp(file).resize(width, height, { fit: 'fill' }).jpeg({ quality: 90 }).toBuffer();
}

async function flyerUrl(kind) {
  const file = kind === 'story' ? ASSETS.story : ASSETS.feed;
  if (!fs.existsSync(file)) return '';
  const width = kind === 'story' ? 1080 : 1080;
  const height = kind === 'story' ? 1920 : 1350;
  const jpeg = file.endsWith('.jpg') && kind !== 'story'
    ? fs.readFileSync(file)
    : await jpegOf(file, width, height);
  const key = `social/tn-black-friday/${kind}.jpg`;
  return uploadBufferToR2(jpeg, key, {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=86400'
  });
}

function linesOf(payloads) {
  return payloads.map((payload) => `−${payload.discountPercent}% ${payload.title || payload.productName} · antes ${payload.listPrice} · ahora ${payload.price}`);
}

function captionFor(payloads) {
  const list = Array.isArray(payloads) ? payloads : [payloads];
  return [
    OPENER,
    '',
    REINTEGRO,
    '',
    'Deslizá. La primera foto es la promo y después van los productos con el precio que ya está en Tienda Naranja.',
    '',
    ...linesOf(list),
    '',
    TERMS,
    '',
    'Solo en tiendanaranja.com.py, tienda Zenn.',
    '',
    'WhatsApp 0973 345 284',
    '',
    '#BlackFriday #TiendaNaranja #Zenn #Paraguay'
  ].join('\n');
}

function headlineFor(products) {
  const labels = [];
  for (const product of products) {
    if (product.familyLabel && !labels.includes(product.familyLabel)) labels.push(product.familyLabel);
    if (labels.length === 3) break;
  }
  return `Black Friday · ${labels.join(', ')}`.slice(0, 140);
}

function openerCaption() {
  return [
    OPENER,
    '',
    REINTEGRO,
    '',
    'En un rato salen gabinetes, monitores, notebooks y más, con el precio de antes, el de ahora y el descuento. Esos precios ya están en Tienda Naranja.',
    '',
    TERMS,
    '',
    'Solo en tiendanaranja.com.py, tienda Zenn.',
    '',
    'WhatsApp 0973 345 284',
    '',
    '#BlackFriday #TiendaNaranja #Zenn #Paraguay'
  ].join('\n');
}

async function writePdf(days) {
  fs.mkdirSync(path.dirname(PDF_PATH), { recursive: true });
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const out = fs.createWriteStream(PDF_PATH);
  doc.pipe(out);
  doc.fontSize(22).text('Black Friday · Tienda Naranja', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#333').text('El reintegro de Tienda Naranja es solo el 27 de noviembre de 2026. Los descuentos y las mejoras de precio ya están disponibles en Tienda Naranja. La primera historia del día y la primera foto de cada publicación es el flyer. Después van solo productos que ya están en Tienda Naranja y tienen descuento. El precio es Zenn + 10%.');
  doc.moveDown(0.4);
  doc.fontSize(11).text(NARANJA.lead);
  if (fs.existsSync(ASSETS.feed)) {
    doc.addPage();
    doc.fontSize(14).fillColor('#000').text('Flyer de publicación (1080×1350). Sale primero en cada post.');
    doc.image(ASSETS.feed, 70, 80, { fit: [450, 560], align: 'center' });
  }
  if (fs.existsSync(ASSETS.story)) {
    doc.addPage();
    doc.fontSize(14).text('Flyer de historia (1080×1920). Primera historia del día.');
    doc.image(ASSETS.story, 150, 70, { fit: [280, 500] });
  }
  for (const day of days) {
    doc.addPage();
    doc.fontSize(16).fillColor('#000').text(day.dateKey, { continued: false });
    doc.moveDown(0.4);
    doc.fontSize(11);
    day.products.forEach((product, index) => {
      const line = product.discountPercent
        ? `${index + 1}. −${product.discountPercent}%  ${product.productName}`
        : `${index + 1}. ${product.productName}`;
      doc.fillColor('#111').text(line, { width: 520 });
      doc.fillColor('#444').text(`Antes ${formatGs(Math.round(product.list * 1.1))} · ahora ${formatGs(Math.round(product.sell * 1.1))} en Tienda Naranja · ${product.brandName || ''}`, { width: 520 });
      doc.moveDown(0.35);
    });
  }
  doc.end();
  await new Promise((resolve, reject) => {
    out.on('finish', resolve);
    out.on('error', reject);
  });
  return PDF_PATH;
}

async function ensureBlackFridayPosts(today) {
  const start = dateKeyOf(today || new Date());
  if (start > NARANJA.to) return { created: 0, pdf: '' };
  const from = start > NARANJA.from ? start : NARANJA.from;
  const ranked = await rankedOnTn();
  const days = [];
  let created = 0;
  let storyUrl = '';
  try {
    storyUrl = await flyerUrl('story');
  } catch (error) {
    console.error('[tn bf] flyer historia', error.message || error);
  }

  const dateKeys = [];
  let cursorKey = from;
  while (cursorKey <= NARANJA.to) {
    if (campaignOn(cursorKey)) dateKeys.push(cursorKey);
    cursorKey = addDays(cursorKey, 1);
  }
  const dayPools = splitPool(ranked, dateKeys.length);
  const perDay = FEED_PLAN.length;

  for (let dayIndex = 0; dayIndex < dateKeys.length; dayIndex += 1) {
    const cursor = dateKeys[dayIndex];
    const dayBatches = [];
    const used = new Set();
    for (let index = 0; index < perDay; index += 1) {
      const batch = takeCarousel(dayPools[dayIndex] || [], used, index);
      if (batch.length < 6) break;
      batch.forEach((item) => used.add(item.id));
      dayBatches.push(batch);
    }
    const fresh = await SocialPost.countDocuments({
      origin: 'community',
      planDate: cursor,
      kind: 'feed',
      status: 'scheduled',
      reason: /^carrusel-v2/
    });
    if (fresh >= dayBatches.length && dayBatches.length) {
      days.push({ dateKey: cursor, products: dayBatches.flat() });
      continue;
    }
    await SocialPost.updateMany(
      {
        origin: 'community',
        planDate: cursor,
        status: { $in: ['scheduled', 'idea'] }
      },
      { $set: { status: 'cancelled', reason: 'Reemplazado por carrusel Black Friday' } }
    );
    const products = dayBatches.flat();
    days.push({ dateKey: cursor, products });

    const openerWhen = atAsuncion(cursor, '07:30');
    if (openerWhen.getTime() >= Date.now() + 10 * 60 * 1000) {
      await SocialPost.create({
        productIds: [],
        titles: ['Black Friday Tienda Naranja'],
        mediaUrls: storyUrl ? [storyUrl] : [],
        kind: 'story',
        caption: openerCaption(),
        showPrice: false,
        scene: 'naranja',
        origin: 'community',
        planDate: cursor,
        slot: 'story-bf',
        headline: 'Black Friday Tienda Naranja',
        reason: 'Primera historia del día. El flyer de Itaú, antes de los productos.',
        subcategoryLabel: 'Tienda Naranja',
        status: storyUrl ? 'scheduled' : 'idea',
        scheduledAt: openerWhen
      });
      created += 1;
    }

    for (let index = 0; index < dayBatches.length; index += 1) {
      const batch = dayBatches[index];
      const plan = FEED_PLAN[index];
      const when = atAsuncion(cursor, plan.time);
      if (when.getTime() < Date.now() + 10 * 60 * 1000) continue;
      const payloads = batch.map((product) => buildCreativePayload(product, { when: cursor, scene: 'naranja' }));
      await SocialPost.create({
        productIds: batch.map((product) => product.id),
        titles: batch.map((product) => product.productName),
        kind: 'feed',
        caption: captionFor(payloads),
        showPrice: true,
        scene: 'naranja',
        origin: 'community',
        planDate: cursor,
        slot: plan.slot,
        headline: headlineFor(batch),
        reason: `carrusel-v2 · flyer de Itaú y ${batch.length} productos en Tienda Naranja.`,
        subcategoryLabel: headlineFor(batch),
        status: 'scheduled',
        scheduledAt: when
      });
      created += 1;
    }

    const storyProducts = products.filter((product) => ['gabinete', 'monitor', 'notebook', 'silla', 'audio'].includes(product.family)).slice(0, STORY_TIMES.length);
    for (let index = 0; index < storyProducts.length; index += 1) {
      const product = storyProducts[index];
      const when = atAsuncion(cursor, STORY_TIMES[index]);
      if (when.getTime() < Date.now() + 10 * 60 * 1000) continue;
      const payload = buildCreativePayload(product, { when: cursor, scene: 'naranja' });
      await SocialPost.create({
        productIds: [product.id],
        titles: [product.productName],
        kind: 'story',
        caption: captionFor([payload]),
        showPrice: true,
        scene: 'naranja',
        origin: 'community',
        planDate: cursor,
        slot: `story-${index + 1}`,
        headline: payload.title || product.productName,
        reason: `Historia de ${product.familyLabel}. −${payload.discountPercent}% en Tienda Naranja.`,
        subcategory: product.subcategory || '',
        subcategoryLabel: product.familyLabel || '',
        status: 'scheduled',
        scheduledAt: when
      });
      created += 1;
    }
  }

  let pdf = '';
  try {
    pdf = await writePdf(days);
  } catch (error) {
    console.error('[tn bf] pdf', error.message || error);
  }
  return { created, pdf, days: days.map((day) => ({ date: day.dateKey, products: day.products.length })) };
}

module.exports = {
  ensureBlackFridayPosts,
  flyerUrl,
  rankedOnTn,
  ASSETS
};
