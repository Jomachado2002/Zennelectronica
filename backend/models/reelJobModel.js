'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');

const TRIAL_TAG = 'zenn-reels-dev';

const reelJobSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    trialTag: { type: String, required: true, enum: [TRIAL_TAG], index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
    codigo: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['queued', 'rendering', 'ready_for_review', 'failed'],
      required: true
    },
    error: { type: String, default: '' },
    bytes: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    fileName: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }
  },
  { timestamps: true, collection: 'reeljobs' }
);

reelJobSchema.index({ trialTag: 1, createdAt: -1 });

module.exports = mongoose.model('reelJob', reelJobSchema);
module.exports.TRIAL_TAG = TRIAL_TAG;
