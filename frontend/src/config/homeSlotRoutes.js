/**
 * Subtítulos de copy en el home (editables).
 * Rutas `HOME_SLOT_ROUTES`: generadas desde backend/config/homeFeaturedSlots.js
 * → `homeSlotNavRoutes.generated.js` (mirror con export frontend o `npm run generate-home-slot-routes`).
 */
import { HOME_SLOT_ROUTES } from './homeSlotNavRoutes.generated';
export { HOME_SLOT_ROUTES };

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

export function categoriaProductoHref(categoryValue, subcategoryValue) {
  const p = new URLSearchParams();
  p.set('category', categoryValue);
  if (subcategoryValue) p.set('subcategory', subcategoryValue);
  return `/categoria-producto?${p.toString()}`;
}

/** Listado principal de celulares (mismo par que `HOME_SLOT_ROUTES.celulares` / backend homeFeaturedSlots). */
export function getCelularesListingHref() {
  return categoriaProductoHref(HOME_SLOT_ROUTES.celulares.category, HOME_SLOT_ROUTES.celulares.subcategory);
}
