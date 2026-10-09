'use strict';

const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const ExchangeRate = require('../models/exchangeRateModel');
const Sale = require('../models/saleModel');
const AdPlan = require('../models/adPlanModel');
const {
  askGeminiText,
  askClaudeText,
  parseJson,
  communityAiReady,
  claudeReady
} = require('./communityAi');

const WEEKLY_USD = Math.max(5, Number(process.env.AD_WEEKLY_BUDGET_USD) || 50);
const MAX_CAMPAIGNS = 3;

function moneyGs(value) {
  return `Gs. ${Math.round(Number(value) || 0).toLocaleString('es-PY')}`;
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date());
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

async function loadShelf() {
  const [groups, categories] = await Promise.all([
    Product.aggregate([
      {
        $match: {
          stock: { $gte: 1 },
          sellingPrice: { $gte: 1000 },
          productImage: { $exists: true, $ne: [] }
        }
      },
      {
        $group: {
          _id: { category: '$category', subcategory: '$subcategory' },
          count: { $sum: 1 },
          min: { $min: '$sellingPrice' },
          max: { $max: '$sellingPrice' },
          avg: { $avg: '$sellingPrice' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 24 }
    ]),
    Category.find({}).select('label value subcategories.label subcategories.value').lean()
  ]);

  const catLabel = new Map();
  const subLabel = new Map();
  categories.forEach((category) => {
    catLabel.set(category.value, category.label || category.value);
    (category.subcategories || []).forEach((sub) => {
      subLabel.set(sub.value, sub.label || sub.value);
    });
  });

  const shelf = groups.map((row) => {
    const category = row._id.category;
    const subcategory = row._id.subcategory;
    const min = Math.round(row.min || 0);
    const max = Math.round(row.max || 0);
    const avg = Math.round(row.avg || 0);
    const wide = max > min * 1.8;
    return {
      category,
      subcategory,
      categoryLabel: catLabel.get(category) || category,
      subcategoryLabel: subLabel.get(subcategory) || subcategory,
      count: row.count,
      min,
      max,
      avg,
      wide,
      bands: wide
        ? [
          { name: 'entrada', min, max: Math.round(avg * 0.85) },
          { name: 'medio', min: Math.round(avg * 0.85), max: Math.round(avg * 1.25) },
          { name: 'alto', min: Math.round(avg * 1.25), max }
        ]
        : [{ name: 'todo', min, max }]
    };
  });

  const productCount = shelf.reduce((sum, row) => sum + row.count, 0);
  return { shelf, productCount, subcategoryCount: shelf.length };
}

async function loadMetaWeek(rate) {
  const token = process.env.META_MARKETING_ACCESS_TOKEN || '';
  const act = process.env.META_AD_ACCOUNT_ID || '';
  const version = process.env.META_API_VERSION || 'v21.0';
  if (!token || !act) {
    return { connected: false, note: 'La cuenta de anuncios todavía no está conectada en el servidor.' };
  }
  const fields = 'spend,impressions,clicks,actions';
  const url = `https://graph.facebook.com/${version}/${act}/insights?date_preset=last_7d&fields=${fields}&access_token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { connected: false, note: data?.error?.message || 'Meta no devolvió el gasto de la semana.' };
    }
    const row = (data.data || [])[0] || {};
    const spendPyg = Number(row.spend) || 0;
    const purchases = (row.actions || []).reduce((sum, action) => {
      if (/purchase/i.test(action.action_type || '')) return sum + (Number(action.value) || 0);
      return sum;
    }, 0);
    const spentUsd = rate > 0 ? spendPyg / rate : 0;
    return {
      connected: true,
      spendPyg,
      spentUsd,
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      purchases,
      note: ''
    };
  } catch (error) {
    return { connected: false, note: error.message || 'No pude leer Meta.' };
  }
}

function shelfLine(row) {
  const bands = row.bands
    .map((band) => `${band.name} ${moneyGs(band.min)}–${moneyGs(band.max)}`)
    .join(', ');
  return `${row.subcategory} | ${row.categoryLabel} > ${row.subcategoryLabel} | ${row.count} productos | ${bands}`;
}

function fallbackCampaigns(shelf, dailyTotalUsd) {
  const picked = shelf.slice(0, MAX_CAMPAIGNS);
  const each = picked.length ? Math.round((dailyTotalUsd / picked.length) * 100) / 100 : 0;
  return picked.map((row) => ({
    subcategory: row.subcategory,
    name: `${row.subcategoryLabel} en el precio que la gente paga`,
    band: row.wide ? 'medio' : 'todo',
    dailyBudgetUsd: each,
    why: `Hay ${row.count} con stock. El rango va de ${moneyGs(row.min)} a ${moneyGs(row.max)}.`,
    audience: 'Paraguay. Personas que miraron este tipo de producto o lo buscaron para comprar.',
    headline: row.subcategoryLabel,
    text: `En Zenn, ${row.subcategoryLabel.toLowerCase()} con stock en Asunción. Elegí dentro de tu presupuesto.`,
    flyer: `Pieza cuadrada: el producto entero, el precio en la pastilla y el nombre completo. Una sola subcategoría: ${row.subcategoryLabel}.`,
    action: each > 0 ? 'crear' : 'esperar'
  }));
}

function matchShelf(shelf, raw) {
  const key = String(raw || '').trim();
  return shelf.find((row) => row.subcategory === key)
    || shelf.find((row) => row.subcategoryLabel.toLowerCase() === key.toLowerCase());
}

function fitBudgets(campaigns, dailyTotalUsd) {
  let list = campaigns.slice(0, MAX_CAMPAIGNS);
  const asked = list.reduce((sum, row) => sum + (Number(row.dailyBudgetUsd) || 0), 0);
  if (asked <= 0 && dailyTotalUsd > 0 && list.length) {
    const each = Math.round((dailyTotalUsd / list.length) * 100) / 100;
    list = list.map((row) => ({ ...row, dailyBudgetUsd: each, action: row.action === 'esperar' ? 'crear' : (row.action || 'crear') }));
  }
  const nextAsked = list.reduce((sum, row) => sum + (Number(row.dailyBudgetUsd) || 0), 0);
  const scale = nextAsked > dailyTotalUsd && nextAsked > 0 ? dailyTotalUsd / nextAsked : 1;
  return list.map((row) => {
    const daily = Math.max(0, Math.round((Number(row.dailyBudgetUsd) || 0) * scale * 100) / 100);
    return {
      ...row,
      dailyBudgetUsd: dailyTotalUsd <= 0 ? 0 : daily,
      action: dailyTotalUsd <= 0 ? 'esperar' : (row.action || 'crear')
    };
  });
}

async function examplesFor(campaign, shelfRow) {
  const band = (shelfRow.bands || []).find((item) => item.name === campaign.band) || shelfRow.bands[0];
  const query = {
    subcategory: shelfRow.subcategory,
    stock: { $gte: 1 },
    sellingPrice: { $gte: band.min, $lte: band.max || shelfRow.max },
    productImage: { $exists: true, $ne: [] }
  };
  const rows = await Product.find(query)
    .select('codigo productName brandName sellingPrice productImage')
    .sort({ sellingPrice: 1 })
    .limit(3)
    .lean();
  return rows.map((row) => ({
    codigo: row.codigo,
    name: row.productName,
    brand: row.brandName,
    price: moneyGs(row.sellingPrice),
    image: (row.productImage || [])[0] || ''
  }));
}

async function storePulse() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await Sale.find({
    paymentStatus: 'pagado',
    saleDate: { $gte: since }
  })
    .select('saleDate totalAmountPYG items.productSnapshot items.description')
    .sort({ saleDate: -1 })
    .limit(40)
    .lean();
  const totalPyg = rows.reduce((sum, row) => sum + (Number(row.totalAmountPYG) || 0), 0);
  const names = rows.slice(0, 8).map((row) => {
    const item = (row.items || [])[0];
    return item?.productSnapshot?.name || item?.description || 'venta';
  });
  return { count: rows.length, totalPyg, names };
}

function capiStatus() {
  const pixel = Boolean(process.env.META_PIXEL_ID);
  const server = Boolean(process.env.META_ACCESS_TOKEN);
  return {
    pixel,
    server,
    note: server
      ? 'La API de compras del servidor está configurada: Meta puede saber si la persona compró.'
      : 'El pixel del sitio puede ver la visita. Falta META_ACCESS_TOKEN: el servidor todavía no confirma la compra a Meta.'
  };
}

async function loadActiveAds(rate) {
  const token = process.env.META_MARKETING_ACCESS_TOKEN || '';
  const act = process.env.META_AD_ACCOUNT_ID || '';
  const version = process.env.META_API_VERSION || 'v21.0';
  if (!token || !act) return [];
  const fields = 'campaign_name,spend,impressions,clicks,actions';
  const filtering = encodeURIComponent(JSON.stringify([{
    field: 'campaign.effective_status',
    operator: 'IN',
    value: ['ACTIVE']
  }]));
  const url = `https://graph.facebook.com/${version}/${act}/insights?level=campaign&date_preset=today&fields=${fields}&filtering=${filtering}&access_token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return [];
    return (data.data || []).slice(0, 8).map((row) => {
      const spendPyg = Number(row.spend) || 0;
      const purchases = (row.actions || []).reduce((sum, action) => (
        /purchase/i.test(action.action_type || '') ? sum + (Number(action.value) || 0) : sum
      ), 0);
      return {
        name: row.campaign_name || 'Campaña',
        spendPyg,
        spendUsd: rate > 0 ? Math.round((spendPyg / rate) * 100) / 100 : 0,
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
        purchases
      };
    });
  } catch {
    return [];
  }
}

function shiftKey(key, days) {
  const [year, month, day] = String(key).split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

async function composeAdPlan(options = {}) {
  const note = String(options.note || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  const [{ shelf, productCount }, rateDoc, history, sales] = await Promise.all([
    loadShelf(),
    ExchangeRate.getCurrentRate('USD').catch(() => ({ toPYG: 7300 })),
    AdPlan.find().sort({ createdAt: -1 }).limit(5).select('planDate diagnosis campaigns spentUsd').lean(),
    storePulse()
  ]);
  const rate = Number(rateDoc && rateDoc.toPYG) > 0 ? Number(rateDoc.toPYG) : 7300;
  const meta = await loadMetaWeek(rate);
  const spentUsd = Math.round((meta.spentUsd || 0) * 100) / 100;
  const remainingUsd = Math.max(0, Math.round((WEEKLY_USD - spentUsd) * 100) / 100);
  const dailyTotalUsd = Math.round((remainingUsd / 7) * 100) / 100;

  let trends = [];
  let engines = { gemini: false, claude: false };
  if (communityAiReady()) {
    try {
      const scout = await askGeminiText(
        `Hoy en Paraguay, qué electrónica está buscando la gente para comprar: notebooks, placas, procesadores, teclados, monitores, celulares.
Devolvé solo JSON: {"trends":[{"term":"teclado gamer","why":"una frase"}]}
Máximo 5. No inventes precios.`,
        true
      );
      trends = (parseJson(scout)?.trends || []).slice(0, 5);
      engines.gemini = trends.length > 0;
    } catch (error) {
      console.error('[planner] gemini', error.message || error);
    }
  }

  const previous = history[0]
    ? history[0].campaigns.map((row) => `${row.name}: ${row.dailyBudgetUsd} USD/día, ${row.action}`).join(' | ')
    : 'No hay un plan anterior.';
  const dossier = [
    `Tienda online en Asunción. Más de ${productCount} productos con foto y stock en las subcategorías que más tienen unidades.`,
    `Tope: ${WEEKLY_USD} USD por semana. Gastado en 7 días: ${spentUsd} USD. Queda: ${remainingUsd} USD. El día de hoy, entre todas las campañas, no puede pasar de ${dailyTotalUsd} USD.`,
    `Cotización usada: 1 USD = ${moneyGs(rate)}.`,
    meta.connected
      ? `Meta, últimos 7 días: ${meta.impressions} impresiones, ${meta.clicks} clics, ${meta.purchases} compras, gasto ${moneyGs(meta.spendPyg)}.`
      : `Meta: ${meta.note}`,
    `Lo que se está buscando: ${trends.map((row) => row.term).filter(Boolean).join(', ') || 'sin búsqueda externa hoy'}.`,
    `Ventas pagadas de la tienda, 7 días: ${sales.count} por ${moneyGs(sales.totalPyg)}. ${sales.names.length ? `Últimas: ${sales.names.join(' · ')}` : 'Sin ventas pagadas en esos días.'}`,
    `Control de compra hacia Meta: ${capiStatus().note}`,
    note ? `Pedido de quien administra, hay que cumplirlo: ${note}` : 'No hay un pedido manual. Decidí vos con los datos.',
    'Si una campaña anterior coincide con algo que se vendió, la acción es mantener. Si no vendió, la acción es cambiar. No repitas una pieza que no trajo compra.',
    `Plan anterior: ${previous}`,
    'Subcategorías reales. Usá el id de la izquierda, no inventes otra:',
    ...shelf.slice(0, 18).map(shelfLine)
  ].join('\n');

  let drafted = null;
  if (claudeReady()) {
    try {
      const text = await askClaudeText(`Sos el planner de publicidad de Zenn Electrónicos, Paraguay. Armás campañas de catálogo para que a quien busca un teclado le aparezcan teclados en su rango de precio, y lo mismo con procesador, placa o notebook.
No gastes de más. Si el tope de la semana ya se usó, las acciones son "esperar".
Máximo ${MAX_CAMPAIGNS} campañas. Cada una usa una subcategoría de la lista. Si el rango es ancho, elegí una banda: entrada, medio o alto. Si es angosto, banda "todo".
El objetivo es ventas en Paraguay, no alcance barato. Preferí quien ya miró ese tipo de producto.
Devolvé solo JSON:
{"diagnosis":"qué harías hoy, en 3 oraciones","changes":["qué cambia respecto del plan anterior"],"campaigns":[{"subcategory":"id","name":"nombre corto","band":"medio","dailyBudgetUsd":2,"why":"...","audience":"...","headline":"...","text":"texto del anuncio","flyer":"qué tiene que mostrar la pieza","action":"crear"}]}
${dossier}`);
      drafted = parseJson(text);
      engines.claude = Boolean(drafted && drafted.campaigns);
    } catch (error) {
      console.error('[planner] claude', error.message || error);
    }
  }

  const rawCampaigns = engines.claude
    ? drafted.campaigns.map((row) => ({ ...row, shelf: matchShelf(shelf, row.subcategory) })).filter((row) => row.shelf)
    : fallbackCampaigns(shelf, dailyTotalUsd).map((row) => ({ ...row, shelf: matchShelf(shelf, row.subcategory) }));

  const fitted = fitBudgets(
    (rawCampaigns.length ? rawCampaigns : fallbackCampaigns(shelf, dailyTotalUsd).map((row) => ({
      ...row,
      shelf: matchShelf(shelf, row.subcategory)
    }))).filter((row) => row.shelf),
    dailyTotalUsd
  );

  const campaigns = [];
  for (const row of fitted) {
    const band = (row.shelf.bands || []).find((item) => item.name === row.band) || row.shelf.bands[0];
    campaigns.push({
      name: clip(row.name, 80),
      subcategory: row.shelf.subcategory,
      productSet: `${row.shelf.categoryLabel} > ${row.shelf.subcategoryLabel}`,
      band: band.name,
      priceFrom: moneyGs(band.min),
      priceTo: moneyGs(band.max),
      dailyBudgetUsd: row.dailyBudgetUsd,
      dailyBudgetGs: moneyGs(row.dailyBudgetUsd * rate),
      why: clip(row.why, 280),
      audience: clip(row.audience, 220),
      headline: clip(row.headline, 60),
      text: clip(row.text, 240),
      flyer: clip(row.flyer, 280),
      action: row.action,
      examples: await examplesFor({ band: band.name }, row.shelf)
    });
  }

  const diagnosis = clip(
    drafted?.diagnosis
      || (remainingUsd <= 0
        ? `Esta semana ya se usaron los ${WEEKLY_USD} USD. Hoy no se abre gasto nuevo.`
        : `Hoy se pueden repartir ${dailyTotalUsd} USD entre las subcategorías con stock. El tope de la semana sigue en ${WEEKLY_USD} USD.`),
    600
  );
  const changes = Array.isArray(drafted?.changes) ? drafted.changes.map((line) => clip(line, 180)).slice(0, 4) : [];

  const saved = await AdPlan.create({
    planDate: todayKey(),
    weekBudgetUsd: WEEKLY_USD,
    spentUsd,
    remainingUsd,
    dailyTotalUsd,
    exchangeRate: rate,
    diagnosis,
    changes,
    campaigns,
    trends,
    meta: { ...meta, sales, capi: capiStatus(), activeAds: await loadActiveAds(rate) },
    catalog: { productCount, shelves: shelf.length },
    engines,
    note
  });
  return saved.toObject();
}

async function plannerCalendar({ from, days = 42 } = {}) {
  const start = String(from || todayKey());
  const count = Math.min(42, Math.max(7, Number(days) || 42));
  const end = shiftKey(start, count);
  const [plans, salesRows, rateDoc] = await Promise.all([
    AdPlan.find({ planDate: { $gte: start, $lt: end } }).sort({ createdAt: -1 }).lean(),
    Sale.aggregate([
      {
        $match: {
          paymentStatus: 'pagado',
          saleDate: {
            $gte: new Date(`${start}T00:00:00-03:00`),
            $lt: new Date(`${end}T00:00:00-03:00`)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$saleDate', timezone: 'America/Asuncion' }
          },
          count: { $sum: 1 },
          total: { $sum: '$totalAmountPYG' }
        }
      }
    ]),
    ExchangeRate.getCurrentRate('USD').catch(() => ({ toPYG: 7300 }))
  ]);
  const rate = Number(rateDoc && rateDoc.toPYG) > 0 ? Number(rateDoc.toPYG) : 7300;
  const byDate = new Map();
  plans.forEach((plan) => {
    if (!byDate.has(plan.planDate)) byDate.set(plan.planDate, plan);
  });
  const salesByDate = new Map(salesRows.map((row) => [row._id, row]));
  const list = [];
  for (let index = 0; index < count; index += 1) {
    const date = shiftKey(start, index);
    const plan = byDate.get(date);
    const sold = salesByDate.get(date);
    list.push({
      date,
      diagnosis: plan ? plan.diagnosis : '',
      note: plan ? plan.note || '' : '',
      spentUsd: plan ? plan.spentUsd : 0,
      remainingUsd: plan ? plan.remainingUsd : WEEKLY_USD,
      salesCount: sold ? sold.count : 0,
      salesGs: sold ? moneyGs(sold.total) : '',
      slots: ((plan && plan.campaigns) || []).map((campaign, slotIndex) => ({
        id: `${date}-${slotIndex}`,
        name: campaign.name,
        action: campaign.action,
        productSet: campaign.productSet,
        priceFrom: campaign.priceFrom,
        priceTo: campaign.priceTo,
        dailyBudgetUsd: campaign.dailyBudgetUsd,
        dailyBudgetGs: campaign.dailyBudgetGs,
        why: campaign.why,
        audience: campaign.audience,
        headline: campaign.headline,
        text: campaign.text,
        flyer: campaign.flyer,
        examples: campaign.examples || []
      }))
    });
  }
  const latest = plans[0] || null;
  return {
    days: list,
    capi: capiStatus(),
    weekBudgetUsd: WEEKLY_USD,
    live: latest && latest.meta ? latest.meta : { connected: false, activeAds: await loadActiveAds(rate) },
    latestId: latest ? String(latest._id) : ''
  };
}

async function latestAdPlans(limit = 12) {
  return AdPlan.find().sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = { composeAdPlan, latestAdPlans, plannerCalendar, WEEKLY_USD };
