'use strict';

const assert = require('assert');
const { composeProductPage, composeCategoryPage } = require('../services/seoPageHtml');

const product = composeProductPage(
  {
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
  },
  [{ productName: 'Notebook HP', slug: 'notebook-hp', sellingPrice: 2000000 }],
  { category: 'Notebooks', subcategory: 'Notebooks' }
);

assert.ok(product.bodyHtml.includes('<h1>'), 'falta h1');
assert.ok(product.bodyHtml.includes('Gs. 1.747.783'), 'falta precio');
assert.ok(product.bodyHtml.includes('href="/producto/notebook-hp"'), 'falta relacionado');
assert.ok(product.bodyHtml.includes('Intel Core i5-7300U'), 'falta spec');
assert.ok(!product.bodyHtml.includes('<script>'), 'el nombre no se escapó');
assert.strictEqual(product.jsonLd[1]['@type'], 'Product');
assert.strictEqual(product.jsonLd[1].offers.price, 1747783);
assert.strictEqual(product.jsonLd[1].offers.availability, 'https://schema.org/InStock');
assert.ok(/paraguay/i.test(product.title), 'el título no dice Paraguay');
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

async function checkInject() {
  const { applyRenderedPage } = await import('../../frontend/seoHead.mjs');
  const shell = '<html><head><title>Home</title><meta name="description" content="home"/><meta property="og:url" content="https://www.zenn.com.py"/><meta property="og:title" content="home"/><meta property="og:description" content="home"/><meta name="twitter:title" content="home"/><meta name="twitter:description" content="home"/></head><body><div id="root"></div></body></html>';
  const html = applyRenderedPage(shell, product);
  assert.ok(html.includes('<h1>'), 'el html inyectado no tiene h1');
  assert.ok(html.includes('application/ld+json'), 'falta json-ld');
  assert.ok(html.includes('rel="canonical"'), 'falta canónico');
  assert.ok(html.includes('Gs. 1.747.783'), 'el precio no llegó al html');
  assert.ok(!html.includes('<div id="root"></div>'), 'el root quedó vacío');
}

checkInject()
  .then(() => {
    console.log('seo-render-ok');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
