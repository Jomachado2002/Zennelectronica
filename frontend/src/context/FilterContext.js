import React, { createContext, useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SummaryApi from '../common';
import usePreloadedCategories from '../hooks/usePreloadedCategories';

const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const urlSearch = new URLSearchParams(location.search);
  
  // Hook para categorías precargadas
  const { getCategories, getSubcategories } = usePreloadedCategories();
  
  // Estados principales
  const [filterCategoryList, setFilterCategoryList] = useState(urlSearch.get("category") ? [urlSearch.get("category")] : []);
  const [filterSubcategoryList, setFilterSubcategoryList] = useState(urlSearch.get("subcategory") ? [urlSearch.get("subcategory")] : []);
  const [filterBrands, setFilterBrands] = useState([]);
  const [specFilters, setSpecFilters] = useState({});
  const [sortBy, setSortBy] = useState("");
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  // Estado de datos y UI
  const [rawData, setRawData] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableFilters, setAvailableFilters] = useState({
    brands: [],
    specifications: {}
  });
  const [filterCount, setFilterCount] = useState(0);
  const [activeAccordions, setActiveAccordions] = useState({
    sort: true,
    categories: true,
    brands: true,
    price: true  // Asegurar que precio esté abierto por defecto
  });
  
  // Estado para móvil
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [activeMobileFilter, setActiveMobileFilter] = useState('categories');
  const [tempPriceRange, setTempPriceRange] = useState({ min: '', max: '' });
  const [gridView, setGridView] = useState(true);
  
  // Actualizar el precio temporal cuando cambia el precio real
  useEffect(() => {
    setTempPriceRange(priceRange);
  }, [priceRange]);
  
  // Controlar overflow del body cuando el filtro móvil está abierto
  useEffect(() => {
    if (mobileFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileFilterOpen]);
  
  // Contar filtros activos
  useEffect(() => {
    let count = filterCategoryList.length + filterSubcategoryList.length + filterBrands.length;
    
    // Contar filtros de especificaciones
    Object.values(specFilters).forEach(values => {
      count += values.length;
    });
    
    // Contar filtro de rango de precio
    if (priceRange.min || priceRange.max) {
      count += 1;
    }
    
    setFilterCount(count);
  }, [filterCategoryList, filterSubcategoryList, filterBrands, specFilters, priceRange]);
  
  
  
  // Aplicar ordenamiento y filtro de precio a los datos
  useEffect(() => {
    if (rawData.length > 0) {
      let sortedData = [...rawData];
      
      if (sortBy) {
        sortedData.sort((a, b) => {
          const priceA = Number(a.sellingPrice) || 0;
          const priceB = Number(b.sellingPrice) || 0;
          return sortBy === 'asc' ? priceA - priceB : priceB - priceA;
        });
      }
      
      // Aplicar filtro de rango de precio
      if (priceRange.min || priceRange.max) {
        sortedData = sortedData.filter(item => {
          const price = Number(item.sellingPrice) || 0;
          const minOk = priceRange.min ? price >= Number(priceRange.min) : true;
          const maxOk = priceRange.max ? price <= Number(priceRange.max) : true;
          return minOk && maxOk;
        });
      }
      
      setData(sortedData);
    } else {
      setData([]);
    }
  }, [rawData, sortBy, priceRange]);
  
  // Detectar cambios en la URL para limpiar filtros cuando sea necesario
  useEffect(() => {
    const currentCategory = urlSearch.get("category");
    const currentSubcategory = urlSearch.get("subcategory");
    
    // Si cambia la categoría o subcategoría en la URL, actualizar estados y limpiar filtros específicos
    const categoryChanged = currentCategory !== filterCategoryList[0];
    const subcategoryChanged = currentSubcategory !== filterSubcategoryList[0];
    
    if (categoryChanged || subcategoryChanged) {
      if (categoryChanged) {
        setFilterCategoryList(currentCategory ? [currentCategory] : []);
      }
      
      if (subcategoryChanged) {
        setFilterSubcategoryList(currentSubcategory ? [currentSubcategory] : []);
      }
      
      // Limpiar filtros de especificaciones y precio al cambiar categoría/subcategoría
      setSpecFilters({});
      setPriceRange({ min: '', max: '' });
      setFilterBrands([]);
    }
  }, [location.search]);
  
  // Función para buscar la categoría padre de una subcategoría
  const findParentCategory = (subcategory) => {
    const categories = getCategories();
    for (const category of categories) {
      const subcategories = getSubcategories(category.value);
      const found = subcategories.find(sub => sub.value === subcategory);
      if (found) {
        setFilterCategoryList([category.value]);
        break;
      }
    }
  };
  
// ✅ REACT QUERY PARA FILTROS - CARGA TODOS LOS PRODUCTOS
const queryClient = useQueryClient();
const { data: queryData, isLoading: queryLoading } = useQuery({
  queryKey: ['filter-products', filterCategoryList, filterSubcategoryList, filterBrands, specFilters],
  queryFn: async () => {
    // ✅ PRIMERO: Intentar obtener datos del caché individual
    if (filterCategoryList.length === 1 && filterSubcategoryList.length === 1 && 
        filterBrands.length === 0 && Object.keys(specFilters).length === 0) {
      
      const cachedData = queryClient.getQueryData(['category-products', filterCategoryList[0], filterSubcategoryList[0]]);
      if (cachedData && cachedData.length > 0) {
        
        return {
          data: cachedData,
          filters: { brands: [], specifications: {} }
        };
      }
    }
    
    // ✅ SI NO ESTÁ EN CACHÉ: Hacer consulta completa con filtros
    
    const response = await fetch(SummaryApi.filterProduct.url, {
      method: SummaryApi.filterProduct.method,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        category: filterCategoryList,
        subcategory: filterSubcategoryList,
        brandName: filterBrands,
        specifications: specFilters
      })
    });

    const dataResponse = await response.json();
    if (dataResponse.success) {
      return {
        data: dataResponse.data || [],
        filters: {
          brands: dataResponse.filters?.brands || [],
          specifications: dataResponse.filters?.specifications || {}
        }
      };
    }
    
    throw new Error('Error al cargar productos');
  },
  staleTime: 3 * 60 * 1000, // 3 minutos para filtros
  cacheTime: 10 * 60 * 1000, // 10 minutos
  retry: 1,
  refetchOnWindowFocus: false,
});

// ✅ SINCRONIZAR CON ESTADOS LOCALES
useEffect(() => {
  if (queryData) {
    setRawData(queryData.data || []);
    setAvailableFilters(queryData.filters || { brands: [], specifications: {} });
    
    // Preestablecer los acordeones de especificaciones
    if (queryData.filters?.specifications) {
      const specKeys = Object.keys(queryData.filters.specifications);
      const newAccordions = { ...activeAccordions };
      
      specKeys.slice(0, 3).forEach(key => {
        newAccordions[`spec-${key}`] = true;
      });
      
      setActiveAccordions(newAccordions);
    }
  }
  setLoading(queryLoading);
}, [queryData, queryLoading]);
  
  // Manejar selección de categoría
  const handleSelectCategory = (category) => {
    // Si ya está seleccionada, la deseleccionamos
    if (filterCategoryList.includes(category)) {
      setFilterCategoryList([]);
      
      // También limpiamos la subcategoría si pertenece a esta categoría
      const categories = getCategories();
      const categoryObj = categories.find(c => c.value === category);
      if (categoryObj) {
        const subcategories = getSubcategories(category);
        const subcategoryValues = subcategories.map(sub => sub.value);
        if (subcategoryValues.some(sub => filterSubcategoryList.includes(sub))) {
          setFilterSubcategoryList([]);
        }
      }
      
      // Limpiar filtros de especificaciones y marcas
      setSpecFilters({});
      setFilterBrands([]);
      setPriceRange({ min: '', max: '' });
    } else {
      // Seleccionar esta categoría (solo una a la vez)
      setFilterCategoryList([category]);
      
      // Limpiar subcategorías si no son de esta categoría
      const categories = getCategories();
      const categoryObj = categories.find(c => c.value === category);
      if (categoryObj) {
        const subcategories = getSubcategories(category);
        const subcategoryValues = subcategories.map(sub => sub.value);
        const validSubcats = filterSubcategoryList.filter(sub => 
          subcategoryValues.includes(sub)
        );
        setFilterSubcategoryList(validSubcats);
      } else {
        setFilterSubcategoryList([]);
      }
      
      // Limpiar filtros de especificaciones y marcas
      setSpecFilters({});
      setFilterBrands([]);
      setPriceRange({ min: '', max: '' });
    }
    
    // Actualizar URL para reflejar la categoría
    navigate(`/categoria-producto?category=${category}`);
  };
  
  // Manejar selección de subcategoría
  const handleSelectSubcategory = (subcategory) => {
    // Si ya está seleccionada, la deseleccionamos
    if (filterSubcategoryList.includes(subcategory)) {
      setFilterSubcategoryList([]);
      
      // Limpiar filtros de especificaciones al deseleccionar
      setSpecFilters({});
      setFilterBrands([]);
      setPriceRange({ min: '', max: '' });
      
      // Actualizar URL sin subcategoría
      const category = filterCategoryList[0];
      navigate(`/categoria-producto${category ? `?category=${category}` : ''}`);
    } else {
      // Seleccionar esta subcategoría (solo una a la vez)
      setFilterSubcategoryList([subcategory]);
      
      // Seleccionar automáticamente la categoría padre
      findParentCategory(subcategory);
      
      // Limpiar filtros de especificaciones al cambiar de subcategoría
      setSpecFilters({});
      setFilterBrands([]);
      setPriceRange({ min: '', max: '' });
      
      // Actualizar URL para reflejar la subcategoría
      const category = filterCategoryList[0];
      navigate(`/categoria-producto?${category ? `category=${category}&` : ''}subcategory=${subcategory}`);
    }
  };
  
  // Manejar cambio en filtro de especificación
  const handleSpecFilterChange = (type, value) => {
    setSpecFilters(prev => {
      const newFilters = { ...prev };
      
      // Si el tipo ya existe
      if (newFilters[type]) {
        // Si el valor ya está seleccionado, quitarlo
        if (newFilters[type].includes(value)) {
          newFilters[type] = newFilters[type].filter(v => v !== value);
          
          // Si el array queda vacío, eliminar la propiedad
          if (newFilters[type].length === 0) {
            delete newFilters[type];
          }
        } 
        // Si no está seleccionado, añadirlo
        else {
          newFilters[type] = [...newFilters[type], value];
        }
      } 
      // Si el tipo no existe, crearlo con el primer valor
      else {
        newFilters[type] = [value];
      }
      
      return newFilters;
    });
  };
  
  // Función para aplicar el filtro de precio
  const applyPriceFilter = () => {
    setPriceRange(tempPriceRange);
    // Cerrar panel móvil después de aplicar si estamos en dispositivos móviles
    if (window.innerWidth < 1024) {
      setMobileFilterOpen(false);
    }
  };
  
  // Función para manejar cambios en el campo de precio
  const handlePriceChange = (field, value) => {
    // Solo permite números
    const numericValue = value.replace(/[^0-9]/g, '');
    setTempPriceRange(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };
  
  // Función para alternar acordeones
  const toggleAccordion = (id) => {
    setActiveAccordions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Función para limpiar todos los filtros
  const clearAllFilters = () => {
    const category = urlSearch.get("category");
    const subcategory = urlSearch.get("subcategory");
    
    setFilterCategoryList(category ? [category] : []);
    setFilterSubcategoryList(subcategory ? [subcategory] : []);
    setFilterBrands([]);
    setSpecFilters({});
    setPriceRange({ min: '', max: '' });
    setTempPriceRange({ min: '', max: '' });
    setSortBy('');
    
    // Cerrar panel móvil después de limpiar si estamos en dispositivos móviles
    if (window.innerWidth < 1024) {
      setMobileFilterOpen(false);
    }
  };
  
  // Verificar si hay filtros activos
  const hasActiveFilters = () => {
    return filterCount > 0;
  };
  
  // El valor que proporciona el contexto
  const value = {
    // Estado
    filterCategoryList,
    filterSubcategoryList,
    filterBrands,
    specFilters,
    sortBy,
    priceRange,
    tempPriceRange,
    data,
    rawData,
    loading,
    availableFilters,
    filterCount,
    activeAccordions,
    mobileFilterOpen,
    activeMobileFilter,
    gridView,
    
    // Setters
    setFilterCategoryList,
    setFilterSubcategoryList,
    setFilterBrands,
    setSpecFilters,
    setSortBy,
    setPriceRange,
    setTempPriceRange,
    setMobileFilterOpen,
    setActiveMobileFilter,
    setGridView,
    
    // Funciones
    handleSelectCategory,
    handleSelectSubcategory,
    handleSpecFilterChange,
    applyPriceFilter,
    handlePriceChange,
    toggleAccordion,
    clearAllFilters,
    hasActiveFilters,
    findParentCategory,
  };
  
  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters debe usarse dentro de un FilterProvider');
  }
  return context;
};

export default FilterContext;