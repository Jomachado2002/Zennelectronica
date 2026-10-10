'use strict';

const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const ProductDailyStat = require('../models/productDailyStat');
const SearchDailyStat = require('../models/searchDailyStat');
const Sale = require('../models/saleModel');

const DAY_MS = 24 * 60 * 60 * 1000;
const STOP = new Set(['de', 'la', 'el', 'los', 'las', 'para', 'con', 'sin', 'del', 'por', 'un', 'una', 'y', 'o', 'en', 'al']);
const QUIET_KEYS = new Set(['color', 'referencia', 'modelo', 'marca']);
const QUIET_KEY = /^(dimensiones|peso|contenido|garantia|caracteristicas|otros|accesorios|incluye)/;
const NEGATION = /\b(no|sin|saca|quita|elimina|deja de|pausa|nada de|menos|basta de|cambia|reemplaza)\b/;
const NEGATION_STOP = /[.,;]|\b(y|pero|mejor|sino|pone|pon|agrega|suma|mete|por)\b/g;

function negated(text, at) {
  const before = text.slice(Math.max(0, at - 40), at);
  let tail = before;
  let match = NEGATION_STOP.exec(before);
  while (match) {
    tail = before.slice(match.index + match[0].length);
    match = NEGATION_STOP.exec(before);
  }
  NEGATION_STOP.lastIndex = 0;
  return NEGATION.test(tail);
}

function fold(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function words(value) {
  return fold(value).split(/[^a-z0-9]+/).filter((word) => word.length >= 2 && !STOP.has(word));
}

function dayKey(offsetDays = 0) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' })
    .format(new Date(Date.now() + offsetDays * DAY_MS));
}

function moneyGs(value) {
  return `Gs. ${Math.round(Number(value) || 0).toLocaleString('es-PY')}`;
}

function clip(value, max) {
  const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function median(list) {
  if (!list.length) return 0;
  const sorted = list.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function specsOf(product) {
  const out = {};
  [product.technicalSpecifications, product.specifications].forEach((map) => {
    if (!map || typeof map !== 'object') return;
    Object.entries(map).forEach(([key, value]) => {
      if (value == null || value === '') return;
      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value).forEach(([inner, text]) => {
          if (text != null && text !== '' && typeof text !== 'object' && !out[inner]) out[inner] = String(text);
        });
        return;
      }
      if (!out[key]) out[key] = Array.isArray(value) ? value.join(' | ') : String(value);
    });
  });
  return out;
}

function numberOf(text) {
  const raw = fold(text).replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2');
  const match = raw.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return NaN;
  const value = Number(match[1].replace(',', '.'));
  return /\d\s*tb\b/.test(raw) ? value * 1000 : value;
}

async function loadCatalog() {
  const [rows, categories] = await Promise.all([
    Product.find({
      stock: { $gte: 1 },
      sellingPrice: { $gte: 1000 },
      productImage: { $exists: true, $ne: [] }
    })
      .select('codigo productName brandName category subcategory sellingPrice price profitAmount stock catalogPlateUrl slug specifications technicalSpecifications')
      .lean(),
    Category.find({})
      .select('label value subcategories.label subcategories.value subcategories.specifications.name subcategories.specifications.label')
      .lean()
  ]);
  const catLabel = new Map();
  const subLabel = new Map();
  const specLabel = new Map();
  categories.forEach((category) => {
    catLabel.set(category.value, category.label || category.value);
    (category.subcategories || []).forEach((sub) => {
      subLabel.set(sub.value, sub.label || sub.value);
      specLabel.set(sub.value, new Map((sub.specifications || []).map((spec) => [spec.name, spec.label || spec.name])));
    });
  });
  const products = rows.map((row) => {
    const price = Math.round(Number(row.sellingPrice) || 0);
    const list = Math.round(Number(row.price) || 0);
    const specs = specsOf(row);
    const categoryLabel = catLabel.get(row.category) || row.category;
    const subcategoryLabel = subLabel.get(row.subcategory) || row.subcategory;
    const brand = String(row.brandName || specs.marca || '').trim();
    return {
      id: String(row._id),
      codigo: String(row.codigo || ''),
      name: String(row.productName || '').replace(/\s+/g, ' ').trim(),
      brand,
      category: row.category,
      subcategory: row.subcategory,
      categoryLabel,
      subcategoryLabel,
      price,
      list: list > price * 1.01 ? list : 0,
      profit: Math.round(Number(row.profitAmount) || 0),
      stock: Number(row.stock) || 0,
      plate: row.catalogPlateUrl || '',
      slug: row.slug || '',
      specs,
      hay: fold(`${row.productName} ${brand} ${subcategoryLabel} ${categoryLabel}`),
      views: 0,
      carts: 0,
      searches: 0,
      sold: 0
    };
  });
  return { products, specLabel };
}

async function siteSignals(products) {
  const since = dayKey(-14);
  const [stats, searches] = await Promise.all([
    ProductDailyStat.aggregate([
      { $match: { day: { $gte: since } } },
      { $group: { _id: '$productId', views: { $sum: '$views' }, carts: { $sum: '$addToCarts' } } }
    ]),
    SearchDailyStat.aggregate([
      { $match: { day: { $gte: since } } },
      { $group: { _id: '$query', count: { $sum: '$count' } } },
      { $sort: { count: -1 } },
      { $limit: 60 }
    ])
  ]);
  const byId = new Map(products.map((product) => [product.id, product]));
  stats.forEach((row) => {
    const product = byId.get(String(row._id));
    if (!product) return;
    product.views = Number(row.views) || 0;
    product.carts = Number(row.carts) || 0;
  });
  const familySearches = new Map();
  const queries = [];
  searches.forEach((row) => {
    const tokens = words(row._id);
    if (!tokens.length) return;
    const hits = products.filter((product) => tokens.every((token) => product.hay.includes(token)));
    const weight = hits.length > 20 ? 20 / hits.length : 1;
    hits.forEach((product) => { product.searches += row.count * weight; });
    const families = [...new Set(hits.map((product) => product.subcategory))];
    families.forEach((id) => familySearches.set(id, (familySearches.get(id) || 0) + row.count));
    queries.push({
      query: String(row._id),
      count: Number(row.count) || 0,
      hits: hits.length,
      families,
      priceMin: hits.length ? Math.min(...hits.map((product) => product.price)) : 0,
      priceMax: hits.length ? Math.max(...hits.map((product) => product.price)) : 0
    });
  });
  return { queries, familySearches };
}

function guessProduct(text, products) {
  const tokens = words(text).filter((word) => word.length >= 3);
  if (tokens.length < 2) return null;
  let best = null;
  let bestHits = 0;
  for (const product of products) {
    let hits = 0;
    for (const token of tokens) if (product.hay.includes(token)) hits += 1;
    if (hits > bestHits) {
      best = product;
      bestHits = hits;
    }
  }
  return bestHits >= Math.max(2, Math.ceil(tokens.length * 0.6)) ? best : null;
}

async function salesSignals(products) {
  const now = Date.now();
  const rows = await Sale.find({ paymentStatus: 'pagado', saleDate: { $gte: new Date(now - 60 * DAY_MS) } })
    .select('saleDate totalAmountPYG items.product items.productSnapshot items.description items.quantity')
    .sort({ saleDate: -1 })
    .lean();
  const byId = new Map(products.map((product) => [product.id, product]));
  const byCode = new Map(products.map((product) => [product.codigo, product]));
  const families = new Map();
  const recent = [];
  let count14 = 0;
  let count7 = 0;
  let total60 = 0;
  let total7 = 0;
  rows.forEach((sale) => {
    const at = new Date(sale.saleDate).getTime();
    const amount = Number(sale.totalAmountPYG) || 0;
    if (at >= now - 14 * DAY_MS) count14 += 1;
    if (at >= now - 7 * DAY_MS) {
      count7 += 1;
      total7 += amount;
    }
    total60 += amount;
    (sale.items || []).forEach((item) => {
      const label = item.productSnapshot?.name || item.description || '';
      const code = String(item.productSnapshot?.code || '').toUpperCase();
      const product = (item.product && byId.get(String(item.product)))
        || (code && byCode.get(code))
        || guessProduct(label, products);
      const qty = Number(item.quantity) || 1;
      if (product) {
        product.sold += qty;
        families.set(product.subcategory, (families.get(product.subcategory) || 0) + qty);
      }
      if (recent.length < 12 && label) recent.push(clip(label, 60));
    });
  });
  return {
    count60: rows.length,
    count14,
    count7,
    total60,
    total7,
    avgTicket: rows.length ? Math.round(total60 / rows.length) : 0,
    families,
    recent
  };
}

function economics({ products, pixel, history, sales }) {
  const priced = products.filter((product) => product.profit > 0 && product.price > 0);
  const revenue = priced.reduce((sum, product) => sum + product.price, 0);
  const profit = priced.reduce((sum, product) => sum + product.profit, 0);
  const margin = revenue > 0 ? profit / revenue : 0.11;
  const contacts14 = Number(pixel.Contact || 0);
  const carts14 = Number(pixel.AddToCart || 0);
  const purchases14 = Number(pixel.Purchase || 0);
  const contacts60 = contacts14 * (60 / 14);
  const closeRate = clamp(contacts60 > 0 ? sales.count60 / contacts60 : 0.12, 0.05, 0.25);
  const results = (history.contacts || 0) + (history.purchases || 0);
  const costPerContact = Math.round(clamp(results > 0 ? history.spendPyg / results : 12000, 4000, 60000));
  const costPerClick = Math.round(clamp(history.clicks > 0 ? history.spendPyg / history.clicks : 300, 80, 3000));
  const estCpa = Math.round(costPerContact / closeRate);
  const minProfit = Math.round((estCpa * 1.2) / 1000) * 1000;
  let event = 'PURCHASE';
  if (purchases14 < 25 && contacts14 >= 15) event = 'CONTACT';
  else if (purchases14 < 25 && carts14 >= 15) event = 'ADD_TO_CART';
  return {
    margin: Math.round(margin * 1000) / 1000,
    breakEvenRoas: Math.round((1 / Math.max(margin, 0.01)) * 10) / 10,
    closeRate: Math.round(closeRate * 100) / 100,
    costPerContact,
    costPerClick,
    estCpa,
    minProfit,
    event,
    contacts14,
    carts14,
    purchases14,
    pageViews14: Number(pixel.PageView || 0),
    avgTicket: sales.avgTicket,
    historySpend: Math.round(history.spendPyg || 0)
  };
}

function scoreProducts(products, econ) {
  const reach = Math.max(econ.avgTicket || 0, 300000) * 4;
  products.forEach((product) => {
    const demand = product.searches * 3 + product.carts * 4 + product.views + product.sold * 5;
    const profitScore = Math.min(product.profit / Math.max(econ.minProfit, 1), 2.5);
    const pricey = product.price > reach ? Math.log10(product.price / reach) * 3 : 0;
    product.demand = Math.round(demand * 10) / 10;
    product.adsOk = product.profit >= econ.minProfit;
    product.score = Math.round((
      profitScore * 2
      + Math.log1p(demand) * 2.5
      + (product.list ? 1 : 0)
      + (product.stock >= 3 ? 0.3 : 0)
      - pricey
    ) * 100) / 100;
  });
}

function familyStats(products, site, sales) {
  const groups = new Map();
  products.forEach((product) => {
    if (!groups.has(product.subcategory)) groups.set(product.subcategory, []);
    groups.get(product.subcategory).push(product);
  });
  return [...groups.entries()].map(([id, list]) => {
    const first = list[0];
    const prices = list.map((product) => product.price);
    const profits = list.map((product) => product.profit);
    const ads = list.filter((product) => product.adsOk);
    const searches = site.familySearches.get(id) || 0;
    const views = list.reduce((sum, product) => sum + product.views, 0);
    const carts = list.reduce((sum, product) => sum + product.carts, 0);
    const sold = sales.families.get(id) || 0;
    return {
      id,
      category: first.category,
      short: first.subcategoryLabel,
      label: `${first.categoryLabel} > ${first.subcategoryLabel}`,
      count: list.length,
      priceMin: Math.min(...prices),
      priceMax: Math.max(...prices),
      priceMid: median(prices),
      profitMid: median(profits),
      profitMax: Math.max(...profits),
      adsOk: ads.length,
      promos: list.filter((product) => product.list).length,
      searches,
      views,
      carts,
      sold,
      score: Math.round((ads.length ? Math.log1p(ads.length) : 0) * (1 + Math.log1p(searches * 3 + carts * 4 + views + sold * 5)) * 100) / 100
    };
  }).sort((a, b) => b.score - a.score);
}

function specVocabulary(products, familyIds, specLabel) {
  const keysByFamily = new Map();
  const lines = familyIds.map((id) => {
    const list = products.filter((product) => product.subcategory === id);
    const keys = new Map();
    list.forEach((product) => Object.entries(product.specs).forEach(([key, value]) => {
      if (QUIET_KEYS.has(key) || QUIET_KEY.test(key)) return;
      const text = clip(value, 26);
      if (!keys.has(key)) keys.set(key, new Map());
      keys.get(key).set(text, (keys.get(key).get(text) || 0) + 1);
    }));
    const top = [...keys.entries()]
      .map(([key, values]) => ({ key, values, total: [...values.values()].reduce((sum, n) => sum + n, 0) }))
      .filter((row) => row.total >= Math.max(3, list.length * 0.3))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
    keysByFamily.set(id, top.map((row) => row.key));
    const labels = specLabel.get(id) || new Map();
    const parts = top.map((row) => {
      const values = [...row.values.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([value, count]) => `${value} (${count})`).join(', ');
      const label = labels.get(row.key);
      return `${row.key}${label ? ` [${fold(label)}]` : ''}: ${values}`;
    });
    return `${id} → ${parts.join(' · ') || 'sin especificaciones cargadas'}`;
  });
  return { lines, keysByFamily };
}

function pickSold(products, limit = 20) {
  return products
    .filter((product) => product.sold > 0 && product.plate)
    .sort((a, b) => b.sold - a.sold || b.score - a.score)
    .slice(0, limit);
}

function pickLeaks(products, limit = 12) {
  return products
    .filter((product) => product.plate && product.sold === 0 && (product.views + product.carts * 3) >= 3)
    .sort((a, b) => (b.carts * 4 + b.views) - (a.carts * 4 + a.views))
    .slice(0, limit);
}

function pickCandidates(products, limit = 160, perFamily = 5) {
  const ranked = products.filter((product) => product.adsOk && product.plate).sort((a, b) => b.score - a.score);
  const out = [];
  const seen = new Set();
  const take = (product) => {
    if (!product || !product.codigo || seen.has(product.codigo) || out.length >= limit) return;
    seen.add(product.codigo);
    out.push(product);
  };
  pickSold(products, 18).forEach(take);
  const byCategory = new Map();
  ranked.forEach((product) => {
    if (!byCategory.has(product.category)) byCategory.set(product.category, product);
  });
  [...byCategory.values()].forEach(take);
  const used = new Map();
  for (const product of ranked) {
    const count = used.get(product.subcategory) || 0;
    if (count >= perFamily) continue;
    used.set(product.subcategory, count + 1);
    take(product);
    if (out.length >= limit) break;
  }
  return out;
}

function matchFamily(families, raw) {
  const key = fold(raw);
  if (key.length < 3) return null;
  return families.find((family) => fold(family.id) === key)
    || families.find((family) => fold(family.short) === key)
    || families.find((family) => {
      const label = fold(family.short);
      return label.length > 3 && (key.includes(label) || label.includes(key));
    })
    || null;
}

const ALIASES = [
  { re: /placas? de video|tarjetas? (de video|grafica)|\bgpu\b|\brtx\b|radeon|geforce/, category: 'tarjetas_graficas' },
  { re: /celular|smartphone|telefono/, sub: 'smartphones' },
  { re: /notebook|laptop|portatil/, sub: 'notebook__' },
  { re: /auricular|headset|audifono|earbud/, sub: 'auriculares' },
  { re: /memorias? ram|\bram\b/, sub: 'memoria_ram' },
  { re: /procesador|\bcpu\b|ryzen|core i\d/, category: 'procesadores' },
  { re: /placas? madre|motherboard|\bmother\b/, category: 'placas_madre' },
  { re: /monitor/, category: 'monitores' },
  { re: /gabinete/, category: 'gabinetes' },
  { re: /fuentes? de (poder|alimentacion)|\bfuente\b/, category: 'fuentes_de_alimentacion' },
  { re: /\bssd\b|nvme/, sub: 'ssd_' },
  { re: /disco/, sub: 'disco_duro' },
  { re: /teclado/, sub: 'teclados' },
  { re: /mouse/, sub: 'mouse__' },
  { re: /impresora/, category: 'impresoras_y_suministros' },
  { re: /reloj|smartwatch/, sub: 'reloj_inteligente' },
  { re: /parlante|speaker/, sub: 'speaker' },
  { re: /router|repetidor|wifi/, sub: 'router' },
  { re: /silla/, sub: 'sillas_gamer' },
  { re: /consola|playstation|\bps5\b|xbox|nintendo/, sub: 'consolas' },
  { re: /iphone/, sub: 'iphone' },
  { re: /macbook/, sub: 'macbook' },
  { re: /\btv\b|televisor|smart tv/, sub: 'tv__' },
  { re: /camaras? de (seguridad|vigilancia)/, sub: 'camaras_de_vigilancia' },
  { re: /cooler|water/, category: 'cooler' },
  { re: /tablet/, sub: 'tablets' }
];

function aliasFamilies(alias, text, families) {
  const pool = families.filter((family) => (alias.category
    ? family.category === alias.category
    : family.id.includes(alias.sub)));
  if (!pool.length) return [];
  const flavored = pool.filter((family) => ['amd', 'intel', 'nvidia'].some((maker) => text.includes(maker) && fold(family.short).includes(maker)));
  return (flavored.length ? flavored : pool).slice(0, 1);
}

function noteIntent(note, families, products = []) {
  const text = fold(note);
  if (text.length < 3) return { wanted: [], banned: [], specs: [], brands: [], priceHint: '' };
  const kept = [];
  const seen = new Set();
  const take = (family, at) => {
    if (seen.has(family.id)) return;
    seen.add(family.id);
    kept.push({ family, banned: negated(text, at) });
  };
  const claimed = [];
  ALIASES.forEach((alias) => {
    const match = alias.re.exec(text);
    if (!match) return;
    claimed.push([match.index, match.index + match[0].length + 3]);
    aliasFamilies(alias, text, families).forEach((family) => take(family, match.index));
  });
  families.forEach((family) => {
    const label = fold(family.short);
    const at = label.length > 4 ? text.indexOf(label) : -1;
    if (at < 0 || claimed.some(([start, end]) => at >= start && at < end)) return;
    take(family, at);
  });
  const specs = [];
  const hz = text.match(/(\d{2,3})\s*hz/);
  if (hz) specs.push({ key: 'frecuencia_de_actualizacion', op: '>=', value: Number(hz[1]) });
  else if (/gamer/.test(text)) specs.push({ key: 'frecuencia_de_actualizacion', op: '>=', value: 140 });
  let priceHint = '';
  if (/(de entrada|barat|economic)/.test(text)) priceHint = 'entrada';
  if (/(alta gama|premium|tope de gama)/.test(text)) priceHint = 'alto';
  const brands = [...new Set(products.map((product) => fold(product.brand)).filter((brand) => brand.length >= 2))]
    .filter((brand) => new RegExp(`(^|[^a-z0-9])${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text))
    .slice(0, 4);
  return {
    wanted: kept.filter((row) => !row.banned).map((row) => row.family),
    banned: kept.filter((row) => row.banned).map((row) => row.family),
    specs,
    brands,
    priceHint
  };
}

const OPS = new Set(['>=', '<=', '>', '<', '=', 'includes', 'in']);

function normalizeFilter(raw, families) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const subcategories = [...new Set([].concat(source.subcategories || source.subcategory || [])
    .map((value) => matchFamily(families, value))
    .filter(Boolean)
    .map((family) => family.id))];
  const number = (value) => {
    const n = Math.round(Number(value) || 0);
    return n > 0 ? n : 0;
  };
  const brands = [].concat(source.brands || []).map((brand) => clip(brand, 30)).filter((brand) => brand.length >= 2).slice(0, 6);
  const specs = [].concat(source.specs || [])
    .filter((rule) => rule && rule.key && OPS.has(String(rule.op || '').trim()))
    .slice(0, 4)
    .map((rule) => ({
      key: String(rule.key).trim(),
      op: String(rule.op).trim(),
      value: Array.isArray(rule.value) ? rule.value.slice(0, 6).map(String) : rule.value
    }));
  const terms = [].concat(source.words || []).map((word) => fold(word).trim()).filter((word) => word.length >= 2 && word.length <= 30).slice(0, 4);
  return {
    subcategories,
    priceMin: number(source.priceMin),
    priceMax: number(source.priceMax),
    brands,
    specs,
    words: terms
  };
}

function matchesSpec(product, rule) {
  const value = product.specs[rule.key];
  if (value == null || value === '') return false;
  if (['>=', '<=', '>', '<', '='].includes(rule.op)) {
    const actual = numberOf(value);
    const target = Number(rule.value);
    if (!Number.isFinite(actual) || !Number.isFinite(target)) {
      return rule.op === '=' && fold(value).includes(fold(rule.value));
    }
    if (rule.op === '>=') return actual >= target;
    if (rule.op === '<=') return actual <= target;
    if (rule.op === '>') return actual > target;
    if (rule.op === '<') return actual < target;
    return actual === target;
  }
  const options = Array.isArray(rule.value) ? rule.value : [rule.value];
  return options.some((option) => fold(value).includes(fold(option)));
}

function applyFilter(products, filter, { allowLowProfit = false } = {}) {
  const steps = [
    { relaxed: '', drop: [] },
    { relaxed: 'sin las palabras del nombre', drop: ['words'] },
    { relaxed: 'sin el filtro de especificaciones', drop: ['words', 'specs'] },
    { relaxed: 'sin el rango de precio ni la marca', drop: ['words', 'specs', 'price', 'brands'] }
  ];
  let exact = null;
  let last = { list: [], relaxed: '' };
  for (const step of steps) {
    const list = products.filter((product) => {
      if (!product.plate) return false;
      if (!allowLowProfit && !product.adsOk) return false;
      if (filter.subcategories.length && !filter.subcategories.includes(product.subcategory)) return false;
      if (!step.drop.includes('price')) {
        if (filter.priceMin && product.price < filter.priceMin) return false;
        if (filter.priceMax && product.price > filter.priceMax) return false;
      }
      if (!step.drop.includes('brands') && filter.brands.length
        && !filter.brands.some((brand) => fold(product.brand) === fold(brand) || product.hay.includes(fold(brand)))) return false;
      if (!step.drop.includes('specs') && filter.specs.length
        && !filter.specs.every((rule) => matchesSpec(product, rule))) return false;
      if (!step.drop.includes('words') && filter.words.length
        && !filter.words.every((word) => product.hay.includes(word))) return false;
      return true;
    }).sort((a, b) => b.score - a.score);
    last = { list, relaxed: step.relaxed };
    if (!exact) {
      exact = last;
      if (list.length && filter.words.length) return exact;
    }
    if (list.length >= 2) return last;
  }
  return exact && exact.list.length ? exact : last;
}

function filterLabel(filter, families, specLabel) {
  const names = filter.subcategories
    .map((id) => (families.find((family) => family.id === id) || {}).short || id)
    .join(', ');
  const parts = [names || 'Todo el catálogo'];
  filter.specs.forEach((rule) => {
    const labels = new Map();
    filter.subcategories.forEach((id) => (specLabel.get(id) || new Map()).forEach((label, key) => labels.set(key, label)));
    const label = fold(labels.get(rule.key) || rule.key.replace(/_/g, ' '));
    const value = Array.isArray(rule.value) ? rule.value.join(' o ') : rule.value;
    parts.push(`${label} ${rule.op === 'includes' || rule.op === 'in' ? 'con' : rule.op} ${value}`);
  });
  if (filter.brands.length) parts.push(filter.brands.join(', '));
  if (filter.words.length) parts.push(`nombre con ${filter.words.join(' + ')}`);
  if (filter.priceMin && filter.priceMax) parts.push(`${moneyGs(filter.priceMin)} a ${moneyGs(filter.priceMax)}`);
  else if (filter.priceMin) parts.push(`desde ${moneyGs(filter.priceMin)}`);
  else if (filter.priceMax) parts.push(`hasta ${moneyGs(filter.priceMax)}`);
  return parts.join(' · ');
}

module.exports = {
  DAY_MS,
  fold,
  words,
  clip,
  clamp,
  median,
  moneyGs,
  dayKey,
  loadCatalog,
  siteSignals,
  salesSignals,
  economics,
  scoreProducts,
  familyStats,
  specVocabulary,
  pickCandidates,
  pickSold,
  pickLeaks,
  matchFamily,
  noteIntent,
  normalizeFilter,
  applyFilter,
  filterLabel
};
