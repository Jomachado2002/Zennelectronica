'use strict';

const {
  listAiImages,
  getAiImage,
  chatAiImage,
  finalizeAiImage,
  deleteAiImage
} = require('../../services/aiImageStudio');

function fail(res, error, fallback) {
  const status = Number(error.status) || 500;
  return res.status(status).json({
    success: false,
    message: error.message || fallback
  });
}

async function list(req, res) {
  try {
    const data = await listAiImages();
    return res.json({ success: true, ...data });
  } catch (error) {
    return fail(res, error, 'No se pudieron leer las imágenes');
  }
}

async function detail(req, res) {
  try {
    const image = await getAiImage(req.params.id);
    return res.json({ success: true, image });
  } catch (error) {
    return fail(res, error, 'No se pudo abrir la imagen');
  }
}

async function chat(req, res) {
  try {
    const image = await chatAiImage({
      sessionId: req.body?.sessionId,
      message: req.body?.message,
      format: req.body?.format,
      userId: req.userId
    });
    return res.json({ success: true, image });
  } catch (error) {
    console.error('[imagenes ai]', error.message || error);
    return fail(res, error, 'No se pudo armar la imagen');
  }
}

async function finalize(req, res) {
  try {
    const image = await finalizeAiImage(req.params.id);
    return res.json({ success: true, message: 'La imagen quedó guardada', image });
  } catch (error) {
    return fail(res, error, 'No se pudo guardar la imagen');
  }
}

async function remove(req, res) {
  try {
    const image = await deleteAiImage(req.params.id);
    return res.json({ success: true, image });
  } catch (error) {
    return fail(res, error, 'No se pudo borrar la imagen');
  }
}

module.exports = { list, detail, chat, finalize, remove };
