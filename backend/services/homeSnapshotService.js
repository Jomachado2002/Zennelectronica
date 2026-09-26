'use strict';

/**
 * Copia pública del home en el CDN (R2).
 * El cliente la lee directo, sin esperar el arranque del servidor.
 */
const { isR2Configured, uploadBufferToR2, getR2PublicBaseUrl } = require('./r2StorageService');

const HOME_SNAPSHOT_KEY = 'cache/home.json';

function homeSnapshotUrl() {
    return `${getR2PublicBaseUrl()}/${HOME_SNAPSHOT_KEY}`;
}

async function publishHomeSnapshot(body) {
    if (!body?.success || !body?.data?.slots || !isR2Configured()) return null;
    await uploadBufferToR2(Buffer.from(JSON.stringify(body)), HOME_SNAPSHOT_KEY, {
        contentType: 'application/json; charset=utf-8',
        cacheControl: 'public, max-age=60, stale-while-revalidate=86400'
    });
    return homeSnapshotUrl();
}

module.exports = {
    HOME_SNAPSHOT_KEY,
    homeSnapshotUrl,
    publishHomeSnapshot
};
