/**
 * Muestra real de PDP (mismo scraper que mirror): cuenta precioUsd null vs ok.
 * Uso: node scripts/debug-pdp-sample.js
 */
const puppeteer = require('puppeteer');
const {
    getLaunchOptions,
    collectProductUrlsForCategory,
    scrapeProductDetailsParallel
} = require('../services/visionVipScraperService');

const LISTING =
    process.env.VISAO_DEBUG_LISTING ||
    'https://www.visaovip.com/es/busca/categoria/memorias/21-01';

async function main() {
    const browser = await puppeteer.launch(getLaunchOptions());
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    const urls = await collectProductUrlsForCategory(page, LISTING, {
        urlBudget: Number(process.env.VISAO_DEBUG_PDP_N) || 18,
        singlePageOnly: true
    });
    await page.close().catch(() => {});

    const conc = Math.min(4, Math.max(1, urls.length));
    const raw = await scrapeProductDetailsParallel(browser, urls, {
        preview: false,
        concurrency: conc
    });

    const nullPrice = raw.filter((p) => p && p.precioUsd == null && !p.error);
    const errs = raw.filter((p) => p && p.error);
    const ok = raw.filter((p) => p && p.precioUsd != null && !p.error);

    console.log(
        JSON.stringify(
            {
                listing: LISTING,
                sample: urls.length,
                concurrency: conc,
                ok: ok.length,
                missingPrice: nullPrice.length,
                errors: errs.length,
                nullSamples: nullPrice.slice(0, 5).map((p) => p.url)
            },
            null,
            2
        )
    );
    await browser.close().catch(() => {});
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
