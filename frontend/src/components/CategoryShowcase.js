// frontend/src/components/CategoryShowcase.js
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const scrollTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const CategoryShowcase = () => {
  const navigate = useNavigate();
  const scrollElement = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('informatica');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);
  const [categoryData, setCategoryData] = useState({}); // Cache de datos por categoría

  // Cargar categorías desde la base de datos una sola vez
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080'}/api/admin/categories/menu/categories`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setCategories(result.data);
          }
        }
      } catch (error) {
        console.error('Error cargando categorías:', error);
      }
    };

    fetchCategories();
  }, []);

  // Cargar subcategorías optimizado con cache
  useEffect(() => {
    const fetchData = async () => {
      // Si ya tenemos los datos en caché, usarlos
      if (categoryData[selectedCategory]) {
        setSubcategories(categoryData[selectedCategory]);
        return;
      }

      if (!selectedCategory) return;

      try {
        // Obtener subcategorías
        const subcategoriesResponse = await fetch(
          `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080'}/api/admin/categories/menu/categories/${selectedCategory}/subcategories`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (!subcategoriesResponse.ok) return;

        const subcategoriesResult = await subcategoriesResponse.json();
        if (!subcategoriesResult.success || !subcategoriesResult.data) return;

        const subcategoriesData = subcategoriesResult.data;

        // Guardar en caché
        setCategoryData(prev => ({
          ...prev,
          [selectedCategory]: subcategoriesData
        }));

        setSubcategories(subcategoriesData);
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };

    fetchData();
  }, [selectedCategory, categoryData]);

  // Funciones de scroll
  const scrollRight = () => {
    if (scrollElement.current) {
      scrollElement.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const scrollLeft = () => {
    if (scrollElement.current) {
      scrollElement.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const checkScrollPosition = () => {
    if (scrollElement.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollElement.current;
      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    const scrollContainer = scrollElement.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      return () => scrollContainer.removeEventListener('scroll', checkScrollPosition);
    }
  }, [subcategories]);

  const handleSubcategoryClick = (categoryValue, subcategoryValue) => {
    navigate(`/categoria-producto?category=${categoryValue}&subcategory=${subcategoryValue}`);
    scrollTop();
  };

  const currentCategory = useMemo(() => 
    categories.find(cat => cat.value === selectedCategory),
    [categories, selectedCategory]
  );

  return (
    <section className="w-full bg-white py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* TÍTULO */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00B5D8] via-[#1E90FF] to-[#7B2CBF] inline-block">
              Explora por Categorías
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-[#00B5D8] to-[#7B2CBF] mt-2 rounded-full mx-auto sm:mx-0"></div>
          </div>

          <div className="relative w-full sm:w-72">
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 pr-10 text-sm font-medium text-gray-800 bg-white border-2 border-transparent rounded-xl shadow-md appearance-none cursor-pointer transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              style={{
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box'
              }}
            >
              {categories.map(category => (
                <option key={category.id} value={category.value}>
                  📁 {category.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* GRID DE SUBCATEGORÍAS */}
        {currentCategory && subcategories.length > 0 && (
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none hidden sm:block"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none hidden sm:block"></div>

            <div className="relative group">
              {showLeftButton && (
                <button
                  className='absolute left-0 top-1/2 transform -translate-y-1/2 z-20 
                          bg-white shadow-lg rounded-full p-3 hover:bg-blue-50 
                          transition-all duration-300 -translate-x-2
                          opacity-0 group-hover:opacity-100 group-hover:translate-x-0 hidden md:block'
                  onClick={scrollLeft}
                  aria-label="Scroll izquierda"
                >
                  <ChevronLeft className='text-[#002060] w-5 h-5' />
                </button>
              )}
              
              {showRightButton && (
                <button
                  className='absolute right-0 top-1/2 transform -translate-y-1/2 z-20 
                          bg-white shadow-lg rounded-full p-3 hover:bg-blue-50 
                          transition-all duration-300 translate-x-2
                          opacity-0 group-hover:opacity-100 group-hover:translate-x-0 hidden md:block'
                  onClick={scrollRight}
                  aria-label="Scroll derecha"
                >
                  <ChevronRight className='text-[#002060] w-5 h-5' />
                </button>
              )}

              <div 
                ref={scrollElement}
                className="overflow-x-auto scrollbar-hide pb-2"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <div className="flex gap-4 sm:gap-4 min-w-max">
                  {subcategories.map((subcategory) => (
                    <button
                      key={subcategory.id || subcategory.value}
                      onClick={() => handleSubcategoryClick(currentCategory.value, subcategory.value)}
                      className="group/card flex-shrink-0 w-44 sm:w-48 md:w-52 bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1"
                      style={{
                        border: '2px solid transparent',
                        backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                        backgroundOrigin: 'border-box',
                        backgroundClip: 'padding-box, border-box'
                      }}
                    >
                      <div className="relative h-32 sm:h-36 md:h-40 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                        <img
                          src={`/images/subcategories/${subcategory.value}.jpg`}
                          alt={subcategory.label}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                          loading="lazy"
                          onError={(e) => {
                            if (e && e.target) {
                              e.target.src = '/images/subcategories/default.jpg';
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      <div className="p-3 sm:p-4">
                        <h4 className="text-sm sm:text-base font-bold text-gray-800 group-hover/card:text-transparent group-hover/card:bg-clip-text group-hover/card:bg-gradient-to-r group-hover/card:from-[#00B5D8] group-hover/card:to-[#7B2CBF] transition-all duration-300 line-clamp-2 min-h-[3rem]">
                          {subcategory.label}
                        </h4>
                        
                        <div className="flex justify-end mt-2">
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-r from-[#00B5D8] to-[#7B2CBF] flex items-center justify-center transform group-hover/card:scale-110 group-hover/card:rotate-12 transition-transform duration-300">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-4 w-4 text-white" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-3 sm:hidden">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 animate-bounce-horizontal" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="font-medium">Desliza para ver más</span>
              </div>
            </div>
          </div>
        )}

        {subcategories.length === 0 && subcategories !== null && (
          <div className="text-center py-12 text-gray-500">
            <p>No hay subcategorías disponibles para esta categoría.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @keyframes bounce-horizontal {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(8px);
          }
        }

        .animate-bounce-horizontal {
          animation: bounce-horizontal 2s ease-in-out infinite;
        }

        .overflow-x-auto {
          scroll-behavior: smooth;
        }
      `}</style>
    </section>
  );
};

export default CategoryShowcase;