'use strict';

const Product = require('../models/productModel');
const { askGeminiText, parseJson } = require('./communityAi');

const DEFAULT_KG = 1;
/** Peso a partir del cual delivery se encarece: hay que revisar a mano. */
const HEAVY_KG = 10;
/** Techo razonable para electrónica retail; por encima se descarta salvo spec de peso real. */
const MAX_TRUSTED_KG = 40;
/** Techo para estimaciones (categoría / IA): nunca inventar >10 kg. */
const MAX_ESTIMATED_KG = HEAVY_KG;

const SPEC_KEYS = [
  'peso',
  'peso_kg',
  'peso_neto',
  'peso_bruto',
  'peso_del_producto',
  'peso_del_equipo',
  'peso_aproximado',
  'weight',
  'weight_kg',
  'gross_weight',
  'net_weight'
];

/** Claves que parecen peso pero son capacidad / límite / densidad. */
const IGNORE_SPEC_KEYS = /capacidad|limite|l[ií]mite|carga|soportad|maxima|m[aá]xima|peso_soport|peso_max|max_load|load_capacity|densidad|dimensi|dimension|medida|bateria|bater[ií]a|resolucion|resoluci[oó]n|frecuencia|angulo|ángulo|brillo|memoria|pantalla|tamano|tama[nñ]o/;

const CATEGORY_KG = [
  [/pasta_termica|anteojos/, 0.08],
  [/pendrive|tarjetas_sd|micro_sd|lector_para_tarjetas/, 0.05],
  [/memoria_ram|mouse__|mouse_y_trackpad|airpods|webcam|adaptadores_wifi/, 0.15],
  [/hub__|adaptadores__|cables_|filtro_de_linea|cargadores_baterias|placa_pci|placa_de_sonido/, 0.2],
  [/teclado|ssd__|cartuchos|mousepad|microfono|pulseras|accesorios_para_celulares/, 0.35],
  [/auriculares|audio__|reloj_inteligente|apple_watch|cooler_para_cpu|cooler_para_notebook/, 0.4],
  [/smartphones|iphone|telefonos|radio_comunicador|rastreador/, 0.35],
  [/tablets|ipad|disco_duro_externo|disco_duro_interno|disco_duro_pull/, 0.6],
  [/placas_madre|tarjetas_graficas|cpu_|water_cooler|fuente_cargador|fuentes_de_alimentacion/, 1.1],
  [/gabinetes|nobreak|impresoras_|proyectores|lector_de_codigo|contador_de_billetes/, 6],
  [/notebook|macbook|mini_pc|computadoras/, 2.2],
  [/monitores|soporte_para_monitores|soporte_para_tv/, 4.5],
  [/tv__/, 8],
  [/sillas_gamer/, 9.5],
  [/servidores|pc_montado/, 9],
  [/mochilas/, 0.8],
  [/aire_acondicionado/, 9.5],
  [/electrodomesticos|secadora|cubiertos/, 3],
  [/camaras_de_vigilancia|cctv|camaras_de_accion|drones/, 0.7],
  [/consolas|controles_/, 2],
  [/patinetas|scooter/, 9],
  [/cofres|balanza|herramientas/, 4]
];

function toNumber(text) {
  const raw = String(text || '').trim();
  if (!raw) return NaN;
  if (raw.includes(',') && raw.includes('.')) {
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    if (lastComma > lastDot) return Number(raw.replace(/\./g, '').replace(',', '.'));
    return Number(raw.replace(/,/g, ''));
  }
  if (raw.includes(',')) return Number(raw.replace(',', '.'));
  return Number(raw);
}

function normalizeKg(value, { allowHeavySpec = false } = {}) {
  let kg = Number(value);
  if (!Number.isFinite(kg) || kg <= 0) return null;
  // Enteros altos tipo 250 / 1500 suelen venir en gramos.
  if (kg > 100 && kg <= 80000) kg /= 1000;
  const max = allowHeavySpec ? 120 : MAX_TRUSTED_KG;
  if (kg > max || kg < 0.03) return null;
  return Math.round(kg * 1000) / 1000;
}

function parseWeightKg(raw, opts) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return normalizeKg(raw, opts);
  const text = String(raw).trim().toLowerCase();
  // Densidad (ej. espuma 50KG/m3) no es peso del producto.
  if (/kg\s*\/\s*m|g\s*\/\s*m|kg\/m3|g\/cm/.test(text)) return null;
  // Dimensiones con "mm x … x 70 kg" (typo) — no usar.
  if (/\d+\s*mm/.test(text) && /\d+(?:[.,]\d+)?\s*kg/.test(text)) return null;

  const grams = text.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|gramos?)\b/);
  if (grams) return normalizeKg(toNumber(grams[1]) / 1000, opts);
  const kilos = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?)\b/);
  if (kilos) return normalizeKg(toNumber(kilos[1]), opts);
  const lone = text.match(/^(\d+(?:[.,]\d+)?)$/);
  if (lone) return normalizeKg(toNumber(lone[1]), opts);
  return null;
}

function specsOf(product) {
  const a = product.specifications && typeof product.specifications === 'object' ? product.specifications : {};
  const b = product.technicalSpecifications && typeof product.technicalSpecifications === 'object'
    ? product.technicalSpecifications
    : {};
  return { ...a, ...b };
}

function fromSpecs(product) {
  const specs = specsOf(product);
  for (const key of SPEC_KEYS) {
    if (specs[key] != null) {
      const kg = parseWeightKg(specs[key], { allowHeavySpec: true });
      if (kg) return kg;
    }
  }
  // Solo claves que digan peso/weight — nunca capacidad_maxima ni dimensiones.
  for (const [key, value] of Object.entries(specs)) {
    const keyLow = String(key || '').toLowerCase();
    if (IGNORE_SPEC_KEYS.test(keyLow)) continue;
    if (!/peso|weight/.test(keyLow)) continue;
    if (SPEC_KEYS.includes(keyLow)) continue;
    const kg = parseWeightKg(value, { allowHeavySpec: true });
    if (kg) return kg;
  }
  return null;
}

function fromCategory(product) {
  const key = `${product.subcategory || ''} ${product.category || ''} ${product.productName || ''}`.toLowerCase();
  for (const [pattern, kg] of CATEGORY_KG) {
    if (pattern.test(key)) return Math.min(kg, MAX_ESTIMATED_KG);
  }
  return null;
}

function formatTnWeight(kg) {
  const value = normalizeKg(kg) || DEFAULT_KG;
  return value.toFixed(3).replace(/\.?0+$/, '') || '1';
}

function estimateWeight(product) {
  const spec = fromSpecs(product);
  if (spec) return { kg: spec, source: 'spec' };
  const category = fromCategory(product);
  if (category) return { kg: category, source: 'category' };
  return { kg: DEFAULT_KG, source: 'default' };
}

/**
 * Peso efectivo para TN + metadatos de revisión.
 * Si el guardado es absurdo o quedó de un parse viejo, se reestima en weightMeta solo si no hay saved válido.
 */
function weightMeta(product) {
  const savedRaw = Number(product && product.shippingWeightKg);
  const source = String((product && product.shippingWeightSource) || '').trim() || 'saved';
  // Spec real puede superar 40 (TV grandes); el resto no.
  const saved = source === 'spec'
    ? normalizeKg(savedRaw, { allowHeavySpec: true })
    : normalizeKg(savedRaw);

  if (saved) {
    return {
      kg: saved,
      source,
      heavy: saved > HEAVY_KG,
      alert: saved > HEAVY_KG ? 'REVISAR_PESO_GT_10KG' : ''
    };
  }
  const guessed = estimateWeight(product || {});
  return {
    kg: guessed.kg,
    source: guessed.source,
    heavy: guessed.kg > HEAVY_KG,
    alert: guessed.kg > HEAVY_KG ? 'REVISAR_PESO_GT_10KG' : ''
  };
}

async function listHeavyWeights({ minKg = HEAVY_KG, onlyStock = true, limit = 500 } = {}) {
  const filter = {
    codigo: { $exists: true, $nin: ['', null] },
    productName: { $exists: true, $nin: ['', null] }
  };
  if (onlyStock) {
    filter.stock = { $gt: 0 };
    filter.stockStatus = { $ne: 'out_of_stock' };
  }
  const products = await Product.find(filter)
    .select('codigo productName brandName category subcategory shippingWeightKg shippingWeightSource specifications technicalSpecifications stock')
    .sort({ shippingWeightKg: -1, codigo: 1 })
    .lean();
  const items = [];
  for (const product of products) {
    const meta = weightMeta(product);
    if (meta.kg <= minKg) continue;
    items.push({
      codigo: product.codigo,
      productName: product.productName,
      brandName: product.brandName || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      stock: product.stock,
      pesoKg: meta.kg,
      fuente: meta.source,
      alerta: meta.alert
    });
    if (limit > 0 && items.length >= limit) break;
  }
  items.sort((a, b) => b.pesoKg - a.pesoKg);
  return {
    minKg,
    total: items.length,
    items
  };
}

async function guessWeightsAi(products) {
  if (!products.length) return new Map();
  const lines = products.map((item) => (
    `${item.codigo} | ${item.subcategory || ''} | ${item.brandName || ''} | ${String(item.productName || '').slice(0, 120)}`
  )).join('\n');
  const prompt = `Estimá el peso de empaque en kilogramos de estos productos de electrónica. Devolvé solo JSON:
{"items":[{"codigo":"123","kg":0.35}]}
Usá punto decimal, nunca coma. Si no sabés, kg=1. Entre 0.05 y ${MAX_ESTIMATED_KG}.
Nunca uses capacidad de carga (soportes, balanzas) ni inventes pesos >${MAX_ESTIMATED_KG} kg.
${lines}`;
  const raw = parseJson(await askGeminiText(prompt, true, 25000)) || {};
  const map = new Map();
  for (const row of raw.items || []) {
    let kg = normalizeKg(row && row.kg);
    if (kg && kg > MAX_ESTIMATED_KG) kg = MAX_ESTIMATED_KG;
    if (row && row.codigo && kg) map.set(String(row.codigo), kg);
  }
  return map;
}

function needsWeight(product) {
  const kg = Number(product.shippingWeightKg);
  return !Number.isFinite(kg) || kg <= 0;
}

async function fillMissingWeights({ useAi = false, limit = 0 } = {}) {
  const filter = {
    $or: [
      { shippingWeightKg: { $exists: false } },
      { shippingWeightKg: null },
      { shippingWeightKg: { $lte: 0 } }
    ]
  };
  const query = Product.find(filter)
    .select('codigo productName brandName category subcategory specifications technicalSpecifications shippingWeightKg')
    .lean();
  if (limit > 0) query.limit(limit);
  const products = await query;
  if (!products.length) return { scanned: 0, updated: 0, ai: 0, defaulted: 0 };
  let aiMap = new Map();
  if (useAi) {
    const leftover = products.filter((item) => !fromSpecs(item) && !fromCategory(item)).slice(0, 40);
    if (leftover.length) {
      try {
        aiMap = await guessWeightsAi(leftover);
      } catch (error) {
        console.error('[tn peso] ia', error.message || error);
      }
    }
  }
  const ops = [];
  let defaulted = 0;
  let ai = 0;
  for (const product of products) {
    const guessed = estimateWeight(product);
    let kg = guessed.kg;
    let source = guessed.source;
    if (source === 'default' && aiMap.has(String(product.codigo))) {
      kg = aiMap.get(String(product.codigo));
      source = 'ai';
      ai += 1;
    }
    if (source !== 'spec' && kg > MAX_ESTIMATED_KG) kg = MAX_ESTIMATED_KG;
    if (source === 'default') defaulted += 1;
    ops.push({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { shippingWeightKg: kg, shippingWeightSource: source } }
      }
    });
  }
  if (ops.length) await Product.bulkWrite(ops, { ordered: false });
  return { scanned: products.length, updated: ops.length, ai, defaulted };
}

/**
 * Recalcula pesos dudosos: >10 kg o fuente spec/ai/category vieja.
 * Corrige capacidad_maxima mal leída como peso, tipografías en dimensiones, etc.
 */
async function recheckSuspiciousWeights({ minKg = HEAVY_KG, limit = 0, useAi = false } = {}) {
  const filter = {
    $or: [
      { shippingWeightKg: { $gt: minKg } },
      { shippingWeightSource: { $in: ['spec', 'ai'] }, shippingWeightKg: { $gt: 5 } }
    ]
  };
  const query = Product.find(filter)
    .select('codigo productName brandName category subcategory specifications technicalSpecifications shippingWeightKg shippingWeightSource')
    .lean();
  if (limit > 0) query.limit(limit);
  const products = await query;
  if (!products.length) {
    return { scanned: 0, updated: 0, fixed: 0, stillHeavy: 0, samples: [] };
  }

  let aiMap = new Map();
  if (useAi) {
    const leftover = products.filter((item) => !fromSpecs(item) && !fromCategory(item)).slice(0, 40);
    if (leftover.length) {
      try {
        aiMap = await guessWeightsAi(leftover);
      } catch (error) {
        console.error('[tn peso] recheck ia', error.message || error);
      }
    }
  }

  const ops = [];
  const samples = [];
  let fixed = 0;
  let stillHeavy = 0;

  for (const product of products) {
    const prev = Number(product.shippingWeightKg);
    let guessed = estimateWeight(product);
    let kg = guessed.kg;
    let source = guessed.source;

    if (source === 'default' && aiMap.has(String(product.codigo))) {
      kg = aiMap.get(String(product.codigo));
      source = 'ai';
    }
    if (source !== 'spec' && kg > MAX_ESTIMATED_KG) {
      kg = MAX_ESTIMATED_KG;
    }

    const changed = !Number.isFinite(prev) || Math.abs(prev - kg) > 0.001 || product.shippingWeightSource !== source;
    if (changed) {
      fixed += 1;
      ops.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { shippingWeightKg: kg, shippingWeightSource: source } }
        }
      });
      if (samples.length < 40) {
        samples.push({
          codigo: product.codigo,
          productName: product.productName,
          before: prev,
          after: kg,
          fuente: source
        });
      }
    }
    if (kg > HEAVY_KG) stillHeavy += 1;
  }

  if (ops.length) await Product.bulkWrite(ops, { ordered: false });
  return {
    scanned: products.length,
    updated: ops.length,
    fixed,
    stillHeavy,
    samples
  };
}

function hideShippingWeight(product) {
  if (!product || typeof product !== 'object') return product;
  const copy = { ...product };
  delete copy.shippingWeightKg;
  delete copy.shippingWeightSource;
  return copy;
}

module.exports = {
  DEFAULT_KG,
  HEAVY_KG,
  MAX_TRUSTED_KG,
  MAX_ESTIMATED_KG,
  parseWeightKg,
  normalizeKg,
  formatTnWeight,
  estimateWeight,
  weightMeta,
  listHeavyWeights,
  recheckSuspiciousWeights,
  guessWeightsAi,
  needsWeight,
  fillMissingWeights,
  hideShippingWeight
};
