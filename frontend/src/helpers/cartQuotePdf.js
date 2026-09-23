import { jsPDF } from 'jspdf';

/** Cotización del carrito. Se arma en el navegador, sin pasar por el backend. */
const INK = '#14182B';
const NAVY = '#2A3190';
const CYAN = '#00B5D8';
const MUTED = '#6B7280';
const BODY = '#3D4458';
const LINE = '#E6EDF5';
const WASH = '#F4FBFD';

const LEFT = 12;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - LEFT * 2;

const COLS = [
  { label: 'Imagen', width: 18, align: 'center' },
  { label: 'Descripción', width: 90, align: 'left' },
  { label: 'Cant.', width: 16, align: 'center' },
  { label: 'Precio', width: 31, align: 'right' },
  { label: 'Importe', width: 31, align: 'right' }
];

let fontFiles = null;
let logoData = null;
let gradientData = null;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadFonts() {
  if (fontFiles) return fontFiles;
  const [regular, semi] = await Promise.all([
    fetch('/fonts/Inter-Regular.ttf').then((response) => response.arrayBuffer()),
    fetch('/fonts/Inter-SemiBold.ttf').then((response) => response.arrayBuffer())
  ]);
  fontFiles = {
    regular: arrayBufferToBase64(regular),
    semi: arrayBufferToBase64(semi)
  };
  return fontFiles;
}

function applyFonts(doc, files) {
  doc.addFileToVFS('Inter-Regular.ttf', files.regular);
  doc.addFileToVFS('Inter-SemiBold.ttf', files.semi);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  doc.addFont('Inter-SemiBold.ttf', 'Inter', 'bold');
}

function setType(doc, weight, size, color) {
  doc.setFont('Inter', weight === 'semi' ? 'bold' : 'normal');
  doc.setFontSize(size);
  if (color) doc.setTextColor(color);
}

function makeGradient() {
  if (gradientData) return gradientData;
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#00B5D8');
  gradient.addColorStop(1, '#7B2CBF');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  gradientData = canvas.toDataURL('image/png');
  return gradientData;
}

function loadLogo() {
  if (logoData) return Promise.resolve(logoData);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = 480;
      const height = Math.round(width * (image.height / image.width));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      logoData = canvas.toDataURL('image/png');
      resolve(logoData);
    };
    image.onerror = () => resolve(null);
    image.src = '/logozenn.svg';
  });
}

async function loadProductImage(url) {
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const size = 180;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    const scale = Math.min(size / bitmap.width, size / bitmap.height);
    const drawW = bitmap.width * scale;
    const drawH = bitmap.height * scale;
    ctx.drawImage(bitmap, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function addressLines(address) {
  if (!address) return [];
  if (typeof address === 'string') return address.trim() ? [address.trim()] : [];
  const street = address.street || address.address || '';
  const city = [address.city, address.state].filter(Boolean).join(', ');
  return [street, city, address.country].filter(Boolean);
}

function paintAccent(doc, gradient, x, y, w, h) {
  if (gradient) {
    doc.addImage(gradient, 'PNG', x, y, w, h);
    return;
  }
  doc.setFillColor(CYAN);
  doc.rect(x, y, w, h, 'F');
}

function drawTableHeader(doc, gradient, y) {
  paintAccent(doc, gradient, LEFT, y, CONTENT_W, 0.7);
  doc.setFillColor(WASH);
  doc.rect(LEFT, y + 0.7, CONTENT_W, 7, 'F');
  setType(doc, 'semi', 8, NAVY);
  let x = LEFT;
  COLS.forEach((col) => {
    const textX = col.align === 'right' ? x + col.width - 1.5 : col.align === 'center' ? x + col.width / 2 : x + 1.5;
    doc.text(col.label, textX, y + 5.2, { align: col.align === 'left' ? 'left' : col.align });
    x += col.width;
  });
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.2);
  doc.line(LEFT, y + 7.7, LEFT + CONTENT_W, y + 7.7);
  return y + 9;
}

function drawFooter(doc, customerName) {
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(LINE);
    doc.setLineWidth(0.2);
    doc.line(LEFT, PAGE_H - 12, LEFT + CONTENT_W, PAGE_H - 12);
    setType(doc, 'text', 7.5, MUTED);
    doc.text(
      `Cotización para ${customerName}    ·    zenn.com.py    ·    Página ${i} de ${pages}`,
      PAGE_W / 2,
      PAGE_H - 7,
      { align: 'center' }
    );
  }
}

export async function downloadCartQuotePdf({ customer, items, totalLabel }) {
  const fonts = await loadFonts();
  const gradient = makeGradient();
  const logo = await loadLogo();
  const images = await Promise.all(items.map((item) => loadProductImage(item.imageUrl)));

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  applyFonts(doc, fonts);

  const quoteNumber = `PRE-${Math.floor(100000 + Math.random() * 900000)}`;
  const today = new Date().toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Asuncion'
  });

  paintAccent(doc, gradient, 0, 0, PAGE_W, 1.5);
  if (logo) doc.addImage(logo, 'PNG', LEFT, 6, 28, 12);

  setType(doc, 'semi', 8, CYAN);
  doc.text('COTIZACIÓN', LEFT + CONTENT_W, 8, { align: 'right' });
  setType(doc, 'semi', 12, INK);
  doc.text(`N.º ${quoteNumber}`, LEFT + CONTENT_W, 14, { align: 'right' });
  setType(doc, 'text', 8.5, MUTED);
  doc.text(today, LEFT + CONTENT_W, 19, { align: 'right' });
  setType(doc, 'semi', 9, NAVY);
  doc.text(customer.name, LEFT + CONTENT_W, 24, { align: 'right' });

  doc.setDrawColor(LINE);
  doc.setLineWidth(0.3);
  doc.line(LEFT, 29, LEFT + CONTENT_W, 29);

  const company = [
    'Teodoro S. Mongelos casi',
    'Radio Operadores del Chaco 3934',
    'Tel. +595 973 345 284',
    'ventas@zenn.com.py',
    'RUC 80136342-0'
  ];
  const client = [
    customer.name,
    ...addressLines(customer.address),
    customer.phone ? `Tel. ${customer.phone}` : '',
    customer.email || ''
  ].filter(Boolean);

  const colW = (CONTENT_W - 8) / 2;
  setType(doc, 'semi', 9, NAVY);
  doc.text('Zenn EAS', LEFT, 35);
  doc.text('Cliente', LEFT + colW + 8, 35);

  let companyY = 40;
  company.forEach((line) => {
    setType(doc, 'text', 8.5, BODY);
    doc.text(line, LEFT, companyY);
    companyY += 4.2;
  });

  let clientY = 40;
  client.forEach((line, index) => {
    setType(doc, index === 0 ? 'semi' : 'text', 8.5, index === 0 ? INK : BODY);
    const wrapped = doc.splitTextToSize(String(line), colW);
    doc.text(wrapped, LEFT + colW + 8, clientY);
    clientY += wrapped.length * 4.2;
  });

  const blockBottom = Math.max(companyY, clientY) + 1;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.2);
  doc.line(LEFT + colW + 4, 34, LEFT + colW + 4, blockBottom - 2);

  let y = blockBottom + 4;
  const meta = [
    ['Emisión', today],
    ['Válido hasta', '5 días hábiles'],
    ['Entrega', '48 horas hábiles']
  ];
  meta.forEach((entry, index) => {
    const x = LEFT + index * (CONTENT_W / 3);
    setType(doc, 'semi', 7.5, CYAN);
    doc.text(entry[0], x, y);
    setType(doc, 'semi', 9, INK);
    doc.text(entry[1], x, y + 4.5);
  });
  y += 12;

  setType(doc, 'text', 8, MUTED);
  doc.text('Condiciones de pago', LEFT, y);
  setType(doc, 'text', 8.5, INK);
  doc.text('A convenir', LEFT + 42, y);
  y += 8;

  const openTable = (startY) => drawTableHeader(doc, gradient, startY);

  y = openTable(y);

  items.forEach((item, index) => {
    setType(doc, 'semi', 9, INK);
    const nameLines = doc.splitTextToSize(item.name, COLS[1].width - 3);
    setType(doc, 'text', 7.5, MUTED);
    const metaLines = item.meta ? doc.splitTextToSize(item.meta, COLS[1].width - 3) : [];
    const rowH = Math.max(16, nameLines.length * 4 + metaLines.length * 3.2 + 5);

    if (y + rowH > PAGE_H - 22) {
      doc.addPage();
      applyFonts(doc, fonts);
      paintAccent(doc, gradient, 0, 0, PAGE_W, 1.2);
      if (logo) doc.addImage(logo, 'PNG', LEFT, 6, 22, 9);
      setType(doc, 'semi', 9, INK);
      doc.text(`N.º ${quoteNumber}`, LEFT + CONTENT_W, 10, { align: 'right' });
      setType(doc, 'text', 8, NAVY);
      doc.text(customer.name, LEFT + CONTENT_W, 15, { align: 'right' });
      y = openTable(20);
    }

    const imageSize = 12;
    const imageX = LEFT + (COLS[0].width - imageSize) / 2;
    const imageY = y + (rowH - imageSize) / 2;
    if (images[index]) {
      doc.addImage(images[index], 'JPEG', imageX, imageY, imageSize, imageSize);
    } else {
      doc.setFillColor(WASH);
      doc.setDrawColor(LINE);
      doc.roundedRect(imageX, imageY, imageSize, imageSize, 1.2, 1.2, 'FD');
      setType(doc, 'text', 5.5, MUTED);
      doc.text('Sin imagen', imageX + imageSize / 2, imageY + imageSize / 2 + 1, { align: 'center' });
    }

    let textY = y + Math.max(5, (rowH - (nameLines.length * 4 + metaLines.length * 3.2)) / 2) + 1;
    setType(doc, 'semi', 9, INK);
    doc.text(nameLines, LEFT + COLS[0].width + 1, textY);
    textY += nameLines.length * 4;
    if (metaLines.length) {
      setType(doc, 'text', 7.5, MUTED);
      doc.text(metaLines, LEFT + COLS[0].width + 1, textY);
    }

    const valueY = y + rowH / 2 + 1;
    const values = [String(item.quantity), item.unitPrice, item.subtotal];
    values.forEach((value, valueIndex) => {
      const col = COLS[valueIndex + 2];
      let x = LEFT;
      for (let i = 0; i < valueIndex + 2; i += 1) x += COLS[i].width;
      const textX = col.align === 'right' ? x + col.width - 1.5 : x + col.width / 2;
      setType(doc, 'text', 8.5, INK);
      doc.text(value, textX, valueY, { align: col.align });
    });

    doc.setDrawColor(LINE);
    doc.setLineWidth(0.15);
    doc.line(LEFT, y + rowH, LEFT + CONTENT_W, y + rowH);
    y += rowH;
  });

  if (y + 28 > PAGE_H - 22) {
    doc.addPage();
    applyFonts(doc, fonts);
    y = 18;
  } else {
    y += 8;
  }

  const boxW = 72;
  const boxX = LEFT + CONTENT_W - boxW;
  setType(doc, 'text', 8, MUTED);
  const legal = doc.splitTextToSize('Importes en guaraníes. Esta cotización no constituye factura. Garantía según el fabricante.', CONTENT_W - boxW - 6);
  doc.text(legal, LEFT, y);

  setType(doc, 'text', 9, BODY);
  doc.text('Subtotal', boxX, y);
  doc.text(totalLabel, boxX + boxW, y, { align: 'right' });
  paintAccent(doc, gradient, boxX, y + 3, boxW, 0.7);
  setType(doc, 'semi', 12, NAVY);
  doc.text('Total', boxX, y + 9);
  doc.text(totalLabel, boxX + boxW, y + 9, { align: 'right' });

  drawFooter(doc, customer.name);
  doc.save(`Cotizacion-Zenn-${quoteNumber}.pdf`);
  return quoteNumber;
}
