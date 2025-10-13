// frontend/src/hooks/usePreloadedCategories.js
import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../config/axiosInstance';

// Cache global para evitar recargas innecesarias
let globalCache = null;
let loadingPromise = null;

const usePreloadedCategories = () => {
  const [data, setData] = useState(globalCache || []);
  const [loading, setLoading] = useState(!globalCache);
  const [error, setError] = useState(null);

  const loadAllData = useCallback(async () => {
    // Si ya está cargando, esperar a que termine
    if (loadingPromise) {
      console.log('🔄 usePreloadedCategories: Esperando carga en progreso...');
      try {
        await loadingPromise;
        setData(globalCache);
        setLoading(false);
        return;
      } catch (err) {
        console.error('❌ usePreloadedCategories: Error en carga en progreso:', err);
        setError(err);
        setLoading(false);
        return;
      }
    }

    // Si ya está en caché, usar los datos
    if (globalCache) {
      console.log('✅ usePreloadedCategories: Usando datos del caché global');
      setData(globalCache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 usePreloadedCategories: Cargando estructura completa...');
      
      // Crear la promesa de carga
      loadingPromise = axiosInstance.get('/api/admin/categories/menu/complete-structure');
      
      const response = await loadingPromise;
      
      if (response.data.success) {
        const structuredData = response.data.data;
        console.log('✅ usePreloadedCategories: Estructura completa cargada:', structuredData);
        
        // Guardar en caché global
        globalCache = structuredData;
        setData(structuredData);
        setError(null);
      } else {
        throw new Error('Respuesta no exitosa del servidor');
      }
    } catch (err) {
      console.error('❌ usePreloadedCategories: Error cargando estructura completa:', err);
      setError(err);
    } finally {
      setLoading(false);
      loadingPromise = null;
    }
  }, []);

  // Funciones de utilidad para acceder a los datos
  const getCategories = useCallback(() => {
    return data.map(category => ({
      id: category.id,
      value: category.value,
      label: category.label,
      name: category.name
    }));
  }, [data]);

  const getSubcategories = useCallback((categoryValue) => {
    const category = data.find(cat => cat.value === categoryValue);
    return category ? category.subcategories : [];
  }, [data]);

  const getSpecifications = useCallback((categoryValue, subcategoryValue) => {
    const category = data.find(cat => cat.value === categoryValue);
    if (!category) return [];
    
    const subcategory = category.subcategories.find(sub => sub.value === subcategoryValue);
    return subcategory ? subcategory.specifications : [];
  }, [data]);

  const getAllSpecifications = useCallback((categoryValue, subcategoryValue) => {
    return getSpecifications(categoryValue, subcategoryValue);
  }, [getSpecifications]);

  // Función para limpiar el caché (útil para desarrollo)
  const clearCache = useCallback(() => {
    globalCache = null;
    loadingPromise = null;
    setData([]);
  }, []);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    data,
    loading,
    error,
    getCategories,
    getSubcategories,
    getSpecifications,
    getAllSpecifications,
    clearCache,
    reload: loadAllData
  };
};

export default usePreloadedCategories;
