'use strict';

const mongoose = require('mongoose');

const DEFAULT_DISCOUNT_BRANDS = ['redragon', 'kolke', 'xiaomi', 'msi', 'macrovip'];

const tnSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'tienda-naranja', unique: true },
    discountBrands: {
      type: [String],
      default: () => [...DEFAULT_DISCOUNT_BRANDS]
    },
    lastPriceStockSyncAt: { type: Date, default: null },
    lastPriceStockSync: {
      ok: { type: Number, default: 0 },
      fail: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      scanned: { type: Number, default: 0 },
      message: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TnSettings', tnSettingsSchema);
module.exports.DEFAULT_DISCOUNT_BRANDS = DEFAULT_DISCOUNT_BRANDS;
