'use strict';

/**
 * Copy SEO de hubs prioritarios (notebooks, monitores, smartphones, SSD).
 * Solo datos reales del catálogo: conteos, precios mínimos y marcas.
 * Anti-canibalización: padre vs subcategoría con intención distinta.
 */

function categoryPath(category, subcategory) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (subcategory) params.set('subcategory', subcategory);
  const query = params.toString();
  return `/categoria-producto${query ? `?${query}` : ''}`;
}

function brandPhrase(brands) {
  const list = (brands || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 5);
  if (!list.length) return '';
  return ` Marcas con stock: ${list.join(', ')}.`;
}

function stockIntro(phrase, total, minLabel, brands, extra = '') {
  if (!total) {
    return `${phrase} en Zenn, Asunción. Sin stock por ahora. Envío a todo Paraguay.`;
  }
  const price = minLabel ? `, desde ${minLabel}` : '';
  const more = extra ? ` ${extra}` : '';
  return `${phrase} en Zenn, Asunción. ${total} productos con stock${price}.${brandPhrase(brands)}${more} Envío a todo Paraguay.`;
}

/** @returns {null | { label: string, seoTitle: string, h1: string, buildIntro: Function, related: Array<{name:string,href:string}> }} */
function priorityCategoryHub(category, subcategory) {
  const cat = String(category || '').trim();
  const sub = String(subcategory || '').trim();

  if (cat === 'notebook_y_computadoras' && !sub) {
    return {
      label: 'Notebook y computadoras',
      seoTitle: 'Computadoras en Paraguay',
      h1: 'Notebook y computadoras en Paraguay',
      buildIntro: ({ total, minLabel, brands }) =>
        stockIntro(
          'Notebook y computadoras',
          total,
          minLabel,
          brands,
          'Incluye notebooks, mini PC y equipos armados.'
        ),
      related: [
        { name: 'Notebooks', href: categoryPath(cat, 'notebook__20_03') },
        { name: 'Monitores', href: categoryPath('monitores', 'monitores__27') },
        { name: 'SSD', href: categoryPath('almacenamiento', 'ssd__21_03') },
        {
          name: 'Celulares',
          href: categoryPath('celulares_y_tablets', 'smartphones_y_celulares__32_01')
        }
      ]
    };
  }

  if (cat === 'notebook_y_computadoras' && sub === 'notebook__20_03') {
    return {
      label: 'Notebooks',
      seoTitle: 'Notebooks en Paraguay',
      h1: 'Notebooks en Paraguay',
      buildIntro: ({ total, minLabel, brands }) =>
        stockIntro('Notebooks', total, minLabel, brands),
      related: [
        { name: 'Computadoras y PCs', href: categoryPath(cat, '') },
        { name: 'Monitores', href: categoryPath('monitores', 'monitores__27') },
        { name: 'SSD', href: categoryPath('almacenamiento', 'ssd__21_03') }
      ]
    };
  }

  if (cat === 'monitores' && !sub) {
    return {
      label: 'Monitores',
      seoTitle: 'Monitores y pantallas en Paraguay',
      h1: 'Monitores y pantallas en Paraguay',
      buildIntro: ({ total, minLabel, brands }) =>
        stockIntro(
          'Monitores y pantallas',
          total,
          minLabel,
          brands,
          'Catálogo completo de monitores para oficina y gaming.'
        ),
      related: [
        { name: 'Monitores en stock', href: categoryPath('monitores', 'monitores__27') },
        { name: 'Notebooks', href: categoryPath('notebook_y_computadoras', 'notebook__20_03') },
        { name: 'SSD', href: categoryPath('almacenamiento', 'ssd__21_03') }
      ]
    };
  }

  if (cat === 'monitores' && sub === 'monitores__27') {
    return {
      label: 'Monitores',
      seoTitle: 'Monitores en Paraguay',
      h1: 'Monitores en Paraguay',
      buildIntro: ({ total, minLabel, brands }) =>
        stockIntro('Monitores', total, minLabel, brands),
      related: [
        { name: 'Monitores y pantallas', href: categoryPath('monitores', '') },
        { name: 'Notebooks', href: categoryPath('notebook_y_computadoras', 'notebook__20_03') },
        {
          name: 'Celulares',
          href: categoryPath('celulares_y_tablets', 'smartphones_y_celulares__32_01')
        }
      ]
    };
  }

  if (cat === 'celulares_y_tablets' && !sub) {
    return {
      label: 'Celulares y tablets',
      seoTitle: 'Celulares y tablets en Paraguay',
      h1: 'Celulares y tablets en Paraguay',
      buildIntro: ({ total, minLabel, brands }) =>
        stockIntro(
          'Celulares y tablets',
          total,
          minLabel,
          brands,
          'Smartphones, tablets y teléfonos con stock en Zenn.'
        ),
      related: [
        {
          name: 'Smartphones',
          href: categoryPath(cat, 'smartphones_y_celulares__32_01')
        },
        { name: 'Tablets', href: categoryPath(cat, 'tablets__32_02') },
        { name: 'Notebooks', href: categoryPath('notebook_y_computadoras', 'notebook__20_03') }
      ]
    };
  }

  if (cat === 'celulares_y_tablets' && sub === 'smartphones_y_celulares__32_01') {
    return {
      label: 'Celulares',
      seoTitle: 'Celulares en Paraguay',
      h1: 'Celulares en Paraguay',
      buildIntro: ({ total, minLabel, brands }) =>
        stockIntro('Celulares', total, minLabel, brands),
      related: [
        { name: 'Celulares y tablets', href: categoryPath(cat, '') },
        { name: 'Tablets', href: categoryPath(cat, 'tablets__32_02') },
        { name: 'Notebooks', href: categoryPath('notebook_y_computadoras', 'notebook__20_03') }
      ]
    };
  }

  if (cat === 'almacenamiento' && sub === 'ssd__21_03') {
    return {
      label: 'SSD',
      seoTitle: 'SSD en Paraguay',
      h1: 'Discos SSD en Paraguay',
      buildIntro: ({ total, minLabel, brands }) =>
        stockIntro(
          'Discos SSD',
          total,
          minLabel,
          brands,
          'Unidades SATA y NVMe para PC y notebook.'
        ),
      related: [
        { name: 'Almacenamiento', href: categoryPath('almacenamiento', '') },
        {
          name: 'Memoria RAM PC',
          href: categoryPath('almacenamiento', 'memoria_ram_pc__21_01_01')
        },
        { name: 'Notebooks', href: categoryPath('notebook_y_computadoras', 'notebook__20_03') }
      ]
    };
  }

  return null;
}

const PRIORITY_HUB_KEYS = [
  { category: 'notebook_y_computadoras', subcategory: '' },
  { category: 'notebook_y_computadoras', subcategory: 'notebook__20_03' },
  { category: 'monitores', subcategory: '' },
  { category: 'monitores', subcategory: 'monitores__27' },
  { category: 'celulares_y_tablets', subcategory: '' },
  { category: 'celulares_y_tablets', subcategory: 'smartphones_y_celulares__32_01' },
  { category: 'almacenamiento', subcategory: 'ssd__21_03' }
];

module.exports = {
  priorityCategoryHub,
  PRIORITY_HUB_KEYS,
  categoryPath
};
