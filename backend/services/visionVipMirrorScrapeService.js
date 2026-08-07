/**
 * Scrape "espejo" Visão Vip: jerarquía real del menú lateral + listados paginados + PDP.
 */

const puppeteer = require('puppeteer');
const {
    getLaunchOptions,
    collectCategoryUrls,
    collectProductUrlsForCategory,
    scrapeProductDetailsParallel,
    HOME_URL,
    puppeteerBrowserResponsive,
    relaunchMutableBrowserHolder,
    isDisconnectedOrDeadBrowserError
} = require('./visionVipScraperService');

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureMirrorBrowser(ctx) {
    if (await puppeteerBrowserResponsive(ctx.browser)) return;
    await relaunchMutableBrowserHolder(ctx);
}

function absolutizeListingUrl(u) {
    try {
        const abs = new URL(String(u || '').trim(), HOME_URL).href;
        if (!/visaovip\.com/i.test(abs)) return null;
        return abs.split('?')[0].replace(/\/+$/, '');
    } catch {
        return null;
    }
}

/** URL de listado canónica sin query para deduplicar. */
function canonCategoryUrl(u) {
    try {
        const nu = String(u || '')
            .split('?')[0]
            .replace(/\/+$/, '');
        return nu || '';
    } catch {
        return '';
    }
}

function crumbDepth(label) {
    if (!label || typeof label !== 'string') return 1;
    return label.split(' › ').filter(Boolean).length;
}

/** Se queda la fila con migas más profundas (espejo del menú desplegable). */
/** Profundidad de ruta de listado (migas) para elegir la meta correcta por PDP duplicada en varios niveles. */
function listingBreadcrumbDepth(row) {
    if (!row) return 0;
    if (Array.isArray(row.taxonomyPathLabels) && row.taxonomyPathLabels.length) {
        return row.taxonomyPathLabels.filter(Boolean).length;
    }
    if (!row.subcategoryLabel) return 0;
    return String(row.subcategoryLabel)
        .split(' › ')
        .map((s) => s.trim())
        .filter(Boolean).length;
}

function taxonomyPathDepth(row) {
    return listingBreadcrumbDepth(row);
}

function shouldPreferListingMeta(existing, incoming) {
    const d1 = taxonomyPathDepth(existing);
    const d2 = taxonomyPathDepth(incoming);
    if (d2 > d1) return true;
    if (d2 === d1 && String(incoming.subcategoryValue || '').length > String(existing.subcategoryValue || '').length) {
        return true;
    }
    return false;
}

/** Segmento de familia en la PDP Visão: /es/prod/{esto}/... */
function extractVisaoProdSegment(productUrl) {
    try {
        const pathname = new URL(String(productUrl || '').trim()).pathname;
        const m = String(pathname).match(/^\/es\/prod\/([^/]+)\//i);
        return m ? m[1].trim().toLowerCase() : '';
    } catch {
        return '';
    }
}

function rowHaystackForProdMatch(row) {
    const joinedPath = Array.isArray(row.taxonomyPathLabels)
        ? row.taxonomyPathLabels.join(' ')
        : '';
    return [
        canonCategoryUrl(row.listingUrl),
        String(row.categoryValue || ''),
        String(row.categoryLabel || ''),
        String(row.subcategoryValue || ''),
        String(row.subcategoryLabel || ''),
        joinedPath
    ]
        .join(' ')
        .toLowerCase();
}

/**
 * La fila de menú/listado alinea con la PDP si el slug de producto aparece en URL de listado o en migas/values.
 * Evita que un iPhone quede bajo Impresoras solo porque el mega menú duplicó el listado bajo otra raíz.
 */
function rowMatchesProdSegment(row, segment) {
    if (!segment || !row) return false;
    const h = rowHaystackForProdMatch(row);
    const variants = new Set([
        segment,
        segment.replace(/-/g, '_'),
        segment.replace(/_/g, '-')
    ]);
    for (const v of variants) {
        if (v && h.includes(v)) return true;
    }
    return false;
}

/** Puntuación alta = meta de listado coherente con la URL real de la PDP. */
function listingMetaTrustScore(row, productUrl) {
    const seg = extractVisaoProdSegment(productUrl);
    const depth = taxonomyPathDepth(row);
    if (!seg) return depth;
    return (rowMatchesProdSegment(row, seg) ? 1000 : 0) + depth;
}

function shouldPreferListingMetaForUrl(existing, incoming, productUrl) {
    const t1 = listingMetaTrustScore(existing, productUrl);
    const t2 = listingMetaTrustScore(incoming, productUrl);
    if (t2 > t1) return true;
    if (t2 < t1) return false;
    return shouldPreferListingMeta(existing, incoming);
}

function mergeMenuRowsPreferDeeper(existing, incoming) {
    const dm = taxonomyPathDepth(existing);
    const dn = taxonomyPathDepth(incoming);
    if (dn > dm) return incoming;
    if (dn === dm && String(incoming.subcategoryValue || '').length > String(existing.subcategoryValue || '').length) {
        return incoming;
    }
    return existing;
}

function slugifyLabel(text) {
    if (!text || typeof text !== 'string') return 'item';
    let s = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    return (s || 'item').slice(0, 80);
}

/** Valor canónico de subcategoría alineado al listado hoja: `{slug}__{idListado}` (ej. monitores__21). */
function buildLeafListingValue(leafLabel, listingId) {
    const slug = slugifyLabel(String(leafLabel || '').trim());
    const idSafe = String(listingId || '').replace(/[^a-z0-9]+/gi, '_');
    if (!slug && !idSafe) return 'item';
    if (!idSafe) return slug || 'item';
    return `${slug || 'cat'}__${idSafe}`;
}

function listingIdFromUrl(href) {
    const m = String(href || '').match(/\/categoria\/[^/]+\/([^/?#]+)/i);
    return m ? String(m[1]).trim() : '';
}

/**
 * Regla de mapeo "Primero y Último":
 * - categoría padre = primer nodo de la ruta
 * - subcategoría final = último nodo (hoja de listado)
 * - si sólo hay un nivel, ambos quedan iguales
 * Mantiene la ruta completa para navegación/debug en taxonomyPath*.
 */
function resolveFirstAndLastNodes(pathNodes, listingUrl) {
    const cleanNodes = (Array.isArray(pathNodes) ? pathNodes : []).filter(
        (n) => n && String(n.label || '').trim()
    );
    const first = cleanNodes[0] || {};
    const last = cleanNodes[cleanNodes.length - 1] || first;

    const categoryLabel = String(first.label || last.label || '').trim();
    const categoryValue = slugifyLabel(categoryLabel).slice(0, 120);
    const leafLabel = String(last.label || categoryLabel || '').trim();
    const leafListingId =
        String(last.id || '').trim() ||
        String(listingIdFromUrl(listingUrl) || '').trim() ||
        ((String(listingUrl || '').match(/\/categoria\/[^/]+\/([^/?#]+)/i) || [])[1] || '');

    return {
        categoryLabel,
        categoryValue,
        subcategoryLabel: leafLabel || categoryLabel,
        subcategoryValue: buildLeafListingValue(leafLabel || categoryLabel, leafListingId),
        taxonomyPathLabels: cleanNodes.map((n) => String(n.label || '').trim()).filter(Boolean),
        taxonomyPathValues: cleanNodes.map((n) =>
            buildLeafListingValue(n.label || n.slug, n.id || '')
        )
    };
}

/**
 * Jerarquía desde el sidebar Visão (recursiva).
 * Regla espejo (igual resolveFirstAndLastNodes):
 *   - categoría = primer nodo (raíz)
 *   - subcategoría = último nodo hoja (donde están los productos)
 *   - si un solo nivel: categoría = subcategoría
 * Productos se scrapean SOLO en las URLs hoja.
 * @param {import('puppeteer').Page} initialPage
 * @param {{ browserHolder?: { browser: import('puppeteer').Browser|null } }} [opts]
 */
async function collectMenuHierarchy(initialPage, opts = {}) {
    /** @type {Map<string, object>} */
    const merged = new Map();
    const noiseRx = /^(categor[ií]as|links [uú]tiles|buscar productos\.{0,3}|categor[ií]as m[aá]s buscadas|volver a categor[ií]as|inicio|buscar)$/i;
    const browserHolder = opts.browserHolder || { browser: initialPage.browser() };
    const holder = { page: initialPage };

    function normalizeLabel(s) {
        return String(s || '').replace(/\s+/g, ' ').trim();
    }

    function isNoiseLabel(s) {
        return noiseRx.test(normalizeLabel(s).toLowerCase());
    }

    function isDeadPageError(err) {
        const msg = err && err.message ? String(err.message) : String(err || '');
        return /detached Frame|Session closed|Target closed|Protocol error|Connection closed|Most likely the page has been closed|browser has disconnected/i.test(
            msg
        );
    }

    async function preparePage(p) {
        await p.setViewport({ width: 1366, height: 900 });
        await p.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        await p.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
    }

    // Anti-bot + viewport en la page inicial (antes no se aplicaba y el menú salía vacío).
    await preparePage(holder.page);

    /** Recrea page; si Chromium murió, relanza el browser del holder. */
    async function revivePage(reason) {
        console.warn(`[Visão mirror][MENU] Recreando page (${reason})`);
        try {
            await holder.page.close();
        } catch {
            /* ignore */
        }
        if (!(await puppeteerBrowserResponsive(browserHolder.browser))) {
            await relaunchMutableBrowserHolder(browserHolder);
        }
        holder.page = await browserHolder.browser.newPage();
        await preparePage(holder.page);
    }

    async function openHeaderCategories() {
        for (let attempt = 1; attempt <= 3; attempt++) {
            await holder.page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
            await delay(1200);
            // Cloudflare a veces tarda: esperar menú o botón Categorías.
            try {
                await holder.page.waitForFunction(
                    () =>
                        !!document.querySelector('aside .menu-list > li a[href]') ||
                        [...document.querySelectorAll('button,a,div,span')].some((el) =>
                            /categor[ií]as/i.test(String(el.textContent || '').trim())
                        ),
                    { timeout: 25000 }
                );
            } catch {
                /* retry abajo */
            }
            await holder.page.evaluate(() => {
                const btn = [...document.querySelectorAll('button,a,div,span')].find((el) =>
                    /categor[ií]as/i.test(String(el.textContent || '').trim())
                );
                if (btn) btn.click();
            });
            try {
                await holder.page.waitForSelector('aside .menu-list > li a[href]', { timeout: 20000 });
                return;
            } catch {
                console.warn(
                    `[Visão mirror][MENU] menú lateral no listo (intento ${attempt}/3)`
                );
                await delay(1500 * attempt);
            }
        }
    }

    async function extractTopCategoriesFromHeader() {
        const rows = await holder.page.evaluate(() => {
            function txt(el) {
                return String((el && el.textContent) || '')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
            const out = [];
            for (const li of document.querySelectorAll('aside .menu-list > li')) {
                let a = li.querySelector(':scope > a.menu-link');
                if (!a) a = li.querySelector(':scope > a[href]');
                if (!a) continue;
                const label = txt(a.querySelector(':scope > .menu-label') || a);
                const href = a.getAttribute('href') || a.href || '';
                if (label && href) out.push({ label, href });
            }
            return out;
        });
        const seen = new Set();
        const clean = [];
        for (const r of rows || []) {
            const label = normalizeLabel(r.label);
            const u = canonCategoryUrl(absolutizeListingUrl(r.href));
            if (!label || !u || isNoiseLabel(label)) continue;
            const k = label.toLowerCase();
            if (seen.has(k)) continue;
            seen.add(k);
            clean.push({ label, url: u });
        }
        return clean;
    }

    /**
     * Espera tiles de subcategoría O productos (SPA Visão).
     * Importante: muchas raíces muestran productos Y tiles; si los productos
     * llegan primero hay que dar margen a que pinten las cards de subcategoría,
     * si no el árbol se corta (ej. Celulares y Tablets → 1 hoja falsa).
     */
    async function extractListingTilesByUrl(listingUrl) {
        await holder.page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await delay(500);
        try {
            await holder.page.waitForFunction(
                () => {
                    const tiles = document.querySelectorAll(
                        'a.flex.flex-1.h-full.no-underline.text-inherit[href*="/busca/categoria/"]'
                    );
                    const prods = document.querySelectorAll('a[href*="/es/prod/"]');
                    return tiles.length > 0 || prods.length > 0;
                },
                { timeout: 12000 }
            );
        } catch {
            /* categoría vacía o bloqueada: se trata como hoja */
        }
        // Margen SPA: tiles de subcategoría a veces llegan después de los productos.
        try {
            await holder.page.waitForFunction(
                () =>
                    document.querySelectorAll(
                        'a.flex.flex-1.h-full.no-underline.text-inherit[href*="/busca/categoria/"]'
                    ).length > 0,
                { timeout: 2500 }
            );
        } catch {
            /* hoja real sin subcategorías */
        }
        await delay(300);
        const rows = await holder.page.evaluate(() => {
            function txt(el) {
                return String((el && el.textContent) || '')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
            const out = [];
            const anchors = document.querySelectorAll(
                'a.flex.flex-1.h-full.no-underline.text-inherit'
            );
            for (const a of anchors) {
                const href = a.getAttribute('href') || a.href || '';
                if (!/\/es\/busca\/categoria\//i.test(href)) continue;
                const label = txt(a);
                if (!label || label.length > 70) continue;
                const rect = a.getBoundingClientRect();
                // Tiles reales de subcategoría son cards grandes; evita links basura del layout.
                if (rect.width < 120 || rect.height < 80) continue;
                out.push({ label, href });
            }
            return out;
        });
        const seen = new Set();
        const clean = [];
        for (const r of rows || []) {
            const label = normalizeLabel(r.label);
            const u = canonCategoryUrl(absolutizeListingUrl(r.href));
            if (!label || !u || isNoiseLabel(label)) continue;
            if (u === canonCategoryUrl(listingUrl)) continue;
            const k = `${label.toLowerCase()}|${u}`;
            if (seen.has(k)) continue;
            seen.add(k);
            clean.push({ label, url: u });
        }
        return clean;
    }

    async function collectLeafPathsForTop(top) {
        const leaves = [];
        const stack = [{ node: top, path: [top] }];
        const visited = new Set();
        const maxDepth = 5;

        while (stack.length) {
            const { node, path } = stack.pop();
            const key = `${node.url}|${path.map((p) => p.url).join('>')}`;
            if (visited.has(key)) continue;
            visited.add(key);

            console.log(
                `[Visão mirror][MENU] visitando "${node.label}" (depth=${path.length}, stack=${stack.length}) → ${node.url}`
            );

            let children = [];
            // Solo reintentar ante errores de página/browser. 0 tiles tras espera = hoja (o vacía).
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    children = await extractListingTilesByUrl(node.url);
                    break;
                } catch (err) {
                    const msg = err && err.message ? err.message : String(err);
                    if (isDeadPageError(err) || isDisconnectedOrDeadBrowserError(err)) {
                        await revivePage(msg);
                    }
                    if (attempt === 2) {
                        console.warn(
                            `[Visão mirror][NAV_RETRY] fallo nodo "${node.label}" (${node.url}): ${msg}`
                        );
                        children = [];
                    } else {
                        await delay(600);
                    }
                }
            }

            const filtered = [];
            const seen = new Set();
            for (const c of children) {
                if (c.url === node.url) continue;
                if (path.some((p) => p.url === c.url)) continue;
                if (isNoiseLabel(c.label)) continue;
                const k = `${c.label.toLowerCase()}|${c.url}`;
                if (seen.has(k)) continue;
                seen.add(k);
                filtered.push(c);
            }

            // Hoja = sin más subcategorías (o tope profundidad). Ahí van los productos.
            if (!filtered.length || path.length >= maxDepth) {
                leaves.push(path);
                continue;
            }

            console.log(
                `[Visão mirror][MENU]   "${node.label}" → ${filtered.length} sub(s): ${filtered
                    .map((c) => c.label)
                    .join(', ')}`
            );

            for (let ci = 0; ci < filtered.length; ci++) {
                const child = filtered[ci];
                console.log(
                    `[Visão mirror][MENU]     → (${ci + 1}/${filtered.length}) explorando "${child.label}" bajo "${node.label}"`
                );
                stack.push({ node: child, path: [...path, child] });
            }
        }

        return leaves;
    }

    await openHeaderCategories();
    const tops = await extractTopCategoriesFromHeader();
    console.log(`[Visão mirror][MENU] Categorías raíz detectadas: ${tops.length}`);
    for (let ti = 0; ti < tops.length; ti++) {
        const top = tops[ti];
        console.log(
            `[Visão mirror][MENU] (${ti + 1}/${tops.length}) expandiendo "${top.label}" → ${top.url}`
        );
        let leafPaths;
        try {
            leafPaths = await collectLeafPathsForTop(top);
        } catch (err) {
            if (isDeadPageError(err) || isDisconnectedOrDeadBrowserError(err)) {
                await revivePage(err.message || 'detached');
                leafPaths = await collectLeafPathsForTop(top);
            } else {
                throw err;
            }
        }
        if (!leafPaths.length) leafPaths.push([top]);
        console.log(
            `[Visão mirror][MENU] "${top.label}": ${leafPaths.length} hoja(s) → categoría="${top.label}" / sub=última hoja`
        );
        for (const p of leafPaths) {
            const leaf = p[p.length - 1];
            const pathNodes = p.map((n) => ({
                label: n.label,
                id: listingIdFromUrl(n.url),
                slug: slugifyLabel(n.label)
            }));
            const listingUrl = canonCategoryUrl(leaf.url);
            const firstLast = resolveFirstAndLastNodes(pathNodes, listingUrl);
            if (!firstLast.categoryLabel || !firstLast.subcategoryLabel || !listingUrl) continue;

            const normalized = {
                categoryLabel: firstLast.categoryLabel,
                categoryValue: firstLast.categoryValue,
                breadcrumbTrail: firstLast.taxonomyPathLabels.join(' › '),
                subcategoryLabel: firstLast.subcategoryLabel,
                subcategoryValue: firstLast.subcategoryValue,
                listingUrl,
                isTarget: true,
                hasSubcategories: p.length > 1,
                taxonomyPathLabels: firstLast.taxonomyPathLabels,
                taxonomyPathValues: firstLast.taxonomyPathValues
            };
            const prev = merged.get(listingUrl);
            merged.set(listingUrl, prev ? mergeMenuRowsPreferDeeper(prev, normalized) : normalized);
        }
    }

    console.log(`[Visão mirror][MENU] Total listados hoja únicos: ${merged.size}`);
    return [...merged.values()].sort((a, b) => {
        const c = String(a.categoryValue).localeCompare(String(b.categoryValue));
        if (c !== 0) return c;
        return String(a.subcategoryValue).localeCompare(String(b.subcategoryValue));
    });
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

async function collectProductUrlsForCategoryWithRetries(ctx, row, opts = {}) {
    const attempts = Math.max(1, Number(opts.attempts) || 5);
    const targetListingUrl = absolutizeListingUrl(row && row.listingUrl);
    if (!targetListingUrl) {
        console.warn(
            `[Visão mirror][LISTING_SKIP] listado inválido/relativo sin normalizar: ${row && row.listingUrl ? row.listingUrl : 'n/a'}`
        );
        return [];
    }
    function isRetryableListingError(err) {
        const msg = err && err.message ? String(err.message) : String(err || '');
        return /Target closed|Target\.createTarget|Runtime\.callFunctionOn|Navigating frame was detached|Session closed|Connection closed|browser has disconnected/i.test(
            msg
        );
    }
    let lastErr = null;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        await ensureMirrorBrowser(ctx);
        let pg;
        try {
            pg = await ctx.browser.newPage();
            await pg.setViewport({ width: 1366, height: 900 });
            await pg.setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );
            await pg.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            });
            const urls = await collectProductUrlsForCategory(pg, targetListingUrl, {
                urlBudget: opts.urlBudget,
                singlePageOnly: opts.singlePageOnly
            });
            if (urls.length > 0) return urls;
            console.warn(
                `[Visão mirror][LISTING_RETRY] intento ${attempt}/${attempts} → 0 URLs en ${row.listingUrl}`
            );
            await delay(700 * attempt);
        } catch (err) {
            lastErr = err;
            const msg = err && err.message ? err.message : String(err);
            console.warn(
                `[Visão mirror][LISTING_RETRY] intento ${attempt}/${attempts} falló en ${row.listingUrl}: ${msg}`
            );
            if (isDisconnectedOrDeadBrowserError(err) || isRetryableListingError(err)) {
                if (typeof opts.relaunchSafely === 'function') {
                    await opts.relaunchSafely();
                } else {
                    await relaunchMutableBrowserHolder(ctx);
                }
            }
            await delay(500 * attempt);
        } finally {
            if (pg) await pg.close().catch(() => {});
        }
    }

    const finalMsg = lastErr && lastErr.message ? lastErr.message : `0 URLs tras ${attempts} intentos`;
    console.warn(
        `[Visão mirror][LISTING_SKIP] listado omitido tras ${attempts} intentos: ${row.listingUrl} | motivo=${finalMsg}`
    );
    return [];
}

/**
 * Scrape masivo alineado al menú Visão Vip.
 * @param {object} opts
 * @param {number|null} [opts.maxListings] — null = todos los renglones del menú
 * @param {boolean} [opts.singlePageListing=false]
 * @param {number|null} [opts.maxProductUrls] — tope global de URLs de PDP a scrapear
 * @param {number} [opts.detailConcurrency=2]
 * @param {number} [opts.listingConcurrency=1] — listados paralelos agotan RAM/Chromium macOS rápido
 */
async function scrapeVisionVipMirror(opts = {}) {
    const maxListings =
        opts.maxListings != null && Number.isFinite(opts.maxListings)
            ? Math.max(1, opts.maxListings)
            : null;
    const singlePageListing = !!opts.singlePageListing;
    const maxProductUrls =
        opts.maxProductUrls != null && Number.isFinite(opts.maxProductUrls)
            ? Math.max(1, opts.maxProductUrls)
            : null;
    const detailConcurrency =
        opts.detailConcurrency != null ? Math.min(12, Math.max(1, opts.detailConcurrency)) : 2;
    /** Estabilidad > velocidad: listados en paralelo alto dispara cierres de target en Chromium/macOS. */
    const listingConcurrency =
        opts.listingConcurrency != null ? Math.min(2, Math.max(1, opts.listingConcurrency)) : 1;

    const ctx = { browser: null };
    try {
        console.log(
            '[Visão mirror] Lanzando Chromium (Puppeteer). La primera ejecución puede tardar más si descarga el navegador.'
        );
        ctx.browser = await puppeteer.launch(getLaunchOptions());
        const menuPage = await ctx.browser.newPage();
        await menuPage.setViewport({ width: 1366, height: 900 });

        console.log(
            '[Visão mirror] Fase menú: recorriendo el sitio (collectMenuHierarchy). Puede ir varios minutos sin más líneas; es normal.'
        );
        let menuRows = await collectMenuHierarchy(menuPage, { browserHolder: ctx });
        console.log(`[Visão mirror] Fase menú terminada: ${menuRows.length} filas brutas.`);
        await menuPage.close().catch(() => {});

        if (!menuRows.length) {
            await ensureMirrorBrowser(ctx);
            const p2 = await ctx.browser.newPage();
            const flat = await collectCategoryUrls(p2);
            await p2.close().catch(() => {});
            menuRows = flat.map((listingUrl) => {
                const m = listingUrl.match(/\/categoria\/([^/]+)\/([^/?#]+)/i);
                const slugSeg = m ? m[1] : 'catalogo';
                const idPart = m ? m[2] : 'id';
                const cv = slugifyLabel(slugSeg.replace(/-/g, ' '));
                const labelCat = slugSeg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                const idSafe = String(idPart).replace(/[^a-z0-9]+/gi, '_');
                const sv = buildLeafListingValue(labelCat, idSafe);
                const taxonomyPathLabels = [labelCat];
                const taxonomyPathValues = [sv];
                return {
                    categoryLabel: labelCat,
                    categoryValue: cv,
                    subcategoryLabel: labelCat,
                    subcategoryValue: sv,
                    listingUrl,
                    breadcrumbTrail: labelCat,
                    taxonomyPathLabels,
                    taxonomyPathValues,
                    isTarget: true
                };
            });
        }

        if (maxListings != null) {
            menuRows = menuRows.slice(0, maxListings);
        }

        console.log(`[Visão mirror] Filas de menú / listados: ${menuRows.length}`);

        const urlToMeta = new Map();

        /** Serializa relanzamientos de Chromium durante fase listing para no romper workers concurrentes. */
        let relaunchMux = Promise.resolve();
        function runSerialized(fn) {
            const p = relaunchMux.then(fn, fn);
            relaunchMux = p.catch(() => {});
            return p;
        }

        const rowsByRootCategory = new Map();
        for (const row of menuRows) {
            const key = String(row.categoryValue || '').trim() || '__without_root__';
            if (!rowsByRootCategory.has(key)) rowsByRootCategory.set(key, []);
            rowsByRootCategory.get(key).push(row);
        }
        const groupedRows = [...rowsByRootCategory.entries()];
        for (const [rootCategory, rows] of groupedRows) {
            console.log(
                `[Visão mirror][NAV] Procesando categoría raíz "${rootCategory}" (${rows.length} listados)...`
            );
            const listingTasks = rows.map((row, idx) => ({ row, idx }));
            await mapPool(listingTasks, Math.min(1, listingConcurrency), async ({ row }) => {
                const perListingBudget =
                    maxProductUrls != null
                        ? Math.max(
                              1,
                              Math.ceil(maxProductUrls / Math.max(1, menuRows.length))
                          )
                        : undefined;
                const urls = await collectProductUrlsForCategoryWithRetries(ctx, row, {
                    urlBudget: perListingBudget,
                    singlePageOnly: singlePageListing,
                    attempts: 3,
                    relaunchSafely: () =>
                        runSerialized(async () => {
                            await relaunchMutableBrowserHolder(ctx);
                        })
                });
                console.log(`[Visão mirror][LISTING] ${row.listingUrl} -> ${urls.length} URLs`);
                for (const u of urls) {
                    const prev = urlToMeta.get(u);
                    if (!prev || shouldPreferListingMetaForUrl(prev, row, u)) {
                        urlToMeta.set(u, row);
                    }
                }
                return null;
            });
        }

        let productUrls = [...urlToMeta.keys()];
        if (maxProductUrls != null && productUrls.length > maxProductUrls) {
            productUrls = productUrls.slice(0, maxProductUrls);
        }

        console.log(`[Visão mirror] URLs únicas de producto (PDP): ${productUrls.length}`);

        await ensureMirrorBrowser(ctx);
        const rawProducts = await scrapeProductDetailsParallel(null, productUrls, {
            preview: false,
            concurrency: detailConcurrency,
            /** Obrigatorio: PDP usa `ctx.browser` vivo; si Chromium cae, se relanza sin quedar con la instancia vieja cerrada */
            mutableBrowserCtx: ctx
        });

        const products = rawProducts.map((p) => {
            const meta = urlToMeta.get(p.url) || {};
            const tech =
                p.especificaciones && typeof p.especificaciones === 'object'
                    ? { ...p.especificaciones }
                    : {};
            return {
                ...p,
                technicalSpecifications: tech,
                _categoryValue: meta.categoryValue,
                _categoryLabel: meta.categoryLabel,
                _subcategoryValue: meta.subcategoryValue,
                _subcategoryLabel: meta.subcategoryLabel,
                _listingUrl: meta.listingUrl,
                _taxonomyPathLabels: meta.taxonomyPathLabels,
                _taxonomyPathValues: meta.taxonomyPathValues,
                _pdpBreadcrumbLabels: p.pdpBreadcrumbLabels || [],
                _isLeafCategoryNode: meta.isTarget === true || meta.isLeaf === true,
                _isTargetCategoryNode: meta.isTarget === true
            };
        });

        return {
            menuRows,
            productUrlsCount: productUrls.length,
            productsReturned: products.length,
            products
        };
    } finally {
        if (ctx.browser) await ctx.browser.close().catch(() => {});
    }
}

module.exports = {
    collectMenuHierarchy,
    scrapeVisionVipMirror,
    extractVisaoProdSegment,
    rowMatchesProdSegment
};
