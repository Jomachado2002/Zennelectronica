'use strict';

const productModel = require('../models/productModel');
const SeoDailyReview = require('../models/seoDailyReviewModel');
const searchConsole = require('./searchConsoleClient');
const { buildReading } = require('./searchConsoleInsights');
const { askClaudeText, askGeminiText, parseJson } = require('./communityAi');
const { formatGuaranies } = require('./productSearchCopy');
const { refreshCategoryHubs } = require('./categorySeo');

const BATCH = 8;
const MAX_SLUG_CHANGES = 3;
let running = false;

function asuncionDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(date);
}

function asuncionHour(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Asuncion',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  return Number(parts.find((part) => part.type === 'hour')?.value || 0);
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1).replace(/\s+\S*$/, '').trim();
  return cut.length > 12 ? cut : text.slice(0, max).trim();
}

function acceptSlug(current, proposed) {
  const slug = String(proposed || '').toLowerCase().trim();
  const now = String(current || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return '';
  if (slug.length < 12 || slug.length > 70) return '';
  if (!now || slug === now) return '';
  if (slug.length > now.length - 10) return '';
  return slug;
}

function priceOk(description, priceLabel) {
  const digits = String(priceLabel || '').replace(/\D/g, '');
  return Boolean(digits) && String(description || '').replace(/\D/g, '').includes(digits);
}

async function searchSnapshot() {
  const status = searchConsole.configStatus();
  if (!status.configured) return null;
  const range = searchConsole.dateRange(28);
  const base = { type: 'web', dataState: 'all', aggregationType: 'auto' };
  const [totals, queries, pages] = await Promise.all([
    searchConsole.searchAnalytics(status.siteUrl, { ...base, startDate: range.startDate, endDate: range.endDate }),
    searchConsole.searchAnalytics(status.siteUrl, {
      ...base,
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ['query'],
      rowLimit: 25
    }),
    searchConsole.searchAnalytics(status.siteUrl, {
      ...base,
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ['page'],
      rowLimit: 40
    })
  ]);
  const summary = totals[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  return {
    siteUrl: status.siteUrl,
    range,
    summary,
    reading: buildReading(summary, null, range.days),
    queries: queries.slice(0, 12).map((row) => ({
      query: row.keys?.[0] || '',
      clicks: Math.round(row.clicks || 0),
      impressions: Math.round(row.impressions || 0),
      position: Number((row.position || 0).toFixed(1))
    })),
    pages: pages.map((row) => ({
      page: row.keys?.[0] || '',
      clicks: Math.round(row.clicks || 0),
      impressions: Math.round(row.impressions || 0),
      position: Number((row.position || 0).toFixed(1))
    }))
  };
}

function slugFromPage(page) {
  const match = String(page || '').match(/\/producto\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function inStock(product) {
  return product?.stock == null || Number(product.stock) > 0;
}

const productFields = 'productName slug sellingPrice stock seoTitle seoDescription seoStock brandName codigo';

async function retireFinishedStock() {
  const result = await productModel.updateMany(
    {
      stock: 0,
      $or: [{ seoTitle: { $nin: ['', null] } }, { seoDescription: { $nin: ['', null] } }]
    },
    { $set: { seoTitle: '', seoDescription: '', seoStock: 0 } }
  );
  return result.modifiedCount || 0;
}

async function pickProducts(search) {
  const slugs = [];
  for (const row of search?.pages || []) {
    const slug = slugFromPage(row.page);
    if (!slug || slugs.includes(slug)) continue;
    if (row.position >= 4 || row.impressions >= 30) slugs.push(slug);
    if (slugs.length >= 5) break;
  }
  const fromSearch = slugs.length
    ? await productModel.find({ slug: { $in: slugs }, stock: { $ne: 0 } }).select(productFields).lean()
    : [];
  const backInStock = await productModel
    .find({ stock: { $gt: 0 }, seoStock: 0 })
    .sort({ updatedAt: -1 })
    .limit(BATCH)
    .select(productFields)
    .lean();
  const rest = await productModel
    .find({
      stock: { $ne: 0 },
      slug: { $nin: [...fromSearch, ...backInStock].map((item) => item.slug) },
      $or: [{ seoTitle: '' }, { seoTitle: { $exists: false } }, { seoDescription: '' }, { seoDescription: { $exists: false } }]
    })
    .sort({ updatedAt: -1 })
    .limit(BATCH)
    .select(productFields)
    .lean();
  const seen = new Set();
  return [...backInStock, ...fromSearch, ...rest].filter((item) => {
    if (!item?.slug || seen.has(item.slug) || !inStock(item)) return false;
    seen.add(item.slug);
    return true;
  }).slice(0, BATCH);
}

async function rewriteProduct(product) {
  const price = formatGuaranies(product.sellingPrice);
  if (!product.productName || !price) return null;
  const draft = await askGeminiText(
    `Mejorá cómo este producto de Zenn aparece en Google, en Paraguay.
Nombre real, no lo cambies de producto: ${product.productName}
Precio exacto, tiene que quedar escrito igual: ${price}
URL actual: /producto/${product.slug}
Hoy hay stock. No escribas que está agotado.

Devolvé solo JSON:
{"seoTitle":"máximo 58 caracteres, con el modelo que la gente escribe","seoDescription":"máximo 150 caracteres, con el precio exacto, sin descuento inventado","slug":"solo si la URL actual es larga y se puede acortar sin perder el modelo","changeSlug":false}`,
    false
  );
  const review = await askClaudeText(
    `Revisá este JSON para una ficha de Zenn. El precio obligatorio es "${price}". El nombre real es: ${product.productName}
Si el precio cambió, si hay un descuento inventado, si el título habla de otro producto, o si promete salir primero en Google, devolvé {"ok":false}.
Si sirve, devolvé {"ok":true,"seoTitle":"...","seoDescription":"...","slug":"...","changeSlug":false}.
changeSlug solo puede ser true si la URL nueva es más corta y sigue identificando este modelo.
No agregues datos que no estén en el nombre.
Borrador:
${String(draft || '').slice(0, 800)}`,
    { maxTokens: 400, timeout: 25000 }
  );
  const parsed = parseJson(review);
  if (!parsed?.ok) return null;
  const seoTitle = clip(parsed.seoTitle, 58);
  const seoDescription = clip(parsed.seoDescription, 155);
  if (!seoTitle || !seoDescription || !priceOk(seoDescription, price)) return null;
  return {
    seoTitle,
    seoDescription,
    slug: parsed.changeSlug ? acceptSlug(product.slug, parsed.slug) : ''
  };
}

async function codePrompts(search) {
  const brief = [
    ...(search?.reading || []),
    'Consultas:',
    ...(search?.queries || []).map((row) => `${row.query} | impresiones ${row.impressions} | posición ${row.position}`)
  ].join('\n');
  const draft = await askGeminiText(
    `Sos el SEO de zenn.com.py, tienda en Paraguay. Con este informe de Search Console, decí hasta 3 cambios de código (no de un producto suelto) que subirían visitas y compras.
No pidas salir primeros en todas las búsquedas. Cada cambio tiene que ser concreto.
${brief || 'Sin datos de Search Console.'}
Devolvé solo JSON: {"prompts":[{"title":"","why":"","prompt":"instrucción lista para aplicar en el código"}]}`,
    false
  );
  const review = await askClaudeText(
    `Dejá solo los cambios de código que se pueden aplicar en la tienda. Máximo 3. Tirar los que inventan tráfico o piden trampas.
Devolvé solo JSON: {"prompts":[{"title":"","why":"","prompt":""}]}
Borrador:
${String(draft || '').slice(0, 1500)}`,
    { maxTokens: 900, timeout: 25000 }
  );
  const parsed = parseJson(review);
  return (Array.isArray(parsed?.prompts) ? parsed.prompts : [])
    .map((item) => ({
      title: clip(item.title, 80),
      why: clip(item.why, 220),
      prompt: clip(item.prompt, 700)
    }))
    .filter((item) => item.title && item.prompt)
    .slice(0, 3);
}

async function applyRewrite(product, rewrite, slugBudget) {
  const update = {
    seoTitle: rewrite.seoTitle,
    seoDescription: rewrite.seoDescription,
    seoStock: Number(product.stock) > 0 ? Number(product.stock) : 1
  };
  let nextSlug = '';
  if (rewrite.slug && slugBudget.left > 0) {
    const clash = await productModel.findOne({ slug: rewrite.slug }).select('_id').lean();
    if (!clash) {
      update.slug = rewrite.slug;
      nextSlug = rewrite.slug;
      slugBudget.left -= 1;
    }
  }
  const op = nextSlug
    ? { $set: update, $addToSet: { previousSlugs: product.slug } }
    : { $set: update };
  await productModel.updateOne({ _id: product._id }, op);
  return {
    codigo: product.codigo,
    productName: product.productName,
    slug: nextSlug || product.slug,
    previousSlug: nextSlug ? product.slug : '',
    seoTitle: rewrite.seoTitle,
    seoDescription: rewrite.seoDescription
  };
}

async function runDailySeoReview({ trigger = 'daily', force = false } = {}) {
  const day = asuncionDay();
  if (running) {
    const current = await SeoDailyReview.findOne({ day }).lean();
    return current;
  }
  let doc = await SeoDailyReview.findOne({ day });
  if (doc?.status === 'done' && !force) {
    if (!(trigger === 'worker' && !doc.afterSync)) return doc.toObject();
  }
  if (doc?.status === 'running') {
    const age = Date.now() - new Date(doc.updatedAt || doc.createdAt || 0).getTime();
    if (age < 20 * 60 * 1000) return doc.toObject();
  }

  running = true;
  try {
    if (!doc) doc = await SeoDailyReview.create({ day, status: 'running', trigger });
    else {
      doc.status = 'running';
      doc.trigger = trigger;
      doc.error = '';
      await doc.save();
    }

    let search = null;
    try {
      search = await searchSnapshot();
    } catch (error) {
      search = { error: searchConsole.explainError(error) };
    }

    const retired = await retireFinishedStock();
    const products = await pickProducts(search);
    const applied = [];
    const slugBudget = { left: MAX_SLUG_CHANGES };
    for (const product of products) {
      try {
        const rewrite = await rewriteProduct(product);
        if (!rewrite) continue;
        applied.push(await applyRewrite(product, rewrite, slugBudget));
      } catch (error) {
        applied.push({ codigo: product.codigo, error: error.message });
      }
    }

    let prompts = [];
    try {
      prompts = await codePrompts(search);
    } catch (error) {
      prompts = [{ title: 'No se pudo redactar el cambio de código', why: error.message, prompt: '' }];
    }

    let hubs = [];
    try {
      hubs = await refreshCategoryHubs(day);
    } catch (error) {
      hubs = [{ error: error.message }];
    }

    doc.search = search;
    doc.applied = (Array.isArray(doc.applied) ? doc.applied : []).concat(applied);
    doc.codePrompts = prompts.filter((item) => item.prompt);
    const written = applied.filter((item) => item.seoTitle).length;
    const parts = [];
    if (retired) parts.push(`Se retiró el texto de compra de ${retired} fichas que se quedaron sin stock.`);
    if (written) parts.push(`Se reescribieron ${written} fichas que sí tienen stock, con el precio revisado.`);
    const hubCount = hubs.filter((item) => item.seoTitle).length;
    if (hubCount) parts.push(`Se actualizaron ${hubCount} categorías para búsquedas generales.`);
    doc.note = parts.join(' ') || 'Hoy no hubo una ficha con stock cuyo texto pasara la revisión.';
    doc.stockRetired = retired;
    doc.hubs = hubs.filter((item) => item.seoTitle);
    doc.status = 'done';
    doc.afterSync = doc.afterSync || trigger === 'worker';
    doc.error = '';
    await doc.save();
    return doc.toObject();
  } catch (error) {
    if (doc) {
      doc.status = 'error';
      doc.error = error.message;
      await doc.save().catch(() => {});
    }
    throw error;
  } finally {
    running = false;
  }
}

function startSeoDailySchedule() {
  if (process.env.VERCEL) return;
  const tick = () => {
    if (asuncionHour() < 8) return;
    runDailySeoReview({ trigger: 'daily' }).catch((error) => {
      console.error('[seo diario]', error.message);
    });
  };
  setTimeout(tick, 90 * 1000);
  setInterval(tick, 60 * 60 * 1000);
}

module.exports = {
  acceptSlug,
  asuncionDay,
  runDailySeoReview,
  startSeoDailySchedule
};
