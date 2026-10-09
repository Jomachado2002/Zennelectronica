#!/usr/bin/env node
'use strict';

/**
 * Genera la plantilla del catálogo (foto, nombre, precio, logos) y la sube al CDN.
 * La tienda sigue usando la foto original.
 *
 *   cd backend
 *   node scripts/migrate-catalog-plates.js --limit=1
 *   node scripts/migrate-catalog-plates.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { syncCatalogPlates } = require('../services/catalogPlateStorage');

function numArg(name, fallback) {
  const raw = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!raw) return fallback;
  const value = Number(raw.slice(name.length + 1));
  return Number.isFinite(value) ? value : fallback;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Falta MONGODB_URI');
  await mongoose.connect(uri);
  const limit = numArg('--limit', 0);
  if (limit > 0) {
    const ProductModel = require('../models/productModel');
    const sample = await ProductModel.find({
      productImage: { $exists: true, $ne: [] },
      sellingPrice: { $gte: 1000 }
    })
      .select('codigo')
      .limit(limit)
      .lean();
    const summary = await syncCatalogPlates({
      codigos: sample.map((row) => row.codigo),
      includeMissing: false,
      concurrency: 1
    });
    console.log(JSON.stringify(summary));
  } else {
    const summary = await syncCatalogPlates({ includeMissing: true, concurrency: numArg('--concurrency', 3) });
    console.log(JSON.stringify(summary));
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try { await mongoose.disconnect(); } catch (_) { /* ya cerrado */ }
  process.exit(1);
});
