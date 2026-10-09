'use strict';

const { composeAdPlan, plannerCalendar } = require('../../services/adPlanner');
const { authorizeCampaign } = require('../../services/adPublisher');

async function getAdPlanner(req, res) {
  try {
    const data = await plannerCalendar({
      from: req.query.from,
      days: req.query.days
    });
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'No pude leer el planner.' });
  }
}

async function buildAdPlanner(req, res) {
  try {
    await composeAdPlan({ note: req.body?.note, force: true });
    const data = await plannerCalendar({ from: req.query.from, days: req.query.days || 42 });
    res.json({ success: true, message: 'El día quedó armado.', ...data });
  } catch (error) {
    console.error('[planner]', error.message || error);
    res.status(500).json({ success: false, message: error.message || 'No pude armar el plan.' });
  }
}

async function authorizeAdCampaign(req, res) {
  try {
    const result = await authorizeCampaign({
      date: req.body?.date,
      slot: req.body?.slot
    });
    const data = await plannerCalendar({ from: req.query.from, days: req.query.days || 42 });
    res.json({
      success: true,
      message: result.already ? 'Esa campaña ya está en Meta.' : 'La campaña quedó autorizada y ya puede gastar el presupuesto del día.',
      ...data
    });
  } catch (error) {
    console.error('[planner autorizar]', error.message || error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'No pude publicar la campaña.' });
  }
}

module.exports = { getAdPlanner, buildAdPlanner, authorizeAdCampaign };
