'use strict';

const HomeSection = require('../models/homeSectionModel');
const Category = require('../models/categoryModel');
const { buildHomeSectionDefaults } = require('../config/homeSectionDefaults');
const { remapPairsToActiveSubcategories } = require('./homeFeaturedSlotsSync');

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

function applyActivePairs(section, categoryDocs) {
    const pairs = remapPairsToActiveSubcategories(section.pairs, categoryDocs);
    const first = pairs[0] || section.pairs?.[0];
    const verMasRemapped = remapPairsToActiveSubcategories(
        [
            {
                category: section.verMas?.category || first?.category,
                subcategory: section.verMas?.subcategory || first?.subcategory
            }
        ],
        categoryDocs
    )[0] || first;
    return {
        ...section,
        pairs,
        verMas: {
            category: verMasRemapped?.category || first?.category || '',
            subcategory: verMasRemapped?.subcategory || first?.subcategory || ''
        }
    };
}

async function loadCategoryDocsForPairs(sections) {
    const catValues = [...new Set(
        sections.flatMap((s) => (s.pairs || []).map((p) => p.category).filter(Boolean))
    )];
    if (!catValues.length) return [];
    return Category.find({ value: { $in: catValues } }).select('value subcategories').lean();
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

/**
 * Reescribe pares de vitrinas si Visão desactivó/renombró subcategorías.
 */
async function persistRemappedHomeSectionPairs() {
    await ensureHomeSectionsSeeded();
    const rows = await HomeSection.find({});
    const categoryDocs = await loadCategoryDocsForPairs(rows.map(normalizeSection));
    let updated = 0;
    for (const doc of rows) {
        const current = normalizeSection(doc);
        const remapped = applyActivePairs(current, categoryDocs);
        const samePairs =
            JSON.stringify(current.pairs) === JSON.stringify(remapped.pairs) &&
            current.verMas.category === remapped.verMas.category &&
            current.verMas.subcategory === remapped.verMas.subcategory;
        if (samePairs) continue;
        doc.pairs = remapped.pairs;
        doc.verMas = remapped.verMas;
        await doc.save();
        updated += 1;
    }
    return { updated };
}

/** Secciones para admin (todas, ordenadas). */
async function listAllHomeSections() {
    await ensureHomeSectionsSeeded();
    const rows = await HomeSection.find({}).sort({ order: 1, createdAt: 1 }).lean();
    const normalized = rows.map(normalizeSection);
    const categoryDocs = await loadCategoryDocsForPairs(normalized);
    return normalized.map((s) => applyActivePairs(s, categoryDocs));
}

/** Secciones activas para el storefront. */
async function getActiveHomeSections() {
    await ensureHomeSectionsSeeded();
    const rows = await HomeSection.find({ enabled: true }).sort({ order: 1, createdAt: 1 }).lean();
    const normalized = rows.length
        ? rows.map(normalizeSection)
        : buildHomeSectionDefaults().map(normalizeSection);
    const categoryDocs = await loadCategoryDocsForPairs(normalized);
    return normalized.map((s) => applyActivePairs(s, categoryDocs));
}

module.exports = {
    normalizeSection,
    ensureHomeSectionsSeeded,
    listAllHomeSections,
    getActiveHomeSections,
    persistRemappedHomeSectionPairs,
    applyActivePairs
};
