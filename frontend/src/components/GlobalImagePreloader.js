// frontend/src/components/GlobalImagePreloader.js
import { useEffect } from 'react';

/**
 * Solo calienta las primeras imágenes above-the-fold (LCP).
 * El precargador anterior pedía 400+ URLs con fetchPriority=high y
 * concurrencia 20: en móvil saturaba la red ~9s y retrasaba banner,
 * categorías y grillas visibles.
 */
const ABOVE_FOLD_LIMIT = 8;
const CONCURRENCY = 3;

const GlobalImagePreloader = ({ homeData, onPreloadComplete }) => {
  useEffect(() => {
    if (!homeData?.data) {
      onPreloadComplete?.();
      return;
    }

    let cancelled = false;
    const urls = [];
    const data = homeData.data;
    const slots = data.slots && typeof data.slots === 'object' ? Object.values(data.slots) : [];

    for (const slotArr of slots) {
      if (!Array.isArray(slotArr)) continue;
      for (const product of slotArr) {
        const url = product?.productImage?.[0];
        if (url && !urls.includes(url)) {
          urls.push(url);
          if (urls.length >= ABOVE_FOLD_LIMIT) break;
        }
      }
      if (urls.length >= ABOVE_FOLD_LIMIT) break;
    }

    if (urls.length === 0) {
      onPreloadComplete?.();
      return;
    }

    const loadOne = (url) =>
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        if ('fetchPriority' in img) img.fetchPriority = 'low';
        img.onload = img.onerror = () => resolve();
        img.src = url;
      });

    (async () => {
      for (let i = 0; i < urls.length; i += CONCURRENCY) {
        if (cancelled) return;
        await Promise.all(urls.slice(i, i + CONCURRENCY).map(loadOne));
      }
      if (!cancelled) onPreloadComplete?.();
    })();

    return () => {
      cancelled = true;
    };
  }, [homeData, onPreloadComplete]);

  return null;
};

export default GlobalImagePreloader;
