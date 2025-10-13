// frontend/src/hooks/useDynamicCategories.js
import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../config/axiosInstance';

const useDynamicCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cache, setCache] = useState({
    subcategories: {},
    specifications: {}
  });

  // Cargar categorías principales
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/admin/categories/menu/categories');
      
      if (response.data.success) {
        setCategories(response.data.data);
        setError(null);
      } else {
        setError('Error al cargar categorías');
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar subcategorías por categoría (con caché)
  const loadSubcategories = useCallback(async (categoryValue) => {
    // Verificar caché primero
    if (cache.subcategories[categoryValue]) {
      return cache.subcategories[categoryValue];
    }

    try {
      const response = await axiosInstance.get(
        `/api/admin/categories/menu/categories/${categoryValue}/subcategories`
      );
      
      if (response.data.success) {
        const subcategories = response.data.data;
        
        // Guardar en caché
        setCache(prev => ({
          ...prev,
          subcategories: {
            ...prev.subcategories,
            [categoryValue]: subcategories
          }
        }));
        
        return subcategories;
      }
    } catch (err) {
      console.error('Error cargando subcategorías:', err);
    }
    
    return [];
  }, [cache.subcategories]);

  // Cargar especificaciones por subcategoría (con caché)
  const loadSpecifications = useCallback(async (categoryValue, subcategoryValue) => {
    const cacheKey = `${categoryValue}-${subcategoryValue}`;
    
    console.log(`🔍 Cargando especificaciones para: ${categoryValue}/${subcategoryValue}`);
    
    // Verificar caché primero
    if (cache.specifications[cacheKey]) {
      console.log(`✅ Especificaciones encontradas en caché para: ${cacheKey}`);
      return cache.specifications[cacheKey];
    }

    try {
      console.log(`📡 Haciendo petición a: /api/admin/categories/menu/categories/${categoryValue}/subcategories/${subcategoryValue}/specifications`);
      
      const response = await axiosInstance.get(
        `/api/admin/categories/menu/categories/${categoryValue}/subcategories/${subcategoryValue}/specifications`
      );
      
      console.log('📥 Respuesta del servidor:', response.data);
      
      if (response.data.success) {
        const specifications = response.data.data;
        console.log(`✅ Especificaciones cargadas:`, specifications);
        
        // Guardar en caché
        setCache(prev => ({
          ...prev,
          specifications: {
            ...prev.specifications,
            [cacheKey]: specifications
          }
        }));
        
        return specifications;
      } else {
        console.error('❌ Respuesta no exitosa del servidor:', response.data);
      }
    } catch (err) {
      console.error('❌ Error cargando especificaciones:', err);
      console.error('❌ Detalles del error:', err.response?.data || err.message);
    }
    
    return [];
  }, [cache.specifications]);

  // Precargar subcategorías para una categoría
  const preloadSubcategories = useCallback(async (categoryValue) => {
    if (!cache.subcategories[categoryValue]) {
      await loadSubcategories(categoryValue);
    }
  }, [cache.subcategories, loadSubcategories]);

  // Limpiar caché
  const clearCache = useCallback(() => {
    setCache({
      subcategories: {},
      specifications: {}
    });
  }, []);

  // Cargar categorías al montar el componente
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    categories,
    loading,
    error,
    loadSubcategories,
    loadSpecifications,
    preloadSubcategories,
    clearCache,
    reloadCategories: loadCategories
  };
};

export default useDynamicCategories;
