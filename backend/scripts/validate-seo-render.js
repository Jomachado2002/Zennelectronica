'use strict';

const assert = require('assert');
const {
  absoluteImage,
  productJsonLd,
  composeProductPage,
  composeCategoryPage
} = require('../services/seoPageHtml');

const baseProduct = {
  productName: 'Notebook Dell Latitude 5285 <script>',
  slug: 'notebook-dell-latitude-5285',
  sellingPrice: 1747783,
  stock: 2,
  brandName: 'Dell',
  category: 'notebook_y_computadoras',
  subcategory: 'notebook__20_03',
  productImage: ['https://cdn.zenn.com.py/notebook.jpg'],
  description: 'Equipo con pantalla táctil.',
  processor: 'Intel Core i5-7300U',
  memory: '8GB',
  storage: '256GB SSD',
  codigo: 'NB-1'
};

const related = [{ productName: 'Notebook HP', slug: 'notebook-hp', sellingPrice: 2000000 }];
const labels = { category: 'Notebooks', subcategory: 'Notebooks' };

function productLd(page) {
  return (page.jsonLd || []).find((item) => item && item['@type'] === 'Product') || null;
}

function assertValidJsonLd(obj) {
  const text = JSON.stringify(obj);
  assert.ok(text && text[0] === '{', 'json-ld no serializa');
  assert.deepStrictEqual(JSON.parse(text), obj);
}

// --- absoluteImage ---
assert.strictEqual(absoluteImage('https://cdn.zenn.com.py/a.jpg'), 'https://cdn.zenn.com.py/a.jpg');
assert.strictEqual(absoluteImage('http://cdn.zenn.com.py/a.jpg'), 'http://cdn.zenn.com.py/a.jpg');
assert.strictEqual(absoluteImage('/uploads/a.jpg'), '');
assert.strictEqual(absoluteImage('uploads/a.jpg'), '');
assert.strictEqual(absoluteImage('not a url'), '');
assert.strictEqual(absoluteImage(''), '');
assert.strictEqual(absoluteImage(null), '');

// --- stock + imagen HTTPS ---
{
  const page = composeProductPage(baseProduct, related, labels);
  const ld = productLd(page);
  assert.ok(ld, 'stock+imagen debe emitir Product');
  assert.strictEqual(ld.offers.availability, 'https://schema.org/InStock');
  assert.strictEqual(ld.offers.price, 1747783);
  assert.strictEqual(ld.offers.priceCurrency, 'PYG');
  assert.deepStrictEqual(ld.image, ['https://cdn.zenn.com.py/notebook.jpg']);
  assertValidJsonLd(ld);
  assert.ok(page.bodyHtml.includes('<h1>'));
  assert.ok(page.bodyHtml.includes('Gs. 1.747.783'));
  assert.ok(!page.bodyHtml.includes('<script>'));
  assert.ok(/paraguay/i.test(page.title));
}

// --- stock sin imagen ---
{
  const page = composeProductPage({ ...baseProduct, productImage: [] }, related, labels);
  assert.strictEqual(productLd(page), null, 'stock sin imagen no debe emitir Product');
  assert.ok(page.bodyHtml.includes('<h1>'), 'la ficha HTML sigue publicada');
  assert.ok(page.jsonLd.some((item) => item['@type'] === 'BreadcrumbList'));
}

// --- agotado + imagen ---
{
  const page = composeProductPage(
    { ...baseProduct, stock: 0, productImage: ['https://cdn.zenn.com.py/oos.jpg'] },
    related,
    labels
  );
  const ld = productLd(page);
  assert.ok(ld, 'agotado con imagen sí emite Product');
  assert.strictEqual(ld.offers.availability, 'https://schema.org/OutOfStock');
  assert.deepStrictEqual(ld.image, ['https://cdn.zenn.com.py/oos.jpg']);
  assert.ok(page.bodyHtml.includes('Sin stock'));
  assertValidJsonLd(ld);
}

// --- agotado sin imagen (caso production WNC-10030322) ---
{
  const page = composeProductPage(
    { ...baseProduct, stock: 0, productImage: [] },
    related,
    labels
  );
  assert.strictEqual(productLd(page), null, 'agotado sin imagen: omitir Product/Offer');
  assert.ok(page.bodyHtml.includes('Sin stock'), 'HTML de ficha se conserva');
  assert.ok(!/noindex/i.test(page.bodyHtml));
}

// --- sin precio ---
{
  const page = composeProductPage(
    { ...baseProduct, sellingPrice: 0, productImage: ['https://cdn.zenn.com.py/notebook.jpg'] },
    related,
    labels
  );
  const ld = productLd(page);
  assert.ok(ld, 'sin precio pero con imagen: Product sin Offer');
  assert.ok(!ld.offers, 'no Offer sin precio');
  assert.deepStrictEqual(ld.image, ['https://cdn.zenn.com.py/notebook.jpg']);
}

// --- imagen relativa / inválida ---
{
  assert.strictEqual(
    productJsonLd(baseProduct, 'https://www.zenn.com.py/producto/x', '/relative.jpg'),
    null
  );
  assert.strictEqual(
    productJsonLd(baseProduct, 'https://www.zenn.com.py/producto/x', 'ftp://cdn.zenn.com.py/a.jpg'),
    null
  );
  const pageRel = composeProductPage(
    { ...baseProduct, productImage: ['/uploads/relative.jpg'] },
    related,
    labels
  );
  assert.strictEqual(productLd(pageRel), null);
  const pageBad = composeProductPage(
    { ...baseProduct, productImage: ['not-a-url'] },
    related,
    labels
  );
  assert.strictEqual(productLd(pageBad), null);
}

// --- imagen HTTPS válida vía productJsonLd directo ---
{
  const ld = productJsonLd(
    baseProduct,
    'https://www.zenn.com.py/producto/notebook-dell-latitude-5285',
    'https://cdn.zenn.com.py/notebook.jpg'
  );
  assert.ok(ld);
  assert.strictEqual(ld['@type'], 'Product');
  assertValidJsonLd(ld);
}

const product = composeProductPage(baseProduct, related, labels);
assert.ok(product.bodyHtml.includes('href="/producto/notebook-hp"'), 'falta relacionado');
assert.ok(product.bodyHtml.includes('Intel Core i5-7300U'), 'falta spec');
assert.ok(product.canonical.includes('/producto/notebook-dell-latitude-5285'));

const category = composeCategoryPage({
  category: 'notebook_y_computadoras',
  subcategory: 'notebook__20_03',
  label: 'Notebooks',
  hub: { seoTitle: 'Notebooks en Paraguay', intro: 'Hay notebooks con stock en Zenn, Asunción.' },
  products: [
    {
      productName: 'Notebook Dell Latitude 5285',
      slug: 'notebook-dell-latitude-5285',
      sellingPrice: 1747783,
      productImage: ['https://cdn.zenn.com.py/notebook.jpg']
    }
  ],
  siblings: [{ name: 'Monitores', href: '/categoria-producto?category=monitores' }],
  totalProducts: 170,
  totalStock: 180,
  minPrice: 1747783
});

assert.ok(category.bodyHtml.includes('<h1>'), 'categoría sin h1');
assert.ok(category.bodyHtml.includes('href="/producto/notebook-dell-latitude-5285"'), 'categoría sin ficha');
assert.ok(category.description.includes('170 productos con stock'), 'la description usa el tope de 24');
assert.ok(!category.description.includes('Hay notebooks con stock'), 'reutiliza el intro guardado');
assert.ok(category.bodyHtml.includes('170 productos con stock'), 'el cuerpo no dice el total');
assert.ok(category.bodyHtml.includes('Esta página muestra 1'), 'no separa el listado del total');
assert.strictEqual(category.totalProducts, 170);
assert.strictEqual(category.totalStock, 180);
assert.strictEqual(category.jsonLd[1].mainEntity.numberOfItems, 1);
assert.strictEqual(category.jsonLd[1].mainEntity.itemListElement[0].position, 1);
assert.ok(category.canonical.includes('category=notebook_y_computadoras'));
assert.ok(category.bodyHtml.includes('<h1>Notebooks en Paraguay</h1>'), 'H1 notebooks sub');
assert.ok(
  category.bodyHtml.includes('href="/categoria-producto?category=notebook_y_computadoras"'),
  'link interno a padre notebooks'
);

const parentNotebooks = composeCategoryPage({
  category: 'notebook_y_computadoras',
  subcategory: '',
  label: 'Notebook y computadoras',
  hub: null,
  products: [],
  siblings: [],
  totalProducts: 271,
  totalStock: 300,
  minPrice: 500000,
  brands: ['HP', 'Lenovo', 'Dell']
});
assert.ok(parentNotebooks.bodyHtml.includes('<h1>Notebook y computadoras en Paraguay</h1>'));
assert.ok(parentNotebooks.title.includes('Computadoras en Paraguay'));
assert.ok(
  parentNotebooks.bodyHtml.includes('subcategory=notebook__20_03'),
  'padre notebooks enlaza a sub notebooks'
);
assert.notStrictEqual(parentNotebooks.title, category.title, 'anti-canibalización title padre≠sub');

const ssdHub = composeCategoryPage({
  category: 'almacenamiento',
  subcategory: 'ssd__21_03',
  label: 'SSD',
  hub: { seoTitle: 'SSD en Paraguay' },
  products: [],
  siblings: [],
  totalProducts: 191,
  totalStock: 200,
  minPrice: 203921,
  brands: ['Kingston', 'SanDisk']
});
assert.ok(ssdHub.bodyHtml.includes('<h1>Discos SSD en Paraguay</h1>'));
assert.ok(ssdHub.description.includes('191 productos con stock'));
assert.ok(ssdHub.bodyHtml.includes('Marcas con stock: Kingston, SanDisk'));

async function checkInject() {
  const { applyRenderedPage, planSeo } = await import('../../frontend/seoHead.mjs');
  const shell =
    '<html><head><title>Home</title><meta name="description" content="home"/><meta property="og:url" content="https://www.zenn.com.py"/><meta property="og:title" content="home"/><meta property="og:description" content="home"/><meta name="twitter:title" content="home"/><meta name="twitter:description" content="home"/></head><body><div id="root"></div></body></html>';
  const html = applyRenderedPage(shell, product);
  assert.ok(html.includes('<h1>'), 'el html inyectado no tiene h1');
  assert.ok(html.includes('application/ld+json'), 'falta json-ld');
  assert.ok(html.includes('rel="canonical"'), 'falta canónico');
  assert.ok(html.includes('Gs. 1.747.783'), 'el precio no llegó al html');
  assert.ok(!html.includes('<div id="root"></div>'), 'el root quedó vacío');

  const oosNoImg = composeProductPage(
    { ...baseProduct, stock: 0, productImage: [] },
    related,
    labels
  );
  const oosHtml = applyRenderedPage(shell, oosNoImg);
  assert.ok(oosHtml.includes('Sin stock'), 'agotado sin imagen sigue en HTML');
  assert.ok(!/"@type":"Product"/.test(oosHtml), 'agotado sin imagen no inyecta Product');
  assert.ok(oosHtml.includes('rel="canonical"'), 'canonical en agotado');

  const homePlan = planSeo('/', '');
  assert.strictEqual(homePlan.kind, 'home');
  assert.strictEqual(homePlan.canonical, 'https://www.zenn.com.py/');
  assert.ok(homePlan.title && homePlan.bodyHtml.includes('<h1'));
  const homeHtml = applyRenderedPage(shell, homePlan);
  assert.ok(homeHtml.includes('<link rel="canonical" href="https://www.zenn.com.py/"/>'));
  assert.ok(homeHtml.includes('<h1>Zenn - Especialistas en Computadoras Gamer y Soluciones IT en Paraguay</h1>'));
  assert.ok(homeHtml.includes('<title>Zenn | Lo Mejor en Tecnología en Paraguay</title>'));
}

checkInject()
  .then(() => {
    console.log('seo-render-ok');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
