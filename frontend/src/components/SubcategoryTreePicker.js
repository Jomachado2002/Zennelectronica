import React, { useEffect, useMemo, useState } from 'react';
import { BiCategoryAlt } from 'react-icons/bi';
import FilterCheckbox from './filters/FilterCheckbox';
import {
  breadcrumbLabelsForPath,
  getSortedTreeChildEntries,
  getTreeNodeAtPath,
  hasTreeChildren,
  isTreeLeaf,
  usableVisaoTree
} from '../helpers/visaoNavigationTree';

/**
 * Navegación en árbol (espejo Visão) con grillas: carpetas abren un nivel; hojas filtran o navegan.
 *
 * @param {'filter'|'navigate'} mode
 */
const SubcategoryTreePicker = ({
  tree,
  categoryValue,
  mode = 'filter',
  selectedSubcategoryValues = [],
  onToggleSubcategory,
  onLeafNavigate,
  gridColsClass = 'grid grid-cols-2 gap-2',
  itemClassName = '',
  previewBySubcategoryValue = {}
}) => {
  const [pathKeys, setPathKeys] = useState([]);

  useEffect(() => {
    setPathKeys([]);
  }, [tree, categoryValue]);

  const currentNode = useMemo(() => {
    if (!usableVisaoTree(tree)) return null;
    if (!pathKeys.length) return tree;
    return getTreeNodeAtPath(tree, pathKeys);
  }, [tree, pathKeys]);

  const childEntries = useMemo(() => {
    if (!currentNode) return [];
    return getSortedTreeChildEntries(currentNode.children);
  }, [currentNode]);

  const crumbs = useMemo(() => breadcrumbLabelsForPath(tree, pathKeys), [tree, pathKeys]);

  if (!usableVisaoTree(tree) || !currentNode) return null;

  const goBack = () => setPathKeys((p) => p.slice(0, -1));

  return (
    <div className={`space-y-2 ${itemClassName}`}>
      {pathKeys.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
          <button type="button" onClick={goBack} className="text-blue-600 font-medium shrink-0">
            ← Atrás
          </button>
          <span className="truncate" title={crumbs.join(' › ')}>
            {crumbs.join(' › ')}
          </span>
        </div>
      )}

      <div className={gridColsClass}>
        {childEntries.map(({ key, node }) => {
          const folder = hasTreeChildren(node);
          const leaf = isTreeLeaf(node);

          if (folder) {
            return (
              <button
                key={key}
                type="button"
                className="group flex items-center gap-2 p-2 rounded-md border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 text-left min-h-[44px]"
                onClick={() => setPathKeys((p) => [...p, key])}
              >
                <span className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full text-blue-600 group-hover:bg-blue-200 shrink-0">
                  <BiCategoryAlt className="text-sm" />
                </span>
                <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700 leading-tight">
                  {node.label}
                </span>
              </button>
            );
          }

          if (leaf && mode === 'filter') {
            return (
              <div key={key} className="min-h-[40px] flex items-start">
                <FilterCheckbox
                  label={node.label}
                  checked={selectedSubcategoryValues.includes(node.subcategoryValue)}
                  onChange={() => onToggleSubcategory && onToggleSubcategory(node.subcategoryValue)}
                />
              </div>
            );
          }

          if (leaf && mode === 'navigate') {
            const previewUrl =
              previewBySubcategoryValue && node.subcategoryValue
                ? previewBySubcategoryValue[node.subcategoryValue]
                : null;
            const staticSubImg = node.subcategoryValue
              ? `/images/subcategories/${encodeURIComponent(node.subcategoryValue)}.jpg`
              : '';
            const initialImgSrc = previewUrl || staticSubImg;
            return (
              <button
                key={key}
                type="button"
                className="group flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white text-left shadow-sm transition-all hover:border-cyan-300/80 hover:shadow-md hover:-translate-y-0.5 min-h-0"
                onClick={() =>
                  onLeafNavigate &&
                  onLeafNavigate({
                    categoryValue,
                    subcategoryValue: node.subcategoryValue,
                    label: node.label
                  })
                }
              >
                <div className="relative h-28 w-full bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                  {initialImgSrc ? (
                    <img
                      src={initialImgSrc}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        const t = e.currentTarget;
                        const def = '/images/subcategories/default.jpg';
                        const a = Number(t.dataset.fb || 0) + 1;
                        t.dataset.fb = String(a);
                        if (previewUrl) {
                          if (a === 1) {
                            t.src = staticSubImg || def;
                            return;
                          }
                          if (a === 2 && staticSubImg) {
                            t.src = def;
                            return;
                          }
                        } else if (staticSubImg) {
                          if (a === 1) {
                            t.src = def;
                            return;
                          }
                        }
                        t.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-blue-500/90">
                      <BiCategoryAlt className="text-3xl" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-80" />
                </div>
                <div className="flex items-start gap-2 p-2.5">
                  <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 leading-snug line-clamp-2">
                    {node.label}
                  </span>
                </div>
              </button>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default SubcategoryTreePicker;
