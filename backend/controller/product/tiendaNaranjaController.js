'use strict';

const tn = require('../../services/tiendaNaranjaClient');
const catalog = require('../../services/tiendaNaranjaCatalog');
const excel = require('../../services/tiendaNaranjaExcel');
const { runTnDaily } = require('../../services/tiendaNaranjaSyncService');
const { fillMissingWeights } = require('../../services/productWeightService');

const estado = async (req, res) => {
  try {
    return res.json({ success: true, ...tn.status() });
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

module.exports = { estado, probar, revisarProducto, catalogoExcel, tick, pesos };
