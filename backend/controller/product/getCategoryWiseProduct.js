const productModel = require("../../models/productModel");

const getCategoryWiseProduct = async (req, res) => {
  try {
    // Extraemos ambos parámetros (tanto de body como de query si fuera necesario)
    const { category, subcategory } = req.body;  
    let query = { category };
    if (subcategory) {
      query.subcategory = subcategory;
    }
    
    const products = await productModel.find(query).sort({ _id: 1 });
    
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
