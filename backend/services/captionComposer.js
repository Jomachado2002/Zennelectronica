'use strict';

const SITE = 'www.zenn.com.py';
const WHATSAPP = '0973 345 284';
const HOURS = 'Lunes a viernes, 08:00 a 17:00';

const FAMILY_EMOJI = {
  notebook: '💻',
  monitor: '🖥️',
  celular: '📱',
  tablet: '📱',
  auricular: '🎧',
  teclado: '⌨️',
  mouse: '🖱️',
  gabinete: '🖥️',
  gamer: '🎮',
  general: '✨'
};

const PUNCH_BY_ICON = ['gpu', 'hz', 'cpu', 'ram', 'ssd', 'screen', 'res'];

const HOOKS = {
  gamer: [
    'Nuevo ingreso para armar el setup 🎮',
    'Llegó equipo para jugar en serio 🎮',
    'Para el que arma la PC este finde 🎮'
  ],
  office: [
    'Nuevo ingreso para estudiar y trabajar 💻',
    'Equipo listo para la oficina y la facultad 💻',
    'Llegó lo que se usa todos los días 💻'
  ],
  phone: [
    'Nuevo ingreso en celulares 📱',
    'Llegaron equipos para cambiar el teléfono 📱',
    'Para el que estaba esperando este modelo 📱'
  ],
  mix: [
    'Nuevo ingreso en Zenn ✨',
    'Acaba de entrar a la tienda ✨',
    'Lo que llegó hoy al depósito ✨'
  ],
  single: [
    'Nuevo ingreso ✨',
    'Ya está en la tienda ✨',
    'Entró hoy al depósito ✨'
  ],
  promo: [
    'Promociones del día 🔥',
    'Bajó el precio, hoy conviene 🔥',
    'Ofertas para llevar hoy 🔥'
  ]
};

function norm(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function hash(text) {
  return String(text || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function hashtagToken(raw) {
  const t = norm(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  if (t.length < 2 || t.length > 28) return '';
  return `#${t}`;
}

function punchOf(product) {
  const specs = Array.isArray(product.specs) ? product.specs : [];
  for (const icon of PUNCH_BY_ICON) {
    const hit = specs.find((spec) => spec && spec.icon === icon && spec.text);
    if (hit) return norm(hit.text);
  }
  const first = specs.find((spec) => spec && spec.text);
  return first ? norm(first.text) : '';
}

function offerOf(product) {
  const list = Number(product.listPriceValue) || 0;
  const sale = Number(product.sellingPrice) || 0;
  if (!(list > sale && sale > 0)) return null;
  const percent = Math.round((list - sale) / list * 100);
  if (percent < 1) return null;
  const before = product.listPrice || '';
  const now = product.price || '';
  if (!before || !now || before === now) return null;
  return { before, now, percent };
}

function lineOf(product) {
  const emoji = FAMILY_EMOJI[product.family] || FAMILY_EMOJI.general;
  const name = norm(product.title || product.productName);
  const offer = offerOf(product);
  if (offer) {
    return `${emoji} ${name}\nAntes ${offer.before} · Ahora ${offer.now} · -${offer.percent}%`;
  }
  const punch = punchOf(product);
  return punch ? `${emoji} ${name} · ${punch}` : `${emoji} ${name}`;
}

function moodOf(products) {
  const offers = products.filter((p) => offerOf(p)).length;
  if (offers && offers >= Math.ceil(products.length / 2)) return 'promo';
  if (products.length <= 1) return 'single';
  const families = new Set(products.map((p) => p.family));
  const gamer = products.filter((p) => p.theme === 'gamer' || p.hasGpu).length;
  if (gamer >= Math.ceil(products.length / 2)) return 'gamer';
  if (families.size === 1 && families.has('celular')) return 'phone';
  if (families.size === 1 && (families.has('notebook') || families.has('monitor'))) return 'office';
  return 'mix';
}

function hashtagsFor(products) {
  const tags = ['#zenn', '#asuncion'];
  for (const product of products) {
    const brand = hashtagToken(product.brandName);
    if (brand) tags.push(brand);
    if (product.family === 'notebook' && (product.theme === 'gamer' || product.hasGpu)) tags.push('#notebookgamer');
    else if (product.family === 'notebook') tags.push('#notebook');
    else if (product.family === 'celular') tags.push('#celular');
    else if (product.family === 'monitor') tags.push('#monitor');
    else if (product.family === 'auricular') tags.push('#auriculares');
    else if (product.family && product.family !== 'general') tags.push(hashtagToken(product.family));
  }
  const unique = [];
  for (const tag of tags) {
    if (tag && !unique.includes(tag)) unique.push(tag);
    if (unique.length >= 8) break;
  }
  return unique;
}

function closer() {
  return [
    `Pedilo en ${SITE}`,
    'Entrega en Asunción en 24 horas',
    '',
    HOURS,
    `WhatsApp ${WHATSAPP}`
  ].join('\n');
}

function hooksFor(mood, voices) {
  const fromDb = voices && voices[mood];
  if (Array.isArray(fromDb) && fromDb.length) return fromDb;
  return HOOKS[mood] || HOOKS.mix;
}

function composeVariant(products, mood, variantIndex, voices) {
  const hooks = hooksFor(mood, voices);
  const day = new Date().toISOString().slice(0, 10);
  const start = hash(`${day}|${products.map((p) => p.id).join(',')}|${mood}`) % hooks.length;
  const hook = hooks[(start + variantIndex) % hooks.length];
  const tags = hashtagsFor(products);
  const caption = [hook, '', ...products.map(lineOf), '', closer(), '', tags.join(' ')].join('\n');
  const alts = products.map((product) => {
    const name = norm(product.title || product.productName);
    const brand = norm(product.brandName);
    return [name, brand, 'en Zenn Electrónicos, Paraguay'].filter(Boolean).join(' ');
  });
  return { hook, caption, hashtags: tags, alts };
}

function composeCaptions(products, voices) {
  const list = (products || []).filter(Boolean).slice(0, 10);
  if (!list.length) return [];
  const mood = moodOf(list);
  const labels = ['Comercial', 'Otra forma de decirlo', 'Más corta'];
  return [0, 1, 2].map((index) => {
    const variant = composeVariant(list, mood, index, voices);
    if (index === 2) {
      const tags = variant.hashtags.slice(0, 5);
      variant.caption = [
        mood === 'promo' ? 'Promociones del día 🔥' : (list.length > 1 ? 'Nuevo ingreso en Zenn ✨' : variant.hook),
        '',
        ...list.map(lineOf),
        '',
        `www.zenn.com.py · WhatsApp ${WHATSAPP}`,
        '',
        tags.join(' ')
      ].join('\n');
      variant.hashtags = tags;
    }
    return {
      id: ['comercial', 'variante', 'corta'][index],
      label: labels[index],
      mood,
      caption: variant.caption,
      hashtags: variant.hashtags,
      alts: variant.alts
    };
  });
}

module.exports = {
  composeCaptions,
  hashtagsFor,
  FAMILY_EMOJI
};
