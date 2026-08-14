/**
 * Sincronización Visão Vip → MongoDB + Firebase Storage.
 * - Imágenes de producto: solo Firebase (nunca se persiste CDN Visão en productImage).
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
const { importImageFromUrlWithRetries, deleteFirebaseImages, isFirebaseStorageUrl } = require('./imageImportService');
const { calculateVisaoVipPrices } = require('../utils/priceCalculator');
const { generateUniqueSlug } = require('../utils/slugGenerator');
const { scrapeVisionVipCatalog } = require('./visionVipScraperService');
const {
    scrapeVisionVipMirror,
    extractVisaoProdSegment,
    rowMatchesProdSegment
} = require('./visionVipMirrorScrapeService');
const { writeProductCategoryJsFromMongo } = require('./exportCategoriesFrontendFile');
const { throwIfCancelled } = require('./workerLiveLog');

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

function parseVisaoPrecioPyg(raw) {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') {
        return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
    }
    let s = String(raw).trim();
    if (!/\d/.test(s)) return null;
    s = s.replace(/[^\d.,-]/g, '');
    if (!s) return null;
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
        s = s.replace(/\./g, '');
    } else {
        s = s.replace(/,/g, '');
    }
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/** Precio nativo del scrape (USD o Gs.) para la fórmula Visão. */
function resolveVisaoPriceFromScraped(scraped) {
    const fuente = String(scraped.precioFuente || '').toUpperCase();
    /** @type {{ precioFuente: string, precioPygRaw: number|null, precioUsd: number|null, precioListaFuente?: string, precioListaUsd?: number|null, precioListaPygRaw?: number|null }|null} */
    let base = null;
    if (fuente === 'PYG') {
        const pyg = parseVisaoPrecioPyg(scraped.precioPygRaw);
        if (pyg != null) {
            base = { precioFuente: 'PYG', precioPygRaw: pyg, precioUsd: null };
        }
    }
    if (base == null) {
        const usd = parseVisaoPrecioUsd(scraped.precioUsd);
        if (usd != null) {
            base = { precioFuente: 'USD', precioUsd: usd, precioPygRaw: null };
        }
    }
    if (base == null) return null;

    const listaFuente = String(scraped.precioListaFuente || '').toUpperCase();
    if (listaFuente === 'PYG') {
        const listPyg = parseVisaoPrecioPyg(scraped.precioListaPygRaw);
        if (listPyg != null) {
            base.precioListaFuente = 'PYG';
            base.precioListaPygRaw = listPyg;
            base.precioListaUsd = null;
        }
    } else if (listaFuente === 'USD' || scraped.precioListaUsd != null) {
        const listUsd = parseVisaoPrecioUsd(scraped.precioListaUsd);
        if (listUsd != null) {
            base.precioListaFuente = 'USD';
            base.precioListaUsd = listUsd;
            base.precioListaPygRaw = null;
        }
    }
    return base;
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

function nodeTextHaystack(node) {
    return [
        String(node?.label || ''),
        String(node?.subcategoryLabel || ''),
        String(node?.subcategoryValue || ''),
        String(node?.listingUrl || '')
    ]
        .join(' ')
        .toLowerCase();
}

function buildNavigationIndexFromCategories(categories) {
    const bySegment = new Map();
    for (const cat of categories || []) {
        const rootValue = String(cat?.value || '').trim();
        const rootLabel = String(cat?.label || cat?.name || rootValue || '').trim();
        const rootNode = cat?.visaoNavigationTree;
        if (!rootValue || !rootNode || typeof rootNode !== 'object') continue;
        const stack = [rootNode];
        while (stack.length) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;
            const hay = nodeTextHaystack(node);
            const candidate = {
                category: rootValue,
                categoryLabel: rootLabel,
                subcategory: String(node.subcategoryValue || '').trim(),
                subcategoryLabel: String(node.subcategoryLabel || node.label || '').trim()
            };
            if (candidate.subcategory) {
                const tokens = new Set();
                for (const src of [candidate.subcategory, candidate.subcategoryLabel, node.listingUrl || '']) {
                    String(src || '')
                        .toLowerCase()
                        .split(/[^a-z0-9]+/i)
                        .filter((x) => x && x.length >= 3)
                        .forEach((t) => tokens.add(t));
                }
                for (const t of tokens) {
                    if (!bySegment.has(t)) bySegment.set(t, []);
                    bySegment.get(t).push({ ...candidate, haystack: hay });
                }
            }
            for (const child of Object.values(node.children || {})) stack.push(child);
        }
    }
    return { bySegment };
}

async function getNavigationIndexCache(ctx) {
    if (ctx && ctx.navigationIndexCache) return ctx.navigationIndexCache;
    const cats = await Category.find({})
        .select('value label name visaoNavigationTree')
        .lean();
    const built = buildNavigationIndexFromCategories(cats);
    if (ctx) ctx.navigationIndexCache = built;
    return built;
}

async function inferCategoryFromUrlWithTreeFallback(productUrl, ctx) {
    const raw = inferCategoryFromUrl(productUrl);
    const segment = extractVisaoProdSegment(productUrl);
    if (!segment) return raw;
    try {
        const idx = await getNavigationIndexCache(ctx);
        const tokens = new Set(
            String(segment)
                .toLowerCase()
                .split(/[^a-z0-9]+/i)
                .filter((x) => x && x.length >= 3)
        );
        tokens.add(String(segment).toLowerCase().replace(/-/g, '_'));
        tokens.add(String(segment).toLowerCase().replace(/_/g, '-'));
        for (const t of tokens) {
            const candidates = idx.bySegment.get(t) || [];
            if (!candidates.length) continue;
            const pick = candidates.find((c) => c.haystack.includes(String(segment).toLowerCase())) || candidates[0];
            if (pick && pick.category && pick.subcategory) {
                return {
                    category: pick.category,
                    subcategory: pick.subcategory,
                    categoryLabel: pick.categoryLabel,
                    subcategoryLabel: pick.subcategoryLabel
                };
            }
        }
    } catch {
        /* ignore and keep raw fallback */
    }
    return raw;
}

function buildSyncSummary(persistResults, startedAt, imageFailureCount) {
    const skippedByReason = persistResults.reduce((acc, result) => {
        if (result.action !== 'skipped') return acc;
        const reason = result.reason || 'unknown';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
    }, {});

    const updatesByChangedField = {};
    for (const r of persistResults) {
        if (r.action !== 'updated' || !Array.isArray(r.changedFields)) continue;
        for (const f of r.changedFields) {
            updatesByChangedField[f] = (updatesByChangedField[f] || 0) + 1;
        }
    }

    return {
        durationMs: Date.now() - startedAt,
        productsCreated: persistResults.filter((r) => r.action === 'created').length,
        productsUpdated: persistResults.filter((r) => r.action === 'updated').length,
        productsSkipped: persistResults.filter((r) => r.action === 'skipped').length,
        productsErrors: persistResults.filter((r) => r.action === 'error').length,
        imageImportFailures: imageFailureCount,
        skippedByReason,
        updatesByChangedField
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
            throwIfCancelled();
            const i = next;
            next += 1;
            if (i >= n) break;
            results[i] = await mapper(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: workers }, () => worker()));
    return results;
}

/**
 * Ramas relativas al árbol de navegación (evita duplicar la primera etiqueta igual a la categoría raíz Visão).
 * Devuelve labels + values paralelos por nivel.
 */
function trimmedTaxonomyBranchesForTree(row) {
    const explicit = Array.isArray(row.taxonomyPathLabels)
        ? row.taxonomyPathLabels.map((s) => String(s || '').trim()).filter(Boolean)
        : [];
    const rawTrail = String(row.breadcrumbTrail || row.subcategoryLabel || '').trim();
    let parts =
        explicit.length > 0
            ? explicit
            : rawTrail
              ? rawTrail.split(' › ').map((s) => s.trim()).filter(Boolean)
              : [];
    const valsIn = Array.isArray(row.taxonomyPathValues)
        ? row.taxonomyPathValues.map((s) => String(s || '').trim())
        : [];

    const vals = [];
    for (let i = 0; i < parts.length; i++) {
        vals[i] = valsIn[i] != null && String(valsIn[i]).trim() !== '' ? String(valsIn[i]).trim() : '';
    }

    const cl = String(row.categoryLabel || row.categoryValue || '').trim().toLowerCase();
    let outLabs = [...parts];
    let outVals = vals.slice(0, outLabs.length);
    if (outLabs.length > 1 && String(outLabs[0] || '').trim().toLowerCase() === cl) {
        outLabs = outLabs.slice(1);
        outVals = outVals.slice(1);
    }
    if (!outLabs.length && parts.length) {
        outLabs = [...parts];
        outVals = vals.slice(0, outLabs.length);
    }
    return {
        labels: outLabs,
        values: outVals.map((v, idx) => (v ? v : `${slugifyKey(outLabs[idx] || `lvl_${idx}`)}__d${idx}`))
    };
}

/** @deprecated usar trimmedTaxonomyBranchesForTree cuando haga falta values */
function pathLabelsForMenuNavigationRow(row) {
    return trimmedTaxonomyBranchesForTree(row).labels;
}

function insertMenuRowIntoNavigationTree(root, row) {
    const { labels, values } = trimmedTaxonomyBranchesForTree(row);
    if (!labels.length) return;
    const chain = labels.map((label, depth) => ({
        label,
        depth,
        value: values[depth] || `${slugifyKey(label)}__d${depth}`,
        isLeaf: depth === labels.length - 1
    }));

    let branch = null;
    for (let i = chain.length - 1; i >= 0; i--) {
        const item = chain[i];
        const key = `${item.depth}_${item.value}`;
        const node = {
            key,
            label: item.label,
            depth: item.depth,
            value: item.value,
            isLeaf: item.isLeaf,
            /** Compat navegadores / reportes antiguos */
            isTarget: item.isLeaf,
            children: {}
        };
        if (i === chain.length - 1) {
            node.listingUrl = row.listingUrl;
            node.subcategoryValue = row.subcategoryValue;
            node.subcategoryLabel = row.subcategoryLabel;
            node.isLeaf = true;
            node.isTarget = true;
        }
        if (branch) node.children[branch.key] = branch;
        branch = node;
    }
    if (!branch) return;
    if (!root.children) root.children = {};
    function mergeNode(dst, src) {
        dst.label = dst.label || src.label;
        dst.value = dst.value || src.value;
        dst.depth = Number.isFinite(dst.depth) ? dst.depth : src.depth;
        if (src.listingUrl) dst.listingUrl = src.listingUrl;
        if (src.subcategoryValue) dst.subcategoryValue = src.subcategoryValue;
        if (src.subcategoryLabel) dst.subcategoryLabel = src.subcategoryLabel;
        dst.isLeaf = !!src.isLeaf || !!dst.isLeaf;
        if (src.isTarget != null) dst.isTarget = !!src.isTarget || !!dst.isTarget;
        if (!dst.children) dst.children = {};
        for (const [k, childSrc] of Object.entries(src.children || {})) {
            if (!dst.children[k]) dst.children[k] = childSrc;
            else mergeNode(dst.children[k], childSrc);
        }
    }
    if (!root.children[branch.key]) root.children[branch.key] = branch;
    else mergeNode(root.children[branch.key], branch);
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

async function ensureNavigationNodeForOrphanRow(row) {
    if (!row || !row.categoryValue || !row.subcategoryValue) return;
    const cat = await Category.findOne({ value: row.categoryValue }).select('label value visaoNavigationTree').lean();
    const root = cat?.visaoNavigationTree && typeof cat.visaoNavigationTree === 'object'
        ? { ...cat.visaoNavigationTree }
        : {
              label: row.categoryLabel || cat?.label || row.categoryValue,
              value: row.categoryValue,
              builtAt: new Date().toISOString(),
              source: SYNC_SOURCE,
              children: {}
          };
    insertMenuRowIntoNavigationTree(root, row);
    await Category.updateOne({ value: row.categoryValue }, { $set: { visaoNavigationTree: root } });
}

function buildVisaoTaxonomyForProduct(scraped) {
    const listing = scraped._listingUrl || scraped.listingUrl || '';

    /** Primero migas PDP; si no vinieron por timeout/DOM raro → menú espejo. */
    const pdpBread = (scraped._pdpBreadcrumbLabels || scraped.pdpBreadcrumbLabels || [])
        .map((s) => String(s || '').trim())
        .filter(Boolean);
    const menuLabs = (scraped._taxonomyPathLabels || [])
        .map((s) => String(s || '').trim())
        .filter(Boolean);
    const trailFromSub = String(scraped._subcategoryLabel || scraped.subcategoryLabel || '')
        .trim()
        .split(' › ')
        .map((s) => s.trim())
        .filter(Boolean);

    /** Array completo texto (prioridad PDP). */
    let hierarchy =
        pdpBread.length > 0 ? [...pdpBread] : menuLabs.length > 0 ? [...menuLabs] : trailFromSub.length ? [...trailFromSub] : [];

    const rootLab = String(scraped._categoryLabel || scraped.categoryLabel || '').trim();
    const rootVal = String(scraped._categoryValue || scraped.categoryValue || '').trim();
    const leafSv = String(scraped._subcategoryValue || scraped.subcategoryValue || '').trim();

    const pathValues = Array.isArray(scraped._taxonomyPathValues)
        ? scraped._taxonomyPathValues.map((s) => String(s || '').trim()).filter(Boolean)
        : [];
    let segments = hierarchy.map((label, idx) => ({
        depth: idx,
        label,
        slug: slugifyKey(label),
        value: pathValues[idx] || undefined
    }));
    const cl = rootLab.toLowerCase();
    if (segments.length > 1 && String(segments[0].label || '').toLowerCase() === cl) {
        hierarchy = hierarchy.slice(1);
        segments = segments.slice(1).map((s, idx) => ({ ...s, depth: idx }));
    }

    const leafLabelHuman =
        (hierarchy.length ? hierarchy[hierarchy.length - 1] : '') ||
        String(scraped._subcategoryLabel || scraped.subcategoryLabel || '').trim();

    return {
        root: { label: rootLab, value: rootVal },
        hierarchy,
        breadcrumbs: hierarchy,
        path: hierarchy,
        segments,
        listingUrl: listing || undefined,
        leafSubcategoryValue: leafSv || undefined,
        leafLabel: leafLabelHuman || undefined,
        isLeaf: scraped._isTargetCategoryNode === true || scraped._isLeafCategoryNode === true
    };
}

function isMongoDupKeyError(err) {
    return !!(err && (err.code === 11000 || err.code === 11001));
}

async function findCategoryOwningSubValue(subValue) {
    const sv = String(subValue || '').trim();
    if (!sv) return null;
    return Category.findOne({ 'subcategories.value': sv });
}

/**
 * Asegura una categoría raíz por value (reutiliza si ya existe; tolera E11000 de name/value).
 */
async function ensureRootCategoryDoc(categoryValue, categoryLabel) {
    const cv = String(categoryValue || '').trim();
    const catLabel = String(categoryLabel || cv || 'Catálogo').trim();
    if (!cv) return null;

    let cat = await Category.findOne({ value: cv });
    if (cat) return cat;

    let orderMax =
        (await Category.findOne().sort({ order: -1 }).select('order').lean())?.order || 0;
    orderMax += 1;
    cat = new Category({
        name: catLabel,
        label: catLabel,
        value: cv,
        order: orderMax,
        isActive: true,
        color: DEFAULT_CATEGORY_COLOR,
        icon: DEFAULT_CATEGORY_ICON,
        subcategories: []
    });
    try {
        await cat.save();
        console.log(`[ESTRUCTURA] Creada nueva categoría: ${catLabel}`);
        return cat;
    } catch (err) {
        if (!isMongoDupKeyError(err)) throw err;
        cat =
            (await Category.findOne({ value: cv })) ||
            (await Category.findOne({ name: catLabel })) ||
            (await Category.findOne({ label: catLabel }));
        if (!cat) throw err;
        console.warn(
            `[ESTRUCTURA] E11000 al crear categoría ${cv}; reutilizo ${cat.value || cat._id}`
        );
        return cat;
    }
}

/**
 * Índice único global `subcategories.value`: si ya existe → reutilizar; si no → crear.
 * Nunca duplica el mismo value en otro documento (evita tumbar el sync diario).
 */
async function ensureSubcategoryOnCategoryDoc(preferredCat, subcategoryValue, subcategoryLabel) {
    const sv = String(subcategoryValue || '').trim();
    const slabel = String(subcategoryLabel || sv).trim() || sv;
    if (!sv || !preferredCat) return { cat: preferredCat, sub: null, created: false };

    let sub = (preferredCat.subcategories || []).find((s) => s.value === sv);
    if (sub) {
        if (sub.isActive === false) {
            sub.isActive = true;
            await preferredCat.save();
        }
        return { cat: preferredCat, sub, created: false };
    }

    const owner = await findCategoryOwningSubValue(sv);
    if (owner) {
        sub = (owner.subcategories || []).find((s) => s.value === sv);
        if (sub && sub.isActive === false) {
            sub.isActive = true;
            await owner.save();
        }
        console.log(
            `[ESTRUCTURA] Reutilizo subcategoría value=${sv} (ya en categoría ${owner.label || owner.value})`
        );
        return { cat: owner, sub, created: false, reused: true };
    }

    preferredCat.subcategories.push({
        name: slabel,
        label: slabel,
        value: sv,
        isActive: true,
        order: preferredCat.subcategories.length + 1,
        specifications: []
    });
    try {
        await preferredCat.save();
        sub = preferredCat.subcategories.find((s) => s.value === sv);
        console.log(
            `[ESTRUCTURA] Creada nueva subcategoría: ${slabel} (categoría ${preferredCat.label || preferredCat.value})`
        );
        return { cat: preferredCat, sub, created: true };
    } catch (err) {
        if (!isMongoDupKeyError(err)) throw err;
        // Carrera / índice: otro doc ya tiene el value → descartar push local y reutilizar.
        const freshPreferred = await Category.findById(preferredCat._id);
        const again = await findCategoryOwningSubValue(sv);
        if (!again) throw err;
        sub = (again.subcategories || []).find((s) => s.value === sv);
        console.warn(
            `[ESTRUCTURA] E11000 al crear sub ${sv}; reutilizo existente en ${again.value}`
        );
        return {
            cat: again,
            sub,
            created: false,
            reused: true,
            preferredCat: freshPreferred || preferredCat
        };
    }
}

/**
 * Crea categoría / subcategorías en Mongo según filas del menú Visão (prep masivo).
 * Si la sub ya existe en cualquier categoría → se reutiliza (índice único global).
 */
async function ensureCategoryTreeFromMenuRows(menuRows) {
    if (!menuRows || !menuRows.length) return { categoriesTouched: 0 };

    const byCat = new Map();
    for (const r of menuRows) {
        if (!r.categoryValue || !r.subcategoryValue) continue;
        /** En Mongo sólo nombre de la hoja donde cae el producto (label subcategoría). */
        const resolvedSubLabel = String(r.subcategoryLabel || '').trim()
            ? String(r.subcategoryLabel || '').trim()
            : String(r.subcategoryValue || '').trim();
        if (!byCat.has(r.categoryValue)) {
            byCat.set(r.categoryValue, {
                categoryLabel: r.categoryLabel || r.categoryValue,
                subs: new Map()
            });
        }
        byCat.get(r.categoryValue).subs.set(r.subcategoryValue, resolvedSubLabel);
    }

    let touched = 0;
    let reusedSubs = 0;
    let createdSubs = 0;
    for (const [cv, info] of byCat) {
        try {
            const cat = await ensureRootCategoryDoc(cv, info.categoryLabel);
            if (!cat) continue;

            let changedHere = false;
            for (const [sv, slabel] of info.subs) {
                const ensured = await ensureSubcategoryOnCategoryDoc(cat, sv, slabel);
                if (ensured.created) {
                    createdSubs += 1;
                    changedHere = true;
                } else if (ensured.reused) {
                    reusedSubs += 1;
                }
            }
            if (changedHere) touched += 1;
        } catch (err) {
            console.warn(
                `[ESTRUCTURA] Continúo tras error en categoría ${cv}: ${err && err.message ? err.message : err}`
            );
        }
    }

    if (reusedSubs || createdSubs) {
        console.log(
            `[ESTRUCTURA] Menú: categorías tocadas=${touched} subs nuevas=${createdSubs} subs reutilizadas=${reusedSubs}`
        );
    }

    return {
        categoriesTouched: touched,
        uniqueCategories: byCat.size,
        createdSubs,
        reusedSubs
    };
}

/**
 * Por cada producto: asegura Category + Subcategoría y añade specs faltantes en subcategorías.specifications.
 * Reutiliza subcategoría existente (índice único) en lugar de fallar con E11000.
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

    let cat = await ensureRootCategoryDoc(categoryValue, catLabel);
    if (!cat) {
        return { categoryId: undefined, subcategoryId: undefined };
    }

    const ensured = await ensureSubcategoryOnCategoryDoc(cat, subcategoryValue, subLab);
    cat = ensured.cat || cat;
    let sub = ensured.sub;
    if (!sub) {
        return { categoryId: cat._id, subcategoryId: undefined };
    }

    let orderBase = Array.isArray(sub.specifications) ? sub.specifications.length : 0;
    let specsChanged = false;
    for (const name of Object.keys(standardizedSpecs || {})) {
        const label = labelByName[name] || name;
        const exists = (sub.specifications || []).some(
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
            specsChanged = true;
            console.log(
                `[ESTRUCTURA] Añadida nueva especificación: ${label} → subcategoría ${subLab}`
            );
        }
    }

    if (specsChanged) {
        try {
            await cat.save();
        } catch (err) {
            if (!isMongoDupKeyError(err)) throw err;
            console.warn(
                `[ESTRUCTURA] E11000 al guardar specs sub=${subcategoryValue}; reintento con doc fresco`
            );
            const owner = await findCategoryOwningSubValue(subcategoryValue);
            if (owner) {
                cat = owner;
                sub = (owner.subcategories || []).find((s) => s.value === subcategoryValue);
            }
        }
    }

    sub = (cat.subcategories || []).find((s) => s.value === subcategoryValue) || sub;
    return {
        categoryId: cat._id,
        subcategoryId: sub ? sub._id : undefined
    };
}

/**
 * Productos Visão que ya no están en el scrape: stock 0 + borrar imágenes de Firebase
 * (libera cuota). Deja en Mongo solo URLs no-Firebase (p. ej. CDN Visão) si las hubiera.
 */
async function markMissingVisaoProductsOutOfStockAndCleanupImages(catalogCodigos) {
    const filter = {
        syncSource: SYNC_SOURCE,
        codigo: { $nin: catalogCodigos }
    };

    const toClean = await productModel
        .find(filter)
        .select('_id codigo productImage stock stockStatus')
        .lean();

    let firebaseDeleted = 0;
    let firebaseFailed = 0;
    let productsWithFirebaseCleanup = 0;

    const BATCH = 25;
    for (let i = 0; i < toClean.length; i += BATCH) {
        const batch = toClean.slice(i, i + BATCH);
        await Promise.all(
            batch.map(async (doc) => {
                const urls = Array.isArray(doc.productImage) ? doc.productImage : [];
                const firebaseUrls = urls.filter(isFirebaseStorageUrl);
                if (firebaseUrls.length === 0) return;

                const del = await deleteFirebaseImages(firebaseUrls, { maxConcurrent: 6 });
                firebaseDeleted += del.deleted;
                firebaseFailed += del.failed;
                productsWithFirebaseCleanup += 1;

                const kept = urls.filter((u) => !isFirebaseStorageUrl(u));
                await productModel.updateOne(
                    { _id: doc._id },
                    {
                        $set: {
                            stock: 0,
                            stockStatus: 'out_of_stock',
                            productImage: kept
                        }
                    }
                );
            })
        );
    }

    const resMongo = await productModel.updateMany(filter, {
        $set: { stock: 0, stockStatus: 'out_of_stock' }
    });

    return {
        stockCleanupCount: resMongo.modifiedCount ?? 0,
        productsScanned: toClean.length,
        productsWithFirebaseCleanup,
        firebaseDeleted,
        firebaseFailed
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
    throwIfCancelled();
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
        const priceInput = resolveVisaoPriceFromScraped(scraped);
        if (priceInput == null) {
            persistResults.push({
                codigo: code,
                action: 'skipped',
                reason: 'missing_price',
                url: scraped.url
            });
            return;
        }

        let categoryValue = scraped._categoryValue || scraped.categoryValue;
        let subcategoryValue = scraped._subcategoryValue || scraped.subcategoryValue;
        let inferredFallback = null;
        if (!categoryValue || !subcategoryValue) {
            inferredFallback = await inferCategoryFromUrlWithTreeFallback(scraped.url || '', ctx);
            categoryValue = categoryValue || inferredFallback.category;
            subcategoryValue = subcategoryValue || inferredFallback.subcategory;
        }

        const categoryLabel =
            scraped._categoryLabel || scraped.categoryLabel || inferredFallback?.categoryLabel;

        const pdpBreadForLabel = (scraped._pdpBreadcrumbLabels || scraped.pdpBreadcrumbLabels || [])
            .map((s) => String(s || '').trim())
            .filter(Boolean);
        const menuLeaf =
            Array.isArray(scraped._taxonomyPathLabels) && scraped._taxonomyPathLabels.length
                ? String(scraped._taxonomyPathLabels[scraped._taxonomyPathLabels.length - 1] || '').trim()
                : '';
        /** Texto mostrado en subcategoría Mongo: último nivel visible (PDP > menú > inferido). */
        const subcategoryLabel =
            (pdpBreadForLabel.length ? pdpBreadForLabel[pdpBreadForLabel.length - 1] : '') ||
            menuLeaf ||
            String(scraped._subcategoryLabel || scraped.subcategoryLabel || '').trim() ||
            inferredFallback?.subcategoryLabel;

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

        if (!scraped._subcategoryValue && subcategoryValue) {
            const orphanRow = {
                categoryValue,
                categoryLabel: categoryLabel || categoryValue,
                subcategoryValue,
                subcategoryLabel: subcategoryLabel || subcategoryValue,
                listingUrl: scraped._listingUrl || scraped.listingUrl || '',
                isTarget: true,
                isLeaf: true,
                taxonomyPathLabels: Array.isArray(scraped._taxonomyPathLabels)
                    ? scraped._taxonomyPathLabels
                    : String(subcategoryLabel || subcategoryValue).split(' › ').map((s) => s.trim()).filter(Boolean),
                taxonomyPathValues: Array.isArray(scraped._taxonomyPathValues) ? scraped._taxonomyPathValues : []
            };
            await ensureNavigationNodeForOrphanRow(orphanRow).catch(() => {});
        }

        if (!categoryId || !subcategoryId) {
            console.warn(
                `[SYNC] codigo=${code} sin categoryId/subcategoryId tras prepareCategory (cv=${categoryValue} sv=${subcategoryValue})`
            );
        }

        let prices;
        try {
            prices = calculateVisaoVipPrices({
                ...priceInput,
                exchangeRate,
                profitMargin,
                deliveryCost,
            });
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

        /** Solo Firebase en productImage (nunca se escribe CDN Visão). Reutiliza URLs Firebase si ya existen. */
        const existing = await productModel.findOne({ codigo: code });
        const previousImages = Array.isArray(existing?.productImage)
            ? existing.productImage.slice()
            : [];
        const existingFirebaseUrls = previousImages.filter(isFirebaseStorageUrl);
        const forceReimportImages = !!ctx.forceReimportImages;

        /** null = no tocar productImage (p. ej. aún tiene CDN viejo hasta que la subida a Firebase funcione) */
        let productImageUrls = null;
        if (existingFirebaseUrls.length > 0 && !forceReimportImages) {
            productImageUrls = existingFirebaseUrls;
        } else {
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
                    if (imgRes && imgRes.publicUrl && isFirebaseStorageUrl(imgRes.publicUrl)) {
                        firebaseImageUrls.push(imgRes.publicUrl);
                    }
                } catch (imgErr) {
                    if (imageFailureCounter && typeof imageFailureCounter.count === 'number') {
                        imageFailureCounter.count += 1;
                        if (imageFailureCounter.count <= 8) {
                            const msg =
                                (imgErr && (imgErr.code || imgErr.message)) || String(imgErr || '');
                            console.warn(
                                `[IMAGE] fallo upload codigo=${code} idx=${i}: ${String(msg).slice(0, 180)}`
                            );
                        }
                    }
                }
            }
            if (firebaseImageUrls.length > 0) {
                productImageUrls = firebaseImageUrls;
            } else if (existingFirebaseUrls.length > 0) {
                productImageUrls = existingFirebaseUrls;
            }
        }

        if (!existing && !(productImageUrls && productImageUrls.length)) {
            persistResults.push({
                codigo: code,
                action: 'skipped',
                reason: 'firebase_images_required',
                detail:
                    'Alta nueva sin URL Firebase (subida fallida/cuota). No se usa CDN Visão. Liberá Storage o activá Blaze y re-sincronizá.',
                url: scraped.url
            });
            return;
        }

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

        /** Espejo completo Visão: cada corrida revalida y sobrescribe PDP → Mongo (imágenes Firebase, precios, taxonomía, texto, stock listado). */
        if (existing) {
            const beforeSnap = snapshotForMirrorCompare(existing);

            existing.productName = titulo;
            existing.brandName = mirrorStrict ? brandName : brandName || existing.brandName;
            existing.category = categoryValue;
            existing.subcategory = subcategoryValue;
            if (categoryId) existing.categoryId = categoryId;
            if (subcategoryId) existing.subcategoryId = subcategoryId;
            if (productImageUrls && productImageUrls.length > 0) {
                existing.productImage = productImageUrls;
            }
            existing.documentationLink = scraped.url;
            existing.description = mirrorStrict
                ? descriptionNew
                : descriptionNew || existing.description;
            existing.syncSource = SYNC_SOURCE;
            existing.technicalSpecifications = specCanonical;
            existing.specifications = { ...specCanonical };
            applyCanonicalSpecsToDocument(existing, specCanonical);
            existing.price = Number.isFinite(prices.price) && prices.price > 0 ? prices.price : 0;
            existing.purchasePriceUSD = prices.purchasePriceUSD;
            existing.exchangeRate = prices.exchangeRate;
            existing.purchasePrice = prices.purchasePrice;
            existing.deliveryCost = prices.deliveryCost;
            existing.profitMargin = prices.profitMargin;
            existing.profitAmount = prices.profitAmount;
            existing.sellingPrice = prices.sellingPrice;
            existing.visaoPrecioFuente = prices.precioFuente;
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

            if (productImageUrls && productImageUrls.length > 0) {
                const newSet = new Set(productImageUrls.filter(Boolean));
                const orphanedFirebase = previousImages.filter(
                    (u) => isFirebaseStorageUrl(u) && !newSet.has(u)
                );
                if (orphanedFirebase.length > 0) {
                    try {
                        await deleteFirebaseImages(orphanedFirebase, { maxConcurrent: 6 });
                    } catch {
                        /* no bloquear el sync si falla el borrado */
                    }
                }
            }

            scrapedCodigosSet.add(code);
            persistResults.push({
                codigo: code,
                action: 'updated',
                productId: String(existing._id),
                changedFields: drifted,
                imagesFirebaseOnly: !!(productImageUrls && productImageUrls.length)
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
            price: Number.isFinite(prices.price) && prices.price > 0 ? prices.price : 0,
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
            visaoPrecioFuente: prices.precioFuente,
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
            productId: String(created._id),
            changedFields: ['__created__']
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
    const minMenuRowsForPrune = Math.max(1, Number(bundle.minMenuRowsForPrune) || 20);
    if (menuRows.length < minMenuRowsForPrune) {
        console.warn(
            `[PRUNA] Menú incompleto (${menuRows.length} filas < mínimo ${minMenuRowsForPrune}) → se aborta poda de seguridad.`
        );
        return {
            skipped: true,
            reason: 'menu_rows_below_safety_threshold',
            menuRows: menuRows.length,
            minMenuRowsForPrune
        };
    }
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
    const minMenuRowsForPrune =
        opts.minMenuRowsForPrune != null
            ? Math.max(1, Number(opts.minMenuRowsForPrune))
            : 20;
    const exportFrontendProductCategoryJs = opts.exportFrontendProductCategoryJs !== false;
    const forceReimportImages = !!opts.forceReimportImages;

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

    let catReport = { categoriesTouched: 0 };
    try {
        catReport = await ensureCategoryTreeFromMenuRows(bundle.menuRows || []);
        console.log('[Visão mirror] Prep árbol categorías:', catReport);
    } catch (err) {
        console.warn(
            '[Visão mirror] Prep árbol categorías falló (continúo a PERSIST):',
            err && err.message ? err.message : err
        );
    }

    let navReport = { categoriesWithTree: 0 };
    try {
        navReport = await rebuildVisaoNavigationTrees(bundle.menuRows || []);
        console.log('[Visão mirror] Árbol navegación Visão (visaoNavigationTree):', navReport);
    } catch (err) {
        console.warn(
            '[Visão mirror] Árbol navegación falló (continúo):',
            err && err.message ? err.message : err
        );
    }

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
            mirrorStrict,
            forceReimportImages
        });
    });

    const scrapedCodigosPersistidos = [...scrapedCodigosSet];
    let stockCleanupCount = 0;
    let firebaseImageCleanup = null;

    /** SKUs que entraron al catálogo del scrape pero no terminaron en created/updated (errores, skip PDP, precio, etc.) */
    const catalogSkusNotPersisted = [...catalogCodigosSet].filter((c) => !scrapedCodigosSet.has(c));

    if (
        cleanupMissingStock &&
        catalogCodigosSet.size > 0 &&
        (bundle.productsReturned || 0) > 0
    ) {
        firebaseImageCleanup = await markMissingVisaoProductsOutOfStockAndCleanupImages(catalogCodigos);
        stockCleanupCount = firebaseImageCleanup.stockCleanupCount;
        console.log(
            `[Visão mirror] cleanupMissingStock codigos PDP=${catalogCodigosSet.size}: visao_vip sin SKU en último scrape → stock 0 (${stockCleanupCount} docs); firebase borradas=${firebaseImageCleanup.firebaseDeleted} fallidas=${firebaseImageCleanup.firebaseFailed}`
        );
    }

    let pruneReport = null;
    if (mirrorPrune) {
        console.log('[PRUNA] Alineando taxonomía y filtros locales con el último scrape Visão…');
        pruneReport = await pruneMirrorTaxonomyAgainstVisao({
            ...bundle,
            minMenuRowsForPrune
        });
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
        minMenuRowsForPrune,
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
        reconciliation: {
            catalogSkuCount: catalogCodigosSet.size,
            persistedSkuCount: scrapedCodigosSet.size,
            catalogSkusNotPersistedCount: catalogSkusNotPersisted.length,
            catalogSkusNotPersistedSample: catalogSkusNotPersisted.slice(0, 40),
            cleanupApplied:
                cleanupMissingStock &&
                catalogCodigosSet.size > 0 &&
                (bundle.productsReturned || 0) > 0,
            cleanupFilter:
                'syncSource=visao_vip y codigo no está en el conjunto de SKU del último scrape completo'
        },
        cleanupMissingStock,
        stockCleanupCount,
        firebaseImageCleanup,
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

    const enriched = (scrapeData.products || []).map((p) => ({
        ...p,
        technicalSpecifications:
            p.especificaciones && typeof p.especificaciones === 'object'
                ? { ...p.especificaciones }
                : {}
    }));

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
    const catalogSkusNotPersisted = [...catalogCodigosSet].filter((c) => !scrapedCodigosSet.has(c));
    let stockCleanupCount = 0;
    let firebaseImageCleanup = null;
    const productsReturnedLegacy = scrapeData.productsReturned || 0;
    if (cleanupMissingStock && catalogCodigosSet.size > 0 && productsReturnedLegacy > 0) {
        firebaseImageCleanup = await markMissingVisaoProductsOutOfStockAndCleanupImages(catalogCodigos);
        stockCleanupCount = firebaseImageCleanup.stockCleanupCount;
        console.log(
            `[Visão sync] cleanupMissingStock → stock 0 (${stockCleanupCount}); firebase borradas=${firebaseImageCleanup.firebaseDeleted}`
        );
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
        firebaseImageCleanup,
        scrapedCodigosEnCatalog: catalogCodigos,
        scrapedCodigosPersistidos,
        reconciliation: {
            catalogSkuCount: catalogCodigosSet.size,
            persistedSkuCount: scrapedCodigosSet.size,
            catalogSkusNotPersistedCount: catalogSkusNotPersisted.length,
            catalogSkusNotPersistedSample: catalogSkusNotPersisted.slice(0, 40),
            cleanupApplied:
                cleanupMissingStock && catalogCodigosSet.size > 0 && productsReturnedLegacy > 0,
            cleanupFilter:
                'syncSource=visao_vip y codigo no está en el conjunto de SKU del último scrape (legado)'
        },
        persistResults,
        mirrorSummary
    };
}

module.exports = {
    syncVisionVipCatalogToMongo,
    syncVisionVipMirrorToMongo,
    SYNC_SOURCE,
    /** Diagnóstico / scripts de muestra (`scripts/debug-mirror-taxonomy-sample.js`). */
    buildVisaoTaxonomyForProduct
};
