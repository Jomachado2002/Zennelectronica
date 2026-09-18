'use strict';

const { normalizeBrandSlug } = require('./brandSlug');

const PRIVATE_BRAND_NAME = 'Marca propia';

const KNOWN_BRANDS = {
    msi: 'MSI',
    lg: 'LG',
    hp: 'HP',
    ibm: 'IBM',
    aoc: 'AOC',
    jbl: 'JBL',
    tcl: 'TCL',
    jvc: 'JVC',
    amd: 'AMD',
    nec: 'NEC',
    asus: 'ASUS',
    asrock: 'ASRock',
    gigabyte: 'Gigabyte',
    samsung: 'Samsung',
    apple: 'Apple',
    dell: 'Dell',
    lenovo: 'Lenovo',
    acer: 'Acer',
    corsair: 'Corsair',
    kingston: 'Kingston',
    logitech: 'Logitech',
    razer: 'Razer',
    redragon: 'Redragon',
    xiaomi: 'Xiaomi',
    huawei: 'Huawei',
    motorola: 'Motorola',
    sony: 'Sony',
    philips: 'Philips',
    benq: 'BenQ',
    viewsonic: 'ViewSonic',
    nvidia: 'NVIDIA',
    intel: 'Intel',
    tplink: 'TP-Link',
    hikvision: 'Hikvision',
    kolke: 'Kolke',
    westerndigital: 'Western Digital',
    seagate: 'Seagate',
    crucial: 'Crucial',
    sandisk: 'SanDisk',
    hyperx: 'HyperX',
    thermaltake: 'Thermaltake',
    coolermaster: 'Cooler Master',
    aorus: 'AORUS',
    alienware: 'Alienware',
    mtek: 'Mtek',
    satellite: 'Satellite'
};

function parseVisaoMarcaSlug(urlOrPath) {
    if (!urlOrPath) return '';
    const s = String(urlOrPath).trim();
    if (!s) return '';
    let pathname = s;
    try {
        if (/^https?:\/\//i.test(s)) pathname = new URL(s).pathname;
    } catch {
        /* keep raw */
    }
    const m =
        pathname.match(/\/img\/marca\/([^/]+)(?:\/|$)/i) ||
        pathname.match(/\/busca\/marca\/([^/]+)(?:\/|$)/i) ||
        s.match(/\/img\/marca\/([^/?#]+)(?:\/|$)/i) ||
        s.match(/\/busca\/marca\/([^/?#]+)(?:\/|$)/i);
    if (!m || !m[1]) return '';
    try {
        return decodeURIComponent(m[1]).trim().toLowerCase();
    } catch {
        return String(m[1]).trim().toLowerCase();
    }
}

function isPrivateBrandSlug(slug) {
    const n = String(slug || '')
        .trim()
        .toLowerCase()
        .replace(/_/g, '-');
    const compact = n.replace(/-/g, '');
    return (
        n === 'original-brand' ||
        compact === 'originalbrand' ||
        n === 'marca-propia' ||
        compact === 'marcapropia' ||
        n === 'producto-propio' ||
        compact === 'productopropio'
    );
}

function isPlausibleBrandName(name) {
    const s = String(name || '').trim();
    if (!s || s.length < 2 || s.length > 48) return false;
    if (/__/.test(s)) return false;
    if (/^\d+$/.test(s)) return false;
    if (
        /^(monitor|monitores|notebook|notebooks|teclado|teclados|auricular|auriculares|categoria|categor[ií]a|inicio|home|visaovi?p|vis[aã]o\s*vip|importados)$/i.test(
            s
        )
    ) {
        return false;
    }
    return true;
}

function displayNameFromSlug(slug) {
    const raw = String(slug || '').trim();
    if (!raw) return '';
    const compact = raw.toLowerCase().replace(/[-_]/g, '');
    if (KNOWN_BRANDS[compact]) return KNOWN_BRANDS[compact];
    const parts = raw.split(/[-_]+/).filter(Boolean);
    if (parts.length === 1 && parts[0].length <= 3) return parts[0].toUpperCase();
    return parts
        .map((p) => {
            const c = p.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (KNOWN_BRANDS[c]) return KNOWN_BRANDS[c];
            if (p.length <= 3) return p.toUpperCase();
            return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
        })
        .join(' ');
}

/**
 * Marca Visão: la URL del logo / listado (`/img/marca/{slug}/` o `/busca/marca/{slug}/`)
 * manda sobre el título. original-brand → Marca propia. Sin señal → ''.
 */
function resolveVisaoBrandName(opts = {}) {
    const slug =
        parseVisaoMarcaSlug(opts.marcaLogoUrl) ||
        parseVisaoMarcaSlug(opts.marcaHref) ||
        String(opts.marcaSlug || '')
            .trim()
            .toLowerCase();

    const specsBrand = String(opts.specsBrand || '').trim();

    if (slug && isPrivateBrandSlug(slug)) return PRIVATE_BRAND_NAME;

    if (slug) {
        if (specsBrand && normalizeBrandSlug(slug) === normalizeBrandSlug(specsBrand)) {
            return specsBrand;
        }
        return displayNameFromSlug(slug);
    }

    if (specsBrand && isPlausibleBrandName(specsBrand)) return specsBrand;
    return '';
}

module.exports = {
    PRIVATE_BRAND_NAME,
    parseVisaoMarcaSlug,
    isPrivateBrandSlug,
    isPlausibleBrandName,
    displayNameFromSlug,
    resolveVisaoBrandName
};
