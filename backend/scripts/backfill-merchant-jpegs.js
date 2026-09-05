#!/usr/bin/env node
'use strict';

/**
 * Backfill: JPEG hermanos en R2 para cada products/*.webp.
 * La tienda sigue usando .webp; el feed GMC/Meta usa .jpg en el CDN.
 *
 *   cd backend
 *   node scripts/backfill-merchant-jpegs.js --limit=5
 *   node scripts/backfill-merchant-jpegs.js
 *   node scripts/backfill-merchant-jpegs.js --dry-run
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
    isR2Configured,
    getR2PublicBaseUrl,
    uploadBufferToR2,
    listR2Keys
} = require('../services/r2StorageService');
const {
    jpegKeyFromWebpKey,
    convertBufferToMerchantJpeg
} = require('../helpers/merchantJpeg');

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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cdnFetch(url, method = 'GET') {
    const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { Accept: 'image/*,*/*', 'User-Agent': 'ZennMerchantJpegBackfill/1.1' }
    });
    return res;
}

async function jpegAlreadyOnCdn(jpegKey) {
    const url = `${getR2PublicBaseUrl()}/${jpegKey}`;
    try {
        const res = await cdnFetch(url, 'HEAD');
        if (res.ok) return true;
        const getRes = await cdnFetch(url, 'GET');
        return getRes.ok && String(getRes.headers.get('content-type') || '').startsWith('image/');
    } catch {
        return false;
    }
}

async function downloadWebpFromCdn(webpKey) {
    const url = `${getR2PublicBaseUrl()}/${webpKey}`;
    const res = await cdnFetch(url, 'GET');
    if (!res.ok) throw new Error(`CDN HTTP ${res.status} ${url}`);
    return Buffer.from(await res.arrayBuffer());
}

async function processKey(webpKey, dryRun) {
    if (!/\.webp$/i.test(webpKey)) return { status: 'skip', reason: 'not_webp' };
    const jpegKey = jpegKeyFromWebpKey(webpKey);
    if (!jpegKey || jpegKey === webpKey) return { status: 'skip', reason: 'bad_key' };

    if (await jpegAlreadyOnCdn(jpegKey)) {
        return { status: 'exists', jpegKey };
    }

    if (dryRun) {
        return { status: 'would_upload', jpegKey };
    }

    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const webpBuffer = await downloadWebpFromCdn(webpKey);
            const jpegBuffer = await convertBufferToMerchantJpeg(webpBuffer);
            const jpegUrl = await uploadBufferToR2(jpegBuffer, jpegKey, {
                contentType: 'image/jpeg',
                metadata: { source: 'merchant_jpeg_backfill', format: 'jpeg' }
            });
            return { status: 'uploaded', jpegKey, jpegUrl, bytes: jpegBuffer.length };
        } catch (err) {
            lastErr = err;
            await sleep(400 + attempt * 800);
        }
    }
    throw lastErr;
}

async function main() {
    const dryRun = has('--dry-run');
    const limit = numArg('--limit', 0);
    const concurrency = Math.max(1, Math.min(8, numArg('--concurrency', 3)));

    if (!isR2Configured()) {
        throw new Error('R2 no configurado en backend/.env');
    }

    console.log('[merchant-jpeg] listando products/*.webp en R2…');
    const allKeys = await listR2Keys('products/');
    const webpKeys = allKeys.filter((k) => /\.webp$/i.test(k));
    const work = limit > 0 ? webpKeys.slice(0, limit) : webpKeys;

    const stats = {
        listed: allKeys.length,
        webp: webpKeys.length,
        work: work.length,
        exists: 0,
        uploaded: 0,
        would_upload: 0,
        skip: 0,
        failed: 0
    };
    let failLogs = 0;

    console.log(
        `[merchant-jpeg] ${allKeys.length} objetos, ${webpKeys.length} WebP. Procesando ${work.length}${dryRun ? ' (dry-run)' : ''}. CDN ${getR2PublicBaseUrl()}`
    );

    for (let i = 0; i < work.length; i += concurrency) {
        const chunk = work.slice(i, i + concurrency);
        const results = await Promise.all(
            chunk.map(async (key) => {
                try {
                    return await processKey(key, dryRun);
                } catch (err) {
                    return { status: 'failed', key, error: err.message || String(err) };
                }
            })
        );
        for (const r of results) {
            if (r.status === 'exists') stats.exists += 1;
            else if (r.status === 'uploaded') stats.uploaded += 1;
            else if (r.status === 'would_upload') stats.would_upload += 1;
            else if (r.status === 'skip') stats.skip += 1;
            else {
                stats.failed += 1;
                if (failLogs < 8) {
                    failLogs += 1;
                    console.warn('[merchant-jpeg] fail', r.key || '', r.error);
                }
            }
        }
        const done = Math.min(i + chunk.length, work.length);
        if (done % 50 === 0 || done === work.length) {
            console.log(`[merchant-jpeg] ${done}/${work.length}`, {
                exists: stats.exists,
                uploaded: stats.uploaded,
                failed: stats.failed
            });
        }
    }

    console.log('[merchant-jpeg] listo', stats);
    if (stats.failed) process.exitCode = 1;
}

main().catch((err) => {
    console.error('[merchant-jpeg] Error:', err);
    process.exitCode = 1;
});
