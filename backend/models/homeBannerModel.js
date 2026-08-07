'use strict';

const mongoose = require('mongoose');

const homeBannerSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', trim: true, maxlength: 120 },
    alt: { type: String, default: 'Banner Zenn', trim: true, maxlength: 160 },
    imageDesktop: { type: String, default: '', trim: true },
    imageMobile: { type: String, default: '', trim: true },
    /** Dimensiones reales del archivo optimizado (para aspect-ratio en el home) */
    desktopWidth: { type: Number, default: null },
    desktopHeight: { type: Number, default: null },
    mobileWidth: { type: Number, default: null },
    mobileHeight: { type: Number, default: null },
    href: { type: String, default: '', trim: true, maxlength: 500 },
    order: { type: Number, default: 100 },
    enabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

homeBannerSchema.index({ enabled: 1, order: 1 });

module.exports = mongoose.model('HomeBanner', homeBannerSchema);
