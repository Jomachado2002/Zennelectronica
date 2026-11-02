'use strict';

const {
  composeCampaign,
  listCampaigns,
  listThemes,
  gatherSignals
} = require('../../services/campaignPlanner');

const themes = async (req, res) => {
  try {
    return res.json({ success: true, themes: await listThemes() });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudieron leer los temas' });
  }
};

const signals = async (req, res) => {
  try {
    return res.json({ success: true, ...(await gatherSignals()) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudieron leer las señales' });
  }
};

const list = async (req, res) => {
  try {
    const campaigns = await listCampaigns({ limit: req.query.limit });
    return res.json({ success: true, campaigns });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'No se pudieron listar las campañas' });
  }
};

const compose = async (req, res) => {
  try {
    req.setTimeout(5 * 60 * 1000);
    res.setTimeout(5 * 60 * 1000);
    const campaign = await composeCampaign({
      note: req.body && req.body.note,
      themeId: req.body && req.body.themeId
    });
    return res.json({
      success: true,
      message: `Campaña lista: ${campaign.title}`,
      campaign
    });
  } catch (error) {
    console.error('[campaign]', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'No se pudo armar la campaña'
    });
  }
};

module.exports = { themes, signals, list, compose };
