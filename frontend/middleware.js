/**
 * 1) 301 /producto/{ObjectId} → slug, para todos.
 * 2) Ficha y categoría: la persona y Google reciben el mismo HTML,
 *    con el producto escrito adentro. React lo reemplaza al cargar.
 * 3) El resto de las páginas públicas, solo para bots, sigue con título y canónico.
 *    Si algo falla, se deja pasar la página actual.
 */

import { applyHead, applyRenderedPage, planSeo } from './seoHead.mjs';
import { productSearchSnippet } from './src/utils/searchSnippet.js';

export const config = {
  matcher: [
    '/',
    '/buscar',
    '/producto/:path*',
    '/categoria-producto',
    '/promociones',
    '/nosotros',
    '/devoluciones',
    '/politica-de-devoluciones',
    '/garantia'
  ]
};

const MONGO_ID = /^[a-fA-F0-9]{24}$/;
const BOT =
  /googlebot|google-inspectiontool|storebot-google|adsbot-google|bingbot|duckduckbot|applebot|facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterestbot|embedly/i;

const BACKEND = (
  process.env.SEO_BACKEND_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  'https://zennelectronica.vercel.app'
).replace(/\/$/, '');

const productCache = new Map();
const CACHE_MS = 10 * 60 * 1000;

async function redirectMongoId(slugOrId) {
  const seoUrl = `${BACKEND}/api/seo/producto/${encodeURIComponent(slugOrId)}`;
  const seoRes = await fetch(seoUrl, {
    headers: { Accept: 'application/json' },
    redirect: 'manual'
  });
  if (seoRes.status >= 300 && seoRes.status < 400) {
    const loc = seoRes.headers.get('location');
    if (loc) return Response.redirect(loc, 301);
  }
  return null;
}

async function productHead(slug) {
  const hit = productCache.get(slug);
  if (hit && hit.exp > Date.now()) return hit.value;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 700);
  try {
    const res = await fetch(`${BACKEND}/api/producto-por-slug/${encodeURIComponent(slug)}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    const body = await res.json();
    const data = body && body.data;
    const name = data && String(data.productName || '').trim();
    if (!name) return null;
    if (body.redirectSlug && body.redirectSlug !== slug) {
      return { redirect: body.redirectSlug };
    }
    const snippet = productSearchSnippet(data);
    const available = data.stock == null || Number(data.stock) > 0;
    const reviewed = available ? String(data.seoDescription || '').replace(/\s+/g, ' ').trim() : '';
    const seoTitle = available ? String(data.seoTitle || '').replace(/\s+/g, ' ').trim() : '';
    const value = {
      title: seoTitle || snippet.title,
      description: reviewed.length >= 40 ? reviewed.slice(0, 160) : snippet.description
    };
    productCache.set(slug, { exp: Date.now() + CACHE_MS, value });
    if (productCache.size > 400) {
      const oldest = productCache.keys().next().value;
      productCache.delete(oldest);
    }
    return value;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function renderedPage(pathname) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1800);
  try {
    const res = await fetch(`${BACKEND}${pathname}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' }
    });
    if (res.status === 404) return { notFound: true };
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || !body.success) return null;
    return body;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function notFoundResponse(request) {
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'private, no-store',
    'Vercel-CDN-Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex'
  };
  try {
    const indexRes = await fetch(new URL('/index.html', request.url), {
      headers: { Accept: 'text/html' }
    });
    if (indexRes.ok) {
      return new Response(await indexRes.text(), { status: 404, headers });
    }
  } catch {
    // Si el shell no está, igual se responde 404 sin cachear.
  }
  return new Response('<!doctype html><title>Página no encontrada</title><p>Página no encontrada</p>', {
    status: 404,
    headers
  });
}

async function categoryHead(category, subcategory) {
  if (!category) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 700);
  try {
    const query = new URLSearchParams({ category, subcategory: subcategory || '' });
    const res = await fetch(`${BACKEND}/api/seo/categoria?${query}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    const body = await res.json();
    const data = body && body.data;
    if (!data || !data.seoTitle) return null;
    return {
      title: String(data.seoTitle),
      description: String(data.intro || '').slice(0, 160)
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function middleware(request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] === 'producto' && parts[1] && MONGO_ID.test(decodeURIComponent(parts[1]))) {
      const redirected = await redirectMongoId(decodeURIComponent(parts[1]));
      if (redirected) return redirected;
      return;
    }

    const plan = planSeo(url.pathname, url.search);
    if (!plan) return;

    // Landings categoría + ciudad/departamento (?envio=slug): title/H1 locales para Google.
    if (plan.kind === 'category' && plan.envio && plan.category) {
      try {
        const qs = new URLSearchParams({
          category: plan.category,
          subcategory: plan.subcategory || '',
          envio: plan.envio
        });
        const geoRes = await fetch(`${BACKEND}/api/seo/envio?${qs}`, {
          headers: { Accept: 'application/json' }
        });
        if (geoRes.ok) {
          const body = await geoRes.json();
          const hub = body && body.data && body.data.hub;
          const place = body && body.data && body.data.place;
          if (hub && place && hub.seoTitle) {
            const esc = (v) =>
              String(v || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            const geoPage = {
              title: hub.seoTitle,
              description: hub.seoDescription || plan.description,
              canonical: hub.canonicalUrl || plan.canonical,
              bodyHtml: [
                '<article>',
                `<h1>${esc(hub.h1 || hub.seoTitle)}</h1>`,
                `<p>Envío a ${esc(place.name)}. ${esc(hub.intro || hub.seoDescription || '')}</p>`,
                '</article>'
              ].join('')
            };
            const indexRes = await fetch(new URL('/index.html', request.url), {
              headers: { Accept: 'text/html' }
            });
            if (indexRes.ok) {
              const raw = await indexRes.text();
              const html = applyRenderedPage(raw, geoPage);
              if (html.includes('<h1') && html.includes('rel="canonical"')) {
                return new Response(html, {
                  status: 200,
                  headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600'
                  }
                });
              }
            }
          }
        }
      } catch {
        // Continúa con render de categoría normal.
      }
    }

    if (plan.kind === 'product' || plan.kind === 'category') {
      const renderPath =
        plan.kind === 'product'
          ? `/api/seo/render/producto/${encodeURIComponent(plan.slug)}`
          : `/api/seo/render/categoria?${new URL(plan.canonical).searchParams.toString()}`;
      const page = await renderedPage(renderPath);
      if (page?.notFound) return notFoundResponse(request);
      if (page?.redirect) return Response.redirect(page.redirect, 301);
      if (page?.bodyHtml && page.canonical) {
        const indexRes = await fetch(new URL('/index.html', request.url), {
          headers: { Accept: 'text/html' }
        });
        if (indexRes.ok) {
          const raw = await indexRes.text();
          const html = applyRenderedPage(raw, page);
          if (html.includes('<h1') && html.includes('id="root"') && html.includes('<link rel="canonical"')) {
            return new Response(html, {
              status: 200,
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600',
                'Vercel-CDN-Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600'
              }
            });
          }
        }
      }
    }

    // Landings de marca vía /buscar?q=Marca (solo si el índice SEO la marca indexable).
    if (plan.kind === 'brand_search' && plan.query) {
      try {
        const brandRes = await fetch(
          `${BACKEND}/api/seo/marca?q=${encodeURIComponent(plan.query)}`,
          { headers: { Accept: 'application/json' } }
        );
        if (brandRes.ok) {
          const body = await brandRes.json();
          const hub = body && body.data;
          if (hub && hub.indexable && hub.seoTitle) {
            const brandPage = {
              title: hub.seoTitle,
              description: hub.seoDescription || plan.description,
              canonical: hub.canonicalUrl || plan.canonical,
              bodyHtml: [
                '<article>',
                `<h1>${String(hub.h1 || hub.brandName || plan.query)
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')}</h1>`,
                hub.seoDescription
                  ? `<p>${String(hub.seoDescription)
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')}</p>`
                  : '',
                '</article>'
              ].join('')
            };
            const indexRes = await fetch(new URL('/index.html', request.url), {
              headers: { Accept: 'text/html' }
            });
            if (indexRes.ok) {
              const raw = await indexRes.text();
              const html = applyRenderedPage(raw, brandPage);
              if (html.includes('<h1') && html.includes('rel="canonical"')) {
                return new Response(html, {
                  status: 200,
                  headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600'
                  }
                });
              }
            }
          }
        }
      } catch {
        // Fallthrough: búsqueda genérica noindex vía SPA.
      }
    }

    // Home: H1 + canonical en HTML inicial para todos (Googlebot sin depender de JS).
    if (plan.kind === 'home' && plan.bodyHtml && plan.canonical) {
      const indexRes = await fetch(new URL('/index.html', request.url), {
        headers: { Accept: 'text/html' }
      });
      if (indexRes.ok) {
        const raw = await indexRes.text();
        const html = applyRenderedPage(raw, plan);
        if (html.includes('<h1') && html.includes('id="root"') && html.includes('<link rel="canonical"')) {
          return new Response(html, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=1800',
              'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800'
            }
          });
        }
      }
    }

    const ua = request.headers.get('user-agent') || '';
    if (!BOT.test(ua)) return;

    if (plan.kind === 'category') {
      const target = new URL(plan.canonical);
      const head = await categoryHead(target.searchParams.get('category') || '', target.searchParams.get('subcategory') || '');
      if (head) {
        plan.title = head.title;
        plan.description = head.description;
      }
    }

    if (plan.kind === 'product') {
      const head = await productHead(plan.slug);
      if (head?.redirect) {
        return Response.redirect(`https://www.zenn.com.py/producto/${head.redirect}`, 301);
      }
      if (head) {
        plan.title = head.title;
        plan.description = head.description;
      }
    }

    const indexRes = await fetch(new URL('/index.html', request.url), {
      headers: { Accept: 'text/html' }
    });
    if (!indexRes.ok) return;
    const raw = await indexRes.text();
    if (!raw.includes('id="root"')) return;
    const html = applyHead(raw, plan);
    if (!html.includes('<link rel="canonical"') || !html.includes('id="root"')) return;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store'
      }
    });
  } catch {
    return;
  }
}
