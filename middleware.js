/**
 * /producto/{ObjectId} → 301 a /producto/{slug} (bots y usuarios).
 * Bots (Google, etc.) reciben HTML con producto real.
 * Usuarios en URL canónica siguen al SPA de React.
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

    if (!isId && !isBot) {
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

    if (!isBot) {
      return;
    }

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
    return;
  }
}
