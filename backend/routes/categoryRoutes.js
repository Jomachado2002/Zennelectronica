const express = require('express');
const router = express.Router();
const authToken = require('../middleware/authToken');
const adminAuth = require('../middleware/adminAuth');
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
router.get('/all', adminAuth, getAllCategories);
router.get('/active', getActiveCategories);
router.get('/:id', getCategoryById);

// ========== ENDPOINTS OPTIMIZADOS PARA MENÚ ==========
// Sin autenticación para velocidad
router.get('/menu/categories', getCategoriesForMenu);
router.get('/menu/categories/:categoryValue/subcategories', getSubcategoriesForMenu);
router.get('/menu/categories/:categoryValue/subcategories/:subcategoryValue/specifications', getSpecificationsForMenu);

// ========== ENDPOINT PARA PRECARGA COMPLETA ==========
router.get('/menu/complete-structure', getAllCategoriesStructure);
router.post('/', adminAuth, createCategory);
router.put('/:id', adminAuth, updateCategory);
router.delete('/:id', adminAuth, deleteCategory);

// Rutas para subcategorías
router.post('/:id/subcategories', adminAuth, addSubcategory);
router.put('/:id/subcategories/:subcategoryId', adminAuth, updateSubcategory);
router.delete('/:id/subcategories/:subcategoryId', adminAuth, deleteSubcategory);

// Rutas para especificaciones
router.post('/:id/subcategories/:subcategoryId/specifications', adminAuth, addSpecification);
router.put('/:id/subcategories/:subcategoryId/specifications/:specificationId', adminAuth, updateSpecification);
router.delete('/:id/subcategories/:subcategoryId/specifications/:specificationId', adminAuth, deleteSpecification);

module.exports = router;
