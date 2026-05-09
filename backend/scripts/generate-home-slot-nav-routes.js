#!/usr/bin/env node
/**
 * Escribe frontend/src/config/homeSlotNavRoutes.generated.js desde
 * backend/config/homeFeaturedSlots.js (no requiere Mongo).
 */
'use strict';

const { generateHomeSlotNavRoutesFrontendFile } = require('../services/homeFeaturedSlotsSync');

try {
    const { path: p } = generateHomeSlotNavRoutesFrontendFile();
    console.log('OK →', p);
} catch (e) {
    console.error(e.message || e);
    process.exit(1);
}
