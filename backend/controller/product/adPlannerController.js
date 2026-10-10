'use strict';

const { composeAdPlan, plannerCalendar } = require('../../services/adPlanner');
const { authorizeCampaign } = require('../../services/adPublisher');

function money(value) {
  return `Gs. ${Math.round(Number(value) || 0).toLocaleString('es-PY')}`;
}

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
    const note = String(req.body?.note || '').trim();
    await composeAdPlan({ note, force: true });
    const data = await plannerCalendar({ from: req.query.from, days: req.query.days || 42 });
    res.json({
      success: true,
      message: note ? 'Listo: el plan se rearmó con tu pedido.' : 'Listo: plan nuevo para los próximos 3 días.',
      ...data
    });
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
    let message = 'La campaña quedó publicada en Meta.';
    if (result.already) message = 'Esa campaña ya está en Meta.';
    else if (result.type === 'escalar') message = `Listo: el presupuesto quedó en ${money(result.dailyBudgetPyg)} por día.`;
    else message = `Publicada en Meta con ${money(result.dailyBudgetPyg)} por día. Empieza a gastar hoy.`;
    res.json({ success: true, message, ...data });
  } catch (error) {
    console.error('[planner autorizar]', error.message || error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'No pude publicar la campaña.' });
  }
}

module.exports = { getAdPlanner, buildAdPlanner, authorizeAdCampaign };
