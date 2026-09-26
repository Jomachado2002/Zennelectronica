import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdClose } from 'react-icons/io';
import usePreloadedCategories from '../../hooks/usePreloadedCategories';
import {
  getSortedTreeChildEntries,
  getTreeNodeAtPath,
  hasTreeChildren,
  isTreeLeaf,
  leafLabelFromStoredLabel,
  usableVisaoTree
} from '../../helpers/visaoNavigationTree';
import { categoriaProductoHref } from '../../config/homeSlotRoutes';

const MobileSearchFilters = ({
  isOpen,
  onClose,
  priceRange = { min: '', max: '' },
  onPriceRangeChange,
}) => {
  const navigate = useNavigate();
  const { getCategories, getSubcategories } = usePreloadedCategories();
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories, setCategories] = useState([]);
  const [openSection, setOpenSection] = useState(null);
  const [drill, setDrill] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingCategories(true);
    try {
      setCategories(getCategories());
    } finally {
      setLoadingCategories(false);
    }
  }, [isOpen, getCategories]);

  useEffect(() => {
    if (!isOpen) {
      setOpenSection(null);
      setDrill(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const drilledCategory = drill
    ? categories.find((category) => category.value === drill.value) || null
    : null;

  const goTo = (categoryValue, subcategoryValue) => {
    onClose();
    navigate(categoriaProductoHref(categoryValue, subcategoryValue));
  };

  let options = [];
  if (drilledCategory && usableVisaoTree(drilledCategory.visaoNavigationTree)) {
    const node = getTreeNodeAtPath(drilledCategory.visaoNavigationTree, drill.pathKeys);
    options = getSortedTreeChildEntries(node?.children).map(({ key, node: child }) => {
      if (hasTreeChildren(child)) {
        return {
          key,
          label: child.label,
          kind: 'folder',
          onSelect: () => setDrill({ value: drilledCategory.value, pathKeys: [...drill.pathKeys, key] })
        };
      }
      if (isTreeLeaf(child)) {
        return {
          key,
          label: leafLabelFromStoredLabel(child.label),
          kind: 'leaf',
          onSelect: () => goTo(drilledCategory.value, child.subcategoryValue)
        };
      }
      return null;
    }).filter(Boolean);
  } else if (drilledCategory) {
    options = getSubcategories(drilledCategory.value).map((sub) => ({
      key: sub.value,
      label: leafLabelFromStoredLabel(sub.label),
      kind: 'leaf',
      onSelect: () => goTo(drilledCategory.value, sub.value)
    }));
  }

  const goBack = () => {
    if (!drill) return;
    if (drill.pathKeys.length > 0) {
      setDrill({ value: drill.value, pathKeys: drill.pathKeys.slice(0, -1) });
      return;
    }
    setDrill(null);
  };

  const priceActive = !!(priceRange.min || priceRange.max);

  return (
    <div className="fixed inset-0 z-[160] bg-white flex flex-col">
      <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-[15px] font-semibold text-gray-900">Filtrar por</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-gray-700"
          aria-label="Cerrar filtros"
        >
          <IoMdClose className="text-2xl" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <section className="border-b border-gray-200">
          <button
            type="button"
            onClick={() => setOpenSection((current) => (current === 'price' ? null : 'price'))}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
            aria-expanded={openSection === 'price'}
          >
            <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-neutral-900">
              Precio
              {priceActive ? (
                <span className="ml-2 normal-case tracking-normal text-[11px] font-medium text-[#00B5D8]">Activo</span>
              ) : null}
            </span>
            <span className="text-2xl font-light leading-none" aria-hidden>{openSection === 'price' ? '−' : '+'}</span>
          </button>
          {openSection === 'price' && (
            <div className="px-5 pb-4 space-y-3">
              <label className="block">
                <span className="block text-xs text-gray-500 mb-1">Mínimo</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={priceRange.min}
                  onChange={(e) => onPriceRangeChange({ ...priceRange, min: e.target.value })}
                  placeholder="0"
                  className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-500 mb-1">Máximo</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={priceRange.max}
                  onChange={(e) => onPriceRangeChange({ ...priceRange, max: e.target.value })}
                  placeholder="Sin límite"
                  className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm"
                />
              </label>
              {priceActive && (
                <button
                  type="button"
                  onClick={() => onPriceRangeChange({ min: '', max: '' })}
                  className="text-sm text-gray-500"
                >
                  Limpiar precio
                </button>
              )}
            </div>
          )}
        </section>

        <section className="border-b border-gray-200">
          <button
            type="button"
            onClick={() => setOpenSection((current) => (current === 'categories' ? null : 'categories'))}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
            aria-expanded={openSection === 'categories'}
          >
            <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-neutral-900">
              Categoría
            </span>
            <span className="text-2xl font-light leading-none" aria-hidden>{openSection === 'categories' ? '−' : '+'}</span>
          </button>
          {openSection === 'categories' && (
            <div className="px-5 pb-2">
              {loadingCategories ? (
                <p className="py-3 text-sm text-gray-500">Cargando categorías...</p>
              ) : !drilledCategory ? (
                categories.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setDrill({ value: category.value, pathKeys: [] })}
                    className="w-full flex items-center justify-between py-3 border-b border-gray-100 text-left text-sm text-gray-800"
                  >
                    {category.label}
                    <span className="text-gray-400" aria-hidden>›</span>
                  </button>
                ))
              ) : (
                <div>
                  <button type="button" onClick={goBack} className="py-2 text-sm font-medium text-[#002060]">
                    ← {drill.pathKeys.length > 0 ? 'Atrás' : 'Categorías'}
                  </button>
                  {drill.pathKeys.length === 0 && (
                    <button
                      type="button"
                      onClick={() => goTo(drilledCategory.value)}
                      className="w-full flex items-center justify-between py-3 border-b border-gray-100 text-left text-sm font-medium text-gray-900"
                    >
                      Todo {drilledCategory.label}
                      <span className="text-gray-400" aria-hidden>›</span>
                    </button>
                  )}
                  {options.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={option.onSelect}
                      className="w-full flex items-center justify-between py-3 border-b border-gray-100 text-left text-sm text-gray-800"
                    >
                      {option.label}
                      <span className="text-gray-400" aria-hidden>›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full h-12 bg-[#002060] text-white text-sm font-semibold tracking-[0.12em] uppercase"
        >
          Ver resultados
        </button>
      </div>
    </div>
  );
};

export default MobileSearchFilters;
