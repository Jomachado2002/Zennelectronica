'use strict';

/**
 * Sync programado del mirror Visão (mismo motor que GET /api/test-routes/visaovip-catalog?persist=1&mirrorSync=1&full=1).
 * Solo arranca si VISAO_MIRROR_SCHEDULE_ENABLED=1 (servidor Node de larga duración; no usar en serverless sin saberlo).
 */

const { syncVisionVipMirrorToMongo } = require('./visionVipSyncService');

function truthy(v) {
    return v === '1' || v === 'true' || v === 'yes';
}

function parseMs(name, def) {
    const n = parseInt(process.env[name] || String(def), 10);
    return Number.isFinite(n) && n >= 0 ? n : def;
}

function formatWallHuman(ms) {
    if (!Number.isFinite(ms) || ms < 0) return '0s';
    const sec = Math.floor(ms / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m || h) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

function buildOptsFromEnv() {
    const maxListingsRaw = process.env.VISAO_SCHEDULE_MIRROR_MAX_LISTINGS;
    const maxProductUrlsRaw = process.env.VISAO_SCHEDULE_MIRROR_MAX_PRODUCT_URLS;
    return {
        resetCatalog: truthy(process.env.VISAO_SCHEDULE_RESET_CATALOG),
        persistConcurrency: Math.min(24, Math.max(1, parseMs('VISAO_SCHEDULE_PERSIST_CONCURRENCY', 10))),
        mirrorScrapeOpts: {
            maxListings:
                maxListingsRaw != null && maxListingsRaw !== ''
                    ? Math.min(5000, Math.max(1, parseInt(maxListingsRaw, 10)))
                    : null,
            singlePageListing: truthy(process.env.VISAO_SCHEDULE_MIRROR_SINGLE_PAGE),
            maxProductUrls:
                maxProductUrlsRaw != null && maxProductUrlsRaw !== ''
                    ? Math.min(200000, Math.max(1, parseInt(maxProductUrlsRaw, 10)))
                    : null,
            detailConcurrency: Math.min(12, Math.max(1, parseMs('VISAO_SCHEDULE_MIRROR_DETAIL_CONCURRENCY', 6))),
            listingConcurrency: Math.min(8, Math.max(1, parseMs('VISAO_SCHEDULE_MIRROR_LISTING_CONCURRENCY', 2)))
        },
        deliveryCost: parseMs('VISAO_SCHEDULE_DELIVERY_COST', 0),
        profitMargin: Math.min(100, Math.max(0, parseMs('VISAO_SCHEDULE_PROFIT_MARGIN', 20))),
        cleanupMissingStock: !(
            process.env.VISAO_SCHEDULE_CLEANUP_MISSING_STOCK === '0' ||
            process.env.VISAO_SCHEDULE_CLEANUP_MISSING_STOCK === 'false'
        ),
        mirrorStrict: !(
            process.env.VISAO_SCHEDULE_MIRROR_STRICT === '0' ||
            process.env.VISAO_SCHEDULE_MIRROR_STRICT === 'false'
        ),
        mirrorPrune: !(
            process.env.VISAO_SCHEDULE_MIRROR_PRUNE === '0' ||
            process.env.VISAO_SCHEDULE_MIRROR_PRUNE === 'false'
        ),
        exportFrontendProductCategoryJs: truthy(process.env.VISAO_SCHEDULE_EXPORT_FRONTEND)
    };
}

let intervalHandle = null;
let running = false;

async function runScheduledMirrorOnce(label) {
    if (running) {
        console.warn('[Visão schedule] Corrida anterior aún en curso; se omite esta invocación.');
        return;
    }
    running = true;
    const t0 = Date.now();
    const isoStart = new Date(t0).toISOString();
    console.log(`[Visão schedule][${label}] Inicio mirror ${isoStart}`);
    try {
        const report = await syncVisionVipMirrorToMongo(buildOptsFromEnv());
        const wallMs = Date.now() - t0;
        const s = report.mirrorSummary || {};
        console.log(
            `[Visão schedule][${label}] Fin OK wallClock=${wallMs}ms (${formatWallHuman(
                wallMs
            )}) | creados=${s.productsCreated} actualizados=${s.productsUpdated} omitidos=${s.productsSkipped} errores=${s.productsErrors} stockCleanup=${report.stockCleanupCount ?? 0}`
        );
    } catch (err) {
        console.error(
            `[Visão schedule][${label}] Error tras ${Date.now() - t0}ms:`,
            err && err.message ? err.message : err
        );
    } finally {
        running = false;
    }
}

function startVisaoMirrorScheduleIfEnabled() {
    if (!truthy(process.env.VISAO_MIRROR_SCHEDULE_ENABLED)) {
        console.log(
            '[Visão schedule] Desactivado. Sync automático: definí VISAO_MIRROR_SCHEDULE_ENABLED=1 (y opcional VISAO_MIRROR_SCHEDULE_INTERVAL_MS, VISAO_MIRROR_SCHEDULE_INITIAL_DELAY_MS).'
        );
        return;
    }
    if (intervalHandle) return;

    const intervalMs = Math.max(3600000, parseMs('VISAO_MIRROR_SCHEDULE_INTERVAL_MS', 86400000));
    const initialDelayMs = parseMs('VISAO_MIRROR_SCHEDULE_INITIAL_DELAY_MS', 180000);

    console.log(
        `[Visão schedule] Activado: primera corrida en ${initialDelayMs}ms (~${(initialDelayMs / 60000).toFixed(
            1
        )} min), luego cada ${intervalMs}ms (~${(intervalMs / 3600000).toFixed(1)} h).`
    );

    setTimeout(async () => {
        await runScheduledMirrorOnce('inicial');
        intervalHandle = setInterval(() => runScheduledMirrorOnce('intervalo'), intervalMs);
    }, initialDelayMs);
}

module.exports = {
    startVisaoMirrorScheduleIfEnabled,
    runScheduledMirrorOnce
};
