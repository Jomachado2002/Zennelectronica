/**
 * Thumbs vía Cloudflare Image Resizing en cdn.zenn.com.py.
 *
 * IMPORTANTE: hoy /cdn-cgi/image/... en cdn.zenn.com.py responde 404
 * (Image Resizing no activo en ese host). Si forzamos thumbs, el browser
 * falla y recién en onError pide la URL full → ~2 round-trips por imagen
 * y sensación de 5–6s en el home.
 *
 * Activar solo cuando CF Image Resizing esté habilitado:
 *   REACT_APP_CF_IMAGE_RESIZING=true
 */
const CDN_HOST = 'cdn.zenn.com.py';

const CF_RESIZE_ENABLED =
  typeof process !== 'undefined' &&
  String(process.env.REACT_APP_CF_IMAGE_RESIZING || '').toLowerCase() === 'true';

export function isCdnZennUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    return new URL(url).hostname.includes(CDN_HOST);
  } catch {
    return url.includes(CDN_HOST);
  }
}

/**
 * @param {string} url
 * @param {{ width?: number, quality?: number, fit?: string }} opts
 * @returns {string}
 */
export function cdnThumbUrl(url, opts = {}) {
  if (!url || typeof url !== 'string') return url;
  if (!CF_RESIZE_ENABLED) return url;

  const width = opts.width || 360;
  const quality = opts.quality || 70;
  const fit = opts.fit || 'cover';

  try {
    const u = new URL(url);
    if (!u.hostname.includes(CDN_HOST)) return url;
    if (u.pathname.includes('/cdn-cgi/image/')) return url;

    const path = u.pathname.replace(/^\//, '');
    if (!path) return url;

    return `https://${CDN_HOST}/cdn-cgi/image/width=${width},quality=${quality},fit=${fit},format=auto/${path}${u.search || ''}`;
  } catch {
    return url;
  }
}

/** Preload en background (no bloquea render). */
export function warmImageUrls(urls, limit = 8) {
  if (typeof window === 'undefined' || !Array.isArray(urls)) return;
  urls.slice(0, limit).forEach((src) => {
    if (!src) return;
    const img = new Image();
    if ('fetchPriority' in img) img.fetchPriority = 'low';
    img.decoding = 'async';
    img.src = src;
  });
}
