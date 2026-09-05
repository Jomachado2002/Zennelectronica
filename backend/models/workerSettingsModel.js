const mongoose = require('mongoose');

const workerSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'vision-worker', unique: true },
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: 'America/Asuncion' },
    runHour: { type: Number, default: 3, min: 0, max: 23 },
    runMinute: { type: Number, default: 0, min: 0, max: 59 },
    intervalHours: { type: Number, default: 24, min: 1, max: 168 },
    profitMargin: { type: Number, default: 27, min: 0, max: 100 },
    deliveryCost: { type: Number, default: 30000, min: 0 },
    cleanupMissingStock: { type: Boolean, default: true },
    nextRunAt: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
    lastStatus: { type: String, default: null },
    runRequested: { type: Boolean, default: false },
    runQuick: { type: Boolean, default: false },
    pendingLogId: { type: mongoose.Schema.Types.ObjectId, default: null },
    cancelRequested: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkerSettings', workerSettingsSchema);
