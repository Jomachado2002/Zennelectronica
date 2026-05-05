/**
 * Rutas “Ver más” alineadas al backend `HOME_SLOT_DEFS` (primer par representativo por slot).
 */
/**
 * Subtítulos del home (mismo tono tipo “lista corta con comas” que Apple).
 */
export const HOME_SECTION_SUBTITLES = {
  notebooks: 'Gamer, oficina, estudio y accesorios',
  celulares: 'Smartphones, tablets, fundas y carga rápida',
  placas_madre: 'Intel, AMD, DDR4/DDR5 y formatos ATX',
  mouses: 'Gaming, ergonómico, inalámbrico y con cable',
  monitores: 'Gaming, 4K, ultrawide y profesionales',
  memorias_ram: 'DDR4, DDR5, kits dual y alta frecuencia',
  discos: 'SSD NVMe, SATA, HDD y almacenamiento externo',
  tarjetas_graficas: 'NVIDIA GeForce, AMD Radeon y estaciones de trabajo',
  apple: 'iPhone, MacBook, iPad y accesorios',
  procesadores: 'Intel Core, AMD Ryzen y coolers compatibles',
  teclados: 'Mecánicos, gamer, multimedia y combos'
};

export const HOME_SLOT_ROUTES = {
  notebooks: {
    category: 'notebook_y_computadoras',
    subcategory: 'notebook_y_computadoras__notebook__20'
  },
  celulares: {
    category: 'celulares_y_tablets',
    subcategory: 'celulares_y_tablets__celulares__32'
  },
  placas_madre: {
    category: 'placas_madres',
    subcategory: 'placas_madres__mb_intel__22'
  },
  mouses: {
    category: 'perifericos',
    subcategory: 'perifericos__mouse__30'
  },
  monitores: {
    category: 'apple',
    subcategory: 'apple__monitor__19'
  },
  memorias_ram: {
    category: 'almacenamiento',
    subcategory: 'almacenamiento__memorias__21'
  },
  discos: {
    category: 'almacenamiento',
    subcategory: 'almacenamiento__ssd__21'
  },
  tarjetas_graficas: {
    category: 'tarjetas_graficas',
    subcategory: 'tarjetas_graficas__vga_nvidia__23'
  },
  apple: {
    category: 'apple',
    subcategory: 'apple__iphone__19'
  },
  procesadores: {
    category: 'procesadores',
    subcategory: 'procesadores__cpu_intel__24'
  },
  teclados: {
    category: 'perifericos',
    subcategory: 'perifericos__teclados__30'
  }
};

export function categoriaProductoHref(categoryValue, subcategoryValue) {
  const p = new URLSearchParams();
  p.set('category', categoryValue);
  if (subcategoryValue) p.set('subcategory', subcategoryValue);
  return `/categoria-producto?${p.toString()}`;
}
