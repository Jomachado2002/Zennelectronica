'use strict';

const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema(
  {
    productIds: { type: [String], default: [] },
    titles: { type: [String], default: [] },
    kind: { type: String, enum: ['feed', 'story'], default: 'feed' },
    caption: { type: String, default: '' },
    theme: { type: String, default: '' },
    scene: { type: String, default: '' },
    showPrice: { type: Boolean, default: true },
    overrides: { type: mongoose.Schema.Types.Mixed, default: undefined },
    status: {
      type: String,
      enum: ['scheduled', 'publishing', 'published', 'failed', 'cancelled'],
      default: 'scheduled'
    },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    igMediaId: { type: String, default: '' },
    fbPostId: { type: String, default: '' },
    error: { type: String, default: '' }
  },
  { timestamps: true, collection: 'socialposts' }
);

socialPostSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('SocialPost', socialPostSchema);
