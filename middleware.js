/**
 * Solo 301 /producto/{ObjectId} → slug.
 * Todos (usuario y Google) siguen viendo el mismo SPA.
 */

export const config = {
  matcher: ['/producto/:path*'],
};

const MONGO_ID = /^[a-fA-F0-9]{24}$/;

const BACKEND =
  process.env.SEO_BACKEND_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  'https://zennelectronica.vercel.app';

export default async function middleware(request) {
  try {
    const { pathname } = new URL(request.url);
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] !== 'producto' || !parts[1]) {
      return;
    }

    const slugOrId = decodeURIComponent(parts[1]);
    if (!MONGO_ID.test(slugOrId)) {
      return;
    }

    const seoUrl = `${BACKEND.replace(/\/$/, '')}/api/seo/producto/${encodeURIComponent(slugOrId)}`;
    const seoRes = await fetch(seoUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': request.headers.get('user-agent') || '',
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
