// GET de prueba: scraping Visão Vip (JSON o persistencia Mongo + Firebase).

const { scrapeVisionVipCatalog } = require('../../services/visionVipScraperService');
const {
    syncVisionVipCatalogToMongo,
    syncVisionVipMirrorToMongo
} = require('../../services/visionVipSyncService');

function parsePositiveInt(queryVal, fallback) {
    const n = parseInt(queryVal, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function visionVipScraperTest(req, res) {
    try {
        const full =
            req.query.full === '1' ||
            req.query.full === 'true' ||
            req.query.full === 'yes';

        const persist =
            req.query.persist === '1' ||
            req.query.persist === 'true' ||
            req.query.persist === 'yes';

        const mirrorSync =
            req.query.mirrorSync === '1' ||
            req.query.mirrorSync === 'true' ||
            req.query.fullMirror === '1';

        const resetCatalog =
            req.query.resetCatalog === '1' || req.query.resetCatalog === 'true';

        /** Mirror completo (persist + mirrorSync): por defecto quita stock a SKUs fuera del último scrape */
        let cleanupMissingStock =
            req.query.cleanupMissingStock === '1' ||
            req.query.cleanupMissingStock === 'true';
        if (persist && mirrorSync) {
            cleanupMissingStock = !(
                req.query.cleanupMissingStock === '0' ||
                req.query.cleanupMissingStock === 'false'
            );
        }

        /** Texto PDP (descripción/nombre desde título ya siempre igual al scrape OK) igual al proveedor sin conservar valores viejos */
        const mirrorStrict = !(
            req.query.mirrorStrict === '0' || req.query.mirrorStrict === 'false'
        );

        const previewMode =
            !full &&
            req.query.preview !== '0' &&
            req.query.preview !== 'false' &&
            req.query.deep !== '1' &&
            req.query.deep !== 'true';

        const maxCategories = parsePositiveInt(req.query.maxCategories, 2);

        let maxProductDetails;
        if (full) {
            maxProductDetails =
                req.query.maxProductDetails != null
                    ? parsePositiveInt(req.query.maxProductDetails, 9999)
                    : null;
        } else if (previewMode && req.query.maxProductDetails == null) {
            maxProductDetails = 12;
        } else if (!full) {
            maxProductDetails = parsePositiveInt(
                req.query.maxProductDetails,
                previewMode ? 12 : 30
            );
        }

        let urlsPerCategoryCap;
        if (!full && req.query.urlsPerCategoryCap != null) {
            urlsPerCategoryCap = parsePositiveInt(req.query.urlsPerCategoryCap, 120);
        } else if (!full && previewMode) {
            urlsPerCategoryCap = 48;
        } else if (!full && !previewMode) {
            urlsPerCategoryCap = null;
        } else {
            urlsPerCategoryCap = null;
        }

        let detailConcurrency;
        if (req.query.detailConcurrency != null && req.query.detailConcurrency !== '') {
            detailConcurrency = parsePositiveInt(
                req.query.detailConcurrency,
                previewMode ? 6 : 1
            );
        } else {
            detailConcurrency = previewMode ? 6 : 1;
        }

        const scrapeOpts = {
            maxCategories,
            maxProductDetails,
            urlsPerCategoryCap,
            previewMode,
            detailConcurrency
        };

        const deliveryCost = parsePositiveInt(req.query.deliveryCost, 0);

        let profitMargin = parsePositiveInt(req.query.profitMargin, 20);
        if (!Number.isFinite(profitMargin) || profitMargin < 0 || profitMargin > 100) {
            profitMargin = 20;
        }

        const persistConcurrency = parsePositiveInt(req.query.persistConcurrency, 10);

        if (persist && mirrorSync) {
            console.log('[Visão API] mirrorSync + persist → syncVisionVipMirrorToMongo');
            const mirrorScrapeOpts = {
                maxListings:
                    req.query.mirrorMaxListings != null
                        ? parsePositiveInt(req.query.mirrorMaxListings, 500)
                        : null,
                singlePageListing:
                    req.query.mirrorSinglePage === '1' ||
                    req.query.mirrorSinglePage === 'true',
                maxProductUrls:
                    req.query.mirrorMaxProductUrls != null
                        ? parsePositiveInt(req.query.mirrorMaxProductUrls, 100000)
                        : null,
                detailConcurrency: parsePositiveInt(req.query.mirrorDetailConcurrency, 6),
                listingConcurrency: parsePositiveInt(req.query.mirrorListingConcurrency, 2)
            };

            const mirrorPrune =
                req.query.mirrorPrune !== '0' &&
                req.query.noMirrorPrune !== '1' &&
                req.query.skipPrune !== '1';
            const exportFrontendProductCategoryJs =
                req.query.exportFrontend === '1' ||
                req.query.exportFrontend === 'true' ||
                (req.query.noExportFrontend !== '1' && req.query.skipExportFrontend !== '1');

            const report = await syncVisionVipMirrorToMongo({
                resetCatalog,
                persistConcurrency,
                mirrorScrapeOpts,
                deliveryCost,
                profitMargin,
                cleanupMissingStock,
                mirrorStrict,
                mirrorPrune,
                exportFrontendProductCategoryJs
            });

            const persistedOk = report.persistResults.filter(
                (r) => r.action === 'created' || r.action === 'updated'
            ).length;

            return res.json({
                success: true,
                message:
                    'Mirror Visão (local): SKU = campo codigo. Si el SKU está en PDP del scrape → crea producto nuevo o actualiza nombre/descripcion/specs/imagen enlace y precio de venta (margen profitMargin sobre USD scrapeado). SKU syncSource visao_vip ausente de ESTE scrape y cleanupMissingStock=true → stock 0.',
                guarantees: {
                    identificador:
                        'Clave contra Visão es codigo (SKU); no coincide con Mongo _id',
                    stockCeroAusentes: cleanupMissingStock
                        ? 'Productos syncSource visao_vip con codigo no listado en las PDP de ESTA corrida → stock 0'
                        : 'Sin limpieza: cleanupMissingStock=0|false (no marca ausentes)',
                    textoEspejo: mirrorStrict
                        ? 'Título/descripcion/marca según PDP (mirrorStrict)'
                        : 'mirrorStrict=false: descripcion puede conservarse si PDP viene vacío',
                    crearTaxonomía:
                        'Categorías/subs necesarias para cada PDP se crean o amplían al persistir'
                },
                query: {
                    mirrorSync: true,
                    resetCatalog,
                    mirrorStrict,
                    mirrorPrune,
                    exportFrontendProductCategoryJs,
                    persistConcurrency,
                    cleanupMissingStock,
                    deliveryCost,
                    profitMargin,
                    mirrorScrapeOpts
                },
                report,
                summary: {
                    persistedOk,
                    errors: report.persistResults.filter((r) => r.action === 'error').length,
                    skipped: report.persistResults.filter((r) => r.action === 'skipped').length
                }
            });
        }

        if (persist) {
            console.log('[Visão API] Persist=1 → syncVisionVipCatalogToMongo (legado)');
            const report = await syncVisionVipCatalogToMongo({
                scrapeOpts,
                deliveryCost,
                profitMargin,
                cleanupMissingStock,
                resetCatalog,
                persistConcurrency
            });

            const persistedOk = report.persistResults.filter(
                (r) => r.action === 'created' || r.action === 'updated'
            ).length;

            return res.json({
                success: true,
                message:
                    'Scrape + persistencia Visão Vip (Firebase Storage + MongoDB)',
                query: {
                    maxCategories,
                    maxProductDetails,
                    full: !!full,
                    previewMode,
                    detailConcurrency,
                    urlsPerCategoryCap,
                    persist: true,
                    resetCatalog,
                    cleanupMissingStock,
                    deliveryCost,
                    profitMargin,
                    persistConcurrency
                },
                report,
                summary: {
                    persistedOk,
                    errors: report.persistResults.filter((r) => r.action === 'error').length,
                    skipped: report.persistResults.filter((r) => r.action === 'skipped').length
                }
            });
        }

        const data = await scrapeVisionVipCatalog(scrapeOpts);

        res.json({
            success: true,
            message:
                previewMode && !full
                    ? 'Scrape Visão Vip (preview). persist=1 guarda; persist=1&mirrorSync=1 espejo completo.'
                    : 'Scrape Visão Vip (solo JSON).',
            query: {
                maxCategories,
                maxProductDetails,
                full: !!full,
                previewMode,
                detailConcurrency,
                urlsPerCategoryCap,
                persist: false
            },
            data
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || 'Error en scraper Visão Vip',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
}

async function visionVipSyncQuickTest(req, res) {
    if (req.query.persist == null) req.query.persist = '1';
    if (req.query.maxProductDetails == null) req.query.maxProductDetails = '5';
    if (req.query.cleanupMissingStock == null) req.query.cleanupMissingStock = '0';
    return visionVipScraperTest(req, res);
}

/** Full mirror acotado para prueba (1 página listado, pocos PDP). */
async function visionVipMirrorQuickTest(req, res) {
    req.query.persist = '1';
    req.query.mirrorSync = '1';
    req.query.resetCatalog = req.query.resetCatalog ?? '0';
    if (req.query.cleanupMissingStock == null) req.query.cleanupMissingStock = '1';
    if (req.query.mirrorMaxProductUrls == null) req.query.mirrorMaxProductUrls = '8';
    if (req.query.mirrorSinglePage == null) req.query.mirrorSinglePage = '1';
    if (req.query.mirrorMaxListings == null) req.query.mirrorMaxListings = '3';
    if (req.query.persistConcurrency == null) req.query.persistConcurrency = '6';
    return visionVipScraperTest(req, res);
}

module.exports = {
    visionVipScraperTest,
    visionVipSyncQuickTest,
    visionVipMirrorQuickTest
};
