const mongoose = require('mongoose');

const workerLogLineSchema = new mongoose.Schema(
  {
    logId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerLog', required: true, index: true },
    at: { type: Date, default: Date.now, index: true },
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    message: { type: String, required: true, maxlength: 4000 },
  },
  { timestamps: false }
);

workerLogLineSchema.index({ at: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });
workerLogLineSchema.index({ logId: 1, at: 1, _id: 1 });

module.exports = mongoose.model('WorkerLogLine', workerLogLineSchema);
