'use strict';

const Product = require('../models/productModel');
const { askGeminiText, parseJson } = require('./communityAi');

const DEFAULT_KG = 1;
const SPEC_KEYS = ['peso', 'peso_kg', 'peso_neto', 'weight', 'weight_kg', 'peso_del_producto', 'peso_del_equipo'];

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
  [/sillas_gamer/, 18],
  [/servidores|pc_montado/, 12],
  [/mochilas/, 0.8],
  [/aire_acondicionado/, 28],
  [/electrodomesticos|secadora|cubiertos/, 3],
  [/camaras_de_vigilancia|cctv|camaras_de_accion|drones/, 0.7],
  [/consolas|controles_/, 2],
  [/patinetas|scooter/, 12],
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

function normalizeKg(value) {
  let kg = Number(value);
  if (!Number.isFinite(kg) || kg <= 0) return null;
  if (kg > 80 && kg <= 80000) kg /= 1000;
  if (kg > 80 || kg < 0.03) return null;
  return Math.round(kg * 1000) / 1000;
}

function parseWeightKg(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return normalizeKg(raw);
  const text = String(raw).trim().toLowerCase();
  const grams = text.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|gramos?)\b/);
  if (grams) return normalizeKg(toNumber(grams[1]) / 1000);
  const kilos = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?)\b/);
  if (kilos) return normalizeKg(toNumber(kilos[1]));
  const lone = text.match(/^(\d+(?:[.,]\d+)?)$/);
  if (lone) return normalizeKg(toNumber(lone[1]));
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
      const kg = parseWeightKg(specs[key]);
      if (kg) return kg;
    }
  }
  for (const value of Object.values(specs)) {
    if (typeof value === 'string' && /kg|gramos|\bg\b/i.test(value)) {
      const kg = parseWeightKg(value);
      if (kg) return kg;
    }
  }
  return null;
}

function fromCategory(product) {
  const key = `${product.subcategory || ''} ${product.category || ''} ${product.productName || ''}`.toLowerCase();
  for (const [pattern, kg] of CATEGORY_KG) {
    if (pattern.test(key)) return kg;
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

async function guessWeightsAi(products) {
  if (!products.length) return new Map();
  const lines = products.map((item) => (
    `${item.codigo} | ${item.subcategory || ''} | ${item.brandName || ''} | ${String(item.productName || '').slice(0, 120)}`
  )).join('\n');
  const prompt = `Estimá el peso de empaque en kilogramos de estos productos de electrónica. Devolvé solo JSON:
{"items":[{"codigo":"123","kg":0.35}]}
Usá punto decimal, nunca coma. Si no sabés, kg=1. Entre 0.05 y 40.
${lines}`;
  const raw = parseJson(await askGeminiText(prompt, true, 25000)) || {};
  const map = new Map();
  for (const row of raw.items || []) {
    const kg = normalizeKg(row && row.kg);
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

function hideShippingWeight(product) {
  if (!product || typeof product !== 'object') return product;
  const copy = { ...product };
  delete copy.shippingWeightKg;
  delete copy.shippingWeightSource;
  return copy;
}

module.exports = {
  DEFAULT_KG,
  parseWeightKg,
  normalizeKg,
  formatTnWeight,
  estimateWeight,
  guessWeightsAi,
  needsWeight,
  fillMissingWeights,
  hideShippingWeight
};
