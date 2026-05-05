/**
 * Sincronización Visão Vip → MongoDB + Firebase Storage.
 * - Modo legado: scrapeVisionVipCatalog (preview / parcial).
 * - Modo espejo: scrapeVisionVipMirror (menú + catálogo alineado al proveedor).
 *
 * Motor espejo: categoría/subcategoría + defs de filtro por producto (serializado por categoría),
 * FK categoryId/subcategoryId, especificaciones canónicas en technicalSpecifications + specifications
 * y campos dinámicos en raíz (strict:false).
 */

const ExchangeRateModel = require('../models/exchangeRateModel');
const Category = require('../models/categoryModel');
const productModel = require('../models/productModel');
const { importImageFromUrlWithRetries } = require('./imageImportService');
const { calculatePrices } = require('../utils/priceCalculator');
const { generateUniqueSlug } = require('../utils/slugGenerator');
const { scrapeVisionVipCatalog } = require('./visionVipScraperService');
const {
    scrapeVisionVipMirror,
    extractVisaoProdSegment,
    rowMatchesProdSegment
} = require('./visionVipMirrorScrapeService');
const { writeProductCategoryJsFromMongo } = require('./exportCategoriesFrontendFile');

const SYNC_SOURCE = 'visao_vip';
const VISAO_MARKET_BRAND = 'Visão Vip';
const DEFAULT_CATEGORY_COLOR = '#3B82F6';
const DEFAULT_CATEGORY_ICON = 'FaFolder';

/** Rutas del documento que no deben pisarse con claves de especificaciones Visão */
const SPEC_ROOT_BLOCKED = new Set([
    '_id',
    '__v',
    'id',
    'category',
    'subcategory',
    'categoryId',
    'subcategoryId',
    'productName',
    'brandName',
    'slug',
    'codigo',
    'productImage',
    'documentationLink',
    'description',
    'technicalSpecifications',
    'specifications',
    'visaoTaxonomy',
    'syncSource',
    'stock',
    'stockStatus',
    'price',
    'sellingPrice',
    'purchasePrice',
    'purchasePriceUSD',
    'exchangeRate',
    'deliveryCost',
    'profitMargin',
    'profitAmount',
    'loanInterest',
    'lastUpdatedFinance',
    'budgets',
    'sales',
    'createdAt',
    'updatedAt',
    'isVipOffer'
]);

/** Cola por categoría para evitar carreras al actualizar subcategorías/specs */
const categoryWriteChain = new Map();

function runCategoryOps(categoryValue, fn) {
    if (!categoryValue) return fn();
    const key = String(categoryValue);
    const prev = categoryWriteChain.get(key) || Promise.resolve();
    const done = prev.catch(() => {}).then(() => fn());
    categoryWriteChain.set(key, done);
    return done;
}

function normalizeCodigo(raw) {
    if (raw == null || raw === '') return null;
    return String(raw).trim().toUpperCase();
}

/** Mismo identificador que en persistencia: PDP + código al final de la URL como respaldo */
function resolveMirroredSupplierCodigo(p) {
    if (!p) return null;
    let c = normalizeCodigo(p.supplierCode);
    if (!c && p.url) {
        try {
            const pathname = new URL(String(p.url)).pathname;
            const m = pathname.match(/\/(\d+)\/?$/);
            if (m) c = normalizeCodigo(m[1]);
        } catch {
            /* ignore */
        }
    }
    return c;
}

/**
 * Normaliza precio USD del PDP (número o string) para evitar skips falsos por tipo o formato.
 */
function parseVisaoPrecioUsd(raw) {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') {
        return Number.isFinite(raw) && raw > 0 ? raw : null;
    }
    let s = String(raw).trim();
    if (!/\d/.test(s)) return null;
    s = s.replace(/[^\d.,-]/g, '');
    if (!s) return null;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^\d+,\d{1,4}$/.test(s) && !s.includes('.')) {
        s = s.replace(',', '.');
    } else {
        s = s.replace(/,/g, '');
    }
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/** Códigos SKU presentes en el scrape (todas las PDP), no sólo persistidos bien */
function codigosSeenInMirrorBundle(products) {
    const set = new Set();
    for (const p of products || []) {
        const c = resolveMirroredSupplierCodigo(p);
        if (c) set.add(c);
    }
    return set;
}

function slugifyKey(text) {
    if (!text || typeof text !== 'string') return 'spec';
    let s = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    return (s || 'spec').slice(0, 60);
}

/** Claves canónicas (name) + etiqueta original Visão por clave */
function normalizeVisaoSpecs(raw) {
    const standardized = {};
    const labelByName = {};
    if (!raw || typeof raw !== 'object') return { standardized, labelByName };
    for (const [rawKey, val] of Object.entries(raw)) {
        const label = String(rawKey).trim();
        if (!label) continue;
        const name = slugifyKey(label);
        if (!name) continue;
        const v = val != null ? String(val).trim() : '';
        standardized[name] = v;
        if (!labelByName[name]) labelByName[name] = label;
    }
    return { standardized, labelByName };
}

function resolveBrandFromMarca(rawSpecs, standardized) {
    if (rawSpecs && typeof rawSpecs === 'object') {
        for (const [k, v] of Object.entries(rawSpecs)) {
            if (/^marca$/i.test(String(k).trim())) {
                const s = String(v != null ? v : '').trim();
                if (s) return s;
            }
        }
    }
    if (standardized && typeof standardized === 'object' && standardized.marca) {
        const s = String(standardized.marca).trim();
        if (s) return s;
    }
    return '';
}

function inferBrandName(titulo) {
    if (!titulo || typeof titulo !== 'string') return VISAO_MARKET_BRAND;
    const first = titulo.trim().split(/\s+/)[0];
    if (first && first.length >= 2 && first.length <= 24 && /^[A-Za-z0-9]+/.test(first)) {
        return first.replace(/[^A-Za-z0-9áéíóúÁÉÍÓÚñÑ.-]/g, '');
    }
    return VISAO_MARKET_BRAND;
}

function inferCategoryFromUrl(productUrl) {
    try {
        const path = new URL(productUrl).pathname;
        const m = path.match(/^\/es\/prod\/([^/]+)\//i);
        if (!m) return { category: 'importados', subcategory: 'importados__general' };
        const segment = m[1].replace(/-/g, ' ');
        const label =
            segment.length > 0
                ? segment.replace(/\b\w/g, (c) => c.toUpperCase())
                : 'Importados';
        const cv = slugifyKey(segment);
        return { category: cv, subcategory: `${cv}__general` };
    } catch {
        return { category: 'importados', subcategory: 'importados__general' };
    }
}

function buildSyncSummary(persistResults, startedAt, imageFailureCount) {
    const skippedByReason = persistResults.reduce((acc, result) => {
        if (result.action !== 'skipped') return acc;
        const reason = result.reason || 'unknown';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
    }, {});

    return {
        durationMs: Date.now() - startedAt,
        productsCreated: persistResults.filter((r) => r.action === 'created').length,
        productsUpdated: persistResults.filter((r) => r.action === 'updated').length,
        productsSkipped: persistResults.filter((r) => r.action === 'skipped').length,
        productsErrors: persistResults.filter((r) => r.action === 'error').length,
        imageImportFailures: imageFailureCount,
        skippedByReason
    };
}

function applyCanonicalSpecsToDocument(doc, specFlat) {
    if (!specFlat || typeof specFlat !== 'object') return;
    for (const [k, v] of Object.entries(specFlat)) {
        if (SPEC_ROOT_BLOCKED.has(k)) continue;
        doc[k] = v;
    }
}

/** Campos del producto que el mirror Visão debe dejar idénticos al PDP de cada corrida. */
const MIRROR_SNAPSHOT_KEYS = [
    'productName',
    'brandName',
    'category',
    'subcategory',
    'documentationLink',
    'description',
    'price',
    'purchasePriceUSD',
    'exchangeRate',
    'purchasePrice',
    'deliveryCost',
    'profitMargin',
    'profitAmount',
    'sellingPrice',
    'stock',
    'stockStatus',
    'syncSource',
    'productImage',
    'technicalSpecifications',
    'specifications',
    'visaoTaxonomy'
];

function stableStringifyMirrorVal(val) {
    if (val === undefined) return '∅';
    if (val === null) return 'null';
    if (typeof val !== 'object') return JSON.stringify(val);
    if (val instanceof Date) return JSON.stringify(val.toISOString());
    if (typeof val === 'object' && val._bsontype === 'ObjectID') return JSON.stringify(String(val));
    if (Array.isArray(val)) return `[${val.map(stableStringifyMirrorVal).join(',')}]`;
    const keys = Object.keys(val).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringifyMirrorVal(val[k])}`).join(',')}}`;
}

function snapshotForMirrorCompare(doc) {
    const o =
        doc && typeof doc.toObject === 'function'
            ? doc.toObject({ depopulate: true, virtuals: false })
            : { ...(doc || {}) };
    const out = {};
    for (const k of MIRROR_SNAPSHOT_KEYS) {
        out[k] = o[k];
    }
    out.categoryId = o.categoryId != null ? String(o.categoryId) : '';
    out.subcategoryId = o.subcategoryId != null ? String(o.subcategoryId) : '';
    return out;
}

function mirrorFieldDriftKeys(beforeSnap, afterSnap) {
    const drifted = [];
    const keys = new Set([...Object.keys(beforeSnap || {}), ...Object.keys(afterSnap || {})]);
    for (const k of keys) {
        if (stableStringifyMirrorVal(beforeSnap[k]) !== stableStringifyMirrorVal(afterSnap[k])) {
            drifted.push(k);
        }
    }
    return drifted.sort();
}

async function mapPool(items, limit, mapper) {
    const n = items.length;
    if (n === 0) return [];
    const results = new Array(n);
    let next = 0;
    const workers = Math.max(1, Math.min(limit, n));
    async function worker() {
        for (;;) {
            const i = next;
            next += 1;
            if (i >= n) break;
            results[i] = await mapper(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: workers }, () => worker()));
    return results;
}

/** Etiquetas de ruta bajo la categoría raíz (sin duplicar el nombre de la categoría si ya es el 1.er crumb). */
function pathLabelsForMenuNavigationRow(row) {
    const raw = String(row.subcategoryLabel || '').trim();
    const parts = raw
        ? raw.split(' › ').map((s) => s.trim()).filter(Boolean)
        : [];
    const cl = String(row.categoryLabel || row.categoryValue || '').trim().toLowerCase();
    let out = parts;
    if (out.length > 1 && out[0].toLowerCase() === cl) {
        out = out.slice(1);
    }
    if (!out.length && raw) {
        out = parts;
    }
    return out;
}

function insertMenuRowIntoNavigationTree(root, row) {
    const labels = pathLabelsForMenuNavigationRow(row);
    if (!labels.length) return;
    let node = root;
    for (let depth = 0; depth < labels.length; depth++) {
        const lab = labels[depth];
        const key = `${depth}_${slugifyKey(lab)}`;
        if (!node.children) node.children = {};
        if (!node.children[key]) {
            node.children[key] = { label: lab, depth, children: {} };
        }
        const child = node.children[key];
        if (depth === labels.length - 1) {
            child.listingUrl = row.listingUrl;
            child.subcategoryValue = row.subcategoryValue;
            child.subcategoryLabel = row.subcategoryLabel;
        }
        node = child;
    }
}

/**
 * Reconstruye visaoNavigationTree por categoría raíz a partir de todas las filas del menú espejo.
 */
async function rebuildVisaoNavigationTrees(menuRows) {
    if (!menuRows || !menuRows.length) return { categoriesWithTree: 0 };

    const grouped = new Map();
    for (const r of menuRows) {
        if (!r.categoryValue || !r.subcategoryValue) continue;
        if (!grouped.has(r.categoryValue)) grouped.set(r.categoryValue, []);
        grouped.get(r.categoryValue).push(r);
    }

    let updated = 0;
    for (const [cv, rows] of grouped) {
        const root = {
            label: rows[0].categoryLabel || cv,
            value: cv,
            builtAt: new Date().toISOString(),
            source: SYNC_SOURCE,
            children: {}
        };
        for (const row of rows) {
            insertMenuRowIntoNavigationTree(root, row);
        }
        const res = await Category.updateOne({ value: cv }, { $set: { visaoNavigationTree: root } });
        if (res.matchedCount) updated += 1;
    }
    return { categoriesWithTree: updated, rootsBuilt: grouped.size };
}

function buildVisaoTaxonomyForProduct(scraped) {
    const listing = scraped._listingUrl || scraped.listingUrl || '';
    const fullLab = String(scraped._subcategoryLabel || scraped.subcategoryLabel || '').trim();
    const parts = fullLab ? fullLab.split(' › ').map((s) => s.trim()).filter(Boolean) : [];
    const rootLab = String(scraped._categoryLabel || scraped.categoryLabel || '').trim();
    const rootVal = String(scraped._categoryValue || scraped.categoryValue || '').trim();
    const leafSv = String(scraped._subcategoryValue || scraped.subcategoryValue || '').trim();

    let segments = parts.map((label, idx) => ({
        depth: idx,
        label,
        slug: slugifyKey(label)
    }));
    const cl = rootLab.toLowerCase();
    if (segments.length > 1 && String(segments[0].label || '').toLowerCase() === cl) {
        segments = segments.slice(1).map((s, idx) => ({ ...s, depth: idx }));
    }

    return {
        root: { label: rootLab, value: rootVal },
        segments,
        listingUrl: listing || undefined,
        leafSubcategoryValue: leafSv || undefined
    };
}

/**
 * Crea categoría / subcategorías en Mongo según filas del menú Visão (prep masivo).
 */
async function ensureCategoryTreeFromMenuRows(menuRows) {
    if (!menuRows || !menuRows.length) return { categoriesTouched: 0 };

    const byCat = new Map();
    for (const r of menuRows) {
        if (!r.categoryValue || !r.subcategoryValue) continue;
        if (!byCat.has(r.categoryValue)) {
            byCat.set(r.categoryValue, {
                categoryLabel: r.categoryLabel || r.categoryValue,
                subs: new Map()
            });
        }
        byCat.get(r.categoryValue).subs.set(r.subcategoryValue, r.subcategoryLabel || r.subcategoryValue);
    }

    let orderBase =
        (await Category.findOne().sort({ order: -1 }).select('order').lean())?.order || 0;

    let touched = 0;
    for (const [cv, info] of byCat) {
        let cat = await Category.findOne({ value: cv });
        if (!cat) {
            orderBase += 1;
            cat = new Category({
                name: info.categoryLabel,
                label: info.categoryLabel,
                value: cv,
                order: orderBase,
                isActive: true,
                color: DEFAULT_CATEGORY_COLOR,
                icon: DEFAULT_CATEGORY_ICON,
                subcategories: []
            });
            await cat.save();
            console.log(`[ESTRUCTURA] Creada nueva categoría: ${info.categoryLabel}`);
        }

        let changed = false;
        for (const [sv, slabel] of info.subs) {
            const exists = cat.subcategories.some((s) => s.value === sv);
            if (!exists) {
                cat.subcategories.push({
                    name: slabel,
                    label: slabel,
                    value: sv,
                    isActive: true,
                    order: cat.subcategories.length + 1,
                    specifications: []
                });
                changed = true;
                console.log(`[ESTRUCTURA] Creada nueva subcategoría: ${slabel} (categoría ${info.categoryLabel})`);
            }
        }
        if (changed) {
            await cat.save();
            touched++;
        }
    }

    return { categoriesTouched: touched, uniqueCategories: byCat.size };
}

/**
 * Por cada producto: asegura Category + Subcategoría y añade specs faltantes en subcategorías.specifications.
 */
async function prepareCategorySpecInfrastructure({
    categoryValue,
    categoryLabel,
    subcategoryValue,
    subcategoryLabel,
    standardizedSpecs,
    labelByName
}) {
    const catLabel = (categoryLabel || categoryValue || 'Catálogo').trim();
    const subLab = (subcategoryLabel || subcategoryValue).trim();

    let cat = await Category.findOne({ value: categoryValue });
    if (!cat) {
        let orderMax =
            (await Category.findOne().sort({ order: -1 }).select('order').lean())?.order || 0;
        orderMax += 1;
        cat = new Category({
            name: catLabel,
            label: catLabel,
            value: categoryValue,
            order: orderMax,
            isActive: true,
            color: DEFAULT_CATEGORY_COLOR,
            icon: DEFAULT_CATEGORY_ICON,
            subcategories: []
        });
        await cat.save();
        console.log(`[ESTRUCTURA] Creada nueva categoría: ${catLabel}`);
    }

    let sub = cat.subcategories.find((s) => s.value === subcategoryValue);
    if (!sub) {
        cat.subcategories.push({
            name: subLab,
            label: subLab,
            value: subcategoryValue,
            isActive: true,
            order: cat.subcategories.length + 1,
            specifications: []
        });
        sub = cat.subcategories[cat.subcategories.length - 1];
        console.log(`[ESTRUCTURA] Creada nueva subcategoría: ${subLab} (categoría ${catLabel})`);
    }

    let orderBase = sub.specifications.length;
    for (const name of Object.keys(standardizedSpecs)) {
        const label = labelByName[name] || name;
        const exists = sub.specifications.some(
            (sp) =>
                sp.name === name ||
                (sp.label && sp.label.toLowerCase() === String(label).toLowerCase())
        );
        if (!exists) {
            orderBase += 1;
            sub.specifications.push({
                name,
                label,
                type: 'text',
                placeholder: '',
                required: false,
                order: orderBase
            });
            console.log(
                `[ESTRUCTURA] Añadida nueva especificación: ${label} → subcategoría ${subLab}`
            );
        }
    }

    await cat.save();

    sub = cat.subcategories.find((s) => s.value === subcategoryValue);
    return {
        categoryId: cat._id,
        subcategoryId: sub ? sub._id : undefined
    };
}

async function persistOneVisaoProduct(scraped, ctx) {
    const {
        exchangeRate,
        deliveryCost,
        profitMargin,
        maxImagesPerProduct,
        scrapedCodigosSet,
        persistResults,
        imageFailureCounter,
        productIndex,
        productTotal,
        verboseProgressEvery,
        mirrorStrict: mirrorStrictOpt
    } = ctx;
    /** Por defecto estricto (texto desde Visão); el sync legado pasa mirrorStrict: false explícitamente. */
    const mirrorStrict = mirrorStrictOpt !== undefined ? !!mirrorStrictOpt : true;

    const code = resolveMirroredSupplierCodigo(scraped);
    if (!code) {
        persistResults.push({
            codigo: null,
            action: 'skipped',
            reason: 'invalid_supplier_code',
            url: scraped.url
        });
        return;
    }

    /** `scrapeProductDetailsParallel` ante rechazo/expiración usa `{ error, url, supplierCode }` sin PDP: no confundir con precio ausente */
    if (scraped.error) {
        persistResults.push({
            codigo: code,
            action: 'skipped',
            reason: 'scrape_error',
            detail:
                [scraped.error, scraped.scrapeRejectReason].filter(Boolean).join(' | ').slice(0, 520) ||
                String(scraped.error),
            url: scraped.url
        });
        return;
    }

    try {
        const precioUsdParsed = parseVisaoPrecioUsd(scraped.precioUsd);
        if (precioUsdParsed == null) {
            persistResults.push({
                codigo: code,
                action: 'skipped',
                reason: 'missing_price_usd',
                url: scraped.url
            });
            return;
        }

        let categoryValue =
            scraped._categoryValue ||
            scraped.categoryValue ||
            inferCategoryFromUrl(scraped.url || '').category;
        let subcategoryValue =
            scraped._subcategoryValue ||
            scraped.subcategoryValue ||
            inferCategoryFromUrl(scraped.url || '').subcategory;

        const categoryLabel = scraped._categoryLabel || scraped.categoryLabel;
        const subcategoryLabel = scraped._subcategoryLabel || scraped.subcategoryLabel;

        const pdpSeg = extractVisaoProdSegment(scraped.url || '');
        const rowCheck = {
            listingUrl: scraped._listingUrl || '',
            categoryValue: scraped._categoryValue || scraped.categoryValue,
            categoryLabel: scraped._categoryLabel || scraped.categoryLabel,
            subcategoryValue: scraped._subcategoryValue || scraped.subcategoryValue,
            subcategoryLabel: scraped._subcategoryLabel || scraped.subcategoryLabel
        };
        if (
            pdpSeg &&
            (rowCheck.listingUrl || rowCheck.subcategoryValue) &&
            !rowMatchesProdSegment(rowCheck, pdpSeg)
        ) {
            console.warn(
                `[SYNC][TAXONOMÍA] codigo=${code} segment PDP="${pdpSeg}" no aparece en listado/migas asignados (cv=${categoryValue} sv=${subcategoryValue}). Re-ejecutá mirror completo tras actualizar scraper.`
            );
        }

        const rawSpecs =
            scraped.technicalSpecifications && typeof scraped.technicalSpecifications === 'object'
                ? { ...scraped.technicalSpecifications }
                : scraped.especificaciones && typeof scraped.especificaciones === 'object'
                  ? { ...scraped.especificaciones }
                  : {};

        const { standardized: specCanonical, labelByName } = normalizeVisaoSpecs(rawSpecs);
        if (Object.keys(specCanonical).length === 0) {
            console.warn(
                `[SYNC][SIN_SPECS] codigo=${code} url=${scraped.url || 'n/a'} titulo="${(scraped.titulo || '').slice(0, 120)}"`
            );
        }

        const { categoryId, subcategoryId } = await runCategoryOps(categoryValue, () =>
            prepareCategorySpecInfrastructure({
                categoryValue,
                categoryLabel,
                subcategoryValue,
                subcategoryLabel,
                standardizedSpecs: specCanonical,
                labelByName
            })
        );

        if (!categoryId || !subcategoryId) {
            console.warn(
                `[SYNC] codigo=${code} sin categoryId/subcategoryId tras prepareCategory (cv=${categoryValue} sv=${subcategoryValue})`
            );
        }

        let prices;
        try {
            prices = calculatePrices(precioUsdParsed, exchangeRate, deliveryCost, profitMargin);
        } catch (calcErr) {
            persistResults.push({
                codigo: code,
                action: 'skipped',
                reason: 'price_calc_error',
                error: calcErr.message || String(calcErr)
            });
            return;
        }
        if (!Number.isFinite(prices.sellingPrice) || prices.sellingPrice <= 0) {
            persistResults.push({
                codigo: code,
                action: 'skipped',
                reason: 'invalid_derived_prices'
            });
            return;
        }

        const tituloFallback = `Producto ${code}`;
        const tituloRaw = scraped.titulo != null ? String(scraped.titulo) : '';
        const titulo =
            mirrorStrict === true
                ? tituloRaw || tituloFallback
                : scraped.titulo && scraped.titulo.trim()
                  ? scraped.titulo.trim()
                  : tituloFallback;
        const fromMarca = resolveBrandFromMarca(rawSpecs, specCanonical);
        const brandName = fromMarca || inferBrandName(titulo);

        const descriptionNew = mirrorStrict
            ? scraped.descripcion == null
                ? ''
                : String(scraped.descripcion)
            : scraped.descripcion || '';

        const firebaseImageUrls = [];
        const altUrls = Array.isArray(scraped.imagenes) ? scraped.imagenes : [];
        for (let i = 0; i < Math.min(altUrls.length, maxImagesPerProduct); i++) {
            try {
                const imgRes = await importImageFromUrlWithRetries(
                    altUrls[i],
                    `${code}_${i}`,
                    {},
                    2
                );
                firebaseImageUrls.push(imgRes.publicUrl);
            } catch {
                if (imageFailureCounter && typeof imageFailureCounter.count === 'number') {
                    imageFailureCounter.count += 1;
                }
            }
        }
        const fallbackImageUrls = altUrls
            .map((u) => (u == null ? '' : String(u).trim()))
            .filter(Boolean);
        const productImageUrls =
            firebaseImageUrls.length > 0 ? firebaseImageUrls : fallbackImageUrls;

        const visaoTaxonomy = buildVisaoTaxonomyForProduct(scraped);

        const progressEvery = verboseProgressEvery != null ? verboseProgressEvery : 50;
        if (
            productIndex != null &&
            productTotal != null &&
            (productIndex === 1 ||
                productIndex === productTotal ||
                productIndex % progressEvery === 0)
        ) {
            console.log(`[PROGRESO] Procesado producto ${productIndex} de ${productTotal}...`);
        }

        const existing = await productModel.findOne({ codigo: code });

        /** Espejo completo Visão: cada corrida revalida y sobrescribe PDP → Mongo (imágenes, precios, taxonomía, texto, stock listado). */
        if (existing) {
            const beforeSnap = snapshotForMirrorCompare(existing);

            existing.productName = titulo;
            existing.brandName = mirrorStrict ? brandName : brandName || existing.brandName;
            existing.category = categoryValue;
            existing.subcategory = subcategoryValue;
            if (categoryId) existing.categoryId = categoryId;
            if (subcategoryId) existing.subcategoryId = subcategoryId;
            existing.productImage = productImageUrls;
            existing.documentationLink = scraped.url;
            existing.description = mirrorStrict
                ? descriptionNew
                : descriptionNew || existing.description;
            existing.syncSource = SYNC_SOURCE;
            existing.technicalSpecifications = specCanonical;
            existing.specifications = { ...specCanonical };
            applyCanonicalSpecsToDocument(existing, specCanonical);
            existing.price = 0;
            existing.purchasePriceUSD = prices.purchasePriceUSD;
            existing.exchangeRate = prices.exchangeRate;
            existing.purchasePrice = prices.purchasePrice;
            existing.deliveryCost = prices.deliveryCost;
            existing.profitMargin = prices.profitMargin;
            existing.profitAmount = prices.profitAmount;
            existing.sellingPrice = prices.sellingPrice;
            existing.stock = 1;
            existing.stockStatus = 'in_stock';
            existing.visaoTaxonomy = visaoTaxonomy;

            const afterSnap = snapshotForMirrorCompare(existing);
            const drifted = mirrorFieldDriftKeys(beforeSnap, afterSnap);
            if (drifted.length > 0) {
                console.log(
                    `[MIRROR] codigo=${code} difería del PDP/run anterior → re-alineado (${drifted.length} campos): ${drifted.slice(0, 24).join(', ')}${drifted.length > 24 ? '…' : ''}`
                );
            }

            existing.lastUpdatedFinance = new Date();
            await existing.save();
            scrapedCodigosSet.add(code);
            persistResults.push({
                codigo: code,
                action: 'updated',
                productId: String(existing._id)
            });
            return;
        }

        const checkSlugUnique = async (slug) => {
            const clash = await productModel.findOne({ slug });
            return !clash;
        };
        const uniqueSlug = await generateUniqueSlug(titulo, checkSlugUnique);

        const baseDoc = {
            productName: titulo,
            brandName,
            category: categoryValue,
            subcategory: subcategoryValue,
            categoryId,
            subcategoryId,
            productImage: productImageUrls,
            documentationLink: scraped.url,
            description: descriptionNew,
            technicalSpecifications: specCanonical,
            specifications: { ...specCanonical },
            price: 0,
            codigo: code,
            slug: uniqueSlug,
            syncSource: SYNC_SOURCE,
            purchasePriceUSD: prices.purchasePriceUSD,
            exchangeRate: prices.exchangeRate,
            purchasePrice: prices.purchasePrice,
            deliveryCost: prices.deliveryCost,
            profitMargin: prices.profitMargin,
            profitAmount: prices.profitAmount,
            sellingPrice: prices.sellingPrice,
            stock: 1,
            stockStatus: 'in_stock',
            lastUpdatedFinance: new Date(),
            visaoTaxonomy
        };
        applyCanonicalSpecsToDocument(baseDoc, specCanonical);

        const created = await productModel.create(baseDoc);
        scrapedCodigosSet.add(code);
        persistResults.push({
            codigo: code,
            action: 'created',
            productId: String(created._id)
        });
    } catch (err) {
        const out = {
            codigo: code,
            action: 'error',
            error: err.message || String(err)
        };
        if (err && err.name === 'ValidationError' && err.errors) {
            out.validationFields = Object.keys(err.errors);
        }
        persistResults.push(out);
    }
}

/**
 * Después del sync: desactivar categorías/subs que no están en el menú Visão y filtrar
 * definiciones de especificación según union de claves vistas en PDP (por sub).
 */
async function pruneMirrorTaxonomyAgainstVisao(bundle) {
    const menuRows = bundle.menuRows || [];
    const allowedCategories = new Set();
    const allowedSubsByCat = new Map();

    for (const r of menuRows) {
        if (!r.categoryValue || !r.subcategoryValue) continue;
        allowedCategories.add(r.categoryValue);
        if (!allowedSubsByCat.has(r.categoryValue)) {
            allowedSubsByCat.set(r.categoryValue, new Set());
        }
        allowedSubsByCat.get(r.categoryValue).add(r.subcategoryValue);
    }

    if (allowedCategories.size === 0) {
        console.warn(
            '[PRUNA] Sin categorías válidas del menú Visão → no se ejecuta poda (evitar vaciar el catálogo).'
        );
        return {
            skipped: true,
            reason: 'empty_menu_allowlist'
        };
    }

    const specNamesPerSub = new Map();
    const productsPerSub = new Map();

    for (const p of bundle.products || []) {
        const sv = p._subcategoryValue;
        if (!sv) continue;
        productsPerSub.set(sv, (productsPerSub.get(sv) || 0) + 1);
        const raw =
            p.especificaciones && typeof p.especificaciones === 'object'
                ? p.especificaciones
                : p.technicalSpecifications || {};
        const { standardized } = normalizeVisaoSpecs(raw);
        if (!specNamesPerSub.has(sv)) specNamesPerSub.set(sv, new Set());
        for (const k of Object.keys(standardized)) specNamesPerSub.get(sv).add(k);
    }

    let deactivatedCategories = 0;
    let deactivatedSubcategories = 0;
    let trimmedSpecDefinitions = 0;

    const allCats = await Category.find({});

    for (const cat of allCats) {
        let changed = false;
        const onVisaoRoot = allowedCategories.has(cat.value);

        if (!onVisaoRoot) {
            if (cat.isActive !== false) {
                cat.isActive = false;
                changed = true;
                deactivatedCategories++;
                console.log(`[PRUNA] Categoría inactiva (no está en menú Visão): ${cat.label}`);
            }
            for (const sub of cat.subcategories) {
                if (sub.isActive !== false) {
                    sub.isActive = false;
                    deactivatedSubcategories++;
                    changed = true;
                }
            }
        } else {
            const allowSubs = allowedSubsByCat.get(cat.value) || new Set();

            if (cat.isActive !== true) {
                cat.isActive = true;
                changed = true;
            }

            for (const sub of cat.subcategories) {
                const onMenu = allowSubs.has(sub.value);
                if (!onMenu) {
                    if (sub.isActive !== false) {
                        sub.isActive = false;
                        deactivatedSubcategories++;
                        changed = true;
                        console.log(
                            `[PRUNA] Subcategoría inactiva (fuera de menú Visão): ${sub.label} (${sub.value})`
                        );
                    }
                } else {
                    if (sub.isActive !== true) {
                        sub.isActive = true;
                        changed = true;
                    }

                    const nProds = productsPerSub.get(sub.value) || 0;
                    const allowNames = specNamesPerSub.get(sub.value);

                    if (nProds > 0 && allowNames && allowNames.size > 0) {
                        const prevLen = sub.specifications.length;
                        sub.specifications = sub.specifications.filter((sp) =>
                            allowNames.has(sp.name)
                        );
                        const cut = prevLen - sub.specifications.length;
                        if (cut > 0) {
                            trimmedSpecDefinitions += cut;
                            changed = true;
                            console.log(
                                `[PRUNA] Eliminadas ${cut} especificaciones en "${sub.label}" (no vistas en PDP de este ciclo)`
                            );
                        }
                    }
                }
            }
        }

        if (changed) await cat.save();
    }

    return {
        deactivatedCategories,
        deactivatedSubcategories,
        trimmedSpecDefinitions,
        skipped: false
    };
}

/**
 * Sincronización espejo: menú + listados paginados + PDP; categorías Mongo; opcional reset de stock global.
 */
async function syncVisionVipMirrorToMongo(opts = {}) {
    const startedAt = Date.now();
    const resetCatalog = !!opts.resetCatalog;
    const persistConcurrency =
        opts.persistConcurrency != null
            ? Math.min(24, Math.max(1, opts.persistConcurrency))
            : 10;
    const cleanupMissingStock = !!opts.cleanupMissingStock;
    /** Sobrescribe siempre texto/precios/datos PDP desde Visão cuando el producto se persiste correctamente */
    const mirrorStrict = opts.mirrorStrict !== false;

    const deliveryCost = opts.deliveryCost != null ? Number(opts.deliveryCost) : 0;
    const profitMargin = opts.profitMargin != null ? Number(opts.profitMargin) : 20;
    const maxImagesPerProduct =
        opts.maxImagesPerProduct != null ? Math.min(20, Math.max(1, opts.maxImagesPerProduct)) : 8;
    const mirrorPrune = opts.mirrorPrune !== false;
    const exportFrontendProductCategoryJs = opts.exportFrontendProductCategoryJs !== false;

    if (resetCatalog) {
        const resAll = await productModel.updateMany(
            {},
            { $set: { stock: 0, stockStatus: 'out_of_stock' } }
        );
        console.log(
            `[Visão mirror] resetCatalog=true → stock 0 en todos (${resAll.modifiedCount} docs).`
        );
    }

    console.log('[Visão mirror] Iniciando scrape espejo (puede tardar mucho)...');
    const bundle = await scrapeVisionVipMirror(opts.mirrorScrapeOpts || {});
    const uniqueCats = new Set(
        (bundle.menuRows || []).map((r) => r.categoryValue).filter(Boolean)
    ).size;

    console.log(
        `[INICIO] Categorías únicas en menú: ${uniqueCats}. Filas menú (sub-rutas listado): ${bundle.menuRows?.length || 0}. Productos PDP a procesar: ${bundle.productsReturned}.`
    );
    console.log(
        `[Visão mirror] Scrape terminó: ${bundle.productsReturned} PDP, ${bundle.menuRows?.length || 0} filas menú.`
    );

    const catReport = await ensureCategoryTreeFromMenuRows(bundle.menuRows || []);
    console.log('[Visão mirror] Prep árbol categorías:', catReport);

    const navReport = await rebuildVisaoNavigationTrees(bundle.menuRows || []);
    console.log('[Visão mirror] Árbol navegación Visão (visaoNavigationTree):', navReport);

    const rateDoc = await ExchangeRateModel.getCurrentRate('USD');
    const exchangeRate = Number(rateDoc.toPYG) > 0 ? Number(rateDoc.toPYG) : 7300;

    const persistResults = [];
    const scrapedCodigosSet = new Set();
    const catalogCodigosSet = codigosSeenInMirrorBundle(bundle.products || []);
    const catalogCodigos = [...catalogCodigosSet];
    const imageFailureCounter = { count: 0 };
    const total = bundle.products?.length || 0;

    await mapPool(bundle.products || [], persistConcurrency, async (p, idx) => {
        await persistOneVisaoProduct(p, {
            exchangeRate,
            deliveryCost,
            profitMargin,
            maxImagesPerProduct,
            scrapedCodigosSet,
            persistResults,
            imageFailureCounter,
            productIndex: idx + 1,
            productTotal: total,
            verboseProgressEvery: total <= 100 ? 10 : 50,
            mirrorStrict
        });
    });

    const scrapedCodigosPersistidos = [...scrapedCodigosSet];
    let stockCleanupCount = 0;

    if (
        cleanupMissingStock &&
        catalogCodigosSet.size > 0 &&
        (bundle.productsReturned || 0) > 0
    ) {
        const resMongo = await productModel.updateMany(
            { syncSource: SYNC_SOURCE, codigo: { $nin: catalogCodigos } },
            { $set: { stock: 0, stockStatus: 'out_of_stock' } }
        );
        stockCleanupCount = resMongo.modifiedCount ?? 0;
        console.log(
            `[Visão mirror] cleanupMissingStock codigos PDP=${catalogCodigosSet.size}: visao_vip sin SKU en último scrape → stock 0 (${stockCleanupCount} docs)`
        );
    }

    let pruneReport = null;
    if (mirrorPrune) {
        console.log('[PRUNA] Alineando taxonomía y filtros locales con el último scrape Visão…');
        pruneReport = await pruneMirrorTaxonomyAgainstVisao(bundle);
        console.log('[PRUNA] Resultado:', pruneReport);
    }

    let exportFrontendReport = { ok: false, skipped: !exportFrontendProductCategoryJs };
    if (exportFrontendProductCategoryJs) {
        console.log('[HEADER] Regenerando frontend/src/helpers/productCategory.js desde Mongo…');
        try {
            exportFrontendReport = await writeProductCategoryJsFromMongo();
            if (exportFrontendReport.ok) {
                console.log(
                    `[HEADER] OK (${exportFrontendReport.count} categorías activas → ${exportFrontendReport.path})`
                );
            } else {
                console.warn('[HEADER]', exportFrontendReport.error);
            }
        } catch (e) {
            exportFrontendReport = { ok: false, error: e.message || String(e) };
            console.warn('[HEADER]', exportFrontendReport.error);
        }
    }

    const mirrorSummary = buildSyncSummary(persistResults, startedAt, imageFailureCounter.count);
    console.log(
        `[RESUMEN] creados=${mirrorSummary.productsCreated} actualizados=${mirrorSummary.productsUpdated} omitidos=${mirrorSummary.productsSkipped} errores=${mirrorSummary.productsErrors} imágenes_fallidas=${mirrorSummary.imageImportFailures} tiempo_ms=${mirrorSummary.durationMs}`
    );

    Object.assign(mirrorSummary, {
        pruneReport,
        exportFrontendReport
    });

    return {
        mirror: true,
        mirrorStrict,
        resetCatalog,
        mirrorPrune,
        exportFrontendProductCategoryJs,
        exchangeRate,
        menuRowCount: bundle.menuRows?.length || 0,
        uniqueMenuCategories: uniqueCats,
        productUrlsCount: bundle.productUrlsCount,
        productsAttempted: bundle.productsReturned,
        categoryBootstrap: catReport,
        navigationBootstrap: navReport,
        scrapedCodigosEnCatalog: catalogCodigos,
        scrapedCodigosPersistidos,
        cleanupMissingStock,
        stockCleanupCount,
        persistResults,
        mirrorSummary
    };
}

/**
 * Flujo anterior (preview / scrape parcial sin jerarquía menú obligatoria).
 */
async function syncVisionVipCatalogToMongo(opts = {}) {
    const startedAt = Date.now();
    const mirrorMode = !!opts.mirrorMode;
    if (mirrorMode) {
        return syncVisionVipMirrorToMongo(opts);
    }

    const resetCatalog = !!opts.resetCatalog;
    if (resetCatalog) {
        const resAll = await productModel.updateMany(
            {},
            { $set: { stock: 0, stockStatus: 'out_of_stock' } }
        );
        console.log(
            `[Visão sync] resetCatalog → stock 0 global (${resAll.modifiedCount} docs).`
        );
    }

    const deliveryCost = opts.deliveryCost != null ? Number(opts.deliveryCost) : 0;
    const profitMargin = opts.profitMargin != null ? Number(opts.profitMargin) : 20;
    const maxImagesPerProduct =
        opts.maxImagesPerProduct != null ? Math.min(20, Math.max(1, opts.maxImagesPerProduct)) : 8;
    const cleanupMissingStock = !!opts.cleanupMissingStock;

    console.log('[Visão sync] Iniciando scrape (modo legado)...');
    const scrapeData = await scrapeVisionVipCatalog(opts.scrapeOpts || {});

    console.log(
        `[INICIO] Categorías (URLs seleccionadas): ${scrapeData.categoriesSelected?.length || 0}. Productos a procesar: ${scrapeData.productsReturned}.`
    );

    const rateDoc = await ExchangeRateModel.getCurrentRate('USD');
    const exchangeRate = Number(rateDoc.toPYG) > 0 ? Number(rateDoc.toPYG) : 7300;

    const persistResults = [];
    const scrapedCodigosSet = new Set();
    const catalogCodigosSet = codigosSeenInMirrorBundle(scrapeData.products || []);
    const catalogCodigos = [...catalogCodigosSet];
    const imageFailureCounter = { count: 0 };

    const rows = (scrapeData.categoriesSelected || []).map((u) => ({
        categoryLabel: 'Catálogo',
        categoryValue: 'visao_sync',
        subcategoryLabel: u,
        subcategoryValue: `visao_sync__${slugifyKey(u)}`,
        listingUrl: u
    }));
    await ensureCategoryTreeFromMenuRows(rows);

    const persistConcurrency =
        opts.persistConcurrency != null
            ? Math.min(24, Math.max(1, opts.persistConcurrency))
            : 8;

    const enriched = (scrapeData.products || []).map((p) => {
        const cat = inferCategoryFromUrl(p.url || '');
        return {
            ...p,
            technicalSpecifications:
                p.especificaciones && typeof p.especificaciones === 'object'
                    ? { ...p.especificaciones }
                    : {},
            _categoryValue: cat.category,
            _subcategoryValue: cat.subcategory
        };
    });

    const total = enriched.length;
    await mapPool(enriched, persistConcurrency, async (p, idx) => {
        await persistOneVisaoProduct(p, {
            exchangeRate,
            deliveryCost,
            profitMargin,
            maxImagesPerProduct,
            scrapedCodigosSet,
            persistResults,
            imageFailureCounter,
            productIndex: idx + 1,
            productTotal: total,
            verboseProgressEvery: total <= 100 ? 10 : 50,
            mirrorStrict: false
        });
    });

    const scrapedCodigosPersistidos = [...scrapedCodigosSet];
    let stockCleanupCount = 0;
    const productsReturnedLegacy = scrapeData.productsReturned || 0;
    if (cleanupMissingStock && catalogCodigosSet.size > 0 && productsReturnedLegacy > 0) {
        const resMongo = await productModel.updateMany(
            { syncSource: SYNC_SOURCE, codigo: { $nin: catalogCodigos } },
            { $set: { stock: 0, stockStatus: 'out_of_stock' } }
        );
        stockCleanupCount = resMongo.modifiedCount ?? 0;
    }

    const mirrorSummary = buildSyncSummary(persistResults, startedAt, imageFailureCounter.count);
    console.log(
        `[RESUMEN] creados=${mirrorSummary.productsCreated} actualizados=${mirrorSummary.productsUpdated} omitidos=${mirrorSummary.productsSkipped} errores=${mirrorSummary.productsErrors} imágenes_fallidas=${mirrorSummary.imageImportFailures} tiempo_ms=${mirrorSummary.durationMs}`
    );

    return {
        mirror: false,
        resetCatalog,
        scrapeSummary: {
            mode: scrapeData.mode,
            productsInResponse: scrapeData.productsReturned
        },
        exchangeRate,
        cleanupMissingStock,
        stockCleanupCount,
        scrapedCodigosEnCatalog: catalogCodigos,
        scrapedCodigosPersistidos,
        persistResults,
        mirrorSummary
    };
}

module.exports = {
    syncVisionVipCatalogToMongo,
    syncVisionVipMirrorToMongo,
    SYNC_SOURCE
};
