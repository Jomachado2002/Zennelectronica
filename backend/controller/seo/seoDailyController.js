'use strict';

const SeoDailyReview = require('../../models/seoDailyReviewModel');
const { runDailySeoReview } = require('../../services/seoDailyReview');

async function listSeoDailyController(req, res) {
  try {
    const days = await SeoDailyReview.find().sort({ day: -1 }).limit(14).lean();
    res.json({ success: true, data: days });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function runSeoDailyController(req, res) {
  try {
    const review = await runDailySeoReview({ trigger: 'manual', force: true });
    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  listSeoDailyController,
  runSeoDailyController
};
