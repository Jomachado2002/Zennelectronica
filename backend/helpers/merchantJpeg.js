'use strict';

const sharp = require('sharp');

const CDN_HOSTS = new Set(['cdn.zenn.com.py']);
const PROXY_BASE = 'https://www.zenn.com.py/api/gmc/image.jpg';

const MERCHANT_JPEG_OPTS = {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 82
};

function isCdnZennHost(hostname) {
    const host = String(hostname || '').toLowerCase();
    return CDN_HOSTS.has(host) || host.endsWith('.zenn.com.py');
}

function jpegKeyFromWebpKey(key) {
    if (!key || typeof key !== 'string') return key;
    return key.replace(/\.(webp|avif)$/i, '.jpg');
}

/**
 * URL pública JPEG hermana en el CDN (products/foo.webp → products/foo.jpg).
 * Si no es un WebP/AVIF de nuestro CDN, devuelve null.
 */
function cdnJpegSiblingUrl(originalUrl) {
    if (!originalUrl || typeof originalUrl !== 'string') return null;
    try {
        const u = new URL(originalUrl);
        if (!isCdnZennHost(u.hostname)) return null;
        if (!/\.(webp|avif)$/i.test(u.pathname)) return null;
        u.pathname = u.pathname.replace(/\.(webp|avif)$/i, '.jpg');
        return u.toString();
    } catch {
        return null;
    }
}

function needsFormatConvert(url) {
    const lower = String(url || '').toLowerCase();
    return (
        lower.includes('.webp') ||
        lower.includes('.avif') ||
        lower.includes('.svg') ||
        lower.includes('image/webp')
    );
}

/**
 * URL que debe ir en el feed GMC/Meta.
 * CDN WebP/AVIF → JPEG hermano en R2 (sin pasar por Vercel).
 * Firebase u otros WebP → proxy (legado).
 */
function toMerchantJpegUrl(originalUrl) {
    if (!originalUrl) return originalUrl;
    const sibling = cdnJpegSiblingUrl(originalUrl);
    if (sibling) return sibling;
    if (!needsFormatConvert(originalUrl)) return originalUrl;
    return `${PROXY_BASE}?src=${encodeURIComponent(originalUrl)}`;
}

async function convertBufferToMerchantJpeg(imageBuffer) {
    return sharp(imageBuffer, { animated: false })
        .rotate()
        .resize({
            width: MERCHANT_JPEG_OPTS.maxWidth,
            height: MERCHANT_JPEG_OPTS.maxHeight,
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({ quality: MERCHANT_JPEG_OPTS.quality, mozjpeg: true })
        .toBuffer();
}

module.exports = {
    MERCHANT_JPEG_OPTS,
    jpegKeyFromWebpKey,
    cdnJpegSiblingUrl,
    toMerchantJpegUrl,
    convertBufferToMerchantJpeg
};
