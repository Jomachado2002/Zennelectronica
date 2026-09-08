'use strict';

const archiver = require('archiver');
const sharp = require('sharp');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const { getSharedBrowser } = require('../../helpers/sharedChrome');
const {
  buildCreativePayload,
  listSelectFields,
  FORMATS
} = require('../../services/creativePayload');
const { renderCreativeHtml } = require('../../services/creativeHtml');
const { getLogoWhiteDataUri, getPhotoDataUri } = require('../../services/creativeImage');

const MAX_LIST = 500;
const MAX_SCAN = 2000;
const MAX_EXPORT = 30;
const ALLOWED_FORMATS = new Set(Object.keys(FORMATS));

const PRODUCT_GROUPS = {
  phones: [
    { category: 'celulares_y_tablets', subcategory: 'smartphones_y_celulares__32_01' },
    { category: 'apple', subcategory: 'iphone__19_04' }
  ],
  headphones: [
    { category: 'perifericos', subcategory: 'auriculares_y_accesorios__30_05' },
    { category: 'apple', subcategory: 'airpods__19_10' }
  ],
  cases: [
    { category: 'gabinetes', subcategory: 'gabinetes__28' }
  ],
  iphone: [
    { category: 'apple', subcategory: 'iphone__19_04' }
  ]
};

function parseFormat(value) {
  const f = String(value || 'feed').toLowerCase();
  return ALLOWED_FORMATS.has(f) ? f : 'feed';
}

function slugFile(parts) {
  return parts
    .map((p) => String(p || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('-')
    .slice(0, 80);
}

async function waitForAssets(page, ms = 4000) {
  try {
    await Promise.race([
      page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await Promise.all(
          Array.from(document.images).map(
            (img) =>
              new Promise((resolve) => {
                if (img.complete) return resolve();
                img.onload = img.onerror = () => resolve();
              })
          )
        );
      }),
      new Promise((resolve) => setTimeout(resolve, ms))
    ]);
  } catch {
    /* seguir igual */
  }
}

async function renderCreativeDocument(payload, format) {
  const urls = (payload.images && payload.images.length ? payload.images : [payload.imageUrl]).filter(Boolean).slice(0, 5);
  const [logoDataUri, ...uris] = await Promise.all([
    getLogoWhiteDataUri(),
    ...urls.map((url) => getPhotoDataUri(url))
  ]);
  const gallery = urls.map((url, i) => ({
    uri: uris[i],
    active: i === (payload.imageIndex || 0)
  })).filter((g) => g.uri);
  const photoDataUri = gallery.find((g) => g.active)?.uri || uris[0] || '';
  return renderCreativeHtml(payload, format, { logoDataUri, photoDataUri, gallery });
}

async function renderPngBuffer(payload, format) {
  const size = FORMATS[format] || FORMATS.feed;
  const html = await renderCreativeDocument(payload, format);
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await waitForAssets(page, 6000);
    const png = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: size.w, height: size.h },
      omitBackground: false
    });
    return sharp(png)
      .resize(size.w, size.h, { kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toBuffer();
  } finally {
    try {
      await page.close();
    } catch {
      /* ignore */
    }
  }
}

function buildListFilter(query) {
  const filter = { stock: { $gt: 0 }, productImage: { $exists: true, $ne: [] } };
  const group = PRODUCT_GROUPS[String(query.group || '').toLowerCase()];
  const category = String(query.category || '').trim();
  const subcategory = String(query.subcategory || '').trim();
  const q = String(query.q || '').trim();
  const and = [];

  if (group) {
    and.push({ $or: group });
  } else {
    if (category && category !== 'all') filter.category = category;
    if (subcategory && subcategory !== 'all') filter.subcategory = subcategory;
  }

  if (q) {
    and.push({
      $or: [
        { productName: { $regex: q, $options: 'i' } },
        { brandName: { $regex: q, $options: 'i' } },
        { codigo: { $regex: q, $options: 'i' } }
      ]
    });
  }
  if (and.length) filter.$and = and;
  return filter;
}

function toListItem(p, theme) {
  const payload = buildCreativePayload(p, { theme });
  return {
    id: payload.id,
    codigo: payload.codigo,
    slug: payload.slug,
    brandName: payload.brandName,
    productName: payload.productName,
    title: payload.title,
    kicker: payload.kicker,
    family: payload.family,
    hasGpu: payload.hasGpu,
    theme: payload.theme,
    specs: payload.specs,
    price: payload.price,
    sellingPrice: payload.sellingPrice,
    stock: payload.stock,
    imageUrl: payload.imageUrl,
    images: payload.images,
    imageCount: payload.images.length,
    instagramCaption: payload.instagramCaption
  };
}

const listCreativeProducts = async (req, res) => {
  try {
    const limit = Math.min(MAX_LIST, Math.max(1, Number(req.query.limit) || 200));
    const skip = Math.max(0, Number(req.query.skip) || 0);
    const filter = buildListFilter(req.query);
    const lane = String(req.query.lane || 'all').toLowerCase();
    const needsGpuFilter = lane === 'gamer' || lane === 'office';

    let data;
    let total;

    if (needsGpuFilter) {
      const products = await Product.find(filter)
        .select(listSelectFields())
        .sort({ brandName: 1, sellingPrice: 1 })
        .limit(MAX_SCAN)
        .lean();
      data = products.map((p) => toListItem(p, req.query.theme));
      if (lane === 'gamer') data = data.filter((p) => p.hasGpu);
      if (lane === 'office') data = data.filter((p) => !p.hasGpu);
      total = data.length;
      data = data.slice(skip, skip + limit);
    } else {
      total = await Product.countDocuments(filter);
      const products = await Product.find(filter)
        .select(listSelectFields())
        .sort({ brandName: 1, sellingPrice: 1 })
        .skip(skip)
        .limit(limit)
        .lean();
      data = products.map((p) => toListItem(p, req.query.theme));
    }

    return res.json({
      success: true,
      data,
      total,
      skip,
      limit,
      hasMore: skip + data.length < total,
      formats: FORMATS
    });
  } catch (error) {
    console.error('[creativos] list', error);
    return res.status(500).json({ success: false, message: 'Error listando productos para creativos' });
  }
};

const getCreativeCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name label value subcategories')
      .sort({ order: 1 })
      .lean();

    return res.json({
      success: true,
      data: categories.map((cat) => ({
        value: cat.value,
        label: cat.label,
        name: cat.name,
        subcategories: (cat.subcategories || [])
          .filter((sub) => sub.isActive)
          .map((sub) => ({ value: sub.value, label: sub.label, name: sub.name }))
      }))
    });
  } catch (error) {
    console.error('[creativos] categories', error);
    return res.status(500).json({ success: false, message: 'Error obteniendo categorías' });
  }
};

function applyOverrides(payload, body = {}) {
  return {
    ...payload,
    title: body.title ? String(body.title).trim() : payload.title,
    cta: body.cta ? String(body.cta).trim() : payload.cta,
    theme: body.theme === 'studio' || body.theme === 'gamer' ? body.theme : payload.theme
  };
}

async function loadProductPayload(id, options) {
  const product = await Product.findById(id).select(listSelectFields()).lean();
  if (!product) return null;
  return buildCreativePayload(product, options);
}

const previewCreativeHtml = async (req, res) => {
  try {
    const format = parseFormat(req.query.format);
    const payload = await loadProductPayload(req.params.id, {
      theme: req.query.theme,
      title: req.query.title,
      cta: req.query.cta,
      imageIndex: req.query.imageIndex,
      format
    });
    if (!payload) return res.status(404).type('text/plain').send('Producto no encontrado');
    const html = await renderCreativeDocument(applyOverrides(payload, req.query), format);
    res.setHeader('Cache-Control', 'no-store');
    return res.type('html').send(html);
  } catch (error) {
    console.error('[creativos] html', error);
    return res.status(500).type('text/plain').send('Error generando preview');
  }
};

const previewCreativePng = async (req, res) => {
  try {
    const format = parseFormat(req.query.format);
    const payload = await loadProductPayload(req.params.id, {
      theme: req.query.theme,
      title: req.query.title,
      cta: req.query.cta,
      imageIndex: req.query.imageIndex,
      format
    });
    if (!payload) return res.status(404).type('text/plain').send('Producto no encontrado');
    const png = await renderPngBuffer(applyOverrides(payload, req.query), format);
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=60'
    });
    return res.send(png);
  } catch (error) {
    console.error('[creativos] png', error);
    return res.status(500).type('text/plain').send('Error generando PNG');
  }
};

const downloadCreativePng = async (req, res) => {
  try {
    const format = parseFormat(req.query.format);
    const payload = await loadProductPayload(req.params.id, {
      theme: req.query.theme,
      title: req.query.title,
      cta: req.query.cta,
      imageIndex: req.query.imageIndex,
      format
    });
    if (!payload) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    const finalPayload = applyOverrides(payload, req.query);
    const png = await renderPngBuffer(finalPayload, format);
    const fileName = `${slugFile(['zenn', payload.family, payload.title, format])}.png`;
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${fileName}"`
    });
    return res.send(png);
  } catch (error) {
    console.error('[creativos] download one', error);
    return res.status(500).json({ success: false, message: 'Error descargando creativo' });
  }
};

const exportCreativeZip = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.productIds) ? req.body.productIds.slice(0, MAX_EXPORT) : [];
    if (!ids.length) {
      return res.status(400).json({ success: false, message: 'Seleccioná al menos un producto' });
    }

    let formats = Array.isArray(req.body.formats) ? req.body.formats.map(parseFormat) : ['feed'];
    formats = [...new Set(formats)].slice(0, 3);
    if (!formats.length) formats = ['feed'];

    const overridesById = req.body.overrides && typeof req.body.overrides === 'object' ? req.body.overrides : {};
    const theme = req.body.theme;

    const products = await Product.find({ _id: { $in: ids }, stock: { $gt: 0 } })
      .select(listSelectFields())
      .lean();

    if (!products.length) {
      return res.status(404).json({ success: false, message: 'No hay productos con stock para exportar' });
    }

    const ordered = ids
      .map((id) => products.find((p) => String(p._id) === String(id)))
      .filter(Boolean);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="zenn-creativos-${new Date().toISOString().slice(0, 10)}.zip"`
    );

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      console.error('[creativos] zip', err);
      try {
        res.end();
      } catch {
        /* ignore */
      }
    });
    archive.pipe(res);

    for (const product of ordered) {
      const extra = overridesById[String(product._id)] || {};
      for (const format of formats) {
        const payload = applyOverrides(
          buildCreativePayload(product, {
            theme: extra.theme || theme,
            title: extra.title,
            cta: extra.cta,
            imageIndex: extra.imageIndex,
            format
          }),
          extra
        );
        const png = await renderPngBuffer(payload, format);
        archive.append(png, {
          name: `${slugFile(['zenn', payload.family, payload.title, format])}.png`
        });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('[creativos] zip export', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Error exportando creativos' });
    }
  }
};

module.exports = {
  listCreativeProducts,
  getCreativeCategories,
  previewCreativeHtml,
  previewCreativePng,
  downloadCreativePng,
  exportCreativeZip,
  MAX_EXPORT
};
