#!/usr/bin/env node

/**
 * Sincronización Visão Vip fuera de Vercel (sin límite de tiempo del serverless).
 *
 * Ejecutar desde la carpeta backend:
 *   node scripts/run-sync.js
 *   node scripts/run-sync.js --mirror --quick
 *   node scripts/run-sync.js --reset-catalog --full
 *
 * Sin --full usa topes modestos (5 listados × ~50 PDP) para no lanzar un crawl enorme por error.
 *
 * Opciones:
 *   --mirror              Igual que por defecto (espejo). Opcional por claridad.
 *   --legacy              Modo scrape legado (sin jerarquía menú).
 *   --quick               Topes muy bajos (validación rápida; similar a visaovip-mirror-quick).
 *   --full                Sin topes por defecto / crawl muy grande (puede tardar horas).
 *   --reset-catalog       Pon stock 0 a TODOS los productos antes del sync.
 *   --cleanup-missing     Tras sync, stock 0 en visao_vip no aparecidos + borra sus imágenes de Firebase.
 *   --force-reimport-images  Vuelve a subir imágenes a Firebase (WebP) aunque ya existan.
 *   --persist-concurrency=N
 *   --detail-concurrency=N
 *   --listing-concurrency=N
 *   --mirror-max-listings=N
 *   --max-product-urls=N (tope PDP; omitir en --full mirror)
 *   --mirror-single-page  Solo primera página por listado
 *   --delivery-cost=N
 *   --profit-margin=N
 *   --no-prune            No alinear taxonomía/especificaciones (solo añadir; no desactivar locales).
 *   --no-export-frontend  No sobrescribir frontend/src/helpers/productCategory.js al final.
 */

const path = require('path');
const fs = require('fs');

// Si stdout va a archivo (nohup), Node bufferiza y parece “colgado/muerto”. Forzar línea a línea.
function syncWrite(fd, args) {
    const util = require('util');
    fs.writeSync(fd, util.format(...args) + '\n');
}
console.log = (...args) => syncWrite(1, args);
console.warn = (...args) => syncWrite(2, args);
console.error = (...args) => syncWrite(2, args);

process.on('uncaughtException', (err) => {
    console.error('[run-sync] uncaughtException', err && err.stack ? err.stack : err);
    process.exit(1);
});
process.on('unhandledRejection', (err) => {
    console.error('[run-sync] unhandledRejection', err && err.stack ? err.stack : err);
    process.exit(1);
});

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const {
    syncVisionVipMirrorToMongo,
    syncVisionVipCatalogToMongo
} = require('../services/visionVipSyncService');
const { getPricingSettings } = require('../services/workerSettingsService');

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

function optNumArg(prefixName, fallback = null) {
    const prefix = `${prefixName}=`;
    const raw = process.argv.find((a) => a.startsWith(prefix));
    if (!raw) return fallback;
    const n = Number(raw.slice(prefix.length));
    return Number.isFinite(n) ? n : fallback;
}

async function main() {
    console.log('[run-sync] Inicio', new Date().toISOString());
    await connectDB();
    const pricing = await getPricingSettings();
    const deliveryCostCli = optNumArg('--delivery-cost', null);
    const profitMarginCli = optNumArg('--profit-margin', null);
    const deliveryCost = deliveryCostCli != null ? deliveryCostCli : pricing.deliveryCost;
    const profitMargin = Math.min(
        100,
        Math.max(
            0,
            Math.round(profitMarginCli != null ? profitMarginCli : pricing.profitMargin)
        )
    );
    console.log(
        `[run-sync] Precios worker: envío=${deliveryCost} Gs, margen=${profitMargin}% (Visão ÷ ${((1 - profitMargin / 100) || 0).toFixed(2)}) × dólar + envío`
    );

    const useLegacy = has('--legacy');
    const persistConcurrency = Math.min(24, Math.max(1, numArg('--persist-concurrency', 10)));

    try {
        if (useLegacy) {
            const full = has('--full');
            const resetCatalog = has('--reset-catalog');
            const cleanupMissingStock = has('--cleanup-missing');
            const maxCategories = Math.max(
                1,
                Math.round(numArg('--max-categories', full ? 200 : 2))
            );
            const maxPd = optNumArg('--max-product-details', null);
            const maxProductDetails =
                full && maxPd == null
                    ? null
                    : Math.max(1, Math.round(maxPd != null ? maxPd : full ? 5000 : 12));

            const previewLegacy = !full && !has('--deep');

            const urlsCapLegacy = optNumArg('--urls-per-category-cap', null);
            const urlsPerCategoryCap =
                full && urlsCapLegacy == null ? null : Math.max(1, urlsCapLegacy ?? (previewLegacy ? 48 : 120));

            const report = await syncVisionVipCatalogToMongo({
                resetCatalog,
                persistConcurrency,
                cleanupMissingStock,
                deliveryCost,
                profitMargin,
                scrapeOpts: {
                    maxCategories,
                    maxProductDetails,
                    urlsPerCategoryCap,
                    previewMode: previewLegacy,
                    detailConcurrency: Math.min(
                        12,
                        Math.max(1, Math.round(numArg('--detail-concurrency', previewLegacy ? 6 : 1)))
                    ),
                },
                maxImagesPerProduct: Math.round(numArg('--max-images-per-product', 8))
            });
            console.log('[run-sync] Reporte legado:', JSON.stringify(report, null, 2));
            return;
        }

        const mirrorFull = has('--full');
        const quick = has('--quick');
        const resetCatalog = has('--reset-catalog');
        const cleanupMissingStock = has('--cleanup-missing');

        let mirrorMaxListings = mirrorFull ? null : optNumArg('--mirror-max-listings', null);
        let maxProductUrls = mirrorFull ? null : optNumArg('--max-product-urls', null);

        if (quick) {
            mirrorMaxListings = mirrorMaxListings ?? 3;
            maxProductUrls = maxProductUrls ?? 8;
        } else if (!mirrorFull) {
            mirrorMaxListings = mirrorMaxListings ?? 5;
            maxProductUrls = maxProductUrls ?? 50;
        }

        const mirrorScrapeOpts = {
            maxListings: mirrorMaxListings,
            singlePageListing: has('--mirror-single-page') || quick,
            maxProductUrls,
            detailConcurrency: Math.min(
                12,
                Math.max(1, Math.round(numArg('--detail-concurrency', quick ? 2 : 2)))
            ),
            listingConcurrency: Math.min(
                6,
                Math.max(1, Math.round(numArg('--listing-concurrency', quick ? 1 : 1)))
            )
        };

        const report = await syncVisionVipMirrorToMongo({
            resetCatalog,
            persistConcurrency,
            cleanupMissingStock,
            deliveryCost,
            profitMargin,
            mirrorScrapeOpts,
            maxImagesPerProduct: Math.round(numArg('--max-images-per-product', 8)),
            mirrorPrune: !has('--no-prune'),
            exportFrontendProductCategoryJs: !has('--no-export-frontend'),
            forceReimportImages: has('--force-reimport-images')
        });

        console.log('[run-sync] Reporte mirror:', JSON.stringify(report, null, 2));
    } finally {
        await mongoose.connection.close().catch(() => {});
        console.log('[run-sync] Fin', new Date().toISOString());
    }
}

main().catch((err) => {
    console.error('[run-sync] Error:', err);
    process.exit(1);
});
