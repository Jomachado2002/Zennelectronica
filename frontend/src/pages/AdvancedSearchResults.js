import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FilterProvider, useFilters } from '../context/FilterContext';
import SummaryApi from '../common';
import VerticalCard from '../components/VerticalCard';
import DesktopFilters from '../components/filters/DesktopFilters';
import SideDrawerFilters from '../components/filters/SideDrawerFilters';
import ActiveFiltersBar from '../components/filters/ActiveFiltersBar';
import SearchFilters from '../components/filters/SearchFilters';
import MobileSearchFilters from '../components/filters/MobileSearchFilters';
import { FaSearch, FaFilter, FaTimes, FaSortAmountDown } from 'react-icons/fa';
import { BiGridAlt, BiListUl } from 'react-icons/bi';
import usePreloadedCategories from '../hooks/usePreloadedCategories';

// Componente principal de resultados de búsqueda
const SearchResultsContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getCategories } = usePreloadedCategories();
  
  // Obtener query de búsqueda de la URL
  const urlParams = new URLSearchParams(location.search);
  const searchQuery = urlParams.get('q') || '';
  
  // Estados locales - asegurar que searchTerm siempre sea string
  const [searchTerm, setSearchTerm] = useState(String(searchQuery || ''));
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [gridView, setGridView] = useState(true);
  const [sortBy, setSortBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  
  // Contexto de filtros
  const {
    filterCategoryList,
    filterSubcategoryList,
    filterBrands,
    specFilters,
    priceRange,
    setPriceRange,
    clearAllFilters,
    hasActiveFilters,
    handleSelectCategory,
    handleSelectSubcategory
  } = useFilters();

  // Función para realizar búsqueda con filtros
  const performAdvancedSearch = async () => {
    const trimmedSearchTerm = String(searchTerm || '').trim();
    if (!trimmedSearchTerm) return;

    setLoading(true);
    try {
      // Construir parámetros de búsqueda
      const searchParams = new URLSearchParams();
      searchParams.append('q', trimmedSearchTerm);
      
      // Agregar filtros si están activos
      if (filterCategoryList.length > 0) {
        searchParams.append('categories', filterCategoryList.join(','));
      }
      if (filterSubcategoryList.length > 0) {
        searchParams.append('subcategories', filterSubcategoryList.join(','));
      }
      if (filterBrands.length > 0) {
        searchParams.append('brands', filterBrands.join(','));
      }
      if (priceRange.min) {
        searchParams.append('minPrice', priceRange.min);
      }
      if (priceRange.max) {
        searchParams.append('maxPrice', priceRange.max);
      }
      if (sortBy) {
        searchParams.append('sortBy', sortBy);
      }

      // Agregar especificaciones
      Object.entries(specFilters).forEach(([key, values]) => {
        if (values.length > 0) {
          searchParams.append(`spec_${key}`, values.join(','));
        }
      });

      // Aumentar límite para mostrar todos los productos
      searchParams.append('limit', '1000'); // Límite alto para obtener todos los productos

      const response = await fetch(`${SummaryApi.advancedSearchProduct.url}?${searchParams.toString()}`);
      const dataResponse = await response.json();
      
      if (dataResponse.success) {
        setSearchResults(dataResponse.data || []);
        setTotalResults(dataResponse.total || dataResponse.data?.length || 0);
      } else {
        setSearchResults([]);
        setTotalResults(0);
      }
    } catch (error) {
      console.error('Error performing advanced search:', error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  // Realizar búsqueda cuando cambien los parámetros
  useEffect(() => {
    performAdvancedSearch();
  }, [searchTerm, filterCategoryList, filterSubcategoryList, filterBrands, specFilters, priceRange, sortBy]);

  // Actualizar término de búsqueda cuando cambie la URL
  useEffect(() => {
    const newSearchQuery = String(urlParams.get('q') || '');
    if (newSearchQuery !== searchTerm) {
      setSearchTerm(newSearchQuery);
    }
  }, [location.search, searchTerm]);

  // Función para manejar búsqueda
  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedSearchTerm = String(searchTerm || '').trim();
    if (trimmedSearchTerm) {
      // Actualizar URL
      navigate(`/search?q=${encodeURIComponent(trimmedSearchTerm)}`, { replace: true });
      // La búsqueda se ejecutará automáticamente por el useEffect
    }
  };

  // Función para limpiar búsqueda
  const handleClearSearch = () => {
    setSearchTerm('');
    navigate('/search');
  };

  // Función para ordenar
  const handleSortChange = (value) => {
    setSortBy(value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header responsive - Desktop y Mobile separados */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        {/* Desktop Header */}
        <div className="hidden lg:block">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {searchTerm ? `Resultados para "${searchTerm}"` : 'Buscar productos'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {loading ? 'Buscando...' : `${totalResults} productos encontrados`}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Ordenamiento */}
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Ordenar por</option>
                  <option value="relevance">Relevancia</option>
                  <option value="price_asc">Precio: Menor a Mayor</option>
                  <option value="price_desc">Precio: Mayor a Menor</option>
                  <option value="name_asc">Nombre: A-Z</option>
                  <option value="name_desc">Nombre: Z-A</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden">
          <div className="px-4 py-4">
            {/* Título y resultados */}
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-900">
                {searchTerm ? `"${searchTerm}"` : 'Buscar productos'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? 'Buscando...' : `${totalResults} productos`}
              </p>
            </div>

            {/* Controles móviles */}
            <div className="space-y-3">
              {/* Botón de filtros */}
              <button
                onClick={() => setShowMobileFilters(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaFilter className="text-sm" />
                <span className="font-medium">Filtros por Categoría</span>
                {hasActiveFilters && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-1">
                    !
                  </span>
                )}
              </button>

              {/* Ordenamiento */}
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">Ordenar por</option>
                <option value="relevance">Relevancia</option>
                <option value="price_asc">Precio: Menor a Mayor</option>
                <option value="price_desc">Precio: Mayor a Menor</option>
                <option value="name_asc">Nombre: A-Z</option>
                <option value="name_desc">Nombre: Z-A</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal - Responsive */}
      <div className="lg:container lg:mx-auto px-4 py-6 lg:py-8">
        <div className="lg:flex lg:gap-8">
                {/* Filtros desktop - Precios y categorías */}
                <div className="hidden lg:block w-80 flex-shrink-0">
                  <SearchFilters
                    selectedCategories={filterCategoryList}
                    selectedSubcategories={filterSubcategoryList}
                    onCategorySelect={handleSelectCategory}
                    onSubcategorySelect={handleSelectSubcategory}
                    priceRange={priceRange}
                    onPriceRangeChange={setPriceRange}
                    className="mb-4"
                  />
                </div>

          {/* Contenido principal */}
          <div className="flex-1">

          {/* Resultados */}
          {loading ? (
            <div className="flex items-center justify-center py-8 lg:py-12">
              <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600 text-sm lg:text-base">Buscando productos...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <VerticalCard loading={false} data={searchResults} />
          ) : (
            <div className="text-center py-8 lg:py-16">
              <div className="w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                <FaSearch className="text-2xl lg:text-3xl text-blue-500" />
              </div>
              <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2 lg:mb-3">
                No se encontraron productos
              </h3>
              <p className="text-sm lg:text-base text-gray-600 mb-4 lg:mb-6 max-w-md mx-auto px-4">
                {searchTerm
                  ? `No hay resultados para "${searchTerm}". Intenta con otros términos o ajusta los filtros.`
                  : 'Usa el buscador del header para encontrar productos.'
                }
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 lg:gap-4 px-4">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 lg:px-6 lg:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm lg:text-base"
                  >
                    Limpiar filtros
                  </button>
                )}
                {searchTerm && (
                  <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 lg:px-6 lg:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm lg:text-base"
                  >
                    Ir al inicio
                  </button>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

            {/* Filtros móvil personalizados */}
            <MobileSearchFilters
              isOpen={showMobileFilters}
              onClose={() => setShowMobileFilters(false)}
              selectedCategories={filterCategoryList}
              selectedSubcategories={filterSubcategoryList}
              onCategorySelect={handleSelectCategory}
              onSubcategorySelect={handleSelectSubcategory}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
            />
    </div>
  );
};

// Wrapper con FilterProvider
const AdvancedSearchResults = () => {
  return (
    <FilterProvider>
      <SearchResultsContent />
    </FilterProvider>
  );
};

export default AdvancedSearchResults;
