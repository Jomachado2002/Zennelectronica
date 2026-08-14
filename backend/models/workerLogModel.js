const mongoose = require('mongoose');

const workerLogSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['queued', 'running', 'success', 'error', 'skipped', 'cancelled'],
      required: true,
    },
    trigger: { type: String, enum: ['manual', 'schedule', 'quick'], default: 'manual' },
    label: { type: String, default: '' },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null },
    summary: {
      productsCreated: { type: Number, default: 0 },
      productsUpdated: { type: Number, default: 0 },
      productsSkipped: { type: Number, default: 0 },
      productsErrors: { type: Number, default: 0 },
      stockCleanupCount: { type: Number, default: 0 },
      categoriesCount: { type: Number, default: 0 },
      subcategoriesCount: { type: Number, default: 0 },
    },
    taxonomy: { type: Array, default: [] },
    errorMessage: { type: String, default: null },
    events: [
      {
        at: { type: Date, default: Date.now },
        level: { type: String, default: 'info' },
        message: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

workerLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });
workerLogSchema.index({ startedAt: -1 });

module.exports = mongoose.model('WorkerLog', workerLogSchema);
