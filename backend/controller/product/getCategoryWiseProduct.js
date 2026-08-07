const productModel = require("../../models/productModel");

const getCategoryWiseProduct = async (req, res) => {
  try {
    const { category, subcategory, excludeId, limit: rawLimit } = req.body || {};
    if (!category) {
      return res.status(400).json({
        message: "category es requerido",
        success: false,
        error: true
      });
    }

    const limit = Math.min(48, Math.max(1, Number(rawLimit) || 24));
    const query = {
      category,
      $or: [
        { stock: { $exists: false } },
        { stock: null },
        { stock: { $gte: 1 } }
      ]
    };
    if (subcategory) {
      query.subcategory = subcategory;
    }
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const projection = {
      productName: 1,
      brandName: 1,
      category: 1,
      subcategory: 1,
      productImage: { $slice: 2 },
      price: 1,
      sellingPrice: 1,
      slug: 1,
      stock: 1,
      codigo: 1,
      createdAt: 1
    };

    const products = await productModel
      .find(query, projection)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      data: products,
      message: subcategory
        ? "Productos filtrados por categoría y subcategoría"
        : "Productos por categoría",
      success: true,
      error: false
    });
  } catch (err) {
    res.status(400).json({
      message: err.message || err,
      error: true,
      success: false
    });
  }
};

module.exports = getCategoryWiseProduct;
