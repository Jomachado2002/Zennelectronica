'use strict';

const DEFAULT_CATEGORY = 'Tecnología e Informática;Otros artículos de tecnología;Otros artículos de tecnología';

const TN = {
  pcAcc: 'Tecnología e Informática;Computadoras y laptos;Accesorios y Complementos de Computadora',
  notebook: 'Tecnología e Informática;Computadoras y laptos;Notebooks y laptops',
  desktop: 'Tecnología e Informática;Computadoras y laptos;Computadoras de escritorio',
  celular: 'Tecnología e Informática;Celulares;Celulares',
  celularAcc: 'Tecnología e Informática;Celulares;Accesorios de Celulares',
  tablet: 'Tecnología e Informática;Tablets;Tablets',
  tabletAcc: 'Tecnología e Informática;Tablets;Accesorios de tablets',
  watch: 'Tecnología e Informática;Relojes inteligentes;Relojes inteligentes',
  watchAcc: 'Tecnología e Informática;Relojes inteligentes;Accesorios para relojes inteligentes',
  auricular: 'Tecnología e Informática;Auriculares y Parlantes;Auriculares',
  parlante: 'Tecnología e Informática;Auriculares y Parlantes;Parlantes',
  audioAcc: 'Tecnología e Informática;Auriculares y Parlantes;Accesorios para parlantes y auriculares',
  camara: 'Tecnología e Informática;Audio y video;Cámaras',
  camaraAcc: 'Tecnología e Informática;Audio y video;Accesorios de Cámara',
  micro: 'Tecnología e Informática;Audio y video;Microfonos y controladores de sonido',
  consola: 'Tecnología e Informática;Consola de juegos;Consola de juegos',
  consolaAcc: 'Tecnología e Informática;Consola de juegos;Accesorios de consola de juegos',
  impresora: 'Tecnología e Informática;Impresoras;Impresoras',
  impresoraAcc: 'Tecnología e Informática;Impresoras;Accesorios de Impresoras',
  tv: 'Tecnología e Informática;Televisión;Televisión',
  tvAcc: 'Tecnología e Informática;Televisión;Accesorios de Televisión',
  otrosTech: DEFAULT_CATEGORY,
  aire: 'Electrodomésticos;Climatización;Aire Acondicionado',
  ventilador: 'Electrodomésticos;Climatización;Ventiladores y Purificadores',
  heladera: 'Electrodomésticos;Cocina;Heladeras y congeladores',
  microondas: 'Electrodomésticos;Cocina;Microondas',
  cafetera: 'Electrodomésticos;Cocina;Cafeteras y Hervidoras',
  licuadora: 'Electrodomésticos;Cocina;Licuadoras',
  freidora: 'Electrodomésticos;Cocina;Freidoras',
  cocinaOtros: 'Electrodomésticos;Cocina;Otros electrodomésticos de cocina',
  tostadora: 'Electrodomésticos;Cocina;Tostadoras y sandwicheras',
  aspiradora: 'Electrodomésticos;Lavado y Limpieza;Aspiradoras e hidrolavadoras',
  lavarropa: 'Electrodomésticos;Lavado y Limpieza;Lavarropas',
  plancha: 'Electrodomésticos;Lavado y Limpieza;Planchas',
  electroAcc: 'Electrodomésticos;Accesorios para Electrodomésticos;Accesorios para Electrodomésticos',
  bellezaCorta: 'Electrodomésticos;Electrobelleza;Depiladores y corta pelo',
  bellezaSecador: 'Electrodomésticos;Electrobelleza;Secadores de pelo',
  bellezaOtros: 'Electrodomésticos;Electrobelleza;Otros accesorios de belleza',
  herram: 'Herramientas, Maquinarias y Ferretería;Herramientas;Herramientas eléctricas y de mano',
  herramAcc: 'Herramientas, Maquinarias y Ferretería;Herramientas;Accesorios de Herramientas',
  generador: 'Herramientas, Maquinarias y Ferretería;Maquinarias y Generadores;Generadores',
  mochila: 'Equipaje, bolsos y mochilas;Mochilas;Mochilas y maletines',
  maleta: 'Equipaje, bolsos y mochilas;Maletas;Maletas',
  seguridadCam: 'Hogar;Seguridad;Cámaras y Sensores',
  iluminacion: 'Hogar;Iluminación;Otros tipos de lamparas y veladores',
  autoAcc: 'Vehículos;Autos;Accesorios para autos',
  salud: 'Salud y belleza;Cuidado de la salud;Otros artículos de cuidado de la salud',
  deporte: 'Deporte y Aire libre;Elementos deportivos;Otros deportes'
};

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function has(text, ...needles) {
  return needles.some((needle) => text.includes(norm(needle)));
}

function electroFromName(name) {
  if (has(name, 'aire acondicionado', 'split ')) return TN.aire;
  if (has(name, 'ventilador', 'purificador')) return TN.ventilador;
  if (has(name, 'heladera', 'freezer', 'congelador')) return TN.heladera;
  if (has(name, 'microondas')) return TN.microondas;
  if (has(name, 'cafetera', 'hervidor')) return TN.cafetera;
  if (has(name, 'licuadora')) return TN.licuadora;
  if (has(name, 'freidora')) return TN.freidora;
  if (has(name, 'tostadora', 'sandwichera')) return TN.tostadora;
  if (has(name, 'aspiradora', 'aspirador', 'robot vacuum', 'hidrolavadora')) return TN.aspiradora;
  if (has(name, 'lavarropa', 'lavasecarropa')) return TN.lavarropa;
  if (has(name, 'plancha')) return TN.plancha;
  if (has(name, 'corta pelo', 'afeitadora', 'barbeador', 'depilador')) return TN.bellezaCorta;
  if (has(name, 'secador')) return TN.bellezaSecador;
  return TN.cocinaOtros;
}

function tnCategoryOf(product) {
  const cat = norm(product.category);
  const sub = norm(product.subcategory);
  const name = norm(product.productName);
  const blob = `${cat} ${sub} ${name} ${norm(product.brandName)}`;

  if (has(sub, 'aire_acondicionado') || has(name, 'aire acondicionado')) return TN.aire;
  if (has(sub, 'electrodomesticos')) return electroFromName(name);
  if (has(sub, 'corta_pelos') || has(sub, 'afeitadora')) return TN.bellezaCorta;
  if (has(sub, 'cubiertos_de_cocina') || has(name, 'parrilla electrica')) return TN.cocinaOtros;
  if (has(sub, 'herramientas')) return has(name, 'destornillador', 'kit de herramientas', 'taladro') ? TN.herram : TN.herramAcc;
  if (has(sub, 'generador')) return TN.generador;

  if (cat === 'apple') {
    if (has(sub, 'iphone')) return TN.celular;
    if (has(sub, 'ipad')) return TN.tablet;
    if (has(sub, 'macbook')) return TN.notebook;
    if (has(sub, 'imac')) return TN.desktop;
    if (has(sub, 'apple_watch')) return TN.watch;
    if (has(sub, 'airpods')) return TN.auricular;
    if (has(sub, 'mouse') || has(sub, 'teclado') || has(sub, 'trackpad')) return TN.pcAcc;
    return TN.otrosTech;
  }

  if (cat === 'celulares_y_tablets') {
    if (has(sub, 'tablet')) return TN.tablet;
    if (has(sub, 'accesorio')) return TN.celularAcc;
    if (has(sub, 'telefono')) return TN.otrosTech;
    return TN.celular;
  }

  if (cat === 'notebook_y_computadoras') {
    if (has(sub, 'mini_pc') || has(sub, 'pc_montado') || has(sub, 'computadoras__')) return TN.desktop;
    if (has(sub, 'fuente') || has(sub, 'cargador') || has(sub, 'bateria')) return TN.pcAcc;
    if (has(sub, 'notebook')) return TN.notebook;
    return TN.pcAcc;
  }

  if (cat === 'gabinetes' || cat === 'cooler' || cat === 'placas_madre' || cat === 'tarjetas_graficas'
    || cat === 'fuentes_de_alimentacion' || cat === 'procesadores' || cat === 'almacenamiento'
    || cat === 'red_y_internet' || cat === 'monitores') {
    return TN.pcAcc;
  }

  if (cat === 'impresoras_y_suministros') {
    if (has(sub, 'cartucho') || has(sub, 'toner') || has(sub, 'cinta') || has(sub, 'filamento')) return TN.impresoraAcc;
    return TN.impresora;
  }

  if (cat === 'perifericos') {
    if (has(sub, 'auricular')) return TN.auricular;
    if (has(sub, 'microfono')) return TN.micro;
    if (has(sub, 'mochila') || has(sub, 'maleta') || has(sub, 'funda')) return TN.mochila;
    if (has(sub, 'proyector')) return TN.otrosTech;
    if (has(sub, 'silla')) return TN.otrosTech;
    if (has(sub, 'webcam')) return TN.camara;
    return TN.pcAcc;
  }

  if (cat === 'electronicos') {
    if (has(sub, 'reloj_inteligente') || has(sub, 'pulsera')) return TN.watch;
    if (has(sub, 'speaker') || has(sub, 'home_theater') || has(sub, 'soundbar') || has(sub, 'radio_portatil') || has(sub, 'toca_radio')) return TN.parlante;
    if (has(sub, 'camaras_de_accion') || has(sub, 'camaras_de_vigilancia')) return TN.camara;
    if (has(sub, 'accesorios_para_camaras')) return TN.camaraAcc;
    if (has(sub, 'cctv') || has(sub, 'vigilancia') || has(sub, 'vigila_bebes')) return TN.seguridadCam;
    if (has(sub, 'tv__') || has(sub, 'television')) return TN.tv;
    if (has(sub, 'soporte_para_tv') || has(sub, 'control_para_tv') || has(sub, 'streaming') || has(sub, 'convertidor') || has(sub, 'receptores')) return TN.tvAcc;
    if (has(sub, 'consolas')) return TN.consola;
    if (has(sub, 'controles')) return TN.consolaAcc;
    if (has(sub, 'cargadores') || has(sub, 'baterias')) return TN.celularAcc;
    if (has(sub, 'iluminacion')) return TN.iluminacion;
    if (has(sub, 'accesorios_para_autos')) return TN.autoAcc;
    if (has(sub, 'estetoscopio') || has(sub, 'oximetro') || has(sub, 'termometro') || has(sub, 'balanza_digital')) return TN.salud;
    if (has(sub, 'patineta') || has(sub, 'scooter')) return TN.deporte;
    if (has(sub, 'drone')) return TN.otrosTech;
    return TN.otrosTech;
  }

  if (has(blob, 'iphone') && !has(blob, 'funda', 'cargador', 'cable', 'vidrio')) return TN.celular;
  if (has(blob, 'ipad') || (has(name, 'tablet') && !has(name, 'accesorio', 'pencil', 'capa'))) return TN.tablet;
  if (has(name, 'notebook', 'laptop', 'macbook') && !has(name, 'maleta', 'mochila', 'funda', 'cooler', 'base', 'soporte', 'memoria ram')) return TN.notebook;

  return DEFAULT_CATEGORY;
}

module.exports = {
  DEFAULT_CATEGORY,
  tnCategoryOf,
  TN
};
