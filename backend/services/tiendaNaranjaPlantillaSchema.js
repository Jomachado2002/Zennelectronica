'use strict';

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const TEMPLATE_PATH = path.join(__dirname, '..', 'data', 'tienda-naranja-plantilla-carga-masiva.xlsx');

let cache = null;

function normKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function leafFromSheetName(sheetName) {
  return String(sheetName || '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim();
}

function loadWorkbook(filePath = TEMPLATE_PATH) {
  if (!fs.existsSync(filePath)) {
    const error = new Error(`No está la plantilla TN en ${filePath}`);
    error.status = 500;
    throw error;
  }
  return XLSX.readFile(filePath, { cellDates: true, bookVBA: false });
}

function parseOptionsSheet(wb) {
  const sheet = wb.Sheets._options;
  if (!sheet) return { byCode: new Map(), rows: [] };
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const byCode = new Map();
  for (const row of rows) {
    for (const [code, raw] of Object.entries(row)) {
      const value = String(raw || '').trim();
      if (!value) continue;
      if (!byCode.has(code)) byCode.set(code, new Map());
      const bucket = byCode.get(code);
      bucket.set(normKey(value), value);
    }
  }
  return { byCode, rows };
}

function parseCategorySheet(wb, sheetName) {
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const codes = (matrix[0] || []).map((c) => String(c || '').trim());
  const groups = (matrix[1] || []).map((c) => String(c || '').trim());
  const labels = (matrix[2] || []).map((c) => String(c || '').trim());
  const colCount = codes.reduce((max, code, idx) => (code ? idx + 1 : max), 0);
  const slicedCodes = codes.slice(0, colCount);
  const slicedLabels = labels.slice(0, colCount);
  const requiredCodes = [];
  slicedCodes.forEach((code, idx) => {
    if (code && /\*/.test(String(slicedLabels[idx] || ''))) requiredCodes.push(code);
  });
  // Grupo "Variaciones": TN exige valor en TODAS esas columnas.
  let currentGroup = '';
  const variationCodes = [];
  for (let i = 0; i < slicedCodes.length; i += 1) {
    if (groups[i]) currentGroup = groups[i];
    if (/variacion/i.test(currentGroup) && slicedCodes[i]) variationCodes.push(slicedCodes[i]);
  }
  return {
    sheetName,
    leaf: leafFromSheetName(sheetName),
    leafNorm: normKey(leafFromSheetName(sheetName)),
    codes: slicedCodes,
    labels: slicedLabels,
    requiredCodes,
    variationCodes,
    dataStartRow: 3
  };
}

function loadPlantillaSchema({ force = false, filePath = TEMPLATE_PATH } = {}) {
  if (!force && cache && cache.filePath === filePath) return cache;
  const wb = loadWorkbook(filePath);
  const options = parseOptionsSheet(wb);
  const sheets = [];
  const byLeaf = new Map();
  for (const name of wb.SheetNames) {
    if (name === '_options' || name.startsWith('_') || name === 'LEEME' || name === 'Control_Zenn') continue;
    const parsed = parseCategorySheet(wb, name);
    if (!parsed.codes.includes('sku') || !parsed.codes.includes('name')) continue;
    sheets.push(parsed);
    // Prefer first match; keep list for ambiguous leaves
    if (!byLeaf.has(parsed.leafNorm)) byLeaf.set(parsed.leafNorm, []);
    byLeaf.get(parsed.leafNorm).push(parsed);
  }
  cache = {
    filePath,
    templatePath: filePath,
    sheets,
    byLeaf,
    optionsByCode: options.byCode,
    sheetNames: wb.SheetNames.filter((n) => n !== '_options')
  };
  return cache;
}

function matchSheetForTnPath(tnPath, schema = loadPlantillaSchema()) {
  const leaf = String(tnPath || '').split(';').map((p) => p.trim()).filter(Boolean).pop() || '';
  const leafNorm = normKey(leaf);
  const exact = schema.byLeaf.get(leafNorm);
  if (exact && exact.length) return exact[0];

  // Prefix / contains match against truncated Excel sheet names
  let best = null;
  let bestScore = 0;
  for (const sheet of schema.sheets) {
    if (!sheet.leafNorm) continue;
    if (leafNorm.startsWith(sheet.leafNorm) || sheet.leafNorm.startsWith(leafNorm)) {
      const score = Math.min(leafNorm.length, sheet.leafNorm.length);
      if (score > bestScore) {
        best = sheet;
        bestScore = score;
      }
    }
  }
  return best;
}

function findOptionValue(code, rawValue, schema = loadPlantillaSchema()) {
  const value = String(rawValue || '').trim();
  if (!value) return { value: '', matched: false };
  const opts = schema.optionsByCode.get(code);
  if (!opts || !opts.size) return { value, matched: false, freeText: true };
  const needle = normKey(value);
  const direct = opts.get(needle);
  if (direct) return { value: direct, matched: true };

  // Soft match: 256GB -> 256 GB
  const spaced = value.replace(/(\d)\s*([a-zA-Z]+)/g, '$1 $2').replace(/\s+/g, ' ').trim();
  const spacedHit = opts.get(normKey(spaced));
  if (spacedHit) return { value: spacedHit, matched: true };

  // Prefijo/sufijo de palabra (evita Negro → "Negro azulado" por contains).
  for (const [k, v] of opts.entries()) {
    if (k.startsWith(`${needle} `) || needle.startsWith(`${k} `)) {
      return { value: v, matched: true, fuzzy: true };
    }
  }
  // Igualdad de token largo
  if (needle.length >= 4) {
    for (const [k, v] of opts.entries()) {
      const kTokens = k.split(/\s+/);
      const nTokens = needle.split(/\s+/);
      if (kTokens.includes(needle) || nTokens.includes(k)) {
        return { value: v, matched: true, fuzzy: true };
      }
    }
  }
  return { value: '', matched: false, warning: `valor no está en _options.${code}` };
}

module.exports = {
  TEMPLATE_PATH,
  normKey,
  leafFromSheetName,
  loadWorkbook,
  loadPlantillaSchema,
  matchSheetForTnPath,
  findOptionValue
};
