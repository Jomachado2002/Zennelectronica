'use strict';

const HomeSection = require('../models/homeSectionModel');
const { buildHomeSectionDefaults } = require('../config/homeSectionDefaults');

function normalizeSection(doc) {
    const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    const first = plain.pairs?.[0];
    const verMasCategory = plain.verMas?.category || first?.category || '';
    const verMasSubcategory = plain.verMas?.subcategory || first?.subcategory || '';
    return {
        _id: plain._id,
        key: plain.key,
        title: plain.title,
        subtitle: plain.subtitle || '',
        layout: plain.layout || 'grid',
        enabled: plain.enabled !== false,
        order: plain.order ?? 100,
        limit: plain.limit || 20,
        pairs: (plain.pairs || []).map((p) => ({
            category: p.category,
            subcategory: p.subcategory
        })),
        verMas: {
            category: verMasCategory,
            subcategory: verMasSubcategory
        },
        filters: {
            brandNames: plain.filters?.brandNames || [],
            specifications: plain.filters?.specifications || {},
            priceMin: plain.filters?.priceMin ?? null,
            priceMax: plain.filters?.priceMax ?? null,
            minStock: plain.filters?.minStock ?? 1
        },
        updatedAt: plain.updatedAt,
        createdAt: plain.createdAt
    };
}

async function ensureHomeSectionsSeeded() {
    const count = await HomeSection.countDocuments();
    if (count > 0) {
        return { seeded: false, count };
    }
    const defaults = buildHomeSectionDefaults();
    await HomeSection.insertMany(defaults);
    return { seeded: true, count: defaults.length };
}

/** Secciones para admin (todas, ordenadas). */
async function listAllHomeSections() {
    await ensureHomeSectionsSeeded();
    const rows = await HomeSection.find({}).sort({ order: 1, createdAt: 1 }).lean();
    return rows.map(normalizeSection);
}

/** Secciones activas para el storefront. */
async function getActiveHomeSections() {
    await ensureHomeSectionsSeeded();
    const rows = await HomeSection.find({ enabled: true }).sort({ order: 1, createdAt: 1 }).lean();
    if (!rows.length) {
        return buildHomeSectionDefaults().map(normalizeSection);
    }
    return rows.map(normalizeSection);
}

module.exports = {
    normalizeSection,
    ensureHomeSectionsSeeded,
    listAllHomeSections,
    getActiveHomeSections
};
