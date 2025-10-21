import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSave, 
  FaTimes, 
  FaChevronDown, 
  FaChevronRight,
  FaCog
} from 'react-icons/fa';
import axiosInstance from '../../config/axiosInstance';
import { toast } from 'react-toastify';

const CategoriesManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState(new Set());
  
  // Estados para formularios
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(null);
  const [showAddSpecification, setShowAddSpecification] = useState(null);
  
  // Estados para edición
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editingSpecification, setEditingSpecification] = useState(null);
  
  // Estados para formularios
  const [newCategory, setNewCategory] = useState({
    name: '',
    label: '',
    value: '',
    order: 1,
    isActive: true,
    color: '#3B82F6',
    icon: 'FaFolder'
  });
  
  const [newSubcategory, setNewSubcategory] = useState({
    name: '',
    label: '',
    value: '',
    isActive: true,
    order: 1,
    specifications: []
  });
  
  const [newSpecification, setNewSpecification] = useState({
    name: '',
    label: '',
    type: 'text',
    placeholder: '',
    required: false,
    order: 1,
    options: []
  });

  // Cargar categorías
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/admin/categories/all');
      setCategories(response.data.data);
    } catch (error) {
      // console.error removed for production
      toast.error('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Toggle expansión de categoría
  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Toggle expansión de subcategoría
  const toggleSubcategory = (subcategoryValue) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(subcategoryValue)) {
      newExpanded.delete(subcategoryValue);
    } else {
      newExpanded.add(subcategoryValue);
    }
    setExpandedSubcategories(newExpanded);
  };

  // Crear nueva categoría
  const handleCreateCategory = async () => {
    try {
      await axiosInstance.post('/api/admin/categories/', newCategory);
      toast.success('Categoría creada exitosamente');
      setShowAddCategory(false);
      setNewCategory({
        name: '',
        label: '',
        value: '',
        order: 1,
        isActive: true,
        color: '#3B82F6',
        icon: 'FaFolder'
      });
      loadCategories();
    } catch (error) {
      // console.error removed for production
      toast.error('Error al crear la categoría');
    }
  };

  // Actualizar categoría
  const handleUpdateCategory = async (categoryId, updateData) => {
    try {
      await axiosInstance.put(`/api/admin/categories/${categoryId}`, updateData);
      toast.success('Categoría actualizada exitosamente');
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      // console.error removed for production
      toast.error('Error al actualizar la categoría');
    }
  };

  // Eliminar categoría
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/api/admin/categories/${categoryId}`);
      toast.success('Categoría eliminada exitosamente');
      loadCategories();
    } catch (error) {
      // console.error removed for production
      toast.error('Error al eliminar la categoría');
    }
  };

  // Crear nueva subcategoría
  const handleCreateSubcategory = async (categoryId) => {
    try {
      await axiosInstance.post(`/api/admin/categories/${categoryId}/subcategories`, newSubcategory);
      toast.success('Subcategoría creada exitosamente');
      setShowAddSubcategory(null);
      setNewSubcategory({
        name: '',
        label: '',
        value: '',
        isActive: true,
        order: 1,
        specifications: []
      });
      loadCategories();
    } catch (error) {
      // console.error removed for production
      toast.error('Error al crear la subcategoría');
    }
  };

  // Actualizar subcategoría
  const handleUpdateSubcategory = async (categoryId, subcategoryValue, updateData) => {
    try {
      await axiosInstance.put(`/api/admin/categories/${categoryId}/subcategories/${subcategoryValue}`, updateData);
      toast.success('Subcategoría actualizada exitosamente');
      setEditingSubcategory(null);
      loadCategories();
    } catch (error) {
      // console.error removed for production
      toast.error('Error al actualizar la subcategoría');
    }
  };

  // Eliminar subcategoría
  const handleDeleteSubcategory = async (categoryId, subcategoryValue) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta subcategoría?')) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/api/admin/categories/${categoryId}/subcategories/${subcategoryValue}`);
      toast.success('Subcategoría eliminada exitosamente');
      loadCategories();
    } catch (error) {
      // console.error removed for production
      toast.error('Error al eliminar la subcategoría');
    }
  };

  // Crear nueva especificación
  const handleCreateSpecification = async (categoryId, subcategoryValue) => {
    try {
      const url = `/api/admin/categories/${categoryId}/subcategories/${subcategoryValue}/specifications`;
      // console.log removed for production
      // console.log removed for production
      
      const response = await axiosInstance.post(url, newSpecification);
      // console.log removed for production
      
      toast.success('Especificación creada exitosamente');
      setShowAddSpecification(null);
      setNewSpecification({
        name: '',
        label: '',
        type: 'text',
        placeholder: '',
        required: false,
        order: 1,
        options: []
      });
      loadCategories();
    } catch (error) {
      // console.error removed for production
      // console.error removed for production
      // console.error removed for production
      // console.error removed for production
      // console.error removed for production
      toast.error('Error al crear la especificación');
    }
  };

  // Actualizar especificación
  const handleUpdateSpecification = async (categoryId, subcategoryValue, specificationId, updateData) => {
    try {
      await axiosInstance.put(`/api/admin/categories/${categoryId}/subcategories/${subcategoryValue}/specifications/${specificationId}`, updateData);
      toast.success('Especificación actualizada exitosamente');
      setEditingSpecification(null);
      loadCategories();
    } catch (error) {
      // console.error removed for production
      toast.error('Error al actualizar la especificación');
    }
  };

  // Eliminar especificación
  const handleDeleteSpecification = async (categoryId, subcategoryValue, specificationId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta especificación?')) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/api/admin/categories/${categoryId}/subcategories/${subcategoryValue}/specifications/${specificationId}`);
      toast.success('Especificación eliminada exitosamente');
      loadCategories();
    } catch (error) {
      // console.error removed for production
      toast.error('Error al eliminar la especificación');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Categorías</h2>
        <button
          onClick={() => setShowAddCategory(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus /> Nueva Categoría
        </button>
      </div>

      {/* Formulario para nueva categoría */}
      {showAddCategory && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Nueva Categoría</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ej: informatica"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta</label>
              <input
                type="text"
                value={newCategory.label}
                onChange={(e) => setNewCategory({...newCategory, label: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ej: Informática"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
              <input
                type="text"
                value={newCategory.value}
                onChange={(e) => setNewCategory({...newCategory, value: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ej: informatica"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
              <input
                type="number"
                value={newCategory.order}
                onChange={(e) => setNewCategory({...newCategory, order: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={newCategory.color}
                onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                className="w-full h-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activa</label>
              <input
                type="checkbox"
                checked={newCategory.isActive}
                onChange={(e) => setNewCategory({...newCategory, isActive: e.target.checked})}
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateCategory}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaSave /> Guardar
            </button>
            <button
              onClick={() => setShowAddCategory(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaTimes /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de categorías */}
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category._id} className="border rounded-lg">
            {/* Header de categoría */}
            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleCategory(category._id)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  {expandedCategories.has(category._id) ? <FaChevronDown /> : <FaChevronRight />}
                </button>
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: category.color }}
                ></div>
                {editingCategory === category._id ? (
                  <input
                    type="text"
                    defaultValue={category.label}
                    onBlur={(e) => {
                      if (e.target.value !== category.label) {
                        handleUpdateCategory(category._id, { label: e.target.value });
                      }
                    }}
                    className="font-semibold text-lg bg-white border rounded px-2 py-1"
                    autoFocus
                  />
                ) : (
                  <h3 className="font-semibold text-lg text-gray-800">{category.label}</h3>
                )}
                <span className="text-sm text-gray-500">
                  ({category.subcategories.length} subcategorías)
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddSubcategory(category._id)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Agregar subcategoría"
                >
                  <FaPlus />
                </button>
                <button
                  onClick={() => setEditingCategory(editingCategory === category._id ? null : category._id)}
                  className="text-yellow-600 hover:text-yellow-800 p-1"
                  title="Editar categoría"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDeleteCategory(category._id)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Eliminar categoría"
                >
                  <FaTrash />
                </button>
              </div>
            </div>

            {/* Subcategorías */}
            {expandedCategories.has(category._id) && (
              <div className="p-4 space-y-3">
                {/* Formulario para nueva subcategoría */}
                {showAddSubcategory === category._id && (
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="text-md font-semibold mb-3">Nueva Subcategoría</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                          type="text"
                          value={newSubcategory.name}
                          onChange={(e) => setNewSubcategory({...newSubcategory, name: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta</label>
                        <input
                          type="text"
                          value={newSubcategory.label}
                          onChange={(e) => setNewSubcategory({...newSubcategory, label: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                        <input
                          type="text"
                          value={newSubcategory.value}
                          onChange={(e) => setNewSubcategory({...newSubcategory, value: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCreateSubcategory(category._id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <FaSave /> Guardar
                      </button>
                      <button
                        onClick={() => setShowAddSubcategory(null)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <FaTimes /> Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de subcategorías */}
                {category.subcategories.map((subcategory) => (
                  <div key={subcategory._id} className="border rounded-lg">
                    <div className="p-3 bg-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSubcategory(subcategory.value)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          {expandedSubcategories.has(subcategory.value) ? <FaChevronDown /> : <FaChevronRight />}
                        </button>
                        {editingSubcategory === subcategory._id ? (
                          <input
                            type="text"
                            defaultValue={subcategory.label}
                            onBlur={(e) => {
                              if (e.target.value !== subcategory.label) {
                                handleUpdateSubcategory(category._id, subcategory.value, { label: e.target.value });
                              }
                            }}
                            className="font-medium bg-white border rounded px-2 py-1"
                            autoFocus
                          />
                        ) : (
                          <h4 className="font-medium text-gray-700">{subcategory.label}</h4>
                        )}
                        <span className="text-sm text-gray-500">
                          ({subcategory.specifications.length} especificaciones)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowAddSpecification({ categoryId: category._id, subcategoryId: subcategory.value })}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Agregar especificación"
                        >
                          <FaPlus />
                        </button>
                        <button
                          onClick={() => setEditingSubcategory(editingSubcategory === subcategory._id ? null : subcategory._id)}
                          className="text-yellow-600 hover:text-yellow-800 p-1"
                          title="Editar subcategoría"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteSubcategory(category._id, subcategory.value)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Eliminar subcategoría"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>

                    {/* Especificaciones */}
                    {expandedSubcategories.has(subcategory.value) && (
                      <div className="p-3 space-y-2">
                        {/* Formulario para nueva especificación */}
                        {showAddSpecification && 
                         showAddSpecification.categoryId === category._id && 
                         showAddSpecification.subcategoryId === subcategory.value && (
                          <div className="p-3 border rounded-lg bg-green-50">
                            <h5 className="text-sm font-semibold mb-3">Nueva Especificación</h5>
                            <div className="grid grid-cols-4 gap-4 mb-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                  type="text"
                                  value={newSpecification.name}
                                  onChange={(e) => setNewSpecification({...newSpecification, name: e.target.value})}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta</label>
                                <input
                                  type="text"
                                  value={newSpecification.label}
                                  onChange={(e) => setNewSpecification({...newSpecification, label: e.target.value})}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                <select
                                  value={newSpecification.type}
                                  onChange={(e) => setNewSpecification({...newSpecification, type: e.target.value})}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="text">Texto</option>
                                  <option value="number">Número</option>
                                  <option value="boolean">Booleano</option>
                                  <option value="select">Selección</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                                <input
                                  type="text"
                                  value={newSpecification.placeholder}
                                  onChange={(e) => setNewSpecification({...newSpecification, placeholder: e.target.value})}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCreateSpecification(category._id, subcategory.value)}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                              >
                                <FaSave /> Guardar
                              </button>
                              <button
                                onClick={() => setShowAddSpecification(null)}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                              >
                                <FaTimes /> Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Lista de especificaciones */}
                        {subcategory.specifications.map((specification) => (
                          <div key={specification._id} className="p-2 bg-white border rounded flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FaCog className="text-gray-400" />
                              {editingSpecification === specification._id ? (
                                <input
                                  type="text"
                                  defaultValue={specification.label}
                                  onBlur={(e) => {
                                    if (e.target.value !== specification.label) {
                                      handleUpdateSpecification(category._id, subcategory.value, specification._id, { label: e.target.value });
                                    }
                                  }}
                                  className="font-medium bg-white border rounded px-2 py-1"
                                  autoFocus
                                />
                              ) : (
                                <span className="font-medium text-gray-700">{specification.label}</span>
                              )}
                              <span className="text-sm text-gray-500">({specification.type})</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingSpecification(editingSpecification === specification._id ? null : specification._id)}
                                className="text-yellow-600 hover:text-yellow-800 p-1"
                                title="Editar especificación"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => handleDeleteSpecification(category._id, subcategory.value, specification._id)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Eliminar especificación"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesManagement;
