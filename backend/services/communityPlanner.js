'use strict';

const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const SocialPost = require('../models/socialPostModel');
const CommunityDayFocus = require('../models/communityDayFocusModel');
const { communityCaption } = require('./captionComposer');
const { buildCreativePayload, formatGs, listSelectFields, isOctoberRosa } = require('./creativePayload');
const { focusedSchemaFor } = require('./creativeSpecFocus');
const { scoutMarket, chooseCatalogDay, communityAiReady, askDayOps, claudeReady } = require('./communityAi');
const { composeSuggestion, reviseSuggestion } = require('./communityGraphic');
const { matchTrends, dossierText, shelfCards } = require('./communitySignals');
const { accountPulse } = require('./communityAccount');

const ZONE = 'America/Asuncion';
const FEED_SIZE = 5;
const FEED_POSTS = 8;
const STORY_POSTS = 4;
const TREND_POSTS = 3;
const REPEAT_DAYS = 45;

const FEED_TIMES = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30'];
const STORY_TIMES = ['08:45', '12:00', '16:00', '20:00'];
const SUGGESTION_SLOTS = [
  { slot: 'reel', time: '10:15', kind: 'reel' },
  { slot: 'imagen', time: '13:15', kind: 'imagen' },
  { slot: 'dato', time: '19:15', kind: 'dato' }
];
const DAY_SLOTS = [
  ...FEED_TIMES.map((_, index) => `feed-${index + 1}`),
  ...STORY_TIMES.map((_, index) => `story-${index + 1}`),
  ...SUGGESTION_SLOTS.map((slot) => slot.slot)
];

function zonedParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function zonedDate(date = new Date()) {
  const parts = zonedParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDays(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function dayLabel(key) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 15));
  return new Intl.DateTimeFormat('es-PY', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date);
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

function plainLabel(value) {
  return String(value || '')
    .replace(/__\d+.*/, '')
    .replace(/_/g, ' ')
    .trim();
}

function hash(text) {
  return String(text || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function stem(token) {
  const word = String(token || '');
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
  return word;
}

function matchFocus(rows, focus) {
  const query = String(focus || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (query.length < 2) return null;
  const stems = query.split(' ').filter(Boolean).map(stem);
  let best = null;
  let bestScore = 0;
  for (const row of rows) {
    const blob = `${row.label || ''} ${row.key || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    let score = 0;
    if (blob.includes(query.replace(/ /g, ''))) score += 30;
    stems.forEach((token) => {
      if (token.length >= 2 && blob.includes(token)) score += token.length;
    });
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return bestScore >= 3 ? best : null;
}

function spokenLabel(label) {
  const text = String(label || 'esto').trim();
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function filmBrief({ label, titles, time }) {
  const name = spokenLabel(label || 'esto');
  const list = (titles || []).filter(Boolean);
  const material = list.length
    ? list.map((title, index) => `${index + 1}. ${title}`).join('\n')
    : `Dos ${name}: uno de entrada y uno caro, los que haya en la tienda.`;
  return [
    'Cómo grabarlo',
    'Vertical, 15 a 25 segundos. El producto en la mano o sobre la mesa. Sin flyer detrás.',
    '',
    'Material',
    material,
    'Alcanza el celular. Luz de frente. Mesa despejada.',
    '',
    'Qué decir',
    `Arranque: "Si esta semana vas a comprar ${name}, mirá esto antes de pagar."`,
    'Medio: mostrá el de entrada y el más caro. Decí el precio de Zenn, en guaraníes. No inventes un descuento.',
    'Cierre: "Está en Zenn, Asunción. WhatsApp 0973 345 284."',
    '',
    'En pantalla',
    'El nombre corto y el precio. Una idea por vez.',
    time ? `Cuando esté el video, cargalo en esta tarjeta. Sale a las ${time}.` : 'Cuando esté el video, cargalo en esta tarjeta.'
  ].join('\n');
}

async function labelMap() {
  const categories = await Category.find({ isActive: { $ne: false } })
    .select('subcategories.label subcategories.value subcategories.isActive')
    .lean();
  const map = new Map();
  for (const category of categories) {
    for (const sub of category.subcategories || []) {
      if (!sub || !sub.value || sub.isActive === false) continue;
      map.set(sub.value, sub.label || plainLabel(sub.value));
    }
  }
  return map;
}

function worldOf(key, label) {
  const blob = `${key || ''} ${label || ''}`.toLowerCase();
  if (/mochila|bolso|funda|silla|impresora|cable|adaptador|router|proyector|webcam|microfono|consola/.test(blob)) return 'otros';
  if (/iphone|celular|smartphone|tablet|ipad|reloj|watch/.test(blob)) return 'moviles';
  if (/mouse|teclado|auricular|headset|parlante|control/.test(blob)) return 'perifericos';
  if (/notebook|macbook|monitor|mini_pc|computadora|pc_montado|all_in_one/.test(blob)) return 'equipos';
  if (/cpu_|procesador|memoria|tarjeta|ssd|disco|placa|fuente|gabinete|cooler|water/.test(blob)) return 'componentes';
  return 'otros';
}

async function recentlyUsedIds() {
  const since = new Date(Date.now() - REPEAT_DAYS * 24 * 60 * 60 * 1000);
  const posts = await SocialPost.find({
    status: { $in: ['scheduled', 'publishing', 'published', 'idea', 'done'] },
    createdAt: { $gte: since }
  }).select('productIds').lean();
  const used = new Set();
  for (const post of posts) {
    for (const id of post.productIds || []) used.add(String(id));
  }
  return used;
}

async function subcategoryFreshness() {
  const posts = await SocialPost.find({
    origin: 'community',
    subcategory: { $ne: '' },
    status: { $nin: ['cancelled', 'failed'] }
  }).select('subcategory planDate').lean();
  const last = new Map();
  for (const post of posts) {
    const prev = last.get(post.subcategory) || '';
    if (post.planDate > prev) last.set(post.subcategory, post.planDate);
  }
  return last;
}

async function stockPool() {
  const products = await Product.find({
    stock: { $gt: 0 },
    sellingPrice: { $gt: 0 },
    'productImage.0': { $exists: true, $ne: '' }
  })
    .select('productName brandName category subcategory sellingPrice price graphicsCard graphicCardModel')
    .lean();
  return products.filter((product) => product.subcategory && product.productName);
}

function groupPool(products) {
  const groups = new Map();
  for (const product of products) {
    const item = { ...product, id: String(product._id) };
    if (!groups.has(product.subcategory)) groups.set(product.subcategory, []);
    groups.get(product.subcategory).push(item);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (Number(a.sellingPrice) || 0) - (Number(b.sellingPrice) || 0));
  }
  return groups;
}

function takeSpread(list, used, count) {
  const fresh = (list || []).filter((item) => !used.has(item.id));
  if (fresh.length <= count) return fresh;
  const picked = [];
  const seen = new Set();
  const step = (fresh.length - 1) / Math.max(1, count - 1);
  for (let index = 0; index < count; index += 1) {
    const item = fresh[Math.round(index * step)];
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    picked.push(item);
  }
  for (const item of fresh) {
    if (picked.length >= count) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    picked.push(item);
  }
  return picked;
}

function catalogRows(groups, labels, used) {
  return [...groups.entries()]
    .map(([key, list]) => {
      const label = labels.get(key) || plainLabel(key);
      return {
        key,
        label,
        world: worldOf(key, label),
        fresh: list.filter((item) => !used.has(item.id)).length,
        list
      };
    })
    .filter((row) => row.fresh > 0);
}

function byTurn(rows, freshness) {
  return rows.slice().sort((a, b) => {
    const left = freshness.get(a.key) || '';
    const right = freshness.get(b.key) || '';
    if (left !== right) return left < right ? -1 : 1;
    if (b.fresh !== a.fresh) return b.fresh - a.fresh;
    return a.label.localeCompare(b.label, 'es');
  });
}

function pickSpread(rows, freshness, count, minFresh, avoid) {
  const pool = byTurn(rows.filter((row) => row.fresh >= minFresh && !avoid.has(row.key)), freshness);
  const picked = [];
  const worlds = {};
  for (const row of pool) {
    if (picked.length >= count) break;
    if ((worlds[row.world] || 0) >= 2) continue;
    picked.push(row);
    worlds[row.world] = (worlds[row.world] || 0) + 1;
  }
  for (const row of pool) {
    if (picked.length >= count) break;
    if (picked.some((item) => item.key === row.key)) continue;
    picked.push(row);
  }
  return picked;
}

function priceSpan(products) {
  const prices = products.map((product) => Number(product.sellingPrice) || 0).filter((price) => price > 0);
  if (!prices.length) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return formatGs(min);
  return `${formatGs(min)} a ${formatGs(max)}`;
}

function saleIntro(row, products) {
  const span = priceSpan(products);
  const range = span ? ` En Zenn van de ${span}: está el de entrada y también el más caro.` : '';
  if (row && row.intent === 'vga') {
    return `Notebooks gamer con placa de video.${range}`;
  }
  const brand = row && row.trend && (row.trend.brands || [])[0];
  if (brand) return `${brand} en stock.${range}`;
  if (row && row.trend && row.trend.term) return `Si buscás ${row.trend.term}, está en Zenn.${range}`;
  return feedIntro(row && row.label, products, '');
}

function feedIntro(label, products, hook) {
  if (hook) return hook;
  const span = priceSpan(products);
  const name = spokenLabel(label);
  if ((products || []).length <= 1) return '';
  return span
    ? `${products.length} ${name} en stock en Zenn. Van de ${span}.`
    : `${products.length} ${name} en stock en Asunción.`;
}

function offerLines(items) {
  return (items || []).slice(0, 3).map((item) => {
    const off = offerOf(item);
    const name = clipName(item.productName || item.title || labelSafe(item));
    if (!off) return name;
    return `${name}: hoy ${formatGs(off.sell)}, antes ${formatGs(off.list)}, -${off.discountPercent}%`;
  });
}

function labelSafe(item) {
  return item.brandName || 'producto';
}

function suggestionPack(kind, label, time, offers, focus) {
  if (focus && focus.intent === 'vga') {
    const span = priceSpan(focus.list);
    const range = span ? ` El rango es ${span}.` : '';
    return {
      headline: 'Reel: notebook gamer con placa',
      brief: `Grabá el notebook gamer con placa de video más accesible y el más caro.${range} No muestres uno de oficina sin VGA. Cargá el video y sale a las ${time}.`,
      caption: `Notebook gamer con placa de video.\nEn Zenn hay de entrada y también el equipo de arriba.${span ? `\nVan de ${span}.` : ''}\n\nWhatsApp 0973 345 284\n\n#notebookgamer #rtx #paraguay #zenn #asuncion`
    };
  }
  const brand = focus && focus.trend && (focus.trend.brands || [])[0];
  if (brand && focus.list && focus.list.length) {
    const span = priceSpan(focus.list);
    return {
      headline: `Reel: ${brand} de entrada y el más caro`,
      brief: `Mostrá el ${brand} más accesible y el más completo.${span ? ` Van de ${span}.` : ''} La gente tiene que ver que hay de los dos. Cargalo y sale a las ${time}.`,
      caption: `${brand} en Zenn.${span ? ` Hay desde ${span}.` : ''}\nEl de entrada y el equipo grande están en stock.\n\nWhatsApp 0973 345 284\n\n#${String(brand).toLowerCase().replace(/[^a-z0-9]+/g, '')} #paraguay #zenn #asuncion`
    };
  }
  const lines = offerLines(offers);
  if (lines.length) {
    const body = lines.join('\n');
    if (kind === 'reel') {
      return {
        headline: `Reel de promociones: ${label}`,
        brief: [
          `Grabá un reel de las promociones de ${spokenLabel(label)} que sí están en la tienda.`,
          body,
          'En pantalla, el precio tachado y el de ahora. No inventes otro porcentaje.',
          'Cierre: Zenn, Asunción, 0973 345 284.',
          `Cuando esté el video, cargalo y sale a las ${time}.`
        ].join('\n'),
        caption: `Promociones de ${label} que están hoy en Zenn.\n\n${body}\n\nWhatsApp 0973 345 284\n\n#promociones #zenn #paraguay #asuncion`
      };
    }
    if (kind === 'imagen') {
      return {
        headline: `Imagen de la promo: ${label}`,
        brief: [
          `Crear una imagen de la promoción de ${spokenLabel(label)}.`,
          'Un solo producto, precio tachado grande y el precio de ahora.',
          lines[0],
          `Cargá la foto y se publica a las ${time}.`
        ].join('\n'),
        caption: `Promo de ${label} en Zenn.\n\n${lines[0]}\n\nWhatsApp 0973 345 284\n\n#promociones #zenn #paraguay #asuncion`
      };
    }
    return {
      headline: `Por qué esta promo de ${label}`,
      brief: [
        `Cosas que no sabías sobre esta promoción de ${spokenLabel(label)}.`,
        'El precio tachado es el anterior. El de ahora es el que se cobra.',
        body,
        `Cargalo y sale a las ${time}.`
      ].join('\n'),
      caption: `El precio tachado de ${label} es el anterior. Hoy se cobra el de la promo.\n\n${body}\n\nWhatsApp 0973 345 284\n\n#promociones #zenn #paraguay #asuncion`
    };
  }
  return suggestionPackPlain(kind, label, time);
}

function suggestionPackPlain(kind, label, time) {
  const name = spokenLabel(label);
  if (kind === 'reel') {
    return {
      headline: `Reel sobre ${label}`,
      brief: [
        `Grabá un reel de 15 a 20 segundos sobre ${name}.`,
        'Mostrá 3 productos distintos, del más barato al más caro.',
        'En pantalla, el precio en guaraníes y una sola spec.',
        `Primera frase, para alguien que no nos sigue: "Si esta semana vas a comprar ${name}, mirá esto antes."`,
        'Cierre: Zenn, Asunción, entrega en 24 horas, 0973 345 284.',
        `Cuando esté el video, cargalo en esta tarjeta y sale solo a las ${time}.`
      ].join('\n'),
      caption: `Si esta semana vas a comprar ${name}, mirá esto antes.\n\nZenn, Asunción. Entrega en 24 horas.\nWhatsApp 0973 345 284\n\n#${name.replace(/\s+/g, '')} #paraguay #zenn #asuncion`
    };
  }
  if (kind === 'imagen') {
    return {
      headline: `Crear una imagen sobre ${label}`,
      brief: [
        `Crear una imagen sobre ${name}.`,
        'Una pieza vertical, fondo limpio, 3 datos grandes que se lean sin sonido.',
        'Nada de párrafo. Que alguien que no nos sigue entienda el producto en un segundo.',
        `Cargá la foto en esta tarjeta y se publica a las ${time}.`
      ].join('\n'),
      caption: `${label} en una imagen.\n\nStock en Zenn, Asunción. Entrega en 24 horas.\nWhatsApp 0973 345 284\n\n#${name.replace(/\s+/g, '')} #paraguay #zenn #asuncion`
    };
  }
  return {
    headline: `Cosas que no sabías sobre ${label}`,
    brief: [
      `Cosas que no sabías sobre ${name}.`,
      'Armá una imagen o un reel corto con 3 datos que cambian la compra.',
      'Una idea por pantalla. Sin ficha técnica entera.',
      `Cargalo acá y sale a las ${time}.`
    ].join('\n'),
    caption: `Cosas que no sabías sobre ${name}.\n\nZenn, Asunción. WhatsApp 0973 345 284\n\n#${name.replace(/\s+/g, '')} #paraguay #zenn #asuncion`
  };
}

async function payloadsFor(ids) {
  const products = await Product.find({ _id: { $in: ids } }).select(listSelectFields()).lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const payloads = [];
  for (const id of ids) {
    const product = byId.get(String(id));
    if (!product) continue;
    payloads.push(buildCreativePayload(product, {
      scene: isOctoberRosa() ? 'rosa' : undefined,
      specSchema: await focusedSchemaFor(product)
    }));
  }
  return payloads;
}

async function existingSlots(dateKey) {
  const rows = await SocialPost.find({
    origin: 'community',
    planDate: dateKey,
    status: { $nin: ['cancelled'] }
  }).select('slot').lean();
  return new Set(rows.map((row) => row.slot));
}

function withOctoberLine(caption) {
  const text = String(caption || '');
  if (!isOctoberRosa() || text.includes('Octubre Rosa')) return text;
  return `Octubre Rosa.\n\n${text}`;
}

function clipName(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim();
  if (name.length <= 72) return name;
  return `${name.slice(0, 71).replace(/\s+\S*$/, '').trim()}…`;
}

function postedRecently(freshness, key, dateKey) {
  const last = freshness.get(key) || '';
  return Boolean(last && last >= addDays(dateKey, -1));
}

function offerOf(item) {
  const list = Number(item && item.price) || 0;
  const sell = Number(item && item.sellingPrice) || 0;
  if (list <= sell || sell <= 0) return null;
  const discountPercent = Math.round((list - sell) / list * 100);
  if (discountPercent < 1) return null;
  return { list, sell, discountPercent };
}

function promoCandidates(rows, used, freshness, dateKey) {
  const found = [];
  for (const row of rows) {
    if (postedRecently(freshness, row.key, dateKey)) continue;
    const promos = row.list
      .filter((item) => !used.has(item.id) && offerOf(item))
      .map((item) => ({ ...item, ...offerOf(item) }))
      .sort((a, b) => b.discountPercent - a.discountPercent || a.sell - b.sell);
    if (!promos.length) continue;
    found.push({
      ...row,
      list: promos,
      onlyIds: promos.map((item) => item.id),
      fresh: promos.length,
      promo: true,
      best: promos[0].discountPercent
    });
  }
  found.sort((a, b) => b.best - a.best || b.fresh - a.fresh);
  return found;
}

function pickChosen(row, preferredIds, used, count) {
  const pool = row.onlyIds
    ? row.list.filter((item) => row.onlyIds.includes(item.id))
    : row.list;
  const byId = new Map(pool.map((item) => [item.id, item]));
  const picked = [];
  const seen = new Set();
  const take = (item) => {
    if (!item || used.has(item.id) || seen.has(item.id) || picked.length >= count) return;
    seen.add(item.id);
    picked.push(item);
  };
  for (const id of preferredIds || []) take(byId.get(String(id)));
  const blocked = new Set(used);
  seen.forEach((id) => blocked.add(id));
  return picked.concat(takeSpread(pool, blocked, count - picked.length));
}

function broadWorld(term) {
  const text = String(term || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length || words.length > 2) return '';
  if (words.some((word) => ['accesorio', 'accesorios', 'periferico', 'perifericos'].includes(word))) return 'perifericos';
  if (words.some((word) => ['componente', 'componentes', 'hardware'].includes(word))) return 'componentes';
  if (words.some((word) => ['celular', 'celulares', 'smartphone', 'smartphones'].includes(word))) return 'moviles';
  if (words.some((word) => ['notebook', 'notebooks', 'laptop', 'laptops'].includes(word))) return 'equipos';
  return '';
}

function specText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(specText).join(' ');
  if (typeof value === 'object') return Object.values(value).map(specText).join(' ');
  return String(value);
}

function hasVga(item) {
  const blob = `${specText(item.graphicsCard)} ${specText(item.graphicCardModel)} ${item.productName || ''}`;
  return /\b(rtx\s?\d{3,4}|gtx\s?\d{3,4}|rx\s?\d{3,4}|geforce|radeon\s*rx)/i.test(blob);
}

function notebookGamerRow(openRows, trend, freshness, dateKey) {
  const text = `${trend.term || ''} ${(trend.brands || []).join(' ')}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (!/notebook|laptop/.test(text) || !/gamer|gaming|vga|rtx|geforce|placa/.test(text)) return null;
  let best = null;
  for (const row of openRows) {
    if (postedRecently(freshness, row.key, dateKey)) continue;
    const label = `${row.key} ${row.label}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (!/notebook|laptop/.test(label)) continue;
    const hits = row.list.filter(hasVga);
    if (!hits.length) continue;
    if (!best || hits.length > best.hits.length) best = { row, hits };
  }
  if (!best) return null;
  return { ...best.row, list: best.hits, trend, intent: 'vga' };
}

function lockFive(row, used) {
  if (!row) return row;
  const pool = row.list.filter((item) => !used.has(item.id));
  const sorted = pool.slice().sort((a, b) => (Number(a.sellingPrice) || Number(a.sell) || 0) - (Number(b.sellingPrice) || Number(b.sell) || 0));
  const picked = takeSpread(sorted, new Set(), Math.min(FEED_SIZE, sorted.length));
  if (!picked.length) return null;
  return {
    ...row,
    list: picked,
    onlyIds: picked.map((item) => item.id),
    fresh: picked.length
  };
}

function rowsForTrends(trendRows, trends, openRows, freshness, dateKey) {
  const coveredKeys = new Set(trendRows.map((row) => row.key));
  const coveredTerms = new Set(trendRows.map((row) => row.trend && row.trend.term));
  const extra = trendRows.slice();
  for (const trend of trends || []) {
    if (extra.length >= TREND_POSTS) break;
    if (coveredTerms.has(trend.term)) continue;
    const world = broadWorld(trend.term);
    if (!world) continue;
    const row = openRows
      .filter((item) => item.world === world && !coveredKeys.has(item.key) && item.fresh >= FEED_SIZE && !postedRecently(freshness, item.key, dateKey))
      .sort((a, b) => String(freshness.get(a.key) || '').localeCompare(String(freshness.get(b.key) || '')))[0];
    if (!row) continue;
    coveredKeys.add(row.key);
    coveredTerms.add(trend.term);
    extra.push({ ...row, trend });
  }
  return extra;
}

function pinTrends(feeds, trendRows) {
  const rest = feeds.filter((row) => !trendRows.some((trend) => trend.key === row.key));
  return [...trendRows, ...rest].slice(0, FEED_POSTS);
}

async function planDay(dateKey, groups, labels, used, freshness, trends, account) {
  const taken = await existingSlots(dateKey);
  if (DAY_SLOTS.every((slot) => taken.has(slot))) return [];
  const askAi = taken.size === 0;
  const rows = catalogRows(groups, labels, used);
  if (!rows.length) return [];
  const openRows = rows
    .map((row) => {
      const list = row.list.filter((item) => !used.has(item.id));
      return { ...row, list, fresh: list.length };
    })
    .filter((row) => row.fresh > 0);
  const promos = promoCandidates(openRows, used, freshness, dateKey);
  const promo = promos[0] || null;
  const intentHits = [];
  const intentKeys = new Set();
  for (const trend of trends || []) {
    const row = notebookGamerRow(openRows, trend, freshness, dateKey);
    if (!row || intentKeys.has(row.key)) continue;
    intentKeys.add(row.key);
    intentHits.push(row);
    if (intentHits.length >= TREND_POSTS) break;
  }
  const trendRows = rowsForTrends(
    intentHits.concat(matchTrends(openRows, trends)
      .filter((row) => !intentKeys.has(row.key))
      .filter((row) => !postedRecently(freshness, row.key, dateKey))
      .filter((row) => !promo || row.key !== promo.key))
      .slice(0, TREND_POSTS),
    trends,
    openRows,
    freshness,
    dateKey
  ).map((row) => lockFive(row, used)).filter(Boolean);
  const promoLocked = lockFive(promo, used);
  const front = [promoLocked, ...trendRows].filter(Boolean);
  const avoid = new Set(front.map((row) => row.key));
  let feeds = pinTrends(
    pickSpread(rows, freshness, FEED_POSTS, FEED_SIZE, avoid),
    front
  );
  feeds.forEach((row) => avoid.add(row.key));
  let stories = pickSpread(rows, freshness, STORY_POSTS, 1, avoid);
  const recentLabels = [...freshness.entries()]
    .filter(([, date]) => date && date >= addDays(dateKey, -4))
    .map(([key]) => labels.get(key) || plainLabel(key));
  const candidateRows = [];
  const seenCandidate = new Set();
  for (const row of [...feeds, ...stories]) {
    if (seenCandidate.has(row.key)) continue;
    seenCandidate.add(row.key);
    candidateRows.push(row);
  }
  const candidates = candidateRows.slice(0, 12).map((row) => ({
    key: row.key,
    label: row.label,
    world: row.world,
    fresh: row.fresh,
    trend: row.trend || null,
    products: shelfCards((row.onlyIds ? row.list.filter((item) => row.onlyIds.includes(item.id)) : row.list).filter((item) => !used.has(item.id)), 8)
  }));
  const ai = askAi ? await chooseCatalogDay({
    dossier: dossierText({
      dateLabel: dayLabel(dateKey),
      recentLabels,
      trends,
      candidates,
      account
    }),
    catalog: candidates.map((row) => ({
      key: row.key,
      productIds: row.products.map((product) => product.id)
    }))
  }) : null;
  if (ai) {
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const aiFeeds = ai.feeds
      .map((item) => byKey.get(item.subcategory))
      .filter((row) => row && row.fresh >= 1 && !postedRecently(freshness, row.key, dateKey));
    const aiStories = ai.stories
      .map((item) => byKey.get(item.subcategory))
      .filter((row) => row && row.fresh >= 1);
    if (aiFeeds.length >= 3) feeds = pinTrends(aiFeeds.slice(0, FEED_POSTS), front);
    if (aiStories.length) {
      stories = aiStories
        .filter((row) => !feeds.some((feed) => feed.key === row.key))
        .slice(0, STORY_POSTS);
    }
  }
  if (promo && promo.fresh > FEED_SIZE) {
    stories = [promo, ...stories.filter((row) => row.key !== promo.key)].slice(0, STORY_POSTS);
  }
  const hooks = new Map();
  const feedProducts = new Map();
  const storyProducts = new Map();
  if (ai) {
    for (const item of ai.feeds || []) {
      if (!item) continue;
      if (item.hook) hooks.set(item.subcategory, item.hook);
      if (item.productIds) feedProducts.set(item.subcategory, item.productIds);
    }
    for (const item of ai.stories || []) {
      if (!item) continue;
      if (item.hook) hooks.set(item.subcategory, item.hook);
      if (item.productId) storyProducts.set(item.subcategory, [item.productId]);
    }
  }
  const created = [];

  async function placeProducts(slot, time, row, ids, kind) {
    if (taken.has(slot) || !ids.length) return;
    const when = atAsuncion(dateKey, time);
    if (when.getTime() < Date.now() + 10 * 60 * 1000) return;
    const payloads = await payloadsFor(ids.map((item) => item.id));
    if (!payloads.length) return;
    ids.forEach((item) => used.add(item.id));
    const storyName = clipName(payloads[0].productName || payloads[0].title);
    const headline = row.promo && kind !== 'story'
      ? `Promociones · ${payloads.length} ${row.label}`
      : (kind === 'story' || payloads.length === 1 ? storyName : `${payloads.length} ${row.label}`);
    const span = priceSpan(ids);
    const maxOff = Math.max(0, ...payloads.map((product) => Number(product.discountPercent) || 0));
    let reason = '';
    if (row.intent === 'vga') {
      reason = `Notebook gamer con placa de video. Se publica uno de entrada y uno caro${span ? `: ${span}` : ''}.`;
    } else if (row.promo) {
      reason = maxOff
        ? `Está en Promociones. El descuento más alto de este grupo es ${maxOff}% y el precio de ahora es el que se cobra.`
        : `Está en Promociones, con el precio tachado de la tienda.`;
    } else if (row.trend) {
      const where = row.trend.source ? ` Aparece en ${row.trend.source}.` : '';
      reason = `Esta semana se busca ${row.trend.term}.${where} En Zenn hay stock${span ? `, de ${span}` : ''}.`;
    } else if (kind === 'story') {
      reason = `Un ${row.label} del catálogo, para que no se vea un solo rubro.`;
    } else {
      reason = `Sale ${row.label} para recorrer todo lo que tenemos. El precio es el nuestro${span ? `: ${span}` : ''}.`;
    }
    const doc = await SocialPost.create({
      productIds: payloads.map((product) => product.id),
      titles: payloads.map((product) => product.productName || product.title),
      kind,
      caption: withOctoberLine(communityCaption(payloads, row.promo
        ? `Promociones de ${spokenLabel(row.label)} que están hoy en la tienda${maxOff ? `. Hasta -${maxOff}%` : ''}.`
        : saleIntro(row, ids))),
      showPrice: true,
      scene: isOctoberRosa() ? 'rosa' : '',
      origin: 'community',
      planDate: dateKey,
      slot,
      headline,
      reason,
      subcategory: row.key,
      subcategoryLabel: row.label,
      status: 'scheduled',
      scheduledAt: when
    });
    freshness.set(row.key, dateKey);
    created.push(doc);
  }

  async function placeSuggestion(slot, row, pack) {
    if (taken.has(slot.slot) || !row) return;
    const when = atAsuncion(dateKey, slot.time);
    if (when.getTime() < Date.now() + 10 * 60 * 1000) return;
    if (slot.kind === 'reel') {
      const pool = (row.list || []).filter((item) => item && item.productName);
      const cheap = pool[0];
      const rich = pool[pool.length - 1];
      const picks = [...new Map([cheap, rich].filter(Boolean).map((item) => [item.id, item])).values()];
      const doc = await SocialPost.create({
        productIds: picks.map((item) => item.id),
        titles: picks.map((item) => item.productName),
        mediaUrls: [],
        creativeHtml: '',
        kind: 'reel',
        caption: withOctoberLine(pack.caption),
        showPrice: false,
        origin: 'community',
        planDate: dateKey,
        slot: slot.slot,
        headline: `Cómo grabar el reel de ${row.label}`,
        reason: 'El reel no se publica solo. Esta tarjeta dice cómo grabarlo. Cuando cargues el video, sale a esa hora.',
        brief: filmBrief({ label: row.label, titles: picks.map((item) => item.productName), time: slot.time }),
        subcategory: row.key,
        subcategoryLabel: row.label,
        status: 'idea',
        scheduledAt: when
      });
      created.push(doc);
      return;
    }
    let art = null;
    try {
      art = await composeSuggestion({
        kind: slot.kind,
        label: row.label,
        items: row.list,
        time: slot.time,
        promo: Boolean(row.promo),
        intent: row.intent || '',
        planDate: dateKey,
        brief: pack.brief || '',
        angle: pack.headline || ''
      });
    } catch (error) {
      console.error('[community graphic]', error.message || error);
    }
    const doc = await SocialPost.create({
      productIds: art ? art.productIds : [],
      titles: art ? art.titles : [],
      mediaUrls: art && art.mediaUrl ? [art.mediaUrl] : [],
      creativeHtml: art && art.html ? art.html : '',
      kind: slot.kind,
      caption: withOctoberLine((art && art.caption) || pack.caption),
      showPrice: false,
      origin: 'community',
      planDate: dateKey,
      slot: slot.slot,
      headline: (art && art.headline) || pack.headline,
      reason: (art && art.reason) || 'La gráfica no se pudo armar. Cargá la foto o el video y sale a esta hora.',
      brief: (art && art.brief) || pack.brief,
      subcategory: row.key,
      subcategoryLabel: row.label,
      status: 'idea',
      scheduledAt: when
    });
    created.push(doc);
  }

  for (let index = 0; index < feeds.length; index += 1) {
    const row = feeds[index];
    const ids = pickChosen(row, feedProducts.get(row.key), used, row.onlyIds ? Math.min(FEED_SIZE, row.onlyIds.length) : FEED_SIZE);
    await placeProducts(`feed-${index + 1}`, FEED_TIMES[index], row, ids, 'feed');
  }
  for (let index = 0; index < stories.length; index += 1) {
    const row = stories[index];
    const ids = pickChosen(row, storyProducts.get(row.key), used, 1);
    await placeProducts(`story-${index + 1}`, STORY_TIMES[index], row, ids, 'story');
  }
  const suggestionRows = feeds.length ? feeds : stories;
  for (let index = 0; index < SUGGESTION_SLOTS.length; index += 1) {
    const slot = SUGGESTION_SLOTS[index];
    const focus = promoLocked || trendRows[0] || null;
    const row = focus || suggestionRows[index % suggestionRows.length];
    if (!row) continue;
    const custom = (ai && ai.suggestions || []).find((item) => item.type === slot.kind);
    const pack = suggestionPack(slot.kind, row.label, slot.time, promoLocked ? promoLocked.list : null, focus);
    if (custom && slot.kind !== 'reel' && custom.brief) pack.brief = custom.brief;
    if (custom && custom.caption) pack.caption = custom.caption;
    if (custom && slot.kind !== 'reel' && custom.title) pack.headline = custom.title;
    if (custom && custom.subhead) pack.subhead = custom.subhead;
    if (custom && (custom.title || custom.caption)) pack.useCopy = true;
    await placeSuggestion(slot, row, pack);
  }
  return created;
}

function firstOpenDay() {
  const parts = zonedParts();
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  if (minutes < 9 * 60) return today;
  return addDays(today, 1);
}

async function planCommunityDays({ days = 3, startDate } = {}) {
  const count = Math.max(1, Math.min(21, Number(days) || 3));
  const start = startDate || firstOpenDay();
  const dateKeys = Array.from({ length: count }, (_, index) => addDays(start, index));
  const openings = [];
  let needsThought = false;
  for (const dateKey of dateKeys) {
    const taken = await existingSlots(dateKey);
    if (DAY_SLOTS.every((slot) => taken.has(slot))) continue;
    openings.push(dateKey);
    if (taken.size === 0) needsThought = true;
  }
  if (!openings.length) {
    const painted = await paintOpenIdeas();
    return { start, days: count, created: 0, posts: [], ai: false, reused: true, painted };
  }
  const [labels, used, freshness, products] = await Promise.all([
    labelMap(),
    recentlyUsedIds(),
    subcategoryFreshness(),
    stockPool()
  ]);
  const groups = groupPool(products);
  const account = needsThought ? await accountPulse() : '';
  const trends = needsThought ? await scoutMarket({ dateLabel: dayLabel(openings[0]), account }) : [];
  const created = [];
  for (const dateKey of openings) {
    const rows = await planDay(dateKey, groups, labels, used, freshness, trends, account);
    created.push(...rows);
  }
  const painted = await paintOpenIdeas();
  return {
    start,
    days: count,
    created: created.length,
    painted,
    posts: created,
    ai: communityAiReady()
  };
}

function publicPost(post) {
  const when = post.scheduledAt ? new Date(post.scheduledAt) : null;
  const time = when && !Number.isNaN(when.getTime())
    ? new Intl.DateTimeFormat('es-PY', {
      timeZone: ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).format(when)
    : '';
  return {
    id: String(post._id),
    date: post.planDate,
    time,
    kind: post.kind,
    status: post.status,
    headline: post.headline || (post.titles || [])[0] || 'Publicación',
    scene: post.scene || (isOctoberRosa() ? 'rosa' : ''),
    reason: post.reason || '',
    brief: post.brief || '',
    caption: post.caption || '',
    titles: post.titles || [],
    productIds: post.productIds || [],
    subcategoryLabel: post.subcategoryLabel || '',
    mediaUrls: post.mediaUrls || [],
    previewUrl: (post.mediaUrls || [])[0] || '',
    needsApproval: ['imagen', 'dato'].includes(post.kind) && post.status === 'idea' && (post.mediaUrls || []).length > 0,
    canRevise: ['imagen', 'dato'].includes(post.kind) && ['idea', 'scheduled'].includes(post.status),
    waitingUpload: post.kind === 'reel'
      ? post.status === 'idea' && !(post.mediaUrls || []).some((url) => /\.mp4($|\?)/i.test(url))
      : ['imagen', 'dato'].includes(post.kind) && post.status === 'idea' && !(post.mediaUrls || []).length,
    autoPublish: post.status === 'scheduled' && (
      post.kind === 'feed'
      || post.kind === 'story'
      || (post.mediaUrls || []).length > 0
    ),
    origin: post.origin || 'manual'
  };
}

async function listCommunityCalendar({ from, days = 14 } = {}) {
  await releaseReelBoards();
  const start = from || zonedDate();
  const count = Math.max(1, Math.min(42, Number(days) || 14));
  const end = addDays(start, count - 1);
  const posts = await SocialPost.find({
    origin: 'community',
    planDate: { $gte: start, $lte: end },
    status: { $nin: ['cancelled'] }
  }).sort({ planDate: 1, scheduledAt: 1 }).lean();
  const byDate = new Map();
  for (let index = 0; index < count; index += 1) {
    const date = addDays(start, index);
    byDate.set(date, []);
  }
  for (const post of posts) {
    if (!byDate.has(post.planDate)) byDate.set(post.planDate, []);
    byDate.get(post.planDate).push(publicPost(post));
  }
  const focuses = await CommunityDayFocus.find({
    planDate: { $gte: start, $lte: end }
  }).lean();
  const focusByDate = new Map(focuses.map((item) => [item.planDate, item.focus || '']));
  return {
    from: start,
    ai: communityAiReady(),
    claude: claudeReady(),
    days: [...byDate.entries()].map(([date, slots]) => ({
      date,
      label: dayLabel(date),
      focus: focusByDate.get(date) || '',
      slots
    }))
  };
}

async function spareProducts(subcategory, used, limit, promoOnly) {
  if (!subcategory || limit <= 0) return [];
  const rows = await Product.find({
    subcategory,
    stock: { $gt: 0 },
    sellingPrice: { $gt: 0 },
    'productImage.0': { $exists: true, $ne: '' }
  }).select('productName brandName subcategory sellingPrice price').limit(80).lean();
  const fresh = rows
    .filter((row) => !used.has(String(row._id)) && (!promoOnly || offerOf(row)))
    .map((row) => ({ ...row, id: String(row._id) }));
  fresh.sort((a, b) => (Number(a.sellingPrice) || 0) - (Number(b.sellingPrice) || 0));
  return takeSpread(fresh, new Set(), limit);
}

async function repairCommunityPost(doc, used) {
  if (!doc || doc.origin !== 'community' || doc.status !== 'scheduled') return false;
  if ((doc.mediaUrls || []).length) return false;
  if (!['feed', 'story'].includes(doc.kind)) return false;
  const ids = (doc.productIds || []).map(String);
  if (!ids.length) return false;
  const promoPost = String(doc.headline || '').startsWith('Promociones');
  const products = await Product.find({ _id: { $in: ids } })
    .select('stock subcategory productName productImage price sellingPrice')
    .lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const alive = [];
  let dead = 0;
  for (const id of ids) {
    const product = byId.get(id);
    const image = product && Array.isArray(product.productImage) && product.productImage[0];
    const onOffer = !promoPost || offerOf(product);
    if (product && Number(product.stock) > 0 && image && onOffer) alive.push(product);
    else {
      dead += 1;
      if (used) used.delete(id);
    }
  }
  if (!dead) {
    if (isOctoberRosa() && doc.scene !== 'rosa') {
      doc.scene = 'rosa';
      doc.caption = withOctoberLine(doc.caption);
      await doc.save();
      return true;
    }
    return false;
  }
  const want = doc.kind === 'story' ? 1 : Math.max(ids.length, 1);
  const subcategory = doc.subcategory || (alive[0] && alive[0].subcategory) || '';
  const spares = await spareProducts(subcategory, used || new Set(), want - alive.length, promoPost);
  const next = [
    ...alive.map((product) => ({ ...product, id: String(product._id) })),
    ...spares
  ];
  if (!next.length) {
    doc.status = 'cancelled';
    doc.reason = `${doc.subcategoryLabel || 'Ese rubro'} se quedó sin stock. No se publica un producto que ya no está.`;
    await doc.save();
    return true;
  }
  const payloads = await payloadsFor(next.map((product) => product.id));
  if (!payloads.length) {
    doc.status = 'cancelled';
    doc.reason = `${doc.subcategoryLabel || 'Ese rubro'} se quedó sin stock. No se publica un producto que ya no está.`;
    await doc.save();
    return true;
  }
  doc.productIds = payloads.map((product) => product.id);
  doc.titles = payloads.map((product) => product.productName || product.title);
  doc.headline = promoPost && doc.kind !== 'story'
    ? `Promociones · ${payloads.length} ${doc.subcategoryLabel || ''}`.trim()
    : (doc.kind === 'story' || payloads.length === 1
      ? clipName(payloads[0].productName || payloads[0].title)
      : `${payloads.length} ${doc.subcategoryLabel || ''}`.trim());
  const maxOff = Math.max(0, ...payloads.map((product) => Number(product.discountPercent) || 0));
  doc.caption = withOctoberLine(communityCaption(
    payloads,
    promoPost
      ? `Promociones de ${doc.subcategoryLabel} que están hoy en la tienda${maxOff ? `. Hasta -${maxOff}%` : ''}.`
      : feedIntro(doc.subcategoryLabel, payloads, '')
  ));
  doc.scene = isOctoberRosa() ? 'rosa' : doc.scene;
  const swapped = spares.length === 1 ? 'entró otro del mismo rubro' : `entraron ${spares.length} del mismo rubro`;
  const dropped = dead - spares.length;
  const note = spares.length
    ? `${dead === 1 ? 'Uno se quedó sin stock' : `${dead} se quedaron sin stock`} y ${swapped}.`
    : `Se sacó ${dropped === 1 ? 'uno sin stock' : `${dropped} sin stock`}. Sigue lo que todavía hay.`;
  doc.reason = `${doc.subcategoryLabel}: ${note}`;
  next.forEach((product) => used && used.add(product.id));
  await doc.save();
  return true;
}

async function refreshScheduledStock() {
  const posts = await SocialPost.find({
    origin: 'community',
    status: 'scheduled',
    kind: { $in: ['feed', 'story'] },
    scheduledAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
  }).sort({ scheduledAt: 1 });
  const used = await recentlyUsedIds();
  let changed = 0;
  for (const doc of posts) {
    if (await repairCommunityPost(doc, used)) changed += 1;
  }
  return changed;
}

async function paintOpenIdeas() {
  const posts = await SocialPost.find({
    origin: 'community',
    kind: { $in: ['imagen', 'dato'] },
    status: 'idea',
    scheduledAt: { $gt: new Date() }
  }).sort({ scheduledAt: 1 });
  let painted = 0;
  for (const doc of posts) {
    if ((doc.mediaUrls || []).length) continue;
    const when = doc.scheduledAt ? new Date(doc.scheduledAt) : null;
    const time = when && !Number.isNaN(when.getTime())
      ? new Intl.DateTimeFormat('es-PY', {
        timeZone: ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).format(when)
      : '';
    try {
      const art = await composeSuggestion({
        kind: doc.kind,
        label: doc.subcategoryLabel || doc.headline,
        subcategory: doc.subcategory,
        time,
        planDate: doc.planDate
      });
      if (!art.mediaUrl) continue;
      doc.mediaUrls = [art.mediaUrl];
      doc.creativeHtml = art.html || '';
      doc.productIds = art.productIds;
      doc.titles = art.titles;
      doc.headline = art.headline;
      doc.brief = art.brief;
      doc.caption = withOctoberLine(art.caption);
      doc.reason = art.reason;
      await doc.save();
      painted += 1;
    } catch (error) {
      console.error('[community graphic]', doc._id, error.message || error);
    }
  }
  return painted;
}

async function releaseReelBoards() {
  const posts = await SocialPost.find({
    origin: 'community',
    kind: 'reel',
    status: 'idea'
  });
  let changed = 0;
  for (const doc of posts) {
    const url = (doc.mediaUrls || [])[0] || '';
    if (/\.mp4($|\?)/i.test(url)) continue;
    const generated = Boolean(url) || Boolean(doc.creativeHtml);
    if (!generated && String(doc.brief || '').startsWith('Cómo grabarlo')) continue;
    const when = doc.scheduledAt ? new Date(doc.scheduledAt) : null;
    const time = when && !Number.isNaN(when.getTime())
      ? new Intl.DateTimeFormat('es-PY', {
        timeZone: ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).format(when)
      : '';
    doc.mediaUrls = [];
    doc.creativeHtml = '';
    doc.headline = `Cómo grabar el reel de ${doc.subcategoryLabel || 'hoy'}`;
    doc.reason = 'El reel no se publica solo. Esta tarjeta dice cómo grabarlo. Cuando cargues el video, sale a esa hora.';
    doc.brief = filmBrief({
      label: doc.subcategoryLabel || doc.headline,
      titles: doc.titles || [],
      time
    });
    await doc.save();
    changed += 1;
  }
  return changed;
}

function foldText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function readDayTalk(note) {
  const text = foldText(note).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const ops = [];
  if (/foto|imagen|html|texto|tipograf|sombra|mas arriba|mas abajo|arriba|abajo/.test(text)) {
    ops.push({ type: 'photo', note: String(note || '').trim() });
  }
  const mix = text.match(/en vez de (?:subir |publicar )?(\d+\s+)?([a-z0-9 ]{3,40}?)(?:,| que | y que ).{0,50}(\d+\s+)?cosas/);
  if (mix) ops.push({ type: 'mix', from: mix[2].trim(), count: 5 });
  if (!mix) {
    const swap = text.match(/en vez de (?:mostrar |subir |publicar |los |las )?([a-z0-9 ]{3,40}?) (?:mostra|muestra|muestre|pone|publica|subi|quiero)(?:r|s|me|n)? ([a-z0-9 ]{3,40})/);
    const instead = text.match(/cambia(?:r)? ([a-z0-9 ]{3,40}?) por ([a-z0-9 ]{3,40})/);
    const hit = swap || instead;
    if (hit) ops.push({ type: 'replace', from: hit[1].trim(), to: hit[2].trim(), brand: '' });
  }
  const allBrand = text.match(/todas las ([a-z0-9 ]{3,40})/);
  const add = text.match(/(?:agrega(?:r)?|suma(?:r)?|incluye(?:r)?) (?:mostrar )?([a-z0-9 ]{3,40})/);
  const chunk = allBrand ? allBrand[1].trim() : (add && !mix ? add[1].trim() : '');
  if (chunk) {
    ops.push({ type: 'add', to: chunk, brand: '', all: Boolean(allBrand) || /todas/.test(text) });
  }
  const seen = new Set();
  return ops.filter((op) => {
    const key = `${op.type}|${op.from || ''}|${op.to || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

function postMatches(doc, phrase) {
  const blob = foldText(`${doc.subcategoryLabel || ''} ${doc.headline || ''} ${doc.subcategory || ''}`);
  const stems = foldText(phrase).split(/\s+/).filter((word) => word.length > 2).map(stem);
  if (!stems.length) return false;
  return stems.every((token) => blob.includes(token));
}

function brandOf(text, row) {
  const names = [...new Set((row.list || []).map((item) => foldText(item.brandName)).filter((name) => name.length > 2))];
  const found = names.find((name) => foldText(text).includes(name));
  return found || '';
}

function pickFromRow(row, { brand = '', count = 5 } = {}) {
  const list = brand
    ? row.list.filter((item) => foldText(`${item.brandName} ${item.productName}`).includes(foldText(brand)))
    : row.list;
  return takeSpread(list, new Set(), Math.min(count, list.length));
}

async function writePostProducts(doc, items, label, key, reason) {
  const payloads = await payloadsFor(items.map((item) => item.id));
  if (!payloads.length) return false;
  doc.productIds = items.map((item) => item.id);
  doc.titles = items.map((item) => item.productName);
  doc.subcategory = key || doc.subcategory;
  doc.subcategoryLabel = label || doc.subcategoryLabel;
  doc.headline = payloads.length === 1
    ? clipName(items[0].productName)
    : `${payloads.length} ${label}`;
  doc.caption = withOctoberLine(communityCaption(payloads, feedIntro(label, items, '')));
  doc.reason = reason;
  doc.scene = isOctoberRosa() ? 'rosa' : (doc.scene || '');
  if (['imagen', 'dato'].includes(doc.kind)) {
    doc.mediaUrls = [];
    doc.creativeHtml = '';
  }
  await doc.save();
  return true;
}

async function reviseDayTalk(date, note) {
  const dateKey = String(date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const error = new Error('Elegí el día en el calendario.');
    error.statusCode = 400;
    throw error;
  }
  const text = String(note || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (text.length < 4) {
    const error = new Error('Decime qué cambiar de ese día.');
    error.statusCode = 400;
    throw error;
  }
  const posts = await SocialPost.find({
    origin: 'community',
    planDate: dateKey,
    status: { $in: ['scheduled', 'idea'] }
  }).sort({ scheduledAt: 1 });
  const editable = posts.filter((doc) => !/\.mp4($|\?)/i.test((doc.mediaUrls || [])[0] || ''));
  if (!editable.length) {
    const error = new Error('Ese día no tiene publicaciones que se puedan cambiar.');
    error.statusCode = 400;
    throw error;
  }
  const [labels, products] = await Promise.all([labelMap(), stockPool()]);
  const rows = catalogRows(groupPool(products), labels, new Set());
  const aiOps = await askDayOps({
    note: text,
    posts: editable.map((doc) => ({
      slot: doc.slot,
      kind: doc.kind,
      subcategoryLabel: doc.subcategoryLabel,
      titles: doc.titles
    })),
    labels: rows.map((row) => row.label)
  });
  const ops = (aiOps && aiOps.length ? aiOps : readDayTalk(text))
    .map((op) => ({
      type: op.type,
      from: String(op.from || '').trim(),
      to: String(op.to || '').trim(),
      brand: String(op.brand || '').trim(),
      all: Boolean(op.all),
      count: Number(op.count) || 5,
      note: String(op.note || text).trim()
    }));
  if (!ops.length) {
    const error = new Error('No entendí el cambio. Por ejemplo: en vez de monitores mostrá memorias RAM. O agregá las notebooks Acer. O en vez de 5 auriculares subí 5 cosas distintas.');
    error.statusCode = 400;
    throw error;
  }
  const notes = [];
  for (const op of ops) {
    if (op.type === 'photo') {
      const pieces = editable.filter((doc) => ['imagen', 'dato'].includes(doc.kind));
      if (!pieces.length) {
        notes.push('Ese día no tiene una foto de creativo para cambiar.');
        continue;
      }
      if (!claudeReady()) {
        notes.push('La foto se cambia con el HTML, y para eso hace falta la clave del modelo.');
        continue;
      }
      for (const doc of pieces) {
        try {
          const when = doc.scheduledAt ? new Date(doc.scheduledAt) : null;
          const time = when && !Number.isNaN(when.getTime())
            ? new Intl.DateTimeFormat('es-PY', {
              timeZone: ZONE,
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23'
            }).format(when)
            : '';
          const art = await reviseSuggestion(doc, { note: op.note, time });
          if (!art.mediaUrl) continue;
          doc.creativeHtml = art.html || doc.creativeHtml;
          doc.mediaUrls = [art.mediaUrl];
          doc.brief = art.brief || doc.brief;
          doc.reason = art.reason || doc.reason;
          await doc.save();
          notes.push(`La foto de ${doc.kind} se reescribió.`);
        } catch (error) {
          notes.push(error.message || 'La foto no se pudo reescribir.');
        }
      }
      continue;
    }
    if (op.type === 'mix') {
      const feeds = editable
        .filter((doc) => doc.kind === 'feed' && postMatches(doc, op.from))
        .sort((a, b) => (b.productIds || []).length - (a.productIds || []).length);
      const target = feeds[0];
      if (!target) {
        notes.push(`No encontré un grupo de ${op.from} para separar.`);
        continue;
      }
      const mixed = [];
      for (const row of rows) {
        if (mixed.length >= op.count) break;
        if (postMatches({ subcategoryLabel: row.label, headline: '', subcategory: row.key }, op.from)) continue;
        const mid = row.list[Math.floor(row.list.length / 2)];
        if (mid) mixed.push(mid);
      }
      if (mixed.length < 2) {
        notes.push('No hay rubros distintos con stock para armar ese grupo.');
        continue;
      }
      await writePostProducts(target, mixed, 'cosas distintas', target.subcategory, `Pediste: ${text}`);
      target.headline = `${mixed.length} cosas distintas`;
      await target.save();
      notes.push(`Ese grupo pasó a ${mixed.length} productos de rubros distintos.`);
      continue;
    }
    const wanted = matchFocus(rows, op.to);
    if (!wanted) {
      notes.push(`No encontré «${op.to}» con stock.`);
      continue;
    }
    const brand = op.brand || brandOf(`${op.to} ${text}`, wanted);
    const count = op.all ? Math.min(10, wanted.list.length) : 5;
    const picked = pickFromRow(wanted, { brand, count: op.type === 'add' && !op.all ? 5 : count });
    if (!picked.length) {
      notes.push(brand ? `No hay ${wanted.label} ${brand} con foto.` : `No hay ${wanted.label} con foto.`);
      continue;
    }
    let targets = editable.filter((doc) => ['feed', 'story', 'imagen', 'dato'].includes(doc.kind) && postMatches(doc, op.from || op.to));
    if (op.type === 'add' && !targets.length) {
      const spare = [...editable].reverse().find((doc) => doc.kind === 'feed' && !/^Promociones/.test(doc.headline || ''));
      if (spare) targets = [spare];
    }
    if (!targets.length) {
      notes.push(`No hay una publicación de ese día para pasar a ${wanted.label}.`);
      continue;
    }
    for (const doc of targets) {
      const slice = doc.kind === 'story' || doc.kind === 'dato' ? picked.slice(0, 1) : picked.slice(0, doc.kind === 'imagen' ? Math.min(3, picked.length) : picked.length);
      const label = brand ? `${wanted.label} ${brand}` : wanted.label;
      await writePostProducts(doc, slice, label, wanted.key, `Pediste: ${text}`);
      if (['imagen', 'dato'].includes(doc.kind)) {
        try {
          const art = await composeSuggestion({
            kind: doc.kind,
            label,
            items: slice,
            subcategory: wanted.key,
            planDate: dateKey
          });
          if (art && art.mediaUrl) {
            doc.mediaUrls = [art.mediaUrl];
            doc.creativeHtml = art.html || '';
            doc.headline = art.headline || doc.headline;
            doc.brief = art.brief || doc.brief;
            doc.caption = withOctoberLine(art.caption || doc.caption);
            await doc.save();
          }
        } catch (error) {
          console.error('[community graphic]', error.message || error);
        }
      }
    }
    notes.push(brand
      ? `Entraron ${picked.length} ${wanted.label} ${brand}.`
      : `Eso pasó a ${wanted.label}.`);
  }
  if (!notes.length) {
    const error = new Error('No pude aplicar ese cambio sobre lo que hay publicado ese día.');
    error.statusCode = 400;
    throw error;
  }
  return {
    date: dateKey,
    message: notes.join(' ')
  };
}

async function reviseCommunityPiece(id, { note = '', background = '', swap = false } = {}) {
  const doc = await SocialPost.findById(id);
  if (!doc || doc.origin !== 'community') {
    const error = new Error('Esa pieza no está en el calendario');
    error.statusCode = 404;
    throw error;
  }
  if (!['imagen', 'dato'].includes(doc.kind) || !['idea', 'scheduled'].includes(doc.status)) {
    const error = new Error('Esa pieza ya no se puede modificar');
    error.statusCode = 400;
    throw error;
  }
  const when = doc.scheduledAt ? new Date(doc.scheduledAt) : null;
  const time = when && !Number.isNaN(when.getTime())
    ? new Intl.DateTimeFormat('es-PY', {
      timeZone: ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).format(when)
    : '';
  const before = (doc.productIds || []).join();
  const art = await reviseSuggestion(doc, { note, background, swap, time });
  const swapped = (art.productIds || []).join() !== before;
  doc.creativeHtml = art.html || doc.creativeHtml;
  doc.mediaUrls = [art.mediaUrl];
  if (swapped) {
    doc.productIds = art.productIds;
    doc.titles = art.titles;
    doc.headline = art.headline;
    doc.caption = withOctoberLine(art.caption);
    if (art.subcategory) doc.subcategory = art.subcategory;
  }
  doc.brief = art.brief || doc.brief;
  doc.reason = art.reason || doc.reason;
  await doc.save();
  return publicPost(doc.toObject());
}

module.exports = {
  planCommunityDays,
  listCommunityCalendar,
  refreshScheduledStock,
  repairCommunityPost,
  paintOpenIdeas,
  reviseCommunityPiece,
  reviseDayTalk,
  zonedDate,
  zonedParts,
  addDays
};
