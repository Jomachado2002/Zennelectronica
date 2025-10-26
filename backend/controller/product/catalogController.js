const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');

// Obtener productos agrupados por categoría para catálogo PDF
const getCatalogProducts = async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    
    // Construir filtro de búsqueda
    let filter = {};
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (subcategory && subcategory !== 'all') {
      filter.subcategory = subcategory;
    }
    
    // Obtener productos con filtros
    const products = await Product.find(filter)
      .select('productName brandName category subcategory productImage description price sellingPrice codigo')
      .sort({ category: 1, subcategory: 1, productName: 1 })
      .lean();
    
    // Obtener todas las categorías para estructura
    const categories = await Category.find({ isActive: true })
      .select('name label value subcategories')
      .sort({ order: 1 })
      .lean();
    
    // Agrupar productos por categoría y subcategoría
    const catalogData = [];
    
    for (const cat of categories) {
      // Filtrar productos de esta categoría
      const categoryProducts = products.filter(p => p.category === cat.value);
      
      if (categoryProducts.length === 0) continue;
      
      // Agrupar por subcategorías
      const subcategories = [];
      const subcategoryMap = new Map();
      
      // Crear mapa de subcategorías de la categoría
      for (const sub of cat.subcategories) {
        if (sub.isActive) {
          subcategoryMap.set(sub.value, {
            id: sub._id,
            name: sub.name,
            label: sub.label,
            value: sub.value,
            productos: []
          });
        }
      }
      
      // Agrupar productos por subcategoría
      for (const product of categoryProducts) {
        if (subcategoryMap.has(product.subcategory)) {
          const sub = subcategoryMap.get(product.subcategory);
          sub.productos.push({
            id: product._id,
            titulo: product.productName,
            marca: product.brandName,
            descripcion: product.description || `${product.brandName} - ${product.productName}`,
            precio: product.sellingPrice || product.price,
            codigo: product.codigo,
            imagen_url: product.productImage && product.productImage.length > 0 
              ? product.productImage[0] 
              : null
          });
        }
      }
      
      // Agregar subcategorías que tienen productos
      for (const sub of subcategoryMap.values()) {
        if (sub.productos.length > 0) {
          subcategories.push(sub);
        }
      }
      
      if (subcategories.length > 0) {
        catalogData.push({
          id: cat._id,
          categoria: cat.name,
          categoria_label: cat.label,
          categoria_value: cat.value,
          subcategorias: subcategories
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Productos del catálogo obtenidos exitosamente',
      data: catalogData,
      total_categories: catalogData.length,
      total_products: products.length,
      filters_applied: {
        category: category || 'all',
        subcategory: subcategory || 'all'
      }
    });
    
  } catch (error) {
    console.error('Error en getCatalogProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener categorías para filtros del catálogo
const getCatalogCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name label value subcategories.name subcategories.label subcategories.value subcategories.isActive')
      .sort({ order: 1 })
      .lean();
    
    const formattedCategories = categories.map(cat => ({
      id: cat._id,
      name: cat.name,
      label: cat.label,
      value: cat.value,
      subcategories: cat.subcategories
        .filter(sub => sub.isActive)
        .map(sub => ({
          id: sub._id,
          name: sub.name,
          label: sub.label,
          value: sub.value
        }))
    }));
    
    res.status(200).json({
      success: true,
      message: 'Categorías para catálogo obtenidas exitosamente',
      data: formattedCategories
    });
    
  } catch (error) {
    console.error('Error en getCatalogCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getCatalogProducts,
  getCatalogCategories
};


