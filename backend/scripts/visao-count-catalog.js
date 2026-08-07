#!/usr/bin/env node
/**
 * Conteo Visão (SIN persistir en Mongo): menú + URLs de producto.
 * Uso: node scripts/visao-count-catalog.js
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const puppeteer = require('puppeteer');
const {
    getLaunchOptions,
    collectProductUrlsForCategory
} = require('../services/visionVipScraperService');
const { collectMenuHierarchy } = require('../services/visionVipMirrorScrapeService');

function syncLog(...args) {
    const util = require('util');
    fs.writeSync(1, util.format(...args) + '\n');
}
console.log = syncLog;
console.warn = (...a) => fs.writeSync(2, require('util').format(...a) + '\n');

async function preparePage(page) {
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
}

async function main() {
    const started = Date.now();
    console.log('[visao-count] Inicio', new Date().toISOString());
    const browser = await puppeteer.launch(getLaunchOptions());
    try {
        const menuPage = await browser.newPage();
        await preparePage(menuPage);
        console.log('[visao-count] Recolectando menú / subcategorías…');
        const menuRows = await collectMenuHierarchy(menuPage);
        await menuPage.close().catch(() => {});

        const byRoot = {};
        const listingUrls = new Set();
        for (const row of menuRows) {
            const root = row.categoryLabel || row.categoryValue || '?';
            if (!byRoot[root]) byRoot[root] = { listados: 0, subs: new Set() };
            byRoot[root].listados += 1;
            if (row.subcategoryLabel) byRoot[root].subs.add(row.subcategoryLabel);
            if (row.listingUrl) listingUrls.add(row.listingUrl);
        }

        console.log(`[visao-count] Filas menú (listados hoja): ${menuRows.length}`);
        console.log(`[visao-count] Categorías raíz: ${Object.keys(byRoot).length}`);
        console.log(`[visao-count] URLs listado únicas: ${listingUrls.size}`);
        for (const [root, info] of Object.entries(byRoot)) {
            console.log(
                `[visao-count][CAT] ${root}: ${info.listados} listados, ${info.subs.size} sub-etiquetas`
            );
        }

        const allProductUrls = new Set();
        const listingResults = [];
        let i = 0;
        for (const listingUrl of listingUrls) {
            i += 1;
            const page = await browser.newPage();
            await preparePage(page);
            let urls = [];
            try {
                urls = await collectProductUrlsForCategory(page, listingUrl, {});
            } catch (err) {
                console.warn(`[visao-count] ERROR listado ${listingUrl}: ${err.message || err}`);
            } finally {
                await page.close().catch(() => {});
            }
            for (const u of urls) allProductUrls.add(u.split('?')[0]);
            listingResults.push({ listingUrl, count: urls.length });
            console.log(
                `[visao-count][LISTING] (${i}/${listingUrls.size}) ${listingUrl} -> ${urls.length} | acumulado PDPs únicos=${allProductUrls.size}`
            );
        }

        const zeros = listingResults.filter((r) => r.count === 0);
        const report = {
            timingMs: Date.now() - started,
            categoriasRaiz: Object.keys(byRoot).length,
            filasMenuListados: menuRows.length,
            listingUrlsUnicas: listingUrls.size,
            productosUrlsUnicas: allProductUrls.size,
            listadosConCeroProductos: zeros.length,
            listadosCeroSample: zeros.slice(0, 30).map((z) => z.listingUrl),
            porCategoriaRaiz: Object.fromEntries(
                Object.entries(byRoot).map(([k, v]) => [
                    k,
                    { listados: v.listados, subEtiquetas: v.subs.size }
                ])
            )
        };

        const outPath = path.join(
            __dirname,
            '..',
            'logs',
            `visao-count-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        );
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
        console.log('[visao-count] REPORTE:', JSON.stringify(report, null, 2));
        console.log('[visao-count] Guardado:', outPath);
    } finally {
        await browser.close().catch(() => {});
        console.log('[visao-count] Fin', new Date().toISOString());
    }
}

main().catch((e) => {
    console.error('[visao-count] FAIL', e);
    process.exit(1);
});
