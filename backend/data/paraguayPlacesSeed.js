'use strict';

/**
 * Semilla de departamentos + ciudades principales de Paraguay.
 * Usado para SEO de envíos (no implica depósito local).
 */

function slugify(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** @type {Array<{ name: string, cities: string[], priority?: number }>} */
const DEPARTMENTS = [
  {
    name: 'Asunción',
    priority: 1,
    cities: ['Asunción']
  },
  {
    name: 'Central',
    priority: 2,
    cities: [
      'Luque',
      'San Lorenzo',
      'Capiatá',
      'Lambaré',
      'Fernando de la Mora',
      'Limpio',
      'Ñemby',
      'Mariano Roque Alonso',
      'Villa Elisa',
      'Itauguá',
      'Itá',
      'Areguá',
      'San Antonio',
      'Ypané'
    ]
  },
  {
    name: 'Alto Paraná',
    priority: 3,
    cities: [
      'Ciudad del Este',
      'Presidente Franco',
      'Hernandarias',
      'Mingá Guazú',
      'Santa Rita',
      'Doctor Juan León Mallorquín'
    ]
  },
  {
    name: 'Itapúa',
    priority: 4,
    cities: ['Encarnación', 'Cambyretá', 'Hohenau', 'Obligado', 'Capitán Miranda', 'Fram']
  },
  {
    name: 'Caaguazú',
    priority: 5,
    cities: ['Coronel Oviedo', 'Caaguazú', 'Repatriación', 'Juan Manuel Frutos']
  },
  {
    name: 'Cordillera',
    priority: 10,
    cities: ['Caacupé', 'Tobatí', 'Eusebio Ayala', 'Piribebuy', 'Arroyos y Esteros']
  },
  {
    name: 'Guairá',
    priority: 10,
    cities: ['Villarrica', 'Borja', 'Independencia', 'Ñúmí']
  },
  {
    name: 'Concepción',
    priority: 8,
    cities: ['Concepción', 'Horqueta', 'Loreto', 'Belén']
  },
  {
    name: 'San Pedro',
    priority: 9,
    cities: ['San Pedro de Ycuamandiyú', 'Santaní', 'Capiibary', 'Lima']
  },
  {
    name: 'Amambay',
    priority: 8,
    cities: ['Pedro Juan Caballero', 'Bella Vista Norte', 'Capitán Bado']
  },
  {
    name: 'Canindeyú',
    priority: 12,
    cities: ['Salto del Guairá', 'Curuguaty', 'Katueté']
  },
  {
    name: 'Paraguarí',
    priority: 11,
    cities: ['Paraguarí', 'Carapeguá', 'Yaguarón', 'La Colmena']
  },
  {
    name: 'Misiones',
    priority: 12,
    cities: ['San Juan Bautista', 'San Ignacio', 'Ayolas', 'Santa Rosa']
  },
  {
    name: 'Ñeembucú',
    priority: 14,
    cities: ['Pilar', 'Alberdi', 'Villa Franca']
  },
  {
    name: 'Presidente Hayes',
    priority: 13,
    cities: ['Villa Hayes', 'Benjamín Aceval', 'Nanawa']
  },
  {
    name: 'Boquerón',
    priority: 15,
    cities: ['Filadelfia', 'Loma Plata', 'Mariscal Estigarribia']
  },
  {
    name: 'Alto Paraguay',
    priority: 16,
    cities: ['Fuerte Olimpo', 'Carmelo Peralta']
  },
  {
    name: 'Caazapá',
    priority: 14,
    cities: ['Caazapá', 'San Juan Nepomuceno', 'Yuty']
  }
];

function buildParaguayPlaceDocs() {
  const docs = [];
  const seen = new Set();

  for (const dep of DEPARTMENTS) {
    const departmentSlug = slugify(dep.name);
    const depPriority = dep.priority || 50;

    if (!seen.has(departmentSlug)) {
      seen.add(departmentSlug);
      docs.push({
        placeType: 'department',
        name: dep.name,
        slug: departmentSlug,
        departmentName: dep.name,
        departmentSlug,
        priority: depPriority,
        isActive: true,
        aliases: []
      });
    }

    for (const cityName of dep.cities || []) {
      let citySlug = slugify(cityName);
      // Evitar colisión Asunción departamento/ciudad
      if (citySlug === departmentSlug && dep.name !== cityName) {
        citySlug = `${citySlug}-ciudad`;
      }
      if (citySlug === departmentSlug && dep.name === cityName && dep.name === 'Asunción') {
        // Solo el departamento/capital Asunción (un registro)
        continue;
      }
      if (citySlug === departmentSlug) {
        // Ciudad homónima al departamento (Concepción, Caaguazú…): slug ciudad-xxx
        citySlug = `${citySlug}-ciudad`;
      }
      if (seen.has(citySlug)) continue;
      seen.add(citySlug);
      docs.push({
        placeType: 'city',
        name: cityName,
        slug: citySlug,
        departmentName: dep.name,
        departmentSlug,
        priority: depPriority + 20,
        isActive: true,
        aliases: []
      });
    }
  }

  return docs;
}

/** Categorías/subcategorías que generan landings con envío a cada lugar. */
const GEO_SEO_TARGETS = [
  {
    category: 'celulares_y_tablets',
    subcategory: 'smartphones_y_celulares__32_01',
    phrase: 'Celulares'
  },
  {
    category: 'celulares_y_tablets',
    subcategory: '',
    phrase: 'Celulares y tablets'
  },
  {
    category: 'placas_madre',
    subcategory: '',
    phrase: 'Placas madre'
  },
  {
    category: 'notebook_y_computadoras',
    subcategory: 'notebook__20_03',
    phrase: 'Notebooks'
  },
  {
    category: 'monitores',
    subcategory: 'monitores__27',
    phrase: 'Monitores'
  },
  {
    category: 'perifericos',
    subcategory: '',
    phrase: 'Periféricos'
  },
  {
    category: 'impresoras_y_suministros',
    subcategory: '',
    phrase: 'Impresoras y suministros'
  },
  {
    category: 'almacenamiento',
    subcategory: 'ssd__21_03',
    phrase: 'SSD'
  },
  {
    category: 'tarjetas_graficas',
    subcategory: '',
    phrase: 'Tarjetas gráficas'
  },
  {
    category: 'procesadores',
    subcategory: '',
    phrase: 'Procesadores'
  },
  {
    category: 'red_y_internet',
    subcategory: '',
    phrase: 'Red e internet'
  },
  {
    category: 'gabinetes',
    subcategory: '',
    phrase: 'Gabinetes'
  }
];

module.exports = {
  slugify,
  DEPARTMENTS,
  buildParaguayPlaceDocs,
  GEO_SEO_TARGETS
};
