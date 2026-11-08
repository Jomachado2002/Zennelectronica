'use strict';

/**
 * HTML inicial de ficha y categoría.
 * Lo reciben la persona y Google, antes de que React arranque.
 * React reemplaza #root al cargar. El primer HTML ya tiene el producto.
 */

const productModel = require('../models/productModel');
const Category = require('../models/categoryModel');
const { readCategoryHub } = require('./categorySeo');
const { SITE, humanizeTaxonomy, offerShippingAndReturns } = require('../helpers/productStructuredData');

const SPEC_FIELDS = [
  ['processor', 'Procesador'],
  ['memory', 'Memoria'],
  ['storage', 'Almacenamiento'],
  ['disk', 'Disco'],
  ['graphicsCard', 'Placa de video'],
  ['notebookScreen', 'Pantalla'],
  ['phoneRAM', 'RAM'],
  ['phoneStorage', 'Almacenamiento'],
  ['phoneProcessor', 'Procesador'],
  ['phoneScreenSize', 'Pantalla'],
  ['monitorSize', 'Tamaño'],
  ['monitorResolution', 'Resolución'],
  ['monitorRefreshRate', 'Frecuencia'],
  ['ramText', 'Memoria RAM'],
  ['ramCapacity', 'Memoria RAM'],
  ['psuWattage', 'Potencia']
];

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1).replace(/\s+\S*$/, '').trim();
  return cut.length > 24 ? cut : text.slice(0, max).trim();
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatGuaranies(value) {
  const amount = Math.round(Number(value) || 0);
  if (!amount) return '';
  return `Gs. ${new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(amount)}`;
}

function inStock(product) {
  return product?.stock == null || Number(product.stock) > 0;
}

function absoluteImage(url) {
  const value = String(url || '').trim();
  if (!/^https?:\/\//i.test(value)) return '';
  return value;
}

function categoryPath(category, subcategory) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (subcategory) params.set('subcategory', subcategory);
  const query = params.toString();
  return `/categoria-producto${query ? `?${query}` : ''}`;
}

function productPath(slug) {
  return `/producto/${slug}`;
}

function jsonLdScript(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function specRows(product) {
  const rows = [];
  const seen = new Set();
  if (product.brandName) {
    rows.push(['Marca', product.brandName]);
    seen.add('marca');
  }
  for (const [field, label] of SPEC_FIELDS) {
    const value = stripHtml(product[field]);
    if (!value || value.length > 120) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([label, value]);
  }
  const extra = product.technicalSpecifications;
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    for (const [key, raw] of Object.entries(extra)) {
      if (rows.length >= 12) break;
      const value = stripHtml(raw);
      if (!value || value.length > 120) continue;
      const label = humanizeTaxonomy(key);
      if (!label || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      rows.push([label, value]);
    }
  }
  return rows.slice(0, 12);
}

function productTitle(product) {
  const stock = inStock(product);
  const custom = stock ? String(product.seoTitle || '').replace(/\s+/g, ' ').trim() : '';
  if (custom) return clip(custom, 60);
  const name = clip(product.productName, 46);
  if (/paraguay/i.test(name)) return name;
  return `${name} | Paraguay`;
}

function productDescription(product) {
  const stock = inStock(product);
  const custom = stock ? String(product.seoDescription || '').replace(/\s+/g, ' ').trim() : '';
  if (custom.length >= 40) return clip(custom, 160);
  const price = formatGuaranies(product.sellingPrice);
  const name = clip(product.productName, 80);
  const availability = stock ? 'Hay stock en Zenn, Asunción.' : 'Sin stock por ahora en Zenn.';
  return clip(`${name}. ${price ? `${price}. ` : ''}${availability} Envío a Paraguay.`, 160);
}

function productJsonLd(product, canonical, image) {
  const stock = inStock(product);
  const price = Math.round(Number(product.sellingPrice) || 0);
  const shipping = offerShippingAndReturns(canonical);
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: clip(product.productName, 150),
    description: clip(stripHtml(product.description) || productDescription(product), 500),
    brand: { '@type': 'Brand', name: clip(product.brandName, 70) || 'Zenn' }
  };
  if (price > 0) {
    json.offers = {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'PYG',
      price,
      priceValidUntil: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      itemCondition: 'https://schema.org/NewCondition',
      availability: stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Zenn' },
      shippingDetails: shipping.shippingDetails,
      hasMerchantReturnPolicy: shipping.hasMerchantReturnPolicy,
      validFrom: shipping.validFrom
    };
  }
  if (image) json.image = [image];
  if (product.codigo) {
    json.sku = String(product.codigo);
    json.mpn = String(product.codigo);
  }
  return json;
}

function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

function linkList(title, items) {
  if (!items.length) return '';
  const links = items
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.name)}</a>${
          item.detail ? ` <span>${escapeHtml(item.detail)}</span>` : ''
        }</li>`
    )
    .join('');
  return `<section><h2>${escapeHtml(title)}</h2><ul>${links}</ul></section>`;
}

function composeProductPage(product, related, labels) {
  const slug = String(product.slug || '').trim();
  const canonical = `${SITE}${productPath(slug)}`;
  const image = absoluteImage(product.productImage && product.productImage[0]);
  const price = formatGuaranies(product.sellingPrice);
  const stock = inStock(product);
  const categoryLabel = labels.category || humanizeTaxonomy(product.category) || 'Categoría';
  const subcategoryLabel = labels.subcategory || humanizeTaxonomy(product.subcategory) || '';
  const categoryHref = categoryPath(product.category, '');
  const subcategoryHref = product.subcategory ? categoryPath(product.category, product.subcategory) : '';
  const specs = specRows(product);
  const blurb = clip(stripHtml(product.description), 420);
  const title = productTitle(product);
  const description = productDescription(product);

  const crumbs = [
    `<a href="/">Inicio</a>`,
    `<a href="${escapeHtml(categoryHref)}">${escapeHtml(categoryLabel)}</a>`
  ];
  if (subcategoryLabel && subcategoryHref) {
    crumbs.push(`<a href="${escapeHtml(subcategoryHref)}">${escapeHtml(subcategoryLabel)}</a>`);
  }

  const specHtml = specs.length
    ? `<section><h2>Especificaciones</h2><ul>${specs
        .map(([label, value]) => `<li>${escapeHtml(label)}: ${escapeHtml(value)}</li>`)
        .join('')}</ul></section>`
    : '';

  const bodyHtml = [
    '<article>',
    `<nav aria-label="Migas">${crumbs.join(' / ')}</nav>`,
    `<h1>${escapeHtml(clip(product.productName, 180))}</h1>`,
    image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(clip(product.productName, 140))}" width="600" height="600">` : '',
    blurb ? `<p>${escapeHtml(blurb)}</p>` : '',
    price ? `<p><strong>Precio: ${escapeHtml(price)}</strong></p>` : '',
    `<p>${stock ? 'Hay stock en Zenn, Asunción, Paraguay.' : 'Sin stock por ahora. La ficha sigue publicada.'}</p>`,
    '<p>Envío a Asunción y todo Paraguay.</p>',
    specHtml,
    linkList(
      'Productos relacionados',
      (related || []).map((item) => ({
        href: productPath(item.slug),
        name: clip(item.productName, 120),
        detail: formatGuaranies(item.sellingPrice)
      }))
    ),
    subcategoryHref
      ? `<p><a href="${escapeHtml(subcategoryHref)}">Ver más ${escapeHtml(subcategoryLabel || categoryLabel)} en Paraguay</a></p>`
      : '',
    '</article>'
  ]
    .filter(Boolean)
    .join('');

  const crumbItems = [
    { name: 'Inicio', url: `${SITE}/` },
    { name: categoryLabel, url: `${SITE}${categoryHref}` }
  ];
  if (subcategoryLabel && subcategoryHref) {
    crumbItems.push({ name: subcategoryLabel, url: `${SITE}${subcategoryHref}` });
  }
  crumbItems.push({ name: clip(product.productName, 120), url: canonical });

  return {
    title,
    description,
    canonical,
    image,
    ogType: 'product',
    priceAmount: Math.round(Number(product.sellingPrice) || 0),
    jsonLd: [breadcrumbJsonLd(crumbItems), productJsonLd(product, canonical, image)],
    bodyHtml
  };
}

function categoryIntro(phrase, totalProducts, minLabel) {
  if (!totalProducts) {
    return `${phrase} en Zenn, Asunción. Sin stock por ahora. Envío a todo Paraguay.`;
  }
  const price = minLabel ? `, desde ${minLabel}` : '';
  return `${phrase} en Zenn, Asunción. ${totalProducts} productos con stock${price}. Envío a todo Paraguay.`;
}

function categoryCountLine(totalProducts, shown, minLabel) {
  if (!totalProducts) return 'Sin productos con stock por ahora.';
  const price = minLabel ? ` Desde ${minLabel}.` : '';
  if (shown < totalProducts) {
    return `${totalProducts} productos con stock. Esta página muestra ${shown}.${price}`;
  }
  return `${totalProducts} productos con stock.${price}`;
}

function composeCategoryPage({ category, subcategory, label, hub, products, siblings, totalProducts, totalStock, minPrice }) {
  const canonical = `${SITE}${categoryPath(category, subcategory)}`;
  const phrase = label || humanizeTaxonomy(subcategory) || humanizeTaxonomy(category) || 'Tecnología';
  const list = Array.isArray(products) ? products : [];
  const total = Number.isFinite(Number(totalProducts)) ? Number(totalProducts) : list.length;
  const units = Number.isFinite(Number(totalStock)) ? Number(totalStock) : 0;
  const floor = Number(minPrice) > 0
    ? Number(minPrice)
    : Math.min(...list.map((item) => Number(item.sellingPrice) || 0).filter((value) => value > 0), Infinity);
  const minLabel = formatGuaranies(Number.isFinite(floor) ? floor : 0);
  const title = clip(hub?.seoTitle || `${phrase} en Paraguay`, 60);
  const intro = categoryIntro(phrase, total, minLabel);
  const description = clip(intro, 160);
  const heading = /paraguay/i.test(title) ? title : `${phrase} en Paraguay`;

  const cards = list
    .map((item) => {
      const href = productPath(item.slug);
      const image = absoluteImage(item.productImage && item.productImage[0]);
      const price = formatGuaranies(item.sellingPrice);
      return [
        '<article>',
        `<a href="${escapeHtml(href)}">`,
        image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(clip(item.productName, 140))}" width="300" height="300">` : '',
        `<h3>${escapeHtml(clip(item.productName, 140))}</h3>`,
        price ? `<p>${escapeHtml(price)}</p>` : '',
        '</a>',
        '</article>'
      ]
        .filter(Boolean)
        .join('');
    })
    .join('');

  const bodyHtml = [
    '<article>',
    `<nav aria-label="Migas"><a href="/">Inicio</a> / ${escapeHtml(phrase)}</nav>`,
    `<h1>${escapeHtml(heading)}</h1>`,
    `<p>${escapeHtml(clip(intro, 500))}</p>`,
    `<p>${escapeHtml(categoryCountLine(total, list.length, minLabel))}</p>`,
    cards ? `<section><h2>${escapeHtml(phrase)} disponibles</h2>${cards}</section>` : '',
    linkList(
      'Otras categorías',
      (siblings || []).map((item) => ({ href: item.href, name: item.name }))
    ),
    '</article>'
  ]
    .filter(Boolean)
    .join('');

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: heading,
    description: clip(intro, 300),
    url: canonical,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: list.length,
      itemListElement: list.slice(0, 24).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE}${productPath(item.slug)}`,
        name: clip(item.productName, 140)
      }))
    }
  };

  return {
    title: title.includes('Zenn') ? title : clip(`${title} | Zenn`, 60),
    description,
    canonical,
    image: absoluteImage(list[0] && list[0].productImage && list[0].productImage[0]),
    ogType: 'website',
    priceAmount: 0,
    totalProducts: total,
    totalStock: units,
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Inicio', url: `${SITE}/` },
        { name: phrase, url: canonical }
      ]),
      itemList
    ],
    bodyHtml
  };
}

const PRODUCT_SELECT = [
  'productName',
  'slug',
  'sellingPrice',
  'stock',
  'brandName',
  'category',
  'subcategory',
  'productImage',
  'description',
  'seoTitle',
  'seoDescription',
  'codigo',
  'technicalSpecifications',
  ...SPEC_FIELDS.map(([field]) => field)
].join(' ');

async function labelsFor(category, subcategory) {
  const labels = { category: humanizeTaxonomy(category), subcategory: humanizeTaxonomy(subcategory) };
  if (!category) return labels;
  const doc = await Category.findOne({ value: category }).select('label subcategories.label subcategories.value').lean();
  if (!doc) return labels;
  if (doc.label) labels.category = doc.label;
  const sub = (doc.subcategories || []).find((item) => item.value === subcategory);
  if (sub?.label) labels.subcategory = sub.label;
  return labels;
}

async function loadProductPage(slugOrId) {
  const key = String(slugOrId || '').trim();
  if (!key) return null;
  let product = await productModel.findOne({ slug: key }).select(PRODUCT_SELECT).lean();
  if (!product) {
    product = await productModel.findOne({ previousSlugs: key }).select(PRODUCT_SELECT).lean();
    if (product?.slug && product.slug !== key) {
      return { redirect: `${SITE}${productPath(product.slug)}` };
    }
  }
  if (!product?.slug || !product.productName) return null;

  const [related, labels] = await Promise.all([
    productModel
      .find({
        category: product.category,
        subcategory: product.subcategory,
        slug: { $ne: product.slug },
        stock: { $gt: 0 }
      })
      .select('productName slug sellingPrice')
      .sort({ sellingPrice: 1 })
      .limit(6)
      .lean(),
    labelsFor(product.category, product.subcategory)
  ]);

  return composeProductPage(product, related, labels);
}

async function loadCategoryPage(category, subcategory) {
  const categoryValue = String(category || '').trim();
  if (!categoryValue) return null;
  const subcategoryValue = String(subcategory || '').trim();

  const categoryDoc = await Category.findOne({ value: categoryValue, isActive: true })
    .select('label value subcategories.label subcategories.value subcategories.isActive')
    .lean();
  if (!categoryDoc) return null;

  const subs = categoryDoc.subcategories || [];
  const sub = subcategoryValue ? subs.find((item) => item.value === subcategoryValue) : null;
  if (subcategoryValue && (!sub || sub.isActive === false)) return null;

  const query = { category: categoryValue, stock: { $gt: 0 }, slug: { $nin: ['', null] } };
  if (subcategoryValue) query.subcategory = subcategoryValue;

  const [products, totalProducts, totals, hub] = await Promise.all([
    productModel
      .find(query)
      .select('productName slug sellingPrice productImage brandName')
      .sort({ sellingPrice: 1 })
      .limit(24)
      .lean(),
    productModel.countDocuments(query),
    productModel.aggregate([
      { $match: query },
      { $group: { _id: null, totalStock: { $sum: '$stock' }, minPrice: { $min: '$sellingPrice' } } }
    ]),
    readCategoryHub(categoryValue, subcategoryValue)
  ]);

  const stats = totals[0] || {};
  const label = (sub && sub.label) || categoryDoc.label || humanizeTaxonomy(subcategoryValue || categoryValue);
  const siblings = subs
    .filter((item) => item.isActive !== false && item.value && item.value !== subcategoryValue && item.label)
    .slice(0, 12)
    .map((item) => ({
      name: item.label,
      href: categoryPath(categoryValue, item.value)
    }));

  return composeCategoryPage({
    category: categoryValue,
    subcategory: subcategoryValue,
    label,
    hub,
    products,
    siblings,
    totalProducts,
    totalStock: Number(stats.totalStock) || 0,
    minPrice: Number(stats.minPrice) || 0
  });
}

module.exports = {
  escapeHtml,
  composeProductPage,
  composeCategoryPage,
  loadProductPage,
  loadCategoryPage,
  jsonLdScript
};
