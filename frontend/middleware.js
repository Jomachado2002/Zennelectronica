/**
 * 1) 301 /producto/{ObjectId} → slug, para todos.
 * 2) Google y los previews de redes reciben título y canónico de ESA url.
 *    Quien entra a comprar sigue recibiendo el mismo HTML de siempre.
 *    Si algo falla, se deja pasar la página actual.
 */

import { applyHead, planSeo } from './seoHead.mjs';

export const config = {
  matcher: [
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
    const description = String(data.description || 'Descubre este producto en Zenn')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    const value = { title: `${name} | Zenn`, description };
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

export default async function middleware(request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] === 'producto' && parts[1] && MONGO_ID.test(decodeURIComponent(parts[1]))) {
      const redirected = await redirectMongoId(decodeURIComponent(parts[1]));
      if (redirected) return redirected;
      return;
    }

    const ua = request.headers.get('user-agent') || '';
    if (!BOT.test(ua)) return;

    const plan = planSeo(url.pathname, url.search);
    if (!plan) return;

    if (plan.kind === 'product') {
      const head = await productHead(plan.slug);
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
