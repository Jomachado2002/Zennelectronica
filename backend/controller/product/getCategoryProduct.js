const productModel = require("../../models/productModel");

const getCategoryProduct = async (req, res) => {
  try {
    const { category, subcategory } = req.body;
    
    // Construir query filtrando por ambos campos
    const query = { category, subcategory };
    
    const categoryProducts = await productModel.find(query).sort({ _id: 1 });
    
    res.json({
      message: "Productos por categoría y subcategoría",
      data: categoryProducts,
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

module.exports = getCategoryProduct;
