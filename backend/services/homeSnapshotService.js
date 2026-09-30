'use strict';

/**
 * Copia pública del home en el CDN (R2).
 * El cliente la lee directo, sin esperar el arranque del servidor.
 */
const { isR2Configured, uploadBufferToR2, getR2PublicBaseUrl } = require('./r2StorageService');

const HOME_SNAPSHOT_KEY = 'cache/home.json';
const HOME_LCP_KEY = 'cache/lcp.json';

function homeSnapshotUrl() {
    return `${getR2PublicBaseUrl()}/${HOME_SNAPSHOT_KEY}`;
}

function firstBannerUrls(body) {
    const banners = body?.data?.homeBanners;
    if (!Array.isArray(banners)) return null;
    const first = banners.find((b) => b && (b.imageMobile || b.imageDesktop || b.image));
    if (!first) return null;
    return {
        imageMobile: first.imageMobile || first.imageDesktop || first.image || '',
        imageDesktop: first.imageDesktop || first.image || first.imageMobile || ''
    };
}

async function publishHomeSnapshot(body) {
    if (!body?.success || !body?.data?.slots || !isR2Configured()) return null;
    const cache = {
        contentType: 'application/json; charset=utf-8',
        cacheControl: 'public, max-age=60, stale-while-revalidate=86400'
    };
    await uploadBufferToR2(Buffer.from(JSON.stringify(body)), HOME_SNAPSHOT_KEY, cache);
    const lcp = firstBannerUrls(body);
    if (lcp) {
        await uploadBufferToR2(Buffer.from(JSON.stringify(lcp)), HOME_LCP_KEY, cache);
    }
    return homeSnapshotUrl();
}

module.exports = {
    HOME_SNAPSHOT_KEY,
    homeSnapshotUrl,
    publishHomeSnapshot
};
