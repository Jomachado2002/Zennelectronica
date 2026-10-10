'use strict';

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
const metaAds = require('./metaAds');
const signals = require('./adSignals');

const { DAY_MS, fold, clip, clamp, moneyGs } = signals;
const WEEKLY_USD = Math.max(5, Number(process.env.AD_WEEKLY_BUDGET_USD) || 50);
const HORIZON_DAYS = 3;
const MAX_NEW = 3;
const MIN_ADSET_PYG = 10000;
const SET_SIZE = 60;
const PAUSE_VERDICTS = new Set(['perdedora', 'cara', 'no_interesa']);
const EMPTY = {
  spendPyg: 0,
  impressions: 0,
  clicks: 0,
  ctr: 0,
  purchases: 0,
  purchaseValue: 0,
  contacts: 0,
  carts: 0,
  landings: 0
};

const VERDICT_LABEL = {
  ganadora: 'Ganadora: se deja igual',
  escalar: 'Ganadora: conviene subirle 20 %',
  aprendiendo: 'Aprendiendo: todavía no se toca',
  en_prueba: 'En prueba hasta la próxima revisión',
  perdedora: 'Mal ROAS: se pausó',
  cara: 'Cada WhatsApp sale caro: se pausó',
  no_interesa: 'Nadie toca el anuncio: se pausó',
  pausada: 'Pausada'
};

const EVENT_LABEL = {
  CONTACT: 'contactos de WhatsApp',
  ADD_TO_CART: 'agregados al carrito',
  PURCHASE: 'compras'
};

function todayKey() {
  return signals.dayKey(0);
}

function shiftKey(key, days) {
  const [year, month, day] = String(key).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function dateLabel() {
  return new Intl.DateTimeFormat('es-PY', {
    timeZone: 'America/Asuncion',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
}

function shortGs(value) {
  const n = Math.round(Number(value) || 0);
  if (n >= 1000000) return `Gs. ${(n / 1000000).toLocaleString('es-PY', { maximumFractionDigits: 2 })}M`;
  if (n >= 1000) return `Gs. ${Math.round(n / 1000)}k`;
  return `Gs. ${n}`;
}

function pct(value) {
  return `${Math.round((Number(value) || 0) * 1000) / 10} %`;
}

function usd(pyg, rate) {
  return rate > 0 ? Math.round((pyg / rate) * 100) / 100 : 0;
}

async function currentRate() {
  const doc = await ExchangeRate.getCurrentRate('USD').catch(() => null);
  return Number(doc && doc.toPYG) > 0 ? Number(doc.toPYG) : 7300;
}

function capiStatus() {
  const server = Boolean(process.env.META_ACCESS_TOKEN || process.env.META_MARKETING_ACCESS_TOKEN);
  return {
    pixel: Boolean(process.env.META_PIXEL_ID),
    server,
    note: server
      ? 'El servidor también le confirma a Meta las compras pagadas: Meta sabe quién compró aunque el navegador bloquee el pixel.'
      : 'El pixel ve la visita, pero falta el token del servidor: Meta no recibe la confirmación de la compra.'
  };
}

async function loadRunning() {
  const plans = await AdPlan.find({ planDate: { $gte: shiftKey(todayKey(), -60) } })
    .sort({ createdAt: -1 })
    .select('planDate createdAt campaigns')
    .lean();
  const seen = new Map();
  plans.forEach((plan) => (plan.campaigns || []).forEach((campaign, index) => {
    const id = campaign && campaign.metaCampaignId;
    if (!id || campaign.type === 'escalar' || seen.has(id)) return;
    seen.set(id, { planId: plan._id, planDate: plan.planDate, createdAt: plan.createdAt, index, campaign });
  }));
  return [...seen.values()];
}

async function markPaused(entry, reason) {
  await AdPlan.updateOne({ _id: entry.planId }, {
    $set: {
      [`campaigns.${entry.index}.pausedAt`]: new Date(),
      [`campaigns.${entry.index}.pausedReason`]: reason,
      [`campaigns.${entry.index}.action`]: 'pausada'
    }
  });
}

function judge(entry, insight, status, econ) {
  const campaign = entry.campaign;
  const daily = Number(campaign.dailyBudgetPyg) || MIN_ADSET_PYG;
  const avgProfit = Number(campaign.avgProfit) || econ.minProfit;
  const margin = Number(campaign.margin) || econ.margin;
  const maxCpa = Math.round(avgProfit * 0.8);
  const targetContact = Math.max(1000, Math.round(maxCpa * econ.closeRate));
  const killAt = Number(campaign.killAtPyg) || Math.max(Math.min(maxCpa, daily * 3), econ.costPerContact * 4);
  const started = new Date(campaign.publishedAt || entry.createdAt).getTime();
  const hours = Math.max(0, Math.round((Date.now() - started) / (60 * 60 * 1000)));
  const spend = insight.spendPyg;
  const earned = Math.round(insight.purchaseValue * margin + insight.contacts * econ.closeRate * avgProfit);
  const costContact = insight.contacts ? Math.round(spend / insight.contacts) : 0;
  const row = {
    metaCampaignId: String(campaign.metaCampaignId),
    metaAdsetId: campaign.metaAdsetId || '',
    planDate: entry.planDate,
    index: entry.index,
    name: campaign.name,
    type: campaign.type || 'prospeccion',
    image: campaign.image || '',
    status,
    hours,
    dailyBudgetPyg: daily,
    ...insight,
    earned,
    costContact,
    targetContact,
    killAt,
    avgProfit
  };
  if (!['ACTIVE', 'IN_PROCESS', 'WITH_ISSUES'].includes(status)) {
    return { ...row, verdict: 'pausada', reason: campaign.pausedReason || 'No está gastando.' };
  }
  const sold = insight.purchases >= 1 && insight.purchaseValue * margin >= spend;
  const cheapContacts = insight.contacts >= 1 && costContact <= targetContact;
  if (sold || cheapContacts) {
    const strong = insight.purchaseValue * margin >= spend * 1.5
      || (insight.contacts >= 3 && costContact <= targetContact * 0.6);
    return {
      ...row,
      verdict: strong && hours >= 72 ? 'escalar' : 'ganadora',
      reason: sold
        ? `${insight.purchases} compra(s) por ${moneyGs(insight.purchaseValue)} con ${moneyGs(spend)} de anuncio. Deja más de lo que cuesta.`
        : `${insight.contacts} WhatsApp a ${moneyGs(costContact)} cada uno. Conviene mientras cueste menos de ${moneyGs(targetContact)}.`
    };
  }
  if (hours < 48 && spend < killAt * 0.5) {
    return { ...row, verdict: 'aprendiendo', reason: `Lleva ${hours} h y ${moneyGs(spend)}. Meta todavía está aprendiendo a quién mostrarlo.` };
  }
  if (spend >= killAt && !insight.purchases && !insight.contacts) {
    return { ...row, verdict: 'perdedora', reason: `Gastó ${moneyGs(spend)} y nadie escribió ni compró. Una venta de este grupo deja ${moneyGs(avgProfit)}.` };
  }
  if (insight.contacts >= 1 && spend >= killAt * 2 && costContact > targetContact * 1.5) {
    return { ...row, verdict: 'cara', reason: `Cada WhatsApp costó ${moneyGs(costContact)}. Para ganar tiene que costar menos de ${moneyGs(targetContact)}.` };
  }
  if (insight.impressions >= 3000 && insight.ctr < 0.6) {
    return { ...row, verdict: 'no_interesa', reason: `${insight.impressions} personas lo vieron y solo el ${insight.ctr} % tocó.` };
  }
  return {
    ...row,
    verdict: 'en_prueba',
    reason: `Gastó ${moneyGs(spend)} de ${moneyGs(killAt)} antes de cortarla. ${insight.clicks} clics, ${insight.carts} carritos, ${insight.contacts} WhatsApp.`
  };
}

async function reviewRunning(econ, { apply = false } = {}) {
  if (!metaAds.metaReady() || !econ) return [];
  const running = await loadRunning();
  if (!running.length) return [];
  const ids = running.map((entry) => entry.campaign.metaCampaignId);
  const [states, insights] = await Promise.all([
    metaAds.campaignStates(ids).catch(() => new Map()),
    metaAds.campaignInsights(ids).catch(() => new Map())
  ]);
  const rows = [];
  for (const entry of running) {
    const id = String(entry.campaign.metaCampaignId);
    const status = states.get(id) || '';
    if (!status || status === 'DELETED' || status === 'ARCHIVED') continue;
    const row = judge(entry, insights.get(id) || EMPTY, status, econ);
    if (apply && PAUSE_VERDICTS.has(row.verdict)) {
      try {
        await metaAds.setCampaignStatus(id, 'PAUSED');
        await markPaused(entry, row.reason);
        row.status = 'PAUSED';
      } catch (error) {
        row.reason = `${row.reason} No la pude pausar: ${error.message}`;
      }
    }
    rows.push({ ...row, label: VERDICT_LABEL[row.verdict] || row.verdict });
  }
  return rows;
}

async function weeklyGuard(rate) {
  if (!metaAds.metaReady()) return null;
  const week = await metaAds.accountInsights('last_7d').catch(() => null);
  if (!week) return null;
  const capPyg = WEEKLY_USD * rate;
  if (week.spendPyg < capPyg) return { spendPyg: week.spendPyg, capPyg, paused: [] };
  const running = await loadRunning();
  const states = await metaAds.campaignStates(running.map((entry) => entry.campaign.metaCampaignId)).catch(() => new Map());
  const paused = [];
  for (const entry of running) {
    const id = String(entry.campaign.metaCampaignId);
    if (states.get(id) !== 'ACTIVE') continue;
    try {
      await metaAds.setCampaignStatus(id, 'PAUSED');
      await markPaused(entry, `Se llegó al tope de ${WEEKLY_USD} USD de la semana.`);
      paused.push(entry.campaign.name);
    } catch (error) {
      console.error('[planner tope]', error.message || error);
    }
  }
  return { spendPyg: week.spendPyg, capPyg, paused };
}

function quotePool(candidates) {
  const out = [];
  const seen = new Set();
  candidates.forEach((product) => {
    if (seen.has(product.category) || out.length >= 10) return;
    seen.add(product.category);
    out.push(product);
  });
  candidates.forEach((product) => {
    if (out.length >= 10 || out.includes(product)) return;
    out.push(product);
  });
  return out;
}

async function scanMarket({ candidates, queries, families }) {
  const empty = { demand: [], prices: [], dates: [], ok: false };
  if (!communityAiReady()) return empty;
  const pool = quotePool(candidates);
  const familyList = families.slice(0, 50).map((family) => `${family.id}: ${family.short} (${family.count} stock)`).join('\n');
  const productList = pool.map((product) => `${product.codigo} · ${clip(product.name, 90)} · Zenn ${moneyGs(product.price)} · gana ${moneyGs(product.profit)}`).join('\n');
  const searchList = queries.slice(0, 18).map((query) => `${query.query} (${query.count})`).join(', ') || 'sin búsquedas registradas';
  const prompt = `Sos scout de mercado de Zenn Electrónicos, tienda de tecnología en Asunción, Paraguay. Hoy es ${dateLabel()}.
NO armes campañas. NO elijas productos. Solo investigá con Google Search qué se está COMPRANDO ahora en Paraguay.

Reglas:
- Vale solo lo publicado esta semana o los últimos 10 días.
- Priorizá intención de compra: más vendidos, oferta vigente, "agotado", cuotas, aguinaldo, feriado. No sirven unboxing de YouTube ni lanzamientos de Estados Unidos.
- Tiendas: Nissei, Shopping China, Gonzalez Gimenez, Tupi, Bristol, Cellshop, Mercado Libre Paraguay, Marketplace Paraguay.
- El término es lo que la persona escribe para comprar: "monitor 165hz", "auriculares gamer", "ryzen 5 5600", no "tecnología" ni "notebook" a secas si afuera se busca notebook gamer.
- Si el término no entra en ninguna familia nuestra, no lo pongas.

1) demand: qué quiere COMPRAR la gente ahora. term, intent, ticketGs (lo que espera pagar), family (id de la lista), why (por qué ahora, una frase), source (dominio).
2) prices: el MISMO modelo que estos códigos nuestros. Tienda paraguaya, precio en guaraníes y URL. Si no es el mismo SKU o el precio está solo en dólares, no lo pongas.
3) dates: fechas de compra en Paraguay de los próximos 30 días, solo con fuente.

Lo que la gente buscó en zenn.com.py en 14 días: ${searchList}

Familias nuestras (id: nombre):
${familyList}

Cotizá estos productos, uno por rubro:
${productList}

Devolvé solo JSON:
{"demand":[{"term":"monitor gamer 165hz","intent":"jugar más fluido","ticketGs":1800000,"family":"monitores__27","why":"Nissei lo tiene en oferta esta semana","source":"nissei.com"}],"prices":[{"codigo":"61600","store":"Nissei","pricePyg":3100000,"url":"https://..."}],"dates":[{"date":"2026-11-27","event":"Black Friday"}]}
Máximo 8 demand, 10 prices, 4 dates.`;
  try {
    const raw = parseJson(await askGeminiText(prompt, true)) || {};
    const byCode = new Map(pool.map((product) => [product.codigo, product]));
    const demand = (Array.isArray(raw.demand) ? raw.demand : []).map((row) => {
      const term = clip(row && row.term, 80);
      if (term.length < 3) return null;
      const family = signals.matchFamily(families, row.family);
      return {
        term,
        intent: clip(row.intent, 140),
        ticketGs: Math.round(Number(row.ticketGs) || 0),
        family: family ? family.id : '',
        familyLabel: family ? family.short : '',
        why: clip(row.why, 140),
        source: clip(row.source, 60)
      };
    }).filter(Boolean).slice(0, 8);
    const prices = (Array.isArray(raw.prices) ? raw.prices : []).map((row) => {
      const product = byCode.get(String(row && row.codigo));
      const pricePyg = Math.round(Number(row && row.pricePyg) || 0);
      const url = String((row && row.url) || '');
      if (!product || pricePyg < 10000 || !/^https?:\/\//.test(url) || !row.store) return null;
      return {
        codigo: product.codigo,
        name: clip(product.name, 80),
        ours: product.price,
        store: clip(row.store, 40),
        pricePyg,
        url: clip(url, 300),
        diffPct: Math.round(((product.price - pricePyg) / pricePyg) * 100)
      };
    }).filter(Boolean).slice(0, 12);
    const limit = shiftKey(todayKey(), 45);
    const dates = (Array.isArray(raw.dates) ? raw.dates : []).map((row) => {
      const date = String((row && row.date) || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayKey() || date > limit) return null;
      return { date, event: clip(row.event, 80) };
    }).filter(Boolean).slice(0, 4);
    return { demand, prices, dates, ok: demand.length > 0 || prices.length > 0 };
  } catch (error) {
    console.error('[planner gemini]', error.message || error);
    return empty;
  }
}

function reviewLines(review) {
  if (!review.length) return ['Todavía no hay campañas del planner en Meta.'];
  return review.map((row) => [
    row.name,
    row.label,
    `${row.hours} h`,
    `gastó ${moneyGs(row.spendPyg)}`,
    `${row.clicks} clics`,
    `${row.contacts} WhatsApp`,
    `${row.carts} carritos`,
    `${row.purchases} compras`,
    row.reason
  ].join(' · '));
}

function searchLines(queries, families) {
  const names = new Map(families.map((family) => [family.id, family.short]));
  return queries.slice(0, 30).map((query) => {
    if (!query.hits) return `"${query.query}" (${query.count}) → no hay stock que coincida`;
    const where = query.families.slice(0, 3).map((id) => names.get(id) || id).join(', ');
    return `"${query.query}" (${query.count}) → ${query.hits} con stock en ${where}, ${shortGs(query.priceMin)} a ${shortGs(query.priceMax)}`;
  });
}

function familyLine(family) {
  return [
    family.id,
    family.short,
    `${family.count} con stock`,
    `${shortGs(family.priceMin)}–${shortGs(family.priceMax)}`,
    `gana ${shortGs(family.profitMid)} (máx ${shortGs(family.profitMax)})`,
    `aptos ${family.adsOk}`,
    `busc ${family.searches} · vistas ${family.views} · carr ${family.carts} · vend ${family.sold}${family.promos ? ` · promo ${family.promos}` : ''}`
  ].join(' | ');
}

function candidateLine(product, keys, rival) {
  const specs = (keys || []).slice(0, 4)
    .map((key) => (product.specs[key] ? `${key}=${clip(product.specs[key], 22)}` : ''))
    .filter(Boolean)
    .join('; ');
  const versus = rival
    ? ` | ${rival.store} ${shortGs(rival.pricePyg)} (nosotros ${rival.diffPct > 0 ? '+' : ''}${rival.diffPct} %)`
    : '';
  return [
    product.codigo,
    clip(product.name, 80),
    product.brand || '-',
    product.subcategory,
    `${moneyGs(product.price)}${product.list ? ` antes ${moneyGs(product.list)}` : ''}`,
    `gana ${moneyGs(product.profit)}`,
    `stock ${product.stock}`,
    `${product.views}v ${product.carts}c ${Math.round(product.searches)}b ${product.sold}vend`
  ].join(' | ') + (specs ? ` | ${specs}` : '') + versus;
}

function salesLines(sales, families) {
  const names = new Map(families.map((family) => [family.id, family.short]));
  const top = [...sales.families.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([id, qty]) => `${names.get(id) || id}: ${qty}`);
  return [
    `Ventas pagadas: ${sales.count7} en 7 días por ${moneyGs(sales.total7)}; ${sales.count60} en 60 días; ticket promedio ${moneyGs(sales.avgTicket)}.`,
    top.length ? `Familias que más se vendieron en 60 días (las que se pudieron reconocer): ${top.join(' · ')}` : 'Las ventas cargadas no traen el producto, no se puede saber la familia.',
    sales.recent.length ? `Últimas ventas: ${sales.recent.slice(0, 8).join(' · ')}` : ''
  ].filter(Boolean);
}

function marketLines(market) {
  const lines = [];
  market.demand.forEach((row) => {
    const ticket = row.ticketGs ? ` ticket ~${moneyGs(row.ticketGs)}` : '';
    lines.push(`"${row.term}"${ticket} → ${row.why || row.intent || 'sin detalle'}${row.familyLabel ? ` (${row.familyLabel})` : ''}${row.source ? ` [${row.source}]` : ''}`);
  });
  market.dates.forEach((row) => lines.push(`Fecha: ${row.date} ${row.event}`));
  return lines.length ? lines : ['Google no devolvió datos confirmados hoy.'];
}

function matchDemand(term, products) {
  const tokens = signals.words(term).filter((word) => word.length >= 3);
  if (!tokens.length) return [];
  const need = Math.max(1, Math.ceil(tokens.length * 0.7));
  return products
    .filter((product) => tokens.filter((token) => product.hay.includes(token)).length >= need)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function opportunityLines(market, products) {
  if (!market.demand.length) return ['Gemini no trajo demanda. Decidí solo con ventas, búsquedas de la tienda y ganancia.'];
  return market.demand.map((row) => {
    const hits = matchDemand(row.term, products);
    if (!hits.length) {
      return `"${row.term}" → no hay stock nuestro que coincida. No armes campaña de esto.`;
    }
    const list = hits.map((product) => (
      `${product.codigo} ${clip(product.name, 48)} ${moneyGs(product.price)} gana ${moneyGs(product.profit)} ${product.sold ? `vendió ${product.sold}` : ''}`
    )).join('; ');
    return `"${row.term}"${row.familyLabel ? ` [${row.familyLabel}]` : ''} → ${list}`;
  });
}

function soldLines(sold) {
  if (!sold.length) return ['En 60 días no hay ventas cruzadas con stock actual.'];
  return sold.map((product) => (
    `${product.codigo} | ${clip(product.name, 70)} | ${product.subcategoryLabel} | ${moneyGs(product.price)} | gana ${moneyGs(product.profit)} | vendió ${product.sold} | stock ${product.stock}`
  ));
}

function leakLines(leaks) {
  if (!leaks.length) return ['Nadie mira un producto sin comprarlo: no hay fugas claras.'];
  return leaks.map((product) => (
    `${product.codigo} | ${clip(product.name, 70)} | ${product.views} vistas | ${product.carts} carritos | 0 ventas | ${moneyGs(product.price)}`
  ));
}

function priceLines(market) {
  if (!market.prices.length) return ['No se encontró el mismo modelo con precio en guaraníes.'];
  return market.prices.map((row) => `${row.codigo} ${row.name}: nosotros ${moneyGs(row.ours)}, ${row.store} ${moneyGs(row.pricePyg)} (${row.diffPct > 0 ? 'somos más caros' : 'somos más baratos'} ${Math.abs(row.diffPct)} %)`);
}

function plannerPrompt(ctx) {
  const {
    econ, budget, note, review, market, site, sales, families, vocab,
    candidates, productCount, retarget, sold, leaks, dead
  } = ctx;
  const rivals = new Map(market.prices.map((row) => [row.codigo, row]));
  const killTop = Math.max(budget.prospectPyg * HORIZON_DAYS, econ.costPerContact * 4);
  const retargetLine = retarget.active
    ? '"Volvé a verlo" ya está activa. No armes otra igual.'
    : retarget.pyg
      ? `El sistema arma "Volvé a verlo" con ${moneyGs(retarget.pyg)} por día: catálogo para quien miró o agregó al carrito en 14 días y no compró. Vos solo escribís headline y text en "retargeting". Para gente nueva quedan ${moneyGs(budget.prospectPyg)} por día.`
      : `No alcanza para "Volvé a verlo". Para gente nueva quedan ${moneyGs(budget.prospectPyg)} por día.`;
  const dossier = [
    '## Lo que ya está en Meta (el sistema ya pausó lo que pierde; no lo reabras)',
    ...reviewLines(review),
    '',
    '## Demanda de Paraguay × lo que SÍ tenemos (si dice NO HAY stock, no armes esa campaña)',
    ...opportunityLines(market, candidates.concat(sold)),
    '',
    '## Ya se vendió y hay stock: estos códigos son oro para héroes',
    ...soldLines(sold),
    '',
    '## La gente mira y no compra: retarget o skip, no les pagues prospección cara',
    ...leakLines(leaks),
    '',
    '## Búsquedas dentro de zenn.com.py, 14 días',
    ...(searchLines(site.queries, families).length ? searchLines(site.queries, families) : ['Sin búsquedas registradas.']),
    '',
    '## Paraguay esta semana (solo Google, Gemini no elige productos)',
    ...marketLines(market),
    '',
    '## Precio contra la competencia',
    ...priceLines(market),
    '',
    '## Ventas de la tienda',
    ...salesLines(sales, families),
    '',
    '## Familias que NO se pagan (margen bajo o sin productos que cubran el anuncio)',
    ...(dead.length ? dead.map((family) => `${family.id} ${family.short}: gana ${shortGs(family.profitMid)}, aptos ${family.adsOk}, busc ${family.searches}`) : ['Ninguna marcada.']),
    '',
    '## Familias con stock: id | familia | stock | precio | ganancia | aptos para anuncio | demanda',
    ...families.filter((family) => family.adsOk >= 1).map(familyLine),
    '',
    '## Especificaciones por familia (clave: valores más comunes)',
    ...vocab.lines,
    '',
    '## Candidatos publicables: código | nombre | marca | familia | precio | ganancia | stock | vistas/carritos/búsquedas/ventas | specs | competencia',
    ...candidates.map((product) => candidateLine(product, vocab.keysByFamily.get(product.subcategory), rivals.get(product.codigo)))
  ].join('\n');

  return `Sos el media buyer de Zenn Electrónicos, Asunción. Hoy es ${dateLabel()}.
Gemini solo scoutó el mercado. Vos analizás NUESTRO catálogo y decidís qué se paga. El que administra solo autoriza.

Presupuesto: ${WEEKLY_USD} USD/semana (${moneyGs(budget.capPyg)}), unos 7 USD por día (${moneyGs(budget.dailyCapPyg)}). Para campañas nuevas hay ${moneyGs(budget.newPyg)}/día durante ${HORIZON_DAYS} días. Mínimo ${moneyGs(MIN_ADSET_PYG)} por conjunto. Con esta plata, UNA o DOS campañas de prospección ganan más que tres chicas que se matan entre sí. No armes notebook y placa madre por default: el catálogo tiene auriculares, monitores, teclados, celulares y el resto. Elegí donde coinciden demanda + ganancia + stock + precio.

Único objetivo: ganancia. Un clic o un like que no vende es plata perdida.

Números de Zenn:
- "gana" = lo que queda después de costo y envío. Margen promedio ${pct(econ.margin)}. ROAS mínimo ${econ.breakEvenRoas}.
- WhatsApp cierra la venta. 14 días: ${econ.contacts14} contactos, ${econ.carts14} carritos, ${econ.purchases14} compras web.
- Un WhatsApp por anuncio cuesta ~${moneyGs(econ.costPerContact)} y compra el ${pct(econ.closeRate)}. Una venta por anuncio ~${moneyGs(econ.estCpa)}.
- Solo se paga un producto que deja ≥ ${moneyGs(econ.minProfit)}. Lo que deja menos va a orgánico o a "Volvé a verlo".
- Clic ~${moneyGs(econ.costPerClick)}. Meta optimiza por ${EVENT_LABEL[econ.event] || 'compras'}.

Ya decidido, no lo toques:
- Ganadora se deja. Tocarla reinicia el aprendizaje.
- Perdedora ya se pausó. No la reabras.
- ${retargetLine}

Cómo pensás, en este orden:
1. Cruzá: lo que se vende en la tienda, lo que se busca en zenn.com.py, lo que Gemini vio en Paraguay, la ganancia por venta y si somos más baratos que la competencia.
2. Héroes = códigos concretos de "Ya se vendió" o de "Candidatos". El anuncio muestra ESA foto y ESE precio. Si un término de Gemini no tiene stock, skip.
3. Filtro sobre los ${productCount} productos con stock, no sobre una lista inventada. Campos: subcategories (ids), priceMin, priceMax, brands, specs [{key,op,value}] con las claves de especificaciones (op >= <= = includes), words (b550, rtx 5060, 165).
   Monitor gamer: {"subcategories":["monitores__27"],"specs":[{"key":"frecuencia_de_actualizacion","op":">=","value":144}],"priceMax":2500000}
   El sistema saca del grupo lo que deja menos de ${moneyGs(econ.minProfit)}.
4. Texto para alguien de Paraguay que nos ve en el celular y no nos conoce. Línea 1: qué es y el precio real del héroe o "desde" el más barato. Línea 2: por qué comprarlo hoy (spec, modelo o precio vs competencia). Cierre: Consultá por WhatsApp o Comprá en zenn.com.py. Máximo 3 líneas. No inventes cuotas, envío gratis, garantía ni descuento que no esté en los datos.
5. killAtGs: entre ${moneyGs(econ.costPerContact * 2)} y ${moneyGs(killTop)}. Si gasta eso sin WhatsApp ni compra, se pausa.
6. share suma 1. skip: familias buscadas que no se pagan, con el motivo. watch: qué mirar a los ${HORIZON_DAYS} días.

Pedido de quien administra: ${note ? `"${note}"` : 'ninguno'}.
${note ? 'Si nombra una familia, va como campaña aunque deje poco, y en why decís cuánto deja. Si pide sacar algo, no lo pongas. noteFamilies = ids que pidió y que pidió sacar.' : ''}

Devolvé solo JSON:
{"diagnosis":"4 a 7 oraciones: qué se paga estos 3 días, qué producto héroe, por qué vende, cuánto puede dejar, qué se saltea y qué no se toca","noteFamilies":{"wanted":[],"banned":[]},"retargeting":{"headline":"...","text":"..."},"campaigns":[{"name":"nombre corto","filter":{"subcategories":["id"],"priceMin":0,"priceMax":0,"brands":[],"specs":[],"words":[]},"heroes":["codigo"],"share":1,"why":"demanda + ganancia + precio, dos oraciones","headline":"hasta 40 caracteres","text":"...","killAtGs":50000,"expected":"qué tiene que pasar en 3 días para dejarla"}],"skip":[{"family":"id","why":"..."}],"watch":["qué mirar en la próxima revisión"]}

${dossier}`;
}

function preview(product) {
  return {
    codigo: product.codigo,
    name: clip(product.name, 90),
    brand: product.brand,
    price: product.price,
    priceText: moneyGs(product.price),
    profit: product.profit,
    plate: product.plate,
    slug: product.slug
  };
}

function setEconomics(set, econ) {
  const top = set.slice(0, 20);
  const price = top.reduce((sum, product) => sum + product.price, 0);
  const profit = top.reduce((sum, product) => sum + product.profit, 0);
  const avgProfit = top.length ? Math.round(profit / top.length) : 0;
  const margin = price > 0 ? profit / price : econ.margin;
  return {
    avgProfit,
    margin: Math.round(margin * 1000) / 1000,
    breakEvenRoas: Math.round((1 / Math.max(margin, 0.01)) * 10) / 10,
    maxCpa: Math.round(avgProfit * 0.8)
  };
}

function splitBudget(rows, total) {
  let list = rows.slice();
  while (list.length > 1 && total / list.length < MIN_ADSET_PYG) list = list.slice(0, -1);
  if (!list.length || total < MIN_ADSET_PYG) return [];
  const shares = list.map((row) => clamp(Number(row.share) || 0, 0, 1));
  const sum = shares.reduce((a, b) => a + b, 0);
  const weights = sum > 0 ? shares.map((share) => share / sum) : list.map(() => 1 / list.length);
  const amounts = weights.map((weight) => Math.max(MIN_ADSET_PYG, Math.floor((total * weight) / 1000) * 1000));
  let over = amounts.reduce((a, b) => a + b, 0) - total;
  while (over > 0) {
    const index = amounts.indexOf(Math.max(...amounts));
    const cut = Math.min(over, amounts[index] - MIN_ADSET_PYG);
    if (cut <= 0) break;
    amounts[index] -= cut;
    over -= cut;
  }
  return list.map((row, index) => ({ ...row, dailyBudgetPyg: amounts[index] }));
}

function hasSpec(products, familyId, key) {
  return products.some((product) => product.subcategory === familyId && product.specs[key]);
}

function hasBrand(products, familyId, brand) {
  return products.some((product) => product.subcategory === familyId && fold(product.brand) === brand);
}

function forcedRow(family, intent, note, products) {
  return {
    name: family.short,
    filter: {
      subcategories: [family.id],
      priceMin: intent.priceHint === 'alto' ? family.priceMid : 0,
      priceMax: intent.priceHint === 'entrada' ? family.priceMid : 0,
      brands: (intent.brands || []).filter((brand) => hasBrand(products, family.id, brand)),
      specs: intent.specs.filter((rule) => hasSpec(products, family.id, rule.key)),
      words: []
    },
    heroes: [],
    share: 0,
    why: `Lo pediste: ${clip(note, 160)}`,
    forced: true
  };
}

function buildCampaigns(ctx) {
  const { drafted, families, products, econ, intent, budget, specLabel, retarget, note, rate } = ctx;
  const changes = [];
  const campaigns = [];

  if (retarget.pyg) {
    const watched = products
      .filter((product) => product.plate && (product.views || product.carts))
      .sort((a, b) => (b.carts * 4 + b.views) - (a.carts * 4 + a.views));
    const shown = (watched.length >= 3 ? watched : products.slice().sort((a, b) => b.score - a.score)).slice(0, 6);
    const copy = (drafted && drafted.retargeting) || {};
    campaigns.push({
      type: 'retargeting',
      name: 'Volvé a verlo',
      filterLabel: 'Todo el catálogo. Lo ve quien miró un producto o lo agregó al carrito en 14 días y no compró.',
      headline: clip(copy.headline || 'Lo que miraste sigue disponible', 40),
      text: clip(copy.text || 'Lo que estuviste mirando en Zenn sigue con stock en Asunción. Consultá por WhatsApp o comprá en zenn.com.py.', 300),
      why: 'Es la gente que ya mostró interés. Con poca plata es lo que más vende.',
      expected: 'WhatsApp y carritos de gente que ya visitó la tienda.',
      products: shown.map(preview),
      image: (shown[0] && shown[0].plate) || '',
      setSize: products.length,
      avgProfit: Math.round(signals.median(products.map((product) => product.profit))),
      margin: econ.margin,
      breakEvenRoas: econ.breakEvenRoas,
      maxCpa: Math.round(signals.median(products.map((product) => product.profit)) * 0.8),
      killAtPyg: Math.max(retarget.pyg * HORIZON_DAYS, econ.costPerContact * 4),
      dailyBudgetPyg: retarget.pyg,
      dailyBudgetUsd: usd(retarget.pyg, rate),
      event: econ.event,
      action: 'lista',
      verdict: 'Nueva: falta autorizar'
    });
  }

  const banned = new Set(intent.banned.map((family) => family.id));
  const wanted = new Set(intent.wanted.map((family) => family.id));
  let rows = (drafted && Array.isArray(drafted.campaigns) ? drafted.campaigns : [])
    .map((row) => ({ ...row, filter: signals.normalizeFilter(row.filter || { subcategories: [row.subcategory] }, families) }))
    .filter((row) => row.filter.subcategories.length && !row.filter.subcategories.some((id) => banned.has(id)));
  intent.wanted.forEach((family) => {
    if (rows.some((row) => row.filter.subcategories.includes(family.id))) return;
    rows.unshift(forcedRow(family, intent, note, products));
  });
  if (!rows.length) {
    const top = families.find((family) => family.adsOk >= 3 && !banned.has(family.id));
    if (top) {
      rows.push({
        name: top.short,
        filter: signals.normalizeFilter({ subcategories: [top.id] }, families),
        heroes: [],
        share: 1,
        why: `Es la familia con más demanda que deja más de ${moneyGs(econ.minProfit)} por venta.`
      });
    }
  }
  rows.forEach((row) => {
    row.forced = row.forced || row.filter.subcategories.some((id) => wanted.has(id));
  });
  rows.sort((a, b) => Number(Boolean(b.forced)) - Number(Boolean(a.forced)));

  const built = [];
  rows.forEach((row) => {
    const { list, relaxed } = signals.applyFilter(products, row.filter, { allowLowProfit: row.forced });
    if (!list.length) {
      changes.push(`${clip(row.name || 'Campaña', 60)}: el filtro no dejó productos que paguen el anuncio. No se arma.`);
      return;
    }
    let heroes = [...new Set([].concat(row.heroes || []).map(String))].filter((code) => list.some((product) => product.codigo === code));
    if (!heroes.length) {
      heroes = list.filter((product) => product.sold > 0).slice(0, 3).map((product) => product.codigo);
    }
    if (!heroes.length) {
      heroes = list.slice(0, 3).map((product) => product.codigo);
    }
    const ordered = [
      ...heroes.map((code) => list.find((product) => product.codigo === code)),
      ...list.filter((product) => !heroes.includes(product.codigo))
    ];
    built.push({ row, set: ordered.slice(0, SET_SIZE), relaxed });
  });

  const room = Math.max(1, Math.floor(budget.prospectPyg / 25000));
  const forcedCount = built.filter((item) => item.row.forced).length;
  const kept = built.slice(0, Math.min(MAX_NEW, Math.max(room, forcedCount)));
  if (built.length > kept.length) {
    changes.push(`Quedaron afuera ${built.length - kept.length} campaña(s): con ${moneyGs(budget.prospectPyg)} por día conviene concentrar.`);
  }
  const funded = splitBudget(kept.map((item) => ({ ...item, share: item.row.share })), budget.prospectPyg);

  funded.forEach((item) => {
    const { row, set, relaxed } = item;
    const economicsOfSet = setEconomics(set, econ);
    const cheapest = set.reduce((min, product) => Math.min(min, product.price), Infinity);
    const priciest = set.reduce((max, product) => Math.max(max, product.price), 0);
    const killFloor = econ.costPerContact * 2;
    const killTop = Math.max(item.dailyBudgetPyg * HORIZON_DAYS, econ.costPerContact * 4);
    const label = signals.filterLabel(row.filter, families, specLabel);
    const familyName = (families.find((family) => family.id === row.filter.subcategories[0]) || {}).short || 'productos';
    campaigns.push({
      type: 'prospeccion',
      name: clip(row.name || familyName, 70),
      filter: row.filter,
      filterLabel: relaxed ? `${label} (${relaxed}: con el filtro exacto quedaba menos de 2 productos que paguen el anuncio)` : label,
      headline: clip(row.headline || `${familyName} con stock en Asunción`, 40),
      text: clip(row.text || `${familyName} desde ${moneyGs(cheapest)} en Zenn, con stock en Asunción. Consultá por WhatsApp o comprá en zenn.com.py.`, 300),
      why: clip(row.why, 320),
      expected: clip(row.expected, 200),
      codigos: set.map((product) => product.codigo),
      products: set.slice(0, 6).map(preview),
      image: (set[0] && set[0].plate) || '',
      setSize: set.length,
      priceFrom: moneyGs(cheapest),
      priceTo: moneyGs(priciest),
      ...economicsOfSet,
      warn: economicsOfSet.avgProfit < econ.minProfit
        ? `Deja ${moneyGs(economicsOfSet.avgProfit)} por venta y una venta por anuncio cuesta cerca de ${moneyGs(econ.estCpa)}. Con estos números pierde plata.`
        : '',
      killAtPyg: Math.round(clamp(Number(row.killAtGs) || killTop, killFloor, killTop)),
      dailyBudgetPyg: item.dailyBudgetPyg,
      dailyBudgetUsd: usd(item.dailyBudgetPyg, rate),
      event: econ.event,
      action: 'lista',
      verdict: 'Nueva: falta autorizar'
    });
  });
  return { campaigns, changes };
}

function scaleProposals(review, headroom, rate) {
  const out = [];
  let left = headroom;
  review.filter((row) => row.verdict === 'escalar').forEach((row) => {
    const target = Math.round((row.dailyBudgetPyg * 1.2) / 1000) * 1000;
    const next = Math.min(target, row.dailyBudgetPyg + left);
    if (next - row.dailyBudgetPyg < 1000) return;
    left -= next - row.dailyBudgetPyg;
    out.push({
      type: 'escalar',
      name: `Subir ${row.name}`,
      metaCampaignId: row.metaCampaignId,
      metaAdsetId: row.metaAdsetId,
      fromPyg: row.dailyBudgetPyg,
      dailyBudgetPyg: next,
      dailyBudgetUsd: usd(next, rate),
      filterLabel: `De ${moneyGs(row.dailyBudgetPyg)} a ${moneyGs(next)} por día.`,
      why: row.reason,
      image: row.image || '',
      products: [],
      action: 'lista',
      verdict: 'Escalar: falta autorizar'
    });
  });
  return { proposals: out, used: headroom - left };
}

let liveMemo = { at: 0, rows: [] };

async function composeAdPlan(options = {}) {
  const note = String(options.note || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  const force = Boolean(options.force || note);
  const rate = await currentRate();
  const guard = await weeklyGuard(rate).catch((error) => {
    console.error('[planner tope]', error.message || error);
    return null;
  });
  if (!force) {
    const fresh = await AdPlan.findOne().sort({ createdAt: -1 }).lean();
    const age = fresh ? Date.now() - new Date(fresh.createdAt).getTime() : Infinity;
    if (fresh && age < HORIZON_DAYS * DAY_MS) return fresh;
  }

  const ready = metaAds.metaReady();
  const [{ products, specLabel }, pixel, history, week, catalog] = await Promise.all([
    signals.loadCatalog(),
    ready ? metaAds.pixelEvents(14).catch(() => ({})) : {},
    ready ? metaAds.accountInsights('maximum').catch(() => EMPTY) : EMPTY,
    ready ? metaAds.accountInsights('last_7d').catch(() => EMPTY) : EMPTY,
    ready ? metaAds.liveCatalog().catch(() => null) : null
  ]);
  const [site, sales] = await Promise.all([
    signals.siteSignals(products),
    signals.salesSignals(products)
  ]);
  const econ = signals.economics({ products, pixel, history, sales });
  signals.scoreProducts(products, econ);
  const families = signals.familyStats(products, site, sales);
  const review = await reviewRunning(econ, { apply: true });

  const capPyg = Math.round(WEEKLY_USD * rate);
  const dailyCapPyg = Math.floor(capPyg / 7);
  const remainingPyg = Math.max(0, capPyg - week.spendPyg);
  const horizonDailyPyg = Math.min(dailyCapPyg, Math.floor(remainingPyg / HORIZON_DAYS));
  const live = review.filter((row) => !['pausada', ...PAUSE_VERDICTS].includes(row.verdict) && row.status !== 'PAUSED');
  const committedPyg = live.reduce((sum, row) => sum + row.dailyBudgetPyg, 0);
  const scaled = scaleProposals(review, Math.max(0, horizonDailyPyg - committedPyg), rate);
  const newPyg = Math.max(0, horizonDailyPyg - committedPyg - scaled.used);
  const retargetActive = live.some((row) => row.type === 'retargeting');
  const fallbackIntent = signals.noteIntent(note, families, products);
  let retargetPyg = 0;
  if (!retargetActive && newPyg >= MIN_ADSET_PYG * 2) {
    retargetPyg = Math.max(MIN_ADSET_PYG, Math.round((newPyg * 0.35) / 1000) * 1000);
  } else if (!retargetActive && newPyg >= MIN_ADSET_PYG && !fallbackIntent.wanted.length) {
    retargetPyg = newPyg;
  }
  const budget = {
    rate,
    capPyg,
    dailyCapPyg,
    spent7Pyg: week.spendPyg,
    remainingPyg,
    horizonDailyPyg,
    committedPyg,
    scalePyg: scaled.used,
    newPyg,
    retargetPyg,
    prospectPyg: Math.max(0, newPyg - retargetPyg)
  };

  const candidates = signals.pickCandidates(products);
  const sold = signals.pickSold(products, 20);
  const leaks = signals.pickLeaks(products, 12);
  const dead = families.filter((family) => family.adsOk < 2 || family.profitMid < econ.minProfit).slice(0, 12);
  const vocabIds = [...new Set([
    ...fallbackIntent.wanted.map((family) => family.id),
    ...families.slice(0, 20).map((family) => family.id),
    ...candidates.map((product) => product.subcategory)
  ])].slice(0, 30);
  const vocab = signals.specVocabulary(products, vocabIds, specLabel);

  let market = { demand: [], prices: [], dates: [], ok: false };
  let drafted = null;
  const wantsAi = budget.newPyg >= MIN_ADSET_PYG || note;
  if (wantsAi) {
    market = await scanMarket({ candidates, queries: site.queries, families });
    if (claudeReady()) {
      try {
        const text = await askClaudeText(plannerPrompt({
          econ,
          budget,
          note,
          review,
          market,
          site,
          sales,
          families,
          vocab,
          candidates,
          productCount: products.length,
          retarget: { active: retargetActive, pyg: retargetPyg },
          sold,
          leaks,
          dead
        }), { maxTokens: 8000, temperature: 0.2 });
        drafted = parseJson(text);
        if (!drafted || !Array.isArray(drafted.campaigns)) {
          console.error('[planner claude] respuesta sin campañas', clip(text, 300));
          drafted = drafted && typeof drafted === 'object' ? { ...drafted, campaigns: [] } : null;
        }
      } catch (error) {
        console.error('[planner claude]', error.message || error);
      }
    }
  }

  let intent = fallbackIntent;
  if (note && drafted && drafted.noteFamilies) {
    const pick = (list) => [...new Map([].concat(list || [])
      .map((id) => signals.matchFamily(families, id))
      .filter(Boolean)
      .map((family) => [family.id, family])).values()];
    const wanted = pick(drafted.noteFamilies.wanted);
    const banned = pick(drafted.noteFamilies.banned);
    if (wanted.length || banned.length) intent = { ...fallbackIntent, wanted, banned };
  }

  const built = budget.newPyg >= MIN_ADSET_PYG
    ? buildCampaigns({
      drafted,
      families,
      products,
      econ,
      intent,
      budget,
      specLabel,
      retarget: { active: retargetActive, pyg: retargetPyg },
      note,
      rate
    })
    : { campaigns: [], changes: [] };
  const campaigns = [...scaled.proposals, ...built.campaigns];

  const paused = review.filter((row) => PAUSE_VERDICTS.has(row.verdict));
  const kept = review.filter((row) => ['ganadora', 'escalar', 'aprendiendo', 'en_prueba'].includes(row.verdict));
  const changes = [
    ...((guard && guard.paused) || []).map((name) => `Pausada por el tope de ${WEEKLY_USD} USD de la semana: ${name}.`),
    ...kept.map((row) => `Sigue: ${row.name}. ${row.reason}`),
    ...paused.map((row) => `Pausada: ${row.name}. ${row.reason}`),
    ...scaled.proposals.map((row) => `Para subir: ${row.name.replace(/^Subir /, '')}. ${row.filterLabel}`),
    ...built.changes
  ].map((line) => clip(line, 240)).slice(0, 10);

  let diagnosis = clip(drafted && drafted.diagnosis, 900);
  if (!diagnosis) {
    if (remainingPyg <= 0) {
      diagnosis = `Esta semana ya se usaron los ${WEEKLY_USD} USD. No se abre gasto nuevo hasta que el gasto de 7 días baje del tope.`;
    } else if (budget.newPyg < MIN_ADSET_PYG) {
      diagnosis = `El presupuesto de estos ${HORIZON_DAYS} días ya está en campañas que siguen. No hace falta una nueva.`;
    } else {
      const top = families.filter((family) => family.adsOk >= 3).slice(0, 3).map((family) => family.short).join(', ');
      diagnosis = `Claude no respondió y el plan salió de las reglas. Se paga solo lo que deja más de ${moneyGs(econ.minProfit)} por venta. Las familias con más demanda y ganancia hoy son ${top || 'pocas'}.`;
    }
  }

  const skip = (drafted && Array.isArray(drafted.skip) ? drafted.skip : [])
    .map((row) => {
      const family = signals.matchFamily(families, row && row.family);
      if (!family) return null;
      return { family: family.id, label: family.short, profitMid: family.profitMid, why: clip(row.why, 200) };
    })
    .filter(Boolean)
    .slice(0, 8);

  const saved = await AdPlan.create({
    planDate: todayKey(),
    weekBudgetUsd: WEEKLY_USD,
    spentUsd: usd(week.spendPyg, rate),
    remainingUsd: usd(remainingPyg, rate),
    dailyTotalUsd: usd(horizonDailyPyg, rate),
    exchangeRate: rate,
    diagnosis,
    changes,
    campaigns,
    trends: market.demand,
    meta: {
      connected: ready,
      week,
      pixel,
      catalog,
      sales: { count7: sales.count7, total7: sales.total7, count60: sales.count60, avgTicket: sales.avgTicket }
    },
    catalog: {
      productCount: products.length,
      families: families.length,
      adsOk: products.filter((product) => product.adsOk).length
    },
    engines: { gemini: market.ok, claude: Boolean(drafted) },
    note,
    horizonDays: HORIZON_DAYS,
    economics: econ,
    review,
    budget,
    market,
    skip,
    watch: (drafted && Array.isArray(drafted.watch) ? drafted.watch : []).map((line) => clip(line, 200)).slice(0, 4),
    intent: { wanted: intent.wanted.map((family) => family.id), banned: intent.banned.map((family) => family.id) }
  });
  liveMemo = { at: 0, rows: [] };
  return saved.toObject();
}

async function liveReview(plan) {
  if (!metaAds.metaReady() || !plan || !plan.economics) return [];
  if (Date.now() - liveMemo.at < 60 * 1000) return liveMemo.rows;
  const rows = await reviewRunning(plan.economics, { apply: false }).catch(() => []);
  liveMemo = { at: Date.now(), rows };
  return rows;
}

function slotOf(plan, campaign, index, latestId) {
  const isLatest = String(plan._id) === latestId;
  const budgetPyg = Number(campaign.dailyBudgetPyg)
    || Math.round((Number(campaign.dailyBudgetUsd) || 0) * (Number(plan.exchangeRate) || 7300));
  return {
    id: `${plan.planDate}-${index}`,
    planDate: plan.planDate,
    index,
    type: campaign.type || 'prospeccion',
    name: campaign.name,
    verdict: campaign.pausedReason ? `Pausada: ${campaign.pausedReason}` : (campaign.metaAdId ? 'Publicada en Meta' : campaign.verdict || ''),
    action: campaign.action,
    filterLabel: campaign.filterLabel || campaign.productSet || '',
    dailyBudgetPyg: budgetPyg,
    dailyBudgetGs: moneyGs(budgetPyg),
    dailyBudgetUsd: campaign.dailyBudgetUsd,
    priceFrom: campaign.priceFrom || '',
    priceTo: campaign.priceTo || '',
    setSize: campaign.setSize || (campaign.codigos || []).length || 0,
    avgProfit: campaign.avgProfit || 0,
    maxCpa: campaign.maxCpa || 0,
    breakEvenRoas: campaign.breakEvenRoas || 0,
    killAtPyg: campaign.killAtPyg || 0,
    warn: campaign.warn || '',
    products: (campaign.products || campaign.examples || []).slice(0, 6),
    image: campaign.image || '',
    headline: campaign.headline,
    text: campaign.text,
    why: campaign.why,
    expected: campaign.expected || '',
    published: Boolean(campaign.metaAdId) || (campaign.type === 'escalar' && Boolean(campaign.appliedAt)),
    paused: Boolean(campaign.pausedAt),
    canAuthorize: isLatest
      && !campaign.metaAdId
      && !campaign.appliedAt
      && !campaign.pausedAt
      && budgetPyg >= MIN_ADSET_PYG
      && campaign.action !== 'esperar'
  };
}

async function plannerCalendar({ from, days = 42 } = {}) {
  const start = /^\d{4}-\d{2}-\d{2}$/.test(String(from || '')) ? String(from) : todayKey();
  const count = clamp(Number(days) || 42, 7, 42);
  const end = shiftKey(start, count);
  const lookback = shiftKey(start, -HORIZON_DAYS);
  const [plans, salesRows, latest] = await Promise.all([
    AdPlan.find({ planDate: { $gte: lookback, $lt: end } }).sort({ createdAt: -1 }).lean(),
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
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate', timezone: 'America/Asuncion' } },
          count: { $sum: 1 },
          total: { $sum: '$totalAmountPYG' }
        }
      }
    ]),
    AdPlan.findOne().sort({ createdAt: -1 }).lean()
  ]);
  const latestId = latest ? String(latest._id) : '';
  const byDate = new Map();
  plans.forEach((plan) => {
    if (!byDate.has(plan.planDate)) byDate.set(plan.planDate, plan);
  });
  const salesByDate = new Map(salesRows.map((row) => [row._id, row]));
  const running = await liveReview(latest);
  const today = todayKey();
  const list = [];
  for (let index = 0; index < count; index += 1) {
    const date = shiftKey(start, index);
    let plan = byDate.get(date);
    if (!plan) {
      for (let back = 1; back < HORIZON_DAYS; back += 1) {
        const previous = byDate.get(shiftKey(date, -back));
        if (previous && (previous.horizonDays || HORIZON_DAYS) > back) {
          plan = previous;
          break;
        }
      }
    }
    const sold = salesByDate.get(date);
    list.push({
      date,
      planDate: plan ? plan.planDate : '',
      isLatest: plan ? String(plan._id) === latestId : false,
      diagnosis: plan ? plan.diagnosis : '',
      changes: plan ? plan.changes || [] : [],
      note: plan ? plan.note || '' : '',
      salesCount: sold ? sold.count : 0,
      salesGs: sold ? moneyGs(sold.total) : '',
      live: date === today ? running.filter((row) => row.status === 'ACTIVE').map((row) => row.name) : [],
      slots: ((plan && plan.campaigns) || []).map((campaign, slotIndex) => slotOf(plan, campaign, slotIndex, latestId))
    });
  }
  const week = (latest && latest.meta && latest.meta.week) || {};
  const storeSales = (latest && latest.meta && latest.meta.sales) || {};
  const rate = Number(latest && latest.exchangeRate) || 7300;
  return {
    days: list,
    running,
    live: {
      spentUsd: latest ? Number(latest.spentUsd) || 0 : usd(week.spendPyg || 0, rate),
      remainingUsd: latest ? Number(latest.remainingUsd) || 0 : 0,
      dailyTotalUsd: latest ? Number(latest.dailyTotalUsd) || 0 : 0,
      clicks: week.clicks || 0,
      impressions: week.impressions || 0,
      purchases: week.purchases || 0,
      contacts: week.contacts || 0,
      sales: { count: storeSales.count7 || 0, totalPyg: storeSales.total7 || 0 },
      activeAds: running.filter((row) => row.status === 'ACTIVE').map((row) => ({
        name: row.name,
        spendUsd: usd(row.spendPyg, rate),
        clicks: row.clicks,
        purchases: row.purchases,
        contacts: row.contacts,
        verdict: row.label,
        reason: row.reason
      }))
    },
    latest: latest
      ? {
        id: latestId,
        planDate: latest.planDate,
        createdAt: latest.createdAt,
        diagnosis: latest.diagnosis,
        changes: latest.changes || [],
        note: latest.note || '',
        economics: latest.economics || null,
        budget: latest.budget || null,
        skip: latest.skip || [],
        watch: latest.watch || [],
        market: latest.market || { demand: latest.trends || [], prices: [], dates: [] },
        engines: latest.engines || {},
        week: (latest.meta && latest.meta.week) || null,
        pixel: (latest.meta && latest.meta.pixel) || null,
        sales: (latest.meta && latest.meta.sales) || null,
        catalog: latest.catalog || null
      }
      : null,
    nextReview: latest ? shiftKey(latest.planDate, latest.horizonDays || HORIZON_DAYS) : today,
    capi: capiStatus(),
    weekBudgetUsd: WEEKLY_USD,
    minAdsetPyg: MIN_ADSET_PYG
  };
}

async function latestAdPlans(limit = 12) {
  return AdPlan.find().sort({ createdAt: -1 }).limit(limit).lean();
}

function resetLiveReview() {
  liveMemo = { at: 0, rows: [] };
}

module.exports = {
  composeAdPlan,
  latestAdPlans,
  plannerCalendar,
  resetLiveReview,
  MIN_ADSET_PYG,
  WEEKLY_USD
};
