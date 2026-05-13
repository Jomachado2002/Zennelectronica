// GET de prueba: scraping Visão Vip (JSON o persistencia Mongo + Firebase).

const { scrapeVisionVipCatalog } = require('../../services/visionVipScraperService');
const {
    syncVisionVipCatalogToMongo,
    syncVisionVipMirrorToMongo
} = require('../../services/visionVipSyncService');

/** Para logs y JSON: duración legible (p. ej. 3h 58m 12s). */
function formatDurationMs(ms) {
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

const PRICE_FIELD_SET = new Set([
    'sellingPrice',
    'purchasePriceUSD',
    'purchasePrice',
    'profitMargin',
    'profitAmount',
    'deliveryCost',
    'exchangeRate',
    'price'
]);

/**
 * Resumen legible para operadores: stock cleanup, altas, y cuántos `updated`
 * tocaron precio, nombre, descripción, imágenes, specs o stock al volver del PDP.
 */
function buildVisaoMirrorResumenDetallado(report, timing) {
    const results = report.persistResults || [];
    const ms = report.mirrorSummary || {};
    const byAction = { created: 0, updated: 0, skipped: 0, error: 0 };
    const tipo = {
        updatedConCambioPrecio: 0,
        updatedConCambioNombre: 0,
        updatedConCambioDescripcion: 0,
        updatedConCambioImagenes: 0,
        updatedConCambioSpecs: 0,
        updatedConCambioStockOEstado: 0
    };

    for (const r of results) {
        if (r.action && Object.prototype.hasOwnProperty.call(byAction, r.action)) {
            byAction[r.action] += 1;
        }
        if (r.action !== 'updated' || !Array.isArray(r.changedFields)) continue;
        const cf = new Set(r.changedFields);
        if ([...cf].some((f) => PRICE_FIELD_SET.has(f))) tipo.updatedConCambioPrecio += 1;
        if (cf.has('productName')) tipo.updatedConCambioNombre += 1;
        if (cf.has('description')) tipo.updatedConCambioDescripcion += 1;
        if (cf.has('productImage')) tipo.updatedConCambioImagenes += 1;
        if (cf.has('technicalSpecifications') || cf.has('specifications')) tipo.updatedConCambioSpecs += 1;
        if (cf.has('stock') || cf.has('stockStatus')) tipo.updatedConCambioStockOEstado += 1;
    }

    const rec = report.reconciliation || {};

    return {
        timing,
        accionesPersistencia: byAction,
        productosNuevosCreados: byAction.created,
        productosExistentesActualizados: byAction.updated,
        productosOmitidos: byAction.skipped,
        erroresPersistencia: byAction.error,
        productosMarcadosStockCeroPorAusenteEnScrape: report.stockCleanupCount ?? 0,
        skuDistintosEnCatalogoDelScrape: rec.catalogSkuCount ?? (report.scrapedCodigosEnCatalog?.length ?? 0),
        skuPersistidosOk: rec.persistedSkuCount ?? null,
        skuEnCatalogoPeroNoPersistidos: rec.catalogSkusNotPersistedCount ?? null,
        actualizacionesPorTipo: tipo,
        conteoDriftPorCampo: ms.updatesByChangedField || {},
        omitidosPorRazon: ms.skippedByReason || {},
        fallosImportImagenes: ms.imageImportFailures ?? 0,
        nota:
            'updatedConCambio* cuenta documentos donde ese aspecto figuró en changedFields (puede solaparse: un mismo producto puede sumar en varios). productosMarcadosStockCeroPorAusenteEnScrape = visao_vip cuyo codigo no estaba en ESTE scrape con cleanup activo.'
    };
}

function parsePositiveInt(queryVal, fallback) {
    const n = parseInt(queryVal, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function visionVipScraperTest(req, res) {
    const wallStartedAt = Date.now();
    const wallIsoStart = new Date(wallStartedAt).toISOString();
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
            console.log(
                `[Visão API] mirrorSync + persist → syncVisionVipMirrorToMongo (inicio petición ${wallIsoStart})`
            );
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

            const wallMs = Date.now() - wallStartedAt;
            const timing = {
                requestStartedAt: wallIsoStart,
                requestFinishedAt: new Date().toISOString(),
                wallClockMs: wallMs,
                wallClockHuman: formatDurationMs(wallMs),
                mirrorSummaryDurationMs: report.mirrorSummary?.durationMs ?? null
            };
            const rec = report.reconciliation || {};
            const resumenDetallado = buildVisaoMirrorResumenDetallado(report, timing);
            console.log(
                `[Visão API][mirror] Fin petición HTTP wallClock=${wallMs}ms (${formatDurationMs(
                    wallMs
                )}) | mirrorSummary.durationMs=${report.mirrorSummary?.durationMs ?? 'n/a'} | creados=${report.mirrorSummary?.productsCreated} actualizados=${report.mirrorSummary?.productsUpdated} omitidos=${report.mirrorSummary?.productsSkipped} errores=${report.mirrorSummary?.productsErrors} stockCleanup=${report.stockCleanupCount ?? 0}`
            );
            console.log('[Visão API][mirror] resumenDetallado', JSON.stringify(resumenDetallado));

            return res.json({
                success: true,
                timing,
                resumenDetallado,
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
                validacionCasos: {
                    nuevoEnVisaoNoEnDb:
                        'Si el PDP se scrapea bien (precio USD válido, sin error) y no hay documento con ese codigo → se crea (action created en persistResults).',
                    enDbVisaoFueraDelScrape: rec.cleanupApplied
                        ? 'Documentos syncSource visao_vip cuyo codigo no está en scrapedCodigosEnCatalog → stock 0 y stockStatus out_of_stock (ver stockCleanupCount).'
                        : !cleanupMissingStock
                          ? 'cleanupMissingStock=false: no se ajusta stock por ausencia en el último scrape.'
                          : 'Cleanup no ejecutado: catálogo SKU vacío o productsAttempted=0 (protección ante scrape vacío o fallido).',
                    mismosCampos:
                        'Cada persist exitoso alinea productName, description, technicalSpecifications/specifications, productImage (reimport Firebase o fallback URL), precios derivados, categoría/sub y stock in_stock. Lo que coincide con el PDP queda igual en valor; drift se loguea en servidor ([MIRROR] difería…).',
                    deteccionCambiosEnRespuesta:
                        'Tras la corrida, report.mirrorSummary.updatesByChangedField resume cuántos productos updated tuvieron drift por campo (p. ej. productName, sellingPrice). Cada ítem persistResults con action updated incluye changedFields.',
                    skuEnListadoPeroPersistFallo:
                        rec.catalogSkusNotPersistedCount > 0
                            ? `Atención: ${rec.catalogSkusNotPersistedCount} SKU(s) aparecieron en el catálogo del scrape pero no quedaron created/updated (revisar persistResults y reconciliation.catalogSkusNotPersistedSample). No se les pone stock 0 por cleanup porque siguen "presentes" en el listado scrapeado.`
                            : 'Ningún SKU del catálogo quedó sin persistencia exitosa (o el scrape no devolvió códigos).',
                    notaInventorySyncCsv:
                        'POST /api/admin/inventory-sync/compare-by-* compara contra CSV importado, no contra Visao en vivo; el cruce diario con Visao es este mirror (visaovip-catalog + mirrorSync).'
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
            console.log(
                `[Visão API] Persist=1 → syncVisionVipCatalogToMongo (legado) inicio ${wallIsoStart}`
            );
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

            const wallMs = Date.now() - wallStartedAt;
            const timing = {
                requestStartedAt: wallIsoStart,
                requestFinishedAt: new Date().toISOString(),
                wallClockMs: wallMs,
                wallClockHuman: formatDurationMs(wallMs),
                mirrorSummaryDurationMs: report.mirrorSummary?.durationMs ?? null
            };
            console.log(
                `[Visão API][legado] Fin petición wallClock=${wallMs}ms (${formatDurationMs(wallMs)}) | creados=${report.mirrorSummary?.productsCreated} actualizados=${report.mirrorSummary?.productsUpdated}`
            );

            return res.json({
                success: true,
                timing,
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

        const wallMs = Date.now() - wallStartedAt;
        const timing = {
            requestStartedAt: wallIsoStart,
            requestFinishedAt: new Date().toISOString(),
            wallClockMs: wallMs,
            wallClockHuman: formatDurationMs(wallMs)
        };
        console.log(`[Visão API][preview/json] wallClock=${wallMs}ms (${formatDurationMs(wallMs)})`);

        res.json({
            success: true,
            timing,
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
        const wallMs = Date.now() - wallStartedAt;
        console.error(
            `[Visão API] Error tras ${wallMs}ms (${formatDurationMs(wallMs)}):`,
            err && err.message ? err.message : err
        );
        res.status(500).json({
            success: false,
            message: err.message || 'Error en scraper Visão Vip',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            timing: {
                requestStartedAt: wallIsoStart,
                requestFinishedAt: new Date().toISOString(),
                wallClockMs: wallMs,
                wallClockHuman: formatDurationMs(wallMs)
            }
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
