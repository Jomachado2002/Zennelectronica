'use strict';

const mongoose = require('mongoose');

const captionVoiceSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['hook', 'subcategory', 'brand', 'closer'],
      required: true
    },
    key: { type: String, required: true, trim: true },
    label: { type: String, default: '', trim: true },
    emoji: { type: String, default: '' },
    lines: { type: [String], default: [] },
    hashtags: { type: [String], default: [] },
    active: { type: Boolean, default: true }
  },
  { timestamps: true, collection: 'captionvoices' }
);

captionVoiceSchema.index({ kind: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('CaptionVoice', captionVoiceSchema);
