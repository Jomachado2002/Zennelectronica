'use strict';

const mongoose = require('mongoose');

const seoDailyReviewSchema = new mongoose.Schema(
  {
    day: { type: String, required: true, unique: true },
    status: { type: String, enum: ['running', 'done', 'error'], default: 'running' },
    trigger: { type: String, default: 'daily' },
    afterSync: { type: Boolean, default: false },
    search: { type: mongoose.Schema.Types.Mixed, default: null },
    applied: { type: [mongoose.Schema.Types.Mixed], default: [] },
    codePrompts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    note: { type: String, default: '' },
    stockRetired: { type: Number, default: 0 },
    hubs: { type: [mongoose.Schema.Types.Mixed], default: [] },
    error: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('seoDailyReview', seoDailyReviewSchema);
