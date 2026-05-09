/**
 * Prueba acotada: N productos desde filas del menú filtradas (sin escribir en Mongo).
 *
 * Uso (desde `backend/`):
 *   node scripts/debug-mirror-taxonomy-sample.js
 *
 * Opcional:
 *   MONITORS_N=3 HD_EXT_N=3 node scripts/debug-mirror-taxonomy-sample.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const puppeteer = require('puppeteer');
const {
    getLaunchOptions,
    collectProductUrlsForCategory,
    scrapeProductDetailsParallel
} = require('../services/visionVipScraperService');
const { collectMenuHierarchy } = require('../services/visionVipMirrorScrapeService');
const { buildVisaoTaxonomyForProduct } = require('../services/visionVipSyncService');

const N_MONITOR = Number(process.env.MONITORS_N) > 0 ? Number(process.env.MONITORS_N) : 3;
const N_HDEXT = Number(process.env.HD_EXT_N) > 0 ? Number(process.env.HD_EXT_N) : 3;

/** Descubierto desde listados anidados: Almacenamiento → HD → HD Externo (el mega menú a veces no expone migas largas). */
const HD_EXTERNO_KNOWN_LISTING_DEFAULT =
    'https://www.visaovip.com/es/busca/categoria/hd-externo/21-02-02/';

/** Listado raíz singular “Monitor” visto en Visaovip /es/ (equivalente práctico a “Monitores”). */
const MONITOR_KNOWN_LISTING_DEFAULT =
    'https://www.visaovip.com/es/busca/categoria/monitor/19-07/';

function norm(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function slugifyLabel(text) {
    if (!text || typeof text !== 'string') return 'item';
    let s = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    return (s || 'item').slice(0, 80);
}

function buildLeafListingValue(leafLabel, listingId) {
    const slug = slugifyLabel(String(leafLabel || '').trim());
    const idSafe = String(listingId || '').replace(/[^a-z0-9]+/gi, '_');
    if (!slug && !idSafe) return 'item';
    if (!idSafe) return slug || 'item';
    return `${slug || 'cat'}__${idSafe}`;
}

/** Fila metadatos igual que `collectMenuHierarchy` cuando el sidebar no muestra niveles intermedios. */
function syntheticSingleLevelListingRow(listingUrl, label) {
    const u = String(listingUrl || '').trim().split('?')[0];
    const idPart = (u.match(/\/categoria\/[^/]+\/([^/?#]+)/i) || [, ''])[1];
    const lb = String(label || 'Categoría').trim();
    return {
        listingUrl: u,
        categoryLabel: lb,
        categoryValue: slugifyLabel(lb),
        subcategoryLabel: lb,
        subcategoryValue: buildLeafListingValue(lb, idPart),
        taxonomyPathLabels: [lb],
        taxonomyPathValues: [buildLeafListingValue(lb, idPart)],
        breadcrumbTrail: lb,
        isTarget: true,
        _syntheticPath: true
    };
}

function syntheticHdExternoListingRow(listingUrl, labelsCsv) {
    const u = String(listingUrl || '').trim().split('?')[0];
    const idPart = (u.match(/\/categoria\/[^/]+\/([^/?#]+)/i) || [, ''])[1];
    const labs = String(labelsCsv || 'Almacenamiento › HD › HD Externo')
        .split(/›|%E2%80%BA/g)
        .map((s) => s.trim())
        .filter(Boolean);
    const rootLb = labs[0] || 'Almacenamiento';
    const leafLb = labs[labs.length - 1] || 'HD Externo';
    return {
        listingUrl: u,
        categoryLabel: rootLb,
        categoryValue: slugifyLabel(rootLb),
        subcategoryLabel: leafLb,
        subcategoryValue: buildLeafListingValue(leafLb, idPart),
        taxonomyPathLabels: labs,
        taxonomyPathValues: labs.map((lbl, idx) =>
            idx === labs.length - 1
                ? buildLeafListingValue(leafLb, idPart)
                : `${slugifyLabel(lbl)}__lvl${idx}`
        ),
        breadcrumbTrail: labs.join(' › '),
        isTarget: true,
        _syntheticPath: true
    };
}

function leafLabel(row) {
    const labs = row.taxonomyPathLabels || [];
    if (!labs.length) return '';
    return String(labs[labs.length - 1] || '').trim();
}

function pickMonitorsRow(rows) {
    const cands = rows.filter((r) => {
        const labs = r.taxonomyPathLabels || [];
        if (!labs.length) return false;
        const leaf = norm(leafLabel(r));
        if (!/monitor/.test(leaf)) return false;
        /** Una sola hoja típica "Monitores" / variantes cercanas sin meter "Monitor gamer" falsos positivos grandes */
        if (labs.length === 1) return true;
        return leaf === norm('Monitores') || leaf.endsWith('monitores') || /^monitors?$/.test(leaf);
    });
    /** Preferir hoja estable con menor profundidad (listado general Monitores) */
    cands.sort((a, b) => (a.taxonomyPathLabels || []).length - (b.taxonomyPathLabels || []).length);
    return cands[0] || null;
}

function pickHdExternoRow(rows) {
    /** Ruta esperada: Almacenamiento* › *HD* › *HD Externo* (Visão a veces acorta nombres en el menú). */
    const cands = rows.filter((r) => {
        const raw = r.taxonomyPathLabels || [];
        if (raw.length < 3) return false;
        const labs = raw.map(norm);
        const last = labs[labs.length - 1];
        if (!last.includes('externo')) return false;
        const mid = labs[labs.length - 2];
        if (mid !== 'hd' && !mid.startsWith('hd ')) return false;
        const root = labs[0];
        return root.includes('almacen');
    });
    if (cands.length) {
        cands.sort((a, b) => (b.taxonomyPathLabels || []).length - (a.taxonomyPathLabels || []).length);
        return cands[0];
    }
    /** Respaldo: cualquier hoja con “externo” bajo rama de almacenamiento + “hd” en la ruta. */
    const loose = rows.filter((r) => {
        const labs = (r.taxonomyPathLabels || []).map(norm);
        if (labs.length < 2) return false;
        if (!labs[labs.length - 1].includes('externo')) return false;
        const joined = labs.join(' ');
        return joined.includes('almacen') && joined.includes('hd');
    });
    loose.sort((a, b) => (b.taxonomyPathLabels || []).length - (a.taxonomyPathLabels || []).length);
    return loose[0] || null;
}

function mergeLikeMirror(pdp, meta) {
    const tech =
        pdp.especificaciones && typeof pdp.especificaciones === 'object'
            ? { ...pdp.especificaciones }
            : {};
    return {
        ...pdp,
        technicalSpecifications: tech,
        _categoryValue: meta.categoryValue,
        _categoryLabel: meta.categoryLabel,
        _subcategoryValue: meta.subcategoryValue,
        _subcategoryLabel: meta.subcategoryLabel,
        _listingUrl: meta.listingUrl,
        _taxonomyPathLabels: meta.taxonomyPathLabels,
        _taxonomyPathValues: meta.taxonomyPathValues,
        _pdpBreadcrumbLabels: pdp.pdpBreadcrumbLabels || [],
        _isLeafCategoryNode: meta.isTarget === true,
        _isTargetCategoryNode: meta.isTarget === true
    };
}

/** Campos tipo documento Mongo que reflejan taxonomía (sin crear producto ni precios financieros reales aquí). */
function mongoTaxonomyProjection(scraped) {
    const visaoTaxonomy = buildVisaoTaxonomyForProduct(scraped);
    const leafViaMenu = scraped._taxonomyPathLabels?.length
        ? scraped._taxonomyPathLabels[scraped._taxonomyPathLabels.length - 1]
        : '';
    return {
        category: scraped._categoryValue,
        subcategory: scraped._subcategoryValue,
        visaoTaxonomy,
        /** Verificación rápida: hoja desde menú vs último PDP */
        verificacion: {
            hoja_etiqueta_menú: scraped._subcategoryLabel || leafViaMenu || null,
            hoja_etiqueta_pdp_visaoTaxonomy:
                Array.isArray(visaoTaxonomy.hierarchy) && visaoTaxonomy.hierarchy.length
                    ? visaoTaxonomy.hierarchy[visaoTaxonomy.hierarchy.length - 1]
                    : visaoTaxonomy.leafLabel || null,
            listado_origen: scraped._listingUrl || null,
            sku_visao_proveedor:
                scraped.supplierCode != null ? scraped.supplierCode : scraped.codigo || null,
            nombre_producto: scraped.titulo || null,
            tiene_migas_pdp: (scraped._pdpBreadcrumbLabels || scraped.pdpBreadcrumbLabels || []).length > 0
        }
    };
}

async function runListing(browser, row, budget) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    try {
        return await collectProductUrlsForCategory(page, row.listingUrl, {
            urlBudget: budget,
            /** Paginar si hace falta para reunir N URLs reales. */
            singlePageOnly: false
        });
    } finally {
        await page.close().catch(() => {});
    }
}

async function main() {
    let monSyntheticFallback = false;
    const browser = await puppeteer.launch(getLaunchOptions());

    console.log('[taxisample] Extrayendo menú (collectMenuHierarchy)…');
    const menuPage = await browser.newPage();
    await menuPage.setViewport({ width: 1366, height: 900 });
    let menuRows;
    try {
        menuRows = await collectMenuHierarchy(menuPage);
    } finally {
        await menuPage.close().catch(() => {});
    }

    const canonList = (u) => String(u || '').split('?')[0];

    let monRow = pickMonitorsRow(menuRows);
    if (!monRow) {
        console.warn('[taxisample] Sin fila “monitor” en sidebar; usando listado monitor/19-07 como respaldo.');
        monRow = syntheticSingleLevelListingRow(MONITOR_KNOWN_LISTING_DEFAULT, 'Monitor');
        monSyntheticFallback = true;
    }
    let hdRow = pickHdExternoRow(menuRows);

    const report = {
        menuRowCount: menuRows.length,
        picked: {},
        muestras_mongo_taxonomia: []
    };

    if (monSyntheticFallback) {
        console.warn(
            '[taxisample] Monitores: fila sintética porque el sidebar no trajo listado esperado.'
        );
    }

    /** Enlaces relacionados cuando el texto del menú no coincide con “HD Externo”. */
    const altHdExterno = menuRows.filter((r) => {
        const j = JSON.stringify(r.taxonomyPathLabels || []).toLowerCase();
        return j.includes('externo') || j.includes('external');
    });

    report.fallbackHdExternoLike = altHdExterno.slice(0, 12).map((r) => ({
        listingUrl: r.listingUrl,
        taxonomyPathLabels: r.taxonomyPathLabels
    }));

    if (!hdRow && altHdExterno.length) {
        hdRow =
            [...altHdExterno]
                .map((r) => {
                    const labs = (r.taxonomyPathLabels || []).join(' ').toLowerCase();
                    let score = 0;
                    if (labs.includes('extern')) score += 5;
                    if (labs.includes('almacen')) score += 5;
                    if (labs.includes('hd')) score += 3;
                    score += (r.taxonomyPathLabels || []).length;
                    return { r, score };
                })
                .sort((a, b) => b.score - a.score)[0]?.r || null;
        if (hdRow) {
            report.hd_externo_source = 'menu_sugerencias';
        }
    }

    if (!hdRow && process.env.VISAO_HD_EXTERN_LISTING) {
        try {
            hdRow = syntheticHdExternoListingRow(process.env.VISAO_HD_EXTERN_LISTING, process.env.VISAO_HD_EXTERN_LABELS);
            report.hd_externo_source = 'env_listing_url';
        } catch (_) {
            /* omit */
        }
    }

    if (!hdRow) {
        hdRow = syntheticHdExternoListingRow(
            HD_EXTERNO_KNOWN_LISTING_DEFAULT,
            process.env.VISAO_HD_EXTERN_LABELS || 'Almacenamiento › HD › HD Externo'
        );
        if (!report.hd_externo_source) {
            report.hd_externo_source = 'known_default_hd_externo_21_02_02';
        }
    }

    if (!altHdExterno.length) {
        console.warn(
            '[taxisample] El menú mostró ninguna etiqueta externo/external; si la filaHD viene del sidebar, será “menu_o_sugerencias”; si es sintética, ver picked.hd_externo_sintetico.'
        );
    }

    /** Origen si aún sin marcar */
    if (!Object.prototype.hasOwnProperty.call(report, 'hd_externo_source')) {
        report.hd_externo_source =
            hdRow && hdRow._syntheticPath ? 'synthetic_url' : hdRow ? 'menu_sidebar' : null;
    }

    /** Metadatos finales escogidos antes de PDP. */
    report.picked = {
        monitores_listingUrl: monRow?.listingUrl || null,
        monitores_taxonomyPathLabels: monRow?.taxonomyPathLabels || null,
        monitores_sintetico: monSyntheticFallback || !!(monRow && monRow._syntheticPath),
        hd_externo_listingUrl: hdRow?.listingUrl || null,
        hd_externo_taxonomyPathLabels: hdRow?.taxonomyPathLabels || null,
        hd_externo_sintetico: !!(hdRow && hdRow._syntheticPath),
        hd_externo_source: report.hd_externo_source
    };

    /** Un mismo SKU puede estar en más de un listado: scrape por bloque sin dedupe cruzado. */
    const bundleJobs =
        ([]).concat(monRow ? [{ row: monRow, caso: 'monitores', cap: N_MONITOR }] : []).concat(
            hdRow ? [{ row: hdRow, caso: 'almacenamiento_hd_hd_externo', cap: N_HDEXT }] : []
        );

    const rawWithCaso = [];
    for (const job of bundleJobs) {
        const urlsRaw = await runListing(browser, job.row, job.cap);
        /** @type {string[]} */
        const unq = [];
        const seenUrl = new Set();
        for (const u of urlsRaw || []) {
            const abs = canonList(u);
            if (!abs || seenUrl.has(abs)) continue;
            seenUrl.add(abs);
            unq.push(abs);
            if (unq.length >= job.cap) break;
        }
        report[`urls_listado_${job.caso}`] = [...unq];
        if (!unq.length) {
            console.warn(`[taxisample] Sin PDP en listado (${job.caso}) ${job.row.listingUrl}`);
            continue;
        }

        console.log(`[taxisample] PDP bloque "${job.caso}": ${unq.length}. Concurrencia 3…`);
        /* eslint-disable no-await-in-loop */
        const rawBatch = await scrapeProductDetailsParallel(browser, unq, {
            preview: false,
            concurrency: Math.min(3, unq.length || 1)
        });
        for (const p of rawBatch) {
            rawWithCaso.push({ caso: job.caso, p, metaRow: job.row });
        }
    }

    await browser.close().catch(() => {});

    if (!rawWithCaso.length) {
        console.log(JSON.stringify({ error: 'sin_urls_productos', ...report }, null, 2));
        process.exit(2);
    }

    for (const { caso, p, metaRow } of rawWithCaso) {
        if (!p || p.error || p.precioUsd == null) continue;
        const merged = mergeLikeMirror(p, metaRow);

        report.muestras_mongo_taxonomia.push({
            caso,
            projection: mongoTaxonomyProjection(merged)
        });
    }

    console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
