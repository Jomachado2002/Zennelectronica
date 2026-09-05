// backend/services/r2StorageService.js
// Subida/borrado de objetos en Cloudflare R2 (S3-compatible)

const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

function isR2Configured() {
    return !!(
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET &&
        (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID)
    );
}

function getR2PublicBaseUrl() {
    const base = (process.env.R2_PUBLIC_BASE_URL || 'https://cdn.zenn.com.py').replace(/\/$/, '');
    return base;
}

function getR2Endpoint() {
    if (process.env.R2_ENDPOINT) return process.env.R2_ENDPOINT.replace(/\/$/, '');
    const accountId = process.env.R2_ACCOUNT_ID;
    if (!accountId) throw new Error('R2_ENDPOINT o R2_ACCOUNT_ID requerido');
    return `https://${accountId}.r2.cloudflarestorage.com`;
}

let s3Client;

function getS3Client() {
    if (!isR2Configured()) {
        throw new Error('R2 no configurado (faltan R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET)');
    }
    if (!s3Client) {
        s3Client = new S3Client({
            region: 'auto',
            endpoint: getR2Endpoint(),
            forcePathStyle: true,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
            }
        });
    }
    return s3Client;
}

/**
 * Sube un buffer a R2 y devuelve la URL pública CDN.
 * @param {Buffer} body
 * @param {string} key - ruta en el bucket (ej. products/foo.webp)
 * @param {object} options
 * @returns {Promise<string>} URL pública
 */
async function uploadBufferToR2(body, key, options = {}) {
    const client = getS3Client();
    const Bucket = process.env.R2_BUCKET;
    const ContentType = options.contentType || 'application/octet-stream';
    const Metadata = options.metadata || undefined;

    await client.send(
        new PutObjectCommand({
            Bucket,
            Key: key,
            Body: body,
            ContentType,
            CacheControl: options.cacheControl || 'public, max-age=31536000, immutable',
            Metadata
        })
    );

    return `${getR2PublicBaseUrl()}/${key.replace(/^\//, '')}`;
}

async function deleteObjectFromR2(key) {
    const client = getS3Client();
    await client.send(
        new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key
        })
    );
    return { deleted: true, path: key };
}

async function headObjectOnR2(key) {
    const client = getS3Client();
    try {
        await client.send(
            new HeadObjectCommand({
                Bucket: process.env.R2_BUCKET,
                Key: key
            }),
            { abortSignal: AbortSignal.timeout(20000) }
        );
        return true;
    } catch (err) {
        const status = err && (err.$metadata && err.$metadata.httpStatusCode);
        const name = err && (err.name || err.Code);
        if (status === 404 || name === 'NotFound' || name === 'NoSuchKey' || name === 'TimeoutError' || name === 'AbortError') {
            if (name === 'TimeoutError' || name === 'AbortError' || (err && err.message && String(err.message).includes('abort'))) {
                throw err;
            }
            return false;
        }
        throw err;
    }
}

async function getObjectBufferFromR2(key) {
    const client = getS3Client();
    const res = await client.send(
        new GetObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key
        }),
        { abortSignal: AbortSignal.timeout(30000) }
    );
    const chunks = [];
    for await (const chunk of res.Body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

async function listR2Keys(prefix, options = {}) {
    const client = getS3Client();
    const Bucket = process.env.R2_BUCKET;
    const keys = [];
    let ContinuationToken;
    const maxKeys = options.maxKeys || Infinity;
    do {
        const res = await client.send(
            new ListObjectsV2Command({
                Bucket,
                Prefix: prefix || '',
                ContinuationToken,
                MaxKeys: 1000
            })
        );
        for (const obj of res.Contents || []) {
            if (obj.Key) keys.push(obj.Key);
            if (keys.length >= maxKeys) return keys.slice(0, maxKeys);
        }
        ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (ContinuationToken);
    return keys;
}

function isR2PublicUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const base = getR2PublicBaseUrl();
    return url.startsWith(base + '/') || url.includes('cdn.zenn.com.py/');
}

function r2KeyFromPublicUrl(url) {
    if (!isR2PublicUrl(url)) return null;
    try {
        const u = new URL(url);
        return decodeURIComponent(u.pathname.replace(/^\//, ''));
    } catch {
        return null;
    }
}

module.exports = {
    isR2Configured,
    getR2PublicBaseUrl,
    uploadBufferToR2,
    deleteObjectFromR2,
    isR2PublicUrl,
    r2KeyFromPublicUrl,
    headObjectOnR2,
    getObjectBufferFromR2,
    listR2Keys
};
