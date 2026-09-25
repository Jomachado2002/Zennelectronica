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
  publishFacebookFeed,
  publishFacebookStories
} = require('../../services/socialPublishService');
const { listSelectFields } = require('../../services/creativePayload');
const {
  renderPngBuffer,
  buildCreativePayload,
  schemaFor,
  loadSpecSchemaMap
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

async function loadPayloads(ids, overrides) {
  const unique = [...new Set((ids || []).map(String))].slice(0, MAX_ITEMS);
  if (!unique.length) return [];
  const products = await Product.find({ _id: { $in: unique } }).select(listSelectFields()).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const schemaMap = await loadSpecSchemaMap();
  return unique
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((product) => {
      const extra = overrides && overrides[String(product._id)];
      return buildCreativePayload(product, {
        theme: extra?.theme,
        title: extra?.title,
        detail: extra?.detail,
        imageIndex: extra?.imageIndex,
        specSchema: schemaFor(schemaMap, product)
      });
    });
}

const composeSocialCaption = async (req, res) => {
  try {
    const payloads = await loadPayloads(req.body?.ids, req.body?.overrides);
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
    return res.status(500).json({ success: false, message: 'No se pudo armar el texto' });
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

async function publishNow(doc, payloads) {
  const format = doc.kind === 'story' ? 'story' : 'feed';
  const urls = await renderUrls(payloads, format);
  const alts = payloads.map((p) => `${p.title} ${p.brandName} en Zenn Electrónicos, Paraguay`.replace(/\s+/g, ' ').trim());
  let igMediaId = '';
  let fbPostId = '';
  if (doc.kind === 'story') {
    igMediaId = await publishInstagramStories({ urls });
    fbPostId = await publishFacebookStories({ urls });
  } else {
    igMediaId = await publishInstagramFeed({ urls, caption: doc.caption, alts });
    fbPostId = await publishFacebookFeed({ urls, caption: doc.caption });
  }
  doc.status = 'published';
  doc.publishedAt = new Date();
  doc.igMediaId = igMediaId;
  doc.fbPostId = fbPostId;
  doc.error = '';
  await doc.save();
  return doc;
}

const publishSocialPost = async (req, res) => {
  try {
    const kind = req.body?.kind === 'story' ? 'story' : 'feed';
    const payloads = await loadPayloads(req.body?.ids, req.body?.overrides);
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
    return res.status(500).json({ success: false, message: error.message || 'No se pudo publicar' });
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
    if (doc.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: 'Esa publicación ya salió o falló' });
    }
    doc.status = 'cancelled';
    await doc.save();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'No se pudo cancelar' });
  }
};

async function runDueSocialPosts() {
  const due = await SocialPost.find({
    status: 'scheduled',
    scheduledAt: { $lte: new Date() }
  }).limit(3);
  for (const doc of due) {
    doc.status = 'publishing';
    await doc.save();
    try {
      const payloads = await loadPayloads(doc.productIds);
      await publishNow(doc, payloads);
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
  runDueSocialPosts
};
