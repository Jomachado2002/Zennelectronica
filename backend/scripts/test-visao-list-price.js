#!/usr/bin/env node
/**
 * Verifica captura de precio tachado (lista) + oferta y la fórmula Visão.
 * Uso:
 *   node scripts/test-visao-list-price.js [url]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const {
    scrapeProductDetail,
    getLaunchOptions,
    configureScraperPage
} = require('../services/visionVipScraperService');
const { calculateVisaoVipPrices } = require('../utils/priceCalculator');

const DEFAULT_URL =
    process.argv[2] ||
    'https://www.visaovip.com/es/prod/notebook/notebook-acer-swift-16-ai-sf16-71t-70pn-intel-core-ultra-x7-358h-pantalla-touch-oled-2-8k-16-16gb-de-ram-1tb-ssd-win11home-basalt-gris-ingles/59365/';

(async () => {
    const exchangeRate = Number(process.env.VISAO_PYG_PER_USD) > 0 ? Number(process.env.VISAO_PYG_PER_USD) : 7300;
    const browser = await puppeteer.launch(getLaunchOptions());
    const page = await browser.newPage();
    try {
        if (typeof configureScraperPage === 'function') {
            await configureScraperPage(page);
        }
        const detail = await scrapeProductDetail(page, DEFAULT_URL, { preview: true });

        const prices = calculateVisaoVipPrices({
            precioFuente: detail.precioFuente,
            precioUsd: detail.precioUsd,
            precioPygRaw: detail.precioPygRaw,
            precioListaFuente: detail.precioListaFuente,
            precioListaUsd: detail.precioListaUsd,
            precioListaPygRaw: detail.precioListaPygRaw,
            exchangeRate
        });

        const out = {
            codigo: detail.supplierCode,
            titulo: (detail.titulo || '').slice(0, 80),
            scraped: {
                precioFuente: detail.precioFuente,
                precioUsd: detail.precioUsd,
                precioPygRaw: detail.precioPygRaw,
                precioListaFuente: detail.precioListaFuente,
                precioListaUsd: detail.precioListaUsd,
                precioListaPygRaw: detail.precioListaPygRaw
            },
            calculated: {
                exchangeRate,
                price: prices.price,
                sellingPrice: prices.sellingPrice,
                hasDiscount: prices.price > prices.sellingPrice
            },
            expectedVisaoUsd: { list: 1499, sale: 1419 }
        };

        console.log(JSON.stringify(out, null, 2));

        const okSale =
            detail.precioFuente === 'USD' &&
            Number(detail.precioUsd) > 1400 &&
            Number(detail.precioUsd) < 1450;
        const okList =
            detail.precioListaFuente === 'USD' &&
            Number(detail.precioListaUsd) > 1480 &&
            Number(detail.precioListaUsd) < 1520;
        const okCalc = prices.price > prices.sellingPrice && prices.sellingPrice > 0;

        if (!okSale || !okList || !okCalc) {
            console.error(
                `[FAIL] sale=${okSale} list=${okList} calc=${okCalc} — scraped sale=${detail.precioUsd} list=${detail.precioListaUsd}`
            );
            process.exitCode = 2;
        } else {
            console.error('[OK] Precio lista (tachado) + oferta capturados y price > sellingPrice');
        }
    } catch (e) {
        console.error(e);
        process.exitCode = 1;
    } finally {
        await browser.close().catch(() => {});
    }
})();
