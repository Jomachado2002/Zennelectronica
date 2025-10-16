import { useState, useEffect } from 'react';
import axiosInstance from '../config/axiosInstance';

const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 useCategories - Cargando categorías...');
      
      // Intentar primero con el endpoint de categorías estructuradas
      try {
        const response = await axiosInstance.get('/api/admin/categories/all');
        console.log('✅ useCategories - Categorías cargadas desde /api/admin/categories/all:', response.data);
        setCategories(response.data.data || []);
        return;
      } catch (adminError) {
        console.log('⚠️ useCategories - Error con /api/admin/categories/all, intentando con /api/categorias-bd');
      }
      
      // Fallback al endpoint de base de datos directa
      const response = await axiosInstance.get('/api/categorias-bd');
      console.log('✅ useCategories - Categorías cargadas desde /api/categorias-bd:', response.data);
      
      // Transformar los datos de la BD al formato esperado
      const transformedCategories = response.data.data.map(category => ({
        value: category.value || category.name?.toLowerCase().replace(/\s+/g, '_'),
        label: category.label || category.name,
        name: category.name,
        subcategories: category.subcategories || []
      }));
      
      setCategories(transformedCategories);
    } catch (err) {
      console.error('❌ useCategories - Error fetching categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Función para obtener subcategorías de una categoría específica
  const getSubcategoriesByCategory = (categoryValue) => {
    const category = categories.find(cat => cat.value === categoryValue);
    return category ? category.subcategories : [];
  };

  // Función para obtener especificaciones de una subcategoría específica
  const getSpecificationsBySubcategory = (categoryValue, subcategoryValue) => {
    console.log('🔍 getSpecificationsBySubcategory:', { categoryValue, subcategoryValue });
    console.log('🔍 Total categories:', categories.length);
    
    const category = categories.find(cat => cat.value === categoryValue);
    console.log('🔍 Found category:', category ? category.name : 'NOT FOUND');
    
    if (!category) return [];
    
    const subcategory = category.subcategories.find(sub => sub.value === subcategoryValue);
    console.log('🔍 Found subcategory:', subcategory ? subcategory.name : 'NOT FOUND');
    console.log('🔍 Specifications count:', subcategory ? subcategory.specifications.length : 0);
    
    return subcategory ? subcategory.specifications : [];
  };

  // Función para obtener todas las categorías en formato para select
  const getCategoriesForSelect = () => {
    return categories.map(category => ({
      value: category.value,
      label: category.label
    }));
  };

  // Función para obtener todas las subcategorías en formato para select
  const getSubcategoriesForSelect = (categoryValue) => {
    const subcategories = getSubcategoriesByCategory(categoryValue);
    return subcategories.map(subcategory => ({
      value: subcategory.value,
      label: subcategory.label
    }));
  };

  // Función para refrescar las categorías
  const refreshCategories = () => {
    fetchCategories();
  };

  return {
    categories,
    loading,
    error,
    getSubcategoriesByCategory,
    getSpecificationsBySubcategory,
    getCategoriesForSelect,
    getSubcategoriesForSelect,
    refreshCategories
  };
};

export default useCategories;
