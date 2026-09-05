#!/usr/bin/env node

/**
 * Migración inicial “solo espejo Visão”: BORRA TODO el catálogo local y reconstruye desde cero.
 *
 * Elimina:
 *   - Todas las filas en la colección `product`
 *   - Todas las filas en la colección `Category` (categorías embebidas con subcategorías y especificaciones)
 *
 * NO toca usuarios, ventas, carritos ni presupuestos: esos pueden quedar con refs a productIds inexistentes.
 * Si te importa historial coherentes de pedidos/presupuestos, haz backup de Mongo antes.
 *
 * Uso (desde carpeta backend):
 *
 *   CONFIRM_VISAO_FULL_PURGE=yes node scripts/visao-purge-and-full-mirror.js --confirm-purge
 *
 * Opciones iguales a run-sync (mirror full por defecto en este script):
 *   --confirm-purge     Obligatorio (o variable de entorno abajo).
 *   --persist-concurrency=N
 *   --detail-concurrency=N
 *   --listing-concurrency=N
 *   --cleanup-missing   Tras import, stock 0 en visao_vip no vistos en este run (útil rutinas futuras).
 *   --mirror-max-listings=N --max-product-urls=N  (solo si querés ACOTAR prueba).
 *   --mirror-single-page   Solo primera página por listado (debug).
 *   --no-export-frontend
 *   --no-prune
 */

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/categoryModel');
const productModel = require('../models/productModel');
const { syncVisionVipMirrorToMongo } = require('../services/visionVipSyncService');
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
    const envOk = process.env.CONFIRM_VISAO_FULL_PURGE === 'yes';
    const cliOk = has('--confirm-purge');
    if (!envOk && !cliOk) {
        console.error(`
[visao-purge] Abortado.

Esta operación borra todos los productos y categorías. Para ejecutar:

  CONFIRM_VISAO_FULL_PURGE=yes node scripts/visao-purge-and-full-mirror.js --confirm-purge

Recomendado: snapshot/backup en MongoDB Atlas antes.
`);
        process.exit(1);
    }

    console.log('[visao-purge] Inicio', new Date().toISOString());
    await connectDB();

    const persistConcurrency = Math.min(24, Math.max(1, numArg('--persist-concurrency', 12)));

    console.log('[visao-purge] Borrando productos…');
    const pr = await productModel.deleteMany({});
    console.log(`[visao-purge] Productos eliminados: ${pr.deletedCount}`);

    console.log('[visao-purge] Borrando categorías…');
    const cr = await Category.deleteMany({});
    console.log(`[visao-purge] Categorías eliminadas: ${cr.deletedCount}`);

    const capped =
        optNumArg('--mirror-max-listings', null) != null ||
        optNumArg('--max-product-urls', null) != null ||
        has('--mirror-single-page');

    const mirrorMaxListings = capped ? optNumArg('--mirror-max-listings', null) : null;
    const maxProductUrls = capped ? optNumArg('--max-product-urls', null) : null;

    const mirrorScrapeOpts = {
        maxListings: mirrorMaxListings,
        singlePageListing: has('--mirror-single-page'),
        maxProductUrls,
        detailConcurrency: Math.min(
            12,
            Math.max(1, Math.round(numArg('--detail-concurrency', 2)))
        ),
        listingConcurrency: Math.min(
            6,
            Math.max(1, Math.round(numArg('--listing-concurrency', 1)))
        )
    };

    console.log('[visao-purge] Iniciando sync espejo completo…', mirrorScrapeOpts);

    const pricing = await getPricingSettings();
    const deliveryCostCli = optNumArg('--delivery-cost', null);
    const profitMarginCli = optNumArg('--profit-margin', null);
    const deliveryCost = deliveryCostCli != null ? deliveryCostCli : pricing.deliveryCost;
    const profitMargin = Math.min(
        100,
        Math.max(0, Math.round(profitMarginCli != null ? profitMarginCli : pricing.profitMargin))
    );

    try {
        const report = await syncVisionVipMirrorToMongo({
            resetCatalog: false,
            persistConcurrency,
            cleanupMissingStock: has('--cleanup-missing'),
            deliveryCost,
            profitMargin,
            mirrorScrapeOpts,
            maxImagesPerProduct: Math.round(numArg('--max-images-per-product', 8)),
            mirrorPrune: !has('--no-prune'),
            exportFrontendProductCategoryJs: !has('--no-export-frontend')
        });
        console.log('[visao-purge] Terminado. Resumen:', JSON.stringify(report.mirrorSummary, null, 2));
    } finally {
        await mongoose.connection.close().catch(() => {});
        console.log('[visao-purge] Fin', new Date().toISOString());
    }
}

main().catch((err) => {
    console.error('[visao-purge] Error:', err);
    process.exit(1);
});
