'use strict';

const AdPlan = require('../models/adPlanModel');
const metaAds = require('./metaAds');
const { MIN_ADSET_PYG, WEEKLY_USD, resetLiveReview } = require('./adPlanner');

const RETENTION_SECONDS = 14 * 24 * 60 * 60;
const CATALOG_PERMISSION = 'Meta no deja que Zenn Marketings arme grupos en el catálogo. En business.facebook.com: Configuración del negocio → Usuarios del sistema → Zenn Marketings → Asignar activos → Catálogos → Catálogo_Productos, con control total. Después autorizá de nuevo.';

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function targetingFor(type, setId) {
  const base = { geo_locations: { countries: ['PY'] }, age_min: 18, age_max: 65 };
  if (type !== 'retargeting') return { ...base, targeting_automation: { advantage_audience: 1 } };
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

async function productSetFor(catalogId, campaign, name) {
  if (campaign.type === 'retargeting') {
    const setId = await metaAds.wholeCatalogSet(catalogId);
    if (!setId) throw fail('El catálogo no tiene el grupo con todos los productos.');
    return { setId, own: false };
  }
  const codigos = (campaign.codigos || []).slice(0, 60).map(String);
  if (!codigos.length) throw fail('Esa campaña no tiene productos.');
  try {
    const set = await metaAds.metaPost(`${catalogId}/product_sets`, {
      name,
      filter: JSON.stringify({ retailer_id: { is_any: codigos } })
    });
    return { setId: set.id, own: true };
  } catch (error) {
    if (error.metaCode === 200 || /permission/i.test(error.message)) throw fail(CATALOG_PERMISSION);
    throw error;
  }
}

async function publishNew(plan, campaign) {
  const { act, page, pixel } = metaAds.metaConfig();
  if (!page) throw fail('Falta FACEBOOK_PAGE_ID para publicar.');
  if (!pixel) throw fail('Falta META_PIXEL_ID para publicar.');
  const rate = Number(plan.exchangeRate) > 0 ? Number(plan.exchangeRate) : 7300;
  await underWeeklyCap(rate);
  const catalog = await metaAds.liveCatalog();
  if (!catalog || !catalog.id) throw fail('No encuentro el catálogo de Meta que lee https://www.zenn.com.py/api/meta/catalog.xml.');
  const dailyBudget = Math.max(
    MIN_ADSET_PYG,
    Math.round(Number(campaign.dailyBudgetPyg) || (Number(campaign.dailyBudgetUsd) || 0) * rate)
  );
  const name = `Zenn ${plan.planDate.replace(/-/g, '')} ${campaign.name}`.slice(0, 110);
  let setId = '';
  let ownSet = false;
  let campaignId = '';
  try {
    const set = await productSetFor(catalog.id, campaign, `${name} ${Date.now().toString(36)}`);
    setId = set.setId;
    ownSet = set.own;
    const created = await metaAds.metaPost(`${act}/campaigns`, {
      name,
      objective: 'OUTCOME_SALES',
      status: 'PAUSED',
      special_ad_categories: [],
      promoted_object: { product_catalog_id: catalog.id },
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
      promoted_object: { product_set_id: setId, custom_event_type: campaign.event || 'CONTACT' },
      targeting: targetingFor(campaign.type, setId),
      status: 'PAUSED'
    });
    const creative = await metaAds.metaPost(`${act}/adcreatives`, {
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
      catalogId: catalog.id,
      publishedAt: new Date(),
      dailyBudgetPyg: dailyBudget,
      action: 'mantener',
      verdict: 'Publicada: aprendiendo'
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
  const plan = await AdPlan.findOne({ planDate: String(date || '') }).sort({ createdAt: -1 });
  if (!plan) throw fail('Ese día no tiene un plan.', 404);
  const latest = await AdPlan.findOne().sort({ createdAt: -1 }).select('_id').lean();
  if (!latest || String(latest._id) !== String(plan._id)) {
    throw fail('Ese plan ya fue reemplazado por uno más nuevo. Autorizá desde el plan vigente.');
  }
  const campaign = (plan.campaigns || [])[Number(slot)];
  if (!campaign) throw fail('No encontré esa campaña.', 404);
  if (campaign.metaAdId || campaign.appliedAt) {
    return { already: true, campaignId: campaign.metaCampaignId, type: campaign.type };
  }
  if (campaign.pausedAt) throw fail('Esa campaña ya se pausó.');
  if (!(Number(campaign.dailyBudgetPyg) >= MIN_ADSET_PYG) && !(Number(campaign.dailyBudgetUsd) > 0)) {
    throw fail('Esa campaña no tiene presupuesto. No la publico.');
  }
  const result = campaign.type === 'escalar'
    ? await applyScale(plan, campaign)
    : await publishNew(plan, campaign);
  resetLiveReview();
  return { ...result, type: campaign.type, dailyBudgetPyg: campaign.dailyBudgetPyg };
}

module.exports = { authorizeCampaign };
