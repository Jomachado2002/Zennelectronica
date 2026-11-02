'use strict';

const tn = require('../../services/tiendaNaranjaClient');
const catalog = require('../../services/tiendaNaranjaCatalog');
const excel = require('../../services/tiendaNaranjaExcel');
const {
  runTnDaily,
  runTnPriceStockSync,
  collectExistingSkus,
  listDiferencias,
  listRemoteSellerSkus
} = require('../../services/tiendaNaranjaSyncService');
const { fillMissingWeights } = require('../../services/productWeightService');
const {
  getTnSettings,
  getDiscountBrands,
  setDiscountBrands,
  TN_MARKUP
} = require('../../services/tiendaNaranjaPricing');

const estado = async (req, res) => {
  try {
    const settings = await getTnSettings();
    return res.json({
      success: true,
      ...tn.status(),
      markup: TN_MARKUP,
      discountBrands: settings.discountBrands || [],
      lastPriceStockSyncAt: settings.lastPriceStockSyncAt,
      lastPriceStockSync: settings.lastPriceStockSync || null
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
      'Content-Type': 'application/vnd.ms-excel',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
      'X-TN-Rows': String(file.count)
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
    const probe = String(req.query.probe || '1') !== '0';
    const existing = probe
      ? await collectExistingSkus({ probeMissing: true })
      : await listRemoteSellerSkus();
    const file = await excel.buildExcelNuevos({ existingSkus: existing });
    res.set({
      'Content-Type': 'application/vnd.ms-excel',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
      'X-TN-Rows': String(file.count),
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
    req.setTimeout(15 * 60 * 1000);
    res.setTimeout(15 * 60 * 1000);
    const limit = Number(req.body && req.body.limit) || Number(req.query.limit) || 0;
    const data = await runTnPriceStockSync({ limit: limit || undefined });
    return res.json({ success: true, ...data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudo sincronizar precios TN' });
  }
};

const pesos = async (req, res) => {
  try {
    const data = await fillMissingWeights({ useAi: String(req.query.ai || '') === '1', limit: Number(req.query.limit) || 0 });
    return res.json({ success: true, ...data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudo cargar el peso' });
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

module.exports = {
  estado,
  probar,
  revisarProducto,
  catalogoExcel,
  excelNuevos,
  tick,
  syncPrecios,
  pesos,
  diferencias,
  getMarcas,
  putMarcas
};
