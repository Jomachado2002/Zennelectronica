#!/usr/bin/env node
/**
 * Prueba rápida: scrape de 1 PDP y dump de especificaciones.
 * Uso: node scripts/test-visao-specs-once.js [url]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const {
    scrapeProductDetail,
    getLaunchOptions,
    configureScraperPage
} = require('../services/visionVipScraperService');

const DEFAULT_URL =
    process.argv[2] ||
    'https://www.visaovip.com/es/prod/cable-apple-usb-c-macho-a-usb-c-macho-mw493zm-a-1m-blanco/51040/';

(async () => {
    const browser = await puppeteer.launch(getLaunchOptions());
    const page = await browser.newPage();
    try {
        if (typeof configureScraperPage === 'function') {
            await configureScraperPage(page);
        }
        const detail = await scrapeProductDetail(page, DEFAULT_URL, { preview: true });
        const specs = detail.especificaciones || {};
        console.log(
            JSON.stringify(
                {
                    url: detail.url,
                    codigo: detail.supplierCode,
                    titulo: detail.titulo,
                    specsCount: Object.keys(specs).length,
                    especificaciones: specs
                },
                null,
                2
            )
        );
        if (Object.keys(specs).length < 3) {
            process.exitCode = 2;
        }
    } catch (e) {
        console.error(e);
        process.exitCode = 1;
    } finally {
        await browser.close().catch(() => {});
    }
})();
