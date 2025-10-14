import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiCategoryAlt, BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { FaDollarSign } from 'react-icons/fa';
import usePreloadedCategories from '../../hooks/usePreloadedCategories';

const SearchFilters = ({
  selectedCategories = [],
  selectedSubcategories = [],
  onCategorySelect,
  onSubcategorySelect,
  priceRange = { min: '', max: '' },
  onPriceRangeChange,
  className = ""
}) => {
  const navigate = useNavigate();
  const { getCategories, getSubcategories } = usePreloadedCategories();
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const cats = getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [getCategories]);

  const toggleCategory = (categoryValue) => {
    setExpandedCategories(prev => 
      prev.includes(categoryValue) 
        ? prev.filter(cat => cat !== categoryValue)
        : [...prev, categoryValue]
    );
  };

  const handleSubcategoryClick = (subcategoryValue, categoryValue) => {
    navigate(`/categoria-producto?category=${encodeURIComponent(categoryValue)}&subcategory=${encodeURIComponent(subcategoryValue)}`);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 text-sm">Cargando categorías...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filtro de Precios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4">
          <div className="flex items-center mb-4">
            <FaDollarSign className="text-green-600 mr-2" />
            <h3 className="font-semibold text-gray-800">Rango de Precios</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Mínimo
              </label>
              <input
                type="number"
                value={priceRange.min}
                onChange={(e) => onPriceRangeChange({ ...priceRange, min: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Máximo
              </label>
              <input
                type="number"
                value={priceRange.max}
                onChange={(e) => onPriceRangeChange({ ...priceRange, max: e.target.value })}
                placeholder="Sin límite"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {(priceRange.min || priceRange.max) && (
              <button
                onClick={() => onPriceRangeChange({ min: '', max: '' })}
                className="w-full py-2 px-3 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
              >
                Limpiar filtro de precios
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtro de Categorías */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center mb-4">
            <BiCategoryAlt className="text-blue-600 mr-2" />
            <h3 className="font-semibold text-gray-800">Categorías</h3>
          </div>

        {/* Lista de categorías */}
        <div className="space-y-1">
          {categories.map((category) => {
            const isExpanded = expandedCategories.includes(category.value);
            const subcategories = getSubcategories(category.value);
            
            return (
              <div key={category.value} className="border-b border-gray-100 last:border-b-0">
                {/* Botón de categoría */}
                <button
                  className="w-full flex items-center justify-between py-3 px-2 text-left focus:outline-none hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => toggleCategory(category.value)}
                >
                  <div className="flex items-center">
                    <span className="font-medium text-gray-800">{category.label}</span>
                    {subcategories.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {subcategories.length}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-500">
                    {isExpanded ? <BiChevronUp size={20} /> : <BiChevronDown size={20} />}
                  </span>
                </button>
                
                {/* Subcategorías */}
                {isExpanded && (
                  <div className="py-2 pl-4 pr-1 bg-gray-50 rounded-md mb-2">
                    {subcategories.length > 0 ? (
                      <div className="space-y-1">
                        {subcategories.map((subcategory) => (
                          <button
                            key={subcategory.value}
                            onClick={() => handleSubcategoryClick(subcategory.value, category.value)}
                            className="w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-white hover:text-blue-600 rounded-md transition-colors"
                          >
                            {subcategory.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 py-2 px-3">No hay subcategorías disponibles</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;