'use strict';

const AdPlan = require('../models/adPlanModel');
const metaAds = require('./metaAds');
const { MIN_ADSET_PYG, WEEKLY_USD, resetLiveReview } = require('./adPlanner');

const RETENTION_SECONDS = 14 * 24 * 60 * 60;

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function fold(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function targetingFor(type, setId) {
  const base = { geo_locations: { countries: ['PY'] }, age_min: 18, age_max: 65 };
  if (type !== 'retargeting' || !setId) return { ...base, targeting_automation: { advantage_audience: 1 } };
  return {
    ...base,
    product_audience_specs: [{
      product_set_id: setId,
      inclusions: [
        { retention_seconds: RETENTION_SECONDS, rule: { event: { eq: 'ViewContent' } } },
        { retention_seconds: RETENTION_SECONDS, rule: { event: { eq: 'AddToCart' } } }
      ],
      exclusions: [{ retention_seconds: RETENTION_SECONDS, rule: { event: { eq: 'Purchase' } } }]
    }]
  };
}

function adMessage(campaign) {
  const text = String(campaign.text || campaign.why || campaign.name || '').trim();
  const headline = String(campaign.headline || '').trim();
  return headline && !text.toLowerCase().startsWith(headline.toLowerCase()) ? `${headline}\n${text}` : text;
}

function productLink(product) {
  return product && product.slug
    ? `https://www.zenn.com.py/producto/${product.slug}`
    : 'https://www.zenn.com.py';
}

async function underWeeklyCap(rate) {
  const week = await metaAds.accountInsights('last_7d').catch(() => null);
  if (week && week.spendPyg >= WEEKLY_USD * rate) {
    throw fail(`En los últimos 7 días ya se gastaron los ${WEEKLY_USD} USD de la semana. No publico gasto nuevo.`);
  }
}

async function applyScale(plan, campaign) {
  if (!campaign.metaAdsetId) throw fail('No encuentro el conjunto de esa campaña en Meta.');
  await metaAds.setAdsetBudget(campaign.metaAdsetId, campaign.dailyBudgetPyg);
  await AdPlan.updateMany(
    { 'campaigns.metaCampaignId': campaign.metaCampaignId },
    { $set: { 'campaigns.$[source].dailyBudgetPyg': campaign.dailyBudgetPyg } },
    { arrayFilters: [{ 'source.metaCampaignId': campaign.metaCampaignId, 'source.metaAdId': { $exists: true } }] }
  );
  campaign.appliedAt = new Date();
  campaign.action = 'mantener';
  campaign.verdict = 'Presupuesto subido en Meta';
  plan.markModified('campaigns');
  await plan.save();
  return { already: false, campaignId: campaign.metaCampaignId };
}

async function matchExistingSet(catalogId, campaign) {
  const list = await metaAds.metaGet(`${catalogId}/product_sets`, {
    fields: 'id,name,product_count,filter',
    limit: '80'
  }).catch(() => null);
  const rows = (list && list.data) || [];
  if (!rows.length) return '';
  const hay = fold(`${campaign.name} ${campaign.filterLabel || ''}`);
  const scored = rows
    .filter((row) => Number(row.product_count) > 0)
    .map((row) => {
      const name = fold(row.name);
      const hit = name.length > 3 && (hay.includes(name) || name.split(/[^a-z0-9]+/).some((word) => word.length > 4 && hay.includes(word)));
      return { id: row.id, hit, count: Number(row.product_count) || 0, all: !row.filter };
    })
    .sort((a, b) => Number(b.hit) - Number(a.hit) || b.count - a.count);
  const named = scored.find((row) => row.hit);
  if (named) return named.id;
  if (campaign.type === 'retargeting') {
    const all = scored.find((row) => row.all) || scored[0];
    return all ? all.id : '';
  }
  return '';
}

async function productSetFor(catalogId, campaign, name) {
  if (campaign.type === 'retargeting') {
    const setId = await metaAds.wholeCatalogSet(catalogId).catch(() => '');
    if (setId) return { setId, own: false };
  }
  const existing = await matchExistingSet(catalogId, campaign);
  if (existing && campaign.type === 'retargeting') return { setId: existing, own: false };
  const codigos = (campaign.codigos || []).slice(0, 60).map(String);
  if (!codigos.length && campaign.type !== 'retargeting') return { setId: '', own: false, images: true };
  try {
    const set = await metaAds.metaPost(`${catalogId}/product_sets`, {
      name,
      filter: JSON.stringify({ retailer_id: { is_any: codigos } })
    });
    return { setId: set.id, own: true };
  } catch (error) {
    if (error.metaCode === 200 || /permission|permiso|desarrollo/i.test(error.message || '')) {
      if (existing) return { setId: existing, own: false };
      return { setId: '', own: false, images: true };
    }
    throw error;
  }
}

async function uploadPlate(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('No pude bajar la foto del catálogo.');
  const buf = Buffer.from(await res.arrayBuffer());
  const { act, token, version } = metaAds.metaConfig();
  const uploaded = await fetch(`https://graph.facebook.com/${version}/${act}/adimages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bytes: buf.toString('base64'), access_token: token })
  });
  const data = await uploaded.json().catch(() => ({}));
  if (!uploaded.ok) {
    const error = new Error(data?.error?.error_user_msg || data?.error?.message || 'Meta no aceptó la imagen.');
    error.status = 400;
    throw error;
  }
  const images = data.images || {};
  const first = Object.values(images)[0];
  if (!first || !first.hash) throw fail('Meta no devolvió el hash de la imagen.');
  return first.hash;
}

async function creativeFromPlates(campaign, page) {
  const items = (campaign.products || []).filter((product) => product.plate).slice(0, 10);
  const hashes = [];
  for (const product of items) {
    try {
      hashes.push({ product, hash: await uploadPlate(product.plate) });
    } catch (error) {
      console.error('[publisher imagen]', product.codigo, error.message || error);
    }
  }
  if (!hashes.length) throw fail('No pude subir las fotos del catálogo para el anuncio.');
  if (hashes.length === 1) {
    const item = hashes[0];
    return metaAds.metaPost(`${metaAds.metaConfig().act}/adcreatives`, {
      name: campaign.name,
      object_story_spec: {
        page_id: page,
        link_data: {
          image_hash: item.hash,
          link: productLink(item.product),
          message: adMessage(campaign),
          name: campaign.headline || item.product.name,
          description: item.product.priceText || '',
          call_to_action: { type: 'SHOP_NOW' }
        }
      }
    });
  }
  return metaAds.metaPost(`${metaAds.metaConfig().act}/adcreatives`, {
    name: campaign.name,
    object_story_spec: {
      page_id: page,
      link_data: {
        link: 'https://www.zenn.com.py',
        message: adMessage(campaign),
        call_to_action: { type: 'SHOP_NOW' },
        child_attachments: hashes.map((item) => ({
          image_hash: item.hash,
          link: productLink(item.product),
          name: String(item.product.name || campaign.name).slice(0, 255),
          description: item.product.priceText || '',
          call_to_action: { type: 'SHOP_NOW' }
        }))
      }
    }
  });
}

async function publishNew(plan, campaign) {
  const { act, page, pixel } = metaAds.metaConfig();
  if (!page) throw fail('Falta FACEBOOK_PAGE_ID para publicar.');
  if (!pixel) throw fail('Falta META_PIXEL_ID para publicar.');
  const rate = Number(plan.exchangeRate) > 0 ? Number(plan.exchangeRate) : 7300;
  await underWeeklyCap(rate);
  const catalog = await metaAds.liveCatalog();
  const dailyBudget = Math.max(
    MIN_ADSET_PYG,
    Math.round(Number(campaign.dailyBudgetPyg) || (Number(campaign.dailyBudgetUsd) || 0) * rate)
  );
  const name = `Zenn ${plan.planDate.replace(/-/g, '')} ${campaign.name}`.slice(0, 110);
  let setId = '';
  let ownSet = false;
  let campaignId = '';
  let useImages = !catalog || !catalog.id;
  try {
    if (catalog && catalog.id) {
      const set = await productSetFor(catalog.id, campaign, `${name} ${Date.now().toString(36)}`);
      setId = set.setId;
      ownSet = set.own;
      useImages = Boolean(set.images) || !set.setId;
    }
    const created = await metaAds.metaPost(`${act}/campaigns`, {
      name,
      objective: 'OUTCOME_SALES',
      status: 'PAUSED',
      special_ad_categories: [],
      ...(useImages || !catalog ? {} : { promoted_object: { product_catalog_id: catalog.id } }),
      is_adset_budget_sharing_enabled: false
    });
    campaignId = created.id;
    const adset = await metaAds.metaPost(`${act}/adsets`, {
      name: campaign.name,
      campaign_id: campaignId,
      daily_budget: String(dailyBudget),
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      destination_type: 'WEBSITE',
      promoted_object: useImages
        ? { pixel_id: pixel, custom_event_type: campaign.event || 'CONTACT' }
        : { product_set_id: setId, custom_event_type: campaign.event || 'CONTACT' },
      targeting: targetingFor(campaign.type, useImages ? '' : setId),
      status: 'PAUSED'
    });
    const creative = useImages
      ? await creativeFromPlates(campaign, page)
      : await metaAds.metaPost(`${act}/adcreatives`, {
        name: campaign.name,
        product_set_id: setId,
        object_story_spec: {
          page_id: page,
          template_data: {
            message: adMessage(campaign),
            link: 'https://www.zenn.com.py',
            name: '{{product.name}}',
            description: '{{product.price}}',
            call_to_action: { type: 'SHOP_NOW' },
            multi_share_end_card: false
          }
        }
      });
    const ad = await metaAds.metaPost(`${act}/ads`, {
      name: campaign.name,
      adset_id: adset.id,
      creative: { creative_id: creative.id },
      status: 'ACTIVE'
    });
    await metaAds.metaPost(adset.id, { status: 'ACTIVE' });
    await metaAds.metaPost(campaignId, { status: 'ACTIVE' });
    Object.assign(campaign, {
      metaCampaignId: campaignId,
      metaAdsetId: adset.id,
      metaAdId: ad.id,
      metaCreativeId: creative.id,
      productSetId: setId,
      catalogId: catalog ? catalog.id : '',
      publishedAt: new Date(),
      dailyBudgetPyg: dailyBudget,
      action: 'mantener',
      verdict: useImages ? 'Publicada con fotos del catálogo' : 'Publicada: aprendiendo'
    });
    plan.markModified('campaigns');
    await plan.save();
    return { already: false, campaignId, adId: ad.id };
  } catch (error) {
    if (campaignId) await metaAds.metaDelete(campaignId);
    if (ownSet && setId) await metaAds.metaDelete(setId);
    throw error;
  }
}

async function authorizeCampaign({ date, slot }) {
  if (!metaAds.metaReady()) throw fail('La cuenta de anuncios no está conectada.');
  const latest = await AdPlan.findOne().sort({ createdAt: -1 });
  if (!latest) throw fail('No hay un plan para autorizar.', 404);
  const wanted = String(date || '');
  if (wanted && latest.planDate !== wanted) {
    const sameDay = await AdPlan.findOne({ planDate: wanted }).sort({ createdAt: -1 });
    if (!sameDay || String(sameDay._id) !== String(latest._id)) {
      throw fail('Autorizá desde el plan vigente de hoy. Ese día es una copia de un plan anterior.');
    }
  }
  const campaign = (latest.campaigns || [])[Number(slot)];
  if (!campaign) throw fail('No encontré esa campaña.', 404);
  if (campaign.metaAdId || campaign.appliedAt) {
    return { already: true, campaignId: campaign.metaCampaignId, type: campaign.type };
  }
  if (campaign.pausedAt) throw fail('Esa campaña ya se pausó.');
  if (!(Number(campaign.dailyBudgetPyg) >= MIN_ADSET_PYG) && !(Number(campaign.dailyBudgetUsd) > 0)) {
    throw fail('Esa campaña no tiene presupuesto. No la publico.');
  }
  const result = campaign.type === 'escalar'
    ? await applyScale(latest, campaign)
    : await publishNew(latest, campaign);
  resetLiveReview();
  return { ...result, type: campaign.type, dailyBudgetPyg: campaign.dailyBudgetPyg };
}

module.exports = { authorizeCampaign };
