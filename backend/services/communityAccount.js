'use strict';

const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const SocialPost = require('../models/socialPostModel');
const SearchDailyStat = require('../models/searchDailyStat');

const IG_VERSION = process.env.META_API_VERSION || 'v21.0';

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function labelMap() {
  const categories = await Category.find({ isActive: { $ne: false } })
    .select('subcategories.label subcategories.value subcategories.isActive')
    .lean();
  const map = new Map();
  for (const category of categories) {
    for (const sub of category.subcategories || []) {
      if (!sub || !sub.value || sub.isActive === false) continue;
      map.set(sub.value, sub.label || sub.value);
    }
  }
  return map;
}

async function stockLines(labels) {
  const rows = await Product.aggregate([
    { $match: { stock: { $gt: 0 }, sellingPrice: { $gt: 0 } } },
    { $group: { _id: '$subcategory', units: { $sum: '$stock' }, skus: { $sum: 1 } } },
    { $sort: { units: -1 } },
    { $limit: 10 }
  ]);
  const total = rows.reduce((sum, row) => sum + (row.units || 0), 0);
  const lines = rows.map((row) => {
    const name = labels.get(row._id) || row._id;
    return `- ${name}: ${row.skus} productos, ${row.units} unidades`;
  });
  return [`Stock con precio, los rubros con más unidades (no es el ranking de ventas):`, ...lines, total ? `Esas diez líneas suman ${total} unidades.` : 'No hay stock para contar.'].join('\n');
}

async function instagramLines() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN || '';
  const userId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
  if (!token || !userId) return 'Instagram no está conectado. No hay likes para mirar.';
  const url = `https://graph.instagram.com/${IG_VERSION}/${userId}/media?fields=media_type,timestamp,like_count,comments_count,caption&limit=20&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const message = data.error && data.error.message ? data.error.message : `HTTP ${res.status}`;
    return `No se pudieron leer los resultados de Instagram: ${clip(message, 140)}`;
  }
  const posts = (data.data || []).map((row) => ({
    type: row.media_type || 'IMAGE',
    likes: Number(row.like_count) || 0,
    comments: Number(row.comments_count) || 0,
    caption: clip(row.caption, 90)
  }));
  if (!posts.length) return 'La cuenta de Instagram no devolvió publicaciones.';
  const ranked = posts.slice().sort((a, b) => (b.likes + b.comments * 3) - (a.likes + a.comments * 3));
  const top = ranked.slice(0, 4);
  const quiet = ranked.slice(-4).reverse();
  const line = (row) => `- ${row.likes} likes, ${row.comments} comentarios, ${row.type}: ${row.caption || 'sin texto'}`;
  const byType = new Map();
  for (const row of posts) {
    const bag = byType.get(row.type) || { n: 0, likes: 0 };
    bag.n += 1;
    bag.likes += row.likes;
    byType.set(row.type, bag);
  }
  const formats = [...byType.entries()].map(([type, bag]) => (
    `- ${type}: ${bag.n} piezas, promedio ${Math.round((bag.likes / bag.n) * 10) / 10} likes`
  ));
  let followers = '';
  try {
    const profileUrl = `https://graph.instagram.com/${IG_VERSION}/${userId}?fields=followers_count,media_count&access_token=${encodeURIComponent(token)}`;
    const profileRes = await fetch(profileUrl);
    const profile = await profileRes.json().catch(() => ({}));
    if (profileRes.ok && !profile.error && profile.followers_count != null) {
      followers = `La cuenta tiene ${profile.followers_count} seguidores y ${profile.media_count || 0} publicaciones.`;
    }
  } catch {
    followers = '';
  }
  return [
    followers,
    'Resultados orgánicos de la cuenta de Instagram. Likes y comentarios, no visitas de la tienda:',
    'Por formato:',
    ...formats,
    'Lo que más se movió:',
    ...top.map(line),
    'Lo que casi no se movió:',
    ...quiet.map(line)
  ].filter(Boolean).join('\n');
}

async function showLines(labels) {
  const sinceSearch = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sinceNew = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  const [searches, promos, fresh, brands] = await Promise.all([
    SearchDailyStat.aggregate([
      { $match: { day: { $gte: sinceSearch }, count: { $gt: 0 } } },
      { $group: { _id: '$query', count: { $sum: '$count' } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]),
    Product.find({
      stock: { $gt: 0 },
      sellingPrice: { $gt: 0 },
      'productImage.0': { $exists: true, $ne: '' },
      $expr: { $gt: ['$price', '$sellingPrice'] }
    }).select('productName subcategory price sellingPrice').limit(60).lean(),
    Product.find({
      createdAt: { $gte: sinceNew },
      stock: { $gt: 0 },
      sellingPrice: { $gt: 0 },
      'productImage.0': { $exists: true, $ne: '' }
    }).select('productName brandName sellingPrice').sort({ createdAt: -1 }).limit(6).lean(),
    Product.aggregate([
      { $match: { stock: { $gt: 0 }, sellingPrice: { $gt: 0 }, brandName: { $nin: ['', null] } } },
      { $group: { _id: '$brandName', skus: { $sum: 1 } } },
      { $match: { skus: { $gte: 4 } } },
      { $sort: { skus: -1 } },
      { $limit: 6 }
    ])
  ]);
  const searchText = searches.length
    ? ['Lo que escribieron en el buscador de la tienda, últimos 14 días:', ...searches.map((row) => `- ${clip(row._id, 60)}: ${row.count}`)].join('\n')
    : 'En 14 días el buscador de la tienda no registró consultas.';
  const bestPromo = new Map();
  for (const item of promos) {
    const list = Number(item.price) || 0;
    const sell = Number(item.sellingPrice) || 0;
    if (list <= sell) continue;
    const off = Math.round((list - sell) / list * 100);
    const key = item.subcategory || '';
    const current = bestPromo.get(key);
    if (!current || off > current.off) {
      bestPromo.set(key, { off, name: item.productName, label: labels.get(key) || key });
    }
  }
  const promoLines = [...bestPromo.values()].sort((a, b) => b.off - a.off).slice(0, 6);
  const promoText = promoLines.length
    ? ['Promos reales, con precio tachado en la tienda. No inventar otro descuento:', ...promoLines.map((row) => `- ${row.label}: ${clip(row.name, 70)}, -${row.off}%`)].join('\n')
    : 'Hoy no hay una promo con precio tachado.';
  const freshText = fresh.length
    ? ['Entró a stock en los últimos 21 días y tiene foto:', ...fresh.map((item) => `- ${clip(item.productName, 70)}${item.brandName ? ` (${item.brandName})` : ''}`)].join('\n')
    : 'En 21 días no entró un producto nuevo con foto.';
  const brandText = brands.length
    ? ['Marcas con varias unidades para una comparación, no un solo modelo:', ...brands.map((row) => `- ${row._id}: ${row.skus} productos`)].join('\n')
    : '';
  return [searchText, promoText, freshText, brandText].filter(Boolean).join('\n\n');
}

async function localLines() {
  const published = await SocialPost.find({ status: 'published' })
    .sort({ publishedAt: -1 })
    .limit(8)
    .select('kind headline subcategoryLabel publishedAt')
    .lean();
  const failed = await SocialPost.find({ status: 'failed', origin: 'community' })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('kind headline error')
    .lean();
  const lines = ['Lo que este calendario ya publicó:'];
  if (!published.length) lines.push('- Todavía no hay una publicación marcada como publicada.');
  published.forEach((post) => {
    lines.push(`- ${post.kind}: ${clip(post.headline || post.subcategoryLabel, 80)}`);
  });
  if (failed.length) {
    lines.push('Falló al salir y no hay que repetir el mismo envío:');
    failed.forEach((post) => {
      lines.push(`- ${post.kind}: ${clip(post.headline, 60)}. ${clip(post.error, 80)}`);
    });
  }
  return lines.join('\n');
}

async function accountPulse() {
  try {
    const labels = await labelMap();
    const [stock, instagram, local, show] = await Promise.all([
      stockLines(labels),
      instagramLines().catch((error) => `Instagram no respondió: ${clip(error.message, 120)}`),
      localLines(),
      showLines(labels)
    ]);
    return [
      'Para sumar seguidores: una pregunta, una comparación de dos precios nuestros, una promo real o algo que la gente ya buscó. No repetir el formato que quedó sin likes.',
      '',
      instagram,
      '',
      show,
      '',
      local,
      '',
      stock
    ].join('\n');
  } catch (error) {
    return `No se pudo armar el resumen de la cuenta: ${clip(error.message, 160)}`;
  }
}

module.exports = { accountPulse };
