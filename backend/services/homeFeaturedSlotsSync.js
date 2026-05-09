'use strict';

const fs = require('fs');
const path = require('path');
const Category = require('../models/categoryModel');
const { HOME_SLOT_DEFS, buildHomeSlotNavRoutes } = require('../config/homeFeaturedSlots');

async function validateHomeFeaturedSlotsAgainstMongo() {
    const errors = [];
    const categories = await Category.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
    const byValue = new Map(categories.map((c) => [c.value, c]));

    for (const def of HOME_SLOT_DEFS) {
        for (const { category: catVal, subcategory: subVal } of def.pairs) {
            const cat = byValue.get(catVal);
            if (!cat) {
                errors.push(`slot "${def.key}": categoría "${catVal}" no existe o inactiva`);
                continue;
            }
            const subs = (cat.subcategories || []).filter((s) => s && s.isActive !== false);
            const found = subs.some((s) => s.value === subVal);
            if (!found) {
                errors.push(`slot "${def.key}": subcategoría "${subVal}" no existe/inactiva bajo "${catVal}"`);
            }
        }
    }

    return { ok: errors.length === 0, errors };
}

function generateHomeSlotNavRoutesFrontendFile() {
    const nav = buildHomeSlotNavRoutes();
    const indent = '  ';
    const lines = Object.entries(nav).map(([key, { category, subcategory }]) => {
        return `${indent}${key}: {\n${indent}${indent}category: '${category}',\n${indent}${indent}subcategory: '${subcategory}'\n${indent}}`;
    });

    const body = `/**\n * AUTO-GENERADO — no editar a mano.\n * Fuente única: backend/config/homeFeaturedSlots.js\n * Actualizar ejecutando mirror con export frontend, o:\n *   cd backend && node scripts/generate-home-slot-nav-routes.js\n */\n\nexport const HOME_SLOT_ROUTES = {\n${lines.join(',\n')}\n};\n`;

    const outPath = path.join(__dirname, '../../frontend/src/config/homeSlotNavRoutes.generated.js');
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
        throw new Error(`Directorio frontend inexistente: ${dir}`);
    }
    fs.writeFileSync(outPath, body, 'utf8');
    return { path: outPath };
}

module.exports = {
    validateHomeFeaturedSlotsAgainstMongo,
    generateHomeSlotNavRoutesFrontendFile
};
