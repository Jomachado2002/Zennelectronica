import { fetchSubcategoryPreviewMap, subcategoryPreviewQueryKey } from './fetchSubcategoryPreviews';
import { collectLeafSubcategoryValues, usableVisaoTree } from '../helpers/visaoNavigationTree';

/** Valores de subcategoría usados por el carrusel del showcase (árbol Visão o lista plana). */
export function carouselSubcategoryValuesForCategory(cat) {
  if (!cat) return [];
  if (usableVisaoTree(cat.visaoNavigationTree)) {
    const leaves = collectLeafSubcategoryValues(cat.visaoNavigationTree);
    return [...new Set(leaves.map((l) => l.subcategoryValue).filter(Boolean))];
  }
  return (cat.subcategories || []).map((s) => s.value).filter(Boolean);
}

/**
 * Calienta la caché de previews antes de que el usuario llegue al bloque "Explora por Categorías".
 * @param {import('@tanstack/react-query').QueryClient} client
 * @param {object[]} categories - respuesta de `/api/admin/categories/menu/complete-structure`
 * @param {number} maxCategories - cuántas categorías precargar desde el inicio (orden del menú)
 */
export function prefetchCategoryShowcasePreviews(client, categories, maxCategories = 4) {
  if (!client || !Array.isArray(categories) || !categories.length) return;

  const slice = categories.slice(0, Math.max(0, maxCategories));
  for (const cat of slice) {
    const vals = carouselSubcategoryValuesForCategory(cat);
    if (!vals.length) continue;
    client.prefetchQuery({
      queryKey: subcategoryPreviewQueryKey(vals),
      queryFn: () => fetchSubcategoryPreviewMap(vals),
      staleTime: 10 * 60 * 1000,
    }).catch(() => {});
  }
}
