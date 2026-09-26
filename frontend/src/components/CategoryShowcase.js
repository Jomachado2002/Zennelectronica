// frontend/src/components/CategoryShowcase.js
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import productCategory from '../helpers/productCategory';
import usePreloadedCategories from '../hooks/usePreloadedCategories';
import {
  leafLabelFromStoredLabel,
  usableVisaoTree,
  collectLeafSubcategoryValues
} from '../helpers/visaoNavigationTree';
import { useSubcategoryPreviewMap, useSubcategoryPreviewMapFromValues, useHomeShowcasePreviewFlat } from '../hooks/useSubcategoryPreviewMap';
import { categoriaProductoHref, HOME_SLOT_ROUTES } from '../config/homeSlotRoutes';
import { warmImageUrls } from '../helpers/cdnImageUrl';

const scrollTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * homeShowcase: { categories, carousels } viene del mismo API que las vitrinas.
 * Así el carrusel de subcategorías pinta al abrir, sin esperar complete-structure.
 */
const CategoryShowcase = ({
  showcasePreviewsByCategory = null,
  homeShowcase = null
}) => {
  const navigate = useNavigate();
  const scrollElement = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);
  const [brokenIds, setBrokenIds] = useState({});

  const homePreviewFlat = useHomeShowcasePreviewFlat(showcasePreviewsByCategory);
  const bootstrapReady = !!(
    homeShowcase?.categories?.length &&
    homeShowcase?.carousels &&
    typeof homeShowcase.carousels === 'object'
  );

  const { data: menuFromApi } = usePreloadedCategories({ enabled: !bootstrapReady });

  const categories = useMemo(() => {
    // 1) Bootstrap del home (mismo timing que productos)
    if (bootstrapReady) {
      return homeShowcase.categories.map((cat) => ({
        id: cat.id || cat.value,
        value: cat.value,
        label: cat.label,
        visaoNavigationTree: null,
        subcategories: (homeShowcase.carousels[cat.value] || []).map((s) => ({
          id: s.id || s.value,
          value: s.value,
          label: s.label,
          image: s.image || null
        }))
      }));
    }
    // 2) Menú completo (fallback / enriquecido)
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
  }, [bootstrapReady, homeShowcase, menuFromApi]);

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

  const subcategories = useMemo(() => {
    const category = categories.find((cat) => cat.value === selectedCategory);
    return category ? category.subcategories : [];
  }, [selectedCategory, categories]);

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

  /** Slides: del bootstrap (con image) o del menú Visão */
  const carouselItems = useMemo(() => {
    if (!currentCategory) return [];

    if (bootstrapReady && homeShowcase?.carousels?.[currentCategory.value]) {
      return (homeShowcase.carousels[currentCategory.value] || []).map((s, idx) => ({
        id: s.id || `${s.value}-${idx}`,
        value: s.value,
        label: s.label,
        image: s.image || null
      }));
    }

    if (usableVisaoTree(currentCategory.visaoNavigationTree)) {
      return collectLeafSubcategoryValues(currentCategory.visaoNavigationTree).map((leaf, idx) => ({
        id: `${leaf.subcategoryValue || 'leaf'}-${idx}`,
        value: leaf.subcategoryValue,
        label: leaf.label,
        image: null
      }));
    }
    return subcategories.map((s) => ({
      id: s.id,
      value: s.value,
      label: s.label,
      image: s.image || null
    }));
  }, [currentCategory, subcategories, bootstrapReady, homeShowcase]);

  // Solo pedimos API de previews si NO tenemos bootstrap del home
  const needPreviewFetch = !bootstrapReady;
  const previewByVisaoLeaf = useSubcategoryPreviewMap(
    currentCategory?.visaoNavigationTree,
    needPreviewFetch && visaoReady,
    homePreviewFlat
  );

  const flatSubValues = useMemo(
    () => subcategories.map((s) => s.value).filter(Boolean),
    [subcategories]
  );
  const legacyPreviewBySub = useSubcategoryPreviewMapFromValues(
    flatSubValues,
    needPreviewFetch && !!(currentCategory && !visaoReady && flatSubValues.length > 0),
    homePreviewFlat
  );

  const activePreviewMap = useMemo(() => {
    const fromItems = {};
    carouselItems.forEach((it) => {
      if (it.value && it.image) fromItems[it.value] = it.image;
    });
    const fromQuery = visaoReady ? previewByVisaoLeaf : legacyPreviewBySub;
    return { ...homePreviewFlat, ...fromQuery, ...fromItems };
  }, [carouselItems, visaoReady, previewByVisaoLeaf, legacyPreviewBySub, homePreviewFlat]);

  // Precarga thumbs del carrusel visible (igual espíritu que vitrinas)
  useEffect(() => {
    const urls = carouselItems
      .map((it) => it.image || activePreviewMap[it.value])
      .filter(Boolean)
      .slice(0, 8);
    warmImageUrls(urls, 8);
  }, [selectedCategory, carouselItems, activePreviewMap]);

  const checkScrollPosition = () => {
    if (scrollElement.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollElement.current;
      setShowLeftButton(scrollLeft > 8);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 8);
    }
  };

  useEffect(() => {
    if (scrollElement.current) scrollElement.current.scrollLeft = 0;
    setBrokenIds({});
  }, [selectedCategory]);

  const cards = useMemo(() => {
    return carouselItems
      .map((item) => ({
        ...item,
        src: item.image || activePreviewMap[item.value] || ''
      }))
      .filter((item) => item.src && !brokenIds[item.id]);
  }, [carouselItems, activePreviewMap, brokenIds]);

  const pairCards = cards.length === 2;
  const centerOnDesktop = cards.length > 2 && cards.length <= 6;

  useEffect(() => {
    const scrollContainer = scrollElement.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      return () => scrollContainer.removeEventListener('scroll', checkScrollPosition);
    }
  }, [cards.length, currentCategory?.value, currentCategory?.visaoNavigationTree]);

  const handleSubcategoryClick = (categoryValue, subcategoryValue) => {
    navigate(categoriaProductoHref(categoryValue, subcategoryValue));
    scrollTop();
  };

  return (
    <section className="w-full bg-white py-3 sm:py-6">
      <div className="w-full px-4 lg:px-10">
        
        {/* TÍTULO */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00B5D8] via-[#1E90FF] to-[#7B2CBF] inline-block">
              Explora por Categorías
            </h2>
            <div className="h-1 w-16 sm:w-24 bg-gradient-to-r from-[#00B5D8] to-[#7B2CBF] mt-1.5 sm:mt-2 rounded-full mx-auto sm:mx-0"></div>
          </div>

          <div className="relative w-full sm:w-72">
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 pr-10 text-sm sm:text-base font-medium text-gray-800 bg-white border border-gray-200 rounded-xl appearance-none cursor-pointer transition-colors duration-200 hover:border-[#00B5D8] focus:outline-none focus:border-[#7B2CBF]"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Carrusel horizontal: árbol Visão aplanado a hojas; mismo aspecto si el API es plano */}
        {currentCategory && cards.length > 0 && (
          <div className="relative">
            <div className="relative group">
              {showLeftButton && (
                <button
                  className='hidden md:flex absolute left-1 top-1/2 transform -translate-y-1/2 z-20 
                          bg-white border border-gray-100 shadow-md rounded-full p-2.5 hover:bg-blue-50 
                          transition-all duration-300
                          md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-x-0'
                  onClick={scrollLeft}
                  aria-label="Scroll izquierda"
                >
                  <svg className="text-[#002060] w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {showRightButton && (
                <button
                  className='hidden md:flex absolute right-1 top-1/2 transform -translate-y-1/2 z-20 
                          bg-white border border-gray-100 shadow-md rounded-full p-2.5 hover:bg-blue-50 
                          transition-all duration-300
                          md:opacity-0 md:group-hover:opacity-100'
                  onClick={scrollRight}
                  aria-label="Scroll derecha"
                >
                  <svg className="text-[#002060] w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              <div 
                ref={scrollElement}
                className="overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 snap-x snap-mandatory md:snap-none"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <div className={`flex gap-3 sm:gap-4 py-1 ${
                  cards.length <= 2
                    ? 'w-full justify-center'
                    : centerOnDesktop
                      ? 'w-max md:w-full md:flex-wrap md:justify-center'
                      : 'w-max'
                }`}>
                  {cards.map((subcategory, index) => (
                    <button
                      key={subcategory.id || subcategory.value}
                      onClick={() => handleSubcategoryClick(currentCategory.value, subcategory.value)}
                      className={`explore-card group/card shrink-0 snap-start bg-white rounded-2xl overflow-hidden text-left ${
                        cards.length === 1
                          ? 'w-[168px]'
                          : pairCards
                            ? 'w-[calc(50%-0.375rem)] max-w-[168px]'
                            : 'w-[calc(50vw-1.375rem)] max-w-[12.5rem] sm:max-w-[168px] sm:w-[168px]'
                      }`}
                    >
                      <div className="h-24 sm:h-32 bg-white flex items-center justify-center px-2">
                        <img
                          src={subcategory.src}
                          alt={leafLabelFromStoredLabel(subcategory.label)}
                          className="max-h-full max-w-full object-contain"
                          width={148}
                          height={96}
                          loading={index < 4 ? 'eager' : 'lazy'}
                          fetchPriority={index < 2 ? 'high' : 'low'}
                          decoding="async"
                          onError={() => {
                            setBrokenIds((prev) => (
                              prev[subcategory.id] ? prev : { ...prev, [subcategory.id]: true }
                            ));
                          }}
                        />
                      </div>
                      <div className="px-2 sm:px-3 pb-2.5 sm:pb-3 pt-1 border-t border-gray-100">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-800 group-hover/card:text-[#7B2CBF] transition-colors text-center line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] leading-snug">
                          {leafLabelFromStoredLabel(subcategory.label)}
                        </h4>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentCategory && cards.length === 0 && bootstrapReady && (
          <div className="text-center py-12 text-gray-500 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
            <p>No hay subcategorías disponibles para esta categoría.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .overflow-x-auto {
          scroll-behavior: smooth;
        }

        .explore-card {
          border: 1px solid #e5e7eb;
          background: #fff;
        }

        .explore-card:hover {
          border-color: transparent;
          background-image: linear-gradient(#fff, #fff), linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%);
          background-origin: border-box;
          background-clip: padding-box, border-box;
          box-shadow: 0 10px 24px rgba(30, 27, 75, 0.08);
        }
      `}</style>
    </section>
  );
};

export default CategoryShowcase;