'use strict';

/**
 * Seed / fallback de vitrinas del home (Fase 1 CMS).
 * Si Mongo no tiene secciones, se usan estos defaults.
 */

const { HOME_SLOT_DEFS } = require('./homeFeaturedSlots');

const TITLES = {
    notebooks: 'Notebooks de Alto Rendimiento',
    celulares: 'Celulares',
    placas_madre: 'Placas Madre',
    mouses: 'Mouses',
    monitores: 'Monitores',
    memorias_ram: 'Memorias RAM',
    discos: 'Discos Duros',
    tarjetas_graficas: 'Tarjetas Gráficas',
    apple: 'Apple',
    procesadores: 'Procesadores',
    teclados: 'Teclados'
};

const SUBTITLES = {
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

const LAYOUTS = {
    notebooks: 'hero',
    celulares: 'full',
    placas_madre: 'full',
    mouses: 'grid',
    monitores: 'grid',
    memorias_ram: 'grid',
    discos: 'grid',
    tarjetas_graficas: 'grid',
    apple: 'grid',
    procesadores: 'grid',
    teclados: 'grid'
};

function buildHomeSectionDefaults() {
    return HOME_SLOT_DEFS.map((def, index) => {
        const first = def.pairs[0];
        return {
            key: def.key,
            title: TITLES[def.key] || def.key,
            subtitle: SUBTITLES[def.key] || '',
            layout: LAYOUTS[def.key] || 'grid',
            enabled: true,
            order: (index + 1) * 10,
            limit: def.limit,
            pairs: def.pairs.map((p) => ({
                category: p.category,
                subcategory: p.subcategory
            })),
            verMas: {
                category: first.category,
                subcategory: first.subcategory
            },
            filters: {
                brandNames: [],
                priceMin: null,
                priceMax: null,
                minStock: 1
            }
        };
    });
}

module.exports = {
    TITLES,
    SUBTITLES,
    LAYOUTS,
    buildHomeSectionDefaults
};
