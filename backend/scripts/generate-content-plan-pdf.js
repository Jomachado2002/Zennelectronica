const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUT = path.join(__dirname, '../../docs/Plan-Contenido-Zenn-Electronica.pdf');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

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
const PAGE_H = 841.89;
const L = 48;
const R = 48;
const CW = PAGE_W - L - R;
const YMAX = 798;

function measure(text, width, size, lineGap = 1.6) {
  doc.font('Helvetica').fontSize(size);
  return doc.heightOfString(String(text), { width, lineGap });
}

const doc = new PDFDocument({
  size: 'A4',
  bufferPages: true,
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
  info: {
    Title: 'Plan comercial Zenn Electrónicos',
    Author: 'Zenn Electrónicos',
    Subject: 'Speech, confianza, contenido y pautas — modelo CDE a Asunción',
  },
});

const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

let y = 0;
let pageStarted = false;

function topBar() {
  doc.rect(0, 0, PAGE_W, 8).fill(PURPLE);
  doc.rect(0, 8, PAGE_W, 1.5).fill(CYAN);
}

function footerForPage(i, total) {
  const fy = 812;
  doc.save();
  doc.moveTo(L, fy).lineTo(PAGE_W - R, fy).strokeColor(LINE).lineWidth(0.6).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(MUTED);
  doc.text('Zenn Electrónicos  ·  www.zenn.com.py  ·  @zennelectronicos', L, fy + 8, { width: 360 });
  doc.text(`${i} / ${total}`, PAGE_W - R - 50, fy + 8, { width: 50, align: 'right' });
  doc.restore();
}

function startPage() {
  if (pageStarted) doc.addPage();
  pageStarted = true;
  topBar();
  y = 28;
}

function gap(n = 8) {
  y += n;
}

function need(h) {
  if (y + h > YMAX) startPage();
}

function h1(t) {
  need(36);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text(t, L, y, { width: CW });
  y = doc.y + 8;
}

function h2(t) {
  need(28);
  y += 4;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(PURPLE).text(t, L, y, { width: CW });
  y = doc.y + 6;
}

function body(t) {
  need(28);
  doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text(t, L, y, { width: CW, align: 'left', lineGap: 1.8 });
  y = doc.y + 7;
}

function bullets(items) {
  items.forEach((item) => {
    const h = measure(item, CW - 14, 9.5, 1.4) + 4;
    need(h);
    doc.circle(L + 3, y + 5, 1.6).fill(PURPLE);
    doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text(item, L + 12, y, { width: CW - 14, lineGap: 1.4 });
    y = doc.y + 3;
  });
  y += 4;
}

function quote(t) {
  const pad = 10;
  const textH = measure(t, CW - 28, 9.5, 2);
  const h = textH + pad * 2;
  need(h + 4);
  doc.save();
  doc.roundedRect(L, y, CW, h, 5).fill(WASH);
  doc.rect(L, y, 4, h).fill(PURPLE);
  doc.restore();
  doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(NAVY).text(t, L + 14, y + pad, {
    width: CW - 28,
    lineGap: 2,
  });
  y += h + 8;
}

function note(title, t) {
  const titleH = 14;
  const textH = measure(t, CW - 20, 9, 1.6);
  const h = titleH + textH + 16;
  need(h + 4);
  doc.save();
  doc.roundedRect(L, y, CW, h, 5).fill(SOFT);
  doc.roundedRect(L, y, CW, h, 5).strokeColor(LINE).lineWidth(0.8).stroke();
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text(title, L + 10, y + 8, { width: CW - 20 });
  doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(t, L + 10, y + 22, { width: CW - 20, lineGap: 1.6 });
  y += h + 8;
}

function table(headers, rows, widths) {
  const cols = widths || headers.map(() => CW / headers.length);
  const x0 = L;
  const padX = 5;
  const minRow = 16;

  const rowHeights = rows.map((row) => {
    let maxH = minRow;
    row.forEach((cell, i) => {
      const h = measure(cell, cols[i] - padX * 2, 8, 1.2);
      maxH = Math.max(maxH, h + 8);
    });
    return maxH;
  });

  need(18 + rowHeights[0]);
  let x = x0;
  doc.save();
  doc.rect(x0, y, CW, 18).fill(NAVY);
  headers.forEach((h, i) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE).text(h, x + padX, y + 5, {
      width: cols[i] - padX * 2,
    });
    x += cols[i];
  });
  doc.restore();
  y += 18;

  rows.forEach((row, ri) => {
    const rh = rowHeights[ri];
    if (y + rh > YMAX) {
      startPage();
      let hx = x0;
      doc.save();
      doc.rect(x0, y, CW, 18).fill(NAVY);
      headers.forEach((h, i) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE).text(h, hx + padX, y + 5, {
          width: cols[i] - padX * 2,
        });
        hx += cols[i];
      });
      doc.restore();
      y += 18;
    }
    if (ri % 2 === 0) {
      doc.save();
      doc.rect(x0, y, CW, rh).fill(SOFT);
      doc.restore();
    }
    let cx = x0;
    row.forEach((cell, i) => {
      doc.font('Helvetica').fontSize(8).fillColor(DARK).text(String(cell), cx + padX, y + 4, {
        width: cols[i] - padX * 2,
        lineGap: 1.2,
      });
      cx += cols[i];
    });
    y += rh;
  });
  y += 8;
}

function kpis(items) {
  const n = items.length;
  const gapW = 8;
  const w = (CW - gapW * (n - 1)) / n;
  const h = 42;
  need(h + 8);
  items.forEach((it, i) => {
    const x = L + i * (w + gapW);
    doc.save();
    doc.roundedRect(x, y, w, h, 4).fill(i === 0 ? NAVY : WASH);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(12).fillColor(i === 0 ? WHITE : NAVY).text(it.v, x + 8, y + 8, { width: w - 16 });
    doc.font('Helvetica').fontSize(7.5).fillColor(i === 0 ? '#C4B5FD' : MUTED).text(it.l, x + 8, y + 24, { width: w - 16 });
  });
  y += h + 10;
}

function speechBox(label, t) {
  const labelH = 12;
  const textH = measure(t, CW - 20, 9, 1.8);
  const h = labelH + textH + 22;
  need(h + 6);
  doc.save();
  doc.roundedRect(L, y, CW, h, 5).fill('#F8FAFC');
  doc.roundedRect(L, y, CW, h, 5).strokeColor('#CBD5E1').lineWidth(0.7).stroke();
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(CYAN).text(label.toUpperCase(), L + 10, y + 7, { width: CW - 20 });
  doc.font('Helvetica').fontSize(9).fillColor(DARK).text(t, L + 10, y + 20, { width: CW - 20, lineGap: 1.8 });
  y += h + 8;
}

/* ===================== P1 PORTADA ===================== */
startPage();
doc.rect(0, 8, PAGE_W, 168).fill(NAVY);
doc.font('Helvetica').fontSize(9).fillColor('#67E8F9').text('PLAYBOOK COMERCIAL  ·  AGOSTO 2026', L, 28);
doc.font('Helvetica-Bold').fontSize(22).fillColor(WHITE).text('Cómo vender Zenn', L, 50, { width: CW });
doc.font('Helvetica-Bold').fontSize(22).fillColor(WHITE).text('sin tienda física en Asunción', L, 76, { width: CW });
doc.font('Helvetica').fontSize(10.5).fillColor('#DDD6FE').text(
  'Depósito en Ciudad del Este  ·  Oficinas en Asunción  ·  Entrega en 24 horas',
  L,
  112,
  { width: CW }
);
doc.font('Helvetica').fontSize(9.5).fillColor('#E5E7EB').text(
  'Speech de confianza, contenido para Instagram y pautas. Para ejecutar, no para archivar.',
  L,
  132,
  { width: 420 }
);

y = 196;
kpis([
  { v: '8.031', l: 'Productos en catálogo' },
  { v: '5.377', l: 'Con stock' },
  { v: '24 h', l: 'Entrega a Asunción' },
  { v: '139', l: 'Seguidores IG' },
]);

body(
  'Zenn vende tecnología online a gente que vive sobre todo en Asunción. El producto sale del depósito en Ciudad del Este y llega al día siguiente del pago. En Asunción hay oficinas administrativas, no showroom ni retiro. Eso no se oculta: se explica bien. CDE es donde está la electrónica en Paraguay; 24 horas es un servicio, no una excusa.'
);

h2('Cómo está armado este PDF');
table(
  ['Bloque', 'Para qué'],
  [
    ['Operación', 'Cómo trabaja Zenn y qué decir (y qué no) en público'],
    ['Speech', 'Frases de venta y respuestas a “¿y si no me llega?”'],
    ['Ritual', 'Del WhatsApp al paquete en 24 h, con prueba visible'],
    ['Contenido', 'Instagram + Adobe Express, sin fingir un local'],
    ['Pauta y reels', 'Google/Meta y CapCut con el mensaje de 24 h'],
    ['7 días', 'Plan de ataque, copies y checklist'],
  ],
  [90, CW - 90]
);

note(
  'Regla de este documento',
  'Nunca digas “stock en Asunción”, “pasá a retirar hoy” ni “dropshipping”. Decí: depósito en CDE, oficinas en Asunción, pago, despacho y entrega al día siguiente.'
);

/* ===================== P2 OPERACION ===================== */
startPage();
h1('1. Cómo opera Zenn de verdad');
body(
  'El cliente de Asunción pide, paga y recibe. Por detrás, el flujo es depósito CDE → traslado → entrega en Asunción en aproximadamente 24 horas. Quien compra no tiene que saber la palabra dropshipping. Sí tiene que saber cuándo le llega y que hay una empresa real detrás.'
);

h2('Lo que el cliente necesita entender');
table(
  ['Dónde', 'Qué es', 'Qué decimos'],
  [
    ['Ciudad del Este', 'Depósito / origen del stock', '“Nuestro depósito está en CDE, el hub de electrónica del país.”'],
    ['Asunción', 'Oficinas administrativas', '“Atención, facturación y coordinación de entrega.”'],
    ['Casa / oficina del cliente', 'Punto de entrega', '“Pagás hoy y te llega mañana en Asunción.”'],
  ],
  [110, 150, CW - 260]
);

h2('Lo que SÍ decimos  ·  lo que NO');
table(
  ['SÍ', 'NO'],
  [
    ['Depósito en Ciudad del Este', 'Tenemos tienda para retirar en Asunción'],
    ['Entrega en Asunción en 24 horas hábiles', 'Stock en Asunción / sale hoy de local'],
    ['Oficinas administrativas en Asunción', 'Pasá a verlo en el local'],
    ['Pagás y despachamos; te mandamos foto del paquete', 'Es dropshipping / el producto no está en el país'],
    ['Factura, garantía y WhatsApp de seguimiento', 'Confía nomás, ya te llega'],
    ['Mejor precio porque compramos en CDE', 'Somos el más barato del país'],
  ],
  [CW / 2, CW / 2]
);

h2('Diagnóstico rápido (para no olvidar el contexto)');
table(
  ['Dato', 'Número', 'Qué implica'],
  [
    ['Visitas web 30 días', '1.340  (+29%)', 'Hay demanda, sobre todo Google'],
    ['Rebote', '76%', 'Entran y no entienden cómo comprar'],
    ['Carrito / checkout', '36 / 12', 'La duda de entrega mata la compra'],
    ['Clics Merchant Center', '18  ·  0 campañas', 'El catálogo está aprobado y no se pauta'],
    ['Instagram', '139 seguidores', 'Orgánico no alcanza: hace falta pauta + prueba social'],
    ['Tráfico Paraguay', '69%', 'El mensaje es local: Asunción, 24 h, WhatsApp'],
  ],
  [140, 130, CW - 270]
);

note(
  'El problema no es CDE',
  'El problema es que el cliente de Asunción asocia “pago adelantado + no hay local” con estafa. La solución no es mentir que hay tienda. La solución es un speech claro + prueba de entregas reales + un proceso que se vea.'
);

/* ===================== P3 SPEECH ===================== */
startPage();
h1('2. Speech de venta y confianza');
quote(
  'Zenn Electrónicos: tecnología con depósito en Ciudad del Este, atención en Asunción y entrega en tu casa o trabajo al día siguiente de tu pago.'
);

body(
  'Esa frase es la madre. Cubre origen, presencia local y plazo. No promete retiro. No pide fe ciega. Tres compradores: gamer/setup, oficina/pyme, casa/estudiante. Mismo speech, distinto producto.'
);

h2('Tono');
bullets([
  'Vos, frases cortas, precio en guaraníes, un plazo concreto (24 horas, no “pronto”).',
  'Primero el beneficio (te llega mañana), después el origen (depósito CDE).',
  'Nunca te pongas a la defensiva. Si preguntan por el local, respondé con el proceso, no con un discurso largo.',
]);

h2('Speech maestro — 25 segundos (reel, llamada, primer audio)');
speechBox(
  'Decí esto',
  'Hola, soy de Zenn Electrónicos. Vendemos notebooks, celulares, periféricos y componentes con depósito en Ciudad del Este y oficinas en Asunción. Pedís, pagás por la web o transferencia, y te entregamos en Asunción al día siguiente. Te mando foto del despacho y el seguimiento por WhatsApp. Cualquier duda, 0973 345 284 · zenn.com.py'
);

h2('Bio de Instagram (copiar)');
speechBox(
  'Bio',
  'Tecnología · depósito en CDE · entrega Asunción 24 h\nOficinas administrativas en Asunción\nCompra online 👇  zenn.com.py\nWhatsApp 0973 345 284'
);

h2('Primer mensaje de WhatsApp — cuando escriben');
speechBox(
  'Respuesta en menos de 10 minutos',
  '¡Hola! Gracias por escribir a Zenn. Contame qué producto viste y para qué lo necesitás. Confirmamos stock en nuestro depósito de CDE, te paso el precio final y, si pagás hoy, coordinamos la entrega en Asunción para mañana. ¿Es para casa, oficina o regalo?'
);

h2('Cuando ya eligió el producto');
speechBox(
  'Cierre',
  'Este modelo está disponible. El total es Gs. [precio]. Pagás por zenn.com.py (Bancard) o transferencia a nombre de la empresa. Hoy despachamos desde CDE y mañana está en Asunción, en el horario que me pases. Te mando foto del paquete apenas sale. ¿Lo reservamos con el pago de hoy?'
);

/* ===================== P4 OBJECIONES ===================== */
startPage();
h1('3. Objeciones: “¿y si no me llega?”');
body(
  'Esta es la objeción real. No la evadas. Quien ya compró es tu mejor argumento, pero hay que usarlo sin inventar cifras. Si tenés ventas hechas, decí entregas reales, no “miles de clientes”.');

h2('“¿Y si pago y no me llega?”');
speechBox(
  'Respuesta',
  'Es la duda más normal cuando el depósito no está a dos cuadras. Por eso el flujo es este: te confirmo stock, te facturo, pagás, te mando la foto del paquete el mismo día y el número de envío. Mañana te llega a Asunción. Si hay cualquier demora, te aviso yo, no te enterás solo. Empresa, web, WhatsApp y factura: no es un perfil anónimo.'
);

h2('“¿Por qué no tienen local en Asunción?”');
speechBox(
  'Respuesta',
  'Porque el stock grande de electrónica en Paraguay está en Ciudad del Este. Ahí tenemos el depósito. En Asunción tenemos oficinas para atención y coordinación. Así el precio rinde mejor y igual te lo dejamos en casa en 24 horas, sin que tengas que cruzar a CDE.'
);

h2('“Quiero verlo antes de pagar”');
speechBox(
  'Respuesta',
  'El equipo está en el depósito de CDE, no en exhibición en Asunción. Lo que sí puedo hacerte: fotos o video del ejemplar, ficha técnica, y si pagás hoy lo tenés mañana para revisarlo. Si algo no coincide con lo publicado, lo resolvemos: no te quedás con un producto distinto al de la web.'
);

h2('“¿Es dropshipping? / ¿el producto ni siquiera es de ustedes?”');
speechBox(
  'Respuesta',
  'Nosotros vendemos, facturamos y respondemos por la garantía. El depósito está en CDE y de ahí sale tu pedido. No te mandamos a otro vendedor. El responsable soy yo / es Zenn, del pago hasta la entrega.'
);

h2('“En Marketplace está más barato”');
speechBox(
  'Respuesta',
  'Puede ser. Acá tenés factura, un WhatsApp que no desaparece y entrega con seguimiento. El más barato del feed a veces no existe cuando querés reclamar. Si tu presupuesto es X, te armo la opción que sí podemos despachar mañana.'
);

h2('“¿Puedo pagar contra entrega?”');
speechBox(
  'Respuesta',
  'Para Asunción el flujo es pago y despacho, porque el producto sale de CDE el mismo día. Por eso el precio y el plazo de 24 h se sostienen. Te facilito pago web con tarjeta o transferencia, y te mando el comprobante de envío apenas sale. Si más adelante armamos contra entrega en una zona puntual, te aviso; hoy el estándar es este, y ya entregamos así a varios clientes.'
);

note(
  'Si el cliente sigue trabado',
  'No pelees. Ofrecé un producto de menor ticket primero, o pago por la web (Bancard da más confianza que una transferencia a nombre de persona). Mandá captura de una entrega anterior (cara tapada, dirección tapada) y el link de la ficha en zenn.com.py.'
);

/* ===================== P5 RITUAL ===================== */
startPage();
h1('4. Ritual de pedido (esto vende más que cualquier flyer)');
body(
  'La confianza no se discute: se muestra. Cada venta tiene que dejar rastro visible para el cliente. Si hacés esto siempre, el speech se sostiene solo.');

h2('Pasos — no saltees ninguno');
table(
  ['Paso', 'Vos', 'El cliente ve'],
  [
    ['1. Consulta', 'Confirmás stock en CDE el mismo día', '“Hay stock, te lo puedo dejar mañana”'],
    ['2. Precio', 'Precio final + qué incluye el envío a Asunción', 'Sin letras chicas'],
    ['3. Pago', 'Link de zenn.com.py o datos de la empresa (no personales)', 'Razón social, RUC, web'],
    ['4. Comprobante', 'Confirmás pago por WhatsApp en minutos', '“Ya está, despachamos hoy”'],
    ['5. Despacho', 'Foto del paquete cerrado + guía / transportadora', 'Prueba de que salió'],
    ['6. Tránsito', 'Un ping a la tarde: “va en camino”', 'Que no lo abandonaste'],
    ['7. Entrega', 'Aviso de llegada + “¿todo ok?”', 'Cierre y reseña'],
    ['8. Post', 'Pedí foto o permiso para destacada Entregas', 'Prueba social para el próximo'],
  ],
  [70, 200, CW - 270]
);

h2('Qué juntar esta semana (prueba social)');
bullets([
  'Destacada de Instagram “Entregas”: 4 a 6 fotos de paquetes / clientes (con permiso, sin dirección).',
  'Un reel de 15 s: paquete sale de CDE → llega a Asunción. Texto: “Pediste ayer. Hoy está en tu casa.”',
  'Capturas de chats de “ya me llegó” (tapá nombres si hace falta).',
  'En la web y en Stories: “Entrega en Asunción en 24 horas hábiles. Depósito en CDE.”',
]);

h2('Frase corta para Stories y pauta');
quote('Pedís hoy. Pagás. Mañana te llega a Asunción. Depósito en Ciudad del Este · Zenn Electrónicos.');

h2('Horarios de atención (oficinas, no tienda)');
body(
  'Usá los horarios para responder WhatsApp y coordinar: Lunes a viernes 08:00 a 17:00. Sábado 08:30 a 11:00. No invites a “pasar a ver productos”. Si alguien pregunta la dirección de Asunción, aclará que es oficina administrativa, no depósito de exhibición.'
);

/* ===================== P6 CONTENIDO ===================== */
startPage();
h1('5. Contenido Instagram y Adobe Express');
body(
  '5 publicaciones por semana. Cada pieza dice una de estas tres cosas: qué producto es, que llega en 24 h a Asunción, o cómo elegirlo. Nunca una foto de “nuestro local de Asunción” con productos en góndola que no existen.');

h2('Mezcla semanal');
table(
  ['Día', 'Pieza', 'Objetivo'],
  [
    ['Lunes', 'Carrusel “cómo elegir”', 'Autoridad'],
    ['Martes', 'Reel producto + plazo 24 h', 'Alcance y chats'],
    ['Miércoles', 'Accesorio < Gs. 150 mil', 'Compra fácil'],
    ['Jueves', 'Reel gamer / Redragon', 'Comunidad'],
    ['Viernes', 'Notebook o Xiaomi + CTA pago web', 'Conversión'],
    ['Sábado', 'Stories de entregas reales', 'Confianza, no tráfico a un local'],
  ],
  [70, 200, CW - 270]
);

h2('Calendario 4 semanas (verificar stock el día del post)');
table(
  ['Semana', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
  [
    ['1 Abrir', 'Estudio vs gamer', 'POCO C71', 'Combo Redragon', 'WiFi TP-Link', 'Vivobook 15'],
    ['2 Gaming', 'Armar PC', 'Victus / Nitro', 'Auriculares', 'SSD upgrade', 'Monitor 22"'],
    ['3 Casa/pyme', 'Cámara WiFi', 'Tablet kids', 'Cables', 'Impresora', 'Dell oficina'],
    ['4 Confianza', '5 errores al comprar', 'Xiaomi Pad/POCO', 'UPS pyme', 'Setup Redragon', 'Recap + entregas'],
  ],
  [62, 78, 78, 82, 90, CW - 390]
);

h2('Brand Kit en Express (15 minutos, una vez)');
bullets([
  'Colores: Cian #00B5D8 · Violeta #7B2CBF · Navy #2A3190 · Negro #111827 · Blanco #FFFFFF.',
  'Logo PNG transparente. Tipografía Inter o Poppins. Contacto fijo: zenn.com.py · 0973 345 284.',
  'Sello obligatorio en toda pieza de producto: “Entrega Asunción 24 h”.',
]);

h2('4 plantillas, no 12');
table(
  ['Plantilla', 'Medida', 'Qué lleva'],
  [
    ['A Post producto', '1080×1350', 'Foto recortada, nombre corto, 2 specs, precio, sello 24 h'],
    ['B Story / pauta', '1080×1920', 'Producto, precio, “pagás hoy · te llega mañana”'],
    ['C Carrusel', '1080×1350 ×5', 'Pregunta + 3 criterios + 2 SKUs con stock'],
    ['D Prueba', '1080×1920', 'Foto de entrega real + “ayer pagó, hoy recibió”'],
  ],
  [110, 90, CW - 200]
);

h2('Paso a paso de un flyer (12 min)');
table(
  ['Paso', 'Hacer'],
  [
    ['1', 'Duplicá plantilla A. Foto de zenn.com.py. Quitar fondo.'],
    ['2', 'Nombre humano: “Notebook ASUS Vivobook 15”, no el título de 30 palabras.'],
    ['3', 'Specs: Intel Core 5 · 8GB · 512GB SSD. Precio Gs. 3.787.229.'],
    ['4', 'Pie: Entrega Asunción 24 h · depósito CDE · WhatsApp 0973 345 284.'],
    ['5', 'Exportá PNG. Redimensioná a Story. Archivo: 2026-08-21_vivobook.png'],
  ],
  [46, CW - 46]
);

/* ===================== P7 PAUTAS + CAPCUT ===================== */
startPage();
h1('6. Pautas y reels');
body(
  'Merchant Center tiene 5.240 productos aprobados y 18 clics. Instagram tiene 139 seguidores. La pauta empuja fichas con stock y el mensaje de 24 horas. No pautes “retiro en Asunción”.');

h2('Presupuesto mes 1');
table(
  ['Canal', '%', 'Objetivo', 'KPI 30 días'],
  [
    ['Google Shopping', '45%', 'Clic a ficha con stock', '200+ clics · CPC controlado'],
    ['Google Search', '15%', 'notebook Asunción, Xiaomi PY', 'Chats y llamadas'],
    ['Meta WhatsApp', '25%', 'Mensaje con speech de 24 h', 'Costo por chat medible'],
    ['Remarketing', '15%', 'Visitó y no pagó', 'Volver con prueba de entrega'],
  ],
  [120, 40, 160, CW - 320]
);

note(
  'Mínimo útil',
  'Gs. 800 mil/mes (500 mil Shopping + 300 mil Meta). Ideal Gs. 1,5–2,5 M. Menos no deja aprender. Ubicación: Paraguay, puja extra Asunción y Central. Excluí países. Feed: solo stock > 0 y precios < Gs. 10 M al inicio.'
);

h2('Copy de pauta (WhatsApp)');
speechBox(
  'Anuncio',
  'Título: Notebook con entrega en Asunción en 24 h\nTexto: Depósito en Ciudad del Este, atención en Asunción. Pagás hoy en zenn.com.py y mañana te llega. Te asesoramos por WhatsApp. Gs. [precio] · stock real.\nCTA: Enviar mensaje'
);

h2('CapCut — reel de 18 segundos (legal)');
table(
  ['Seg', 'Imagen', 'Texto en pantalla'],
  [
    ['0–2', 'Producto grande', 'Hook: “¿Pago y no me llega?”'],
    ['2–7', '3 specs', 'RAM / SSD / modelo'],
    ['7–12', 'Caja / despacho (tuyo, no ajeno)', 'Sale de CDE hoy'],
    ['12–16', 'Asunción / entrega', 'Mañana en tu casa'],
    ['16–18', 'Logo + WhatsApp', 'zenn.com.py'],
  ],
  [40, 200, CW - 240]
);

body(
  'Usá stock de CapCut/Pexels o tomas propias. No recortes reels de otros vendedores: Meta te baja el anuncio. Audio de la biblioteca CapCut. Subtítulos con “Zenn”, “Asunción”, “CDE” bien escritos.'
);

h2('Ganchos que sí podés usar');
bullets([
  '“Pediste ayer. Hoy está en Asunción.”',
  '“No tenés que ir a CDE. Nosotros te lo traemos.”',
  '“Pago web, foto del paquete, llega mañana.”',
  '“Tu WiFi no es el proveedor. Es el router.”',
  '“Notebook para facultad, no para juntar polvo.”',
]);

/* ===================== P8 CIERRE ===================== */
startPage();
h1('7. Siete días y copies listos');

h2('Plan de ataque');
table(
  ['Día', 'Hacer'],
  [
    ['1', 'Bio nueva + destacada Entregas. Brand Kit Express. Sacar de todos lados “retiro en Asunción”.'],
    ['2', 'Plantillas A, B y D. Un flyer Vivobook y uno Redragon con sello 24 h.'],
    ['3', 'Filmar 10 min: paquete, etiqueta, WhatsApp de “ya salió”. Armar reel de confianza.'],
    ['4', 'Publicar carrusel notebooks + 4 Stories de entregas. Responder cada DM con el speech de la pág. 3.'],
    ['5', 'Conectar Merchant ↔ Google Ads. Campaña Shopping solo con stock.'],
    ['6', 'Pauta Meta WhatsApp: 1 creativo 24 h + 1 producto Xiaomi o Redragon. Gs. 15–25 mil/día.'],
    ['7', 'Anotar chats, clics y objeciones. El creativo con CTR flojo se corta. El que trae “¿cuándo llega?” se duplica.'],
  ],
  [40, CW - 40]
);

h2('Copy feed — notebook');
speechBox(
  'Post',
  'Notebook para estudiar y trabajar.\nASUS Vivobook 15 · Intel Core 5 · 8GB · 512GB SSD\nGs. 3.787.229\n\nPagás hoy y te llega mañana a Asunción.\nDepósito en Ciudad del Este · oficinas en Asunción.\nzenn.com.py  ·  0973 345 284\n\n#ZennElectronicos #NotebookParaguay #Asuncion'
);

h2('Copy reel de confianza');
speechBox(
  'Reel',
  'Hook: “¿Y si pago y no me llega?”\nCuerpo: Por eso te mandamos foto del paquete el mismo día. Sale de CDE, mañana está en Asunción.\nCierre: Zenn Electrónicos · zenn.com.py · WhatsApp 0973 345 284'
);

h2('Checklist de cada publicación');
bullets([
  '¿Hay stock hoy en CDE?',
  '¿El precio es el de la web?',
  '¿Dice entrega Asunción 24 h (y no retiro)?',
  '¿Un solo CTA: web o WhatsApp?',
  '¿El link de WhatsApp menciona el modelo?',
]);

h2('Héroes semana 1 (revalidar stock)');
table(
  ['Producto', 'Gs.', 'Pieza'],
  [
    ['ASUS Vivobook 15', '3.787.229', 'Carrusel + Shopping'],
    ['Dell 15 Ryzen 5', '3.665.783', 'Oficina / Search'],
    ['Xiaomi POCO C71', '758.675', 'Reel + WhatsApp ads'],
    ['Combo Redragon teclado+mouse', '120.325', 'Reel gamer'],
    ['Monitor Macrovip 22" FHD', '348.795', 'Post'],
    ['TP-Link WR840N', '111.976', 'Reel WiFi'],
  ],
  [230, 90, CW - 320]
);

/* footers + page numbers */
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  footerForPage(i + 1, range.count);
}

doc.end();
stream.on('finish', () => {
  console.log('PDF', OUT, 'paginas', range.count);
});
