'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const BudgetModel = require('../models/budgetModel');
const UserModel = require('../models/userModel');

const INK = '#14182B';
const NAVY = '#2A3190';
const CYAN = '#00B5D8';
const MUTED = '#6B7280';
const BODY = '#3D4458';
const LINE = '#E6EDF5';
const WASH = '#F4FBFD';
const LEFT = 46;

const FONT_REGULAR = path.join(__dirname, '../assets/fonts/Inter-Regular.ttf');
const FONT_SEMI = path.join(__dirname, '../assets/fonts/Inter-SemiBold.ttf');

const LOGO_CANDIDATES = [
  path.join(__dirname, '../assets/logozenn.svg'),
  path.join(__dirname, '../../frontend/public/logozenn.svg')
];

const STATUS_LABELS = {
  draft: 'Borrador',
  sent: 'Enviado',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  expired: 'Vencido',
  converted: 'Convertido'
};

function columns(doc) {
  const width = contentWidth(doc);
  const image = 52;
  const qty = 42;
  const price = 82;
  const discount = 44;
  const total = 96;
  const name = width - (image + qty + price + discount + total);
  return [
    { key: 'image', label: 'Imagen', width: image, align: 'center' },
    { key: 'name', label: 'Descripción', width: name, align: 'left' },
    { key: 'qty', label: 'Cant.', width: qty, align: 'center' },
    { key: 'price', label: 'Precio', width: price, align: 'right' },
    { key: 'discount', label: 'Dto.', width: discount, align: 'center' },
    { key: 'total', label: 'Importe', width: total, align: 'right' }
  ];
}

let logoPromise = null;

function contentWidth(doc) {
  return doc.page.width - LEFT * 2;
}

function footerLimit(doc) {
  return doc.page.height - 72;
}

function formatMoney(value) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? Math.round(n) : 0;
  return `${safe.toLocaleString('es-PY')} Gs.`;
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Asuncion'
  });
}

function isObjectId(value) {
  if (!value) return false;
  const raw = String(value);
  return mongoose.Types.ObjectId.isValid(raw) && String(new mongoose.Types.ObjectId(raw)) === raw;
}

async function resolvePersonName(ref) {
  if (ref == null || ref === '') return null;
  if (typeof ref === 'object' && (ref.name || ref.email)) {
    return ref.name || ref.email;
  }

  const raw = String(ref._id || ref);
  if (raw === 'guest-user' || raw.startsWith('guest-')) return 'Usuario invitado';
  if (!isObjectId(raw)) return null;

  const user = await UserModel.findById(raw).select('name email').lean();
  if (!user) return null;
  return user.name || user.email || null;
}

function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) {
    const base = (process.env.FRONTEND_URL || 'https://www.zenn.com.py').replace(/\/$/, '');
    return `${base}${trimmed}`;
  }
  return '';
}

async function toJpegThumb(buffer) {
  return sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 82 })
    .toBuffer();
}

async function fetchImageJpeg(url) {
  const normalized = normalizeImageUrl(url);
  if (!normalized) return null;

  try {
    if (normalized.startsWith('data:image/')) {
      const base64 = normalized.split(',')[1];
      if (!base64) return null;
      return await toJpegThumb(Buffer.from(base64, 'base64'));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(normalized, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*',
          'User-Agent': 'ZennBudgetPDF/1.0'
        }
      });
      if (!response.ok) return null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
        return null;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer.length > 8 * 1024 * 1024) return null;
      return await toJpegThumb(buffer);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

async function mapPool(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function getLogoBuffer() {
  if (!logoPromise) {
    const logoPath = LOGO_CANDIDATES.find((candidate) => fs.existsSync(candidate));
    logoPromise = logoPath
      ? sharp(logoPath, { density: 280 })
        .resize({ width: 460, height: 200, fit: 'inside' })
        .png()
        .toBuffer()
        .catch(() => null)
      : Promise.resolve(null);
  }
  return logoPromise;
}

let gradientPromise = null;

function getGradientStrip() {
  if (!gradientPromise) {
    const width = 1400;
    const height = 12;
    const left = [0, 181, 216];
    const right = [123, 44, 191];
    const data = Buffer.alloc(width * height * 3);
    for (let x = 0; x < width; x += 1) {
      const t = x / (width - 1);
      const rgb = left.map((channel, index) => Math.round(channel + (right[index] - channel) * t));
      for (let y = 0; y < height; y += 1) {
        const offset = (y * width + x) * 3;
        data[offset] = rgb[0];
        data[offset + 1] = rgb[1];
        data[offset + 2] = rgb[2];
      }
    }
    gradientPromise = sharp(data, { raw: { width, height, channels: 3 } }).png().toBuffer();
  }
  return gradientPromise;
}

function useFonts(doc) {
  if (fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_SEMI)) {
    doc.registerFont('Zenn', FONT_REGULAR);
    doc.registerFont('Zenn-Semi', FONT_SEMI);
    return { text: 'Zenn', semi: 'Zenn-Semi' };
  }
  return { text: 'Helvetica', semi: 'Helvetica-Bold' };
}

function paintAccent(doc, gradient, x, y, w, h) {
  if (gradient) {
    try {
      doc.image(gradient, x, y, { width: w, height: h });
      return;
    } catch {
      // Si la franja no entra, queda el cian de la marca.
    }
  }
  doc.rect(x, y, w, h).fill(CYAN);
}

function clientLines(client) {
  if (!client) return ['Cliente no especificado'];
  const lines = [];
  if (client.name) lines.push(client.name);
  if (client.company) lines.push(client.company);

  const address = client.address;
  if (address && typeof address === 'object') {
    if (address.street) lines.push(address.street);
    const location = [address.city, address.state].filter(Boolean).join(', ');
    const withZip = [location, address.zip].filter(Boolean).join(' ');
    if (withZip) lines.push(withZip);
    if (address.country) lines.push(address.country);
  } else if (address) {
    lines.push(String(address));
  }

  if (client.phone) lines.push(`Tel. ${client.phone}`);
  if (client.email) lines.push(client.email);
  if (client.taxId) lines.push(`RUC/CI ${client.taxId}`);
  return lines.length ? lines : ['Cliente no especificado'];
}


function drawImageCell(doc, fonts, image, x, y, size) {
  doc.save();
  doc.roundedRect(x, y, size, size, 5).clip();
  if (image) {
    try {
      doc.image(image, x, y, {
        fit: [size, size],
        align: 'center',
        valign: 'center'
      });
    } catch {
      doc.rect(x, y, size, size).fill(WASH);
    }
  } else {
    doc.rect(x, y, size, size).fill(WASH);
  }
  doc.restore();
  doc.roundedRect(x, y, size, size, 5).lineWidth(0.6).strokeColor(LINE).stroke();
  if (!image) {
    doc.font(fonts.text).fontSize(6).fillColor(MUTED)
      .text('Sin imagen', x, y + size / 2 - 3, { width: size, align: 'center', lineBreak: false });
  }
}

function drawSlimHeader(doc, fonts, budget, authorName, logo, gradient) {
  const width = contentWidth(doc);
  paintAccent(doc, gradient, 0, 0, doc.page.width, 3);
  if (logo) {
    try {
      doc.image(logo, LEFT, 16, { fit: [78, 30], align: 'left', valign: 'center' });
    } catch {
      // El presupuesto sigue si el logo no se puede dibujar.
    }
  }
  doc.font(fonts.semi).fontSize(9).fillColor(INK)
    .text(`N.º ${budget.budgetNumber}`, LEFT + 90, 16, {
      width: width - 90,
      align: 'right',
      lineBreak: false
    });
  doc.font(fonts.text).fontSize(8).fillColor(NAVY)
    .text(`Elaborado por ${authorName}`, LEFT + 90, 30, {
      width: width - 90,
      align: 'right',
      lineBreak: false
    });
  doc.moveTo(LEFT, 54).lineTo(LEFT + width, 54).lineWidth(0.6).strokeColor(LINE).stroke();
  return 66;
}

function drawTableHeader(doc, fonts, gradient, y) {
  const cols = columns(doc);
  const width = contentWidth(doc);
  paintAccent(doc, gradient, LEFT, y, width, 2);
  doc.rect(LEFT, y + 2, width, 20).fill(WASH);
  doc.font(fonts.semi).fontSize(8).fillColor(NAVY);

  let x = LEFT;
  cols.forEach((col) => {
    doc.text(col.label, x + 4, y + 8, {
      width: col.width - 8,
      align: col.align,
      lineBreak: false
    });
    x += col.width;
  });

  doc.moveTo(LEFT, y + 22).lineTo(LEFT + width, y + 22).lineWidth(0.4).strokeColor(LINE).stroke();
  return y + 26;
}

function measureRow(doc, fonts, row) {
  const nameWidth = columns(doc)[1].width - 14;
  doc.font(fonts.semi).fontSize(9);
  const nameHeight = doc.heightOfString(row.name, { width: nameWidth });
  let metaHeight = 0;
  if (row.meta) {
    doc.font(fonts.text).fontSize(7.5);
    metaHeight = doc.heightOfString(row.meta, { width: nameWidth }) + 2;
  }
  return Math.max(52, nameHeight + metaHeight + 14);
}

function drawProductRow(doc, fonts, row, y, rowHeight) {
  const cols = columns(doc);
  const width = contentWidth(doc);
  const imageSize = 38;
  const imageX = LEFT + (cols[0].width - imageSize) / 2;
  const imageY = y + (rowHeight - imageSize) / 2;
  drawImageCell(doc, fonts, row.image, imageX, imageY, imageSize);

  const nameWidth = cols[1].width - 14;
  doc.font(fonts.semi).fontSize(9);
  const nameHeight = doc.heightOfString(row.name, { width: nameWidth });
  doc.font(fonts.text).fontSize(7.5);
  const metaHeight = row.meta ? doc.heightOfString(row.meta, { width: nameWidth }) + 2 : 0;
  let textY = y + Math.max(7, (rowHeight - (nameHeight + metaHeight)) / 2);
  const nameX = LEFT + cols[0].width + 6;

  doc.font(fonts.semi).fontSize(9).fillColor(INK)
    .text(row.name, nameX, textY, { width: nameWidth });
  if (row.meta) {
    doc.font(fonts.text).fontSize(7.5).fillColor(MUTED)
      .text(row.meta, nameX, textY + nameHeight + 1, { width: nameWidth });
  }

  const valueY = y + (rowHeight / 2) - 4;
  [row.quantity, row.unitPrice, row.discount, row.subtotal].forEach((text, index) => {
    const col = index + 2;
    let x = LEFT;
    for (let i = 0; i < col; i += 1) x += cols[i].width;
    doc.font(fonts.text).fontSize(8.5).fillColor(INK)
      .text(text, x + 4, valueY, {
        width: cols[col].width - 8,
        align: cols[col].align,
        lineBreak: false
      });
  });

  doc.moveTo(LEFT, y + rowHeight).lineTo(LEFT + width, y + rowHeight).lineWidth(0.35).strokeColor(LINE).stroke();
}

function drawParty(doc, fonts, x, y, w, title, lines, emphasizeFirst) {
  doc.font(fonts.semi).fontSize(9).fillColor(NAVY)
    .text(title, x, y, { width: w, lineBreak: false });
  let lineY = y + 15;
  lines.forEach((line, index) => {
    const emphasize = emphasizeFirst && index === 0;
    doc.font(emphasize ? fonts.semi : fonts.text).fontSize(8.5).fillColor(emphasize ? INK : BODY);
    const height = doc.heightOfString(String(line), { width: w });
    doc.text(String(line), x, lineY, { width: w });
    lineY += height + 2;
  });
  return lineY;
}

function renderBudgetPdfBuffer({ budget, authorName, creatorName, logo, gradient, rows }) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 46,
    bufferPages: true,
    info: {
      Title: `Cotización ${budget.budgetNumber}`,
      Author: authorName,
      Creator: 'Zenn Electrónicos',
      Subject: `Cotización elaborada por ${authorName}`
    }
  });
  const fonts = useFonts(doc);

  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      const width = contentWidth(doc);
      paintAccent(doc, gradient, 0, 0, doc.page.width, 4);

      if (logo) {
        try {
          doc.image(logo, LEFT, 20, { fit: [102, 40], align: 'left', valign: 'center' });
        } catch {
          doc.font(fonts.semi).fontSize(14).fillColor(NAVY).text('ZENN', LEFT, 30);
        }
      } else {
        doc.font(fonts.semi).fontSize(14).fillColor(NAVY).text('ZENN', LEFT, 30);
      }

      doc.font(fonts.semi).fontSize(8).fillColor(CYAN)
        .text('COTIZACIÓN', LEFT + 150, 20, {
          width: width - 150,
          align: 'right',
          characterSpacing: 1.4,
          lineBreak: false
        });
      doc.font(fonts.semi).fontSize(13).fillColor(INK)
        .text(`N.º ${budget.budgetNumber}`, LEFT + 150, 34, {
          width: width - 150,
          align: 'right',
          lineBreak: false
        });
      doc.font(fonts.text).fontSize(8.5).fillColor(MUTED)
        .text(formatDate(budget.createdAt), LEFT + 150, 52, {
          width: width - 150,
          align: 'right',
          lineBreak: false
        });
      doc.font(fonts.semi).fontSize(9).fillColor(NAVY)
        .text(`Elaborado por ${authorName}`, LEFT + 150, 66, {
          width: width - 150,
          align: 'right',
          lineBreak: false
        });

      let headerBottom = 86;
      if (creatorName) {
        doc.font(fonts.text).fontSize(8).fillColor(MUTED)
          .text(`Creado por ${creatorName}`, LEFT + 150, 80, {
            width: width - 150,
            align: 'right',
            lineBreak: false
          });
        headerBottom = 98;
      }

      doc.moveTo(LEFT, headerBottom).lineTo(LEFT + width, headerBottom).lineWidth(0.7).strokeColor(LINE).stroke();

      let y = headerBottom + 16;
      const colGap = 28;
      const colW = (width - colGap) / 2;
      const company = [
        'Teodoro S. Mongelos casi',
        'Radio Operadores del Chaco 3934',
        'Tel. +595 973 345 284',
        'ventas@zenn.com.py',
        'RUC 80136342-0'
      ];
      const leftBottom = drawParty(doc, fonts, LEFT, y, colW, 'Zenn EAS', company, false);
      const rightBottom = drawParty(doc, fonts, LEFT + colW + colGap, y, colW, 'Cliente', clientLines(budget.client), true);
      doc.moveTo(LEFT + colW + colGap / 2, y + 2)
        .lineTo(LEFT + colW + colGap / 2, Math.max(leftBottom, rightBottom) - 2)
        .lineWidth(0.5)
        .strokeColor(LINE)
        .stroke();
      y = Math.max(leftBottom, rightBottom) + 14;

      const meta = [
        { label: 'Emisión', value: formatDate(budget.createdAt) },
        { label: 'Válido hasta', value: formatDate(budget.validUntil) },
        { label: 'Estado', value: STATUS_LABELS[budget.status] || String(budget.status || '-') }
      ];
      const metaW = width / 3;
      meta.forEach((item, index) => {
        const x = LEFT + index * metaW;
        doc.font(fonts.semi).fontSize(7.5).fillColor(CYAN)
          .text(item.label, x, y, { width: metaW - 12, lineBreak: false });
        doc.font(fonts.semi).fontSize(9).fillColor(INK)
          .text(item.value, x, y + 12, { width: metaW - 12, lineBreak: false });
      });
      y += 36;

      const extras = [];
      if (budget.paymentTerms) extras.push({ label: 'Condiciones de pago', value: budget.paymentTerms });
      if (budget.deliveryMethod) extras.push({ label: 'Entrega', value: budget.deliveryMethod });
      extras.forEach((extra) => {
        doc.font(fonts.text).fontSize(8).fillColor(MUTED)
          .text(extra.label, LEFT, y, { width: 118, lineBreak: false });
        doc.font(fonts.text).fontSize(8.5).fillColor(INK)
          .text(String(extra.value), LEFT + 122, y, { width: width - 122 });
        y = Math.max(y + 14, doc.y + 3);
      });
      if (extras.length) y += 6;

      y = drawTableHeader(doc, fonts, gradient, y);

      rows.forEach((row) => {
        const rowHeight = measureRow(doc, fonts, row);
        if (y + rowHeight > footerLimit(doc)) {
          doc.addPage();
          y = drawSlimHeader(doc, fonts, budget, authorName, logo, gradient);
          y = drawTableHeader(doc, fonts, gradient, y);
        }
        drawProductRow(doc, fonts, row, y, rowHeight);
        y += rowHeight;
      });

      const totalsHeight = 88 + (Number(budget.discount) > 0 ? 16 : 0) + (Number(budget.tax) > 0 ? 16 : 0);
      if (y + totalsHeight > footerLimit(doc)) {
        doc.addPage();
        y = drawSlimHeader(doc, fonts, budget, authorName, logo, gradient);
      } else {
        y += 16;
      }

      const boxW = 214;
      const boxX = LEFT + width - boxW;
      doc.font(fonts.text).fontSize(8).fillColor(MUTED)
        .text('Importes en guaraníes. Esta cotización no constituye factura.', LEFT, y + 2, {
          width: width - boxW - 20
        });

      let totalsY = y;
      const writeTotalLine = (label, amount, strong) => {
        doc.font(strong ? fonts.semi : fonts.text).fontSize(strong ? 12 : 9).fillColor(strong ? NAVY : BODY)
          .text(label, boxX, totalsY, { width: 108, lineBreak: false });
        doc.font(strong ? fonts.semi : fonts.text).fontSize(strong ? 12 : 9).fillColor(strong ? NAVY : INK)
          .text(amount, boxX + 108, totalsY, { width: boxW - 108, align: 'right', lineBreak: false });
      };

      writeTotalLine('Subtotal', formatMoney(budget.totalAmount), false);
      if (Number(budget.discount) > 0) {
        totalsY += 16;
        const discountAmount = Number(budget.totalAmount) * (Number(budget.discount) / 100);
        writeTotalLine(`Descuento ${budget.discount}%`, `- ${formatMoney(discountAmount)}`, false);
      }
      if (Number(budget.tax) > 0) {
        totalsY += 16;
        const base = Number(budget.totalAmount) * (1 - (Number(budget.discount) || 0) / 100);
        writeTotalLine(`IVA ${budget.tax}%`, formatMoney(base * (Number(budget.tax) / 100)), false);
      }

      totalsY += 18;
      paintAccent(doc, gradient, boxX, totalsY, boxW, 2);
      totalsY += 10;
      writeTotalLine('Total', formatMoney(budget.finalAmount), true);

      y = Math.max(doc.y + 10, totalsY + 28);

      if (budget.notes) {
        doc.font(fonts.text).fontSize(9);
        const notesHeight = doc.heightOfString(String(budget.notes), { width: width - 16 });
        if (y + notesHeight + 26 > footerLimit(doc)) {
          doc.addPage();
          y = drawSlimHeader(doc, fonts, budget, authorName, logo, gradient);
        }
        paintAccent(doc, gradient, LEFT, y, 2.5, notesHeight + 28);
        doc.font(fonts.semi).fontSize(9).fillColor(NAVY)
          .text('Observaciones', LEFT + 12, y + 2, { lineBreak: false });
        doc.font(fonts.text).fontSize(9).fillColor(BODY)
          .text(String(budget.notes), LEFT + 12, y + 16, { width: width - 16 });
      }

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        const previousBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        const footerY = doc.page.height - 40;
        doc.moveTo(LEFT, footerY).lineTo(LEFT + contentWidth(doc), footerY).lineWidth(0.5).strokeColor(LINE).stroke();
        doc.font(fonts.text).fontSize(7.5).fillColor(MUTED)
          .text(
            `Elaborado por ${authorName}    ·    zenn.com.py    ·    Página ${i + 1} de ${range.count}`,
            LEFT,
            footerY + 10,
            { width: contentWidth(doc), align: 'center', lineBreak: false, height: 12 }
          );
        doc.page.margins.bottom = previousBottom;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function loadBudget(budgetId) {
  try {
    return await BudgetModel.findById(budgetId)
      .populate('client', 'name email phone company address taxId')
      .populate('items.product', 'productName productImage codigo brandName');
  } catch {
    return BudgetModel.findById(budgetId)
      .populate('client', 'name email phone company address taxId');
  }
}

function itemImageUrl(item) {
  const product = item.product && typeof item.product === 'object' ? item.product : null;
  const fromProduct = Array.isArray(product?.productImage) ? product.productImage.find(Boolean) : '';
  return fromProduct || item.productSnapshot?.image || '';
}

async function generateBudgetPDF(budgetId, options = {}) {
  const budget = await loadBudget(budgetId);
  if (!budget) {
    throw new Error('Presupuesto no encontrado');
  }

  let generatedByName = options.generatedByName || null;
  if (!generatedByName && isObjectId(options.generatedById)) {
    generatedByName = await resolvePersonName(options.generatedById);
  }
  const createdByName = await resolvePersonName(budget.createdBy);
  const authorName = generatedByName || createdByName || 'Equipo comercial Zenn';
  const creatorName = createdByName && generatedByName && createdByName !== generatedByName
    ? createdByName
    : null;

  const items = Array.isArray(budget.items) ? budget.items : [];
  const [logo, gradient, preparedItems] = await Promise.all([
    getLogoBuffer(),
    getGradientStrip(),
    mapPool(items, 4, async (item) => {
      const product = item.product && typeof item.product === 'object' ? item.product : null;
      const name = item.productSnapshot?.name || product?.productName || 'Producto';
      const brand = item.productSnapshot?.brandName || product?.brandName || '';
      const codigo = item.productSnapshot?.codigo || product?.codigo || '';
      const meta = [
        brand,
        codigo ? `Cód. ${codigo}` : ''
      ].filter(Boolean).join('   ·   ');

      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const discount = Number(item.discount) || 0;
      const subtotal = Number.isFinite(Number(item.subtotal))
        ? Number(item.subtotal)
        : quantity * unitPrice * (1 - discount / 100);

      return {
        name,
        meta,
        quantity: String(quantity),
        unitPrice: formatMoney(unitPrice),
        discount: discount ? `${discount}%` : '0%',
        subtotal: formatMoney(subtotal),
        image: await fetchImageJpeg(itemImageUrl(item))
      };
    })
  ]);

  return renderBudgetPdfBuffer({
    budget,
    authorName,
    creatorName,
    logo,
    gradient,
    rows: preparedItems
  });
}

module.exports = {
  generateBudgetPDF,
  resolvePersonName
};
