'use strict';

const mongoose = require('mongoose');

const seoCatalogSyncRunSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, unique: true },
    trigger: { type: String, default: 'worker' },
    status: {
      type: String,
      enum: ['running', 'done', 'error', 'skipped'],
      default: 'running'
    },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    examined: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    unchanged: { type: Number, default: 0 },
    retired: { type: Number, default: 0 },
    indexable: { type: Number, default: 0 },
    writes: { type: Number, default: 0 },
    reads: { type: Number, default: 0 },
    brands: { type: Number, default: 0 },
    categories: { type: Number, default: 0 },
    subcategories: { type: Number, default: 0 },
    products: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    error: { type: String, default: '' },
    dryRun: { type: Boolean, default: false },
    checkpoint: { type: String, default: '' }
  },
  { timestamps: true }
);

seoCatalogSyncRunSchema.index({ status: 1, startedAt: -1 });

module.exports = mongoose.model('seoCatalogSyncRun', seoCatalogSyncRunSchema);
