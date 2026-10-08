'use strict';

const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema(
  {
    productIds: { type: [String], default: [] },
    titles: { type: [String], default: [] },
    kind: { type: String, enum: ['feed', 'story', 'reel', 'imagen', 'dato'], default: 'feed' },
    mediaUrls: { type: [String], default: [] },
    caption: { type: String, default: '' },
    creativeHtml: { type: String, default: '' },
    theme: { type: String, default: '' },
    scene: { type: String, default: '' },
    showPrice: { type: Boolean, default: true },
    overrides: { type: mongoose.Schema.Types.Mixed, default: undefined },
    origin: { type: String, enum: ['manual', 'community'], default: 'manual' },
    planDate: { type: String, default: '' },
    slot: { type: String, default: '' },
    headline: { type: String, default: '' },
    reason: { type: String, default: '' },
    brief: { type: String, default: '' },
    subcategory: { type: String, default: '' },
    subcategoryLabel: { type: String, default: '' },
    status: {
      type: String,
      enum: ['scheduled', 'publishing', 'published', 'failed', 'cancelled', 'idea', 'done'],
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
socialPostSchema.index({ planDate: 1, slot: 1 });

module.exports = mongoose.model('SocialPost', socialPostSchema);
