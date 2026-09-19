'use strict';

const multer = require('multer');
const {
  listAdminBrands,
  syncBrandsFromProducts,
  rebuildBrandsFromProducts,
  createBrand,
  updateBrand,
  deleteBrand,
  uploadBrandLogo,
  deleteBrandLogo,
  getLogoMap,
  findBrandByName
} = require('../../services/brandLogoService');

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (/^image\/(jpeg|jpg|png|webp|gif|svg\+xml)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imágenes (jpg, png, webp, gif, svg)'));
  }
}).single('image');

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    uploadMemory(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

function sendError(res, err) {
  const status = err.status || 400;
  return res.status(status).json({
    success: false,
    error: true,
    message: err.message || 'Error en logos de marca'
  });
}

const listAdminBrandsController = async (req, res) => {
  try {
    const data = await listAdminBrands({
      q: req.query.q,
      filter: req.query.filter,
      limit: req.query.limit,
      skip: req.query.skip
    });
    res.json({ success: true, error: false, data: data.brands, stats: data.stats });
  } catch (err) {
    sendError(res, err);
  }
};

const syncBrandsController = async (req, res) => {
  try {
    const data = await syncBrandsFromProducts();
    const listed = await listAdminBrands({ limit: 1000 });
    res.json({
      success: true,
      error: false,
      data: listed.brands,
      stats: listed.stats,
      sync: data
    });
  } catch (err) {
    sendError(res, err);
  }
};

const rebuildBrandsController = async (req, res) => {
  try {
    const result = await rebuildBrandsFromProducts();
    const listed = await listAdminBrands({ limit: 1000 });
    res.json({
      success: true,
      error: false,
      data: listed.brands,
      stats: listed.stats,
      rebuild: result
    });
  } catch (err) {
    sendError(res, err);
  }
};

const createBrandController = async (req, res) => {
  try {
    const brand = await createBrand(req.body || {});
    res.status(201).json({ success: true, error: false, data: brand });
  } catch (err) {
    sendError(res, err);
  }
};

const updateBrandController = async (req, res) => {
  try {
    const brand = await updateBrand(req.params.id, req.body || {});
    res.json({ success: true, error: false, data: brand });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteBrandController = async (req, res) => {
  try {
    const data = await deleteBrand(req.params.id);
    res.json({ success: true, error: false, data });
  } catch (err) {
    sendError(res, err);
  }
};

const uploadBrandLogoController = async (req, res) => {
  try {
    await runUpload(req, res);
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Falta el archivo image'
      });
    }
    const removeRaw = req.body.removeBackground ?? req.query.removeBackground;
    const removeBackground = !(removeRaw === 'false' || removeRaw === false || removeRaw === '0');
    const size = req.body.size || req.query.size;
    const brand = await uploadBrandLogo(req.params.id, req.file.buffer, {
      size,
      removeBackground
    });
    res.json({ success: true, error: false, data: brand });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteBrandLogoController = async (req, res) => {
  try {
    const brand = await deleteBrandLogo(req.params.id);
    res.json({ success: true, error: false, data: brand });
  } catch (err) {
    sendError(res, err);
  }
};

const publicLogoMapController = async (req, res) => {
  try {
    const data = await getLogoMap();
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ success: true, error: false, data });
  } catch (err) {
    sendError(res, err);
  }
};

const publicBrandByNameController = async (req, res) => {
  try {
    const brand = await findBrandByName(req.params.name);
    if (!brand || !brand.logoUrl) {
      return res.json({ success: true, error: false, data: null });
    }
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      error: false,
      data: {
        id: brand._id,
        name: brand.name,
        logoUrl: brand.logoUrl
      }
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  listAdminBrandsController,
  syncBrandsController,
  rebuildBrandsController,
  createBrandController,
  updateBrandController,
  deleteBrandController,
  uploadBrandLogoController,
  deleteBrandLogoController,
  publicLogoMapController,
  publicBrandByNameController
};
