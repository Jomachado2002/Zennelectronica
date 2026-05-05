/**
 * Regenera frontend/src/helpers/productCategory.js desde Mongo (solo categorías/subactivas).
 * Usado al finalizar un Full Mirror para alinear header y vitrinas offline.
 */

const fs = require('fs');
const path = require('path');
const Category = require('../models/categoryModel');

/** Mismo orden relativo histórico; el resto al final */
const PREFERRED_ORDER = [
    'informatica',
    'perifericos',
    'electronicos',
    'cctv',
    'electrodomesticos'
];

function sortCategoriesByPreferredOrder(categories) {
    const categoryMap = new Map(categories.map((cat) => [cat.value, cat]));
    const sortedCategories = [];
    PREFERRED_ORDER.forEach((categoryValue) => {
        if (categoryMap.has(categoryValue)) {
            sortedCategories.push(categoryMap.get(categoryValue));
            categoryMap.delete(categoryValue);
        }
    });
    categoryMap.forEach((category) => sortedCategories.push(category));
    return sortedCategories;
}

function convertToFrontendFormat(categoriesLean) {
    let categoryId = 1;
    let subcategoryId = 1;
    const sortedCategories = sortCategoriesByPreferredOrder(categoriesLean);

    return sortedCategories.map((category) => {
        const subs = (category.subcategories || []).filter((sub) => sub.isActive !== false);
        subs.sort((a, b) => (a.order || 0) - (b.order || 0));

        const frontendCategory = {
            id: categoryId++,
            value: category.value,
            label: category.label
        };

        if (subs.length > 0) {
            frontendCategory.subcategories = subs.map((sub) => ({
                id: subcategoryId++,
                value: sub.value,
                label: sub.label
            }));
        }

        return frontendCategory;
    });
}

function generateFrontendCode(categories) {
    const formattedCategories = JSON.stringify(categories, null, 2)
        .replace(/"id":/g, 'id:')
        .replace(/"value":/g, 'value:')
        .replace(/"label":/g, 'label:')
        .replace(/"subcategories":/g, 'subcategories:');

    return `// frontend/src/helpers/productCategory.js
// Categorías generadas desde MongoDB (${new Date().toISOString()}), solo isActive=true
// Total de categorías: ${categories.length}
//
const productCategory = ${formattedCategories};

export default productCategory;
`;
}

/**
 * @returns {{ ok: boolean, path?: string, count?: number, error?: string }}
 */
async function writeProductCategoryJsFromMongo() {
    const categories = await Category.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();

    const filtered = categories.map((cat) => ({
        ...cat,
        subcategories: (cat.subcategories || []).filter((sub) => sub.isActive !== false)
    }));

    const frontendCategories = convertToFrontendFormat(filtered);
    const jsCode = generateFrontendCode(frontendCategories);

    const frontendFilePath = path.join(__dirname, '../../frontend/src/helpers/productCategory.js');
    const frontendDir = path.dirname(frontendFilePath);

    if (!fs.existsSync(frontendDir)) {
        return { ok: false, error: `No existe directorio frontend: ${frontendDir}` };
    }

    fs.writeFileSync(frontendFilePath, jsCode, 'utf8');
    return {
        ok: true,
        path: frontendFilePath,
        count: frontendCategories.length
    };
}

module.exports = {
    writeProductCategoryJsFromMongo,
    convertToFrontendFormat
};
