'use strict';

const fs = require('fs');
const path = require('path');
const Category = require('../models/categoryModel');
const { HOME_SLOT_DEFS, buildHomeSlotNavRoutes } = require('../config/homeFeaturedSlots');

function visaoIdSuffix(value) {
    const m = String(value || '').match(/(__[\d_]+)$/);
    return m ? m[1] : '';
}

/**
 * Visão renombra `value` (mb_intel → placas_madre_intel) y deja el sufijo __22_01.
 * Reescribe pares inactivos a las subcategorías activas actuales.
 */
function remapPairsToActiveSubcategories(pairs, categoryDocs) {
    const byValue = new Map((categoryDocs || []).map((c) => [c.value, c]));
    const resolved = [];
    const seen = new Set();

    const push = (category, subcategory) => {
        if (!category || !subcategory) return;
        const key = `${category}::${subcategory}`;
        if (seen.has(key)) return;
        seen.add(key);
        resolved.push({ category, subcategory });
    };

    for (const pair of pairs || []) {
        const category = pair.category;
        const subcategory = pair.subcategory;
        const cat = byValue.get(category);
        const active = (cat?.subcategories || []).filter((s) => s && s.isActive !== false && s.value);

        if (!cat || !active.length) {
            push(category, subcategory);
            continue;
        }

        if (active.some((s) => s.value === subcategory)) {
            push(category, subcategory);
            continue;
        }

        const suffix = visaoIdSuffix(subcategory);
        const matches = suffix
            ? active.filter((s) => {
                  const ss = visaoIdSuffix(s.value);
                  return ss === suffix || ss.startsWith(`${suffix}_`);
              })
            : [];

        if (matches.length) {
            matches.forEach((s) => push(category, s.value));
        } else {
            push(category, subcategory);
        }
    }

    return resolved.length ? resolved : pairs || [];
}

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
    generateHomeSlotNavRoutesFrontendFile,
    remapPairsToActiveSubcategories,
    visaoIdSuffix
};
