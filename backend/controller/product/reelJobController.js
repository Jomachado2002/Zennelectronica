'use strict';

const fs = require('fs');
const Product = require('../../models/productModel');
const ReelJob = require('../../models/reelJobModel');
const { TRIAL_TAG } = ReelJob;
const { renderStill, resolveMp4, filesForJob } = require('../../services/reelLocalRender');

let renderLock = false;

function publicJob(doc) {
  return {
    id: String(doc._id),
    trialTag: doc.trialTag,
    codigo: doc.codigo,
    productName: doc.productName,
    status: doc.status,
    error: doc.error || '',
    bytes: doc.bytes || 0,
    durationMs: doc.durationMs || 0,
    fileName: doc.fileName || '',
    files: filesForJob(doc._id),
    createdAt: doc.createdAt
  };
}

async function createJob(req, res) {
  if (process.env.VERCEL) {
    return res.status(503).json({ success: false, message: 'El render no corre en Vercel' });
  }
  if (renderLock) {
    return res.status(409).json({ success: false, message: 'Ya hay un Reel renderizándose' });
  }
  renderLock = true;
  let claimed = null;
  try {
    const codigo = String(req.body?.codigo || '').trim().toUpperCase();
    if (!codigo) {
      return res.status(400).json({ success: false, message: 'Falta el código del producto' });
    }
    const product = await Product.findOne({ codigo }).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'No encontré ese producto' });
    }
    if (!(product.stock > 0) || !(product.sellingPrice > 0) || !(product.productImage && product.productImage[0])) {
      return res.status(400).json({ success: false, message: 'El producto necesita stock, precio y una foto' });
    }
    const created = await ReelJob.create({
      trialTag: TRIAL_TAG,
      productId: product._id,
      codigo: product.codigo,
      productName: product.productName,
      status: 'queued',
      createdBy: req.userId
    });
    claimed = await ReelJob.findOneAndUpdate(
      { _id: created._id, status: 'queued', trialTag: TRIAL_TAG },
      { $set: { status: 'rendering' } },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({ success: false, message: 'Ese trabajo ya se estaba renderizando' });
    }
    res.status(202).json({ success: true, data: publicJob(claimed) });
    try {
      const priceLabel = `Gs. ${Number(product.sellingPrice).toLocaleString('es-PY')}`;
      const result = await renderStill({
        id: String(claimed._id),
        productName: product.productName,
        priceLabel,
        imageUrl: product.productImage[0]
      });
      await ReelJob.updateOne(
        { _id: claimed._id, status: 'rendering', trialTag: TRIAL_TAG },
        { $set: { status: 'ready_for_review', bytes: result.bytes, durationMs: result.durationMs, fileName: result.fileName, error: '' } }
      );
    } catch (error) {
      console.error('[reels] render', error && error.message ? error.message.slice(0, 300) : 'error');
      await ReelJob.updateOne(
        { _id: claimed._id, status: 'rendering', trialTag: TRIAL_TAG },
        { $set: { status: 'failed', error: 'No se pudo generar el video' } }
      );
    }
    return undefined;
  } catch (error) {
    console.error('[reels] alta', error && error.message ? error.message.slice(0, 300) : 'error');
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ success: false, message: 'No se pudo crear el trabajo' });
    }
    return undefined;
  } finally {
    renderLock = false;
  }
}

async function listJobs(req, res) {
  const rows = await ReelJob.find({ trialTag: TRIAL_TAG }).sort({ createdAt: -1 }).limit(20);
  return res.json({ success: true, data: rows.map(publicJob) });
}

async function listTrials(req, res) {
  const rows = await ReelJob.find({ trialTag: TRIAL_TAG }).sort({ createdAt: -1 }).limit(100);
  return res.json({ success: true, data: rows.map(publicJob) });
}

async function getJob(req, res) {
  const doc = await ReelJob.findOne({ _id: req.params.id, trialTag: TRIAL_TAG });
  if (!doc) return res.status(404).json({ success: false, message: 'Trabajo no encontrado' });
  return res.json({ success: true, data: publicJob(doc) });
}

function streamJob(req, res) {
  ReelJob.findOne({ _id: req.params.id, trialTag: TRIAL_TAG }).then((doc) => {
    if (!doc || doc.status !== 'ready_for_review') {
      res.status(404).json({ success: false, message: 'El video todavía no está listo' });
      return;
    }
    const full = resolveMp4(doc.fileName);
    if (!full) {
      res.status(404).json({ success: false, message: 'No encontré el archivo de video' });
      return;
    }
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', 'inline; filename="reel.mp4"');
    fs.createReadStream(full).pipe(res);
  }).catch(() => {
    if (!res.headersSent) res.status(404).json({ success: false, message: 'Trabajo no encontrado' });
  });
}

module.exports = {
  createJob,
  listJobs,
  listTrials,
  getJob,
  streamJob
};
