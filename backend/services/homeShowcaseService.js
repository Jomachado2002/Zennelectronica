'use strict';

/**
 * Bootstrap del bloque "Explora por categorías" del home:
 * categorías + slides (label + imagen) listos en el mismo payload que las vitrinas.
 * Así el carrusel de subcategorías pinta al mismo tiempo que los productos.
 */

const Category = require('../models/categoryModel');

function collectVisaoLeaves(node, out = []) {
    if (!node || typeof node !== 'object') return out;
    if (node.subcategoryValue) {
        out.push({
            value: String(node.subcategoryValue),
            label: node.label || ''
        });
        return out;
    }
    const children = node.children;
    if (children && typeof children === 'object') {
        Object.values(children).forEach((ch) => collectVisaoLeaves(ch, out));
    }
    return out;
}

function lookupPreview(previewsByCategory, categoryValue, subcategoryValue) {
    if (!subcategoryValue) return null;
    const direct = previewsByCategory?.[categoryValue]?.[subcategoryValue];
    if (direct) return direct;
    for (const map of Object.values(previewsByCategory || {})) {
        if (map && map[subcategoryValue]) return map[subcategoryValue];
    }
    return null;
}

function assembleHomeShowcase(categoryDocs, previewsByCategory = {}) {
    const categories = [];
    const carousels = {};

    for (const cat of categoryDocs || []) {
        const value = cat.value;
        if (!value) continue;
        const label = cat.label || cat.name || value;
        categories.push({
            id: String(cat._id),
            value,
            label
        });

        let items = [];
        const tree = cat.visaoNavigationTree;
        const hasTree =
            tree &&
            tree.children &&
            typeof tree.children === 'object' &&
            Object.keys(tree.children).length > 0;

        if (hasTree) {
            items = collectVisaoLeaves(tree).map((leaf, idx) => ({
                id: `${leaf.value}-${idx}`,
                value: leaf.value,
                label: leaf.label,
                image: lookupPreview(previewsByCategory, value, leaf.value)
            }));
        } else {
            items = [...(cat.subcategories || [])]
                .filter((s) => s && s.isActive !== false && s.value)
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((s) => ({
                    id: String(s._id || s.value),
                    value: s.value,
                    label: s.label || s.name || s.value,
                    image: lookupPreview(previewsByCategory, value, s.value)
                }));
        }

        carousels[value] = items.filter((it) => it.value);
    }

    return { categories, carousels };
}

/**
 * Carga categorías activas + arma carousels con imagen de producto.
 * @param {Record<string, Record<string, string>>} previewsByCategory
 */
async function buildHomeShowcaseBootstrap(previewsByCategory = {}) {
    const categoryDocs = await Category.find({ isActive: true })
        .sort({ order: 1, createdAt: 1 })
        .select('value label name subcategories visaoNavigationTree')
        .lean();

    return assembleHomeShowcase(categoryDocs, previewsByCategory);
}

/**
 * Categorías + previews en paralelo-friendly: si no hay previews, las calcula
 * con el builder inyectado (evita dependencias circulares).
 */
async function buildHomeShowcaseWithPreviews(buildShowcasePreviewsByCategory) {
    const categoryDocs = await Category.find({ isActive: true })
        .sort({ order: 1, createdAt: 1 })
        .select('value label name subcategories visaoNavigationTree')
        .lean();

    const catValues = categoryDocs.map((c) => c.value).filter(Boolean);
    const previewsByCategory = buildShowcasePreviewsByCategory
        ? await buildShowcasePreviewsByCategory(catValues).catch(() => ({}))
        : {};

    return {
        showcasePreviewsByCategory: previewsByCategory,
        homeShowcase: assembleHomeShowcase(categoryDocs, previewsByCategory)
    };
}

module.exports = {
    assembleHomeShowcase,
    buildHomeShowcaseBootstrap,
    buildHomeShowcaseWithPreviews,
    collectVisaoLeaves
};
