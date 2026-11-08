'use strict';

const sharp = require('sharp');
const Product = require('../models/productModel');
const Brand = require('../models/brandModel');
const AiImage = require('../models/aiImageModel');
const { getSharedBrowser } = require('../helpers/sharedChrome');
const { askClaudeMessages, parseJson, claudeReady } = require('./communityAi');
const {
  getLogoWhiteDataUri,
  getLogoColorDataUri,
  getLogoInkDataUri,
  getBrandLogoDataUri,
  getCutoutDataUri,
  getPhotoDataUri
} = require('./creativeImage');
const { uploadLogoBuffer, deleteLogoObject } = require('./logoStorageService');

const FORMATS = {
  feed: { w: 1080, h: 1350, label: 'Feed 4:5' },
  story: { w: 1080, h: 1920, label: 'Story 9:16' },
  square: { w: 1080, h: 1080, label: 'Cuadrado 1:1' }
};

const STOP = new Set(`
el la los las un una unos unas de del al y o u en con para por que como mas
esto esta ese esa eso me mi te tu su lo le se es son ser hacer haceme hace
arma armame quiero una imagen grafica flyer post feed story cuadrado fondo
color logo producto productos zenn precio grande chico oscuro clara claro negro
blanco texto titulo fuente tipografia html jpg jpeg png chat pieza creativo
poner pone ponele dejalo hacelo hacele ahora mejor cambialo cambiala cambiale
agranda achica oscurece aclara mueve sube baja
`.trim().split(/\s+/));

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function formatOf(value) {
  const key = String(value || 'feed').toLowerCase();
  return FORMATS[key] ? key : 'feed';
}

function formatGs(n) {
  return `Gs. ${Math.round(Number(n) || 0).toLocaleString('es-PY')}`;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokensFrom(message) {
  return String(message || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP.has(token))
    .slice(0, 6);
}

function priceLine(product) {
  const sell = Number(product.sellingPrice) || Number(product.price) || 0;
  const list = Number(product.price) || sell;
  const onOffer = list > sell && sell > 0 && (list - sell) / list >= 0.01;
  return onOffer ? `${formatGs(sell)} (antes ${formatGs(list)})` : formatGs(sell);
}

function specLine(product) {
  return [product.processor, product.memory, product.storage, product.graphicsCard, product.monitorSize, product.notebookScreen]
    .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
    .filter((value) => value && value.length <= 42)
    .slice(0, 3)
    .join(' · ');
}

function imageUrls(product) {
  return (Array.isArray(product.productImage) ? product.productImage : [])
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url.trim()))
    .map((url) => url.trim())
    .slice(0, 2);
}

function summarize(product) {
  return {
    codigo: String(product.codigo || '').toUpperCase(),
    name: String(product.productName || '').replace(/\s+/g, ' ').trim(),
    brand: String(product.brandName || '').trim(),
    priceText: priceLine(product),
    specs: specLine(product),
    images: imageUrls(product)
  };
}

async function searchProducts(message) {
  const tokens = tokensFrom(message);
  if (!tokens.length) return [];
  const phrase = tokens.slice(0, 4).map(escapeRegex).join('.*');
  const ors = [{ productName: { $regex: phrase, $options: 'i' } }];
  tokens.forEach((token) => {
    const rx = new RegExp(escapeRegex(token), 'i');
    ors.push({ productName: rx }, { brandName: rx }, { codigo: rx });
  });
  const found = await Product.find({ stock: { $gt: 0 }, $or: ors })
    .select('productName brandName codigo sellingPrice price productImage processor memory storage graphicsCard monitorSize notebookScreen')
    .limit(24)
    .lean();
  return found
    .map((product) => {
      const blob = `${product.productName} ${product.brandName} ${product.codigo}`.toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (blob.includes(token) ? (token.length >= 5 ? 2 : 1) : 0), 0);
      return { product, score };
    })
    .filter((item) => item.score >= 2 || (tokens.length === 1 && item.score >= 1))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => summarize(item.product));
}

function wantsMore(message) {
  return /agreg|sum[aá]|tambi[eé]n|y el |y la |otro /i.test(message);
}

async function hydrate(list) {
  const codes = [...new Set((list || []).map((item) => String(item.codigo || '').toUpperCase()).filter(Boolean))];
  if (!codes.length) return [];
  const found = await Product.find({ codigo: { $in: codes } })
    .select('productName brandName codigo sellingPrice price productImage processor memory storage graphicsCard monitorSize notebookScreen')
    .lean();
  const byCode = new Map(found.map((item) => [String(item.codigo || '').toUpperCase(), summarize(item)]));
  return codes.map((code) => byCode.get(code)).filter(Boolean);
}

async function resolveProducts(message, previous) {
  const found = await searchProducts(message);
  const prior = await hydrate(previous);
  if (!found.length) return prior;
  if (!prior.length) return found;
  if (wantsMore(message)) {
    const seen = new Set(prior.map((item) => item.codigo));
    return prior.concat(found.filter((item) => !seen.has(item.codigo))).slice(0, 4);
  }
  return found;
}

function brandMentioned(brand, text) {
  const hay = String(text || '').toLowerCase();
  return [brand.name, brand.slug, ...(brand.aliases || [])]
    .map((name) => String(name || '').trim().toLowerCase())
    .filter((name) => name.length >= 3)
    .some((name) => hay.includes(name));
}

async function brandsFor(message, products) {
  const brands = await Brand.find({ isActive: true, logoUrl: { $nin: [null, ''] } })
    .select('name slug aliases logoUrl')
    .lean();
  const productBrands = new Set(products.map((item) => String(item.brand || '').toLowerCase()).filter(Boolean));
  return brands
    .filter((brand) => brandMentioned(brand, message) || productBrands.has(String(brand.name || '').toLowerCase()))
    .slice(0, 8);
}

async function photoDataUri(url) {
  if (!url) return '';
  const cut = await getCutoutDataUri(url);
  if (cut) return cut;
  return getPhotoDataUri(url);
}

async function prepareAssets(products, brands) {
  const [zenn, zennColor, zennInk, photos, logos] = await Promise.all([
    getLogoWhiteDataUri(),
    getLogoColorDataUri(),
    getLogoInkDataUri(),
    Promise.all(products.map(async (product) => {
      const uris = await Promise.all((product.images || []).map((url) => photoDataUri(url)));
      return [product.codigo, uris.filter(Boolean)];
    })),
    Promise.all(brands.map(async (brand) => [brand.slug, await getBrandLogoDataUri(brand.logoUrl)]))
  ]);
  return {
    zenn,
    zennColor,
    zennInk,
    productos: Object.fromEntries(photos),
    marcas: Object.fromEntries(logos.filter((entry) => entry[1]))
  };
}

function catalogBlock(products, brands, format, previousHtml) {
  const size = FORMATS[format];
  const productLines = products.length
    ? products.map((item) => {
      const extra = item.images.length > 1 ? ` Segunda foto: {{producto:${item.codigo}:2}}` : '';
      const specs = item.specs ? ` · ${item.specs}` : '';
      return `- {{producto:${item.codigo}}} ${item.name} · ${item.brand || 'sin marca'} · ${item.priceText}${specs}${extra}`;
    }).join('\n')
    : 'Ninguno. No inventes un producto ni una foto. Si pidió uno que no está, decilo en reply y no lo dibujes.';
  const brandLines = brands.length
    ? brands.map((brand) => `- {{marca:${brand.slug}}} ${brand.name}`).join('\n')
    : 'Ninguno además del de Zenn.';
  const prior = previousHtml
    ? `\nHTML actual. Editalo: no lo reemplaces entero salvo que el pedido cambie la pieza.\n${previousHtml.slice(0, 50000)}`
    : '';
  return `Lienzo exacto ${size.w}×${size.h} (${size.label}).
Logos de Zenn, uno solo, chico, en una esquina, salvo que pidan otra cosa:
- {{zenn}} blanco, para fondo oscuro
- {{zenn-color}} a color
- {{zenn-negro}} negro, para fondo claro
Logos de marca:
${brandLines}
Productos reales, con stock. El precio es el nuestro, en guaraníes. No inventes otro precio, otro descuento ni otro modelo.
${productLines}
WhatsApp de la tienda, solo si lo piden o como pie chico: 0973 345 284. Entrega en Asunción en 24 h.
${prior}`;
}

const SYSTEM = `Sos el director de arte de Zenn Electrónicos, en Asunción. Armás una sola pieza gráfica en HTML y CSS, del tamaño exacto que te pasan.
Seguí el pedido al pie de la letra: colores, texto, composición y qué tiene que verse. Si te piden un cambio, editá la pieza anterior.
Las fotos y los logos solo entran con los tokens {{zenn}}, {{zenn-color}}, {{zenn-negro}}, {{producto:CODIGO}}, {{producto:CODIGO:2}} y {{marca:slug}}. No uses otras URLs ni imágenes de internet.
La foto del producto va en un img con ese token, grande, sin tarjeta blanca detrás salvo que la pidan. El logo de la marca, si entra, usa su token.
Devolvé solo JSON, sin markdown:
{"title":"nombre corto de la pieza","reply":"qué hiciste, en una frase, en español","html":"<!DOCTYPE html>..."}
El html lleva el CSS en un <style>, fuentes de Google si hacen falta (con fallback Arial, sans-serif), body en margin 0 y del tamaño exacto del lienzo. Sin JavaScript, sin iframe, sin formularios. Todo el texto entra. El precio, si va, se lee entero.`;

function extractDesign(text) {
  const parsed = parseJson(text);
  if (parsed && (parsed.html || parsed.reply)) {
    return {
      html: String(parsed.html || '').trim(),
      reply: String(parsed.reply || '').trim(),
      title: String(parsed.title || '').replace(/\s+/g, ' ').trim().slice(0, 80)
    };
  }
  const raw = String(text || '');
  const fenced = raw.match(/```html\s*([\s\S]*?)```/i);
  const chunk = fenced ? fenced[1] : raw;
  const start = chunk.search(/<!DOCTYPE|<html/i);
  const end = chunk.toLowerCase().lastIndexOf('</html>');
  const html = start >= 0 && end > start ? chunk.slice(start, end + 7).trim() : '';
  return { html, reply: html ? 'Actualicé la pieza.' : '', title: '' };
}

function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '');
}

function usableHtml(html, products) {
  if (!html || html.length < 80 || html.length > 100000) return false;
  if (/<script/i.test(html)) return false;
  if (!/<(style|body|html)\b/i.test(html)) return false;
  if (products.length && !/\{\{producto:/i.test(html)) return false;
  return true;
}

function fillTokens(html, assets) {
  return html.replace(/\{\{(zenn-color|zenn-negro|zenn|producto:[A-Za-z0-9._-]+(?::\d+)?|marca:[A-Za-z0-9_-]+)\}\}/gi, (_token, inner) => {
    const key = String(inner || '');
    const lower = key.toLowerCase();
    if (lower === 'zenn') return assets.zenn || PIXEL;
    if (lower === 'zenn-color') return assets.zennColor || assets.zenn || PIXEL;
    if (lower === 'zenn-negro') return assets.zennInk || PIXEL;
    if (lower.startsWith('marca:')) return assets.marcas[lower.slice(6)] || PIXEL;
    const match = key.match(/^producto:([^:]+)(?::(\d+))?$/i);
    if (!match) return PIXEL;
    const list = assets.productos[match[1].toUpperCase()] || [];
    const index = Math.max(0, (Number(match[2]) || 1) - 1);
    return list[index] || list[0] || PIXEL;
  });
}

function lockCanvas(html, format) {
  const size = FORMATS[format];
  const css = `<style id="zenn-canvas">html,body{margin:0!important;padding:0!important;width:${size.w}px!important;height:${size.h}px!important;overflow:hidden!important;}</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${css}</head>`);
  if (/<html[\s>]/i.test(html)) return html.replace(/<html([^>]*)>/i, `<html$1><head><meta charset="utf-8">${css}</head>`);
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${css}</head><body>${html}</body></html>`;
}

async function waitForAssets(page) {
  try {
    await Promise.race([
      page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await Promise.all(Array.from(document.images).map((img) => (img.complete
          ? Promise.resolve()
          : new Promise((resolve) => { img.onload = img.onerror = () => resolve(); }))));
      }),
      new Promise((resolve) => setTimeout(resolve, 8000))
    ]);
  } catch {
    /* la captura sigue igual */
  }
}

async function renderJpeg(html, format) {
  const size = FORMATS[format];
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await waitForAssets(page);
    const shot = await page.screenshot({
      type: 'jpeg',
      quality: 90,
      clip: { x: 0, y: 0, width: size.w, height: size.h }
    });
    return sharp(shot).resize(size.w, size.h).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  } finally {
    try {
      await page.close();
    } catch {
      /* ignore */
    }
  }
}

async function designFromClaude({ message, format, products, brands, history, previousHtml }) {
  const prompt = `${catalogBlock(products, brands, format, previousHtml)}

Pedido de ahora:
${message}`;
  const prior = (history || []).slice(-8).map((item) => ({
    role: item.role,
    content: String(item.text || '').slice(0, 700)
  }));
  const turns = prior.concat([{ role: 'user', content: prompt }]);
  let last = { html: '', reply: '', title: '' };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const extra = attempt
      ? '\n\nLa respuesta anterior no sirvió: faltaba el HTML, tenía script, o no usaba {{producto:CODIGO}} de la lista. Devolvé el JSON de nuevo, con el html completo.'
      : '';
    const text = await askClaudeMessages({
      system: SYSTEM,
      messages: attempt ? turns.concat([{ role: 'user', content: extra.trim() }]) : turns,
      maxTokens: 8000,
      timeout: 90000
    });
    last = extractDesign(text);
    const clean = sanitizeHtml(last.html);
    const mustShowProduct = !previousHtml;
    if (usableHtml(clean, mustShowProduct ? products : [])) return { ...last, html: clean };
    last.html = clean;
  }
  if (!usableHtml(last.html, previousHtml ? [] : products)) {
    const error = new Error(last.reply || 'Claude no devolvió una pieza usable');
    error.status = 502;
    throw error;
  }
  return { ...last, html: last.html };
}

function present(doc, { preview = false, withChat = false } = {}) {
  const jpeg = doc.jpeg;
  const hasJpeg = Buffer.isBuffer(jpeg) ? jpeg.length > 0 : Boolean(jpeg && jpeg.buffer);
  const previewSrc = preview && hasJpeg
    ? `data:image/jpeg;base64,${Buffer.from(jpeg).toString('base64')}`
    : (doc.imageUrl || '');
  const base = {
    id: String(doc._id),
    title: doc.title || 'Sin título',
    format: doc.format || 'feed',
    status: doc.status || 'draft',
    imageUrl: doc.imageUrl || '',
    lastNote: doc.lastNote || '',
    products: doc.products || [],
    updatedAt: doc.updatedAt,
    preview: previewSrc
  };
  if (!withChat) return base;
  return {
    ...base,
    messages: (doc.messages || []).map((item) => ({
      role: item.role,
      text: item.text,
      at: item.createdAt
    }))
  };
}

async function listAiImages() {
  const items = await AiImage.find()
    .sort({ updatedAt: -1 })
    .limit(60)
    .select('title format status imageUrl lastNote products updatedAt')
    .lean();
  return {
    claude: claudeReady(),
    formats: Object.entries(FORMATS).map(([id, size]) => ({ id, label: size.label, w: size.w, h: size.h })),
    items: items.map((item) => present(item))
  };
}

async function getAiImage(id) {
  const doc = await AiImage.findById(id);
  if (!doc) {
    const error = new Error('Esa imagen no está');
    error.status = 404;
    throw error;
  }
  return present(doc, { preview: true, withChat: true });
}

async function chatAiImage({ sessionId, message, format, userId }) {
  const text = String(message || '').replace(/\s+/g, ' ').trim();
  if (text.length < 2) {
    const error = new Error('Escribí qué imagen querés');
    error.status = 400;
    throw error;
  }
  if (!claudeReady()) {
    const error = new Error('Falta la clave de Claude (ANTHROPIC_API_KEY)');
    error.status = 503;
    throw error;
  }
  const chosen = formatOf(format);
  let doc = null;
  if (sessionId) {
    doc = await AiImage.findById(sessionId);
    if (!doc) {
      const error = new Error('Ese chat no está');
      error.status = 404;
      throw error;
    }
  } else {
    doc = new AiImage({ format: chosen, createdBy: String(userId || ''), title: text.slice(0, 72) });
  }
  doc.format = chosen;
  const products = await resolveProducts(text, doc.products);
  const brands = await brandsFor(text, products);
  const assetsReady = prepareAssets(products, brands).catch((error) => {
    console.error('[imagenes ai] fotos', error.message || error);
    return { zenn: '', zennColor: '', zennInk: '', productos: {}, marcas: {} };
  });
  const history = (doc.messages || []).slice(-8);
  doc.messages.push({ role: 'user', text });
  const design = await designFromClaude({
    message: text,
    format: chosen,
    products,
    brands,
    history,
    previousHtml: doc.html
  });
  const assets = await assetsReady;
  const filled = lockCanvas(fillTokens(design.html, assets), chosen);
  const jpeg = await renderJpeg(filled, chosen);
  doc.html = design.html;
  doc.jpeg = jpeg;
  doc.products = products.map((item) => ({
    codigo: item.codigo,
    name: item.name,
    brand: item.brand,
    priceText: item.priceText
  }));
  doc.lastNote = design.reply || 'Pieza actualizada.';
  if (design.title && (!doc.title || doc.messages.length <= 2)) doc.title = design.title;
  doc.messages.push({ role: 'assistant', text: doc.lastNote });
  if (doc.messages.length > 40) doc.messages = doc.messages.slice(-40);
  if (doc.status === 'saved') {
    const uploaded = await storeJpeg(doc, jpeg);
    doc.imageUrl = uploaded.url;
    doc.imageKey = uploaded.key;
    doc.jpeg = undefined;
  }
  await doc.save();
  if (doc.status === 'saved') {
    await AiImage.updateOne({ _id: doc._id }, { $unset: { jpeg: 1 } });
  }
  return present(doc, { preview: true, withChat: true });
}

async function storeJpeg(doc, jpeg) {
  const key = `ai-images/${doc._id}-${Date.now()}.jpg`;
  const uploaded = await uploadLogoBuffer(jpeg, key, 'image/jpeg');
  if (doc.imageKey && doc.imageKey !== uploaded.key) {
    try {
      await deleteLogoObject({ logoUrl: doc.imageUrl, logoKey: doc.imageKey });
    } catch (error) {
      console.error('[imagenes ai] no se pudo borrar la anterior', error.message || error);
    }
  }
  return uploaded;
}

async function finalizeAiImage(id) {
  const doc = await AiImage.findById(id);
  if (!doc) {
    const error = new Error('Esa imagen no está');
    error.status = 404;
    throw error;
  }
  if (!doc.jpeg || !doc.jpeg.length) {
    if (doc.status === 'saved' && doc.imageUrl) return present(doc, { preview: true, withChat: true });
    const error = new Error('Todavía no hay una imagen para guardar');
    error.status = 400;
    throw error;
  }
  const uploaded = await storeJpeg(doc, doc.jpeg);
  doc.imageUrl = uploaded.url;
  doc.imageKey = uploaded.key;
  doc.status = 'saved';
  doc.jpeg = undefined;
  await doc.save();
  await AiImage.updateOne({ _id: doc._id }, { $unset: { jpeg: 1 } });
  return present(doc, { preview: true, withChat: true });
}

async function deleteAiImage(id) {
  const doc = await AiImage.findById(id);
  if (!doc) {
    const error = new Error('Esa imagen no está');
    error.status = 404;
    throw error;
  }
  if (doc.imageKey || doc.imageUrl) {
    try {
      await deleteLogoObject({ logoUrl: doc.imageUrl, logoKey: doc.imageKey });
    } catch (error) {
      console.error('[imagenes ai] borrar archivo', error.message || error);
    }
  }
  await doc.deleteOne();
  return { id: String(id) };
}

module.exports = {
  FORMATS,
  claudeReady,
  listAiImages,
  getAiImage,
  chatAiImage,
  finalizeAiImage,
  deleteAiImage
};
