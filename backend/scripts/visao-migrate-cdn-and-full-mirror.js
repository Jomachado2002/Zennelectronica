#!/usr/bin/env node
/**
 * 1) Migra productImage (Firebase / CDN Visão / otros) → CDN Zenn (R2)
 * 2) Corre espejo Visão VIP masivo (compara/crea/actualiza + cleanup stock)
 * 3) Escribe informe con tiempos y contadores
 *
 * Uso (desde backend/):
 *   node scripts/visao-migrate-cdn-and-full-mirror.js
 *   node scripts/visao-migrate-cdn-and-full-mirror.js --migrate-only
 *   node scripts/visao-migrate-cdn-and-full-mirror.js --sync-only
 *   node scripts/visao-migrate-cdn-and-full-mirror.js --dry-run
 *   node scripts/visao-migrate-cdn-and-full-mirror.js --concurrency=6 --limit=100
 */

const path = require('path');
const fs = require('fs');

function syncWrite(fd, args) {
  const util = require('util');
  fs.writeSync(fd, util.format(...args) + '\n');
}
console.log = (...args) => syncWrite(1, args);
console.warn = (...args) => syncWrite(2, args);
console.error = (...args) => syncWrite(2, args);

process.on('uncaughtException', (err) => {
  console.error('[orch] uncaughtException', err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('[orch] unhandledRejection', err && err.stack ? err.stack : err);
  process.exit(1);
});

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const productModel = require('../models/productModel');
const { isR2Configured, isR2PublicUrl } = require('../services/r2StorageService');
const { importImageFromUrlWithRetries } = require('../services/imageImportService');
const { syncVisionVipMirrorToMongo } = require('../services/visionVipSyncService');

function has(flag) {
  return process.argv.includes(flag);
}

function numArg(name, fallback) {
  const prefix = `${name}=`;
  const raw = process.argv.find((a) => a.startsWith(prefix));
  if (!raw) return fallback;
  const n = Number(raw.slice(prefix.length));
  return Number.isFinite(n) ? n : fallback;
}

function isZennCdn(url) {
  return isR2PublicUrl(url);
}

function needsMigration(url) {
  if (!url || typeof url !== 'string') return false;
  if (!/^https?:\/\//i.test(url)) return false;
  return !isZennCdn(url);
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'invalid';
  }
}

function fmtMs(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ${rs}s`;
}

async function snapshotImageHosts() {
  const totalProducts = await productModel.countDocuments({});
  const withImages = await productModel.countDocuments({
    productImage: { $exists: true, $ne: [] }
  });
  const hosts = await productModel.aggregate([
    { $match: { productImage: { $exists: true, $ne: [] } } },
    { $unwind: '$productImage' },
    {
      $project: {
        host: {
          $arrayElemAt: [
            { $split: [{ $arrayElemAt: [{ $split: ['$productImage', '://'] }, 1] }, '/'] },
            0
          ]
        }
      }
    },
    { $group: { _id: '$host', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 15 }
  ]);
  return { totalProducts, withImages, hosts };
}

async function migrateProductImagesV2({ concurrency, limit, dryRun }) {
  const t0 = Date.now();
  const filter = { productImage: { $exists: true, $ne: [] } };

  // Prefer products that still have non-Zenn URLs
  const candidates = await productModel
    .find({
      ...filter,
      productImage: {
        $elemMatch: {
          $not: { $regex: /cdn\.zenn\.com\.py/i }
        }
      }
    })
    .select('_id codigo productName productImage')
    .lean();

  const list = limit > 0 ? candidates.slice(0, limit) : candidates;

  const stats = {
    productsCandidate: candidates.length,
    productsTargeted: list.length,
    productsScanned: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    imagesMigrated: 0,
    imagesAlreadyZenn: 0,
    imagesFailed: 0,
    bySourceHost: {},
    failures: []
  };

  console.log(
    `[migrate] Candidatos con ≥1 imagen fuera de CDN Zenn: ${candidates.length}. Procesando: ${list.length}. concurrency=${concurrency} dryRun=${dryRun}`
  );

  let idx = 0;
  async function worker() {
    while (idx < list.length) {
      const my = idx++;
      const doc = list[my];
      stats.productsScanned += 1;
      const images = Array.isArray(doc.productImage) ? doc.productImage.filter(Boolean) : [];
      const code = doc.codigo || String(doc._id);
      const nextImages = [];
      let changed = false;

      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        if (!needsMigration(url)) {
          nextImages.push(url);
          stats.imagesAlreadyZenn += 1;
          continue;
        }
        const host = hostOf(url);
        stats.bySourceHost[host] = (stats.bySourceHost[host] || 0) + 1;

        if (dryRun) {
          nextImages.push(`[DRY→zenn]${url}`);
          stats.imagesMigrated += 1;
          changed = true;
          continue;
        }

        try {
          const res = await importImageFromUrlWithRetries(url, `${code}_${i}`, {}, 2);
          if (!res?.publicUrl || !isZennCdn(res.publicUrl)) {
            throw new Error('Upload no devolvió URL CDN Zenn');
          }
          nextImages.push(res.publicUrl);
          stats.imagesMigrated += 1;
          changed = true;
        } catch (err) {
          stats.imagesFailed += 1;
          nextImages.push(url);
          if (stats.failures.length < 50) {
            stats.failures.push({
              codigo: code,
              index: i,
              url: String(url).slice(0, 180),
              error: (err && err.message) || String(err)
            });
          }
        }
      }

      if (changed && !dryRun) {
        await productModel.updateOne({ _id: doc._id }, { $set: { productImage: nextImages } });
        stats.productsUpdated += 1;
      } else if (changed && dryRun) {
        stats.productsUpdated += 1;
      } else {
        stats.productsSkipped += 1;
      }

      if ((my + 1) % 25 === 0 || my + 1 === list.length) {
        console.log(
          `[migrate] ${my + 1}/${list.length} updated=${stats.productsUpdated} imgsOK=${stats.imagesMigrated} fail=${stats.imagesFailed} elapsed=${fmtMs(Date.now() - t0)}`
        );
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);

  stats.elapsedMs = Date.now() - t0;
  stats.elapsedHuman = fmtMs(stats.elapsedMs);
  return stats;
}

async function runFullMirror() {
  const t0 = Date.now();
  console.log('[sync] Inicio espejo Visão VIP FULL…');
  const report = await syncVisionVipMirrorToMongo({
    resetCatalog: false,
    persistConcurrency: 10,
    cleanupMissingStock: true,
    deliveryCost: 0,
    profitMargin: 20,
    mirrorScrapeOpts: {
      maxListings: null,
      singlePageListing: false,
      maxProductUrls: null,
      detailConcurrency: 2,
      listingConcurrency: 1
    },
    maxImagesPerProduct: 8,
    mirrorPrune: true,
    exportFrontendProductCategoryJs: true,
    forceReimportImages: false
  });
  return {
    elapsedMs: Date.now() - t0,
    elapsedHuman: fmtMs(Date.now() - t0),
    report
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const tAll = Date.now();
  const dryRun = has('--dry-run');
  const migrateOnly = has('--migrate-only');
  const syncOnly = has('--sync-only');
  const concurrency = Math.min(12, Math.max(1, Math.round(numArg('--concurrency', 5))));
  const limit = Math.max(0, Math.round(numArg('--limit', 0)));

  const logDir = path.join(__dirname, '..', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(logDir, `visao-migrate-mirror-report-${stamp}.json`);

  console.log('==========================================');
  console.log('Visão: migrar CDN Zenn + mirror full');
  console.log('Inicio:', startedAt);
  console.log('dryRun=', dryRun, 'migrateOnly=', migrateOnly, 'syncOnly=', syncOnly);
  console.log('==========================================');

  if (!isR2Configured()) {
    throw new Error('R2/CDN Zenn no está configurado en .env');
  }

  await connectDB();

  const before = await snapshotImageHosts();
  console.log('[stats] Antes:', JSON.stringify(before, null, 2));

  const out = {
    startedAt,
    finishedAt: null,
    dryRun,
    before,
    migrate: null,
    sync: null,
    after: null,
    totalElapsedMs: null,
    totalElapsedHuman: null
  };

  try {
    if (!syncOnly) {
      out.migrate = await migrateProductImagesV2({ concurrency, limit, dryRun });
      console.log('[migrate] DONE', out.migrate.elapsedHuman);
    }

    if (!migrateOnly && !dryRun) {
      out.sync = await runFullMirror();
      console.log('[sync] DONE', out.sync.elapsedHuman);
    } else if (!migrateOnly && dryRun) {
      console.log('[sync] omitido (dry-run)');
    }

    out.after = await snapshotImageHosts();
    console.log('[stats] Después:', JSON.stringify(out.after, null, 2));
  } finally {
    out.finishedAt = new Date().toISOString();
    out.totalElapsedMs = Date.now() - tAll;
    out.totalElapsedHuman = fmtMs(out.totalElapsedMs);
    fs.writeFileSync(reportPath, JSON.stringify(out, null, 2));
    console.log('==========================================');
    console.log('INFORME');
    console.log('Total:', out.totalElapsedHuman);
    if (out.migrate) {
      console.log(
        `Migración: ${out.migrate.elapsedHuman} | productos ${out.migrate.productsUpdated}/${out.migrate.productsTargeted} | imgs OK ${out.migrate.imagesMigrated} | fail ${out.migrate.imagesFailed}`
      );
    }
    if (out.sync) {
      console.log(`Sync Visão: ${out.sync.elapsedHuman}`);
      const r = out.sync.report || {};
      console.log(
        `  created=${r.created ?? r.persistCreated ?? '?'} updated=${r.updated ?? r.persistUpdated ?? '?'} stock0=${r.stockCleanupCount ?? r.firebaseImageCleanup?.stockCleanupCount ?? '?'}`
      );
    }
    console.log('Reporte JSON:', reportPath);
    console.log('==========================================');
    await mongoose.connection.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[orch] Error:', err);
  process.exit(1);
});
