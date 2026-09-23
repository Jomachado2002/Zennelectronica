'use strict';

const archiver = require('archiver');
const sharp = require('sharp');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const CreativeDownload = require('../../models/creativeDownloadModel');
const { getSharedBrowser } = require('../../helpers/sharedChrome');
const {
  buildCreativePayload,
  listSelectFields,
  loadSpecSchemaMap,
  schemaFor,
  instagramCaption,
  FORMATS
} = require('../../services/creativePayload');
const { renderCreativeHtml } = require('../../services/creativeHtml');
const { getLogoWhiteDataUri, getLogoColorDataUri, getPhotoDataUri, getBrandLogoDataUri } = require('../../services/creativeImage');
const { getLogoMap, normalizeBrandSlug } = require('../../services/brandLogoService');

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
  const logoMap = await getLogoMap();
  const brandHit = payload.brandName ? logoMap[normalizeBrandSlug(payload.brandName)] : null;
  const [logoDataUri, brandLogoDataUri, ...uris] = await Promise.all([
    payload.scene === 'cielo' ? getLogoColorDataUri() : getLogoWhiteDataUri(),
    brandHit?.logoUrl ? getBrandLogoDataUri(brandHit.logoUrl) : Promise.resolve(''),
    ...urls.map((url) => getPhotoDataUri(url))
  ]);
  const gallery = urls.map((url, i) => ({
    uri: uris[i],
    active: i === (payload.imageIndex || 0)
  })).filter((g) => g.uri);
  const photoDataUri = gallery.find((g) => g.active)?.uri || uris[0] || '';
  return renderCreativeHtml(payload, format, { logoDataUri, brandLogoDataUri, photoDataUri, gallery });
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
    const subList = String(query.subcategories || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (subList.length > 1) {
      filter.subcategory = { $in: subList };
    } else if (subcategory && subcategory !== 'all') {
      filter.subcategory = subcategory;
    } else if (subList.length === 1) {
      filter.subcategory = subList[0];
    }
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

function toListItem(p, theme, schemaMap) {
  const payload = buildCreativePayload(p, { theme, specSchema: schemaFor(schemaMap, p) });
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
    detail: payload.detail,
    instagramCaption: payload.instagramCaption
  };
}

function sortByLastDownload(items) {
  return items.slice().sort((a, b) => {
    const ta = a.lastDownloadedAt ? new Date(a.lastDownloadedAt).getTime() : 0;
    const tb = b.lastDownloadedAt ? new Date(b.lastDownloadedAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return String(a.brandName || '').localeCompare(String(b.brandName || ''), 'es');
  });
}

async function withDownloadDates(items) {
  if (!items.length) return items;
  const rows = await CreativeDownload.find({ product: { $in: items.map((item) => item.id) } })
    .select('product lastDownloadedAt count')
    .lean();
  const map = new Map(rows.map((row) => [String(row.product), row]));
  return items.map((item) => {
    const row = map.get(String(item.id));
    return {
      ...item,
      lastDownloadedAt: row?.lastDownloadedAt || null,
      downloadCount: row?.count || 0
    };
  });
}

const listCreativeProducts = async (req, res) => {
  try {
    const limit = Math.min(MAX_LIST, Math.max(1, Number(req.query.limit) || 200));
    const skip = Math.max(0, Number(req.query.skip) || 0);
    const filter = buildListFilter(req.query);
    const lane = String(req.query.lane || 'all').toLowerCase();
    const needsGpuFilter = lane === 'gamer' || lane === 'office';

    const schemaMap = await loadSpecSchemaMap();
    let data;
    let total;

    if (needsGpuFilter) {
      const products = await Product.find(filter)
        .select(listSelectFields())
        .sort({ brandName: 1, sellingPrice: 1 })
        .limit(MAX_SCAN)
        .lean();
      data = products.map((p) => toListItem(p, req.query.theme, schemaMap));
      if (lane === 'gamer') data = data.filter((p) => p.hasGpu);
      if (lane === 'office') data = data.filter((p) => !p.hasGpu);
      data = sortByLastDownload(await withDownloadDates(data));
      total = data.length;
      data = data.slice(skip, skip + limit);
    } else {
      total = await Product.countDocuments(filter);
      const ranked = await Product.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'creativedownloads',
            localField: '_id',
            foreignField: 'product',
            as: 'dl'
          }
        },
        {
          $addFields: {
            downloadedAt: { $ifNull: [{ $arrayElemAt: ['$dl.lastDownloadedAt', 0] }, null] }
          }
        },
        { $sort: { downloadedAt: 1, brandName: 1, sellingPrice: 1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _id: 1, downloadedAt: 1 } }
      ]);
      const ids = ranked.map((row) => row._id);
      const products = ids.length
        ? await Product.find({ _id: { $in: ids } }).select(listSelectFields()).lean()
        : [];
      const byId = new Map(products.map((product) => [String(product._id), product]));
      data = ranked.map((row) => {
        const product = byId.get(String(row._id));
        if (!product) return null;
        const item = toListItem(product, req.query.theme, schemaMap);
        item.lastDownloadedAt = row.downloadedAt || null;
        return item;
      }).filter(Boolean);
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
  const next = {
    ...payload,
    title: body.title ? String(body.title).trim() : payload.title,
    cta: body.cta ? String(body.cta).trim() : payload.cta,
    theme: body.theme === 'studio' || body.theme === 'gamer' ? body.theme : payload.theme
  };
  if (body.detail !== undefined) next.detail = String(body.detail).slice(0, 700);
  next.instagramCaption = instagramCaption(next);
  return next;
}

async function loadProductPayload(id, options) {
  const product = await Product.findById(id).select(listSelectFields()).lean();
  if (!product) return null;
  const schemaMap = await loadSpecSchemaMap();
  return buildCreativePayload(product, {
    ...options,
    specSchema: schemaFor(schemaMap, product)
  });
}

const previewCreativeHtml = async (req, res) => {
  try {
    const format = parseFormat(req.query.format);
    const payload = await loadProductPayload(req.params.id, {
      theme: req.query.theme,
      scene: req.query.scene,
      title: req.query.title,
      detail: req.query.detail,
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
      scene: req.query.scene,
      title: req.query.title,
      detail: req.query.detail,
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
      scene: req.query.scene,
      title: req.query.title,
      detail: req.query.detail,
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
      'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store'
    });
    return res.send(png);
  } catch (error) {
    console.error('[creativos] download one', error);
    const chromeMissing = /Could not find Chrome|executablePath|chromium/i.test(String(error && error.message));
    return res.status(500).json({
      success: false,
      message: chromeMissing
        ? 'Chrome no está disponible en el servidor. Reintentá en unos segundos.'
        : 'Error descargando creativo'
    });
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
            scene: extra.scene || req.body.scene,
            specSchema: schemaFor(await loadSpecSchemaMap(), product),
            title: extra.title,
            detail: extra.detail,
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

const markCreativeDownloaded = async (req, res) => {
  try {
    const productId = String(req.params.id || '');
    if (!/^[a-f0-9]{24}$/i.test(productId)) {
      return res.status(400).json({ success: false, message: 'Producto inválido' });
    }
    const doc = await CreativeDownload.findOneAndUpdate(
      { product: productId },
      {
        $set: {
          format: parseFormat(req.body?.format),
          imageIndex: Math.max(0, Number(req.body?.imageIndex) || 0),
          lastDownloadedAt: new Date()
        },
        $inc: { count: 1 }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, lastDownloadedAt: doc.lastDownloadedAt, count: doc.count });
  } catch (error) {
    console.error('[creativos] mark', error);
    return res.status(500).json({ success: false, message: 'No se pudo registrar la descarga' });
  }
};

module.exports = {
  listCreativeProducts,
  getCreativeCategories,
  previewCreativeHtml,
  previewCreativePng,
  downloadCreativePng,
  exportCreativeZip,
  markCreativeDownloaded,
  MAX_EXPORT
};
