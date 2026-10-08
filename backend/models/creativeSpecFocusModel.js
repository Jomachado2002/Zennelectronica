'use strict';

const mongoose = require('mongoose');

const specChoiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  rank: { type: Number, default: 100 }
}, { _id: false });

const creativeSpecFocusSchema = new mongoose.Schema({
  categoryValue: { type: String, required: true },
  categoryLabel: { type: String, default: '' },
  subcategoryValue: { type: String, required: true },
  subcategoryLabel: { type: String, default: '' },
  specs: { type: [specChoiceSchema], default: [] }
}, { timestamps: true });

creativeSpecFocusSchema.index({ categoryValue: 1, subcategoryValue: 1 }, { unique: true });

module.exports = mongoose.model('creativeSpecFocus', creativeSpecFocusSchema);
