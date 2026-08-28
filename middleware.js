/**
 * Solo 301 /producto/{ObjectId} → slug para usuarios.
 * Los bots no se resuelven acá: vercel.json los reescribe a /api/seo y el CDN cachea.
 * Un fetch desde Edge Middleware al backend esquiva el CDN y cobra Fluid CPU en cada crawl.
 */

export const config = {
  matcher: ['/producto/:path*'],
};

const BOT_UA =
  /googlebot|google-inspectiontool|bingbot|yandex|baiduspider|twitterbot|facebookexternalhit|linkedinbot|embedly|pinterest|slackbot|vkshare|whatsapp|telegrambot|duckduckbot|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|storebot-google|adsbot-google|apis-google|mediapartners-google/i;

const MONGO_ID = /^[a-fA-F0-9]{24}$/;

const BACKEND =
  process.env.SEO_BACKEND_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  'https://zennelectronica.vercel.app';

export default async function middleware(request) {
  try {
    const ua = request.headers.get('user-agent') || '';
    const { pathname } = new URL(request.url);
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] !== 'producto' || !parts[1]) {
      return;
    }

    const slugOrId = decodeURIComponent(parts[1]);
    const isId = MONGO_ID.test(slugOrId);
    const isBot = BOT_UA.test(ua);

    // Bots: rewrite + CDN. Usuarios en URL canónica: SPA.
    if (isBot || !isId) {
      return;
    }

    const seoUrl = `${BACKEND.replace(/\/$/, '')}/api/seo/producto/${encodeURIComponent(slugOrId)}`;
    const seoRes = await fetch(seoUrl, {
      headers: {
        Accept: 'text/html',
        'User-Agent': ua,
      },
      redirect: 'manual',
    });

    if (seoRes.status >= 300 && seoRes.status < 400) {
      const loc = seoRes.headers.get('location');
      if (loc) {
        return Response.redirect(loc, 301);
      }
    }
  } catch {
    return;
  }
}
