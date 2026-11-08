'use strict';

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    codigo: { type: String, default: '' },
    name: { type: String, default: '' },
    brand: { type: String, default: '' },
    priceText: { type: String, default: '' }
  },
  { _id: false }
);

const aiImageSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    format: { type: String, enum: ['feed', 'story', 'square'], default: 'feed' },
    status: { type: String, enum: ['draft', 'saved'], default: 'draft' },
    messages: { type: [messageSchema], default: [] },
    products: { type: [productSchema], default: [] },
    html: { type: String, default: '' },
    jpeg: { type: Buffer },
    imageUrl: { type: String, default: '' },
    imageKey: { type: String, default: '' },
    lastNote: { type: String, default: '' },
    createdBy: { type: String, default: '' }
  },
  { timestamps: true, collection: 'aiimages' }
);

aiImageSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model('AiImage', aiImageSchema);
