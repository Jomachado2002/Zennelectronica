'use strict';

/**
 * Única fuente para vitrinas del home (Mongo / Visão): API + rutas «Ver más» del cliente.
 * Tras cada full mirror/export de categorías, se valida contra Mongo y se regenera
 * `frontend/src/config/homeSlotNavRoutes.generated.js` (primer par de cada slot = navegación).
 *
 * Si Visão cambia `value`: actualizar aquí; el validador (`npm run validate-home-slots`)
 * y el mensaje tras export te avisan si algo no existe.
 */

const HOME_SLOT_DEFS = [
    {
        key: 'notebooks',
        limit: 20,
        pairs: [{ category: 'notebook_y_computadoras', subcategory: 'notebook__20_03' }]
    },
    {
        key: 'celulares',
        limit: 20,
        pairs: [
            { category: 'celulares_y_tablets', subcategory: 'celulares__32_01' },
            { category: 'celulares_y_tablets', subcategory: 'telefonos__32_03' }
        ]
    },
    {
        key: 'placas_madre',
        limit: 20,
        pairs: [
            { category: 'placas_madres', subcategory: 'mb_intel__22_01' },
            { category: 'placas_madres', subcategory: 'mb_amd__22_02' }
        ]
    },
    {
        key: 'mouses',
        limit: 12,
        pairs: [{ category: 'perifericos', subcategory: 'mouse__30_03' }]
    },
    {
        key: 'monitores',
        limit: 20,
        pairs: [{ category: 'monitores', subcategory: 'monitores__27' }]
    },
    {
        key: 'memorias_ram',
        limit: 20,
        pairs: [
            { category: 'almacenamiento', subcategory: 'memoria_ram_pc__21_01_01' },
            { category: 'almacenamiento', subcategory: 'memoria_ram_notebook__21_01_02' }
        ]
    },
    {
        key: 'discos',
        limit: 20,
        pairs: [
            { category: 'almacenamiento', subcategory: 'ssd_m_2_nvme__21_03_03' },
            { category: 'almacenamiento', subcategory: 'hd_interno__21_02_01' },
            { category: 'almacenamiento', subcategory: 'ssd_2_5__21_03_02' },
            { category: 'almacenamiento', subcategory: 'pendrive__21_04' }
        ]
    },
    {
        key: 'tarjetas_graficas',
        limit: 20,
        pairs: [
            { category: 'tarjetas_graficas', subcategory: 'vga_nvidia__23_01' },
            { category: 'tarjetas_graficas', subcategory: 'vga_radeon__23_02' },
            { category: 'tarjetas_graficas', subcategory: 'vga_intel__23_03' }
        ]
    },
    {
        key: 'apple',
        limit: 20,
        pairs: [
            { category: 'apple', subcategory: 'iphone__19_04' },
            { category: 'apple', subcategory: 'macbook__19_02' },
            { category: 'apple', subcategory: 'ipad__19_05' },
            { category: 'apple', subcategory: 'accesorios__19_14' }
        ]
    },
    {
        key: 'procesadores',
        limit: 20,
        pairs: [
            { category: 'procesadores', subcategory: 'cpu_intel__24_01' },
            { category: 'procesadores', subcategory: 'cpu_amd__24_02' },
            { category: 'procesadores', subcategory: 'cpu_oem__24_03' }
        ]
    },
    {
        key: 'teclados',
        limit: 12,
        pairs: [{ category: 'perifericos', subcategory: 'teclados__30_02' }]
    }
];

/** Primer `pairs[i]` por slot → enlaces `Ver más` y hrefs relativos del home */
function buildHomeSlotNavRoutes() {
    /** @type {Record<string, { category: string, subcategory: string }>} */
    const routes = {};
    for (const def of HOME_SLOT_DEFS) {
        const first = def.pairs[0];
        if (!first) {
            throw new Error(`HOME_SLOT_DEFS: slot "${def.key}" sin pairs`);
        }
        routes[def.key] = { category: first.category, subcategory: first.subcategory };
    }
    return routes;
}

module.exports = {
    HOME_SLOT_DEFS,
    buildHomeSlotNavRoutes
};
