const express = require('express');
const router = express.Router();
const authToken = require('../middleware/authToken');
const {
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
} = require('../controller/category/categoryController');

// Rutas para categorías
router.get('/all', authToken, getAllCategories);
router.get('/active', getActiveCategories);
router.get('/:id', getCategoryById);

// ========== ENDPOINTS OPTIMIZADOS PARA MENÚ ==========
// Sin autenticación para velocidad
router.get('/menu/categories', getCategoriesForMenu);
router.get('/menu/categories/:categoryValue/subcategories', getSubcategoriesForMenu);
router.get('/menu/categories/:categoryValue/subcategories/:subcategoryValue/specifications', getSpecificationsForMenu);

// ========== ENDPOINT PARA PRECARGA COMPLETA ==========
router.get('/menu/complete-structure', getAllCategoriesStructure);
router.post('/', authToken, createCategory);
router.put('/:id', authToken, updateCategory);
router.delete('/:id', authToken, deleteCategory);

// Rutas para subcategorías
router.post('/:id/subcategories', authToken, addSubcategory);
router.put('/:id/subcategories/:subcategoryId', authToken, updateSubcategory);
router.delete('/:id/subcategories/:subcategoryId', authToken, deleteSubcategory);

// Rutas para especificaciones
router.post('/:id/subcategories/:subcategoryId/specifications', addSpecification);
router.put('/:id/subcategories/:subcategoryId/specifications/:specificationId', authToken, updateSpecification);
router.delete('/:id/subcategories/:subcategoryId/specifications/:specificationId', authToken, deleteSpecification);

module.exports = router;
