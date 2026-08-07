/**
 * Bots (Google, etc.) reciben HTML con producto real.
 * Usuarios normales siguen al SPA de React.
 *
 * Requiere deploy del frontend en Vercel con este archivo en la raíz del proyecto.
 * @see https://vercel.com/docs/routing-middleware
 */

export const config = {
  matcher: ['/producto/:path*'],
};

const BOT_UA =
  /googlebot|google-inspectiontool|bingbot|yandex|baiduspider|twitterbot|facebookexternalhit|linkedinbot|embedly|pinterest|slackbot|vkshare|whatsapp|telegrambot|duckduckbot|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|storebot-google|adsbot-google|apis-google|mediapartners-google/i;

const BACKEND =
  process.env.SEO_BACKEND_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  'https://zennelectronica.vercel.app';

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) {
    return; // SPA
  }

  try {
    const { pathname } = new URL(request.url);
    const parts = pathname.split('/').filter(Boolean);
    // /producto/:slug
    if (parts[0] !== 'producto' || !parts[1]) {
      return;
    }
    const slugOrId = decodeURIComponent(parts[1]);
    const seoUrl = `${BACKEND.replace(/\/$/, '')}/api/seo/producto/${encodeURIComponent(slugOrId)}`;

    const seoRes = await fetch(seoUrl, {
      headers: {
        Accept: 'text/html',
        'User-Agent': ua,
      },
    });

    if (!seoRes.ok) {
      return;
    }

    const html = await seoRes.text();
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
        'X-Robots-Tag': 'index, follow',
        'X-Zenn-Seo': 'bot-html',
      },
    });
  } catch {
    return; // fallback SPA
  }
}
