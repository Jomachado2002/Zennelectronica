// frontend/src/components/CategoryShowcase.js
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import productCategory from '../helpers/productCategory';
import usePreloadedCategories from '../hooks/usePreloadedCategories';
import {
  leafLabelFromStoredLabel,
  usableVisaoTree,
  collectLeafSubcategoryValues
} from '../helpers/visaoNavigationTree';
import { useSubcategoryPreviewMap, useSubcategoryPreviewMapFromValues, useHomeShowcasePreviewFlat } from '../hooks/useSubcategoryPreviewMap';
import { categoriaProductoHref, HOME_SLOT_ROUTES } from '../config/homeSlotRoutes';
import { cdnThumbUrl } from '../helpers/cdnImageUrl';

const scrollTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const CategoryShowcase = ({ showcasePreviewsByCategory = null }) => {
  const navigate = useNavigate();
  const scrollElement = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);

  const homePreviewFlat = useHomeShowcasePreviewFlat(showcasePreviewsByCategory);

  const { data: menuFromApi } = usePreloadedCategories();

  const categories = useMemo(() => {
    if (menuFromApi && menuFromApi.length > 0) {
      return menuFromApi.map((cat) => ({
        id: cat.id,
        value: cat.value,
        label: cat.label || cat.name,
        visaoNavigationTree: cat.visaoNavigationTree || null,
        subcategories: (cat.subcategories || []).map((sub) => ({
          id: sub.id,
          value: sub.value,
          label: sub.label || sub.name
        }))
      }));
    }
    return productCategory;
  }, [menuFromApi]);

  useEffect(() => {
    if (!categories.length) return;
    const invalid = !selectedCategory || !categories.some((c) => c.value === selectedCategory);
    if (!invalid) return;
    const mobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches;
    const celValue = HOME_SLOT_ROUTES.celulares.category;
    const preferMobile =
      mobile && categories.some((c) => c.value === celValue) ? celValue : null;
    setSelectedCategory(preferMobile || categories[0].value);
  }, [categories, selectedCategory]);

  // Subcategorías de la selección actual
  const subcategories = useMemo(() => {
    const category = categories.find(cat => cat.value === selectedCategory);
    return category ? category.subcategories : [];
  }, [selectedCategory, categories]);

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

  const currentCategory = useMemo(
    () => categories.find((cat) => cat.value === selectedCategory),
    [categories, selectedCategory]
  );

  const visaoReady = !!(currentCategory && usableVisaoTree(currentCategory.visaoNavigationTree));

  /** Listado único para el carrusel: hojas del árbol Visão o subcategorías planas del API */
  const carouselItems = useMemo(() => {
    if (!currentCategory) return [];
    if (usableVisaoTree(currentCategory.visaoNavigationTree)) {
      return collectLeafSubcategoryValues(currentCategory.visaoNavigationTree).map((leaf, idx) => ({
        id: `${leaf.subcategoryValue || 'leaf'}-${idx}`,
        value: leaf.subcategoryValue,
        label: leaf.label
      }));
    }
    return subcategories.map((s) => ({
      id: s.id,
      value: s.value,
      label: s.label
    }));
  }, [currentCategory, subcategories]);

  const previewByVisaoLeaf = useSubcategoryPreviewMap(
    currentCategory?.visaoNavigationTree,
    visaoReady,
    homePreviewFlat
  );

  const flatSubValues = useMemo(
    () => subcategories.map((s) => s.value).filter(Boolean),
    [subcategories]
  );
  const legacyPreviewBySub = useSubcategoryPreviewMapFromValues(
    flatSubValues,
    !!(currentCategory && !visaoReady && flatSubValues.length > 0),
    homePreviewFlat
  );

  // Home payload primero (instantáneo); React Query completa / refresca
  const activePreviewMap = useMemo(() => {
    const fromQuery = visaoReady ? previewByVisaoLeaf : legacyPreviewBySub;
    return { ...homePreviewFlat, ...fromQuery };
  }, [visaoReady, previewByVisaoLeaf, legacyPreviewBySub, homePreviewFlat]);

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
  }, [carouselItems.length, currentCategory?.value, currentCategory?.visaoNavigationTree]);

  useEffect(() => {
    if (scrollElement.current) scrollElement.current.scrollLeft = 0;
  }, [selectedCategory]);

  const handleSubcategoryClick = (categoryValue, subcategoryValue) => {
    navigate(categoriaProductoHref(categoryValue, subcategoryValue));
    scrollTop();
  };

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
              {categories.map((category) => (
                <option key={category.id} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Carrusel horizontal: árbol Visão aplanado a hojas; mismo aspecto si el API es plano */}
        {currentCategory && carouselItems.length > 0 && (
          <div className="relative rounded-2xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4 shadow-inner">
            <div className="absolute left-0 top-8 bottom-8 w-10 bg-gradient-to-r from-gray-50/90 to-transparent z-10 pointer-events-none hidden sm:block rounded-l-xl" />
            <div className="absolute right-0 top-8 bottom-8 w-10 bg-gradient-to-l from-gray-50/90 to-transparent z-10 pointer-events-none hidden sm:block rounded-r-xl" />

            <div className="relative group">
              {showLeftButton && (
                <button
                  className='absolute left-1 top-1/2 transform -translate-y-1/2 z-20 
                          bg-white border border-gray-100 shadow-md rounded-full p-2.5 hover:bg-blue-50 
                          transition-all duration-300
                          opacity-90 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-x-0'
                  onClick={scrollLeft}
                  aria-label="Scroll izquierda"
                >
                  <ChevronLeft className='text-[#002060] w-5 h-5' />
                </button>
              )}

              {showRightButton && (
                <button
                  className='absolute right-1 top-1/2 transform -translate-y-1/2 z-20 
                          bg-white border border-gray-100 shadow-md rounded-full p-2.5 hover:bg-blue-50 
                          transition-all duration-300
                          opacity-90 md:opacity-0 md:group-hover:opacity-100'
                  onClick={scrollRight}
                  aria-label="Scroll derecha"
                >
                  <ChevronRight className='text-[#002060] w-5 h-5' />
                </button>
              )}

              <div 
                ref={scrollElement}
                className="overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <div className="flex gap-3 sm:gap-4 min-w-max py-1">
                  {carouselItems.map((subcategory, slideIndex) => {
                    const previewUrl = activePreviewMap[subcategory.value];
                    const staticSubImg = subcategory.value
                      ? `/images/subcategories/${encodeURIComponent(subcategory.value)}.jpg`
                      : '';
                    // Producto del home/API con thumb CDN; estático solo como fallback
                    const productThumb = previewUrl
                      ? cdnThumbUrl(previewUrl, { width: 384, quality: 70, fit: 'cover' })
                      : '';
                    const initialImgSrc = productThumb || staticSubImg;
                    const eagerCount = 8;
                    return (
                    <button
                      key={subcategory.id || subcategory.value}
                      onClick={() => handleSubcategoryClick(currentCategory.value, subcategory.value)}
                      className="group/card flex-shrink-0 w-40 sm:w-44 md:w-48 bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                      style={{
                        border: '2px solid transparent',
                        backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                        backgroundOrigin: 'border-box',
                        backgroundClip: 'padding-box, border-box'
                      }}
                    >
                      <div className="relative h-28 sm:h-32 md:h-36 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                        {initialImgSrc ? (
                        <img
                          src={initialImgSrc}
                          alt={leafLabelFromStoredLabel(subcategory.label)}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                          sizes="(max-width: 640px) 160px, (max-width: 1024px) 176px, 192px"
                          loading={slideIndex < eagerCount ? 'eager' : 'lazy'}
                          fetchPriority={slideIndex < 4 ? 'high' : slideIndex < eagerCount ? 'auto' : 'low'}
                          decoding="async"
                          data-full={previewUrl || ''}
                          onError={(e) => {
                            const t = e.currentTarget;
                            const def = '/images/subcategories/default.jpg';
                            const a = Number(t.dataset.fb || 0) + 1;
                            t.dataset.fb = String(a);
                            // 1) Si falló thumb CF → original full
                            if (a === 1 && t.dataset.full && t.src !== t.dataset.full) {
                              t.src = t.dataset.full;
                              return;
                            }
                            if (previewUrl) {
                              if (a <= 2) {
                                t.src = staticSubImg || def;
                                return;
                              }
                              if (a === 3 && staticSubImg) {
                                t.src = def;
                                return;
                              }
                            } else if (staticSubImg) {
                              if (a === 1 || a === 2) {
                                t.src = def;
                                return;
                              }
                            }
                            t.style.display = 'none';
                          }}
                        />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      <div className="p-2.5 sm:p-3">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-800 group-hover/card:text-transparent group-hover/card:bg-clip-text group-hover/card:bg-gradient-to-r group-hover/card:from-[#00B5D8] group-hover/card:to-[#7B2CBF] transition-all duration-300 line-clamp-2 min-h-[2.75rem] text-left leading-snug">
                          {leafLabelFromStoredLabel(subcategory.label)}
                        </h4>

                        <div className="flex justify-end mt-1.5">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#00B5D8] to-[#7B2CBF] flex items-center justify-center transform group-hover/card:scale-105 transition-transform duration-300">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-3.5 w-3.5 text-white" 
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
                  );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-2 sm:hidden pt-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 animate-bounce-horizontal shrink-0" 
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

        {currentCategory && carouselItems.length === 0 && subcategories !== null && (
          <div className="text-center py-12 text-gray-500 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
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