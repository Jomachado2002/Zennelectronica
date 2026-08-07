'use strict';

const sharp = require('sharp');
const multer = require('multer');
const HomeBanner = require('../../models/homeBannerModel');
const HomeCategoryTile = require('../../models/homeCategoryTileModel');
const {
  getActiveHomeBanners,
  getActiveHomeCategoryTiles,
  listHomeBanners,
  listHomeCategoryTiles,
  seedHomeCategoryTiles
} = require('../../services/homeMediaService');
const { uploadBufferToR2, isR2Configured } = require('../../services/r2StorageService');
const { invalidateHomePayloadCache } = require('../../services/homePayloadCache');

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imágenes (jpg, png, webp, gif)'));
  }
}).single('image');

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    uploadMemory(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Optimiza sin recortar: mantiene proporción original.
 * Baja a máx. 2560px en el lado largo (retina) y WebP alta calidad.
 */
async function optimizeImagePreserveAspect(buffer, { maxEdge = 2560, quality = 85 } = {}) {
  const pipeline = sharp(buffer).rotate();
  const meta = await pipeline.metadata();
  const originalWidth = meta.width || 0;
  const originalHeight = meta.height || 0;

  const webp = await sharp(buffer)
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality, effort: 4 })
    .toBuffer();

  const out = await sharp(webp).metadata();
  return {
    buffer: webp,
    width: out.width || originalWidth,
    height: out.height || originalHeight,
    originalWidth,
    originalHeight
  };
}

/** ratio alto = panorámico (desktop); bajo/casi cuadrado = mobile */
function suggestBannerSlot(width, height) {
  if (!width || !height) return 'desktop';
  const ratio = width / height;
  if (ratio >= 2.2) return 'desktop';
  if (ratio <= 1.45) return 'mobile';
  return 'desktop';
}

/** POST /api/admin/home-media/upload  field: image, query/body folder=banners|tiles */
const uploadHomeMediaController = async (req, res) => {
  try {
    await runUpload(req, res);
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, error: true, message: 'Falta archivo image' });
    }
    if (!isR2Configured()) {
      return res.status(503).json({
        success: false,
        error: true,
        message: 'R2/CDN no configurado en el servidor'
      });
    }

    const folderRaw = String(req.body.folder || req.query.folder || 'banners').toLowerCase();
    const isTiles = folderRaw === 'tiles';
    const folder = isTiles ? 'home/tiles' : 'home/banners';
    const optimized = await optimizeImagePreserveAspect(req.file.buffer, {
      maxEdge: isTiles ? 1200 : 2560,
      quality: isTiles ? 78 : 85
    });
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const url = await uploadBufferToR2(optimized.buffer, key, {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable'
    });

    const suggestedSlot = isTiles
      ? 'tiles'
      : suggestBannerSlot(optimized.originalWidth, optimized.originalHeight);

    res.json({
      success: true,
      error: false,
      data: {
        url,
        key,
        width: optimized.width,
        height: optimized.height,
        originalWidth: optimized.originalWidth,
        originalHeight: optimized.originalHeight,
        suggestedSlot,
        ratio:
          optimized.originalWidth && optimized.originalHeight
            ? Number((optimized.originalWidth / optimized.originalHeight).toFixed(3))
            : null
      }
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: true,
      message: err.message || 'Error al subir imagen'
    });
  }
};

// ----- Banners -----
const listBannersController = async (req, res) => {
  try {
    const data = await listHomeBanners();
    res.json({ success: true, error: false, data });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

const createBannerController = async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.imageDesktop && !body.imageMobile) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Subí al menos una imagen (desktop o mobile)'
      });
    }
    if (!body.imageDesktop && body.imageMobile) {
      body.imageDesktop = body.imageMobile;
      body.desktopWidth = body.mobileWidth;
      body.desktopHeight = body.mobileHeight;
    }
    const b = await HomeBanner.create(body);
    invalidateHomePayloadCache();
    res.status(201).json({ success: true, error: false, data: b });
  } catch (err) {
    res.status(400).json({ success: false, error: true, message: err.message });
  }
};

const updateBannerController = async (req, res) => {
  try {
    const b = await HomeBanner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!b) return res.status(404).json({ success: false, error: true, message: 'No encontrado' });
    invalidateHomePayloadCache();
    res.json({ success: true, error: false, data: b });
  } catch (err) {
    res.status(400).json({ success: false, error: true, message: err.message });
  }
};

const deleteBannerController = async (req, res) => {
  try {
    const b = await HomeBanner.findByIdAndDelete(req.params.id);
    if (!b) return res.status(404).json({ success: false, error: true, message: 'No encontrado' });
    invalidateHomePayloadCache();
    res.json({ success: true, error: false, data: b });
  } catch (err) {
    res.status(400).json({ success: false, error: true, message: err.message });
  }
};

// ----- Tiles -----
const listTilesController = async (req, res) => {
  try {
    let data = await listHomeCategoryTiles();
    if (!data.length) data = await seedHomeCategoryTiles();
    res.json({ success: true, error: false, data });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

const seedTilesController = async (req, res) => {
  try {
    const data = await seedHomeCategoryTiles();
    invalidateHomePayloadCache();
    res.json({ success: true, error: false, data });
  } catch (err) {
    res.status(500).json({ success: false, error: true, message: err.message });
  }
};

const createTileController = async (req, res) => {
  try {
    const t = await HomeCategoryTile.create(req.body);
    invalidateHomePayloadCache();
    res.status(201).json({ success: true, error: false, data: t });
  } catch (err) {
    res.status(400).json({ success: false, error: true, message: err.message });
  }
};

const updateTileController = async (req, res) => {
  try {
    const t = await HomeCategoryTile.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!t) return res.status(404).json({ success: false, error: true, message: 'No encontrado' });
    invalidateHomePayloadCache();
    res.json({ success: true, error: false, data: t });
  } catch (err) {
    res.status(400).json({ success: false, error: true, message: err.message });
  }
};

const deleteTileController = async (req, res) => {
  try {
    const t = await HomeCategoryTile.findByIdAndDelete(req.params.id);
    if (!t) return res.status(404).json({ success: false, error: true, message: 'No encontrado' });
    invalidateHomePayloadCache();
    res.json({ success: true, error: false, data: t });
  } catch (err) {
    res.status(400).json({ success: false, error: true, message: err.message });
  }
};

module.exports = {
  uploadHomeMediaController,
  listBannersController,
  createBannerController,
  updateBannerController,
  deleteBannerController,
  listTilesController,
  seedTilesController,
  createTileController,
  updateTileController,
  deleteTileController,
  getActiveHomeBanners,
  getActiveHomeCategoryTiles
};
