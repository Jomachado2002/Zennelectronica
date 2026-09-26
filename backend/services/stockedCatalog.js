'use strict';

const productModel = require('../models/productModel');

const TTL_MS = 3 * 60 * 1000;
let cache = null;

function pairKey(category, subcategory) {
    return `${category}\0${subcategory}`;
}

async function getStockedCatalog() {
    if (cache && Date.now() < cache.expiresAt) return cache;

    const rows = await productModel.aggregate([
        {
            $match: {
                stock: { $gte: 1 },
                category: { $type: 'string', $ne: '' },
                subcategory: { $type: 'string', $ne: '' }
            }
        },
        {
            $group: {
                _id: { category: '$category', subcategory: '$subcategory' }
            }
        }
    ]);

    const subs = new Set();
    const categories = new Set();
    rows.forEach((row) => {
        const category = row._id?.category;
        const subcategory = row._id?.subcategory;
        if (!category || !subcategory) return;
        subs.add(pairKey(category, subcategory));
        categories.add(category);
    });

    cache = { subs, categories, expiresAt: Date.now() + TTL_MS };
    return cache;
}

function hasStockedSubcategory(catalog, categoryValue, subcategoryValue) {
    if (!categoryValue || !subcategoryValue) return false;
    return catalog.subs.has(pairKey(categoryValue, subcategoryValue));
}

function pruneVisaoTree(node, categoryValue, catalog) {
    if (!node || typeof node !== 'object') return null;
    if (node.subcategoryValue) {
        return hasStockedSubcategory(catalog, categoryValue, node.subcategoryValue) ? node : null;
    }
    const children = node.children;
    if (!children || typeof children !== 'object') return null;
    const next = {};
    Object.entries(children).forEach(([key, child]) => {
        const pruned = pruneVisaoTree(child, categoryValue, catalog);
        if (pruned) next[key] = pruned;
    });
    if (!Object.keys(next).length) return null;
    return { ...node, children: next };
}

module.exports = {
    getStockedCatalog,
    hasStockedSubcategory,
    pruneVisaoTree
};
