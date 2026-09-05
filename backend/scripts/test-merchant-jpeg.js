#!/usr/bin/env node
'use strict';

/**
 * Prueba URL rewrite + conversión + subida de un JPEG hermano a R2.
 *   cd backend && node scripts/test-merchant-jpeg.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const assert = require('assert');
const {
    toMerchantJpegUrl,
    cdnJpegSiblingUrl,
    jpegKeyFromWebpKey,
    convertBufferToMerchantJpeg
} = require('../helpers/merchantJpeg');
const {
    isR2Configured,
    uploadBufferToR2,
    deleteObjectFromR2,
    r2KeyFromPublicUrl
} = require('../services/r2StorageService');

function assertEqual(actual, expected, label) {
    assert.strictEqual(actual, expected, `${label}: got ${actual}`);
}

async function testUrlRewrite() {
    const webp = 'https://cdn.zenn.com.py/products/abc_1.webp';
    assertEqual(
        cdnJpegSiblingUrl(webp),
        'https://cdn.zenn.com.py/products/abc_1.jpg',
        'cdn sibling'
    );
    assertEqual(
        toMerchantJpegUrl(webp),
        'https://cdn.zenn.com.py/products/abc_1.jpg',
        'feed rewrite'
    );
    assertEqual(
        toMerchantJpegUrl('https://cdn.zenn.com.py/products/abc_1.jpg'),
        'https://cdn.zenn.com.py/products/abc_1.jpg',
        'already jpeg'
    );
    assertEqual(
        jpegKeyFromWebpKey('products/abc_1.webp'),
        'products/abc_1.jpg',
        'key rewrite'
    );

    const firebase =
        'https://firebasestorage.googleapis.com/v0/b/bucket/o/products%2Fx.webp?alt=media';
    const proxied = toMerchantJpegUrl(firebase);
    assert.ok(proxied.startsWith('https://www.zenn.com.py/api/gmc/image.jpg?src='), 'firebase still proxied');
    console.log('ok  URL rewrite');
}

async function testConvertAndUpload() {
    const sample =
        'https://cdn.zenn.com.py/products/b7589a8f-7c31-481b-a3ff-68dd9af3118d_60865_0.webp';
    const res = await fetch(sample, { headers: { Accept: 'image/*' } });
    assert.ok(res.ok, `sample webp HTTP ${res.status}`);
    const webpBuffer = Buffer.from(await res.arrayBuffer());
    const jpegBuffer = await convertBufferToMerchantJpeg(webpBuffer);
    assert.ok(jpegBuffer[0] === 0xff && jpegBuffer[1] === 0xd8, 'jpeg magic');
    assert.ok(jpegBuffer.length > 1000, 'jpeg too small');
    console.log(`ok  convert ${webpBuffer.length} webp → ${jpegBuffer.length} jpeg`);

    if (!isR2Configured()) {
        console.log('skip upload (R2 no configurado)');
        return;
    }

    const testKey = `products/_merchant-jpeg-test-${Date.now()}.jpg`;
    const publicUrl = await uploadBufferToR2(jpegBuffer, testKey, {
        contentType: 'image/jpeg',
        metadata: { source: 'merchant_jpeg_test', format: 'jpeg' }
    });
    const live = await fetch(publicUrl, { headers: { Accept: 'image/*' } });
    const ctype = String(live.headers.get('content-type') || '');
    assert.ok(live.ok, `cdn jpeg HTTP ${live.status}`);
    assert.ok(ctype.includes('jpeg') || ctype.includes('jpg'), `content-type ${ctype}`);
    const body = Buffer.from(await live.arrayBuffer());
    assert.ok(body[0] === 0xff && body[1] === 0xd8, 'cdn body not jpeg');
    console.log(`ok  CDN ${publicUrl} (${body.length} bytes)`);

    await deleteObjectFromR2(testKey);
    console.log('ok  cleanup test object');

    const sibling = cdnJpegSiblingUrl(sample);
    const sampleKey = r2KeyFromPublicUrl(sample);
    assert.ok(sibling.endsWith('.jpg'));
    assert.ok(jpegKeyFromWebpKey(sampleKey).endsWith('.jpg'));
}

async function main() {
    await testUrlRewrite();
    await testConvertAndUpload();
    console.log('test-merchant-jpeg OK');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
