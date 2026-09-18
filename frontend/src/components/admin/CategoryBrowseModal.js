import React, { useEffect, useMemo, useState } from 'react';
import { BiCategoryAlt } from 'react-icons/bi';
import { IoMdClose } from 'react-icons/io';
import usePreloadedCategories from '../../hooks/usePreloadedCategories';
import SubcategoryTreePicker from '../SubcategoryTreePicker';
import {
  leafLabelFromStoredLabel,
  usableVisaoTree
} from '../../helpers/visaoNavigationTree';

const CategoryBrowseModal = ({ isOpen, onClose, onSelect }) => {
  const { data: menuFromApi, loading, error } = usePreloadedCategories();
  const [activeIndex, setActiveIndex] = useState(0);

  const categories = useMemo(() => {
    if (!menuFromApi || menuFromApi.length === 0) return [];
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
  }, [menuFromApi]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && categories.length && activeIndex >= categories.length) {
      setActiveIndex(0);
    }
  }, [isOpen, categories, activeIndex]);

  if (!isOpen) return null;

  const active = categories[activeIndex] || null;
  const hasTree = usableVisaoTree(active?.visaoNavigationTree);

  const pick = (category, subcategory, subcategoryLabel) => {
    onSelect?.({
      category: category.value,
      subcategory: subcategory || '',
      categoryLabel: category.label,
      subcategoryLabel: subcategoryLabel || ''
    });
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative flex h-[min(90vh,720px)] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex w-full min-h-0">
          <aside className="w-[42%] max-w-[280px] shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-gray-50 px-3 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Categorías
              </h3>
              <button
                type="button"
                className="rounded p-1 text-gray-500 hover:bg-gray-200 md:hidden"
                onClick={onClose}
                aria-label="Cerrar"
              >
                <IoMdClose className="h-5 w-5" />
              </button>
            </div>
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Cargando menú…</p>
            ) : error ? (
              <p className="px-4 py-8 text-center text-sm text-red-600">No se pudieron cargar las categorías</p>
            ) : (
              categories.map((category, index) => (
                <button
                  key={category.id || category.value}
                  type="button"
                  className={`flex w-full items-center justify-between border-l-4 px-4 py-3 text-left text-sm font-medium ${
                    activeIndex === index
                      ? 'border-l-blue-500 bg-blue-50 text-blue-800'
                      : 'border-l-transparent text-gray-700 hover:bg-white'
                  }`}
                  onClick={() => setActiveIndex(index)}
                >
                  <span>{category.label}</span>
                  <span aria-hidden="true">›</span>
                </button>
              ))
            )}
          </aside>

          <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-lg font-bold text-blue-800">
                  {active?.label || 'Elegí una categoría'}
                </h2>
                <p className="text-xs text-gray-500">
                  Filtrá por subcategoría, igual que en el menú. No se cargan todos los productos.
                </p>
              </div>
              <button
                type="button"
                className="hidden rounded p-1 text-gray-500 hover:bg-gray-100 md:block"
                onClick={onClose}
                aria-label="Cerrar"
              >
                <IoMdClose className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!active ? (
                <p className="py-12 text-center text-sm text-gray-500">Seleccioná una categoría a la izquierda</p>
              ) : hasTree ? (
                <SubcategoryTreePicker
                  tree={active.visaoNavigationTree}
                  categoryValue={active.value}
                  mode="navigate"
                  gridColsClass="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  onLeafNavigate={({ subcategoryValue, label }) =>
                    pick(active, subcategoryValue, label)
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(active.subcategories || []).map((sub) => (
                    <button
                      key={sub.id || sub.value}
                      type="button"
                      className="group flex items-center rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-blue-200 hover:bg-blue-50"
                      onClick={() => pick(active, sub.value, leafLabelFromStoredLabel(sub.label))}
                    >
                      <span className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <BiCategoryAlt />
                      </span>
                      <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700">
                        {leafLabelFromStoredLabel(sub.label)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {active && (
              <div className="border-t px-4 py-3">
                <button
                  type="button"
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  onClick={() => pick(active, '', '')}
                >
                  Ver toda {active.label}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default CategoryBrowseModal;
