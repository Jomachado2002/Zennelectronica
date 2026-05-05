import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usableVisaoTree, collectLeafSubcategoryValues } from '../helpers/visaoNavigationTree';
import {
  fetchSubcategoryPreviewMap,
  subcategoryPreviewQueryKey,
} from '../api/fetchSubcategoryPreviews';

const PREVIEW_STALE_MS = 10 * 60 * 1000;

/**
 * subcategoryValue → URL de la primera imagen de producto (React Query + prefetched desde el menú).
 */
export function useSubcategoryPreviewMap(visaoTree, enabled = true) {
  const values = useMemo(() => {
    if (!enabled || !usableVisaoTree(visaoTree)) return [];
    const leaves = collectLeafSubcategoryValues(visaoTree);
    return [...new Set(leaves.map((l) => l.subcategoryValue).filter(Boolean))];
  }, [visaoTree, enabled]);

  const { data } = useQuery({
    queryKey: subcategoryPreviewQueryKey(values),
    queryFn: () => fetchSubcategoryPreviewMap(values),
    enabled: enabled && values.length > 0,
    staleTime: PREVIEW_STALE_MS,
  });

  return data ?? {};
}

/**
 * Mismo endpoint con lista explícita de valores (menú sin árbol Visão).
 * `queryKey` depende solo del contenido, no del `values` por referencia.
 */
export function useSubcategoryPreviewMapFromValues(values, enabled = true) {
  const uniqSorted = [...new Set((values || []).map(String).filter(Boolean))].sort();

  const { data } = useQuery({
    queryKey: subcategoryPreviewQueryKey(uniqSorted),
    queryFn: () => fetchSubcategoryPreviewMap(uniqSorted),
    enabled: enabled && uniqSorted.length > 0,
    staleTime: PREVIEW_STALE_MS,
  });

  return data ?? {};
}
