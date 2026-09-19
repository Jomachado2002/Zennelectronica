'use strict';

/**
 * Normaliza nombres de marca para matching case-insensitive.
 * "APPLE", "Apple", "apple", "A.P.P.L.E" → "apple"
 * "TP-Link", "TP Link", "tplink" → "tplink"
 * "H.P.", "HP", "hp" → "hp"
 */
function normalizeBrandSlug(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const raw of values || []) {
    const value = String(raw || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function uniqueSlugs(names) {
  const seen = new Set();
  const out = [];
  for (const name of names || []) {
    const slug = normalizeBrandSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

module.exports = {
  normalizeBrandSlug,
  uniqueStrings,
  uniqueSlugs
};
