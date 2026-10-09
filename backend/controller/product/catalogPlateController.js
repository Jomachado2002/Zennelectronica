'use strict';

const ProductModel = require('../../models/productModel');
const { renderCatalogPlate } = require('../../services/catalogPlateImage');

const catalogPlateController = async (req, res) => {
  const codigo = String(req.params.file || '')
    .replace(/\.jpg$/i, '')
    .trim()
    .toUpperCase();
  if (!codigo) {
    res.status(400).type('text/plain').send('Código requerido');
    return;
  }

  try {
    const product = await ProductModel.findOne({ codigo })
      .select('codigo productName brandName price sellingPrice productImage')
      .lean();
    if (!product) {
      res.status(404).type('text/plain').send('Producto no encontrado');
      return;
    }
    const jpeg = await renderCatalogPlate(product);
    res.status(200);
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*'
    });
    res.send(jpeg);
  } catch (error) {
    const product = await ProductModel.findOne({ codigo }).select('productImage').lean();
    const fallback = (product && product.productImage || []).find((url) => /^https:\/\//.test(String(url || '')));
    if (fallback) {
      res.redirect(302, fallback);
      return;
    }
    res.status(404).type('text/plain').send(error.message || 'Sin imagen');
  }
};

module.exports = catalogPlateController;
