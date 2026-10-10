'use strict';

const FEED_PATH = '/api/meta/catalog.xml';

function metaConfig() {
  return {
    token: process.env.META_MARKETING_ACCESS_TOKEN || '',
    act: process.env.META_AD_ACCOUNT_ID || '',
    pixel: process.env.META_PIXEL_ID || '',
    page: process.env.FACEBOOK_PAGE_ID || '',
    instagram: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.FACEBOOK_INSTAGRAM_ID || '',
    business: process.env.FACEBOOK_BUSINESS_ID || '',
    version: process.env.META_API_VERSION || 'v21.0'
  };
}

let instagramMemo = { at: 0, id: '' };

async function instagramActor() {
  if (instagramMemo.id && Date.now() - instagramMemo.at < 6 * 60 * 60 * 1000) return instagramMemo.id;
  const { instagram, business, page } = metaConfig();
  if (instagram) {
    instagramMemo = { at: Date.now(), id: instagram };
    return instagram;
  }
  if (business) {
    const list = await metaGet(`${business}/owned_instagram_accounts`, { fields: 'id,username' }).catch(() => null);
    const hit = (list?.data || []).find((row) => String(row.username || '').toLowerCase() === 'zennelectronicos')
      || (list?.data || [])[0];
    if (hit && hit.id) {
      instagramMemo = { at: Date.now(), id: String(hit.id) };
      return instagramMemo.id;
    }
  }
  const pageTok = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
  if (page && pageTok) {
    const q = new URLSearchParams({
      fields: 'instagram_business_account',
      access_token: pageTok
    });
    const data = await fetch(`https://graph.facebook.com/${metaConfig().version}/${page}?${q}`).then((res) => res.json()).catch(() => ({}));
    const id = data?.instagram_business_account?.id;
    if (id) {
      instagramMemo = { at: Date.now(), id: String(id) };
      return instagramMemo.id;
    }
  }
  return '';
}

function metaReady() {
  const { token, act } = metaConfig();
  return Boolean(token && act);
}

function metaError(data, fallback) {
  const raw = data?.error?.error_user_msg || data?.error?.message || fallback;
  const message = /modo de desarrollo|development mode/i.test(raw)
    ? 'Meta rechazó el anuncio porque la app Zenn Electronicos sigue en modo desarrollo. En developers.facebook.com, en Publicar, pasala a pública.'
    : /instagram o una página|represente a tu negocio en Instagram|Instagram account or a Facebook Page/i.test(raw)
      ? 'Meta pide @zennelectronicos en el anuncio. En Business Manager asigná esa Instagram a Zenn Marketings (acceso total) y, en la página Zenn Electrónicos, conectala en Configuración → Instagram. Después autorizá de nuevo.'
      : raw;
  const error = new Error(message);
  error.status = 400;
  error.metaCode = data?.error?.code;
  return error;
}

async function metaGet(path, params = {}) {
  const { token, version } = metaConfig();
  const query = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`https://graph.facebook.com/${version}/${path}?${query.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw metaError(data, 'Meta no respondió.');
  return data;
}

async function metaPost(path, body) {
  const { token, version } = metaConfig();
  const res = await fetch(`https://graph.facebook.com/${version}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw metaError(data, 'Meta no aceptó el cambio.');
  return data;
}

async function metaDelete(id) {
  if (!id) return;
  const { token, version } = metaConfig();
  await fetch(`https://graph.facebook.com/${version}/${id}?access_token=${encodeURIComponent(token)}`, { method: 'DELETE' })
    .catch(() => {});
}

let catalogMemo = { at: 0, value: null };

async function liveCatalog() {
  if (catalogMemo.value && Date.now() - catalogMemo.at < 6 * 60 * 60 * 1000) return catalogMemo.value;
  const { business, act } = metaConfig();
  let owner = business;
  if (!owner) {
    const account = await metaGet(act, { fields: 'business' }).catch(() => null);
    owner = account?.business?.id || '';
  }
  let value = null;
  if (owner) {
    const list = await metaGet(`${owner}/owned_product_catalogs`, {
      fields: 'id,name,product_count,product_feeds{schedule}',
      limit: '25'
    }).catch(() => null);
    const hit = (list?.data || []).find((row) => (row.product_feeds?.data || [])
      .some((feed) => String(feed.schedule?.url || '').includes(FEED_PATH)));
    if (hit) value = { id: hit.id, name: hit.name || '', products: Number(hit.product_count) || 0 };
  }
  if (!value && process.env.META_CATALOG_ID) {
    value = { id: process.env.META_CATALOG_ID, name: '', products: 0 };
  }
  catalogMemo = { at: Date.now(), value };
  return value;
}

async function wholeCatalogSet(catalogId) {
  const list = await metaGet(`${catalogId}/product_sets`, { fields: 'id,name,product_count,filter', limit: '50' });
  const rows = list.data || [];
  const all = rows.find((row) => !row.filter)
    || rows.slice().sort((a, b) => (b.product_count || 0) - (a.product_count || 0))[0];
  return all ? all.id : '';
}

const ACTIONS = {
  purchases: ['offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'purchase'],
  contacts: [
    'contact_total',
    'contact_website',
    'offsite_conversion.fb_pixel_contact',
    'omni_contact',
    'onsite_conversion.messaging_conversation_started_7d'
  ],
  carts: ['offsite_conversion.fb_pixel_add_to_cart', 'omni_add_to_cart', 'add_to_cart'],
  landings: ['landing_page_view', 'omni_landing_page_view']
};

function largest(list, names) {
  return (list || []).reduce((best, row) => (
    names.includes(row.action_type) ? Math.max(best, Number(row.value) || 0) : best
  ), 0);
}

function readInsight(row = {}) {
  return {
    spendPyg: Math.round(Number(row.spend) || 0),
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.inline_link_clicks || row.clicks) || 0,
    ctr: Math.round((Number(row.inline_link_click_ctr || row.ctr) || 0) * 100) / 100,
    purchases: largest(row.actions, ACTIONS.purchases),
    purchaseValue: Math.round(largest(row.action_values, ACTIONS.purchases)),
    contacts: largest(row.actions, ACTIONS.contacts),
    carts: largest(row.actions, ACTIONS.carts),
    landings: largest(row.actions, ACTIONS.landings)
  };
}

const INSIGHT_FIELDS = 'spend,impressions,inline_link_clicks,inline_link_click_ctr,actions,action_values';

async function accountInsights(datePreset) {
  const { act } = metaConfig();
  const data = await metaGet(`${act}/insights`, { date_preset: datePreset, fields: INSIGHT_FIELDS });
  return readInsight((data.data || [])[0]);
}

async function campaignInsights(ids, datePreset = 'maximum') {
  const list = [...new Set((ids || []).filter(Boolean).map(String))];
  if (!list.length) return new Map();
  const { act } = metaConfig();
  const data = await metaGet(`${act}/insights`, {
    level: 'campaign',
    date_preset: datePreset,
    fields: `campaign_id,campaign_name,${INSIGHT_FIELDS}`,
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: list }]),
    limit: '100'
  });
  return new Map((data.data || []).map((row) => [String(row.campaign_id), readInsight(row)]));
}

async function campaignStates(ids) {
  const list = [...new Set((ids || []).filter(Boolean).map(String))];
  if (!list.length) return new Map();
  try {
    const data = await metaGet('', { ids: list.join(','), fields: 'effective_status,status' });
    return new Map(Object.entries(data || {}).map(([id, row]) => [id, row.effective_status || row.status || '']));
  } catch {
    const rows = await Promise.all(list.map((id) => metaGet(id, { fields: 'effective_status,status' })
      .then((row) => [id, row.effective_status || row.status || ''])
      .catch(() => [id, ''])));
    return new Map(rows);
  }
}

async function pixelEvents(days = 14) {
  const { pixel } = metaConfig();
  if (!pixel) return {};
  const start = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
  const data = await metaGet(`${pixel}/stats`, { aggregation: 'event', start_time: String(start) });
  const totals = {};
  (data.data || []).forEach((bucket) => (bucket.data || []).forEach((row) => {
    totals[row.value] = (totals[row.value] || 0) + (Number(row.count) || 0);
  }));
  return totals;
}

async function setCampaignStatus(id, status) {
  return metaPost(id, { status });
}

async function setAdsetBudget(id, dailyBudgetPyg) {
  return metaPost(id, { daily_budget: String(Math.round(dailyBudgetPyg)) });
}

module.exports = {
  metaConfig,
  metaReady,
  instagramActor,
  metaGet,
  metaPost,
  metaDelete,
  liveCatalog,
  wholeCatalogSet,
  readInsight,
  accountInsights,
  campaignInsights,
  campaignStates,
  pixelEvents,
  setCampaignStatus,
  setAdsetBudget
};
