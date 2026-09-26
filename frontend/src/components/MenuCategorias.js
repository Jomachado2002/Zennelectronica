import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiCategoryAlt } from "react-icons/bi";
import { FaWhatsapp, FaPhone } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { IoMdClose } from "react-icons/io";
import productCategory from '../helpers/productCategory';
import usePreloadedCategories from '../hooks/usePreloadedCategories';
import SubcategoryTreePicker from './SubcategoryTreePicker';
import {
  breadcrumbLabelsForPath,
  collectLeafSubcategoryValues,
  getSortedTreeChildEntries,
  getTreeNodeAtPath,
  hasTreeChildren,
  isTreeLeaf,
  leafLabelFromStoredLabel,
  usableVisaoTree
} from '../helpers/visaoNavigationTree';
import { useSubcategoryPreviewMap } from '../hooks/useSubcategoryPreviewMap';
import { categoriaProductoHref } from '../config/homeSlotRoutes';

const scrollTop = () => {
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  } else {
    const scrollToTop = () => {
      const currentPosition = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;

      if (currentPosition > 0) {
        window.requestAnimationFrame(scrollToTop);
        window.scrollTo(0, currentPosition - currentPosition / 8);
      }
    };

    scrollToTop();
  }

  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    setTimeout(() => {
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }, 100);
  }

  setTimeout(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, 200);
};

function collectMenuSearchHits(categories, query) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const hits = [];

  for (const category of categories) {
    const categoryLabel = category.label || '';
    if (categoryLabel.toLowerCase().includes(q)) {
      hits.push({
        key: `cat-${category.value}`,
        label: categoryLabel,
        hint: 'Categoría',
        href: categoriaProductoHref(category.value)
      });
    }

    if (usableVisaoTree(category.visaoNavigationTree)) {
      for (const leaf of collectLeafSubcategoryValues(category.visaoNavigationTree)) {
        const label = leafLabelFromStoredLabel(leaf.label);
        const haystack = `${label} ${leaf.label || ''}`.toLowerCase();
        if (!haystack.includes(q)) continue;
        hits.push({
          key: `leaf-${category.value}-${leaf.subcategoryValue}`,
          label,
          hint: categoryLabel,
          href: categoriaProductoHref(category.value, leaf.subcategoryValue)
        });
        if (hits.length >= 20) return hits;
      }
    } else {
      for (const sub of category.subcategories || []) {
        const label = leafLabelFromStoredLabel(sub.label);
        if (!label.toLowerCase().includes(q)) continue;
        hits.push({
          key: `sub-${sub.id || sub.value}`,
          label,
          hint: categoryLabel,
          href: categoriaProductoHref(category.value, sub.value)
        });
        if (hits.length >= 20) return hits;
      }
    }
  }

  return hits.slice(0, 20);
}

const MenuCategorias = ({ 
  isOpen, 
  onClose, 
  isMobile = false 
}) => {
  const navigate = useNavigate();
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(null);
  const [activeSubcategories, setActiveSubcategories] = useState([]);
  const [menuQuery, setMenuQuery] = useState('');
  const [mobileLevel, setMobileLevel] = useState({ kind: 'root' });
  const menuRef = useRef(null);
  const overlayRef = useRef(null);

  const { data: menuFromApi, loading: categoriesLoading, error: categoriesFetchError } = usePreloadedCategories();

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

  const categoriesError = categoriesFetchError ? categoriesFetchError.message || 'Error cargando categorías' : null;
  const loadingSubcategories = false;

  // Función para obtener subcategorías de una categoría (API o fallback)
  const loadSubcategories = useCallback((categoryValue) => {
    const category = categories.find(cat => cat.value === categoryValue);
    return Promise.resolve(category ? category.subcategories : []);
  }, [categories]);

  // Efecto para actualizar subcategorías cuando cambia la categoría activa (DESKTOP)
  useEffect(() => {
    const loadSubcategoriesForActiveCategory = async () => {
      if (!isMobile && activeCategoryIndex !== null && categories[activeCategoryIndex]) {
        const subcategories = await loadSubcategories(categories[activeCategoryIndex].value);
        setActiveSubcategories(subcategories);
      } else if (!isMobile) {
        setActiveSubcategories([]);
      }
    };

    loadSubcategoriesForActiveCategory();
  }, [activeCategoryIndex, isMobile, categories, loadSubcategories]);

  // Prevenir scroll cuando el menú está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setMenuQuery('');
      setMobileLevel({ kind: 'root' });
    }
  }, [isOpen]);

  const handleCategoryClick = (index) => {
    setActiveCategoryIndex(index);
  };

  const openCategoryLevel = (category) => {
    if (usableVisaoTree(category.visaoNavigationTree)) {
      setMobileLevel({ kind: 'tree', category, pathKeys: [] });
      return;
    }
    setMobileLevel({ kind: 'category', category });
  };

  const goMobileBack = () => {
    if (mobileLevel.kind === 'tree' && mobileLevel.pathKeys.length > 0) {
      setMobileLevel({
        kind: 'tree',
        category: mobileLevel.category,
        pathKeys: mobileLevel.pathKeys.slice(0, -1)
      });
      return;
    }
    setMobileLevel({ kind: 'root' });
  };

  const handleNavigateWithReload = (url) => {
    navigate(url);
    scrollTop();
    onClose();
    
    setTimeout(() => {
      window.location.reload();
    }, 10);
  };

  const desktopCategory =
    isOpen && !isMobile && activeCategoryIndex !== null ? categories[activeCategoryIndex] : null;
  const desktopVisaoTree = desktopCategory?.visaoNavigationTree;
  const desktopPreviewEnabled = !!desktopCategory && usableVisaoTree(desktopVisaoTree);
  const desktopPreviewBySub = useSubcategoryPreviewMap(desktopVisaoTree, desktopPreviewEnabled);
  const menuSearchHits = useMemo(
    () => collectMenuSearchHits(categories, menuQuery),
    [categories, menuQuery]
  );
  const trimmedMenuQuery = menuQuery.trim();

  if (!isOpen) return null;

  // ============ VERSIÓN MÓVIL ============
  if (isMobile) {
    const searching = trimmedMenuQuery.length >= 2;
    let title = 'Menú';
    let showBack = false;
    const rows = [];

    if (searching) {
      title = 'Buscar';
    } else if (mobileLevel.kind === 'category') {
      title = mobileLevel.category.label;
      showBack = true;
      rows.push({
        key: 'all',
        label: 'Ver todo',
        hint: mobileLevel.category.label,
        onSelect: () => handleNavigateWithReload(categoriaProductoHref(mobileLevel.category.value))
      });
      (mobileLevel.category.subcategories || []).forEach((sub) => {
        rows.push({
          key: sub.id || sub.value,
          label: leafLabelFromStoredLabel(sub.label),
          onSelect: () => handleNavigateWithReload(
            categoriaProductoHref(mobileLevel.category.value, sub.value)
          )
        });
      });
    } else if (mobileLevel.kind === 'tree') {
      const node = getTreeNodeAtPath(mobileLevel.category.visaoNavigationTree, mobileLevel.pathKeys);
      const crumbs = breadcrumbLabelsForPath(mobileLevel.category.visaoNavigationTree, mobileLevel.pathKeys);
      title = crumbs[crumbs.length - 1] || mobileLevel.category.label;
      showBack = true;
      if (mobileLevel.pathKeys.length === 0) {
        rows.push({
          key: 'all',
          label: 'Ver todo',
          hint: mobileLevel.category.label,
          onSelect: () => handleNavigateWithReload(categoriaProductoHref(mobileLevel.category.value))
        });
      }
      getSortedTreeChildEntries(node?.children).forEach(({ key, node: child }) => {
        if (hasTreeChildren(child)) {
          rows.push({
            key,
            label: child.label,
            onSelect: () => setMobileLevel({
              kind: 'tree',
              category: mobileLevel.category,
              pathKeys: [...mobileLevel.pathKeys, key]
            })
          });
        } else if (isTreeLeaf(child)) {
          rows.push({
            key,
            label: leafLabelFromStoredLabel(child.label),
            onSelect: () => handleNavigateWithReload(
              categoriaProductoHref(mobileLevel.category.value, child.subcategoryValue)
            )
          });
        }
      });
    }

    const submitCatalogSearch = (event) => {
      event.preventDefault();
      if (trimmedMenuQuery.length < 2) return;
      handleNavigateWithReload(`/buscar?q=${encodeURIComponent(trimmedMenuQuery)}`);
    };

    return (
      <div className="fixed inset-0 z-[160] bg-white flex flex-col">
        <div className="flex-shrink-0 bg-white border-b border-gray-100">
          <div className="flex items-center h-14 px-2">
            {showBack ? (
              <button
                type="button"
                onClick={goMobileBack}
                className="w-10 h-10 flex items-center justify-center text-gray-800"
                aria-label="Volver"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <span className="w-10" />
            )}
            <h1 className="flex-1 text-center text-[15px] font-semibold text-gray-900 truncate px-2">
              {title}
            </h1>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-700"
              aria-label="Cerrar menú"
            >
              <IoMdClose className="text-2xl" />
            </button>
          </div>
          <form onSubmit={submitCatalogSearch} className="px-4 pb-3">
            <label className="flex items-center gap-2 h-11 px-4 rounded-full bg-gray-50 border border-gray-200">
              <FiSearch className="text-gray-400 flex-shrink-0" />
              <input
                type="search"
                value={menuQuery}
                onChange={(event) => setMenuQuery(event.target.value)}
                placeholder="Buscar productos o categorías"
                className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
              />
            </label>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto">
          {categoriesLoading ? (
            <div className="flex items-center justify-center p-10 text-sm text-gray-500">
              Cargando categorías...
            </div>
          ) : categories.length === 0 && categoriesError ? (
            <div className="text-center p-8 text-red-600">
              <p>Error al cargar categorías</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-[#002060] underline"
              >
                Recargar página
              </button>
            </div>
          ) : searching ? (
            <>
              <button
                type="button"
                onClick={submitCatalogSearch}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 text-left active:bg-gray-50"
              >
                <span>
                  <span className="block text-[15px] font-medium text-gray-900">
                    Buscar “{trimmedMenuQuery}”
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">En todo el catálogo</span>
                </span>
                <MenuChevron />
              </button>
              {menuSearchHits.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-500 text-center">
                  No hay categorías con ese nombre. Podés buscarlo en productos.
                </p>
              ) : (
                menuSearchHits.map((hit) => (
                  <button
                    key={hit.key}
                    type="button"
                    onClick={() => handleNavigateWithReload(hit.href)}
                    className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 text-left active:bg-gray-50"
                  >
                    <span className="min-w-0 pr-3">
                      <span className="block text-[15px] font-medium text-gray-900 truncate">{hit.label}</span>
                      <span className="block text-xs text-gray-500 mt-0.5 truncate">{hit.hint}</span>
                    </span>
                    <MenuChevron />
                  </button>
                ))
              )}
            </>
          ) : mobileLevel.kind === 'root' ? (
            <>
              {categories.map((category) => (
                <button
                  key={category.id || category.value}
                  type="button"
                  onClick={() => openCategoryLevel(category)}
                  className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 text-left active:bg-gray-50"
                >
                  <span className="text-[15px] font-medium text-gray-900">{category.label}</span>
                  <MenuChevron />
                </button>
              ))}
              <div className="mt-2 border-t border-gray-100">
                <p className="px-5 pt-5 pb-1 text-[11px] font-semibold tracking-[0.16em] uppercase text-gray-400">
                  Contacto
                </p>
                <a
                  href="https://wa.me/595973345284?text=Hola,%20estoy%20interesado%20en%20obtener%20información%20sobre%20insumos%20de%20tecnología."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 text-[15px] font-medium text-gray-900"
                >
                  <FaWhatsapp className="text-green-600 text-lg" />
                  WhatsApp
                </a>
                <a
                  href="tel:+595973345284"
                  className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 text-[15px] font-medium text-gray-900"
                >
                  <FaPhone className="text-[#002060] text-sm" />
                  Llamar
                </a>
              </div>
            </>
          ) : (
            rows.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={row.onSelect}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 text-left active:bg-gray-50"
              >
                <span className="min-w-0 pr-3">
                  <span className="block text-[15px] font-medium text-gray-900">{row.label}</span>
                  {row.hint ? (
                    <span className="block text-xs text-gray-500 mt-0.5">{row.hint}</span>
                  ) : null}
                </span>
                <MenuChevron />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ============ VERSIÓN DESKTOP (IGUAL QUE ANTES) ============
  return (
    <>
      {/* Overlay de fondo oscuro */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 z-[120]" 
        onClick={onClose}
        style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}
      />
      
      {/* Contenido del menú */}
      <div 
        ref={menuRef}
        className="desktop-menu-container fixed top-20 left-0 bottom-0 w-1/2 bg-gray-100 shadow-xl z-[130]"
        style={{position: 'fixed', top: '5rem', left: 0, bottom: 0, width: '50%'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full">
          {/* Panel de navegación izquierdo */}
          <div className="w-64 bg-gray-100 pt-4 border-r border-gray-200 overflow-y-auto h-full">
            <nav className="space-y-1 px-3">
              {/* Categorías principales */}
              <div className="mt-4">
                <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  CATEGORÍAS
                </h3>
                {categoriesLoading ? (
                  <div className="px-4 py-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Cargando categorías...</p>
                  </div>
                ) : categories.length === 0 && categoriesError ? (
                  <div className="px-4 py-8 text-center text-red-600">
                    <p className="text-sm">Error al cargar categorías</p>
                  </div>
                ) : (
                  categories.map((category, index) => (
                    <div
                      key={category.id}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between border-l-4 ${activeCategoryIndex === index 
                        ? 'border-l-blue-500 bg-blue-50/50 text-blue-800' 
                        : 'border-l-transparent text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => handleCategoryClick(index)}
                    >
                      <span className="font-medium">{category.label}</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))
                )}
              </div>
              
              {/* Contacto */}
              <div className="pt-3 mt-4 border-t border-gray-200">
                <a 
                  href="https://wa.me/595973345284?text=Hola,%20estoy%20interesado%20en%20obtener%20información%20sobre%20insumos%20de%20tecnología." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 mr-3 flex-shrink-0">
                    <FaWhatsapp className="text-blue-500 text-sm" />
                  </div>
                  <span className="font-medium">Contactar</span>
                </a>
                <a 
                  href="tel:+595973345284" 
                  className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 mr-3 flex-shrink-0">
                    <FaPhone className="text-blue-500 text-sm" />
                  </div>
                  <span className="font-medium">+595 973345284</span>
                </a>
              </div>
            </nav>
          </div>
          
          {/* Panel de subcategorías derecho */}
          <div className="flex-1 py-4 px-6 overflow-y-auto bg-white h-full">
            {activeCategoryIndex !== null && categories[activeCategoryIndex] ? (
              <>
                <h2 className="text-xl font-bold text-blue-800 mb-5 pb-2 border-b border-gray-200">
                  {categories[activeCategoryIndex]?.label}
                </h2>
                
                {loadingSubcategories ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600">Cargando subcategorías...</span>
                  </div>
                ) : usableVisaoTree(categories[activeCategoryIndex]?.visaoNavigationTree) ? (
                  <>
                    <SubcategoryTreePicker
                      tree={categories[activeCategoryIndex].visaoNavigationTree}
                      categoryValue={categories[activeCategoryIndex].value}
                      mode="navigate"
                      gridColsClass="grid grid-cols-2 gap-4"
                      previewBySubcategoryValue={desktopPreviewBySub}
                      onLeafNavigate={({ categoryValue, subcategoryValue }) =>
                        handleNavigateWithReload(categoriaProductoHref(categoryValue, subcategoryValue))
                      }
                    />
                    <div className="mt-8 flex justify-end">
                      <button
                        type="button"
                        className="py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavigateWithReload(
                            categoriaProductoHref(categories[activeCategoryIndex].value)
                          );
                        }}
                      >
                        Ver toda la colección
                      </button>
                    </div>
                  </>
                ) : activeSubcategories.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {activeSubcategories.map((subcategory) => (
                        <button
                          key={subcategory.id}
                          type="button"
                          className="group p-3 hover:bg-blue-50 transition-colors flex items-center w-full text-left"
                          onClick={(e) => {
                            e.preventDefault();
                            handleNavigateWithReload(
                              categoriaProductoHref(
                                categories[activeCategoryIndex].value,
                                subcategory.value
                              )
                            );
                          }}
                        >
                          <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full text-blue-600 group-hover:bg-blue-200 transition-colors flex-shrink-0 mr-3">
                            <BiCategoryAlt className="text-sm" />
                          </div>
                          <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors text-sm">
                            {leafLabelFromStoredLabel(subcategory.label)}
                          </span>
                        </button>
                      ))}
                    </div>
                    
                    <div className="mt-8 flex justify-end">
                      <button
                        type="button"
                        className="py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavigateWithReload(
                            categoriaProductoHref(categories[activeCategoryIndex].value)
                          );
                        }}
                      >
                        Ver toda la colección
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay subcategorías disponibles</p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="text-3xl font-bold text-blue-800 mb-4">Zenn</div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Tecnología a tu alcance</h2>
                <p className="text-gray-600 text-sm mb-4">
                  Selecciona una categoría para explorar nuestros productos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};


function MenuChevron() {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default MenuCategorias;