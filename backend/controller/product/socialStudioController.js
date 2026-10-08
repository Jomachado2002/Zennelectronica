'use strict';

const Product = require('../../models/productModel');
const SocialPost = require('../../models/socialPostModel');
const CaptionVoice = require('../../models/captionVoiceModel');
const { composeCaptions } = require('../../services/captionComposer');
const { seedCaptionVoices } = require('../../services/captionVoiceSeed');
const {
  uploadJpeg,
  publishInstagramFeed,
  publishInstagramStories,
  publishInstagramReel,
  publishFacebookFeed,
  publishFacebookStories,
  publishFacebookVideo
} = require('../../services/socialPublishService');
const { uploadBufferToR2 } = require('../../services/r2StorageService');
const multer = require('multer');
const sharp = require('sharp');
const { listSelectFields } = require('../../services/creativePayload');
const { focusedSchemaFor } = require('../../services/creativeSpecFocus');
const { planCommunityDays, listCommunityCalendar, repairCommunityPost, reviseCommunityPiece, reviseDayTalk } = require('../../services/communityPlanner');
const {
  renderPngBuffer,
  buildCreativePayload
} = require('./creativeStudioController');

const MAX_ITEMS = 10;

function slugPart(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function voiceMap() {
  await seedCaptionVoices();
  const docs = await CaptionVoice.find({ kind: 'hook', active: true }).lean();
  const voices = {};
  for (const doc of docs) {
    if (doc.key && Array.isArray(doc.lines) && doc.lines.length) voices[doc.key] = doc.lines;
  }
  return voices;
}

async function loadPayloads(ids, overrides, theme, scene, showPrice) {
  const unique = [...new Set((ids || []).map(String))];
  if (unique.length > MAX_ITEMS) {
    const error = new Error('Una publicación acepta hasta 10 fotos');
    error.statusCode = 400;
    throw error;
  }
  if (!unique.length) return [];
  const products = await Product.find({ _id: { $in: unique } }).select(listSelectFields()).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const payloads = [];
  for (const id of unique) {
    const product = byId.get(id);
    if (!product) continue;
    const extra = overrides && overrides[String(product._id)];
    payloads.push(buildCreativePayload(product, {
      theme: extra?.theme || theme,
      scene: extra?.scene || scene,
      title: extra?.title,
      detail: extra?.detail,
      imageIndex: extra?.imageIndex,
      showPrice,
      specSchema: await focusedSchemaFor(product)
    }));
  }
  return payloads;
}

const composeSocialCaption = async (req, res) => {
  try {
    const payloads = await loadPayloads(req.body?.ids, req.body?.overrides, req.body?.theme, req.body?.scene, req.body?.showPrice);
    if (!payloads.length) {
      return res.status(400).json({ success: false, message: 'Elegí al menos un producto' });
    }
    const variants = composeCaptions(payloads, await voiceMap());
    return res.json({
      success: true,
      variants,
      titles: payloads.map((p) => p.title)
    });
  } catch (error) {
    console.error('[social] compose', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.statusCode ? error.message : 'No se pudo armar el texto' });
  }
};

async function renderUrls(payloads, format) {
  const urls = [];
  for (const payload of payloads) {
    const png = await renderPngBuffer(payload, format);
    const name = `${Date.now()}-${slugPart(payload.brandName)}-${slugPart(payload.title)}`;
    urls.push(await uploadJpeg(png, name));
  }
  return urls;
}

function isVideoUrl(url) {
  return /\.mp4($|\?)/i.test(String(url || ''));
}

async function publishUploaded(doc) {
  const url = (doc.mediaUrls || [])[0];
  if (!url) throw new Error('Falta el archivo para publicar');
  const video = isVideoUrl(url);
  let igMediaId = '';
  let fbPostId = '';
  let igError = '';
  let fbError = '';
  try {
    if (video) igMediaId = await publishInstagramReel({ url, caption: doc.caption });
    else if (doc.kind === 'story') igMediaId = await publishInstagramStories({ urls: [url] });
    else igMediaId = await publishInstagramFeed({ urls: [url], caption: doc.caption, alts: [doc.headline || 'Zenn'] });
  } catch (error) {
    igError = error.message || 'Instagram no publicó';
  }
  try {
    if (video) fbPostId = await publishFacebookVideo({ url, caption: doc.caption });
    else if (doc.kind === 'story') fbPostId = await publishFacebookStories({ urls: [url] });
    else fbPostId = await publishFacebookFeed({ urls: [url], caption: doc.caption });
  } catch (error) {
    fbError = error.message || 'Facebook no publicó';
  }
  doc.igMediaId = igMediaId;
  doc.fbPostId = fbPostId;
  if (igError || fbError) {
    const parts = [];
    if (igMediaId && fbError) parts.push(`Salió en Instagram. Facebook: ${fbError}`);
    else if (fbPostId && igError) parts.push(`Salió en Facebook. Instagram: ${igError}`);
    else {
      if (igError) parts.push(`Instagram: ${igError}`);
      if (fbError) parts.push(`Facebook: ${fbError}`);
    }
    doc.status = 'failed';
    doc.error = parts.join(' · ');
    if (igMediaId || fbPostId) doc.publishedAt = new Date();
    await doc.save();
    const error = new Error(doc.error);
    error.statusCode = 502;
    throw error;
  }
  doc.status = 'published';
  doc.publishedAt = new Date();
  doc.error = '';
  await doc.save();
  return doc;
}

async function publishNow(doc, payloads) {
  if ((doc.mediaUrls || []).length) return publishUploaded(doc);
  const format = doc.kind === 'story' ? 'story' : 'feed';
  const urls = await renderUrls(payloads, format);
  const alts = payloads.map((p) => `${p.title} ${p.brandName} en Zenn Electrónicos, Paraguay`.replace(/\s+/g, ' ').trim());
  let igMediaId = '';
  let fbPostId = '';
  let igError = '';
  let fbError = '';
  try {
    igMediaId = doc.kind === 'story'
      ? await publishInstagramStories({ urls })
      : await publishInstagramFeed({ urls, caption: doc.caption, alts });
  } catch (error) {
    igError = error.message || 'Instagram no publicó';
  }
  try {
    fbPostId = doc.kind === 'story'
      ? await publishFacebookStories({ urls })
      : await publishFacebookFeed({ urls, caption: doc.caption });
  } catch (error) {
    fbError = error.message || 'Facebook no publicó';
  }
  doc.igMediaId = igMediaId;
  doc.fbPostId = fbPostId;
  if (igError || fbError) {
    const parts = [];
    if (igMediaId && fbError) parts.push(`Salió en Instagram. Facebook: ${fbError}`);
    else if (fbPostId && igError) parts.push(`Salió en Facebook. Instagram: ${igError}`);
    else {
      if (igError) parts.push(`Instagram: ${igError}`);
      if (fbError) parts.push(`Facebook: ${fbError}`);
    }
    doc.status = 'failed';
    doc.error = parts.join(' · ');
    if (igMediaId || fbPostId) doc.publishedAt = new Date();
    await doc.save();
    const error = new Error(doc.error);
    error.statusCode = 502;
    throw error;
  }
  doc.status = 'published';
  doc.publishedAt = new Date();
  doc.error = '';
  await doc.save();
  return doc;
}

const publishSocialPost = async (req, res) => {
  try {
    const kind = req.body?.kind === 'story' ? 'story' : 'feed';
    const theme = req.body?.theme;
    const scene = req.body?.scene;
    const payloads = await loadPayloads(req.body?.ids, req.body?.overrides, theme, scene, req.body?.showPrice);
    if (!payloads.length) {
      return res.status(400).json({ success: false, message: 'Elegí al menos un producto' });
    }
    if (kind === 'feed' && payloads.length > 10) {
      return res.status(400).json({ success: false, message: 'Un carrusel acepta hasta 10 fotos' });
    }
    const voices = await voiceMap();
    const generated = composeCaptions(payloads, voices)[0];
    const caption = String(req.body?.caption || generated?.caption || '').trim();
    if (kind === 'feed' && !caption) {
      return res.status(400).json({ success: false, message: 'El texto está vacío' });
    }
    const when = req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null;
    const later = when && !Number.isNaN(when.getTime()) && when.getTime() > Date.now() + 60 * 1000;
    const doc = await SocialPost.create({
      productIds: payloads.map((p) => p.id),
      titles: payloads.map((p) => p.title),
      kind,
      caption,
      theme: theme || '',
      scene: scene || '',
      showPrice: req.body?.showPrice === undefined ? true : !['0', 'false', 'off', 'no'].includes(String(req.body.showPrice).toLowerCase()),
      overrides: req.body?.overrides || undefined,
      status: later ? 'scheduled' : 'publishing',
      scheduledAt: later ? when : new Date()
    });
    if (later) {
      return res.json({ success: true, post: doc });
    }
    try {
      const published = await publishNow(doc, payloads);
      return res.json({ success: true, post: published });
    } catch (error) {
      doc.status = 'failed';
      doc.error = error.message || 'No se pudo publicar';
      await doc.save();
      return res.status(502).json({ success: false, message: doc.error, post: doc });
    }
  } catch (error) {
    console.error('[social] publish', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'No se pudo publicar' });
  }
};

const listSocialCalendar = async (req, res) => {
  try {
    const posts = await SocialPost.find({ status: { $in: ['scheduled', 'published', 'failed', 'publishing'] } })
      .sort({ scheduledAt: -1, createdAt: -1 })
      .limit(40)
      .lean();
    return res.json({ success: true, posts });
  } catch (error) {
    console.error('[social] calendar', error);
    return res.status(500).json({ success: false, message: 'No se pudo leer el calendario' });
  }
};

const cancelSocialPost = async (req, res) => {
  try {
    const doc = await SocialPost.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'No está en el calendario' });
    if (doc.status !== 'scheduled' && doc.status !== 'idea') {
      return res.status(400).json({ success: false, message: 'Esa publicación ya salió o falló' });
    }
    doc.status = 'cancelled';
    await doc.save();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'No se pudo cancelar' });
  }
};

const planCommunity = async (req, res) => {
  try {
    const days = Number(req.body?.days) || 3;
    const result = await planCommunityDays({ days });
    const calendar = await listCommunityCalendar({ from: result.start, days: result.days });
    return res.json({
      success: true,
      created: result.created,
      message: result.created
        ? `Quedaron ${result.created} piezas en el calendario`
        : 'Esos días ya tenían plan',
      ...calendar
    });
  } catch (error) {
    console.error('[social] plan', error);
    return res.status(500).json({ success: false, message: 'No se pudo armar el calendario' });
  }
};

const getCommunityCalendar = async (req, res) => {
  try {
    const data = await listCommunityCalendar({
      from: req.query.from,
      days: req.query.days
    });
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error('[social] comunidad', error);
    return res.status(500).json({ success: false, message: 'No se pudo leer el calendario' });
  }
};

const authorizeCommunityIdea = async (req, res) => {
  try {
    const doc = await SocialPost.findById(req.params.id);
    if (!doc || doc.origin !== 'community') {
      return res.status(404).json({ success: false, message: 'Esa pieza no está en el calendario' });
    }
    if (!['reel', 'imagen', 'dato'].includes(doc.kind) || doc.status !== 'idea') {
      return res.status(400).json({ success: false, message: 'Esa pieza no está esperando autorización' });
    }
    if (!(doc.mediaUrls || []).length) {
      return res.status(400).json({ success: false, message: 'Todavía no hay una gráfica para publicar' });
    }
    doc.status = 'scheduled';
    doc.error = '';
    if (!doc.scheduledAt || new Date(doc.scheduledAt).getTime() < Date.now() + 60 * 1000) {
      doc.scheduledAt = new Date(Date.now() + 60 * 1000);
    }
    await doc.save();
    return res.json({ success: true, message: 'Autorizada. Sale a la hora de esa tarjeta en Instagram y Facebook.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'No se pudo autorizar' });
  }
};

const setCommunityDayFocus = async (req, res) => {
  try {
    const result = await reviseDayTalk(req.body?.date, req.body?.note || req.body?.focus);
    const calendar = await listCommunityCalendar({ from: req.body?.date, days: 1 });
    return res.json({ success: true, ...result, ...calendar });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error('[social] foco del día', error);
    return res.status(status).json({ success: false, message: error.message || 'No se pudo guardar el día' });
  }
};

const reviseCommunityIdea = async (req, res) => {
  try {
    const post = await reviseCommunityPiece(req.params.id, {
      note: req.body?.note,
      background: req.body?.background,
      swap: Boolean(req.body?.swap)
    });
    return res.json({
      success: true,
      message: post.reason || 'La pieza se actualizó.',
      post
    });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error('[social] modificar', error);
    return res.status(status).json({ success: false, message: error.message || 'No se pudo modificar' });
  }
};

const completeCommunityIdea = async (req, res) => {
  try {
    const doc = await SocialPost.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'No está en el calendario' });
    if (!['reel', 'imagen', 'dato'].includes(doc.kind) || doc.status !== 'idea') {
      return res.status(400).json({ success: false, message: 'Esa pieza no es una consigna para grabar' });
    }
    doc.status = 'done';
    await doc.save();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'No se pudo marcar' });
  }
};

const communityMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype) || file.mimetype === 'video/mp4') cb(null, true);
    else cb(new Error('Subí una foto JPG, PNG o WEBP, o un video MP4'));
  }
}).single('file');

const uploadCommunityMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Elegí la foto o el video' });
    const doc = await SocialPost.findById(req.params.id);
    if (!doc || doc.origin !== 'community') {
      return res.status(404).json({ success: false, message: 'Esa sugerencia no está en el calendario' });
    }
    if (!['idea', 'scheduled', 'failed'].includes(doc.status)) {
      return res.status(400).json({ success: false, message: 'Esa pieza ya se publicó' });
    }
    let body = req.file.buffer;
    let contentType = req.file.mimetype;
    let ext = 'mp4';
    if (req.file.mimetype !== 'video/mp4') {
      body = await sharp(body).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
      contentType = 'image/jpeg';
      ext = 'jpg';
    }
    const key = `social/comunidad/${doc.planDate || 'dia'}/${doc._id}-${Date.now()}.${ext}`;
    const url = await uploadBufferToR2(body, key, {
      contentType,
      cacheControl: 'public, max-age=86400'
    });
    doc.mediaUrls = [url];
    doc.status = 'scheduled';
    doc.error = '';
    if (!doc.scheduledAt || new Date(doc.scheduledAt).getTime() < Date.now() + 60 * 1000) {
      doc.scheduledAt = new Date(Date.now() + 60 * 1000);
    }
    await doc.save();
    return res.json({ success: true, message: 'Quedó cargado. Sale a la hora de esa tarjeta.' });
  } catch (error) {
    console.error('[social] upload', error);
    return res.status(500).json({ success: false, message: error.message || 'No se pudo cargar el archivo' });
  }
};

async function runDueSocialPosts() {
  const due = await SocialPost.find({
    status: 'scheduled',
    kind: { $in: ['feed', 'story', 'reel', 'imagen', 'dato'] },
    scheduledAt: { $lte: new Date() }
  }).limit(3);
  for (const doc of due) {
    if (['reel', 'imagen', 'dato'].includes(doc.kind) && !(doc.mediaUrls || []).length) {
      doc.status = 'idea';
      await doc.save();
      continue;
    }
    if (doc.origin === 'community' && ['feed', 'story'].includes(doc.kind) && !(doc.mediaUrls || []).length) {
      await repairCommunityPost(doc);
      if (doc.status === 'cancelled') continue;
    }
    doc.status = 'publishing';
    await doc.save();
    try {
      if ((doc.mediaUrls || []).length) {
        await publishNow(doc, []);
      } else {
        const payloads = await loadPayloads(doc.productIds, doc.overrides, doc.theme, doc.scene, doc.showPrice);
        await publishNow(doc, payloads);
      }
    } catch (error) {
      doc.status = 'failed';
      doc.error = error.message || 'Falló al publicar';
      await doc.save();
    }
  }
}

module.exports = {
  composeSocialCaption,
  publishSocialPost,
  listSocialCalendar,
  cancelSocialPost,
  planCommunity,
  getCommunityCalendar,
  completeCommunityIdea,
  authorizeCommunityIdea,
  reviseCommunityIdea,
  setCommunityDayFocus,
  communityMediaUpload,
  uploadCommunityMedia,
  runDueSocialPosts
};
