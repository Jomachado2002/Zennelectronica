'use strict';

const sharp = require('sharp');
const Product = require('../models/productModel');
const { getSharedBrowser } = require('../helpers/sharedChrome');
const { formatGs, isOctoberRosa } = require('./creativePayload');
const { getCommunityLogoLight, getCommunityLogoDark, getCutoutDataUri } = require('./creativeImage');
const { uploadJpeg } = require('./socialPublishService');
const { revisePieceHtml, designPieceHtml, claudeReady, steerTemplate } = require('./communityAi');

const SIZE = { w: 1080, h: 1350 };
const WEEK = ['precio', 'encuesta', 'dato', 'presupuesto', 'meme', 'novedad', 'pregunta'];

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function br(value) {
  return esc(value).replace(/\n/g, '<br>');
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '').trim()}…`;
}

function weekdayOf(dateKey) {
  if (!dateKey) return new Date().getDay();
  const [year, month, day] = String(dateKey).split('-').map(Number);
  if (!year || !month || !day) return new Date().getDay();
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function offerOf(item) {
  const list = Number(item && item.price) || 0;
  const sell = Number(item && item.sellingPrice) || 0;
  if (list <= sell || sell <= 0) return null;
  const discountPercent = Math.round((list - sell) / list * 100);
  if (discountPercent < 1) return null;
  return { list, sell, discountPercent };
}

function priceText(item) {
  const off = offerOf(item);
  return formatGs(off ? off.sell : item.sellingPrice);
}

function tagOf(label) {
  return String(label || 'zenn')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24) || 'zenn';
}

function voice(label) {
  const text = String(label || '').toLowerCase();
  if (/teclad/.test(text)) {
    return { title: 'El RGB no te hace pro.', sub: 'El switch, sí.', ask: '¿Mecánico o membrana?' };
  }
  if (/monitor|pantalla/.test(text)) {
    return { title: 'Tu ojo sí nota\nlos hercios.', sub: 'El brillo no. La fluidez sí.', ask: '¿Jugás o trabajás en esa pantalla?' };
  }
  if (/mouse|rat[oó]n/.test(text)) {
    return { title: 'No es el DPI\ndel sticker.', sub: 'Es el que no se te escapa.', ask: '¿A qué le errás más, al mouse o al día?' };
  }
  if (/auricular|headset/.test(text)) {
    return { title: 'El mic del celu\nse escucha.', sub: 'Este no.', ask: '¿Jugás con el micrófono abierto?' };
  }
  if (/micr[oó]fono/.test(text)) {
    return { title: 'Si te piden\nque repitas,', sub: 'el problema no eras vos.', ask: '¿Grabás o solo hablás?' };
  }
  if (/notebook|laptop/.test(text)) {
    return { title: 'La facu no pide\nla más cara.', sub: 'Pide la que no se cuelga.', ask: '¿Para qué usás tu notebook?' };
  }
  if (/celular|smartphone|iphone/.test(text)) {
    return { title: 'De día cualquiera\nse ve bien.', sub: 'La prueba es la cámara de noche.', ask: '¿Qué le sacás, de día o de noche?' };
  }
  return { title: 'No es el más caro.', sub: 'Es el que te cierra.', ask: '¿Para qué lo usarías?' };
}

function factLine(item, label) {
  const name = `${item && item.productName || ''} ${label || ''}`.toLowerCase();
  const hz = name.match(/(\d{2,3})\s?hz/i);
  if (hz) {
    return { big: `${hz[1]}Hz`, line: 'es cuántas veces por segundo se dibuja la imagen. Por eso el juego se siente fluido.' };
  }
  const gpu = name.match(/\b(rtx\s?\d{3,4}|gtx\s?\d{3,4}|rx\s?\d{3,4})\b/i);
  if (gpu) {
    return { big: gpu[1].toUpperCase().replace(/\s+/, ' '), line: 'Si jugás, la placa importa. Si es solo para clase, no hace falta esta.' };
  }
  const inches = name.match(/(\d{2})\s?(?:"|pulg|''|”)/i);
  if (inches && /monitor|pantalla/.test(name)) {
    return { big: `${inches[1]}"`, line: 'El tamaño se elige por la distancia. De cerca, sobra. De lejos, falta.' };
  }
  if (/teclad/.test(name)) {
    return { big: 'Switch', line: 'El RGB se apaga. El switch es lo que se queda en los dedos.' };
  }
  if (/micr[oó]fono|auricular|headset/.test(name)) {
    return { big: 'Voz', line: 'Si te piden que repitas, el problema no eras vos.' };
  }
  const said = voice(label);
  return { big: said.title.split('\n')[0], line: said.sub };
}

function pickHero(items) {
  if (!items.length) return null;
  return items[Math.min(items.length - 1, Math.round((items.length - 1) * 0.62))];
}

function pickPoll(items) {
  const byBrand = new Map();
  for (const item of items) {
    const brand = String(item.brandName || '').trim();
    if (brand.length < 2) continue;
    if (!byBrand.has(brand)) byBrand.set(brand, []);
    byBrand.get(brand).push(item);
  }
  const brands = [...byBrand.values()].sort((a, b) => b.length - a.length);
  if (brands.length < 2) return [pickHero(items)].filter(Boolean);
  const mid = (list) => list[Math.floor(list.length / 2)];
  return [mid(brands[0]), mid(brands[1])];
}

function pickBudget(items) {
  const sorted = items.slice().sort((a, b) => Number(a.sellingPrice) - Number(b.sellingPrice));
  if (sorted.length <= 3) return sorted;
  const step = (sorted.length - 1) / 2;
  return [0, 1, 2].map((index) => sorted[Math.round(index * step)]);
}

function layoutFor(kind, day, label) {
  const text = String(label || '').toLowerCase();
  if (kind === 'dato') return 'fact';
  if (kind === 'reel') return day === 5 ? 'question' : 'poster';
  if (day === 4 && /teclad/.test(text)) return 'desk';
  return ['perday', 'poll', 'fact', 'budget', 'poster', 'poster', 'question'][day] || 'poster';
}

function page(body, css) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,700&family=Outfit:wght@500;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${SIZE.w}px; height: ${SIZE.h}px; overflow: hidden; }
  body { -webkit-font-smoothing: antialiased; }
  img { display: block; }
  .logo { height: 44px; width: auto; }
  .cut {
    object-fit: contain;
    filter: drop-shadow(0 28px 22px rgba(20,16,12,.28));
  }
  ${css || ''}
</style>
</head>
<body>${body}</body>
</html>`;
}

function mark(light) {
  if (!isOctoberRosa()) return '';
  const color = light ? '#9D174D' : '#F9A8D4';
  return `<span style="letter-spacing:.16em;font-size:13px;font-weight:700;text-transform:uppercase;color:${color};font-family:Outfit,sans-serif;">Octubre Rosa</span>`;
}

function isDark(hex) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return false;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 100;
}

function toneOf(background, fallback) {
  const field = /^#[0-9A-Fa-f]{6}$/.test(String(background || '')) ? background : fallback;
  const dark = isDark(field);
  return { field, ink: dark ? '#F4EFE6' : '#1A120C', dark };
}

function posterHtml({ logo, line, item, photo, tone }) {
  const color = tone || toneOf('', '#F25C2A');
  return page(`
    <div data-canvas="1" style="width:${SIZE.w}px;height:${SIZE.h}px;position:relative;overflow:hidden;background:${color.field};color:${color.ink};font-family:Fraunces,Georgia,serif;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:36px 44px 0;">
        <img class="logo" src="${esc(logo)}" alt="Zenn">
        ${mark(!color.dark)}
      </div>
      <h1 style="padding:28px 48px 0;font-size:78px;line-height:.92;font-weight:700;letter-spacing:-.03em;max-width:980px;">${br(line.title)}</h1>
      <p style="padding:16px 48px 0;font-family:Outfit,sans-serif;font-size:28px;font-weight:500;max-width:820px;">${esc(line.sub)}</p>
      <img id="product-1" class="cut" src="${esc(photo)}" alt="" style="position:absolute;left:20px;right:20px;bottom:88px;width:${SIZE.w - 40}px;height:760px;">
      <div style="position:absolute;left:48px;right:48px;bottom:36px;display:flex;justify-content:space-between;font-family:Outfit,sans-serif;font-size:22px;font-weight:700;">
        <span>${esc(clip(item.productName, 46))}</span><span>${esc(priceText(item))}</span>
      </div>
    </div>`, '');
}

function deskHtml({ logo, items, photos, tone }) {
  const color = tone || toneOf('', '#E7D7C3');
  const phrases = ['Acá se escribe', 'Acá se juega'];
  const rows = items.slice(0, 2).map((item, index) => `
    <div style="flex:1;min-height:0;position:relative;">
      <img id="product-${index + 1}" class="cut" src="${esc(photos[index])}" alt="" style="width:100%;height:86%;object-fit:contain;">
      <p style="position:absolute;left:8px;bottom:0;font-family:Outfit,sans-serif;font-size:22px;font-weight:700;">${phrases[index] || ''} · ${esc(priceText(item))}</p>
    </div>`).join('');
  return page(`
    <div data-canvas="1" style="width:${SIZE.w}px;height:${SIZE.h}px;background:${color.field};color:${color.ink};position:relative;overflow:hidden;padding:36px 40px 28px;display:flex;flex-direction:column;font-family:Fraunces,Georgia,serif;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <img class="logo" src="${esc(logo)}" alt="Zenn">${mark(!color.dark)}
      </div>
      <h1 style="margin-top:18px;font-size:64px;line-height:.95;font-weight:700;max-width:900px;">El setup no es la foto.</h1>
      <p style="margin-top:8px;font-family:Outfit,sans-serif;font-size:26px;">¿Qué no puede faltar en el tuyo?</p>
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;margin-top:12px;">${rows}</div>
    </div>`, '');
}

function pollHtml({ logo, items, photos, ask, tone }) {
  const color = tone || toneOf('', '#1F4F4A');
  const halves = items.slice(0, 2).map((item, index) => {
    const dark = index === 1;
    const field = dark ? (color.dark ? color.field : '#1F4F4A') : '#F3EBDD';
    const ink = dark ? '#F6F1E8' : '#1A120C';
    return `
      <div data-canvas="${dark ? '1' : '0'}" style="flex:1;min-height:0;position:relative;background:${field};color:${ink};">
        <img id="product-${index + 1}" class="cut" src="${esc(photos[index])}" alt="" style="position:absolute;left:24px;right:24px;top:70px;width:calc(100% - 48px);height:78%;">
        <p style="position:absolute;left:36px;bottom:36px;font-family:Outfit,sans-serif;font-size:26px;font-weight:700;">${esc(item.brandName || '')}<br>${esc(priceText(item))}</p>
      </div>`;
  }).join('');
  return page(`
    <div style="width:${SIZE.w}px;height:${SIZE.h}px;display:flex;flex-direction:column;overflow:hidden;">
      <div style="height:210px;background:#F3EBDD;color:#1A120C;padding:32px 40px 0;font-family:Fraunces,Georgia,serif;">
        <div style="display:flex;justify-content:space-between;"><img class="logo" src="${esc(logo)}" alt="Zenn">${mark(true)}</div>
        <h1 style="margin-top:14px;font-size:54px;line-height:1;font-weight:700;">¿Cuál te llevás?</h1>
        <p style="margin-top:6px;font-family:Outfit,sans-serif;font-size:22px;">${esc(ask)}</p>
      </div>
      <div style="flex:1;display:flex;min-height:0;">${halves}</div>
    </div>`, '');
}

function factHtml({ logo, item, photo, fact, tone }) {
  const color = tone || toneOf('', '#E6F25A');
  return page(`
    <div data-canvas="1" style="width:${SIZE.w}px;height:${SIZE.h}px;position:relative;overflow:hidden;background:${color.field};color:${color.ink};font-family:Outfit,sans-serif;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:32px 40px 0;position:relative;z-index:2;">
        <img class="logo" src="${esc(logo)}" alt="Zenn">${mark(!color.dark)}
      </div>
      <p style="position:absolute;left:36px;right:36px;top:150px;font-family:Fraunces,Georgia,serif;font-size:150px;line-height:.85;font-weight:700;letter-spacing:-.04em;color:${color.ink};">${esc(fact.big)}</p>
      <img id="product-1" class="cut" src="${esc(photo)}" alt="" style="position:absolute;left:30px;right:30px;bottom:150px;width:${SIZE.w - 60}px;height:700px;z-index:2;">
      <p style="position:absolute;left:44px;right:44px;bottom:48px;z-index:3;font-size:28px;font-weight:500;max-width:900px;">${esc(fact.line)}</p>
    </div>`, '');
}

function questionHtml({ logo, line, item, photo, tone }) {
  const color = tone || toneOf('', '#1C3144');
  return page(`
    <div data-canvas="1" style="width:${SIZE.w}px;height:${SIZE.h}px;position:relative;overflow:hidden;background:${color.field};color:${color.dark ? '#F4EFE6' : '#1A120C'};">
      <img id="product-1" class="cut" src="${esc(photo)}" alt="" style="position:absolute;left:0;right:0;bottom:0;width:${SIZE.w}px;height:980px;">
      <div style="position:absolute;left:36px;top:36px;right:36px;z-index:3;background:#F4EFE6;color:#1A120C;padding:28px 32px 24px;font-family:Fraunces,Georgia,serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <img class="logo" src="${esc(logo)}" alt="Zenn">${mark(true)}
        </div>
        <h1 style="margin-top:16px;font-size:52px;line-height:1;font-weight:700;">${esc(line.ask)}</h1>
      </div>
    </div>`, '');
}

function budgetHtml({ logo, items, photos, tone }) {
  const color = tone || toneOf('', '#F7F1E8');
  const top = Math.max(...items.map((item) => Number(item.sellingPrice) || 0));
  const cols = items.map((item, index) => `
    <div style="flex:1;min-height:0;position:relative;">
      <img id="product-${index + 1}" class="cut" src="${esc(photos[index])}" alt="" style="width:100%;height:100%;object-fit:contain;">
    </div>`).join('');
  return page(`
    <div data-canvas="1" style="width:${SIZE.w}px;height:${SIZE.h}px;background:${color.field};color:${color.ink};display:flex;flex-direction:column;padding:32px 28px 24px;font-family:Fraunces,Georgia,serif;">
      <div style="display:flex;justify-content:space-between;"><img class="logo" src="${esc(logo)}" alt="Zenn">${mark(!color.dark)}</div>
      <h1 style="margin-top:12px;font-size:48px;line-height:1;font-weight:700;">Ninguno pasa de ${esc(formatGs(top))}.</h1>
      <div style="flex:1;min-height:0;display:flex;gap:8px;margin-top:12px;">${cols}</div>
    </div>`, '');
}

function perDayHtml({ logo, item, photo, tone }) {
  const color = tone || toneOf('', '#F6F1E8');
  const sell = Number(item.sellingPrice) || 0;
  const perDay = Math.max(1, Math.round(sell / (365 * 3)));
  return page(`
    <div data-canvas="1" style="width:${SIZE.w}px;height:${SIZE.h}px;position:relative;overflow:hidden;background:${color.field};color:${color.ink};font-family:Fraunces,Georgia,serif;">
      <div style="display:flex;justify-content:space-between;padding:32px 40px 0;"><img class="logo" src="${esc(logo)}" alt="Zenn">${mark(!color.dark)}</div>
      <h1 style="padding:20px 44px 0;font-size:64px;line-height:.95;font-weight:700;">${esc(formatGs(perDay))} por día.</h1>
      <p style="padding:10px 44px 0;font-family:Outfit,sans-serif;font-size:26px;">${esc(formatGs(sell))} en 3 años. Un café sale Gs. 15.000.</p>
      <img id="product-1" class="cut" src="${esc(photo)}" alt="" style="position:absolute;left:40px;right:40px;bottom:40px;width:${SIZE.w - 80}px;height:820px;">
    </div>`, '');
}

function buildHtml({ layout, logoInk, logoWhite, line, items, photos, background }) {
  const fallback = {
    desk: '#E7D7C3',
    poll: '#1F4F4A',
    fact: '#E6F25A',
    question: '#1C3144',
    budget: '#F7F1E8',
    perday: '#F6F1E8',
    poster: '#F25C2A'
  }[layout] || '#F25C2A';
  const tone = toneOf(background, fallback);
  const logo = tone.dark ? logoWhite : logoInk;
  const item = items[0];
  const photo = photos[0];
  if (layout === 'desk') return deskHtml({ logo, items, photos, tone });
  if (layout === 'poll' && items.length >= 2) return pollHtml({ logo, items, photos, ask: line.ask, tone });
  if (layout === 'fact') return factHtml({ logo, item, photo, fact: factLine(item, line.label), tone });
  if (layout === 'question') return questionHtml({ logo, line, item, photo, tone });
  if (layout === 'budget' && items.length >= 2) return budgetHtml({ logo, items, photos, tone });
  if (layout === 'perday') return perDayHtml({ logo, item, photo, tone });
  return posterHtml({ logo, line, item, photo, tone });
}

function copyFor({ layout, line, items, label, time }) {
  const names = items.map((item) => `${clip(item.productName, 64)}: ${priceText(item)}`);
  let headline = line.title.replace(/\n/g, ' ');
  let subhead = line.sub;
  if (layout === 'desk') {
    headline = 'El setup no es la foto.';
    subhead = 'Es lo que usás cuando nadie te mira.';
  } else if (layout === 'poll') {
    headline = '¿Cuál te llevás?';
    subhead = line.ask;
  } else if (layout === 'fact') {
    const fact = factLine(items[0], label);
    headline = fact.big;
    subhead = fact.line;
  } else if (layout === 'question') {
    headline = line.ask;
    subhead = 'Contanos. Mañana te respondemos con lo que hay en la tienda.';
  } else if (layout === 'budget') {
    headline = `Tres. Y ninguno pasa de ${formatGs(Math.max(...items.map((item) => Number(item.sellingPrice) || 0)))}.`;
    subhead = label;
  } else if (layout === 'perday') {
    headline = 'Una forma distinta de mirar el precio.';
    subhead = 'El producto, por día, al lado de un café.';
  }
  const ask = layout === 'question' || layout === 'poll' || layout === 'desk'
    ? line.ask
    : '¿Lo usarías? Dejá el comentario.';
  const caption = [
    headline,
    '',
    subhead,
    '',
    ask,
    '',
    names.join('\n'),
    '',
    'Zenn, Asunción. WhatsApp 0973 345 284',
    '',
    `#${tagOf(label)} #zenn #paraguay #asuncion`
  ].join('\n');
  const sticker = layout === 'poll'
    ? 'Al subir la historia, agregá la encuesta con las dos marcas.'
    : layout === 'question'
      ? 'Al subir la historia, agregá el sticker de pregunta. Las respuestas se contestan al día siguiente.'
      : 'Si la publicás como historia, el sticker de enlace va al subirla.';
  const brief = [
    `Ángulo de hoy: ${line.angle}.`,
    headline,
    subhead,
    'La foto del producto ya está sin fondo.',
    sticker,
    `Si la autorizás, sale a las ${time} en Instagram y Facebook.`
  ].join('\n');
  return { headline: clip(headline, 120), subhead: clip(subhead, 180), caption, brief };
}

async function loadPool({ items, subcategory }) {
  if (items && items.length) return items;
  if (!subcategory) return [];
  const docs = await Product.find({
    subcategory,
    stock: { $gt: 0 },
    sellingPrice: { $gt: 0 },
    'productImage.0': { $exists: true, $ne: '' }
  }).select('productName brandName sellingPrice price productImage').lean();
  return docs.map((doc) => ({ ...doc, id: String(doc._id) }));
}

async function bestImage(urls) {
  const list = (urls || []).filter(Boolean).slice(0, 3);
  if (list.length < 2) return list[0] || '';
  let best = list[0];
  let bestScore = -1;
  for (const url of list) {
    const uri = await getCutoutDataUri(url);
    if (!uri || !uri.includes(',')) continue;
    const buf = Buffer.from(uri.split(',')[1], 'base64');
    const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let clear = 0;
    const total = info.width * info.height || 1;
    for (let i = 3; i < data.length; i += info.channels) {
      if (data[i] < 16) clear += 1;
    }
    const ratio = clear / total;
    const score = ratio > 0.05 && ratio < 0.92 ? ratio : 0;
    if (score > bestScore) {
      bestScore = score;
      best = url;
    }
  }
  return best;
}

async function withPhotos(items) {
  const ids = items.map((item) => String(item.id || item._id)).filter(Boolean);
  if (!ids.length) return [];
  const docs = await Product.find({ _id: { $in: ids } })
    .select('productName brandName sellingPrice price productImage subcategory')
    .lean();
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  const rows = [];
  for (const id of ids) {
    const doc = byId.get(id);
    const urls = doc && Array.isArray(doc.productImage) ? doc.productImage.filter(Boolean) : [];
    const image = await bestImage(urls);
    if (!doc || !image) continue;
    rows.push({ ...doc, id, image });
  }
  return rows;
}

async function productByLink(note) {
  const text = String(note || '');
  const keys = [
    ...[...text.matchAll(/producto\/([A-Za-z0-9_-]+)/g)].map((match) => match[1]),
    ...[...text.matchAll(/\b[a-f0-9]{24}\b/gi)].map((match) => match[0])
  ];
  const unique = [...new Set(keys)];
  if (!unique.length) return null;
  const select = 'productName brandName sellingPrice price productImage subcategory slug stock';
  for (const key of unique) {
    let doc = null;
    if (/^[a-f0-9]{24}$/i.test(key)) {
      doc = await Product.findById(key).select(select).lean();
    }
    if (!doc) doc = await Product.findOne({ slug: key }).select(select).lean();
    const urls = doc && Array.isArray(doc.productImage) ? doc.productImage.filter(Boolean) : [];
    if (!urls.length) continue;
    const image = await bestImage(urls);
    if (!image) continue;
    return { ...doc, id: String(doc._id), image };
  }
  const error = new Error('Ese link no coincide con un producto con foto en la tienda.');
  error.statusCode = 400;
  throw error;
}

async function findMouse(exclude) {
  const skip = new Set((exclude || []).map(String));
  const docs = await Product.find({
    subcategory: 'mouse__30_03',
    stock: { $gt: 0 },
    sellingPrice: { $gt: 120000 },
    productName: /gamer/i,
    'productImage.0': { $exists: true, $ne: '' }
  }).select('productName brandName sellingPrice price productImage').sort({ sellingPrice: 1 }).limit(30).lean();
  const fresh = docs.filter((doc) => !skip.has(String(doc._id)));
  if (!fresh.length) return null;
  const doc = fresh[Math.min(fresh.length - 1, Math.round((fresh.length - 1) * 0.45))];
  const image = Array.isArray(doc.productImage) ? doc.productImage.find(Boolean) : '';
  if (!image) return null;
  return { ...doc, id: String(doc._id), image };
}

function fieldColor(html) {
  const text = String(html || '');
  const marked = text.match(/data-canvas="1"[^>]*background(?:-color)?:\s*(#[0-9A-Fa-f]{6})/i);
  if (marked) return marked[1];
  const body = text.match(/(?:html|body)[^{]*\{[^}]*background(?:-color)?:\s*(#[0-9A-Fa-f]{6})/i);
  if (body) return body[1];
  const found = text.match(/background(?:-color)?:\s*(#[0-9A-Fa-f]{6})/i);
  return found ? found[1] : '';
}

async function logoFor(html) {
  return isDark(fieldColor(html)) ? getCommunityLogoDark() : getCommunityLogoLight();
}

function fillHtml(html, tokens) {
  const filled = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/src\s*=\s*(["'])https?:[^"']+\1/gi, 'src=""')
    .replace(/\{\{(\w+)\}\}/g, (_, key) => tokens[key] || '');
  const css = 'img.logo{background:transparent!important;box-shadow:none!important;border:0!important;height:72px;width:auto;object-fit:contain;display:block;}';
  if (filled.includes('</head>')) return filled.replace('</head>', `<style>${css}</style></head>`);
  return filled;
}

async function renderPng(html) {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: SIZE.w, height: SIZE.h, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await Promise.race([
      page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await Promise.all(Array.from(document.images).map((img) => new Promise((resolve) => {
          if (img.complete) resolve();
          else img.onload = img.onerror = () => resolve();
        })));
      }),
      new Promise((resolve) => setTimeout(resolve, 8000))
    ]);
    const png = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: SIZE.w, height: SIZE.h },
      omitBackground: false
    });
    return sharp(png).resize(SIZE.w, SIZE.h).png().toBuffer();
  } finally {
    try { await page.close(); } catch { /* ignore */ }
  }
}

const THEMES = [
  { frame: '#1f1a17', sheet: '#f3ebdd', ink: '#1a120c', accent: '#c4552a' },
  { frame: '#f4f1ea', sheet: '#f7f6f3', ink: '#161616', accent: '#1f6b4a' },
  { frame: '#111111', sheet: '#f4f1ea', ink: '#161616', accent: '#111111' },
  { frame: '#e23d2b', sheet: '#f6f1e8', ink: '#1a120c', accent: '#e23d2b' },
  { frame: '#ff4b1f', sheet: '#f4efe6', ink: '#16120e', accent: '#ff4b1f' },
  { frame: '#143d32', sheet: '#f3f6f2', ink: '#10241c', accent: '#143d32' },
  { frame: '#1b2430', sheet: '#f4f6f8', ink: '#141820', accent: '#2f5d9f' }
];

function layoutFromHtml(html) {
  const text = String(html || '');
  if (text.includes('El setup no es la foto.')) return 'desk';
  if (text.includes('¿Cuál te llevás?')) return 'poll';
  if (text.includes('Ninguno pasa de')) return 'budget';
  if (text.includes('por día.')) return 'perday';
  if (text.includes('height:980px')) return 'question';
  if (/font-size:150px|font-size:210px/.test(text)) return 'fact';
  if (text.includes('data-canvas')) return 'poster';
  return '';
}

const FIELD_CYCLE = ['#F25C2A', '#E6F25A', '#1C3144', '#E7D7C3', '#1F4F4A', '#161616', '#3B2463'];
const COLOR_WORDS = [
  ['naranja', '#F25C2A'],
  ['amarillo', '#E6F25A'],
  ['azul', '#1C3144'],
  ['marino', '#1C3144'],
  ['arena', '#E7D7C3'],
  ['verde', '#1F4F4A'],
  ['negro', '#161616'],
  ['crema', '#F6F1E8'],
  ['rosa', '#E7A0B8'],
  ['violeta', '#3B2463'],
  ['bordo', '#6B1D3A']
];

function plain(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function readAsk(note) {
  const text = plain(note);
  const hex = text.match(/#([0-9a-f]{6})/);
  let background = hex ? `#${hex[1]}` : '';
  if (!background) {
    const named = COLOR_WORDS.find(([name]) => text.includes(name));
    if (named) background = named[1];
  }
  const swap = /otro (micro|producto|modelo|teclado|mouse|raton|auricular|monitor)|no se borra|no borra|mal recort|recorte|busca otro|cambia(r)? el (micro|producto|teclado|mouse)/.test(text);
  const recolor = Boolean(background) || /otro color|cambia(r)? (el )?(color|fondo)|otro fondo|fondo distinto/.test(text);
  return { background, swap, recolor };
}

function nextField(html) {
  const current = (String(html || '').match(/data-canvas="1"[^>]*background:(#[0-9A-Fa-f]{6})/i) || [])[1] || '';
  const index = FIELD_CYCLE.findIndex((color) => color.toLowerCase() === current.toLowerCase());
  return FIELD_CYCLE[(index + 1) % FIELD_CYCLE.length];
}

function idsToDrop(productIds, titles, note) {
  const text = plain(note);
  const rules = [
    [/micro/, /micr/i],
    [/teclad/, /teclad/i],
    [/mouse|raton/, /mouse|rat[oó]n/i],
    [/auricular|headset/, /auricular|headset/i],
    [/monitor|pantalla/, /monitor|pantalla/i]
  ];
  const rule = rules.find(([hint]) => hint.test(text));
  const ids = (productIds || []).map(String);
  if (!rule || ids.length < 2) return ids;
  const matched = ids.filter((id, index) => rule[1].test(titles[index] || ''));
  return matched.length ? matched : ids;
}

async function composeSuggestion({
  kind = 'imagen',
  label = '',
  items = null,
  subcategory = '',
  time = '',
  planDate = '',
  intent = '',
  lockIds = null,
  excludeIds = null,
  background = '',
  layoutName = '',
  brief = '',
  angle = '',
  title = ''
} = {}) {
  const day = weekdayOf(planDate);
  const skip = new Set((excludeIds || []).map(String));
  const pool = (await loadPool({ items, subcategory }))
    .filter((item) => item && (item.id || item._id) && Number(item.sellingPrice) > 0)
    .filter((item) => !skip.has(String(item.id || item._id)))
    .sort((a, b) => Number(a.sellingPrice) - Number(b.sellingPrice));
  let layout = layoutName || layoutFor(kind, day, label);
  if (!layoutName && intent === 'vga' && kind === 'imagen') layout = 'fact';
  let chosen = [];
  const locked = (lockIds || []).map(String).filter(Boolean);
  if (locked.length) {
    chosen = await withPhotos(locked.map((id) => ({ id })));
  }
  if (!chosen.length) {
    if (layout === 'poll') chosen = pickPoll(pool);
    else if (layout === 'budget') chosen = pickBudget(pool);
    else chosen = [pickHero(pool)].filter(Boolean);
    chosen = await withPhotos(chosen);
  }
  const needsMate = layout === 'desk' || ((layout === 'poll' || layout === 'budget') && chosen.length < 2);
  if (needsMate && chosen.length < (layout === 'budget' ? 3 : 2)) {
    const mouse = layout === 'desk'
      ? await findMouse(chosen.map((item) => item.id).concat([...skip]))
      : null;
    if (mouse) chosen.push(mouse);
    else if (layout === 'desk' && chosen.length < 2) layout = 'poster';
    else if (layout !== 'desk') {
      const have = new Set(chosen.map((item) => item.id));
      const extra = pool.find((item) => !have.has(String(item.id || item._id)));
      if (extra) {
        const [photo] = await withPhotos([extra]);
        if (photo) chosen.push(photo);
      }
    }
  }
  if (layout === 'poll' && chosen.length < 2) layout = 'poster';
  if (layout === 'budget' && chosen.length < 2) layout = 'poster';
  if (!chosen.length) {
    return {
      headline: voice(label).title.replace(/\n/g, ' '),
      subhead: voice(label).sub,
      caption: '',
      brief: '',
      reason: 'Hoy no había foto para armar la pieza.',
      productIds: [],
      titles: [],
      mediaUrl: ''
    };
  }
  const line = { ...voice(label), angle: WEEK[day], label, kicker: WEEK[day] };
  const copy = copyFor({ layout, line, items: chosen, label, time });
  const art = {
    ...copy,
    reason: 'Hoy la pieza no es un catálogo: está para que la gente comente. Si la autorizás, sale a esta hora.',
    productIds: chosen.map((item) => item.id),
    titles: chosen.map((item) => clip(item.productName, 80)),
    mediaUrl: ''
  };
  const photos = await Promise.all(chosen.map((item) => getCutoutDataUri(item.image)));
  if (!photos[0]) return art;
  const [logoWhite, logoInk] = await Promise.all([getCommunityLogoDark(), getCommunityLogoLight()]);
  let html = '';
  if (claudeReady()) {
    try {
      const designed = await designPieceHtml({
        dateLabel: planDate,
        angle: angle || line.angle,
        brief,
        title,
        kind,
        products: chosen.map((item) => ({ name: item.productName, priceText: priceText(item) }))
      });
      if (designed) {
        const tokens = { logo: await logoFor(designed) };
        chosen.forEach((item, index) => {
          tokens[`product${index + 1}`] = photos[index] || '';
          tokens[`name${index + 1}`] = esc(clip(item.productName, 80));
          tokens[`price${index + 1}`] = esc(priceText(item));
        });
        const filled = /<html/i.test(designed) ? fillHtml(designed, tokens) : page(fillHtml(designed, tokens), '');
        if (!hasWhitePlate(filled) && filled.includes('data:image')) {
          html = filled;
          art.source = 'claude';
        }
      }
    } catch (error) {
      console.error('[community ai] claude', error.message || error);
    }
  }
  if (!html) html = buildHtml({ layout, logoInk, logoWhite, line, items: chosen, photos, background });
  if (!art.source) art.source = 'local';
  art.html = html;
  const png = await renderPng(html);
  art.mediaUrl = await uploadJpeg(png, `comunidad-${layout}-${Date.now()}`);
  return art;
}

function maskHtml(html) {
  return String(html || '')
    .replace(/(<img\b[^>]*class="logo"[^>]*src=")data:image[^"]+(")/gi, '$1{{logo}}$2')
    .replace(/(<img\b[^>]*src=")data:image[^"]+("[^>]*class="logo")/gi, '$1{{logo}}$2')
    .replace(/(<img\b[^>]*id="product-(\d+)"[^>]*src=")data:image[^"]+(")/gi, (_, pre, number, post) => `${pre}{{product${number}}}${post}`);
}

function hasWhitePlate(html) {
  return /background\s*:\s*(#fff\b|#ffffff\b|white\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/i.test(html);
}

async function reviseSuggestion(doc, { note = '', background = '', swap = false, time = '' } = {}) {
  if (doc.kind === 'reel') {
    const error = new Error('El reel no se modifica desde acá. Es la guía para grabarlo.');
    error.statusCode = 400;
    throw error;
  }
  if (!claudeReady()) {
    const error = new Error('Falta la clave de Claude. Sin eso no se modifica el HTML.');
    error.statusCode = 400;
    throw error;
  }
  const ask = readAsk(`${note} ${background}`);
  const wantsSwap = Boolean(swap) || ask.swap;
  const color = /^#[0-9A-Fa-f]{6}$/.test(String(background || '')) ? background : ask.background;
  if (!String(note || '').trim() && !color && !wantsSwap) {
    const error = new Error('Decime qué hay que cambiar del HTML.');
    error.statusCode = 400;
    throw error;
  }
  const ids = (doc.productIds || []).map(String);
  const linked = await productByLink(note);
  const productChanged = Boolean(linked) || wantsSwap;
  const drop = wantsSwap ? idsToDrop(ids, doc.titles || [], `${note} ${background}`) : [];
  const keep = wantsSwap ? ids.filter((id) => !drop.includes(id)) : ids;
  let chosen = [];
  if (linked) {
    chosen = [linked];
  } else if (keep.length) chosen = await withPhotos(keep.map((id) => ({ id })));
  if (!linked && wantsSwap && chosen.length < Math.max(1, ids.length)) {
    const pool = (await loadPool({ subcategory: doc.subcategory }))
      .filter((item) => !drop.includes(String(item.id || item._id)) && !chosen.some((picked) => picked.id === String(item.id)));
    const next = pickHero(pool);
    if (!next && !chosen.length) {
      const error = new Error('En ese rubro no hay otro producto con foto.');
      error.statusCode = 400;
      throw error;
    }
    if (next) {
      const [photo] = await withPhotos([next]);
      if (photo) chosen.push(photo);
    }
  }
  if (!chosen.length) {
    const error = new Error('Esa pieza no tiene un producto para rearmar.');
    error.statusCode = 400;
    throw error;
  }
  const photos = await Promise.all(chosen.map((item) => getCutoutDataUri(item.image)));
  if (!photos[0]) {
    const error = new Error('No se pudo recortar la foto del producto.');
    error.statusCode = 500;
    throw error;
  }
  const logoInk = await getCommunityLogoLight();
  const logoWhite = await getCommunityLogoDark();
  const named = COLOR_WORDS.find(([, hex]) => hex.toLowerCase() === String(color || '').toLowerCase());
  const wantsTemplate = /plantilla|otro dise|otra pieza|rehac|otra grafica|otro estilo|otro formato/.test(plain(note));
  const steered = wantsTemplate
    ? await steerTemplate(note, chosen.map((item) => ({ name: item.productName })))
    : null;
  const instruction = [
    String(note || '').trim(),
    steered && steered.angle ? `Nueva plantilla: ${steered.angle}` : '',
    steered && steered.brief ? steered.brief : '',
    color ? `El fondo tiene que ser ${named ? named[0] : color}. Cambiá la tipografía para que no quede la misma pieza.` : '',
    wantsSwap || linked
      ? 'El producto cambió. Reescribí el nombre y el precio con los datos nuevos. La foto nueva entra en {{product1}}.'
      : 'No cambies el producto ni el precio.'
  ].filter(Boolean).join('\n');
  let masked = maskHtml(doc.creativeHtml);
  if (!masked.includes('{{product1}}') || masked.length > 120000) {
    const day = weekdayOf(doc.planDate);
    const layout = layoutFromHtml(doc.creativeHtml) || layoutFor(doc.kind, day, doc.subcategoryLabel);
    const line = { ...voice(doc.subcategoryLabel), angle: WEEK[day], label: doc.subcategoryLabel };
    masked = maskHtml(buildHtml({
      layout,
      logoInk,
      logoWhite,
      line,
      items: chosen,
      photos,
      background: color
    }));
  }
  const html = await revisePieceHtml({
    html: masked,
    note: instruction,
    products: chosen.map((item) => ({ name: item.productName, price: priceText(item) }))
  });
  if (!html) {
    const error = new Error('Claude no devolvió una pieza usable. Pedila de nuevo, sin fondo blanco.');
    error.statusCode = 502;
    throw error;
  }
  const tokens = { logo: await logoFor(html) };
  chosen.forEach((item, index) => {
    tokens[`product${index + 1}`] = photos[index] || '';
    tokens[`name${index + 1}`] = esc(clip(item.productName, 80));
    tokens[`price${index + 1}`] = esc(priceText(item));
  });
  const filled = /<html/i.test(html) ? fillHtml(html, tokens) : page(fillHtml(html, tokens), '');
  if (hasWhitePlate(filled)) {
    const error = new Error('Claude devolvió la pieza con fondo blanco. Pedile otro fondo.');
    error.statusCode = 502;
    throw error;
  }
  const png = await renderPng(filled);
  const mediaUrl = await uploadJpeg(png, `comunidad-revision-${Date.now()}`);
  const arrived = chosen.filter((item) => !ids.includes(item.id)).map((item) => clip(item.productName, 80));
  const lines = [
    note ? `Pediste: ${String(note).trim()}` : '',
    productChanged ? `Entró ${arrived.join(' · ') || 'otro producto'}.` : '',
    color ? `El fondo pasó a ${named ? named[0] : color}.` : '',
    'Claude reescribió el HTML de la pieza.'
  ].filter(Boolean);
  const changeNote = lines.join(' ');
  const day = weekdayOf(doc.planDate);
  const line = { ...voice(doc.subcategoryLabel), angle: WEEK[day], label: doc.subcategoryLabel };
  const copy = copyFor({
    layout: layoutFromHtml(filled) || layoutFor(doc.kind, day, doc.subcategoryLabel),
    line,
    items: chosen,
    label: doc.subcategoryLabel,
    time
  });
  return {
    html: filled,
    mediaUrl,
    headline: productChanged ? (linked ? clip(linked.productName, 80) : copy.headline) : (doc.headline || copy.headline),
    caption: productChanged ? copy.caption : (doc.caption || copy.caption),
    brief: [changeNote, doc.brief].filter(Boolean).join('\n\n'),
    reason: changeNote,
    productIds: productChanged ? chosen.map((item) => item.id) : ids,
    titles: productChanged ? chosen.map((item) => clip(item.productName, 80)) : (doc.titles || []),
    subcategory: linked ? linked.subcategory || '' : '',
    changeNote
  };
}

module.exports = { composeSuggestion, reviseSuggestion };
