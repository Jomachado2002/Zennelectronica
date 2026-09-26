// hooks/useProducts.js - Home: cache local + fetch rápido
import { useQuery } from '@tanstack/react-query';
import SummaryApi from '../common';

const HOME_LS_KEY = 'zenn_home_payload_v8';
const HOME_LS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días en el dispositivo
const HOME_CDN_URL = 'https://cdn.zenn.com.py/cache/home.json';

async function readHomeJson(response) {
  if (!response.ok) return null;
  const result = await response.json();
  if (result?.data?.slots && typeof result.data.slots === 'object') {
    return { success: true, data: result.data };
  }
  if (result?.slots && typeof result.slots === 'object') {
    return { success: true, data: result };
  }
  return null;
}

function readHomeLocalCache() {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(HOME_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || !parsed?.data?.slots) return null;
    if (Date.now() - parsed.savedAt > HOME_LS_MAX_AGE_MS) return null;
    return { success: true, data: parsed.data, _fromLocal: true, _savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function writeHomeLocalCache(data) {
  try {
    if (typeof window === 'undefined' || !data?.slots) return;
    localStorage.setItem(
      HOME_LS_KEY,
      JSON.stringify({ savedAt: Date.now(), data })
    );
  } catch {
    // quota / private mode
  }
}

export function clearHomeLocalCache() {
  try {
    localStorage.removeItem(HOME_LS_KEY);
  } catch {
    /* ignore */
  }
}

export const useHomeProducts = () => {
  const local = typeof window !== 'undefined' ? readHomeLocalCache() : null;

  return useQuery({
    queryKey: ['category-products', 'home', 'slots-v8-fast'],
    queryFn: async () => {
      try {
        const fromCdn = await readHomeJson(await fetch(HOME_CDN_URL, {
          credentials: 'omit',
          cache: 'default',
          headers: { Accept: 'application/json' }
        }));
        if (fromCdn) {
          writeHomeLocalCache(fromCdn.data);
          return fromCdn;
        }
      } catch {
        // Si el CDN no responde, sigue el API.
      }

      const response = await fetch(SummaryApi.baseURL + '/api/obtener-productos', {
        method: SummaryApi.allProduct.method,
        credentials: 'omit',
        cache: 'default',
        headers: { Accept: 'application/json' }
      });
      const fromApi = await readHomeJson(response);
      if (!fromApi) {
        throw new Error('Error al cargar productos');
      }
      writeHomeLocalCache(fromApi.data);
      return fromApi;
    },
    // Pinta al instante con lo último visto; refresca en background
    initialData: local || undefined,
    initialDataUpdatedAt: local?._savedAt || undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    placeholderData: (prev) => prev
  });
};
