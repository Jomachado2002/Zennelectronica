// frontend/src/hooks/usePreloadedCategories.js
import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../config/axiosInstance';
import { queryClient } from '../queryClient';
import { prefetchCategoryShowcasePreviews } from '../api/prefetchCategoryShowcasePreviews';

const STRUCTURE_CACHE_KEY = 'zenn_category_structure_v1';

function readStoredStructure() {
  try {
    const raw = sessionStorage.getItem(STRUCTURE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (error) {
    return null;
  }
}

function writeStoredStructure(data) {
  try {
    sessionStorage.setItem(STRUCTURE_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    // Si el árbol no entra en sessionStorage, queda la caché en memoria.
  }
}

// Cache global para evitar recargas innecesarias
let globalCache = readStoredStructure();
let loadingPromise = null;

const usePreloadedCategories = (options = {}) => {
  const enabled = options.enabled !== false;
  const [data, setData] = useState(globalCache || []);
  const [loading, setLoading] = useState(enabled && !globalCache);
  const [error, setError] = useState(null);

  const loadAllData = useCallback(async () => {
    // Si ya está cargando, esperar a que termine
    if (loadingPromise) {
      // Esperando carga en progreso...
      try {
        await loadingPromise;
        setData(globalCache);
        setLoading(false);
        return;
      } catch (err) {
        // console.error removed for production
        setError(err);
        setLoading(false);
        return;
      }
    }

    // Si ya está en caché, usar los datos
    if (globalCache) {
      setData(globalCache);
      setLoading(false);
      prefetchCategoryShowcasePreviews(queryClient, globalCache, 1);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Cargando estructura completa...
      
      // Crear la promesa de carga
      loadingPromise = axiosInstance.get('/api/admin/categories/menu/complete-structure');
      
      const response = await loadingPromise;
      
      if (response.data.success) {
        const structuredData = response.data.data;
        // Estructura completa cargada
        
        // Guardar en caché global
        globalCache = structuredData;
        writeStoredStructure(structuredData);
        setData(structuredData);
        setError(null);
        prefetchCategoryShowcasePreviews(queryClient, structuredData, 1);
      } else {
        throw new Error('Respuesta no exitosa del servidor');
      }
    } catch (err) {
      // console.error removed for production
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
      name: category.name,
      visaoNavigationTree: category.visaoNavigationTree || null
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
    try {
      sessionStorage.removeItem(STRUCTURE_CACHE_KEY);
    } catch (error) {
      // La caché en memoria ya quedó vacía.
    }
    setData([]);
  }, []);

  // Cargar datos al montar el componente
  useEffect(() => {
    if (!enabled) return;
    loadAllData();
  }, [loadAllData, enabled]);

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
