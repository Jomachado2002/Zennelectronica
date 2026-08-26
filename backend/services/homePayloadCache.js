'use strict';

/**
 * Cache en memoria del payload del home.
 * En Vercel dura mientras la instancia esté caliente → respuestas ~1ms.
 */
const DEFAULT_TTL_MS = 180 * 1000;

let entry = null;

function getHomePayloadCache() {
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    entry = null;
    return null;
  }
  return entry.payload;
}

function setHomePayloadCache(payload, ttlMs = DEFAULT_TTL_MS) {
  entry = {
    payload,
    expiresAt: Date.now() + Math.max(5_000, ttlMs),
    cachedAt: Date.now()
  };
}

function invalidateHomePayloadCache() {
  entry = null;
}

function homeCacheMeta() {
  if (!entry) return { hit: false };
  return {
    hit: Date.now() <= entry.expiresAt,
    ageMs: Date.now() - entry.cachedAt,
    expiresInMs: Math.max(0, entry.expiresAt - Date.now())
  };
}

module.exports = {
  getHomePayloadCache,
  setHomePayloadCache,
  invalidateHomePayloadCache,
  homeCacheMeta,
  DEFAULT_TTL_MS
};
