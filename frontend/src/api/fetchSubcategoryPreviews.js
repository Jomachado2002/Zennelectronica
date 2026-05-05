import SummaryApi from '../common';

/**
 * Clave estable para React Query según lista de subcategoryValue.
 */
export function subcategoryPreviewQueryKey(values) {
  const arr = [...new Set((values || []).map(String).filter(Boolean))].sort();
  return ['subcategory-preview-images', arr.join('\u0001')];
}

/**
 * GET /api/subcategory-preview-images — mapa subcategoryValue → URL primera imagen.
 */
export async function fetchSubcategoryPreviewMap(values) {
  if (!Array.isArray(values) || !values.length) return {};
  const qp = encodeURIComponent(values.join(','));
  const res = await fetch(
    `${SummaryApi.baseURL}/api/subcategory-preview-images?values=${qp}`,
    { credentials: 'include' }
  );
  const js = await res.json().catch(() => ({}));
  return js.success && js.data && typeof js.data === 'object' ? js.data : {};
}
