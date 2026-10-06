#!/usr/bin/env node
/**
 * Restaura productName cuando el mirror guardó un título de sección
 * ("Especificaciones", "Productos relacionados", "Descripción").
 * Lee el h1 del PDP. No toca precios, imágenes ni especificaciones.
 *
 * Uso: node scripts/repair-visao-product-names.js
 */
const path = require('path');
require('dotenv').config({ path: process.env.DOTENV_PATH || path.join(__dirname, '../.env') });
if (!process.env.MONGODB_URI) {
    require('dotenv').config({ path: path.join(__dirname, '../../jobs-api/.env') });
}
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const {
    getLaunchOptions,
    configureScraperPage
} = require('../services/visionVipScraperService');
const { generateUniqueSlug } = require('../utils/slugGenerator');

const BAD_NAMES = [
    'Especificaciones',
    'Especificações',
    'Descripción',
    'Descricao',
    'Descrição',
    'Productos relacionados',
    'Produtos relacionados',
    'Vistos recientemente',
    'Últimos vistos'
];
const JUNK_SLUG = /^(especificaciones|productos-relacionados|produtos-relacionados|descripcion|descricao)(-\d+)?$/i;
const CONCURRENCY = Math.max(1, Math.min(Number(process.env.VISAO_NAME_REPAIR_CONCURRENCY) || 2, 4));

function usableTitle(value) {
    const s = String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .split('|')[0]
        .trim();
    if (s.length < 8) return '';
    if (BAD_NAMES.some((name) => name.toLowerCase() === s.toLowerCase())) return '';
    if (/visaovip|vis[aã]ovip|attention required|just a moment|cloudflare/i.test(s)) return '';
    return s;
}

async function readTitle(page, url) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page
        .waitForFunction(
            () => {
                const title = document.title || '';
                if (/just a moment|attention required|security verification|performing security/i.test(title)) {
                    return false;
                }
                const h1 = document.querySelector('h1');
                const text = h1 && h1.textContent ? h1.textContent.trim() : '';
                return text.length > 8 && !/visaovip|vis[aã]ovip/i.test(text);
            },
            { timeout: 22000 }
        )
        .catch(() => null);
    const raw = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const og = document.querySelector('meta[property="og:title"]');
        return {
            h1: h1 && h1.textContent ? h1.textContent : '',
            og: og ? og.getAttribute('content') || '' : '',
            title: document.title || ''
        };
    });
    return usableTitle(raw.h1) || usableTitle(raw.og) || usableTitle(raw.title) || '';
}

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('Falta MONGODB_URI');
    await mongoose.connect(uri);
    const col = mongoose.connection.db.collection('products');
    const docs = await col
        .find(
            { syncSource: 'visao_vip', productName: { $in: BAD_NAMES } },
            { projection: { codigo: 1, productName: 1, documentationLink: 1, slug: 1 } }
        )
        .toArray();

    console.log(`[repair-names] pendientes=${docs.length} workers=${CONCURRENCY}`);
    if (!docs.length) {
        await mongoose.disconnect();
        return;
    }

    const browser = await puppeteer.launch(getLaunchOptions());
    let cursor = 0;
    let ok = 0;
    let fail = 0;

    async function worker() {
        const page = await browser.newPage();
        await configureScraperPage(page);
        for (;;) {
            const i = cursor;
            cursor += 1;
            if (i >= docs.length) break;
            const doc = docs[i];
            const url = doc.documentationLink;
            if (!url) {
                fail += 1;
                console.warn(`[repair-names] sin url codigo=${doc.codigo}`);
                continue;
            }
            let title = '';
            try {
                title = await readTitle(page, url);
                if (!title) {
                    await new Promise((r) => setTimeout(r, 1500));
                    title = await readTitle(page, url);
                }
            } catch (err) {
                console.warn(
                    `[repair-names] fallo codigo=${doc.codigo}: ${String(err && err.message ? err.message : err).slice(0, 180)}`
                );
            }
            if (!title) {
                fail += 1;
                console.warn(`[repair-names] sin titulo codigo=${doc.codigo} url=${url}`);
                continue;
            }
            const update = { productName: title, updatedAt: new Date() };
            if (JUNK_SLUG.test(String(doc.slug || ''))) {
                update.slug = await generateUniqueSlug(title, async (slug) => {
                    const clash = await col.findOne({ slug, _id: { $ne: doc._id } }, { projection: { _id: 1 } });
                    return !clash;
                });
            }
            await col.updateOne({ _id: doc._id }, { $set: update });
            ok += 1;
            if (ok === 1 || ok % 25 === 0) {
                console.log(
                    `[repair-names] ${ok} ok / ${fail} fallos / ${docs.length} (${doc.codigo} → ${title.slice(0, 90)})`
                );
            }
        }
        await page.close().catch(() => {});
    }

    try {
        await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    } finally {
        await browser.close().catch(() => {});
        await mongoose.disconnect().catch(() => {});
    }
    console.log(`[repair-names] fin ok=${ok} fallos=${fail} total=${docs.length}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
