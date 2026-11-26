'use strict';

const { findOptionValue, normKey } = require('./tiendaNaranjaPlantillaSchema');

/**
 * Alias Visão/Zenn → código Magento de la plantilla TN.
 */
const ALIASES = {
  marca: ['marca', 'brand', 'brandname', 'fabricante'],
  modelo: ['modelo', 'model', 'model_name', 'modelo_del_producto'],
  color: ['color', 'colour', 'cor'],
  material: ['material'],
  garantia: ['garantia', 'garantía', 'warranty'],
  garantia_fabricante: ['garantia_fabricante', 'garantia do fabricante', 'garantia_del_fabricante'],
  linea: ['linea', 'línea', 'line', 'serie', 'series'],
  ano_lanzamiento: ['ano_lanzamiento', 'ano', 'año', 'year', 'anio_lanzamiento'],
  codigo_de_barras: ['codigo_de_barras', 'barcode', 'ean', 'gtin', 'upc'],
  voltaje: ['voltaje', 'voltage', 'voltagem'],
  sistema_operativo: ['sistema_operativo', 'sistema operacional', 'so', 'os', 'operating_system'],
  memoria_ram: ['memoria_ram', 'memoria', 'ram', 'memoria ram'],
  almacenamiento: [
    'almacenamiento',
    'espacio',
    'capacidad_de_almacenamiento',
    'storage',
    'disco ssd',
    'capacidad disco'
  ],
  procesador: ['procesador', 'cpu', 'chipset', 'processador'],
  tamano_pantalla: ['tamano_pantalla', 'tamaño_pantalla', 'pantalla', 'screen_size', 'tela'],
  resolucion: ['resolucion', 'resolución', 'resolution'],
  bateria: ['bateria', 'batería', 'battery'],
  tipo_de_carga: ['tipo_de_carga', 'tipo de carga'],
  generacion_procesador: ['generacion_procesador', 'generacion', 'generation'],
  tipo_ram: ['tipo_ram', 'tipo de ram', 'ram_type'],
  ssd: ['ssd', 'disco_ssd', 'unidad_ssd'],
  hdd: ['hdd', 'disco_hdd', 'disco_duro'],
  gpu: ['gpu', 'placa_de_video', 'tarjeta_grafica', 'graphics'],
  frecuencia_pantalla_hz: ['frecuencia_pantalla_hz', 'frecuencia', 'refresh_rate', 'hz'],
  teclado_retroiluminado: ['teclado_retroiluminado', 'backlit', 'teclado iluminado'],
  touchscreen: ['touchscreen', 'pantalla_tactil', 'touch'],
  dual_sim: ['dual_sim', 'dual sim'],
  esim: ['esim', 'e_sim'],
  version_android_ios: ['version_android_ios', 'version_so', 'ios_version'],
  tipo_pantalla: ['tipo_pantalla', 'tipo de pantalla'],
  camara_principal: ['camara_principal', 'camara trasera'],
  camara_frontal: ['camara_frontal', 'frontal'],
  bateria_mah: ['bateria_mah', 'mah'],
  potencia: ['potencia', 'power', 'watts'],
  capacidad: ['capacidad', 'capacity'],
  btu: ['btu'],
  ano_fabricacion: ['ano_fabricacion', 'año fabricacion', 'year']
};

/**
 * Atributos opcionales: solo se mandan si matchean _options.
 * marca NO está acá: siempre va brandName (Redragon, Corsair, etc.).
 * color/material/variaciones se completan aparte si TN las exige.
 */
const NO_FREE_TEXT = new Set([
  'voltaje',
  'sistema_operativo',
  'memoria_ram',
  'almacenamiento',
  'procesador',
  'resolucion',
  'tipo_de_carga',
  'conectividad',
  'incluye_accesorios',
  'bluetooth',
  'wifi',
  'nfc',
  'usb',
  'hdmi',
  'tipo_ram',
  'ssd',
  'hdd'
]);

/**
 * Colores TN (valores exactos de _options). Más específicos primero.
 * Sin \bred\b: “Red” en títulos = red/red (Conector de Red…), no color.
 */
const COLOR_PATTERNS = [
  [/\b(rosa\s*gold|rosegold)\b/i, 'Rosa Gold'],
  [/\b(gris\s*oscuro|dark\s*gr[ae]y|graphite|antracita|carbon)\b/i, 'Gris Oscuro'],
  [/\b(gris\s*claro|light\s*gr[ae]y|space\s*gr[ae]y)\b/i, 'Gris Claro'],
  [/\b(azul\s*marino|navy|marine\s*blue)\b/i, 'Azul Marino'],
  [/\b(verde\s*oscuro|dark\s*green)\b/i, 'Verde Oscuro'],
  [/\b(rojo\s*oscuro)\b/i, 'Rojo Oscuro'],
  [/\b(midnight|jet\s*black)\b/i, 'Negro'],
  [/\b(negr[oa]s?|black|pret[oa]s?)\b/i, 'Negro'],
  [/\b(blanc[oa]s?|white|branc[oa]s?)\b/i, 'Blanco'],
  [/\b(gris|gr[ae]y)\b/i, 'GRIS'],
  [/\b(plata|platead[oa]s?|silver)\b/i, 'Plateado'],
  [/\b(dorad[oa]s?|gold)\b/i, 'Dorado'],
  [/\b(roj[oa]s?|vermelh[oa]s?)\b/i, 'Rojo'],
  [/\b(azules?|blue)\b/i, 'Azul'],
  [/\b(verdes?|green)\b/i, 'Verde'],
  [/\b(rosad[oa]s?|rosa|pink)\b/i, 'Rosa'],
  [/\b(violeta|morad[oa]s?|purple|p[uú]rpura)\b/i, 'Violeta'],
  [/\b(naranja|anaranjad[oa]s?|orange)\b/i, 'Naranja'],
  [/\b(amarill[oa]s?|yellow)\b/i, 'Amarillo'],
  [/\b(marr[oó]n(?:es)?|brown)\b/i, 'Marron'],
  [/\b(beige)\b/i, 'BEIGE'],
  [/\b(celeste|sky\s*blue)\b/i, 'Celeste'],
  [/\b(cobre|copper)\b/i, 'Cobre'],
  [/\b(bronce|bronze)\b/i, 'Bronce'],
  [/\b(turquesa|turquoise)\b/i, 'Turquesa'],
  [/\b(fucsia|fuchsia|magenta)\b/i, 'Fucsia'],
  [/\b(lila|lavender)\b/i, 'Lila'],
  [/\b(bordo|borgo[nñ]a|burgundy)\b/i, 'Bordo'],
  [/\b(crema|cream)\b/i, 'Crema'],
  [/\b(transparent[ea]|trasparent[ea]|clear)\b/i, 'Transparente'],
  [/\b(multicolor|multi[\s-]?color)\b/i, 'Multicolor']
];

/** Frases del título que parecen color pero son series/eficiencia (no pintar). */
const COLOR_FALSE_POSITIVES = [
  /80\s*plus\s*(white|bronze|gold|silver|platinum|titanium)/gi,
  /\bwd\s*(green|purple|blue|black|gold|red|red\s*plus)\b/gi,
  /\b(western\s*digital|seagate|toshiba|samsung|kingston|crucial|macrovip)\s+(green|purple|blue|black|gold|red|white)\b/gi,
  /\b(green|purple|blue|black|gold|red)\s*(nvme|sata|ssd|hdd|pro|plus|sn\d)/gi,
  /\b(ironwolf|barracuda|firecuda)\b/gi
];

const VARIATION_DEFAULTS = {
  color: 'Negro',
  material: 'Plástico',
  tamano_hogar: 'CAMERA',
  medida: 'Universal',
  fragancia: 'Lavender Vainilla',
  ano_fabricacion: String(new Date().getFullYear()),
  talle: 'Talle único'
};

const BASE_CODES = new Set([
  'name', 'sku', 'short_description', 'description', 'price', 'qty', 'images', 'weight',
  'ts_dimensions_width', 'ts_dimensions_height', 'ts_dimensions_length',
  'special_price', 'special_from_date', 'special_to_date'
]);

function flattenSpecs(product) {
  const out = {};
  const bags = [product.specifications, product.technicalSpecifications];
  for (const bag of bags) {
    if (!bag || typeof bag !== 'object') continue;
    for (const [k, v] of Object.entries(bag)) {
      if (v == null || String(v).trim() === '') continue;
      out[normKey(k)] = String(v).trim();
    }
  }
  if (product.brandName) out.marca = String(product.brandName).trim();
  if (product.brandName) out.brand = String(product.brandName).trim();
  if (product.barcode) out.codigo_de_barras = String(product.barcode).trim();
  if (product.ean) out.codigo_de_barras = out.codigo_de_barras || String(product.ean).trim();
  return out;
}

function pickAlias(flat, aliases) {
  for (const alias of aliases) {
    const hit = flat[normKey(alias)];
    if (hit) return hit;
  }
  return '';
}

function normalizeStorageLike(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(tb|gb|mb)\b/i);
  if (!m) return '';
  const num = m[1].replace(',', '.');
  const unit = m[2].toUpperCase();
  return `${Number(num)} ${unit}`;
}

function normalizeRam(value) {
  return normalizeStorageLike(value);
}

function findFlatValueForCode(flat, tnCode) {
  const codeNorm = normKey(tnCode);
  if (!codeNorm) return '';
  if (flat[codeNorm]) return flat[codeNorm];
  const aliases = ALIASES[tnCode];
  if (aliases) {
    const hit = pickAlias(flat, aliases);
    if (hit) return hit;
  }
  return '';
}

function scrubColorFalsePositives(text) {
  let out = String(text || '');
  for (const re of COLOR_FALSE_POSITIVES) {
    out = out.replace(re, ' ');
  }
  return out;
}

function matchColorInText(text) {
  const hay = scrubColorFalsePositives(text);
  if (!hay.trim()) return '';

  // Convención Visão: color al final tras " - " → "… - Negro"
  const tail = hay.match(/[-–—]\s*([A-Za-zÁÉÍÓÚÜáéíóúüÑñ/ ]{2,40})\s*(?:\([^)]*\))?\s*$/);
  if (tail) {
    for (const [re, tone] of COLOR_PATTERNS) {
      if (re.test(tail[1])) return tone;
    }
  }

  // Color entre paréntesis: "(Blanco)"
  const parenMatches = [...hay.matchAll(/\(([^)]{2,40})\)/g)];
  for (const m of parenMatches) {
    for (const [re, tone] of COLOR_PATTERNS) {
      if (re.test(m[1])) return tone;
    }
  }

  for (const [re, tone] of COLOR_PATTERNS) {
    if (re.test(hay)) return tone;
  }
  return '';
}

/**
 * Lee color desde specs o del título (negro/blanco/rojo…).
 * Si no aparece → '' (el caller pone Negro por defecto en variaciones).
 */
function guessColorFromProduct(product) {
  const flat = flattenSpecs(product);
  if (flat.color) {
    const fromSpec = matchColorInText(flat.color) || flat.color;
    if (fromSpec) return fromSpec;
  }
  // Solo título (+ descripción corta). NO brandName (Redragon ≠ rojo).
  const title = String(product.productName || product.name || '');
  const desc = String(product.shortDescription || product.description || '').slice(0, 280);
  return matchColorInText(`${title} ${desc}`);
}

function resolveAttrValue(code, raw, schema) {
  const value = String(raw || '').trim();
  if (!value) return { value: '', matched: false };

  // Marca: siempre texto libre (Redragon, Satellite, Corsair, etc.).
  if (code === 'marca') {
    return { value, matched: true, freeText: true };
  }

  if (code === 'almacenamiento' || code === 'ssd' || code === 'hdd' || code === 'memoria_ram') {
    const normalized = code === 'memoria_ram' ? normalizeRam(value) : normalizeStorageLike(value);
    if (!normalized) return { value: '', matched: false, warning: 'no parece capacidad GB/TB' };
    const resolved = findOptionValue(code, normalized, schema);
    if (resolved.matched) return resolved;
    if (schema.optionsByCode.has(code) && schema.optionsByCode.get(code).size) {
      return { value: '', matched: false, warning: resolved.warning || 'fuera de _options' };
    }
    return { value: normalized, matched: true };
  }

  const resolved = findOptionValue(code, value, schema);
  const hasOptions = schema.optionsByCode.has(code) && schema.optionsByCode.get(code).size > 0;

  if (resolved.matched) return resolved;

  if (hasOptions || NO_FREE_TEXT.has(code)) {
    return { value: '', matched: false, warning: resolved.warning || 'valor no válido para TN' };
  }

  return { value, matched: false, freeText: true };
}

function mapAttributesForCodes(product, codes, schema) {
  const flat = flattenSpecs(product);
  const warnings = [];
  const matched = [];

  if (product.brandName) flat.marca = flat.marca || String(product.brandName).trim();
  if (product.barcode) flat.codigo_de_barras = flat.codigo_de_barras || String(product.barcode).trim();

  const out = {};
  for (const code of codes) {
    if (!code || BASE_CODES.has(code)) continue;

    let raw = findFlatValueForCode(flat, code);
    if (code === 'color' && !raw) raw = guessColorFromProduct(product);
    if (!raw) {
      out[code] = '';
      continue;
    }

    const resolved = resolveAttrValue(code, raw, schema);
    out[code] = resolved.value || '';
    if (resolved.value) matched.push(code);
    else if (resolved.warning) warnings.push(`${code}: ${resolved.warning} (${raw})`);
  }

  if (codes.includes('almacenamiento') && !out.almacenamiento && out.ssd) {
    out.almacenamiento = out.ssd;
  }

  return { attrs: out, warnings, matched };
}

/**
 * Variaciones TN: el portal exige valor en TODAS (error si falta color/medida/…).
 * Color: del título si aparece; si no → Negro (vacío = 1500+ errores).
 * Marca va aparte como texto libre.
 */
function ensureVariationDefaults(product, attrs, variationCodes, schema) {
  const out = { ...attrs };
  const filled = [];
  for (const code of variationCodes || []) {
    if (!code) continue;
    if (out[code]) continue;

    let candidate = VARIATION_DEFAULTS[code] || '';
    if (code === 'color') {
      candidate = guessColorFromProduct(product) || VARIATION_DEFAULTS.color;
    }
    if (!candidate) continue;
    const resolved = findOptionValue(code, candidate, schema);
    if (resolved.matched && resolved.value) {
      out[code] = resolved.value;
      filled.push(code);
      continue;
    }
    const opts = schema.optionsByCode.get(code);
    if (opts && opts.size) {
      out[code] = opts.values().next().value;
      filled.push(code);
    }
  }
  return { attrs: out, filled };
}

module.exports = {
  ALIASES,
  VARIATION_DEFAULTS,
  flattenSpecs,
  mapAttributesForCodes,
  ensureVariationDefaults,
  guessColorFromProduct,
  normalizeStorageLike
};
