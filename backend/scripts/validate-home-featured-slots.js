#!/usr/bin/env node
/**
 * Comprueba que todos los pares de HOME_SLOT_DEFS existen en Mongo (categorías/sub activas).
 *
 * Uso: cd backend && node scripts/validate-home-featured-slots.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { validateHomeFeaturedSlotsAgainstMongo } = require('../services/homeFeaturedSlotsSync');

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error('Falta MONGODB_URI');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    try {
        const v = await validateHomeFeaturedSlotsAgainstMongo();
        if (v.ok) {
            console.log('OK: vitrinas home alineadas con categorías activas.');
            process.exit(0);
        }
        console.error('Hay desalineación entre homeFeaturedSlots.js y Mongo:');
        v.errors.forEach((e) => console.error(' •', e));
        process.exit(1);
    } finally {
        await mongoose.disconnect().catch(() => {});
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
