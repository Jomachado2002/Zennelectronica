'use strict';

const archiver = require('archiver');
const {
  listSubcategoryBrandBoards,
  getSubcategoryBrandBoard,
  renderBrandStoryPreviewHtml,
  renderBrandStoryPng,
  storyCaption,
  storyFileName
} = require('../../services/brandStory');

const MAX_ZIP = 12;

function readPair(source) {
  const category = String(source.category || '').trim();
  const subcategory = String(source.subcategory || '').trim();
  const page = source.page;
  return { category, subcategory, page };
}

const listBrandStories = async (req, res) => {
  try {
    const refresh = String(req.query.refresh || '') === '1';
    const data = await listSubcategoryBrandBoards({ refresh });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[historias-marcas] list', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudieron armar las historias de marcas'
    });
  }
};

const previewBrandStoryHtml = async (req, res) => {
  try {
    const { category, subcategory, page } = readPair(req.query);
    const board = await getSubcategoryBrandBoard(category, subcategory);
    if (!board) return res.status(404).type('text/plain').send('Subcategoría sin marcas en stock');
    const html = await renderBrandStoryPreviewHtml(board, page);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Story-Caption', encodeURIComponent(storyCaption(board, page)));
    return res.type('html').send(html);
  } catch (error) {
    console.error('[historias-marcas] html', error);
    return res.status(500).type('text/plain').send('Error generando la historia');
  }
};

const downloadBrandStoryPng = async (req, res) => {
  try {
    const { category, subcategory, page } = readPair(req.query);
    const board = await getSubcategoryBrandBoard(category, subcategory);
    if (!board) return res.status(404).json({ success: false, message: 'Subcategoría sin marcas en stock' });
    const png = await renderBrandStoryPng(board, page);
    const fileName = storyFileName(board, page || 1);
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store'
    });
    return res.send(png);
  } catch (error) {
    console.error('[historias-marcas] png', error);
    const chromeMissing = /Could not find Chrome|executablePath|chromium/i.test(String(error && error.message));
    return res.status(500).json({
      success: false,
      message: chromeMissing
        ? 'Chrome no está disponible en el servidor. Reintentá en unos segundos.'
        : 'Error descargando la historia'
    });
  }
};

const exportBrandStoriesZip = async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items.slice(0, MAX_ZIP) : [];
    if (!items.length) {
      return res.status(400).json({ success: false, message: 'Elegí al menos una subcategoría' });
    }

    const jobs = [];
    for (const item of items) {
      const { category, subcategory, page } = readPair(item);
      const board = await getSubcategoryBrandBoard(category, subcategory);
      if (!board) continue;
      const pages = page ? [Number(page)] : Array.from({ length: board.pages }, (_, i) => i + 1);
      for (const storyPage of pages) jobs.push({ board, page: storyPage });
    }

    if (!jobs.length) {
      return res.status(404).json({ success: false, message: 'No hay historias para exportar' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="zenn-historias-marcas-${new Date().toISOString().slice(0, 10)}.zip"`
    );

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      console.error('[historias-marcas] zip', err);
      try {
        res.end();
      } catch {
        /* ignore */
      }
    });
    archive.pipe(res);

    for (const job of jobs) {
      const png = await renderBrandStoryPng(job.board, job.page);
      archive.append(png, { name: storyFileName(job.board, job.page) });
    }

    await archive.finalize();
  } catch (error) {
    console.error('[historias-marcas] zip export', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Error exportando las historias' });
    }
  }
};

module.exports = {
  listBrandStories,
  previewBrandStoryHtml,
  downloadBrandStoryPng,
  exportBrandStoriesZip
};
