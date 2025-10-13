const Category = require('../../models/categoryModel');

// Obtener todas las categorías
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.getAllCategories();
    
    res.status(200).json({
      success: true,
      message: 'Categorías obtenidas exitosamente',
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener categorías activas
const getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.getActiveCategories();
    
    res.status(200).json({
      success: true,
      message: 'Categorías activas obtenidas exitosamente',
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Error obteniendo categorías activas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener una categoría por ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Categoría obtenida exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error obteniendo categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear nueva categoría
const createCategory = async (req, res) => {
  try {
    const categoryData = req.body;
    
    // Validar que no exista una categoría con el mismo name o value
    const existingCategory = await Category.findOne({
      $or: [
        { name: categoryData.name },
        { value: categoryData.value }
      ]
    });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con este nombre o valor'
      });
    }
    
    const newCategory = new Category(categoryData);
    await newCategory.save();
    
    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: newCategory
    });
  } catch (error) {
    console.error('Error creando categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar categoría
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Validar que no exista otra categoría con el mismo name o value
    if (updateData.name || updateData.value) {
      const existingCategory = await Category.findOne({
        _id: { $ne: id },
        $or: [
          updateData.name ? { name: updateData.name } : {},
          updateData.value ? { value: updateData.value } : {}
        ]
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra categoría con este nombre o valor'
        });
      }
    }
    
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error actualizando categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar categoría
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    await Category.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Agregar subcategoría a una categoría
const addSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const subcategoryData = req.body;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Validar que no exista una subcategoría con el mismo value
    const existingSubcategory = category.subcategories.find(
      sub => sub.value === subcategoryData.value
    );
    
    if (existingSubcategory) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una subcategoría con este valor'
      });
    }
    
    category.subcategories.push(subcategoryData);
    await category.save();
    
    res.status(200).json({
      success: true,
      message: 'Subcategoría agregada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error agregando subcategoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar subcategoría
const updateSubcategory = async (req, res) => {
  try {
    const { id, subcategoryId } = req.params;
    const updateData = req.body;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Buscar subcategoría por ID o por value (más robusto)
    let subcategory = category.subcategories.id(subcategoryId);
    
    // Si no se encuentra por ID, intentar buscar por value (fallback)
    if (!subcategory) {
      subcategory = category.subcategories.find(sub => sub.value === subcategoryId);
    }
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategoría no encontrada'
      });
    }
    
    // Validar que no exista otra subcategoría con el mismo value
    if (updateData.value) {
      const existingSubcategory = category.subcategories.find(
        sub => sub.value === updateData.value && sub._id.toString() !== subcategoryId
      );
      
      if (existingSubcategory) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra subcategoría con este valor'
        });
      }
    }
    
    Object.assign(subcategory, updateData);
    await category.save();
    
    res.status(200).json({
      success: true,
      message: 'Subcategoría actualizada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error actualizando subcategoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar subcategoría
const deleteSubcategory = async (req, res) => {
  try {
    const { id, subcategoryId } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Buscar subcategoría por ID o por value (más robusto)
    let subcategory = category.subcategories.id(subcategoryId);
    
    // Si no se encuentra por ID, intentar buscar por value (fallback)
    if (!subcategory) {
      subcategory = category.subcategories.find(sub => sub.value === subcategoryId);
    }
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategoría no encontrada'
      });
    }
    
    category.subcategories.pull(subcategory._id);
    await category.save();
    
    res.status(200).json({
      success: true,
      message: 'Subcategoría eliminada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error eliminando subcategoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Agregar especificación a una subcategoría
const addSpecification = async (req, res) => {
  try {
    const { id, subcategoryId } = req.params;
    const specificationData = req.body;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Buscar subcategoría por ID o por value (más robusto)
    let subcategory = category.subcategories.find(sub => sub._id.toString() === subcategoryId);
    
    // Si no se encuentra por ID, intentar buscar por value (fallback)
    if (!subcategory) {
      subcategory = category.subcategories.find(sub => sub.value === subcategoryId);
    }
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategoría no encontrada'
      });
    }
    
    // Validar que no exista una especificación con el mismo name
    const existingSpecification = subcategory.specifications.find(
      spec => spec.name === specificationData.name
    );
    
    if (existingSpecification) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una especificación con este nombre'
      });
    }
    
    subcategory.specifications.push(specificationData);
    await category.save();
    
    res.status(200).json({
      success: true,
      message: 'Especificación agregada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error agregando especificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar especificación
const updateSpecification = async (req, res) => {
  try {
    const { id, subcategoryId, specificationId } = req.params;
    const updateData = req.body;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Buscar subcategoría por ID o por value (más robusto)
    let subcategory = category.subcategories.id(subcategoryId);
    
    // Si no se encuentra por ID, intentar buscar por value (fallback)
    if (!subcategory) {
      subcategory = category.subcategories.find(sub => sub.value === subcategoryId);
    }
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategoría no encontrada'
      });
    }
    
    const specification = subcategory.specifications.id(specificationId);
    if (!specification) {
      return res.status(404).json({
        success: false,
        message: 'Especificación no encontrada'
      });
    }
    
    // Validar que no exista otra especificación con el mismo name
    if (updateData.name) {
      const existingSpecification = subcategory.specifications.find(
        spec => spec.name === updateData.name && spec._id.toString() !== specificationId
      );
      
      if (existingSpecification) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra especificación con este nombre'
        });
      }
    }
    
    // Guardar los datos anteriores para comparación
    const oldSpecification = { ...specification.toObject() };
    
    Object.assign(specification, updateData);
    await category.save();
    
            // ✅ ACTUALIZACIÓN EN CASCADA: Si cambió el nombre o label, actualizar productos
            if (updateData.name || updateData.label) {
              await updateProductsWithSpecificationChanges(
                category.value,
                subcategory.value,
                oldSpecification,
                specification.toObject()
              );
            }
    
    res.status(200).json({
      success: true,
      message: 'Especificación actualizada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error actualizando especificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar especificación
const deleteSpecification = async (req, res) => {
  try {
    const { id, subcategoryId, specificationId } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Buscar subcategoría por ID o por value (más robusto)
    let subcategory = category.subcategories.id(subcategoryId);
    
    // Si no se encuentra por ID, intentar buscar por value (fallback)
    if (!subcategory) {
      subcategory = category.subcategories.find(sub => sub.value === subcategoryId);
    }
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategoría no encontrada'
      });
    }
    
    const specification = subcategory.specifications.id(specificationId);
    if (!specification) {
      return res.status(404).json({
        success: false,
        message: 'Especificación no encontrada'
      });
    }
    
    subcategory.specifications.pull(specificationId);
    await category.save();
    
    res.status(200).json({
      success: true,
      message: 'Especificación eliminada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error eliminando especificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN PARA ACTUALIZACIÓN EN CASCADA DE PRODUCTOS
const updateProductsWithSpecificationChanges = async (categoryValue, subcategoryValue, oldSpec, newSpec) => {
  try {
    const ProductModel = require('../../models/productModel');
    
    // Buscar productos que usan esta categoría y subcategoría Y que tengan el campo específico
    const products = await ProductModel.find({
      category: categoryValue,
      subcategory: subcategoryValue,
      [oldSpec.name]: { $exists: true }
    });
    
    let updatedCount = 0;
    
    for (const product of products) {
      // Si cambió el nombre de la especificación, actualizar el campo en el producto
      if (oldSpec.name !== newSpec.name && product[oldSpec.name] !== undefined) {
        // Usar updateOne directamente para evitar problemas con el esquema
        await ProductModel.updateOne(
          { _id: product._id },
          { 
            $set: { [newSpec.name]: product[oldSpec.name] },
            $unset: { [oldSpec.name]: 1 }
          }
        );
        
        updatedCount++;
      }
    }
    
    return {
      success: true,
      updatedCount,
      totalProducts: products.length
    };
    
  } catch (error) {
    console.error('❌ Error en actualización en cascada:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ========== ENDPOINTS OPTIMIZADOS PARA MENÚ ==========

// Obtener todas las categorías para el menú (optimizado)
const getCategoriesForMenu = async (req, res) => {
  try {
    const categories = await Category.find({}, 'name label value')
      .sort({ createdAt: 1 }) // Orden por fecha de creación (más antiguas primero)
      .lean(); // .lean() para mejor performance

    const formattedCategories = categories.map(category => ({
      id: category._id,
      value: category.value,
      label: category.label,
      name: category.name
    }));

    res.status(200).json({
      success: true,
      data: formattedCategories
    });
  } catch (error) {
    console.error('Error obteniendo categorías para menú:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener subcategorías por categoría (optimizado)
const getSubcategoriesForMenu = async (req, res) => {
  try {
    const { categoryValue } = req.params;

    const category = await Category.findOne(
      { value: categoryValue },
      'subcategories.name subcategories.label subcategories.value'
    ).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    const subcategories = category.subcategories.map(sub => ({
      id: sub._id,
      value: sub.value,
      label: sub.label,
      name: sub.name
    }));

    res.status(200).json({
      success: true,
      data: subcategories
    });
  } catch (error) {
    console.error('Error obteniendo subcategorías para menú:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener especificaciones por subcategoría (optimizado)
const getSpecificationsForMenu = async (req, res) => {
  try {
    const { categoryValue, subcategoryValue } = req.params;

    const category = await Category.findOne(
      { 
        value: categoryValue,
        'subcategories.value': subcategoryValue 
      },
      'subcategories.$'
    ).lean();

    if (!category || !category.subcategories || category.subcategories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subcategoría no encontrada'
      });
    }

    const subcategory = category.subcategories[0];
    const specifications = subcategory.specifications.map(spec => ({
      id: spec._id,
      value: spec.value,
      label: spec.label,
      name: spec.name,
      type: spec.type
    }));

    res.status(200).json({
      success: true,
      data: specifications
    });
  } catch (error) {
    console.error('Error obteniendo especificaciones para menú:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener TODA la estructura de categorías de una vez (optimizado para precarga)
const getAllCategoriesStructure = async (req, res) => {
  try {
    const categories = await Category.find({})
      .sort({ createdAt: 1 }) // Orden por fecha de creación (más antiguas primero)
      .lean(); // .lean() para mejor performance

    const structuredData = categories.map(category => ({
      id: category._id,
      value: category.value,
      label: category.label,
      name: category.name,
      subcategories: category.subcategories.map(subcategory => ({
        id: subcategory._id,
        value: subcategory.value,
        label: subcategory.label,
        name: subcategory.name,
        specifications: subcategory.specifications.map(specification => ({
          id: specification._id,
          value: specification.value,
          label: specification.label,
          name: specification.name,
          type: specification.type
        }))
      }))
    }));

    res.status(200).json({
      success: true,
      data: structuredData
    });
  } catch (error) {
    console.error('Error obteniendo estructura completa de categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getAllCategories,
  getActiveCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
  addSpecification,
  updateSpecification,
  deleteSpecification,
  // Nuevos endpoints optimizados
  getCategoriesForMenu,
  getSubcategoriesForMenu,
  getSpecificationsForMenu,
  getAllCategoriesStructure
};
