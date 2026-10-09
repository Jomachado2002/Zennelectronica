'use strict';

const mongoose = require('mongoose');

const adPlanSchema = new mongoose.Schema(
  {
    planDate: { type: String, required: true, index: true },
    weekBudgetUsd: { type: Number, default: 50 },
    spentUsd: { type: Number, default: 0 },
    remainingUsd: { type: Number, default: 50 },
    dailyTotalUsd: { type: Number, default: 0 },
    exchangeRate: { type: Number, default: 0 },
    diagnosis: { type: String, default: '' },
    changes: { type: [String], default: [] },
    campaigns: { type: [mongoose.Schema.Types.Mixed], default: [] },
    trends: { type: [mongoose.Schema.Types.Mixed], default: [] },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    catalog: { type: mongoose.Schema.Types.Mixed, default: {} },
    engines: { type: mongoose.Schema.Types.Mixed, default: {} },
    note: { type: String, default: '' },
    horizonDays: { type: Number, default: 3 }
  },
  { timestamps: true, collection: 'adplans' }
);

module.exports = mongoose.model('AdPlan', adPlanSchema);
