'use strict';

const Product = require('../models/productModel');
const AdPlan = require('../models/adPlanModel');

function graphBase() {
  const token = process.env.META_MARKETING_ACCESS_TOKEN || '';
  const version = process.env.META_API_VERSION || 'v21.0';
  const act = process.env.META_AD_ACCOUNT_ID || '';
  if (!token || !act) {
    const error = new Error('La cuenta de anuncios no está conectada.');
    error.status = 400;
    throw error;
  }
  return { token, version, act };
}

async function graph(path, body, method = 'POST') {
  const { token, version } = graphBase();
  const res = await fetch(`https://graph.facebook.com/${version}/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data?.error?.error_user_msg || data?.error?.message || 'Meta no aceptó el anuncio.');
    error.status = 400;
    throw error;
  }
  return data;
}

async function uploadImage(imageUrl) {
  const { act } = graphBase();
  const file = await fetch(imageUrl);
  if (!file.ok) throw new Error('No pude leer la imagen del catálogo.');
  const bytes = Buffer.from(await file.arrayBuffer()).toString('base64');
  const data = await graph(`${act}/adimages`, { bytes });
  const image = data.images && (data.images.bytes || Object.values(data.images)[0]);
  if (!image || !image.hash) throw new Error('Meta no guardó la imagen.');
  return image.hash;
}

async function authorizeCampaign({ date, slot }) {
  const planDate = String(date || '');
  const index = Number(slot);
  const plan = await AdPlan.findOne({ planDate }).sort({ createdAt: -1 });
  if (!plan) {
    const error = new Error('Ese día no tiene un plan.');
    error.status = 404;
    throw error;
  }
  const campaign = (plan.campaigns || [])[index];
  if (!campaign) {
    const error = new Error('No encontré esa campaña.');
    error.status = 404;
    throw error;
  }
  if (campaign.metaAdId) {
    return { already: true, campaignId: campaign.metaCampaignId };
  }
  if (campaign.action === 'esperar' || !(Number(campaign.dailyBudgetUsd) > 0)) {
    const error = new Error('Hoy esa campaña no tiene presupuesto. No la publico.');
    error.status = 400;
    throw error;
  }

  const hero = (campaign.examples || [])[0] || {};
  const product = hero.codigo
    ? await Product.findOne({ codigo: String(hero.codigo) }).select('codigo slug catalogPlateUrl productImage productName').lean()
    : null;
  const imageUrl = (product && product.catalogPlateUrl) || hero.image || ((product && product.productImage) || [])[0];
  if (!imageUrl) {
    const error = new Error('Esa campaña no tiene imagen lista.');
    error.status = 400;
    throw error;
  }
  const slug = product && product.slug;
  const link = slug ? `https://www.zenn.com.py/producto/${slug}` : 'https://www.zenn.com.py';
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const pixelId = process.env.META_PIXEL_ID;
  if (!pageId || !pixelId) {
    const error = new Error('Falta la página o el pixel para publicar.');
    error.status = 400;
    throw error;
  }

  const rate = Number(plan.exchangeRate) > 0 ? Number(plan.exchangeRate) : 7300;
  const dailyBudget = String(Math.max(5899, Math.round(Number(campaign.dailyBudgetUsd) * rate)));
  const { act } = graphBase();
  const stamp = planDate.replace(/-/g, '');
  let campaignId = '';

  try {
    const created = await graph(`${act}/campaigns`, {
      name: `Zenn ${stamp} ${campaign.name}`.slice(0, 120),
      objective: 'OUTCOME_SALES',
      status: 'PAUSED',
      special_ad_categories: [],
      is_adset_budget_sharing_enabled: false
    });
    campaignId = created.id;
    const imageHash = await uploadImage(imageUrl);
    const adset = await graph(`${act}/adsets`, {
      name: campaign.name,
      campaign_id: campaignId,
      daily_budget: dailyBudget,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      destination_type: 'WEBSITE',
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'PURCHASE'
      },
      targeting: {
        geo_locations: { countries: ['PY'] },
        age_min: 18,
        age_max: 65,
        targeting_automation: { advantage_audience: 1 }
      },
      status: 'PAUSED'
    });
    const creative = await graph(`${act}/adcreatives`, {
      name: campaign.name,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          image_hash: imageHash,
          link,
          message: campaign.text || campaign.why,
          name: campaign.headline || campaign.name,
          call_to_action: { type: 'SHOP_NOW', value: { link } }
        }
      }
    });
    const ad = await graph(`${act}/ads`, {
      name: campaign.name,
      adset_id: adset.id,
      creative: { creative_id: creative.id },
      status: 'ACTIVE'
    });
    await graph(`${campaignId}`, { status: 'ACTIVE' });
    await graph(`${adset.id}`, { status: 'ACTIVE' });

    campaign.metaCampaignId = campaignId;
    campaign.metaAdsetId = adset.id;
    campaign.metaAdId = ad.id;
    campaign.image = imageUrl;
    campaign.action = 'mantener';
    plan.markModified('campaigns');
    await plan.save();
    return { already: false, campaignId, adId: ad.id };
  } catch (error) {
    if (campaignId) {
      const { token, version } = graphBase();
      await fetch(`https://graph.facebook.com/${version}/${campaignId}?access_token=${encodeURIComponent(token)}`, { method: 'DELETE' }).catch(() => {});
    }
    throw error;
  }
}

module.exports = { authorizeCampaign };
