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

const { NARANJA } = require('./storeCampaign');

const HOOKS = {
  gamer: [
    'La placa es la que decide si el juego corre.',
    'El setup se arma con el precio de hoy, no con el de la publicidad.',
    'Si jugás, mirá la GPU antes que el RGB.'
  ],
  office: [
    'La facultad no pide la notebook más cara. Pide la que no se cuelga.',
    'Para cursar y laburar, alcanza con esto. El precio es el de hoy.',
    'Pantalla, memoria y el precio que se cobra ahora.'
  ],
  phone: [
    'De día cualquier cámara se ve bien. La prueba es de noche.',
    'Si vas a cambiar el teléfono, este es el precio de hoy.',
    'La memoria y la pantalla, en una línea. El resto es marketing.'
  ],
  mix: [
    'Tres cosas distintas que hoy están en el depósito.',
    'No es un rubro solo: es lo que se puede retirar en Asunción.',
    'El precio de cada uno es el que se cobra hoy.'
  ],
  single: [
    'El dato que cambia la compra está en la primera línea.',
    'Un modelo, un precio, retiro en Asunción.',
    'Esto es lo que hay, con el precio de hoy.'
  ],
  promo: [
    'El precio tachado es el anterior. Hoy se cobra el de abajo.',
    'Bajó en la tienda. El porcentaje es el real, no uno inventado.',
    'La promo es esta. El tope es el precio que ves.'
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
  const punch = punchOf(product);
  if (product.showPrice === false) {
    return punch ? `${emoji} ${name} · ${punch}` : `${emoji} ${name}`;
  }
  const offer = offerOf(product);
  const asOf = product.priceAsOf ? `Precio al ${product.priceAsOf}` : 'Precio del día';
  if (offer) {
    return `${emoji} ${name}\nAntes ${offer.before} · Ahora ${offer.now} · -${offer.percent}% · ${asOf}`;
  }
  if (product.price) {
    const extra = punch ? ` · ${punch}` : '';
    return `${emoji} ${name}${extra}\n${asOf}: ${product.price}`;
  }
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
  const tags = ['#zenn', '#paraguay', '#asuncion'];
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
  const naranja = products.length > 0 && products.every((product) => product.scene === 'naranja');
  const hooks = naranja ? NARANJA.hooks : hooksFor(mood, voices);
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
      const naranja = list.every((product) => product.scene === 'naranja');
      variant.caption = [
        naranja
          ? NARANJA.hooks[0]
          : (mood === 'promo' ? 'El precio tachado es el anterior. Hoy se cobra el de abajo.' : variant.hook),
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

function communityTags(products) {
  const tags = ['#zenn', '#paraguay', '#asuncion'];
  const brands = [];
  for (const product of products) {
    const blob = `${product.title || ''} ${product.productName || ''} ${product.brandName || ''}`;
    const gamer = product.theme === 'gamer' || product.hasGpu || /gamer|gaming/i.test(blob);
    const brand = hashtagToken(product.brandName);
    if (brand) (gamer ? tags : brands).push(brand);
    if (product.family === 'mouse') tags.push(gamer ? '#mousegamer' : '#mouse');
    if (product.family === 'teclado') tags.push(gamer ? '#tecladogamer' : '#teclado');
    if (product.family === 'monitor') tags.push(gamer ? '#monitorgamer' : '#monitor');
    if (product.family === 'notebook') tags.push(gamer ? '#notebookgamer' : '#notebook');
    if (product.family === 'celular') tags.push('#celular');
    if (/auricular|headset/i.test(blob)) tags.push('#auriculares');
    if (/cable|adaptador|hub|funda|cargador|webcam|accesorio/i.test(blob)) tags.push('#accesorios');
    if (product.family && !['mouse', 'teclado', 'monitor', 'notebook', 'celular', 'general'].includes(product.family)) {
      const familyTag = hashtagToken(product.family);
      if (familyTag) tags.push(familyTag);
    }
  }
  tags.push(...brands);
  const unique = [];
  for (const tag of tags) {
    if (tag && !unique.includes(tag)) unique.push(tag);
    if (unique.length >= 8) break;
  }
  return unique;
}

function shelfName(product) {
  const name = norm(product.productName || product.title);
  if (name.length <= 90) return name;
  const cut = name.slice(0, 90);
  return (cut.replace(/\s+\S*$/, '') || cut).trim();
}

function specBits(product) {
  return (product.specs || [])
    .filter((spec) => spec && spec.text && !String(spec.text).endsWith('…'))
    .slice(0, 2)
    .map((spec) => spec.text)
    .join(' · ');
}

function offerBit(product) {
  if (product.showPrice === false || !product.price) return '';
  if (product.onOffer && product.listPrice && product.discountPercent) {
    return `${product.price} (antes ${product.listPrice}, -${product.discountPercent}%)`;
  }
  return product.price;
}

function communityCaption(products, intro) {
  const list = (products || []).filter(Boolean).slice(0, 10);
  if (!list.length) return '';
  const tags = communityTags(list);
  if (list.length === 1) {
    const product = list[0];
    const name = shelfName(product);
    const spec = specBits(product);
    const price = offerBit(product);
    const lead = String(intro || '').trim();
    return [
      lead || `${name}${spec ? `. ${spec}` : ''}.`,
      lead ? [spec, price ? `Hoy: ${price}` : ''].filter(Boolean).join('. ') : (price ? `Hoy: ${price}.` : ''),
      'Retiro en Asunción o entrega en 24 horas.',
      `WhatsApp ${WHATSAPP}`,
      '',
      tags.join(' ')
    ].filter((line) => line !== undefined).join('\n').replace(/\n{3,}/g, '\n\n');
  }
  const lines = list.map((product) => {
    const name = shelfName(product);
    const spec = specBits(product);
    const price = offerBit(product);
    const body = [name, spec].filter(Boolean).join(', ');
    return `• ${body}${price ? ` · ${price}` : ''}`;
  });
  return [
    intro,
    '',
    ...lines,
    '',
    'Retiro en Asunción o entrega en 24 horas.',
    `WhatsApp ${WHATSAPP}`,
    '',
    tags.join(' ')
  ].join('\n');
}

module.exports = {
  composeCaptions,
  communityCaption,
  hashtagsFor,
  FAMILY_EMOJI
};
