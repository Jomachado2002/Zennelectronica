const productModel = require('../../models/productModel');

const ADMIN_PROJECTION = {
  productName: 1,
  brandName: 1,
  category: 1,
  subcategory: 1,
  productImage: { $slice: 1 },
  price: 1,
  sellingPrice: 1,
  stock: 1,
  codigo: 1,
  slug: 1,
  isVipOffer: 1,
  profitAmount: 1,
  profitMargin: 1,
  purchasePriceUSD: 1,
  purchasePrice: 1,
  exchangeRate: 1,
  loanInterest: 1,
  deliveryCost: 1,
  createdAt: 1,
  updatedAt: 1
};

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Listado admin: NUNCA ordena toda la colección.
 * Sin categoría solo devuelve el total (count). Con categoría usa índice.
 */
const getAdminProducts = async (req, res) => {
  try {
    const countOnly =
      req.query.countOnly === '1' ||
      req.query.countOnly === 'true';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const subcategory =
      typeof req.query.subcategory === 'string' ? req.query.subcategory.trim() : '';
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(80, parsePositiveInt(req.query.limit, 60));
    const skip = (page - 1) * limit;

    if (countOnly || !category) {
      const total = await productModel.countDocuments({}).maxTimeMS(8000);
      return res.json({
        message: category
          ? 'Conteo de productos'
          : 'Elegí una categoría para listar productos',
        success: true,
        error: false,
        data: [],
        total,
        totalProducts: total,
        requiresCategory: !category,
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalProducts: total,
          hasNextPage: false,
          hasPrevPage: false,
          limit,
          productsInPage: 0
        }
      });
    }

    const query = { category };
    if (subcategory) query.subcategory = subcategory;

    const [products, total] = await Promise.all([
      productModel
        .find(query, ADMIN_PROJECTION)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(8000),
      productModel.countDocuments(query).maxTimeMS(5000)
    ]);

    const totalPages = Math.ceil(total / limit) || 0;

    return res.json({
      message: subcategory
        ? 'Productos por categoría y subcategoría'
        : 'Productos por categoría',
      success: true,
      error: false,
      data: products,
      total,
      totalProducts: total,
      requiresCategory: false,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
        productsInPage: products.length
      }
    });
  } catch (err) {
    return res.status(400).json({
      message: err.message || err,
      error: true,
      success: false
    });
  }
};

module.exports = getAdminProducts;
