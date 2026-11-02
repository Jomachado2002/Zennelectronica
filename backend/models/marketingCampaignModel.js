'use strict';

const mongoose = require('mongoose');

const productSlotSchema = new mongoose.Schema(
  {
    productId: { type: String, default: '' },
    codigo: { type: String, default: '' },
    name: { type: String, default: '' },
    shortName: { type: String, default: '' },
    brand: { type: String, default: '' },
    priceText: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    role: { type: String, default: 'producto' },
    stock: { type: Number, default: 0 }
  },
  { _id: false }
);

const marketingCampaignSchema = new mongoose.Schema(
  {
    key: { type: String, index: true },
    themeId: { type: String, default: '' },
    themeLabel: { type: String, default: '' },
    packId: { type: String, default: '' },
    packLabel: { type: String, default: '' },
    qtyHint: { type: String, default: '' },
    title: { type: String, default: '' },
    hook: { type: String, default: '' },
    brief: { type: String, default: '' },
    caption: { type: String, default: '' },
    cta: { type: String, default: 'Cotizá el tuyo por WhatsApp' },
    audience: { type: String, default: '' },
    why: { type: String, default: '' },
    signals: { type: mongoose.Schema.Types.Mixed, default: {} },
    products: { type: [productSlotSchema], default: [] },
    mediaUrl: { type: String, default: '' },
    artSource: { type: String, default: '' },
    artError: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'ready', 'published', 'archived'],
      default: 'draft'
    },
    note: { type: String, default: '' },
    planDate: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MarketingCampaign', marketingCampaignSchema);
