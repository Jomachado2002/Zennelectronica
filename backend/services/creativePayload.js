'use strict';

const C = {
  navy: '#1E1B4B',
  purple: '#7B2CBF',
  cyan: '#00B5D8',
  gray: '#E8EAED',
  dark: '#111827',
  muted: '#6B7280'
};

const GAMER_BRANDS = /redragon|razer|corsair|logitech|hyperx|cooler master|msi/i;
const DEDICATED_GPU = /\b(rtx\s?\d{3,4}|gtx\s?\d{3,4}|rx\s?\d{3,4}|geforce|radeon\s*rx|nvidia\s*(rtx|gtx)|arc\s*[ab]?\d{3})/i;
const INTEGRATED_GPU = /\b(uhd|iris(\s*xe)?|intel\s*graphics|integrated|integrad[ao]|vega\s*\d{0,2}\b(?!\s*rx))/i;
const SPEC_STOP = /\b(intel|amd|ryzen|core|ultra|celeron|pentium|snapdragon|ram|ddr\d?|gb|tb|ssd|hdd|nvme|hdd|full\s*hd|fhd|uhd|oled|ips|va|hz|windows|win\s*11|w11|android|lte|5g)\b/i;
const TITLE_NOISE = /\b(notebook|laptop|port[aá]til|monitor|smartphone|celular|tablet|gamer|gaming|oficial|paraguay|nuevo|original|importado)\b/gi;

function norm(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function flattenSpecs(product) {
  const out = {};
  const add = (key, value) => {
    if (value == null) return;
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        const text = value.map((x) => (typeof x === 'object' ? '' : String(x))).filter(Boolean).join(' ');
        if (text) out[String(key).toLowerCase()] = text;
      }
      return;
    }
    const text = String(value).trim();
    if (!text || text === 'undefined' || text === 'null') return;
    out[String(key).toLowerCase()] = text;
  };

  const direct = [
    'processor', 'memory', 'storage', 'disk', 'graphicsCard', 'graphicCardModel', 'notebookScreen', 'notebookBattery',
    'monitorSize', 'monitorResolution', 'monitorRefreshRate', 'monitorPanel', 'monitorPanelType', 'monitorConnectivity',
    'phoneProcessor', 'phoneRAM', 'phoneStorage', 'phoneScreenSize', 'phoneBattery',
    'tabletProcessor', 'tabletRAM', 'tabletStorage', 'tabletScreenSize',
    'ramCapacity', 'ramType', 'ramSpeed', 'hddCapacity', 'diskType',
    'keyboardSwitches', 'mouseDPI', 'psuWattage', 'processorCores',
    'caseFormFactor', 'caseMaterial', 'caseIncludedFans', 'caseBacklight',
    'headphoneConnectionType', 'headphoneTechnology', 'headphoneNoiseCancel', 'headphoneBatteryLife'
  ];
  for (const key of direct) add(key, product[key]);

  for (const map of [product.specifications, product.technicalSpecifications]) {
    if (!map || typeof map !== 'object' || Array.isArray(map)) continue;
    for (const [key, value] of Object.entries(map)) add(key, value);
  }
  return out;
}

function pickSpec(flat, aliases) {
  for (const alias of aliases) {
    const key = alias.toLowerCase();
    if (flat[key]) return compactSpec(flat[key]);
  }
  for (const [key, value] of Object.entries(flat)) {
    if (aliases.some((a) => key.includes(a.toLowerCase()))) return compactSpec(value);
  }
  return '';
}

function compactSpec(raw) {
  let t = norm(raw);
  t = t.replace(/\bwindows\s*11(\s*home)?\b/gi, 'Win11');
  t = t.replace(/\bfull\s*hd\b/gi, 'FHD');
  t = t.replace(/\bintel\s+core\s+/gi, '');
  t = t.replace(/\bnvidia\s+(geforce\s+)?/gi, '');
  t = t.replace(/\bddr[45]\b/gi, 'RAM');
  t = t.replace(/\s{2,}/g, ' ').trim();
  const gpu = t.match(/\b((?:rtx|gtx)\s*\d{3,4}|rx\s*\d{3,4})/i);
  if (gpu) return gpu[1].replace(/\s+/g, ' ').toUpperCase();
  const cpu = t.match(/\b(i[3579]|ultra\s*\d)(?:-|\s)?\d{0,5}/i) || t.match(/\bryzen\s*[3579]/i) || t.match(/\bm[1-4](\s*(pro|max|ultra))?/i);
  if (cpu && /i[3579]|ultra|ryzen|m[1-4]/i.test(t)) return cpu[0].replace(/\s+/g, ' ');
  const ram = t.match(/(\d+)\s*gb/i);
  if (ram && /ram|memoria|ddr/i.test(t)) return `${ram[1]}GB`;
  const disk = t.match(/(\d+)\s*(tb|gb)\s*(ssd|nvme)?/i);
  if (disk && /ssd|nvme|disco|storage|tb|512|256|1024/i.test(t)) {
    return `${disk[1]}${disk[2].toUpperCase()}${disk[3] ? ' SSD' : ''}`.trim();
  }
  const hz = t.match(/(\d{2,3})\s*hz/i);
  if (hz) return `${hz[1]}Hz`;
  const inch = t.match(/(\d{2}(?:\.\d)?)\s*("|''|pulg)/i);
  if (inch) return `${inch[1]}"`;
  if (/^\d{2}(\.\d)?$/.test(t) && Number(t) >= 11 && Number(t) <= 49) return `${t}"`;
  if (t.length > 16) t = t.slice(0, 16).trim();
  return t;
}

function punchSpec(spec) {
  const icon = spec.icon || '';
  const t = norm(spec.text);
  if (icon === 'gpu') {
    const m = t.match(/\b((?:rtx|gtx)\s*\d{3,4}|rx\s*\d{3,4})/i);
    return m ? m[1].replace(/\s+/g, ' ').toUpperCase() : t.slice(0, 12);
  }
  if (icon === 'ram') {
    const m = t.match(/(\d+)\s*gb/i);
    return m ? `${m[1]}GB` : t.slice(0, 8);
  }
  if (icon === 'ssd') {
    const m = t.match(/(\d+)\s*(gb|tb)/i);
    return m ? `${m[1]}${m[2].toUpperCase()}` : t.slice(0, 8);
  }
  if (icon === 'cpu') {
    const m = t.match(/\b(i[3579]|ultra\s*\d)/i) || t.match(/\bryzen\s*[3579]/i) || t.match(/\bm[1-4]/i);
    return m ? m[0].replace(/\s+/g, ' ') : t.slice(0, 10);
  }
  if (icon === 'hz') {
    const m = t.match(/(\d{2,3})\s*hz/i);
    return m ? `${m[1]}Hz` : t.slice(0, 8);
  }
  if (icon === 'screen') {
    const m = t.match(/(\d{2}(?:\.\d)?)/);
    return m ? `${m[1]}"` : t.slice(0, 8);
  }
  if (icon === 'res') {
    if (/4k|uhd/i.test(t)) return '4K';
    if (/qhd|1440/i.test(t)) return 'QHD';
    if (/fhd|1080/i.test(t)) return 'FHD';
    return t.slice(0, 8);
  }
  return t.slice(0, 12);
}

function gpuBlob(product) {
  const flat = flattenSpecs(product);
  return [
    product.graphicsCard,
    product.graphicCardModel,
    product.productName,
    pickSpec(flat, ['graphicscard', 'gpu', 'grafica', 'video', 'tarjeta'])
  ].filter(Boolean).join(' ');
}

function hasDedicatedGpu(product) {
  const blob = gpuBlob(product);
  if (DEDICATED_GPU.test(blob)) return true;
  if (INTEGRATED_GPU.test(blob)) return false;
  const family = detectFamily(product);
  if (family !== 'notebook') return false;
  const name = String(product.productName || '').toLowerCase();
  return /\b(gamer|gaming)\b/.test(name);
}

function detectFamily(product) {
  const blob = `${product.category || ''} ${product.subcategory || ''} ${product.productName || ''}`.toLowerCase();
  if (blob.includes('notebook') || blob.includes('macbook')) return 'notebook';
  if (blob.includes('monitor')) return 'monitor';
  if (blob.includes('iphone') || blob.includes('smartphone') || blob.includes('celular')) return 'celular';
  if (blob.includes('airpod') || blob.includes('auricular') || blob.includes('headset') || blob.includes('headphone')) return 'auricular';
  if (blob.includes('gabinete')) return 'gabinete';
  if (blob.includes('tablet') || blob.includes('ipad')) return 'tablet';
  if (blob.includes('teclado') || blob.includes('keyboard')) return 'teclado';
  if (blob.includes('mouse')) return 'mouse';
  if (blob.includes('gamer') || blob.includes('gpu') || blob.includes('tarjeta_grafica')) return 'gamer';
  return 'general';
}

const FAMILY_SPECS = {
  notebook: [
    { icon: 'cpu', aliases: ['processor', 'procesador', 'cpu'] },
    { icon: 'ram', aliases: ['memory', 'memoria', 'ram', 'ramcapacity'] },
    { icon: 'ssd', aliases: ['storage', 'almacenamiento', 'ssd', 'disco', 'disk'] },
    { icon: 'screen', aliases: ['notebookscreen', 'pantalla', 'screen'] }
  ],
  notebookGamer: [
    { icon: 'cpu', aliases: ['processor', 'procesador', 'cpu'] },
    { icon: 'gpu', aliases: ['graphicscard', 'graphiccardmodel', 'gpu', 'grafica', 'video'] },
    { icon: 'ram', aliases: ['memory', 'memoria', 'ram', 'ramcapacity'] },
    { icon: 'ssd', aliases: ['storage', 'almacenamiento', 'ssd', 'disco', 'disk'] }
  ],
  monitor: [
    { icon: 'screen', aliases: ['monitorsize', 'tamano', 'tamaño', 'pulgadas', 'size'] },
    { icon: 'res', aliases: ['monitorresolution', 'resolucion', 'resolución', 'resolution'] },
    { icon: 'hz', aliases: ['monitorrefreshrate', 'frecuencia', 'hz', 'refresh'] },
    { icon: 'panel', aliases: ['monitorpanel', 'monitorpaneltype', 'panel'] }
  ],
  celular: [
    { icon: 'cpu', aliases: ['phoneprocessor', 'processor', 'procesador'] },
    { icon: 'ram', aliases: ['phoneram', 'memory', 'ram'] },
    { icon: 'ssd', aliases: ['phonestorage', 'storage', 'almacenamiento'] },
    { icon: 'screen', aliases: ['phonescreensize', 'pantalla', 'screen'] }
  ],
  tablet: [
    { icon: 'screen', aliases: ['tabletscreensize', 'pantalla'] },
    { icon: 'ram', aliases: ['tabletram', 'memory', 'ram'] },
    { icon: 'ssd', aliases: ['tabletstorage', 'storage'] },
    { icon: 'cpu', aliases: ['tabletprocessor', 'processor'] }
  ],
  teclado: [
    { icon: 'cpu', aliases: ['keyboardswitches', 'switch', 'switches'] },
    { icon: 'panel', aliases: ['keyboardlayout', 'layout'] },
    { icon: 'panel', aliases: ['keyboardinterface', 'interface'] }
  ],
  mouse: [
    { icon: 'hz', aliases: ['mousedpi', 'dpi'] },
    { icon: 'panel', aliases: ['mousesensor', 'sensor'] },
    { icon: 'panel', aliases: ['mouseinterface', 'interface'] }
  ],
  gamer: [
    { icon: 'gpu', aliases: ['graphicscard', 'gpu'] },
    { icon: 'cpu', aliases: ['processor', 'procesador'] },
    { icon: 'ram', aliases: ['memory', 'ram'] },
    { icon: 'ssd', aliases: ['storage', 'ssd'] }
  ],
  gabinete: [
    { icon: 'panel', aliases: ['caseformfactor', 'formfactor', 'formato'] },
    { icon: 'hz', aliases: ['caseincludedfans', 'fans', 'ventiladores'] },
    { icon: 'panel', aliases: ['casematerial', 'material'] },
    { icon: 'gpu', aliases: ['casebacklight', 'rgb', 'iluminacion'] }
  ],
  auricular: [
    { icon: 'panel', aliases: ['headphoneconnectiontype', 'conexion', 'wireless', 'bluetooth'] },
    { icon: 'hz', aliases: ['headphonetechnology', 'tecnologia', 'driver'] },
    { icon: 'cpu', aliases: ['headphonenoisecancel', 'noise', 'anc'] },
    { icon: 'ram', aliases: ['headphonebatterylife', 'bateria', 'autonomia'] }
  ],
  general: [
    { icon: 'cpu', aliases: ['processor', 'procesador', 'model'] },
    { icon: 'ram', aliases: ['memory', 'ram', 'capacidad'] },
    { icon: 'ssd', aliases: ['storage', 'almacenamiento'] },
    { icon: 'screen', aliases: ['pantalla', 'screen'] }
  ]
};

const FAMILY_LABEL = {
  notebook: 'NOTEBOOK',
  monitor: 'MONITOR',
  celular: 'CELULAR',
  tablet: 'TABLET',
  teclado: 'TECLADO',
  mouse: 'MOUSE',
  gabinete: 'GABINETE',
  auricular: 'AURICULAR',
  gamer: 'GAMER',
  general: 'TECNOLOGÍA'
};

function collectSpecs(product, family, hasGpu) {
  const specFamily = family === 'notebook' && hasGpu ? 'notebookGamer' : family;
  const flat = flattenSpecs(product);
  const rules = FAMILY_SPECS[specFamily] || FAMILY_SPECS.general;
  const seen = new Set();
  const specs = [];
  for (const rule of rules) {
    const text = pickSpec(flat, rule.aliases);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    specs.push({ icon: rule.icon, text });
    if (specs.length >= 4) break;
  }
  return specs;
}

function shortTitle(product, maxChars = 42) {
  const brand = norm(product.brandName);
  let name = norm(product.productName);
  name = name.replace(/^[A-Z0-9._-]{5,}[\s/]+/i, '');
  if (brand) {
    const re = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    name = name.replace(re, '');
  }
  name = name.replace(TITLE_NOISE, ' ').replace(/\s{2,}/g, ' ').trim();

  const tokens = name.split(' ').filter(Boolean);
  const kept = [];
  for (const token of tokens) {
    if (SPEC_STOP.test(token) && kept.length >= 2) break;
    kept.push(token);
    const candidate = (brand ? `${brand} ${kept.join(' ')}` : kept.join(' ')).trim();
    if (candidate.length >= maxChars) break;
    if (kept.length >= 6) break;
  }

  let title = (brand ? `${brand} ${kept.join(' ')}` : kept.join(' ')).trim();
  title = displayTitle(title, brand);
  if (!title) title = brand || norm(product.productName).slice(0, maxChars);
  if (title.length > maxChars) title = `${title.slice(0, maxChars - 1).trim()}…`;
  return title;
}

function displayTitle(title, brand) {
  const tokens = title.split(' ').filter(Boolean);
  return tokens
    .map((token, i) => {
      if (brand && i === 0 && token.toLowerCase() === brand.toLowerCase()) return brand;
      if (/[0-9]/.test(token) || token.length <= 3) return token.toUpperCase();
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(' ');
}

function formatGs(n) {
  const num = Number(n) || 0;
  return `Gs. ${Math.round(num).toLocaleString('es-PY')}`;
}

function detectTheme(product, family) {
  if (hasDedicatedGpu(product)) return 'gamer';
  const brand = String(product.brandName || '');
  const blob = `${product.productName || ''} ${product.subcategory || ''}`.toLowerCase();
  if (GAMER_BRANDS.test(brand) || blob.includes('gamer') || blob.includes('rgb')) return 'gamer';
  if ((family === 'teclado' || family === 'mouse') && (GAMER_BRANDS.test(brand) || blob.includes('gamer'))) {
    return 'gamer';
  }
  return 'studio';
}

function categoryKicker(product, family, hasGpu) {
  const brand = norm(product.brandName).toUpperCase();
  if (family === 'celular' && (/iphone/.test(String(product.productName || '').toLowerCase()) || String(product.subcategory || '') === 'iphone__19_04')) {
    return 'IPHONE  ·  APPLE';
  }
  if (family === 'notebook') {
    return hasGpu ? 'NOTEBOOK  ·  GAMING CON GPU' : 'NOTEBOOK  ·  ESTUDIO Y OFICINA';
  }
  if (hasGpu && (family === 'gamer' || family === 'general')) return 'GAMING  ·  GPU DEDICADA';
  return brand ? `${FAMILY_LABEL[family] || 'TECNOLOGÍA'}  ·  ${brand}` : FAMILY_LABEL[family];
}

function firstImages(product, max = 5) {
  const list = Array.isArray(product.productImage) ? product.productImage : [];
  return list
    .filter((u) => typeof u === 'string' && u.trim())
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u) || u.startsWith('//') || u.startsWith('/'))
    .map((u) => (u.startsWith('//') ? `https:${u}` : u))
    .slice(0, max);
}

function instagramCaption(payload) {
  let title = payload.title || payload.productName || 'Zenn';
  if (title.length > 28) title = `${title.slice(0, 27).trim()}…`;

  const specs = payload.specs || [];
  const prefer = payload.family === 'notebook' && payload.hasGpu
    ? ['gpu', 'ram', 'ssd']
    : payload.family === 'notebook'
      ? ['cpu', 'ram', 'ssd']
      : payload.family === 'monitor'
        ? ['screen', 'hz', 'res']
        : payload.family === 'celular'
          ? ['ssd', 'ram', 'cpu']
          : [];
  const picked = (prefer.length
    ? prefer.map((k) => specs.find((s) => s.icon === k)).filter(Boolean)
    : specs
  ).slice(0, 3);
  const specLine = picked.map(punchSpec).filter(Boolean).join(' · ');

  return [
    title,
    specLine,
    `${payload.price} · 24 h`,
    'WhatsApp 0973 345 284'
  ].filter(Boolean).join('\n');
}

function resolveTheme(requested, product, family) {
  if (requested === 'studio' || requested === 'gamer') return requested;
  return detectTheme(product, family);
}

function buildCreativePayload(product, options = {}) {
  const family = detectFamily(product);
  const hasGpu = hasDedicatedGpu(product);
  const theme = resolveTheme(options.theme, product, family);
  const images = firstImages(product);
  const imageIndex = Math.max(0, Math.min(Number(options.imageIndex) || 0, Math.max(0, images.length - 1)));
  const title = norm(options.title) || shortTitle(product);

  const payload = {
    id: String(product._id),
    codigo: product.codigo || '',
    slug: product.slug || '',
    brandName: norm(product.brandName),
    productName: norm(product.productName),
    family,
    hasGpu,
    theme,
    categoryLabel: hasGpu && family === 'notebook' ? 'GAMING' : (FAMILY_LABEL[family] || 'TECNOLOGÍA'),
    kicker: categoryKicker(product, family, hasGpu),
    title,
    specs: collectSpecs(product, family, hasGpu),
    price: formatGs(product.sellingPrice || product.price),
    sellingPrice: product.sellingPrice || product.price || 0,
    cta: options.cta || (options.format === 'story' ? 'Escribí al WhatsApp' : 'Comprá en zenn.com.py'),
    imageUrl: images[imageIndex] || images[0] || '',
    images,
    imageIndex,
    stock: product.stock || 0,
    whatsapp: '0973 345 284',
    site: 'zenn.com.py',
    colors: C
  };
  payload.instagramCaption = instagramCaption(payload);
  return payload;
}

function listSelectFields() {
  return [
    'productName', 'brandName', 'category', 'subcategory', 'productImage',
    'sellingPrice', 'price', 'codigo', 'stock', 'slug',
    'processor', 'memory', 'storage', 'disk', 'graphicsCard', 'graphicCardModel', 'notebookScreen', 'notebookBattery',
    'monitorSize', 'monitorResolution', 'monitorRefreshRate', 'monitorPanel', 'monitorPanelType',
    'phoneProcessor', 'phoneRAM', 'phoneStorage', 'phoneScreenSize',
    'tabletProcessor', 'tabletRAM', 'tabletStorage', 'tabletScreenSize',
    'ramCapacity', 'keyboardSwitches', 'mouseDPI',
    'caseFormFactor', 'caseMaterial', 'caseIncludedFans', 'caseBacklight',
    'headphoneConnectionType', 'headphoneTechnology', 'headphoneNoiseCancel', 'headphoneBatteryLife',
    'specifications', 'technicalSpecifications'
  ].join(' ');
}

module.exports = {
  buildCreativePayload,
  shortTitle,
  detectFamily,
  detectTheme,
  formatGs,
  hasDedicatedGpu,
  instagramCaption,
  listSelectFields,
  FORMATS: {
    feed: { w: 1080, h: 1350, label: 'Feed IG 4:5' },
    story: { w: 1080, h: 1920, label: 'Story 9:16' },
    square: { w: 1080, h: 1080, label: 'Cuadrado 1:1' }
  }
};
