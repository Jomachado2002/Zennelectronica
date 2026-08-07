/** Dominio canónico único para SEO / OG / schema */
export const SITE_ORIGIN = 'https://www.zenn.com.py';

export function siteUrl(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${p}`;
}
