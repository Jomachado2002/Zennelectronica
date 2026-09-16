'use strict';

const mongoose = require('mongoose');
const { normalizeBrandSlug, uniqueStrings, uniqueSlugs } = require('../helpers/brandSlug');

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    aliases: {
      type: [String],
      default: []
    },
    aliasSlugs: {
      type: [String],
      default: []
    },
    logoUrl: {
      type: String,
      default: ''
    },
    logoKey: {
      type: String,
      default: ''
    },
    logoWidth: {
      type: Number,
      default: null
    },
    logoHeight: {
      type: Number,
      default: null
    },
    productCount: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

brandSchema.index({ name: 1 });
brandSchema.index({ logoUrl: 1 });

brandSchema.pre('validate', function syncSlugs() {
  if (this.name) this.name = String(this.name).trim();
  if (!this.slug && this.name) this.slug = normalizeBrandSlug(this.name);
  const names = uniqueStrings([this.name, ...(this.aliases || [])]);
  this.aliases = names;
  this.aliasSlugs = uniqueSlugs(names);
});

module.exports = mongoose.model('Brand', brandSchema);
