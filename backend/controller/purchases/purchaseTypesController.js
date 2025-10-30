const PurchaseType = require('../../models/purchaseTypeModel');
const uploadProductPermission = require('../../helpers/permission');

async function createPurchaseTypeController(req, res) {
  try {
    const hasPermission = await uploadProductPermission(req.userId);
    if (!hasPermission) throw new Error('Permiso denegado');
    const { name, code, description } = req.body;
    if (!name || !code) throw new Error('name y code son requeridos');
    const doc = await PurchaseType.create({ name, code, description });
    res.status(201).json({ success: true, error: false, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, error: true, message: e.message });
  }
}

async function getAllPurchaseTypesController(req, res) {
  try {
    const list = await PurchaseType.find().sort({ sortOrder: 1, name: 1 });
    res.json({ success: true, error: false, data: list });
  } catch (e) {
    res.status(400).json({ success: false, error: true, message: e.message });
  }
}

async function getActivePurchaseTypesController(req, res) {
  try {
    const list = await PurchaseType.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json({ success: true, error: false, data: list });
  } catch (e) {
    res.status(400).json({ success: false, error: true, message: e.message });
  }
}

async function updatePurchaseTypeController(req, res) {
  try {
    const hasPermission = await uploadProductPermission(req.userId);
    if (!hasPermission) throw new Error('Permiso denegado');
    const { typeId } = req.params;
    const update = req.body;
    const doc = await PurchaseType.findByIdAndUpdate(typeId, update, { new: true });
    if (!doc) throw new Error('Tipo no encontrado');
    res.json({ success: true, error: false, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, error: true, message: e.message });
  }
}

async function deletePurchaseTypeController(req, res) {
  try {
    const hasPermission = await uploadProductPermission(req.userId);
    if (!hasPermission) throw new Error('Permiso denegado');
    const { typeId } = req.params;
    await PurchaseType.findByIdAndUpdate(typeId, { isActive: false });
    res.json({ success: true, error: false });
  } catch (e) {
    res.status(400).json({ success: false, error: true, message: e.message });
  }
}

module.exports = {
  createPurchaseTypeController,
  getAllPurchaseTypesController,
  getActivePurchaseTypesController,
  updatePurchaseTypeController,
  deletePurchaseTypeController
};


