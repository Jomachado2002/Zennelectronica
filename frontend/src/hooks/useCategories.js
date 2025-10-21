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
      // console.log removed for production
      
      // Intentar primero con el endpoint de categorías estructuradas
      try {
        const response = await axiosInstance.get('/api/admin/categories/all');
        // console.log removed for production
        setCategories(response.data.data || []);
        return;
      } catch (adminError) {
        // console.log removed for production
      }
      
      // Fallback al endpoint de base de datos directa
      const response = await axiosInstance.get('/api/categorias-bd');
      // console.log removed for production
      
      // Transformar los datos de la BD al formato esperado
      const transformedCategories = response.data.data.map(category => ({
        value: category.value || category.name?.toLowerCase().replace(/\s+/g, '_'),
        label: category.label || category.name,
        name: category.name,
        subcategories: category.subcategories || []
      }));
      
      setCategories(transformedCategories);
    } catch (err) {
      // console.error removed for production
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
    // console.log removed for production
    // console.log removed for production
    
    const category = categories.find(cat => cat.value === categoryValue);
    // console.log removed for production
    
    if (!category) return [];
    
    const subcategory = category.subcategories.find(sub => sub.value === subcategoryValue);
    // console.log removed for production
    // console.log removed for production
    
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
