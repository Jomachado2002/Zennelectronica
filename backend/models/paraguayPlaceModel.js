'use strict';

const mongoose = require('mongoose');

/**
 * Departamentos y ciudades de Paraguay para SEO de envíos
 * (landings tipo “Celulares en Alto Paraná”, “Placas madre en Concepción”).
 */
const paraguayPlaceSchema = new mongoose.Schema(
  {
    /** department | city */
    placeType: { type: String, required: true, enum: ['department', 'city'] },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    departmentName: { type: String, default: '' },
    departmentSlug: { type: String, default: '' },
    /** Prioridad SEO: 1 = capitales / hubs comerciales */
    priority: { type: Number, default: 50 },
    isActive: { type: Boolean, default: true },
    aliases: { type: [String], default: [] }
  },
  { timestamps: true }
);

paraguayPlaceSchema.index({ slug: 1 }, { unique: true });
paraguayPlaceSchema.index({ placeType: 1, isActive: 1, priority: 1 });
paraguayPlaceSchema.index({ departmentSlug: 1, placeType: 1 });

module.exports = mongoose.model('paraguayPlace', paraguayPlaceSchema);
