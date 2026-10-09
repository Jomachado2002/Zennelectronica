'use strict';

const { composeAdPlan, plannerCalendar } = require('../../services/adPlanner');

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
    await composeAdPlan({ note: req.body?.note });
    const data = await plannerCalendar({ from: req.query.from, days: req.query.days || 42 });
    res.json({ success: true, message: 'El día quedó armado.', ...data });
  } catch (error) {
    console.error('[planner]', error.message || error);
    res.status(500).json({ success: false, message: error.message || 'No pude armar el plan.' });
  }
}

module.exports = { getAdPlanner, buildAdPlanner };
