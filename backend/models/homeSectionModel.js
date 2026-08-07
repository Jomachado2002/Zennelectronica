'use strict';

const mongoose = require('mongoose');

const categoryPairSchema = new mongoose.Schema(
    {
        category: { type: String, required: true, trim: true },
        subcategory: { type: String, required: true, trim: true }
    },
    { _id: false }
);

const homeSectionSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^[a-z0-9_]+$/, 'key solo admite a-z, 0-9 y _']
        },
        title: { type: String, required: true, trim: true, maxlength: 120 },
        subtitle: { type: String, default: '', trim: true, maxlength: 240 },
        layout: {
            type: String,
            enum: ['hero', 'full', 'grid'],
            default: 'grid'
        },
        enabled: { type: Boolean, default: true },
        order: { type: Number, default: 100 },
        limit: { type: Number, default: 20, min: 1, max: 48 },
        pairs: {
            type: [categoryPairSchema],
            validate: {
                validator(v) {
                    return Array.isArray(v) && v.length > 0;
                },
                message: 'Debe haber al menos un par categoría/subcategoría'
            }
        },
        /** Destino del botón «Ver más»; si vacío, usa pairs[0] */
        verMas: {
            category: { type: String, default: '' },
            subcategory: { type: String, default: '' }
        },
        filters: {
            brandNames: { type: [String], default: [] },
            /** Mismos keys que el listado de categoría, ej. { processor: ['i7'], memory: ['16GB'] } */
            specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
            priceMin: { type: Number, default: null },
            priceMax: { type: Number, default: null },
            minStock: { type: Number, default: 1, min: 0 }
        }
    },
    { timestamps: true }
);

homeSectionSchema.index({ enabled: 1, order: 1 });

module.exports = mongoose.model('HomeSection', homeSectionSchema);
