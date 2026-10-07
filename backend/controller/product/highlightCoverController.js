'use strict';

const {
  listHighlightCovers,
  findHighlightCover,
  renderHighlightCoverPreviewHtml,
  renderHighlightCoverPng,
  highlightFileName
} = require('../../services/highlightCover');

function readPair(source) {
  return {
    category: String(source.category || '').trim(),
    subcategory: String(source.subcategory || '').trim()
  };
}

const listHighlightCoversController = async (req, res) => {
  try {
    const refresh = String(req.query.refresh || '') === '1';
    const data = await listHighlightCovers({ refresh });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[iconos-destacadas] list', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudieron cargar las subcategorías'
    });
  }
};

const previewHighlightCoverHtml = async (req, res) => {
  try {
    const { category, subcategory } = readPair(req.query);
    const cover = await findHighlightCover(category, subcategory);
    if (!cover) return res.status(404).type('text/plain').send('Subcategoría no encontrada');
    const html = await renderHighlightCoverPreviewHtml(cover);
    res.setHeader('Cache-Control', 'no-store');
    return res.type('html').send(html);
  } catch (error) {
    console.error('[iconos-destacadas] html', error);
    return res.status(500).type('text/plain').send('No se pudo armar el ícono');
  }
};

const downloadHighlightCoverPng = async (req, res) => {
  try {
    const { category, subcategory } = readPair(req.query);
    const cover = await findHighlightCover(category, subcategory);
    if (!cover) return res.status(404).json({ success: false, message: 'Subcategoría no encontrada' });
    const png = await renderHighlightCoverPng(cover);
    const name = highlightFileName(cover);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(png);
  } catch (error) {
    console.error('[iconos-destacadas] png', error);
    return res.status(500).json({ success: false, message: 'No se pudo generar la imagen' });
  }
};

module.exports = {
  listHighlightCoversController,
  previewHighlightCoverHtml,
  downloadHighlightCoverPng
};
