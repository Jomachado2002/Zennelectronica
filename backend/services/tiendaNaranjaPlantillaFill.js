'use strict';

const XLSX = require('xlsx');
const Product = require('../models/productModel');
const { keys } = require('./tiendaNaranjaClient');
const { toMerchantJpegUrl } = require('../helpers/merchantJpeg');
const { shortDescriptionOf, weightOf } = require('./tiendaNaranjaCatalog');
const {
  formatTnWeight,
  weightMeta,
  fillMissingWeights,
  recheckSuspiciousWeights,
  HEAVY_KG
} = require('./productWeightService');
const { resolveTnPath, DEFAULT_CATEGORY } = require('./tiendaNaranjaCategoryMap');
const {
  tnDisplayPrices,
  tnPriceAttributes,
  tnStockQty,
  hasZennStock,
  resolveUsdRate,
  webSellGs,
  webListGs,
  TN_MARKUP
} = require('./tiendaNaranjaPricing');
const {
  TEMPLATE_PATH,
  loadWorkbook,
  loadPlantillaSchema,
  matchSheetForTnPath,
  leafFromSheetName,
  normKey
} = require('./tiendaNaranjaPlantillaSchema');
const { mapAttributesForCodes, ensureVariationDefaults } = require('./tiendaNaranjaAttributeMap');

const IMAGE_OK = /^https:\/\/[^\s,]+\.(jpe?g|png|gif|webp)(\?|#|$)/i;

function prefix() {
  return keys().skuPrefix || 'ZEEL';
}

function skuOf(product) {
  const codigo = String(product.codigo || '').toUpperCase().replace(/\s+/g, '');
  if (!codigo) return '';
  return `${prefix()}-${codigo}`;
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '').trim()}`;
}

function safeName(value) {
  const text = String(value || '')
    .replace(/(\d)\s*"/g, '$1 pulg.')
    .replace(/"/g, '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clip(text, 180);
}

function humanize(key) {
  return String(key || '').replace(/_/g, ' ').trim().replace(/\b\w/g, (char) => char.toUpperCase());
}

function specsOf(product) {
  const a = product.specifications && typeof product.specifications === 'object' ? product.specifications : {};
  const b = product.technicalSpecifications && typeof product.technicalSpecifications === 'object'
    ? product.technicalSpecifications
    : {};
  return { ...a, ...b };
}

function descriptionOf(product) {
  const specs = specsOf(product);
  const lines = Object.entries(specs)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([key, value]) => `${humanize(key)}: ${String(value).trim()}`);
  if (lines.length) return clip(lines.join(' | '), 4000);
  return clip(String(product.description || product.productName || '').replace(/<[^>]+>/g, ' '), 2000);
}

function galleryOf(product) {
  const seen = new Set();
  return (product.productImage || [])
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url))
    .map((url) => toMerchantJpegUrl(url.trim()))
    .map((url) => String(url || '').trim().replace(/,\s*/g, ''))
    .filter((url) => IMAGE_OK.test(url))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .slice(0, 8);
}

function parseBox(product) {
  const raw = String(specsOf(product).dimensiones_de_embalaje || '').replace(/,/g, '.');
  const nums = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*mm/gi)].map((item) => Number(item[1]));
  if (nums.length >= 3) {
    return {
      ancho: Math.max(1, Math.round(nums[0] / 10)),
      alto: Math.max(1, Math.round(nums[1] / 10)),
      largo: Math.max(1, Math.round(nums[2] / 10))
    };
  }
  return {
    ancho: Number(process.env.TN_DEFAULT_WIDTH || 10),
    alto: Number(process.env.TN_DEFAULT_HEIGHT || 10),
    largo: Number(process.env.TN_DEFAULT_LENGTH || 10)
  };
}

async function listProducts({ onlyStock = true } = {}) {
  const filter = {
    codigo: { $exists: true, $nin: ['', null] },
    productName: { $exists: true, $nin: ['', null] },
    'productImage.0': { $exists: true, $ne: '' },
    sellingPrice: { $gt: 0 }
  };
  if (onlyStock) {
    // Solo productos con stock real en Zenn (nunca sin stock / out_of_stock).
    filter.stock = { $gt: 0 };
    filter.stockStatus = { $nin: ['out_of_stock', 'sin_stock', 'agotado'] };
  }
  const rows = await Product.find(filter)
    .select('codigo productName brandName category subcategory description seoDescription price sellingPrice barcode ean stock stockStatus productImage specifications technicalSpecifications shippingWeightKg shippingWeightSource tiendaNaranja')
    .sort({ codigo: 1 })
    .lean();
  if (!onlyStock) return rows;
  return rows.filter((product) => hasZennStock(product));
}

async function ensureWeightsLoaded() {
  try {
    const filled = await fillMissingWeights({ useAi: true, limit: 0 });
    const corrected = await recheckSuspiciousWeights({ useAi: false, limit: 0 });
    return { filled, corrected };
  } catch (error) {
    console.error('[tn plantilla] pesos', error.message || error);
    return { filled: { scanned: 0, updated: 0 }, corrected: { scanned: 0, updated: 0 }, error: error.message };
  }
}

function buildCodeValues(product, sheetMeta, schema) {
  const sku = skuOf(product);
  const display = tnDisplayPrices(product);
  const priced = tnPriceAttributes(display);
  const box = parseBox(product);
  const images = galleryOf(product);
  const stock = tnStockQty(product);
  const meta = weightMeta(product);
  const peso = Number(formatTnWeight(meta.kg));
  const mapped = mapAttributesForCodes(product, sheetMeta.codes, schema);
  const withVars = ensureVariationDefaults(
    product,
    mapped.attrs,
    sheetMeta.variationCodes || [],
    schema
  );
  const attrs = withVars.attrs;
  const warnings = mapped.warnings || [];
  const matched = [...(mapped.matched || []), ...(withVars.filled || []).map((c) => `${c}*`)] ;

  const byCode = {
    name: safeName(product.productName),
    sku,
    short_description: shortDescriptionOf(product),
    description: descriptionOf(product),
    // price y special_price siempre > 0. Un especial vacío Magento lo importa como Gs. 0.
    price: priced ? priced.price : '',
    qty: stock,
    images: images.join(','),
    weight: peso,
    ts_dimensions_width: box.ancho,
    ts_dimensions_height: box.alto,
    ts_dimensions_length: box.largo,
    special_price: priced ? priced.specialPrice : '',
    special_from_date: priced ? priced.custom[1].value : '',
    special_to_date: priced ? priced.custom[2].value : '',
    ...attrs
  };

  return {
    byCode,
    sku,
    warnings,
    matchedAttrs: matched,
    meta,
    peso,
    display,
    images: images.length
  };
}

function isReady(row, sheetMeta) {
  // Solo columnas con * en la plantilla TN (+ imágenes, sin las cuales TN rechaza).
  const required = (sheetMeta && sheetMeta.requiredCodes && sheetMeta.requiredCodes.length)
    ? sheetMeta.requiredCodes
    : ['name', 'sku', 'description', 'price', 'qty', 'weight'];
  for (const code of required) {
    const value = row.byCode[code];
    if (value === '' || value == null) return false;
    if ((code === 'price' || code === 'qty' || code === 'weight') && !(Number(value) > 0)) return false;
  }
  if (!row.byCode.images) return false;
  if (!row.sheetName) return false;
  return true;
}

function writeProductRow(sheet, rowIndex, codes, byCode) {
  for (let c = 0; c < codes.length; c += 1) {
    const code = codes[c];
    if (!code) continue;
    const addr = XLSX.utils.encode_cell({ r: rowIndex, c });
    const value = byCode[code];
    if (value === '' || value == null) {
      if (sheet[addr]) delete sheet[addr];
      continue;
    }
    const isNum = typeof value === 'number' || (code === 'price' || code === 'qty' || code === 'weight'
      || code === 'special_price' || code.startsWith('ts_dimensions_'));
    sheet[addr] = isNum && value !== '' && !Number.isNaN(Number(value))
      ? { t: 'n', v: Number(value) }
      : { t: 's', v: String(value) };
  }
}

function refreshSheetRange(sheet, codes, lastDataRow) {
  const endCol = Math.max(0, codes.length - 1);
  const endRow = Math.max(2, lastDataRow);
  sheet['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: endRow, c: endCol }
  });
}

/** Borra celdas de datos (desde fila 3) para que TN no cuente filas vacías de la plantilla. */
function clearDataRows(sheet, meta) {
  const codes = meta.codes || [];
  const start = meta.dataStartRow || 3;
  const ref = sheet['!ref'];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  for (let r = start; r <= range.e.r; r += 1) {
    for (let c = 0; c <= Math.max(range.e.c, codes.length - 1); c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (sheet[addr]) delete sheet[addr];
    }
  }
  refreshSheetRange(sheet, codes, 2);
}

/**
 * Clona la plantilla oficial y escribe productos desde la fila 3 de cada hoja.
 */
async function fillOfficialPlantilla(products, { schema } = {}) {
  const plantilla = schema || loadPlantillaSchema();
  const wb = loadWorkbook(plantilla.templatePath || TEMPLATE_PATH);

  const placed = [];
  const skipped = [];
  const bySheet = new Map();

  for (const product of products) {
    // Sin stock en Zenn = no va al Excel (tampoco con qty 5).
    if (!hasZennStock(product) || tnStockQty(product) <= 0) {
      skipped.push({
        sku: skuOf(product),
        reason: 'sin stock en Zenn',
        tnPath: ''
      });
      continue;
    }
    const tnPath = await resolveTnPath(product).catch(() => DEFAULT_CATEGORY);
    const sheetMeta = matchSheetForTnPath(tnPath, plantilla);
    if (!sheetMeta) {
      skipped.push({
        sku: skuOf(product),
        reason: `sin hoja TN para ${tnPath}`,
        tnPath
      });
      continue;
    }
    const built = buildCodeValues(product, sheetMeta, plantilla);
    const row = {
      ...built,
      sheetName: sheetMeta.sheetName,
      tnPath,
      product,
      matchedAttrs: built.matchedAttrs || []
    };
    if (!isReady(row, sheetMeta)) {
      skipped.push({
        sku: built.sku,
        reason: 'faltan campos obligatorios (*) o imágenes',
        tnPath
      });
      continue;
    }
    if (!bySheet.has(sheetMeta.sheetName)) bySheet.set(sheetMeta.sheetName, []);
    bySheet.get(sheetMeta.sheetName).push(row);
    placed.push(row);
  }

  for (const [sheetName, rows] of bySheet.entries()) {
    const sheet = wb.Sheets[sheetName];
    const meta = plantilla.sheets.find((s) => s.sheetName === sheetName);
    if (!sheet || !meta) continue;
    // Limpiar filas vacías heredadas de la plantilla (TN las cuenta como “listas para procesar”).
    clearDataRows(sheet, meta);
    let r = meta.dataStartRow;
    for (const row of rows) {
      writeProductRow(sheet, r, meta.codes, row.byCode);
      r += 1;
    }
    refreshSheetRange(sheet, meta.codes, r - 1);
  }

  // Hojas de categoría sin productos: dejar solo cabeceras (0 filas de datos).
  for (const meta of plantilla.sheets) {
    if (bySheet.has(meta.sheetName)) continue;
    const sheet = wb.Sheets[meta.sheetName];
    if (!sheet) continue;
    clearDataRows(sheet, meta);
    refreshSheetRange(sheet, meta.codes, 2);
  }

  // NO agregar Control_Zenn / Pesos al archivo de subida: TN los suma al contador
  // (ej. 4668 productos + 4668 control ≈ 9346 “filas listas”).
  for (const extra of ['Control_Zenn', 'Pesos_gt_10kg', 'LEEME']) {
    if (wb.Sheets[extra]) {
      delete wb.Sheets[extra];
      wb.SheetNames = wb.SheetNames.filter((n) => n !== extra);
    }
  }

  const heavyCount = placed.filter((row) => row.meta && row.meta.heavy).length;
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const sheetsUsed = [...bySheet.entries()].map(([sheetName, rows]) => ({
    hoja: sheetName,
    leaf: leafFromSheetName(sheetName),
    productos: rows.length
  }));

  return {
    buffer,
    count: placed.length,
    skipped: skipped.length,
    skippedRows: skipped.slice(0, 50),
    heavyCount,
    sheets: sheetsUsed.length,
    categories: sheetsUsed
  };
}

async function buildExcelNuevos({ existingSkus, usdRate, fillWeights = true } = {}) {
  await resolveUsdRate(usdRate);
  const weights = fillWeights ? await ensureWeightsLoaded() : null;
  const remote = existingSkus instanceof Set
    ? existingSkus
    : new Set([...(existingSkus || [])].map((sku) => String(sku).toUpperCase()));
  const products = await listProducts({ onlyStock: true });
  const createProducts = products.filter((product) => {
    const sku = skuOf(product);
    return sku && !remote.has(String(sku).toUpperCase());
  });
  const filled = await fillOfficialPlantilla(createProducts);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date());
  return {
    ...filled,
    filename: `zenn-tn-plantilla-oficial-${day}.xlsx`,
    weights,
    skippedExisting: remote.size,
    markup: TN_MARKUP
  };
}

async function buildExcel({ onlyStock = true, usdRate, fillWeights = true } = {}) {
  await resolveUsdRate(usdRate);
  const weights = fillWeights ? await ensureWeightsLoaded() : null;
  const products = await listProducts({ onlyStock });
  const filled = await fillOfficialPlantilla(products);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date());
  return {
    ...filled,
    filename: `zenn-tn-plantilla-completa-${day}.xlsx`,
    weights,
    markup: TN_MARKUP
  };
}

/** Plantilla oficial solo con un set de SKUs (ej. los que fallaron en TN). */
async function buildExcelForSkus(skuList, { fillWeights = false, filenamePrefix = 'zenn-tn-reintento-errores' } = {}) {
  const wanted = new Set(
    [...(skuList || [])]
      .map((sku) => String(sku || '').toUpperCase().replace(/\s+/g, '').trim())
      .filter(Boolean)
  );
  if (fillWeights) await ensureWeightsLoaded();
  const all = await listProducts({ onlyStock: true });
  const products = all.filter((product) => wanted.has(skuOf(product).toUpperCase()));
  const filled = await fillOfficialPlantilla(products);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date());
  return {
    ...filled,
    filename: `${filenamePrefix}-${day}.xlsx`,
    requested: wanted.size,
    found: products.length,
    missing: Math.max(0, wanted.size - products.length),
    markup: TN_MARKUP
  };
}

module.exports = {
  TEMPLATE_PATH,
  skuOf,
  galleryOf,
  listProducts,
  fillOfficialPlantilla,
  buildExcelNuevos,
  buildExcel,
  buildExcelForSkus,
  matchSheetForTnPath,
  loadPlantillaSchema,
  normKey,
  HEAVY_KG,
  TN_MARKUP,
  weightOf
};
