'use strict';

/**
 * HTML de ficha rápido para bots Y para clientes (móvil/desktop).
 * El SPA de React queda en /producto/:slug?spa=1 (zoom, relacionados).
 *
 * Si la URL es /producto/{ObjectId} y el producto tiene slug → 301 canónico.
 */

const mongoose = require('mongoose');
const productModel = require('../../models/productModel');
const { attachBrandLogo } = require('../../services/brandLogoService');
const { SITE } = require('./sitemapController');
const {
  isMongoObjectId,
  humanizeTaxonomy,
  offerShippingAndReturns
} = require('../../helpers/productStructuredData');

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteUrl(maybeUrl) {
  if (!maybeUrl || typeof maybeUrl !== 'string') return '';
  if (maybeUrl.startsWith('http://') || maybeUrl.startsWith('https://')) return maybeUrl;
  if (maybeUrl.startsWith('//')) return `https:${maybeUrl}`;
  return `${SITE}${maybeUrl.startsWith('/') ? '' : '/'}${maybeUrl}`;
}

function oneYearFromNow() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function clip(text, max) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max).trim() : s;
}

function jsonForScript(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function gs(n) {
  const v = Number(n) || 0;
  return `Gs. ${v.toLocaleString('es-PY')}`;
}

const WA_E164 = '595973345284';

async function findProduct(slugOrId) {
  const key = String(slugOrId || '').trim();
  if (!key) return null;

  let product = await productModel.findOne({ slug: key }).lean();
  if (!product && mongoose.Types.ObjectId.isValid(key) && String(new mongoose.Types.ObjectId(key)) === key) {
    product = await productModel.findById(key).lean();
  }
  if (!product) return null;
  return attachBrandLogo(product);
}

function buildProductHtml(product) {
  const pathId = product.slug || String(product._id);
  const pageUrl = `${SITE}/producto/${pathId}`;
  const spaUrl = `${pageUrl}?spa=1`;
  const name = clip(product.productName || 'Producto', 150) || 'Producto';
  const brand = clip(product.brandName, 70) || 'Zenn';
  const descRaw = (product.description || '')
    .replace(/\s+/g, ' ')
    .trim();
  const desc =
    clip(
      `${name} en Zenn Paraguay. Precio en guaraníes, stock real, garantía y envío 24-48 h en Asunción.`,
      160
    ) || clip(descRaw, 160);
  const images = Array.isArray(product.productImage)
    ? product.productImage.filter(Boolean).map(absoluteUrl)
    : [];
  const image = images[0] || `${SITE}/logo.png`;
  const price = Number(product.sellingPrice) || 0;
  const listPrice = Number(product.price) || 0;
  const inStock =
    product.stock === undefined || product.stock === null || Number(product.stock) > 0;
  const category = product.category || '';
  const subcategory = product.subcategory || '';
  const categoryLabel = humanizeTaxonomy(category);
  const subcategoryLabel = humanizeTaxonomy(subcategory);
  const sku = String(product.codigo || '').trim();
  const extras = offerShippingAndReturns(pageUrl);
  const waText = encodeURIComponent(
    `Hola, estoy interesado en: *${name}*\n${pageUrl}\n¿Hay stock y cómo es el envío?`
  );
  const waHref = `https://wa.me/${WA_E164}?text=${waText}`;
  const cartProduct = {
    _id: String(product._id || ''),
    productName: name,
    sellingPrice: price,
    price: listPrice,
    productImage: images.slice(0, 4),
    slug: product.slug || '',
    stock: product.stock,
    brandName: brand,
    category,
    subcategory,
    codigo: sku
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    image: images.length ? images : [image],
    description: (descRaw || desc).slice(0, 5000),
    brand: {
      '@type': 'Brand',
      name: brand,
      ...(product.brandLogoUrl ? { logo: absoluteUrl(product.brandLogoUrl) } : {})
    }
  };

  if (sku) {
    jsonLd.sku = sku;
    jsonLd.mpn = sku;
  }
  if (subcategoryLabel || categoryLabel) {
    jsonLd.category = subcategoryLabel || categoryLabel;
  }

  if (price > 0) {
    jsonLd.offers = {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'PYG',
      price,
      priceValidUntil: oneYearFromNow(),
      validFrom: extras.validFrom,
      itemCondition: 'https://schema.org/NewCondition',
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Zenn' },
      shippingDetails: extras.shippingDetails,
      hasMerchantReturnPolicy: extras.hasMerchantReturnPolicy
    };
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE },
      category
        ? {
            '@type': 'ListItem',
            position: 2,
            name: categoryLabel || category,
            item: `${SITE}/categoria-producto?category=${encodeURIComponent(category)}`
          }
        : null,
      subcategory
        ? {
            '@type': 'ListItem',
            position: 3,
            name: subcategoryLabel || subcategory,
            item: `${SITE}/categoria-producto?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(subcategory)}`
          }
        : null,
      {
        '@type': 'ListItem',
        position: 4,
        name,
        item: pageUrl
      }
    ].filter(Boolean)
  };

  const priceBlock =
    listPrice > 0 && listPrice > price
      ? `<span class="old">${gs(listPrice)}</span> <strong class="now">${gs(price)}</strong>`
      : `<strong class="now">${gs(price)}</strong>`;

  const thumbs = images
    .slice(1, 5)
    .map(
      (src) =>
        `<img src="${escapeHtml(src)}" alt="" width="72" height="72" loading="lazy" decoding="async"/>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(name)} | Zenn Paraguay</title>
  <meta name="description" content="${escapeHtml(desc)}"/>
  <link rel="canonical" href="${escapeHtml(pageUrl)}"/>
  <meta name="robots" content="index, follow, max-image-preview:large"/>
  <meta property="og:type" content="product"/>
  <meta property="og:site_name" content="Zenn"/>
  <meta property="og:locale" content="es_PY"/>
  <meta property="og:title" content="${escapeHtml(name)}"/>
  <meta property="og:description" content="${escapeHtml(desc)}"/>
  <meta property="og:url" content="${escapeHtml(pageUrl)}"/>
  <meta property="og:image" content="${escapeHtml(image)}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escapeHtml(name)}"/>
  <meta name="twitter:description" content="${escapeHtml(desc)}"/>
  <meta name="twitter:image" content="${escapeHtml(image)}"/>
  <meta property="product:price:amount" content="${price}"/>
  <meta property="product:price:currency" content="PYG"/>
  <link rel="preconnect" href="https://cdn.zenn.com.py" crossorigin/>
  ${image ? `<link rel="preload" as="image" href="${escapeHtml(image)}" fetchpriority="high"/>` : ''}
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  <style>
    :root{--c:#7B2CBF;--g:#00B5D8}
    *{box-sizing:border-box}
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;background:#fff;line-height:1.45}
    header{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #eee;position:sticky;top:0;background:#fff;z-index:2}
    header a{color:#111;text-decoration:none;font-weight:700}
    header .cart{font-size:14px;color:#333}
    main{padding:12px 16px 108px;max-width:720px;margin:0 auto}
    .hero{width:100%;aspect-ratio:1;object-fit:contain;background:#f6f6f6;border-radius:12px}
    .thumbs{display:flex;gap:8px;margin:10px 0;overflow-x:auto}
    .thumbs img{width:72px;height:72px;object-fit:contain;background:#f6f6f6;border-radius:8px;flex:0 0 auto}
    h1{font-size:1.15rem;margin:8px 0 4px}
    .brand{color:#666;font-size:.9rem;margin:0}
    .price{margin:10px 0}
    .old{color:#888;text-decoration:line-through;margin-right:8px}
    .now{font-size:1.35rem;color:var(--c)}
    .ok{color:#15803d;font-weight:600;font-size:.9rem}
    .no{color:#b91c1c;font-weight:600;font-size:.9rem}
    .ship{font-size:.9rem;color:#444;margin:8px 0 16px}
    .desc{font-size:.95rem;color:#333;white-space:pre-wrap}
    .bar{position:fixed;left:0;right:0;bottom:0;display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #eee;z-index:3}
    .bar a,.bar button{flex:1;text-align:center;padding:12px 8px;border-radius:10px;font-weight:700;font-size:.95rem;border:0;text-decoration:none;cursor:pointer}
    .wa{background:#25D366;color:#fff}
    .buy{background:linear-gradient(135deg,var(--g),var(--c));color:#fff}
    .buy:disabled{opacity:.5}
    .note{font-size:.8rem;color:#666;margin-top:16px}
    .note a{color:var(--c)}
    #toast{display:none;position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:10px 16px;border-radius:8px;z-index:9;font-size:.9rem}
  </style>
</head>
<body>
  <header>
    <a href="${SITE}/">Zenn</a>
    <a class="cart" href="${SITE}/carrito">Carrito</a>
  </header>
  <div id="toast">Agregado al carrito</div>
  <main>
    <article>
      ${image ? `<img class="hero" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" width="800" height="800" fetchpriority="high" decoding="async"/>` : ''}
      ${thumbs ? `<div class="thumbs">${thumbs}</div>` : ''}
      <p class="brand">${escapeHtml(brand)}</p>
      <h1>${escapeHtml(name)}</h1>
      <div class="price">${priceBlock}</div>
      <p class="${inStock ? 'ok' : 'no'}">${inStock ? 'En stock' : 'Sin stock'} · Envío 24-48 h en Asunción</p>
      <p class="ship">Garantía de marca · 7 días para devolución · Pagá online o por WhatsApp</p>
      <div class="desc">${escapeHtml(descRaw).slice(0, 1800)}</div>
      ${
        category
          ? `<p class="note"><a href="${SITE}/categoria-producto?category=${encodeURIComponent(category)}${
              subcategory ? `&subcategory=${encodeURIComponent(subcategory)}` : ''
            }">Ver más en ${escapeHtml(subcategoryLabel || categoryLabel || subcategory || category)}</a></p>`
          : ''
      }
      <p class="note"><a href="${escapeHtml(spaUrl)}">Ver ficha completa (fotos y specs)</a></p>
    </article>
  </main>
  <div class="bar">
    <a class="wa" href="${escapeHtml(waHref)}" rel="noopener">WhatsApp</a>
    <button class="buy" id="addCart" type="button" ${inStock && price > 0 ? '' : 'disabled'}>Comprar</button>
  </div>
  <script>
    (function(){
      var product = ${jsonForScript(cartProduct)};
      var btn = document.getElementById('addCart');
      if(!btn || btn.disabled) return;
      btn.addEventListener('click', function(){
        try {
          var raw = localStorage.getItem('cartItems');
          var items = raw ? JSON.parse(raw) : [];
          if(!Array.isArray(items)) items = [];
          var idx = items.findIndex(function(it){
            var id = it && it.productId;
            return (id && id._id === product._id) || id === product._id;
          });
          if(idx >= 0) items[idx].quantity = (items[idx].quantity || 1) + 1;
          else items.push({ _id: 'local-' + Date.now(), productId: product, quantity: 1, addedAt: new Date().toISOString() });
          localStorage.setItem('cartItems', JSON.stringify(items));
          var t = document.getElementById('toast');
          if(t){ t.style.display = 'block'; setTimeout(function(){ t.style.display = 'none'; }, 1200); }
          setTimeout(function(){ location.href = ${jsonForScript(`${SITE}/carrito`)}; }, 400);
        } catch (e) {
          location.href = ${jsonForScript(spaUrl)};
        }
      });
    })();
  </script>
</body>
</html>`;
}

const productSeoHtmlController = async (req, res) => {
  try {
    const slugOrId = req.params.slugOrId || req.params.slug;
    const product = await findProduct(slugOrId);

    if (!product) {
      res.set({
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600'
      });
      res
        .status(404)
        .type('html')
        .send(
          `<!DOCTYPE html><html lang="es"><head><title>Producto no encontrado | Zenn</title><meta name="robots" content="noindex"/></head><body><h1>Producto no encontrado</h1><p><a href="${SITE}/">Ir al inicio</a></p></body></html>`
        );
      return;
    }

    if (
      isMongoObjectId(slugOrId) &&
      product.slug &&
      String(product.slug) !== String(slugOrId)
    ) {
      const loc = `${SITE}/producto/${product.slug}`;
      res.set({
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=86400'
      });
      res.redirect(301, loc);
      return;
    }

    const html = buildProductHtml(product);
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      // CDN 12 h: Google y clientes ven esta ficha sin bajar el SPA.
      'Cache-Control': 'public, max-age=600, s-maxage=43200, stale-while-revalidate=604800',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=604800',
      'X-Robots-Tag': 'index, follow'
    });
    res.status(200).send(html);
  } catch (err) {
    res.status(500).type('text/plain').send('Error SEO product HTML');
  }
};

module.exports = {
  productSeoHtmlController,
  findProduct,
  buildProductHtml
};
