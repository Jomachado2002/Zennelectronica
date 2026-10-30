'use strict';

const ZONE = 'America/Asuncion';

const NARANJA = {
  id: 'naranja',
  scene: 'naranja',
  from: '2026-11-02',
  to: '2026-11-04',
  label: 'Reintegro Tienda Naranja',
  reserve: 176,
  extraFeeds: 3,
  extraStories: 4,
  detail: 'Reintegro Itaú del 2 al 4. Toda la tienda.',
  lead: 'Del 2 al 4 de noviembre hay reintegro Itaú en toda la tienda. 15% con tope de Gs. 350.000 con cualquier tarjeta de crédito Itaú. 20% con tope de Gs. 500.000 con Amex Platinum y Visa Infinite. Hasta 18 cuotas sin interés. El reintegro lo asume Tienda Naranja: no es un descuento del precio.',
  hooks: [
    'Del 2 al 4 tu tarjeta Itaú te devuelve plata en toda la tienda.',
    '15% de reintegro, tope Gs. 350.000. Con Amex Platinum o Visa Infinite, 20% y tope Gs. 500.000.',
    'Hasta 18 cuotas sin interés, más el reintegro Itaú. Del 2 al 4, en todo el catálogo.'
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
    opener: 'Del 30 al 1 armo el día para Halloween: jugar de noche, no un saludo vacío. Octubre Rosa ya no entra. Si querés otro rubro o otra frase, decime y lo cambio.'
  }
];

const HALLOWEEN_SCENE = {
  scene: 'halloween',
  from: '2026-10-30',
  to: '2026-10-31'
};

function campaignOn(date) {
  const key = dateKeyOf(date || new Date());
  if (key >= NARANJA.from && key <= NARANJA.to) return NARANJA;
  return null;
}

function flyerSceneOn(date) {
  const key = dateKeyOf(date || new Date());
  if (key >= HALLOWEEN_SCENE.from && key <= HALLOWEEN_SCENE.to) return HALLOWEEN_SCENE.scene;
  const campaign = campaignOn(key);
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
  flyerSceneOn,
  angleOn,
  dateKeyOf
};
