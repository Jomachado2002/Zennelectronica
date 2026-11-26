'use strict';

const tn = require('../../services/tiendaNaranjaClient');
const catalog = require('../../services/tiendaNaranjaCatalog');
const excel = require('../../services/tiendaNaranjaExcel');
const {
  runTnDaily,
  runTnPriceStockSync,
  collectExistingSkus,
  listDiferencias,
  listPendingCreates,
  listRemoteSellerSkus
} = require('../../services/tiendaNaranjaSyncService');
const {
  fillMissingWeights,
  listHeavyWeights,
  recheckSuspiciousWeights,
  HEAVY_KG
} = require('../../services/productWeightService');
const {
  getTnSettings,
  getDiscountBrands,
  setDiscountBrands,
  TN_MARKUP
} = require('../../services/tiendaNaranjaPricing');
const categoryMap = require('../../services/tiendaNaranjaCategoryMap');

const estado = async (req, res) => {
  try {
    const settings = await getTnSettings();
    return res.json({
      success: true,
      ...tn.status(),
      markup: TN_MARKUP,
      discountBrands: settings.discountBrands || [],
      lastPriceStockSyncAt: settings.lastPriceStockSyncAt,
      lastPriceStockSync: settings.lastPriceStockSync || null,
      pendingCreateCount: settings.pendingCreateCount || 0,
      pendingCreateUpdatedAt: settings.pendingCreateUpdatedAt || null,
      remoteCatalogCount: settings.remoteCatalogCount || 0,
      zennStockCount: settings.zennStockCount || 0
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'No se pudo leer el estado de Tienda Naranja' });
  }
};

const probar = async (req, res) => {
  try {
    const staging = await tn.probeAuth('staging');
    const production = await tn.probeAuth('production');
    return res.json({
      success: true,
      ...tn.status(),
      staging,
      production
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'No se pudo hablar con Tienda Naranja'
    });
  }
};

const catalogoExcel = async (req, res) => {
  try {
    const onlyStock = String(req.query.todos || '') !== '1';
    const file = await excel.buildExcel({ onlyStock });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
      'X-TN-Rows': String(file.count),
      'X-TN-Heavy': String(file.heavyCount || 0),
      'X-TN-Sheets': String(file.sheets || 0),
      'X-TN-Skipped': String(file.skipped || 0)
    });
    return res.send(file.buffer);
  } catch (error) {
    console.error('[tn] excel', error);
    return res.status(500).json({ success: false, message: error.message || 'No se pudo armar el Excel' });
  }
};

const excelNuevos = async (req, res) => {
  try {
    req.setTimeout(10 * 60 * 1000);
    res.setTimeout(10 * 60 * 1000);
    const live = String(req.query.live || '') === '1';
    let existing;
    if (live) {
      const probe = String(req.query.probe || '1') !== '0';
      existing = probe
        ? await collectExistingSkus({ probeMissing: true })
        : await listRemoteSellerSkus();
    } else {
      const Product = require('../../models/productModel');
      const prefix = (tn.keys().skuPrefix || 'ZEEL').toUpperCase();
      const rows = await Product.find({ 'tiendaNaranja.onTn': true }).select('codigo').lean();
      existing = new Set(rows.map((product) => {
        const code = String(product.codigo || '').toUpperCase().replace(/\s+/g, '');
        return code ? `${prefix}-${code}` : '';
      }).filter(Boolean));
      if (!existing.size) {
        return res.status(409).json({
          success: false,
          message: 'Todavía no hay una pasada del worker. Cuando termine Visão, el Excel sale solo con los que faltan en TN.'
        });
      }
    }
    const file = await excel.buildExcelNuevos({ existingSkus: existing });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
      'X-TN-Rows': String(file.count),
      'X-TN-Heavy': String(file.heavyCount || 0),
      'X-TN-Sheets': String(file.sheets || 0),
      'X-TN-Skipped': String(file.skipped || 0),
      'X-TN-Skipped-Existing': String(file.skippedExisting || existing.size)
    });
    return res.send(file.buffer);
  } catch (error) {
    console.error('[tn] excel-nuevos', error);
    return res.status(500).json({ success: false, message: error.message || 'No se pudo armar el Excel de nuevos' });
  }
};

const tick = async (req, res) => {
  try {
    req.setTimeout(5 * 60 * 1000);
    res.setTimeout(5 * 60 * 1000);
    const data = await runTnDaily({ limit: Number(req.query.limit) || 25 });
    return res.json({ success: true, ...data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudo sincronizar Tienda Naranja' });
  }
};

const syncPrecios = async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 1000);
    res.setTimeout(20 * 60 * 1000);
    const limit = Number(req.body && req.body.limit) || Number(req.query.limit) || 0;
    // Por defecto sincroniza contra el catálogo remoto del seller.
    const fromRemote = !(
      (req.body && req.body.fromRemote === false)
      || String((req.body && req.body.fromRemote) || req.query.fromRemote || '1') === '0'
    );
    const data = await runTnPriceStockSync({
      limit: limit || undefined,
      fromRemote
    });
    return res.json({ success: true, ...data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudo sincronizar precios TN' });
  }
};

const pesos = async (req, res) => {
  try {
    req.setTimeout(10 * 60 * 1000);
    res.setTimeout(10 * 60 * 1000);
    const useAi = String(req.query.ai || req.body?.ai || '') === '1';
    const limit = Number(req.query.limit || req.body?.limit) || 0;
    const recheck = String(req.query.recheck || req.body?.recheck || '1') !== '0';
    const filled = await fillMissingWeights({ useAi, limit });
    const corrected = recheck
      ? await recheckSuspiciousWeights({ useAi, limit })
      : { scanned: 0, updated: 0, fixed: 0, stillHeavy: 0, samples: [] };
    const heavy = await listHeavyWeights({ minKg: HEAVY_KG, onlyStock: true, limit: 80 });
    return res.json({
      success: true,
      heavyKg: HEAVY_KG,
      filled,
      corrected,
      heavy
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudo cargar el peso' });
  }
};

const pesosRevisar = async (req, res) => {
  try {
    const data = await listHeavyWeights({
      minKg: Number(req.query.minKg) || HEAVY_KG,
      onlyStock: String(req.query.todos || '') !== '1',
      limit: Number(req.query.limit) || 200
    });
    return res.json({ success: true, heavyKg: HEAVY_KG, ...data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudo listar pesos pesados' });
  }
};

const revisarProducto = async (req, res) => {
  try {
    const Product = require('../../models/productModel');
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Ese producto no está' });
    return res.json({ success: true, ...catalog.readiness(product), sku: catalog.skuOf(product) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudo revisar el producto' });
  }
};

const pendientes = async (req, res) => {
  try {
    const data = await listPendingCreates({
      limit: Number(req.query.limit) || 400,
      offset: Number(req.query.offset) || 0
    });
    return res.json({ success: true, ...data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudo listar lo que falta en TN' });
  }
};

const diferencias = async (req, res) => {
  try {
    const data = await listDiferencias({
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0,
      onlyGap: req.query.gap ? Number(req.query.gap) : undefined,
      onlyPromo: String(req.query.promo || '') === '1',
      onlyNew: String(req.query.nuevos || '') === '1'
    });
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error('[tn] diferencias', error);
    return res.status(500).json({ success: false, message: error.message || 'No se pudieron armar las diferencias' });
  }
};

const getMarcas = async (req, res) => {
  try {
    const brands = await getDiscountBrands();
    return res.json({ success: true, discountBrands: brands });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudieron leer las marcas' });
  }
};

const putMarcas = async (req, res) => {
  try {
    const brands = await setDiscountBrands(req.body && (req.body.discountBrands || req.body.brands));
    return res.json({ success: true, discountBrands: brands });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudieron guardar las marcas' });
  }
};

const getCategoriasMap = async (req, res) => {
  try {
    const [pairs, tnPaths] = await Promise.all([
      categoryMap.listZennPairs(),
      Promise.resolve(categoryMap.listTnCategoryPaths())
    ]);
    const mapped = pairs.filter((p) => p.mapped).length;
    return res.json({
      success: true,
      total: pairs.length,
      mapped,
      unmapped: pairs.length - mapped,
      pairs,
      tnPaths
    });
  } catch (error) {
    console.error('[tn] categorias-map', error);
    return res.status(500).json({ success: false, message: error.message || 'No se pudo leer el mapeo' });
  }
};

const putCategoriaMap = async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await categoryMap.upsertMap({
      zennCategory: body.zennCategory,
      zennSubcategory: body.zennSubcategory || '',
      tnPath: body.tnPath,
      zennCategoryLabel: body.zennCategoryLabel,
      zennSubcategoryLabel: body.zennSubcategoryLabel,
      tnCategoryIds: body.tnCategoryIds,
      productCount: body.productCount,
      source: 'manual'
    });
    return res.json({ success: true, map: doc });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'No se pudo guardar el mapeo'
    });
  }
};

const seedCategoriasMap = async (req, res) => {
  try {
    const force = String((req.body && req.body.force) || req.query.force || '') === '1';
    const data = await categoryMap.seedFromHeuristic({ force });
    return res.json({ success: true, ...data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudo sembrar el mapeo' });
  }
};

const deleteCategoriaMap = async (req, res) => {
  try {
    await categoryMap.deleteMap(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudo borrar el mapeo' });
  }
};

module.exports = {
  estado,
  probar,
  revisarProducto,
  catalogoExcel,
  excelNuevos,
  tick,
  syncPrecios,
  pesos,
  pesosRevisar,
  diferencias,
  pendientes,
  getMarcas,
  putMarcas,
  getCategoriasMap,
  putCategoriaMap,
  seedCategoriasMap,
  deleteCategoriaMap
};
