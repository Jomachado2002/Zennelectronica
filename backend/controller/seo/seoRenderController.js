'use strict';

const { loadProductPage, loadCategoryPage } = require('../../services/seoPageHtml');

const CACHE = 'public, max-age=60, s-maxage=600, stale-while-revalidate=3600';
const NO_STORE = 'private, no-store';

function send(res, page) {
  res.set({
    'Cache-Control': CACHE,
    'Vercel-CDN-Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600'
  });
  res.json({ success: true, ...page });
}

function fail(res, status, message, error) {
  if (error) console.error('[seo-render]', error);
  res.set({
    'Cache-Control': NO_STORE,
    'Vercel-CDN-Cache-Control': NO_STORE
  });
  res.status(status).json({ success: false, message });
}

async function renderProductController(req, res) {
  try {
    const page = await loadProductPage(req.params.slug);
    if (!page) {
      fail(res, 404, 'Producto no encontrado');
      return;
    }
    if (page.redirect) {
      res.set({
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=86400'
      });
      res.json({ success: true, redirect: page.redirect });
      return;
    }
    send(res, page);
  } catch (error) {
    fail(res, 500, 'No se pudo preparar la página', error);
  }
}

async function renderCategoryController(req, res) {
  try {
    const page = await loadCategoryPage(req.query.category, req.query.subcategory);
    if (!page) {
      fail(res, 404, 'Categoría no encontrada');
      return;
    }
    send(res, page);
  } catch (error) {
    fail(res, 500, 'No se pudo preparar la página', error);
  }
}

module.exports = {
  renderProductController,
  renderCategoryController
};
