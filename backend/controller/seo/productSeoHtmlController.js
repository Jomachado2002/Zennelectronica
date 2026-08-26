'use strict';

/**
 * HTML SEO para fichas de producto (bots / crawlers).
 * Los usuarios normales siguen viendo el SPA de React.
 *
 * Si la URL es /producto/{ObjectId} y el producto tiene slug → 301 canónico.
 */

const mongoose = require('mongoose');
const productModel = require('../../models/productModel');
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

async function findProduct(slugOrId) {
  const key = String(slugOrId || '').trim();
  if (!key) return null;

  let product = await productModel.findOne({ slug: key }).lean();
  if (product) return product;

  if (mongoose.Types.ObjectId.isValid(key) && String(new mongoose.Types.ObjectId(key)) === key) {
    product = await productModel.findById(key).lean();
  }
  return product || null;
}

function buildProductHtml(product) {
  const pathId = product.slug || String(product._id);
  const pageUrl = `${SITE}/producto/${pathId}`;
  const name = clip(product.productName || 'Producto', 150) || 'Producto';
  const brand = clip(product.brandName, 70) || 'Zenn';
  const descRaw = (product.description || `${name} en Zenn Paraguay. Precio en guaraníes, stock y envío.`)
    .replace(/\s+/g, ' ')
    .trim();
  const desc = descRaw.slice(0, 160);
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    image: images.length ? images : [image],
    description: descRaw.slice(0, 5000),
    brand: { '@type': 'Brand', name: brand }
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
      ? `<p><s>Gs. ${listPrice.toLocaleString('es-PY')}</s> <strong>Gs. ${price.toLocaleString('es-PY')}</strong></p>`
      : `<p><strong>Gs. ${price.toLocaleString('es-PY')}</strong></p>`;

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
  ${image ? `<link rel="preload" as="image" href="${escapeHtml(image)}" fetchpriority="high"/>` : ''}
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;color:#111;background:#fff;line-height:1.5}
    img{max-width:480px;width:100%;height:auto}
    a{color:#002060}
  </style>
</head>
<body>
  <header>
    <p><a href="${SITE}/">Zenn</a> · Tecnología en Paraguay</p>
  </header>
  <main>
    <article>
      <h1>${escapeHtml(name)}</h1>
      <p>Marca: ${escapeHtml(brand)}</p>
      ${priceBlock}
      <p>${inStock ? 'En stock' : 'Sin stock'} · Venta en Asunción y envíos a todo Paraguay.</p>
      ${image ? `<p><img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" width="800" height="800" fetchpriority="high" decoding="async"/></p>` : ''}
      <div>${escapeHtml(descRaw).slice(0, 4000)}</div>
      <p><a href="${escapeHtml(pageUrl)}">Ver producto en Zenn</a></p>
      ${
        category
          ? `<p><a href="${SITE}/categoria-producto?category=${encodeURIComponent(category)}${
              subcategory ? `&subcategory=${encodeURIComponent(subcategory)}` : ''
            }">Ver más en ${escapeHtml(subcategoryLabel || categoryLabel || subcategory || category)}</a></p>`
          : ''
      }
    </article>
  </main>
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
      // CDN 12 h: Google recrawlea sin pegarle al origin. La tienda (SPA) no usa este HTML.
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
