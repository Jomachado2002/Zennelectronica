import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usableVisaoTree, collectLeafSubcategoryValues } from '../helpers/visaoNavigationTree';
import {
  fetchSubcategoryPreviewMap,
  subcategoryPreviewQueryKey,
} from '../api/fetchSubcategoryPreviews';
import { cdnThumbUrl, warmImageUrls } from '../helpers/cdnImageUrl';

const PREVIEW_STALE_MS = 10 * 60 * 1000;

/**
 * Si el home ya trajo showcasePreviewsByCategory, sembramos la query
 * para que el carrusel pinte sin esperar otro round-trip.
 */
export function seedSubcategoryPreviewCache(queryClient, byCategory) {
  if (!queryClient || !byCategory || typeof byCategory !== 'object') return;

  Object.values(byCategory).forEach((map) => {
    if (!map || typeof map !== 'object') return;
    const values = Object.keys(map);
    if (!values.length) return;
    const key = subcategoryPreviewQueryKey(values);
    const existing = queryClient.getQueryData(key);
    if (existing && Object.keys(existing).length >= values.length) return;
    queryClient.setQueryData(key, { ...existing, ...map });
  });

  // Mapa plano global también (por si el queryKey usa otro subset)
  const flat = {};
  Object.values(byCategory).forEach((map) => {
    if (map && typeof map === 'object') Object.assign(flat, map);
  });
  if (Object.keys(flat).length) {
    queryClient.setQueryData(['subcategory-preview-images', '__home_flat__'], flat);
  }
}

function useWarmPreviewThumbs(map) {
  useEffect(() => {
    const urls = Object.values(map || {})
      .filter(Boolean)
      .map((u) => cdnThumbUrl(u, { width: 384, quality: 70 }));
    warmImageUrls(urls, 10);
  }, [map]);
}

/**
 * subcategoryValue → URL de la primera imagen de producto (React Query + prefetched desde el menú).
 * @param {object} initialMap - mapa ya conocido (p.ej. del payload home)
 */
export function useSubcategoryPreviewMap(visaoTree, enabled = true, initialMap = {}) {
  const values = useMemo(() => {
    if (!enabled || !usableVisaoTree(visaoTree)) return [];
    const leaves = collectLeafSubcategoryValues(visaoTree);
    return [...new Set(leaves.map((l) => l.subcategoryValue).filter(Boolean))];
  }, [visaoTree, enabled]);

  const placeholder = useMemo(() => {
    if (!values.length || !initialMap) return undefined;
    const hit = {};
    values.forEach((v) => {
      if (initialMap[v]) hit[v] = initialMap[v];
    });
    return Object.keys(hit).length ? hit : undefined;
  }, [values, initialMap]);

  const { data } = useQuery({
    queryKey: subcategoryPreviewQueryKey(values),
    queryFn: () => fetchSubcategoryPreviewMap(values),
    enabled: enabled && values.length > 0,
    staleTime: PREVIEW_STALE_MS,
    initialData: placeholder,
    placeholderData: placeholder,
  });

  const map = data ?? placeholder ?? {};
  useWarmPreviewThumbs(map);
  return map;
}

/**
 * Mismo endpoint con lista explícita de valores (menú sin árbol Visão).
 */
export function useSubcategoryPreviewMapFromValues(values, enabled = true, initialMap = {}) {
  const uniqSorted = [...new Set((values || []).map(String).filter(Boolean))].sort();

  const placeholder = useMemo(() => {
    if (!uniqSorted.length || !initialMap) return undefined;
    const hit = {};
    uniqSorted.forEach((v) => {
      if (initialMap[v]) hit[v] = initialMap[v];
    });
    return Object.keys(hit).length ? hit : undefined;
  }, [uniqSorted, initialMap]);

  const { data } = useQuery({
    queryKey: subcategoryPreviewQueryKey(uniqSorted),
    queryFn: () => fetchSubcategoryPreviewMap(uniqSorted),
    enabled: enabled && uniqSorted.length > 0,
    staleTime: PREVIEW_STALE_MS,
    initialData: placeholder,
    placeholderData: placeholder,
  });

  const map = data ?? placeholder ?? {};
  useWarmPreviewThumbs(map);
  return map;
}

export function useHomeShowcasePreviewFlat(byCategory) {
  return useMemo(() => {
    const flat = {};
    if (!byCategory || typeof byCategory !== 'object') return flat;
    Object.values(byCategory).forEach((map) => {
      if (map && typeof map === 'object') Object.assign(flat, map);
    });
    return flat;
  }, [byCategory]);
}

export function useSeedHomeShowcasePreviews(byCategory) {
  const queryClient = useQueryClient();
  useEffect(() => {
    seedSubcategoryPreviewCache(queryClient, byCategory);
  }, [queryClient, byCategory]);
}
