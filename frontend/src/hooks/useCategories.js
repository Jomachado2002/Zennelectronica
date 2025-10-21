import { useState, useEffect } from 'react';
import SummaryApi from '../common';

const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      // console.log removed for production
      
      // Intentar primero con el endpoint temporal de categorías con especificaciones
      try {
        console.log('🔍 Intentando cargar categorías desde:', `${SummaryApi.baseURL}/api/categorias-con-especificaciones`);
        const response = await fetch(`${SummaryApi.baseURL}/api/categorias-con-especificaciones`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('📡 Respuesta del servidor de categorías:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('🔍 Categorías cargadas desde API temporal:', result);
          setCategories(result.data || []);
          return;
        } else {
          console.log('⚠️ Error en respuesta del servidor:', response.status, response.statusText);
        }
      } catch (adminError) {
        console.log('⚠️ Error cargando categorías temporales:', adminError);
      }
      
      // Fallback al endpoint de base de datos directa
      const response = await fetch(`${SummaryApi.baseURL}/api/categorias-bd`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Categorías cargadas desde fallback:', result);
        
        // Transformar los datos de la BD al formato esperado
        const transformedCategories = result.data.map(category => ({
          value: category.value || category.name?.toLowerCase().replace(/\s+/g, '_'),
          label: category.label || category.name,
          name: category.name,
          subcategories: (category.subcategories || []).map(subcategory => ({
            value: subcategory.value || subcategory.name?.toLowerCase().replace(/\s+/g, '_'),
            label: subcategory.label || subcategory.name,
            name: subcategory.name,
            specifications: subcategory.specifications || []
          }))
        }));
        
        console.log('🔍 Categorías transformadas:', transformedCategories);
        setCategories(transformedCategories);
      } else {
        throw new Error('Error al cargar categorías');
      }
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
    console.log('🔍 getSpecificationsBySubcategory - Parámetros:', {
      categoryValue,
      subcategoryValue,
      categoriesCount: categories.length
    });
    
    const category = categories.find(cat => cat.value === categoryValue);
    console.log('🔍 getSpecificationsBySubcategory - Categoría encontrada:', {
      category: category ? category.label : 'No encontrada',
      subcategoriesCount: category ? category.subcategories?.length : 0
    });
    
    if (!category) return [];
    
    const subcategory = category.subcategories.find(sub => sub.value === subcategoryValue);
    console.log('🔍 getSpecificationsBySubcategory - Subcategoría encontrada:', {
      subcategory: subcategory ? subcategory.label : 'No encontrada',
      specificationsCount: subcategory ? subcategory.specifications?.length : 0
    });
    
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
