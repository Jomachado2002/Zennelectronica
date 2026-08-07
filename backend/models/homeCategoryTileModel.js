'use strict';

const mongoose = require('mongoose');

/**
 * Tiles del home (estilo Atacado): imagen CDN + label + link.
 * Ej: Notebooks, Games, Informática, Electrónicos, Portátiles.
 */
const homeCategoryTileSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_]+$/, 'key solo a-z, 0-9 y _']
    },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    image: { type: String, default: '', trim: true },
    href: { type: String, required: true, trim: true, maxlength: 500 },
    order: { type: Number, default: 100 },
    enabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

homeCategoryTileSchema.index({ enabled: 1, order: 1 });

module.exports = mongoose.model('HomeCategoryTile', homeCategoryTileSchema);
