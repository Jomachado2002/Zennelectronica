'use strict';

const mongoose = require('mongoose');

/**
 * Asociación categoría/subcategoría Zenn → path de categoría Tienda Naranja
 * (formato Excel: "Padre;Hijo;Nieto").
 */
const tnCategoryMapSchema = new mongoose.Schema(
  {
    zennCategory: { type: String, required: true, trim: true, index: true },
    zennSubcategory: { type: String, default: '', trim: true, index: true },
    zennCategoryLabel: { type: String, default: '' },
    zennSubcategoryLabel: { type: String, default: '' },
    tnPath: { type: String, required: true, trim: true },
    tnCategoryIds: { type: [String], default: undefined },
    productCount: { type: Number, default: 0 },
    source: { type: String, default: 'manual' } // manual | seed | heuristic
  },
  { timestamps: true }
);

tnCategoryMapSchema.index(
  { zennCategory: 1, zennSubcategory: 1 },
  { unique: true }
);

module.exports = mongoose.model('TnCategoryMap', tnCategoryMapSchema);
