import { categoriaProductoHref } from './homeSlotRoutes';

/**
 * Navegación por lo que la gente busca, no por el árbol técnico del depósito.
 * `categories` marca la sección activa. `chips` parte un departamento en varios listados.
 */
export const SHOPPER_DEPARTMENTS = [
  {
    id: 'apple',
    label: 'Apple',
    href: categoriaProductoHref('apple'),
    categories: ['apple']
  },
  {
    id: 'celulares',
    label: 'Celulares',
    href: categoriaProductoHref('celulares_y_tablets'),
    categories: ['celulares_y_tablets']
  },
  {
    id: 'notebooks',
    label: 'Notebooks',
    href: categoriaProductoHref('notebook_y_computadoras'),
    categories: ['notebook_y_computadoras']
  },
  {
    id: 'pc-gamer',
    label: 'PC gamer',
    href: categoriaProductoHref('tarjetas_graficas'),
    categories: ['tarjetas_graficas', 'placas_madre', 'gabinetes', 'fuentes_de_alimentacion', 'cooler'],
    chips: [
      { label: 'Placas de video', category: 'tarjetas_graficas' },
      { label: 'Placas madre', category: 'placas_madre' },
      { label: 'Gabinetes', category: 'gabinetes' },
      { label: 'Fuentes', category: 'fuentes_de_alimentacion' },
      { label: 'Coolers', category: 'cooler' }
    ]
  },
  {
    id: 'almacenamiento',
    label: 'Almacenamiento',
    href: categoriaProductoHref('almacenamiento'),
    categories: ['almacenamiento']
  },
  {
    id: 'perifericos',
    label: 'Periféricos',
    href: categoriaProductoHref('perifericos'),
    categories: ['perifericos', 'monitores', 'impresoras_y_suministros', 'red_y_internet'],
    chips: [
      { label: 'Periféricos', category: 'perifericos' },
      { label: 'Monitores', category: 'monitores' },
      { label: 'Audio', category: 'electronicos', subcategory: 'audio__33_02' },
      { label: 'Impresoras', category: 'impresoras_y_suministros' },
      { label: 'Redes', category: 'red_y_internet' }
    ]
  }
];

const SEARCH_SHORTCUTS = [
  { keys: ['iphone', 'iphones'], href: categoriaProductoHref('apple', 'iphone__19_04') },
  { keys: ['ipad', 'ipads'], href: categoriaProductoHref('apple', 'ipad__19_05') },
  { keys: ['macbook', 'mac book'], href: categoriaProductoHref('apple', 'macbook__19_02') },
  { keys: ['airpods', 'airpod'], href: categoriaProductoHref('apple', 'airpods__19_10') },
  { keys: ['apple watch'], href: categoriaProductoHref('apple', 'apple_watch__19_06') },
  { keys: ['apple'], href: categoriaProductoHref('apple') },
  { keys: ['notebook', 'notebooks', 'laptop', 'laptops'], href: categoriaProductoHref('notebook_y_computadoras') },
  { keys: ['celular', 'celulares', 'smartphone', 'smartphones', 'telefono', 'teléfono'], href: categoriaProductoHref('celulares_y_tablets') },
  { keys: ['ssd', 'nvme', 'disco', 'discos', 'pendrive', 'ram', 'memoria', 'memoria ram', 'almacenamiento'], href: categoriaProductoHref('almacenamiento') },
  { keys: ['monitor', 'monitores'], href: categoriaProductoHref('monitores') },
  { keys: ['gpu', 'rtx', 'placa de video', 'tarjeta grafica', 'tarjeta gráfica'], href: categoriaProductoHref('tarjetas_graficas') },
  { keys: ['teclado', 'teclados', 'mouse', 'auricular', 'auriculares'], href: categoriaProductoHref('perifericos') },
  { keys: ['impresora', 'impresoras'], href: categoriaProductoHref('impresoras_y_suministros') },
  { keys: ['router', 'wifi'], href: categoriaProductoHref('red_y_internet') }
];

function normalizeQuery(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function findShopperDepartment(categoryValue, subcategoryValue) {
  if (!categoryValue) return null;
  const primary = SHOPPER_DEPARTMENTS.find((dept) => dept.categories.includes(categoryValue));
  if (primary) return primary;
  if (!subcategoryValue) return null;
  return SHOPPER_DEPARTMENTS.find((dept) =>
    dept.chips?.some((chip) => chip.category === categoryValue && chip.subcategory === subcategoryValue)
  ) || null;
}

/** Si la búsqueda es justo una intención (“iphone”, “ssd”), abre ese listado. */
export function shopperHrefForQuery(query) {
  const q = normalizeQuery(query);
  if (!q || q.length > 28) return null;
  const hit = SEARCH_SHORTCUTS.find((item) =>
    item.keys.some((key) => normalizeQuery(key) === q)
  );
  return hit ? hit.href : null;
}
