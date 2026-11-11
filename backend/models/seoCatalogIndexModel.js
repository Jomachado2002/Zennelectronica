'use strict';

/**
 * Índice SEO persistente (URLs descubribles).
 * No duplica el documento comercial: precios/stock viven en product.
 */

const mongoose = require('mongoose');

const seoCatalogIndexSchema = new mongoose.Schema(
  {
    /** product | category | subcategory | brand */
    entityType: { type: String, required: true, enum: ['product', 'category', 'subcategory', 'brand'] },
    /** Clave estable única: product:<id> | category:<value> | subcategory:<cat>::<sub> | brand:<normalized> */
    entityKey: { type: String, required: true },
    entityId: { type: String, default: '' },
    slug: { type: String, default: '' },
    canonicalPath: { type: String, required: true },
    canonicalUrl: { type: String, required: true },
    seoTitle: { type: String, default: '' },
    seoDescription: { type: String, default: '' },
    h1: { type: String, default: '' },
    label: { type: String, default: '' },
    brandName: { type: String, default: '' },
    category: { type: String, default: '' },
    subcategory: { type: String, default: '' },
    productCount: { type: Number, default: 0 },
    minPrice: { type: Number, default: 0 },
    maxPrice: { type: Number, default: 0 },
    indexable: { type: Boolean, default: false },
    exclusionReason: { type: String, default: '' },
    contentHash: { type: String, default: '' },
    sourceUpdatedAt: { type: Date, default: null },
    lastSyncedAt: { type: Date, default: null },
    syncRunId: { type: String, default: '' }
  },
  { timestamps: true }
);

seoCatalogIndexSchema.index({ entityKey: 1 }, { unique: true });
seoCatalogIndexSchema.index({ entityType: 1, indexable: 1 });
seoCatalogIndexSchema.index({ canonicalPath: 1 }, { unique: true });
seoCatalogIndexSchema.index({ brandName: 1, entityType: 1 });
seoCatalogIndexSchema.index({ category: 1, subcategory: 1, entityType: 1 });

module.exports = mongoose.model('seoCatalogIndex', seoCatalogIndexSchema);
