const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const CREA = path.join(__dirname, '../../docs/creativos');
const OUT = path.join(__dirname, '../../docs/Sistema-Creativo-Zenn.pdf');

const NAVY = '#1E1B4B';
const PURPLE = '#7B2CBF';
const CYAN = '#0E7490';
const DARK = '#111827';
const GRAY = '#374151';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';
const WASH = '#F5F3FF';
const WHITE = '#FFFFFF';
const SOFT = '#F9FAFB';

const PAGE_W = 595.28;
const L = 42;
const R = 42;
const CW = PAGE_W - L - R;
const YMAX = 798;

const doc = new PDFDocument({
  size: 'A4',
  bufferPages: true,
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
  info: {
    Title: 'Sistema creativo y plan de pauta — Zenn Electrónicos',
    Author: 'Zenn Electrónicos',
  },
});

const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

let y = 0;
let started = false;

function topBar() {
  doc.rect(0, 0, PAGE_W, 8).fill(PURPLE);
  doc.rect(0, 8, PAGE_W, 1.5).fill(CYAN);
}
function footer(i, total) {
  const fy = 812;
  doc.save();
  doc.moveTo(L, fy).lineTo(PAGE_W - R, fy).strokeColor(LINE).lineWidth(0.6).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(MUTED);
  doc.text('Sistema creativo Zenn  ·  docs/creativos/', L, fy + 8, { width: 360 });
  doc.text(`${i} / ${total}`, PAGE_W - R - 50, fy + 8, { width: 50, align: 'right' });
  doc.restore();
}
function startPage() {
  if (started) doc.addPage();
  started = true;
  topBar();
  y = 26;
}
function need(h) {
  if (y + h > YMAX) startPage();
}
function measure(t, w, size, gap = 1.5) {
  doc.font('Helvetica').fontSize(size);
  return doc.heightOfString(String(t), { width: w, lineGap: gap });
}
function h1(t) {
  need(32);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(NAVY).text(t, L, y, { width: CW });
  y = doc.y + 8;
}
function h2(t) {
  need(24);
  y += 2;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(PURPLE).text(t, L, y, { width: CW });
  y = doc.y + 5;
}
function body(t) {
  need(24);
  doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text(t, L, y, { width: CW, lineGap: 1.6 });
  y = doc.y + 6;
}
function bullets(items) {
  items.forEach((item) => {
    const h = measure(item, CW - 14, 9.5, 1.3) + 3;
    need(h);
    doc.circle(L + 3, y + 5, 1.5).fill(PURPLE);
    doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text(item, L + 12, y, { width: CW - 14, lineGap: 1.3 });
    y = doc.y + 2;
  });
  y += 4;
}
function note(title, t) {
  const textH = measure(t, CW - 20, 9, 1.5);
  const h = 14 + textH + 16;
  need(h + 4);
  doc.save();
  doc.roundedRect(L, y, CW, h, 5).fill(SOFT);
  doc.roundedRect(L, y, CW, h, 5).strokeColor(LINE).lineWidth(0.7).stroke();
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text(title, L + 10, y + 8, { width: CW - 20 });
  doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(t, L + 10, y + 22, { width: CW - 20, lineGap: 1.5 });
  y += h + 8;
}
function table(headers, rows, widths) {
  const cols = widths || headers.map(() => CW / headers.length);
  const padX = 4;
  const rhs = rows.map((row) => {
    let m = 16;
    row.forEach((c, i) => {
      m = Math.max(m, measure(c, cols[i] - padX * 2, 8, 1.1) + 8);
    });
    return m;
  });
  need(18 + rhs[0]);
  let x = L;
  doc.save();
  doc.rect(L, y, CW, 18).fill(NAVY);
  headers.forEach((h, i) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE).text(h, x + padX, y + 5, { width: cols[i] - padX * 2 });
    x += cols[i];
  });
  doc.restore();
  y += 18;
  rows.forEach((row, ri) => {
    const rh = rhs[ri];
    if (y + rh > YMAX) startPage();
    if (ri % 2 === 0) {
      doc.save();
      doc.rect(L, y, CW, rh).fill(SOFT);
      doc.restore();
    }
    let cx = L;
    row.forEach((cell, i) => {
      doc.font('Helvetica').fontSize(8).fillColor(DARK).text(String(cell), cx + padX, y + 4, {
        width: cols[i] - padX * 2,
        lineGap: 1.1,
      });
      cx += cols[i];
    });
    y += rh;
  });
  y += 8;
}
function img(file, maxH = 240) {
  const p = path.join(CREA, file);
  if (!fs.existsSync(p)) return;
  need(maxH + 8);
  doc.image(p, L, y, { fit: [CW, maxH], align: 'center' });
  y += maxH + 8;
}

/* P1 */
startPage();
doc.rect(0, 8, PAGE_W, 150).fill(NAVY);
doc.font('Helvetica').fontSize(9).fillColor('#67E8F9').text('SISTEMA CREATIVO  ·  AGOSTO 2026', L, 26);
doc.font('Helvetica-Bold').fontSize(20).fillColor(WHITE).text('Catálogo de marcas,', L, 48);
doc.font('Helvetica-Bold').fontSize(20).fillColor(WHITE).text('gráficos y plan de pauta', L, 74);
doc.font('Helvetica').fontSize(10).fillColor('#DDD6FE').text(
  'Plantillas listas en docs/creativos/  ·  Recrealas en Adobe Express  ·  Pauta Meta + Google',
  L,
  108,
  { width: CW }
);
y = 176;
body(
  'Este documento es el manual de diseño de Zenn. Los PNG de la carpeta docs/creativos/ ya están en el tamaño correcto para Instagram, Meta y Google. En Express no inventés otra paleta: copiá estos layouts, cambiá la foto del producto y el precio del día.'
);

h2('Archivos que ya están generados');
table(
  ['Archivo', 'Medida', 'Dónde se usa'],
  [
    ['00-sistema-visual.png', '1920×1080', 'Referencia de marca (no pautar)'],
    ['01-ig-post-notebook.png', '1080×1350', 'Feed IG / pauta Meta 4:5'],
    ['02-ig-story-notebook.png', '1080×1920', 'Stories, Reels, pauta IG'],
    ['03-meta-cuadrado-xiaomi.png', '1080×1080', 'Feed Meta / WhatsApp ads'],
    ['04-google-display-notebook.png', '1200×628', 'Google Display / PMax landscape'],
    ['05-story-confianza-24h.png', '1080×1920', 'Objeción “¿y si no llega?”'],
    ['06-ig-post-redragon.png', '1080×1350', 'Gaming · Reels / feed'],
    ['07-google-cuadrado-xiaomi.png', '1200×1200', 'Google Display square'],
    ['08-catalogo-marcas.png', '1920×1080', 'Qué marcas pautar'],
    ['09-meta-paisaje-redragon.png', '1200×628', 'Meta landscape / Audience Network'],
  ],
  [200, 110, CW - 310]
);

note(
  'Modelo operativo (no lo contradigas en el gráfico)',
  'Depósito en Ciudad del Este. Oficinas administrativas en Asunción. Entrega ~24 h después del pago. Sello obligatorio: ENTREGA ASUNCIÓN 24 H. Prohibido: retiro, stock en Asunción, dropshipping.'
);

/* P2 sistema */
startPage();
h1('1. Sistema visual (copiá esto en Express)');
img('00-sistema-visual.png', 250);
h2('Brand Kit — cargalo hoy');
table(
  ['Token', 'HEX', 'Uso'],
  [
    ['Navy', '#1E1B4B', 'Barras, títulos, fondo confianza'],
    ['Violeta', '#7B2CBF', 'Botón CTA, categoría'],
    ['Cian', '#00B5D8', 'Precio y sello 24 h'],
    ['Gris producto', '#E8EAED', 'Fondo de foto (el que pediste)'],
    ['Gamer', '#111827', 'Solo Redragon / setup'],
    ['Blanco', '#FFFFFF', 'Card de precio y Google'],
  ],
  [110, 90, CW - 200]
);
h2('Tipografía');
bullets([
  'Título: Inter Bold o Poppins Bold. Si Express no las tiene: Adobe Clean Bold.',
  'Cuerpo: Inter Regular 18–22 px en el lienzo de 1080.',
  'Precio: Inter Bold, color cian, Gs. con puntos. Nunca “3,7 millones”.',
  'Máximo 6 palabras en el título del producto. “ASUS Vivobook 15”, no el nombre de 30 palabras del proveedor.',
]);

/* P3 layout producto */
startPage();
h1('2. Layout producto (fondo gris)');
body(
  'Este es el creativo madre. Foto centrada, fondo #E8EAED, barra navy arriba, card blanca abajo. Recrealo en Express duplicando 01-ig-post-notebook.png como referencia visual.'
);
img('01-ig-post-notebook.png', 320);
h2('Medidas en lienzo 1080×1350 (Express)');
table(
  ['Zona', 'px', 'Contenido'],
  [
    ['Barra top', '0–88', 'Logo izq · sello 24 h der, cian'],
    ['Foto', '88–1020', 'Producto recortado, centrado, sin mesa sucia'],
    ['Card blanca', '1020–1350', 'Categoría violeta · nombre navy · specs gris · precio cian · CTA'],
    ['Botón', 'alto 56, radio 28', 'Violeta #7B2CBF · texto blanco · un solo CTA'],
    ['Márgenes', '48 px', 'Nada pegado al borde (IG recorta)'],
  ],
  [100, 140, CW - 240]
);

/* P4 más piezas */
startPage();
h1('3. El resto de piezas (una por objetivo)');
h2('Story / pauta vertical — conversión WhatsApp');
img('02-ig-story-notebook.png', 210);
h2('Confianza — la que consigue clientes indecisos');
img('05-story-confianza-24h.png', 210);
body(
  'Usá la 05 en Meta (objetivo Mensajes) y como Reel orgánico. El gancho es la objeción, no el producto. Destiná el 25% del presupuesto Meta a esta pieza el primer mes.'
);

startPage();
h2('Google Display 1200×628 — Search/PMax');
img('04-google-display-notebook.png', 150);
h2('Gaming — fondo oscuro, solo este estilo');
img('06-ig-post-redragon.png', 210);
h2('Cuadrado Meta 1080×1080');
img('03-meta-cuadrado-xiaomi.png', 180);

/* P5 marcas + pauta */
startPage();
h1('4. Catálogo de marcas (qué pautar)');
img('08-catalogo-marcas.png', 250);
body(
  'Orden de prioridad para creativos: 1 Xiaomi  2 ASUS/Dell/HP  3 Redragon  4 Kingston/SSD  5 TP-Link/Hikvision. Satellite, FTX y Macrovip se venden por precio, no como marca hero.'
);

h2('Plan de pauta — mes 1');
table(
  ['Canal', 'Gs./mes', '%', 'Creativo a subir'],
  [
    ['Google Shopping', '700.000', '45%', 'Feed (no imagen): fichas con stock'],
    ['Google Display/PMax', '150.000', '10%', '04 y 07'],
    ['Meta WhatsApp (producto)', '250.000', '16%', '01, 02, 03'],
    ['Meta WhatsApp (confianza)', '250.000', '16%', '05'],
    ['Meta remarketing', '150.000', '10%', '01 + 05 a visitantes 30 días'],
    ['Total mínimo útil', '800.000', '', 'Si no llega a 1,5 M, recortá Display'],
    ['Total recomendado', '1.500.000', '', 'Aprende en 14 días y escalá lo que trae chats'],
  ],
  [160, 90, 50, CW - 300]
);

note(
  'Diario',
  'Meta: Gs. 15.000–25.000/día por campaña. Google Shopping: el resto. Ubicación Paraguay, puja +30% Asunción y Central. Excluí otros países. Feed: stock > 0 y precio < Gs. 10 M.'
);

startPage();
h1('5. Cómo recrear en Adobe Express (12 min)');
table(
  ['Paso', 'Hacer'],
  [
    ['1', 'Marca → Brand Kit: logo PNG, 6 HEX de la página 2, fuente Inter.'],
    ['2', 'Crear → Tamaño 1080×1350. Fondo #E8EAED.'],
    ['3', 'Rectángulo navy 1080×88 arriba. Logo izq. Texto “ENTREGA ASUNCIÓN 24 H” der, cian, Bold.'],
    ['4', 'Foto del producto de zenn.com.py → Quitar fondo → centrar en el 70% superior.'],
    ['5', 'Rectángulo blanco abajo. Categoría violeta. Nombre navy. Specs gris. Precio cian.'],
    ['6', 'Botón violeta: “Comprá en zenn.com.py” o “Escribí al WhatsApp”. Uno solo.'],
    ['7', 'Exportar PNG. Redimensionar a 1080×1920 y 1080×1080. Mismo archivo, tres medidas.'],
    ['8', 'Para pauta: subí 02 o 05 a Meta (9:16) y 04 a Google (1.91:1).'],
  ],
  [40, CW - 40]
);

h2('Copies de pauta (pegar tal cual)');
body(
  'Meta WhatsApp — título: Notebook con entrega en Asunción en 24 h. Texto: Depósito en Ciudad del Este, atención en Asunción. Pagás hoy y mañana te llega. Gs. [precio]. CTA: Enviar mensaje.'
);
body(
  'Meta confianza — título: ¿Y si pago y no me llega? Texto: Por eso te mandamos foto del paquete el mismo día. Sale de CDE, mañana está en Asunción. Zenn Electrónicos. CTA: Enviar mensaje.'
);
body(
  'Google — titular 1: Notebook Asunción 24 h. Titular 2: ASUS Vivobook 15. Descripción: Pagás hoy en zenn.com.py. Entrega mañana. Depósito CDE. WhatsApp 0973 345 284.'
);

h2('Qué genera interacción (y qué no)');
table(
  ['Sí (sube comentarios/chats)', 'No (la gente scrollea)'],
  [
    ['Pregunta en el primer renglón', 'Catálogo de 12 productos en un post'],
    ['Precio grande en cian', '“Consultar precio”'],
    ['Plazo 24 h visible', '“Envíos a todo el país” sin plazo'],
    ['Un producto nítido sobre gris', 'Collage recortado mal'],
    ['CTA único a WhatsApp o web', 'Linktree con 8 botones'],
    ['Foto de paquete real (pieza 05)', 'Stock genérico de “sonrisa corporativa”'],
  ],
  [CW / 2, CW / 2]
);

h2('7 días para poner esto a vender');
table(
  ['Día', 'Acción'],
  [
    ['1', 'Brand Kit Express + bio IG con 24 h. Destacada Entregas.'],
    ['2', 'Duplicar pieza 01 con Vivobook y pieza 06 con Redragon (precio del día).'],
    ['3', 'Publicar 01 en feed + 05 en Stories. Responder DMs con el speech de 24 h.'],
    ['4', 'Subir 04 y 07 a Google Display. Encender Shopping (solo stock).'],
    ['5', 'Campaña Meta WhatsApp: 02 + 03. Gs. 20 mil/día.'],
    ['6', 'Campaña Meta confianza: 05. Gs. 15 mil/día. Público Asunción 18–45.'],
    ['7', 'Mirar chats. Duplicar el creativo que pregunta “¿cuándo llega?”. Matar CTR < 0,6%.'],
  ],
  [40, CW - 40]
);

note(
  'Regla de oro',
  'Fondo gris, producto al centro, precio cian, sello 24 h, un botón violeta. Si falta una de esas cinco, no publiques.'
);

const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  footer(i + 1, range.count);
}
doc.end();
stream.on('finish', () => console.log('PDF', OUT, 'paginas', range.count));
