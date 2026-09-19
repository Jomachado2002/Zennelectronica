'use strict';

/**
 * Normaliza nombres de marca para matching case-insensitive.
 * "APPLE", "Apple", "apple", "A.P.P.L.E" → "apple"
 * "TP-Link", "TP Link", "tplink" → "tplink"
 * "H.P.", "HP", "hp" → "hp"
 */
function normalizeBrandSlug(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const raw of values || []) {
    const value = String(raw || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function uniqueSlugs(names) {
  const seen = new Set();
  const out = [];
  for (const name of names || []) {
    const slug = normalizeBrandSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

const JUNK_BRAND_SLUGS = new Set([
  'adaptador', 'aire', 'alarma', 'alicate', 'anillo', 'antena', 'apresentador',
  'aspiradora', 'auricular', 'balanza', 'banco', 'barbeador', 'base', 'baston',
  'bateria', 'bicicleta', 'bobina', 'boligrafo', 'boquilla', 'botella', 'boton',
  'cable', 'cabo', 'cafetera', 'caixa', 'calculadora', 'calefaccion', 'capa',
  'cargador', 'cartucho', 'case', 'cctv', 'cel', 'celular', 'central', 'cerradura',
  'cinta', 'cocina', 'cofre', 'colector', 'compacto', 'compresor', 'comunicador',
  'conector', 'consola', 'controle', 'control', 'controlador', 'conversor',
  'convertidor', 'cooler', 'cortador', 'cortina', 'camara', 'deshumidificador',
  'desktop', 'destornillador', 'detector', 'disco', 'discu', 'disipador', 'dron',
  'drone', 'estabilizador', 'estacion', 'exprimidor', 'extensor', 'filamento',
  'filtro', 'flash', 'fonte', 'freidora', 'fuente', 'fuete', 'gabinete', 'gabitene',
  'gaveta', 'gimbal', 'grabador', 'gravador', 'hd', 'headset', 'hervidor', 'horno',
  'hub', 'humidificador', 'impressora', 'impresora', 'ion', 'jack', 'kit', 'lector',
  'lente', 'lentes', 'licuadora', 'limpiador', 'lmpada', 'lampara', 'maleta',
  'medidor', 'megafono', 'memoria', 'microondas', 'microfono', 'mochila',
  'modelador', 'moldura', 'molinillo', 'molino', 'monitor', 'moto', 'mouse',
  'mousepad', 'maquina', 'modulo', 'nb', 'nobreak', 'notebook', 'otg', 'palanca',
  'panel', 'pantalla', 'papelera', 'partybox', 'pasta', 'patineta', 'pedales',
  'pedais', 'pendrive', 'pila', 'pilas', 'placa', 'presentador', 'procesador',
  'proyector', 'pulsera', 'punto', 'purificador', 'radio', 'rastreador',
  'receptor', 'reflector', 'reloj', 'repetidor', 'resina', 'rotulador',
  'rotuladora', 'router', 'scanner', 'secador', 'sensor', 'servidor', 'silla',
  'sirena', 'soporte', 'soundbar', 'speaker', 'split', 'switch', 'tablet',
  'taladro', 'tarjeta', 'tarjetaa', 'teclado', 'telefono', 'terminal', 'timbre',
  'tinta', 'toner', 'tv', 'tvbox', 'motoserra', 'minigbic'
]);

function isPlausibleBrandName(name) {
  const raw = String(name || '').trim();
  if (!raw) return false;
  if (raw.length > 42) return false;
  if (raw.includes('|')) return false;
  if (/gabinete\s*[:/,]/i.test(raw)) return false;
  if ((raw.match(/:/g) || []).length >= 2) return false;
  const slug = normalizeBrandSlug(raw);
  if (!slug || slug.length < 2) return false;
  if (/^[a-z]{0,4}\d{5,}/i.test(slug)) return false;
  if (JUNK_BRAND_SLUGS.has(slug)) return false;
  return true;
}

module.exports = {
  normalizeBrandSlug,
  uniqueStrings,
  uniqueSlugs,
  isPlausibleBrandName
};
