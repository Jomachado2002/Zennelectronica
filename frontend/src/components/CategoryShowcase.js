// frontend/src/components/CategoryShowcase.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import productCategory from '../helpers/productCategory';
import { ChevronDown } from 'lucide-react';

const scrollTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const CategoryShowcase = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('informatica');

  const currentCategory = productCategory.find(cat => cat.value === selectedCategory);

  const handleSubcategoryClick = (categoryValue, subcategoryValue) => {
    navigate(`/categoria-producto?category=${categoryValue}&subcategory=${subcategoryValue}`);
    scrollTop();
  };

  return (
    <section className="w-full bg-white py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* ========== TÍTULO COMPACTO ========== */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          {/* Título a la izquierda */}
          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00B5D8] via-[#1E90FF] to-[#7B2CBF] inline-block">
              Explora por Categorías
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-[#00B5D8] to-[#7B2CBF] mt-2 rounded-full mx-auto sm:mx-0"></div>
          </div>

          {/* Selector a la derecha */}
          <div className="relative w-full sm:w-72">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 pr-10 text-sm font-medium text-gray-800 bg-white border-2 border-transparent rounded-xl shadow-md appearance-none cursor-pointer transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              style={{
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box'
              }}
            >
              {productCategory.map(category => (
                <option key={category.id} value={category.value}>
                  📁 {category.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ========== GRID DE SUBCATEGORÍAS - MÁS COMPACTO ========== */}
        {currentCategory && (
          <div className="relative">
            {/* Gradientes de sombra en los bordes */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none hidden sm:block"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none hidden sm:block"></div>

            {/* Grid con scroll horizontal */}
            <div 
              className="overflow-x-auto scrollbar-hide pb-2"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <div className="flex gap-3 sm:gap-4 min-w-max">
                {currentCategory.subcategories.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    onClick={() => handleSubcategoryClick(currentCategory.value, subcategory.value)}
                    className="group/card flex-shrink-0 w-36 sm:w-44 bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1"
                    style={{
                      border: '2px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box'
                    }}
                  >
                    {/* ✅ IMAGEN OPTIMIZADA */}
                    <div className="relative h-28 sm:h-36 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      <img
                        src={`/images/subcategories/${subcategory.value}.jpg`}
                        alt={subcategory.label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                        loading="lazy"
                        fetchPriority="low"
                        onError={(e) => {
                          if (e && e.target) {
                            e.target.src = '/images/subcategories/default.jpg';
                          }
                        }}
                      />
                      {/* Overlay con gradiente */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
                    </div>

                    {/* Contenido de la tarjeta - MÁS COMPACTO */}
                    <div className="p-3">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-800 group-hover/card:text-transparent group-hover/card:bg-clip-text group-hover/card:bg-gradient-to-r group-hover/card:from-[#00B5D8] group-hover/card:to-[#7B2CBF] transition-all duration-300 line-clamp-2">
                        {subcategory.label}
                      </h4>
                      
                      {/* Flecha */}
                      <div className="flex justify-end mt-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#00B5D8] to-[#7B2CBF] flex items-center justify-center transform group-hover/card:scale-110 group-hover/card:rotate-12 transition-transform duration-300">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-3 w-3 text-white" 
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

            {/* Indicador de scroll - MÁS DISCRETO */}
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
                <span className="font-medium">Desliza</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== ESTILOS ========== */}
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