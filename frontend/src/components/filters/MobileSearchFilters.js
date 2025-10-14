import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiCategoryAlt, BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { IoMdClose } from 'react-icons/io';
import { FaDollarSign } from 'react-icons/fa';
import usePreloadedCategories from '../../hooks/usePreloadedCategories';

const MobileSearchFilters = ({
  isOpen,
  onClose,
  selectedCategories = [],
  selectedSubcategories = [],
  onCategorySelect,
  onSubcategorySelect,
  priceRange = { min: '', max: '' },
  onPriceRangeChange,
}) => {
  const navigate = useNavigate();
  const { getCategories, getSubcategories } = usePreloadedCategories();
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const cats = getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (isOpen) {
      loadCategories();
    }
  }, [isOpen, getCategories]);

  const toggleCategory = (categoryValue) => {
    setExpandedCategories(prev => 
      prev.includes(categoryValue) 
        ? prev.filter(cat => cat !== categoryValue)
        : [...prev, categoryValue]
    );
  };

  const handleSubcategoryClick = (subcategoryValue, categoryValue) => {
    onClose(); // Cerrar el filtro
    navigate(`/categoria-producto?category=${encodeURIComponent(categoryValue)}&subcategory=${encodeURIComponent(subcategoryValue)}`);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[140] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Menú Lateral */}
      <div
        className="fixed top-0 left-0 h-screen bg-white w-[85%] max-w-sm shadow-2xl z-[150] overflow-y-auto"
        style={{
          animation: 'slideInLeft 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 p-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BiCategoryAlt className="text-blue-600 mr-3 text-xl" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Filtros</h1>
                <p className="text-sm text-gray-600">Categorías y precios</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              <IoMdClose className="text-xl" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4">
          {loadingCategories ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Cargando filtros...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filtro de Precios */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
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

              {/* Filtro de Categorías */}
              <div>
                <div className="flex items-center mb-3">
                  <BiCategoryAlt className="text-blue-600 mr-2" />
                  <h3 className="font-semibold text-gray-800">Categorías</h3>
                </div>
                
                <div className="space-y-2">
                  {categories.map((category) => {
                const isExpanded = expandedCategories.includes(category.value);
                const subcategories = getSubcategories(category.value);
                
                return (
                  <div key={category.value} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* Botón de categoría */}
                    <button
                      className="w-full flex items-center justify-between p-4 text-left focus:outline-none hover:bg-gray-50 transition-colors"
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
                      <div className="border-t border-gray-100 bg-gray-50">
                        {subcategories.length > 0 ? (
                          <div className="p-2">
                            {subcategories.map((subcategory) => (
                              <button
                                key={subcategory.value}
                                onClick={() => handleSubcategoryClick(subcategory.value, category.value)}
                                className="w-full text-left py-3 px-4 text-sm text-gray-700 hover:bg-white hover:text-blue-600 rounded-md transition-colors"
                              >
                                {subcategory.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <p className="text-sm text-gray-500">No hay subcategorías disponibles</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estilos de animación */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};

export default MobileSearchFilters;