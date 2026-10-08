'use strict';

const Category = require('../models/categoryModel');
const CreativeSpecFocus = require('../models/creativeSpecFocusModel');

const MAX_ON = 3;

const RULES = [
  { test: /cpu_|procesador/, names: ['socket', 'numero_de_nucleos', 'frecuencia_maxima_de_boost', 'frecuencia_maxima_del_procesador', 'frecuencia_basica_del_procesador', 'frecuencia_del_reloj_de_base', 'cache', 'tdp'] },
  { test: /memoria_ram/, names: ['capacidad', 'ddr', 'velocidad_de_memoria', 'latencia'] },
  { test: /tarjetas_graficas/, names: ['procesamiento_grafico', 'gpu', 'memoria_v_ram', 'clocks', 'memoria_de_video'] },
  { test: /ssd_|disco_duro|pendrive|tarjetas_sd/, names: ['capacidad', 'velocidad_de_lectura', 'interfaz', 'velocidad_rpm', 'lectura_secuencial'] },
  { test: /placas_madre/, names: ['socket', 'chipset', 'factor_de_forma', 'memoria_interna'] },
  { test: /fuentes_de_alimentacion/, names: ['potencia', 'eficiencia', 'modularidad'] },
  { test: /gabinetes__/, names: ['factor_de_forma', 'tamano_del_gpu', 'iluminacion'] },
  { test: /monitores__|^monitor__|tv__/, names: ['tamano_de_pantalla', 'resolucion', 'frecuencia_de_actualizacion', 'tipo_de_panel', 'tiempo_de_respuesta'] },
  { test: /notebook|macbook|imac__|computadoras__|mini_pc|pc_montado/, names: ['procesador', 'chip', 'memoria_ram', 'memoria', 'almacenamiento', 'capacidad', 'gpu', 'graficos', 'tamano_de_pantalla'] },
  { test: /iphone|smartphone|celular/, names: ['capacidad', 'almacenamiento', 'pantalla', 'camara_principal', 'memoria_ram', 'bateria'] },
  { test: /ipad|tablets__/, names: ['pantalla', 'almacenamiento', 'memoria_rom', 'memoria_ram', 'chip', 'procesador'] },
  { test: /teclado/, names: ['teclas_switches', 'tipo_de_conexion', 'retroiluminacion', 'layout_idioma'] },
  { test: /mouse__|mouse_y_/, names: ['dpi', 'sensor_del_mouse', 'conexion'] },
  { test: /auricular|airpod/, names: ['conexion', 'bateria', 'microfono'] },
  { test: /webcam/, names: ['resolucion_de_webcam', 'campo_visual', 'microfono'] },
  { test: /water_cooler/, names: ['tamano_del_radiador', 'compatibilidad', 'iluminacion'] },
  { test: /cooler/, names: ['compatibilidad', 'velocidad_rpm', 'iluminacion'] },
  { test: /impresora/, names: ['velocidad_de_impresion', 'tecnologia_de_impresion', 'conectividad', 'funcion_de_hardware', 'funciones_del_hardware'] },
  { test: /router|adaptadores_wifi/, names: ['tasa_de_transferencia', 'frecuencia', 'antenas'] },
  { test: /consolas__/, names: ['capacidad', 'memoria_ram', 'tipo_de_almacenamiento'] },
  { test: /reloj|apple_watch|pulsera/, names: ['pantalla', 'bateria', 'resistencia', 'case_size'] },
  { test: /proyector/, names: ['brillo', 'resolucion', 'proyeccion'] },
  { test: /microfono__/, names: ['respuesta_de_frecuencia', 'padron_polar', 'conexion'] },
  { test: /sillas_gamer/, names: ['limite_de_peso', 'material'] },
  { test: /nobreak|ups/, names: ['capacidad', 'bateria', 'tomadas'] }
];

const DEFAULT_NAMES = ['capacidad', 'potencia', 'resolucion', 'pantalla', 'bateria', 'conexion', 'interfaz', 'velocidad'];

// Datos que el cliente lee como el mismo dato. Solo uno de cada grupo puede salir en el flyer.
const FAMILIES = [
  ['memoria_v_ram', 'memoria_de_video', 'vram'],
  ['velocidad_de_lectura', 'lectura_secuencial'],
  ['velocidad_de_escritura', 'escritura_secuencial'],
  ['capacidad', 'almacenamiento', 'memoria_rom'],
  ['memoria_ram', 'memoria'],
  ['procesador', 'chip'],
  ['gpu', 'graficos']
];

const NOISE = new Set([
  'marca', 'modelo', 'referencia', 'color', 'peso', 'peso_bruto', 'peso_neto',
  'incluye', 'inclui', 'caracteristicas', 'caracteristicas_principales',
  'observacion', 'observaciones', 'garantia', 'anatel', 'contenido_de_la_caja', 'accesorios'
]);

let focusCache = null;
let focusCacheAt = 0;
let seeded = false;

function plain(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isNoise(name) {
  const key = plain(name);
  if (!key || key === '06') return true;
  if (NOISE.has(key)) return true;
  if (key.startsWith('dimension') || key.startsWith('peso') || key.includes('embalaje')) return true;
  return false;
}

function priorityNames(subcategoryValue, subcategoryLabel) {
  const blob = `${subcategoryValue || ''} ${subcategoryLabel || ''}`;
  const rule = RULES.find((item) => item.test.test(blob));
  return rule ? rule.names : DEFAULT_NAMES;
}

function familyOf(name) {
  const key = plain(name);
  const group = FAMILIES.find((items) => items.includes(key));
  return group ? group[0] : key;
}

function rankOf(name, keys) {
  const key = plain(name);
  const exact = keys.findIndex((item) => item === key);
  if (exact !== -1) return exact;
  if (key.startsWith('tipo_')) return null;
  let best = null;
  keys.forEach((item, index) => {
    if (item.length < 6) return;
    if (key.includes(item) && (best == null || index < best)) best = index;
  });
  return best;
}

function flyerLabel(name, label) {
  if (plain(name) === 'clocks') return 'Frecuencia';
  return label;
}

function buildChoices(sub) {
  const keys = priorityNames(sub.value, sub.label);
  const ranked = (sub.specifications || [])
    .filter((spec) => spec && spec.name && spec.label && !isNoise(spec.name))
    .map((spec, index) => {
      const rank = rankOf(spec.name, keys);
      return {
        name: spec.name,
        label: flyerLabel(spec.name, spec.label),
        rank: rank == null ? 80 + index : rank,
        interesting: rank != null
      };
    })
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, 'es'));

  let turnedOn = 0;
  const usedFamilies = new Set();
  return ranked.map((spec) => {
    const family = familyOf(spec.name);
    const enabled = spec.interesting && turnedOn < MAX_ON && !usedFamilies.has(family);
    if (enabled) {
      turnedOn += 1;
      usedFamilies.add(family);
    }
    return {
      name: spec.name,
      label: spec.label,
      enabled,
      rank: spec.rank
    };
  });
}

function invalidateFocusCache() {
  focusCache = null;
  focusCacheAt = 0;
}

async function ensureFocus({ refresh = false } = {}) {
  if (seeded && !refresh) return;
  const categories = await Category.find({ isActive: { $ne: false } })
    .select('label value subcategories.label subcategories.value subcategories.isActive subcategories.specifications.name subcategories.specifications.label subcategories.specifications.order')
    .lean();
  const existing = await CreativeSpecFocus.find({})
    .select('categoryValue subcategoryValue specs.name specs.label specs.enabled specs.rank')
    .lean();
  const byKey = new Map(existing.map((row) => [`${row.categoryValue}::${row.subcategoryValue}`, row]));
  const ops = [];

  for (const category of categories) {
    for (const sub of category.subcategories || []) {
      if (!sub || sub.isActive === false || !sub.value) continue;
      const key = `${category.value}::${sub.value}`;
      const fresh = buildChoices(sub);
      const current = byKey.get(key);
      if (!current) {
        ops.push({
          updateOne: {
            filter: { categoryValue: category.value, subcategoryValue: sub.value },
            update: {
              $setOnInsert: {
                categoryValue: category.value,
                categoryLabel: category.label || category.value,
                subcategoryValue: sub.value,
                subcategoryLabel: sub.label || sub.value,
                specs: fresh
              }
            },
            upsert: true
          }
        });
        continue;
      }
      const known = new Map((current.specs || []).map((spec) => [spec.name, spec]));
      let changed = false;
      const specs = fresh.map((spec) => {
        const prev = known.get(spec.name);
        if (!prev) {
          changed = true;
          return { ...spec, enabled: false };
        }
        if (prev.label !== spec.label) changed = true;
        return {
          name: spec.name,
          label: spec.label,
          enabled: Boolean(prev.enabled),
          rank: spec.rank
        };
      });
      if (specs.length !== (current.specs || []).length) changed = true;
      if (!changed && !refresh) continue;
      ops.push({
        updateOne: {
          filter: { categoryValue: category.value, subcategoryValue: sub.value },
          update: {
            $set: {
              categoryLabel: category.label || category.value,
              subcategoryLabel: sub.label || sub.value,
              specs
            }
          }
        }
      });
    }
  }

  if (ops.length) await CreativeSpecFocus.bulkWrite(ops, { ordered: false });
  seeded = true;
  invalidateFocusCache();
}

async function listCreativeSpecFocus({ refresh = false } = {}) {
  await ensureFocus({ refresh });
  const rows = await CreativeSpecFocus.find({})
    .sort({ categoryLabel: 1, subcategoryLabel: 1 })
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    category: row.categoryValue,
    categoryLabel: row.categoryLabel,
    subcategory: row.subcategoryValue,
    subcategoryLabel: row.subcategoryLabel,
    specs: (row.specs || [])
      .slice()
      .sort((a, b) => (a.rank || 0) - (b.rank || 0) || String(a.label).localeCompare(String(b.label), 'es'))
      .map((spec) => ({
        name: spec.name,
        label: spec.label,
        enabled: Boolean(spec.enabled),
        rank: spec.rank || 0
      }))
  }));
}

async function setCreativeSpecEnabled({ category, subcategory, name, enabled }) {
  await ensureFocus();
  const doc = await CreativeSpecFocus.findOne({ categoryValue: category, subcategoryValue: subcategory });
  if (!doc) {
    const error = new Error('Esa subcategoría no está en la tabla');
    error.status = 404;
    throw error;
  }
  const spec = (doc.specs || []).find((item) => item.name === name);
  if (!spec) {
    const error = new Error('Esa especificación no está en la subcategoría');
    error.status = 404;
    throw error;
  }
  const turnOn = Boolean(enabled);
  if (turnOn && !spec.enabled) {
    const active = doc.specs.filter((item) => item.enabled).length;
    if (active >= MAX_ON) {
      const error = new Error('Como máximo 3 especificaciones, para que el flyer no se llene');
      error.status = 400;
      throw error;
    }
  }
  spec.enabled = turnOn;
  await doc.save();
  invalidateFocusCache();
  return {
    category,
    subcategory,
    name,
    enabled: spec.enabled
  };
}

async function focusMap() {
  if (focusCache && Date.now() - focusCacheAt < 30000) return focusCache;
  await ensureFocus();
  const rows = await CreativeSpecFocus.find({})
    .select('categoryValue subcategoryValue specs.name specs.label specs.enabled specs.rank')
    .lean();
  const map = new Map();
  for (const row of rows) {
    const specs = (row.specs || [])
      .filter((spec) => spec.enabled && spec.name)
      .sort((a, b) => (a.rank || 0) - (b.rank || 0))
      .map((spec) => ({ name: spec.name, label: spec.label }));
    map.set(`${row.categoryValue}::${row.subcategoryValue}`, specs);
  }
  focusCache = map;
  focusCacheAt = Date.now();
  return map;
}

async function focusedSchemaFor(product) {
  if (!product) return [];
  const map = await focusMap();
  return map.get(`${product.category}::${product.subcategory}`) || [];
}

module.exports = {
  MAX_ON,
  listCreativeSpecFocus,
  setCreativeSpecEnabled,
  focusedSchemaFor
};
