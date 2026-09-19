'use strict';

/**
 * Solo 301 /producto/{ObjectId} → /producto/{slug}.
 * No sirve una ficha HTML distinta: usuarios y Google ven el mismo SPA.
 */

const mongoose = require('mongoose');
const productModel = require('../../models/productModel');
const { SITE } = require('./sitemapController');
const { isMongoObjectId } = require('../../helpers/productStructuredData');

async function findProduct(slugOrId) {
  const key = String(slugOrId || '').trim();
  if (!key) return null;

  let product = await productModel.findOne({ slug: key }).select('slug').lean();
  if (
    !product &&
    isMongoObjectId(key) &&
    mongoose.Types.ObjectId.isValid(key)
  ) {
    product = await productModel.findById(key).select('slug').lean();
  }
  return product;
}

const productSeoHtmlController = async (req, res) => {
  try {
    const slugOrId = req.params.slugOrId || req.params.slug;
    const product = await findProduct(slugOrId);

    if (!product) {
      res.status(404).json({ success: false, message: 'Producto no encontrado' });
      return;
    }

    if (
      isMongoObjectId(slugOrId) &&
      product.slug &&
      String(product.slug) !== String(slugOrId)
    ) {
      const loc = `${SITE}/producto/${product.slug}`;
      res.set({
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=86400'
      });
      res.redirect(301, loc);
      return;
    }

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error canonical producto' });
  }
};

module.exports = {
  productSeoHtmlController,
  findProduct
};
