'use strict';

const mongoose = require('mongoose');

const categorySeoSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    subcategory: { type: String, default: '' },
    label: { type: String, default: '' },
    seoTitle: { type: String, default: '' },
    intro: { type: String, default: '' },
    productCount: { type: Number, default: 0 },
    minPrice: { type: Number, default: 0 },
    maxPrice: { type: Number, default: 0 },
    updatedOn: { type: String, default: '' }
  },
  { timestamps: true }
);

categorySeoSchema.index({ category: 1, subcategory: 1 }, { unique: true });

module.exports = mongoose.model('categorySeo', categorySeoSchema);
