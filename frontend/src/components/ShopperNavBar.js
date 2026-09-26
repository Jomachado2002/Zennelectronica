import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import productCategory from '../helpers/productCategory';
import usePreloadedCategories from '../hooks/usePreloadedCategories';
import { categoriaConMarcaHref, categoriaProductoHref } from '../config/homeSlotRoutes';
import { leafLabelFromStoredLabel } from '../helpers/visaoNavigationTree';
import scrollTop from '../helpers/scrollTop';
import axiosInstance from '../config/axiosInstance';

const ShopperNavBar = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeCategory = params.get('category');
  const scrollerRef = useRef(null);
  const barRef = useRef(null);
  const closeTimer = useRef(null);
  const openTimer = useRef(null);
  const [openValue, setOpenValue] = useState(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [brandsByCategory, setBrandsByCategory] = useState({});

  const { data: menuFromApi } = usePreloadedCategories();

  const categories = useMemo(() => {
    const source = menuFromApi && menuFromApi.length > 0 ? menuFromApi : productCategory;
    return source.map((cat) => ({
      value: cat.value,
      label: cat.label || cat.name,
      subcategories: (cat.subcategories || []).map((sub) => ({
        value: sub.value,
        label: leafLabelFromStoredLabel(sub.label || sub.name)
      }))
    }));
  }, [menuFromApi]);

  const openCategory = categories.find((cat) => cat.value === openValue) || null;

  useEffect(() => {
    let cancelled = false;
    const loadBrands = (attempt) => {
      axiosInstance.get('/api/marcas-por-categoria', {
        params: { t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      })
        .then((res) => {
          if (!cancelled && res.data?.success) setBrandsByCategory(res.data.data || {});
        })
        .catch(() => {
          if (!cancelled && attempt < 2) setTimeout(() => loadBrands(attempt + 1), 700);
        });
    };
    loadBrands(0);
    return () => {
      cancelled = true;
    };
  }, []);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [categories.length]);

  useEffect(() => {
    setOpenValue(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') setOpenValue(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const cancelOpen = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelOpen();
    clearClose();
    closeTimer.current = setTimeout(() => setOpenValue(null), 140);
  };

  const showCategory = (value) => {
    cancelOpen();
    clearClose();
    setOpenValue(value);
  };

  const scheduleOpen = (value) => {
    cancelOpen();
    clearClose();
    if (openValue) {
      setOpenValue(value);
      return;
    }
    openTimer.current = setTimeout(() => setOpenValue(value), 450);
  };

  const scrollByPage = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.72, 220), behavior: 'smooth' });
  };

  const brands = openCategory ? (brandsByCategory[openCategory.value] || []) : [];

  return (
    <nav
      ref={barRef}
      aria-label="Categorías"
      className="hidden lg:block relative h-11 border-t border-gray-100 bg-white"
      onMouseLeave={scheduleClose}
    >
      <div className="flex h-full items-center px-4 lg:px-8">
        <button
          type="button"
          aria-label="Categorías anteriores"
          className={`shrink-0 h-full w-9 flex items-center justify-center text-[#00B5D8] hover:text-[#7B2CBF] ${canLeft ? '' : 'invisible'}`}
          onClick={() => scrollByPage(-1)}
        >
          <FiChevronLeft size={18} />
        </button>
        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className="flex-1 h-full overflow-x-auto scrollbar-none"
        >
          <ul className="flex h-full items-center gap-1 px-2 min-w-max">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.value || openValue === cat.value;
              return (
                <li key={cat.value} className="shrink-0 h-full flex items-center">
                  <button
                    type="button"
                    className={`group relative px-1.5 py-0.5 text-[12px] tracking-[0.14em] uppercase whitespace-nowrap font-medium ${
                      isActive ? 'font-semibold' : 'text-gray-500 hover:text-[#7B2CBF]'
                    }`}
                    style={isActive ? {
                      backgroundImage: 'linear-gradient(135deg, #00B5D8 0%, #7B2CBF 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    } : undefined}
                    onMouseEnter={() => scheduleOpen(cat.value)}
                    onMouseLeave={cancelOpen}
                    onClick={() => showCategory(cat.value)}
                  >
                    {cat.label}
                    <span
                      className={`absolute left-1 right-1 -bottom-1 h-0.5 rounded-full transition-opacity ${
                        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      style={{ background: 'linear-gradient(90deg, #00B5D8 0%, #7B2CBF 100%)' }}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <button
          type="button"
          aria-label="Categorías siguientes"
          className={`shrink-0 h-full w-9 flex items-center justify-center text-[#7B2CBF] hover:text-[#00B5D8] ${canRight ? '' : 'invisible'}`}
          onClick={() => scrollByPage(1)}
        >
          <FiChevronRight size={18} />
        </button>
      </div>
      {openCategory && (
        <div
          className="absolute left-0 right-0 top-full bg-white border-t border-gray-100 shadow-xl z-[120]"
          onMouseEnter={clearClose}
        >
          <div className="max-h-[68vh] overflow-y-auto px-8 py-7">
            <div className="grid gap-10" style={{ gridTemplateColumns: 'minmax(0, 1fr) 240px' }}>
              <div>
                <p className="text-[11px] tracking-[0.16em] uppercase font-semibold text-[#7B2CBF] mb-4">
                  Subcategorías
                </p>
                <Link
                  to={categoriaProductoHref(openCategory.value)}
                  onClick={() => {
                    setOpenValue(null);
                    scrollTop();
                  }}
                  className="inline-block mb-4 text-sm font-medium text-[#00B5D8] underline underline-offset-4"
                >
                  Ver todo {openCategory.label}
                </Link>
                <ul className="columns-2 xl:columns-3 gap-x-10">
                  {openCategory.subcategories.map((sub) => (
                    <li key={sub.value} className="break-inside-avoid mb-2">
                      <Link
                        to={categoriaProductoHref(openCategory.value, sub.value)}
                        onClick={() => {
                          setOpenValue(null);
                          scrollTop();
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        {sub.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-l border-gray-100 pl-8">
                <p className="text-[11px] tracking-[0.16em] uppercase font-semibold text-[#7B2CBF] mb-4">
                  Marcas
                </p>
                {brands.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin marcas en esta categoría</p>
                ) : (
                  <ul className="max-h-[52vh] overflow-y-auto pr-2">
                    {brands.map((brand) => (
                      <li key={brand} className="mb-2">
                        <Link
                          to={categoriaConMarcaHref(openCategory.value, brand)}
                          onClick={() => {
                            setOpenValue(null);
                            scrollTop();
                          }}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          {brand}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default ShopperNavBar;
