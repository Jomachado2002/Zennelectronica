'use strict';

const sharp = require('sharp');

const ALLOWED_HOSTS = new Set([
    'cdn.zenn.com.py',
    'firebasestorage.googleapis.com'
]);

function isAllowedImageHost(hostname) {
    const host = String(hostname || '').toLowerCase();
    if (ALLOWED_HOSTS.has(host)) return true;
    if (host.endsWith('.firebasestorage.app')) return true;
    if (host.endsWith('.googleapis.com') && host.includes('firebasestorage')) return true;
    return false;
}

function toMerchantJpegUrl(originalUrl) {
    if (!originalUrl) return originalUrl;
    const lower = originalUrl.toLowerCase();
    const needsConvert =
        lower.includes('.webp') ||
        lower.includes('.avif') ||
        lower.includes('.svg') ||
        lower.includes('image/webp');
    if (!needsConvert) return originalUrl;
    return `https://www.zenn.com.py/api/gmc/image.jpg?src=${encodeURIComponent(originalUrl)}`;
}

const merchantJpegController = async (req, res) => {
    try {
        const src = String(req.query.src || '').trim();
        if (!src) {
            return res.status(400).type('text/plain').send('src requerido');
        }

        let urlObj;
        try {
            urlObj = new URL(src);
        } catch (_) {
            return res.status(400).type('text/plain').send('URL inválida');
        }

        if (urlObj.protocol !== 'https:' || !isAllowedImageHost(urlObj.hostname)) {
            return res.status(403).type('text/plain').send('Host no permitido');
        }

        const upstream = await fetch(src, {
            redirect: 'follow',
            headers: { Accept: 'image/*,*/*' }
        });
        if (!upstream.ok) {
            return res.status(502).type('text/plain').send('No se pudo leer la imagen');
        }

        const buffer = Buffer.from(await upstream.arrayBuffer());
        const jpeg = await sharp(buffer)
            .rotate()
            .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer();

        res.set({
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*'
        });
        return res.send(jpeg);
    } catch (error) {
        return res.status(500).type('text/plain').send('Error convirtiendo imagen');
    }
};

module.exports = { merchantJpegController, toMerchantJpegUrl };
