'use strict';

const { readCategoryHub } = require('../../services/categorySeo');

async function categorySeoController(req, res) {
  try {
    const category = String(req.query.category || '').trim();
    const subcategory = String(req.query.subcategory || '').trim();
    const data = await readCategoryHub(category, subcategory);
    res.set('Cache-Control', 'public, max-age=300, s-maxage=900');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { categorySeoController };
