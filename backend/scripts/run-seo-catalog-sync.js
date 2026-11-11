'use strict';

/**
 * Sync del índice SEO (marcas + categorías + subcategorías + productos).
 *
 * Dry-run (default, sin escrituras):
 *   node scripts/run-seo-catalog-sync.js
 *
 * Escritura (requiere confirmación explícita):
 *   node scripts/run-seo-catalog-sync.js --write
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { runSeoCatalogSync } = require('../services/seoCatalogSync');

const write = process.argv.includes('--write');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const result = await runSeoCatalogSync({
    trigger: write ? 'manual' : 'dry-run',
    dryRun: !write,
    force: true
  });
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
  if (!result?.ok && result?.status === 'skipped') process.exit(2);
})().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
