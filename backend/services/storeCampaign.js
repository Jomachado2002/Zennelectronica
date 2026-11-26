'use strict';

const ZONE = 'America/Asuncion';

const NARANJA = {
  id: 'naranja-bf',
  scene: 'naranja',
  from: '2026-11-26',
  to: '2026-11-27',
  label: 'Black Friday Tienda Naranja',
  reserve: 176,
  extraFeeds: 1,
  extraStories: 0,
  blackFriday: true,
  productPosts: 9,
  detail: 'El reintegro de Tienda Naranja es solo el 27 de noviembre. Los descuentos y las mejoras de precio ya están disponibles en Tienda Naranja. El 27: 20% de reintegro con tope de Gs. 500.000 en tarjetas de crédito Itaú, o 25% con tope de Gs. 700.000 en Amex Platinum y Visa Infinite. Hasta 18 cuotas sin interés.',
  lead: 'El reintegro de Tienda Naranja es solo el 27 de noviembre. Los descuentos y las mejoras de precio ya están disponibles en Tienda Naranja. El 27 hay 20% de reintegro con tope de Gs. 500.000 en tarjetas de crédito Itaú, o 25% con tope de Gs. 700.000 en Amex Platinum y Visa Infinite, más hasta 18 cuotas sin interés.',
  hooks: [
    'El reintegro de Tienda Naranja es solo el 27 de noviembre. Los descuentos y las mejoras de precio ya están disponibles ahí.',
    'El 27: 20% de reintegro con tarjeta Itaú, tope Gs. 500.000. Con Amex Platinum o Visa Infinite, 25% y tope Gs. 700.000.',
    'Hasta 18 cuotas sin interés el 27, más el reintegro. El precio con descuento ya está en Tienda Naranja.'
  ]
};

function dateKeyOf(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const value = date instanceof Date ? date : new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(value);
}

const ANGLES = [
  {
    id: 'halloween',
    from: '2026-10-30',
    to: '2026-11-01',
    label: 'Halloween',
    lead: 'Esta noche se juega. Halloween: el setup, el monitor o el auricular, con el precio de hoy.',
    brief: 'Halloween, del 30 de octubre al 1 de noviembre. El ángulo es jugar de noche: notebook gamer, monitor, auricular, teclado o mouse. Una frase concreta por pieza. Prohibido Octubre Rosa, lazo rosa y un "feliz Halloween" vacío.',
    opener: 'Del 30 al domingo 1 armo Halloween y sumo publicaciones de noche: notebook gamer, monitor, auricular, teclado o mouse. La plantilla es la de telarañas. Si querés otro rubro, decime.'
  }
];

const HALLOWEEN = {
  scene: 'halloween',
  from: '2026-10-30',
  to: '2026-11-01',
  extraFeeds: 3,
  extraStories: 2
};

function campaignOn(date) {
  const key = dateKeyOf(date || new Date());
  if (key >= NARANJA.from && key <= NARANJA.to) return NARANJA;
  return null;
}

function halloweenOn(date) {
  const key = dateKeyOf(date || new Date());
  if (key >= HALLOWEEN.from && key <= HALLOWEEN.to) return HALLOWEEN;
  return null;
}

function flyerSceneOn(date) {
  const night = halloweenOn(date);
  if (night) return night.scene;
  const campaign = campaignOn(date);
  return campaign ? campaign.scene : '';
}

function angleOn(date) {
  const key = dateKeyOf(date || new Date());
  return ANGLES.find((item) => key >= item.from && key <= item.to) || null;
}

module.exports = {
  NARANJA,
  ANGLES,
  campaignOn,
  HALLOWEEN,
  halloweenOn,
  flyerSceneOn,
  angleOn,
  dateKeyOf
};
