'use strict';

const sharp = require('sharp');
const { toMerchantJpegUrl } = require('../../helpers/merchantJpeg');

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

const merchantJpegController = async (req, res) => {
    const fail = (status, message, cacheSeconds) => {
        res.set({
            'Cache-Control': cacheSeconds
                ? `public, max-age=${cacheSeconds}`
                : 'no-store',
            'Access-Control-Allow-Origin': '*'
        });
        return res.status(status).type('text/plain').send(message);
    };

    try {
        const src = String(req.query.src || '').trim();
        if (!src) {
            return fail(400, 'src requerido', 0);
        }

        let urlObj;
        try {
            urlObj = new URL(src);
        } catch (_) {
            return fail(400, 'URL inválida', 0);
        }

        if (urlObj.protocol !== 'https:' || !isAllowedImageHost(urlObj.hostname)) {
            return fail(403, 'Host no permitido', 0);
        }

        const upstream = await fetch(src, {
            redirect: 'follow',
            headers: { Accept: 'image/*,*/*' }
        });
        if (!upstream.ok) {
            return fail(404, 'Imagen no encontrada', 300);
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
        return fail(404, 'Imagen no encontrada', 120);
    }
};

module.exports = { merchantJpegController, toMerchantJpegUrl };
