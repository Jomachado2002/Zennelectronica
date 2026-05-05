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
    if (!row || !row.subcategoryLabel) return 0;
    return String(row.subcategoryLabel)
        .split(' › ')
        .map((s) => s.trim())
        .filter(Boolean).length;
}

function shouldPreferListingMeta(existing, incoming) {
    const d1 = listingBreadcrumbDepth(existing);
    const d2 = listingBreadcrumbDepth(incoming);
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
    return [
        canonCategoryUrl(row.listingUrl),
        String(row.categoryValue || ''),
        String(row.categoryLabel || ''),
        String(row.subcategoryValue || ''),
        String(row.subcategoryLabel || '')
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
    if (!seg) return listingBreadcrumbDepth(row);
    return (rowMatchesProdSegment(row, seg) ? 1000 : 0) + listingBreadcrumbDepth(row);
}

function shouldPreferListingMetaForUrl(existing, incoming, productUrl) {
    const t1 = listingMetaTrustScore(existing, productUrl);
    const t2 = listingMetaTrustScore(incoming, productUrl);
    if (t2 > t1) return true;
    if (t2 < t1) return false;
    return shouldPreferListingMeta(existing, incoming);
}

function mergeMenuRowsPreferDeeper(existing, incoming) {
    const dm = crumbDepth(existing.subcategoryLabel);
    const dn = crumbDepth(incoming.subcategoryLabel);
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

/**
 * Jerarquía desde el sidebar Visão (incluye subníveles cargados tras hover).
 * Agrupa migas hasta el último slug para que category = raíz real (p. ej. Apple) y
 * subcategory = ruta › ruta › hoja estabilizada con id del listado.
 * @returns {Promise<Array<{categoryLabel, categoryValue, subcategoryLabel, subcategoryValue, listingUrl}>>}
 */
async function collectMenuHierarchy(page) {
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    try {
        await page.waitForSelector('aside .menu-list', { timeout: 18000 });
    } catch {
        await page.waitForSelector('.menu-list', { timeout: 12000 });
    }

    await delay(950);
    await page.waitForNetworkIdle({ idleTime: 550, timeout: 22000 }).catch(() => {});

    /** @type {Map<string, object>} */
    const merged = new Map();

    /**
     * @param {string | null | undefined} hoverRootLabel — texto del nivel 0 bajo hover (overlay Prime suele omitir ancestors).
     * @param {string | null | undefined} hoverHostSelector — selector del `<li>` hovered; solo entonces se antepone la raíz
     *   a migas de un solo segmento **si el enlace está dentro de ese host**. Evita mezclar ítems del mega menú global
     *   (p. ej. "Impresoras" bajo "Notebook") cuando el overlay lista otras categorías raíz.
     */
    async function absorbEvaluatedRows(hoverRootLabel, hoverHostSelector) {
        const rootPass = hoverRootLabel == null ? '' : String(hoverRootLabel).trim();
        const hostSel =
            hoverHostSelector == null || hoverHostSelector === undefined
                ? ''
                : String(hoverHostSelector).trim();

        const batch = await page.evaluate((rootLbl, hoverHostSel) => {
            const hoveredRootCat =
                typeof rootLbl === 'string' && rootLbl.trim() ? rootLbl.trim().slice(0, 160) : '';
            const hoverHostSelectorInner =
                typeof hoverHostSel === 'string' && hoverHostSel.trim() ? hoverHostSel.trim() : '';

            function slugify(text) {
                if (!text || typeof text !== 'string') return 'item';
                let s = text
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_|_$/g, '');
                return (s || 'item').slice(0, 80);
            }

            function humanizeSlug(seg) {
                return String(seg)
                    .replace(/-/g, ' ')
                    .trim()
                    .replace(/\s+/g, ' ')
                    .replace(/\b\w/g, (c) => String(c).toUpperCase());
            }

            const menuRoot =
                document.querySelector('aside .menu-list') || document.querySelector('.menu-list');

            /** Navegable solo dentro de aside para evitar breadcrumbs absurdos desde el footer. */
            function labelFromDirectA(directA) {
                if (!directA) return '';
                const sp = directA.querySelector(':scope > .menu-label');
                const raw = sp ? String(sp.textContent || '') : String(directA.textContent || '');
                return raw.trim().replace(/\s+/g, ' ').slice(0, 200);
            }

            /**
             * Breadcrumb raíz→hoja usando la jerarquía de <li> en el sidebar.
             * Se detiene al llegar al <ul.menu-list> raíz del menú.
             */
            function breadcrumbsFromCategoryLink(link) {
                try {
                    if (link.closest('[aria-hidden="true"]')) return null;
                } catch (_) {
                    /* ignore */
                }

                const parts = [];

                /** Contenidos en sidebar o submenu Prime desacoplado del <ul.menu-list>. */
                const structuredZone =
                    (menuRoot && menuRoot.contains(link)) ||
                    !!link.closest(
                        [
                            '[data-pc-name="tieredmenu_submenu"]',
                            '[data-pc-section="submenu"]',
                            '.p-tieredmenu-submenu',
                            '.p-megamenu-panel',
                            '[class*="submenu-panel"]'
                        ].join(',')
                    );
                if (!structuredZone) return null;

                let li =
                    link.parentElement && link.parentElement.tagName === 'LI'
                        ? link.parentElement
                        : link.closest('li');
                let guard = 0;

                while (li && guard++ < 40) {
                    const directA =
                        li.querySelector(':scope > a.menu-link') ||
                        li.querySelector(':scope > a[href*="/busca/categoria/"]');
                    const lt = labelFromDirectA(directA);
                    if (lt && lt.length < 200) parts.unshift(lt);

                    const parentUl = li.parentElement;
                    if (!parentUl || parentUl.tagName !== 'UL') break;
                    /** Contenedor nivel cero Visão (.menu-list) */
                    if (parentUl.classList.contains('menu-list')) break;

                    const grandLi = parentUl.parentElement;
                    if (!grandLi || grandLi.tagName !== 'LI') break;
                    li = grandLi;
                }

                /** Únicos en orden estable (evita dos “Apple” seguidos en UI rara). */
                const uniq = [];
                const seenLbl = new Set();
                for (const p of parts) {
                    const k = String(p).toLowerCase();
                    if (seenLbl.has(k)) continue;
                    seenLbl.add(k);
                    uniq.push(p);
                }
                return uniq.length ? uniq : null;
            }

            function rowFromBc(bc, rawHref) {
                const href = String(rawHref || '')
                    .split('?')[0]
                    .replace(/\/+$/, '');
                if (!href || !/\/es\/busca\/categoria\//i.test(href)) return null;
                if (/lista-desejos|lista-deseos|promocoes|blog|\blogin\b/i.test(href)) return null;

                const mUrl = href.match(/\/categoria\/([^/]+)\/(\d+)/i);
                const slugSeg = mUrl ? mUrl[1] : '';
                const idTail = mUrl ? mUrl[2] : '';
                const idSafe = String(idTail || 'id').replace(/[^a-z0-9]+/gi, '_');

                if (!bc.length) return null;

                const categoryLabel = bc[0];
                const slugPieces = bc.map((lbl) =>
                    slugify(String(lbl).replace(/-/g, ' ').trim())
                );
                const categoryValue = slugPieces[0] || slugify(categoryLabel.replace(/-/g, ' '));
                const slugChain =
                    slugPieces.length >= 2
                        ? slugPieces.join('__')
                        : slugPieces[0] || slugify((slugSeg || categoryLabel || 'cat').replace(/-/g, ' '));

                const subcategoryLabel = bc.join(' › ');
                const subcategoryValue = slugChain.endsWith(`__${idSafe}`)
                    ? slugChain
                    : `${slugChain}__${idSafe}`;

                return {
                    categoryLabel,
                    categoryValue,
                    subcategoryLabel,
                    subcategoryValue,
                    listingUrl: href
                };
            }

            /** Colecta dentro de aside sólo cuando existe; si no, cae abajo en fallback global.m */
            function collectScope() {
                const outIdx = {};
                /** href -> último índice en output */
                const order = [];

                function upsert(row) {
                    const u = row.listingUrl;
                    if (!outIdx[u]) {
                        order.push(u);
                        outIdx[u] = row;
                        return;
                    }
                    const prev = outIdx[u];
                    const dPrev = prev.subcategoryLabel.split(' › ').length;
                    const dNew = row.subcategoryLabel.split(' › ').length;
                    if (
                        dNew > dPrev ||
                        (dNew === dPrev && row.subcategoryValue.length > prev.subcategoryValue.length)
                    ) {
                        outIdx[u] = row;
                    }
                }

                const aside = document.querySelector('aside');

                /** Sidebar + overlays Prime (tieredmegamenu) suelen estar fuera de <aside>. */
                function anchorLooksLikeCatalogNav(an) {
                    if (!aside) return true;
                    if (an.closest('aside')) return true;
                    return !!an.closest(
                        [
                            '[class*="layout-sidebar"]',
                            '[class*="layout-menu"]',
                            '[class*="p-tieredmenu"]',
                            '[class*="TieredMenu"]',
                            '[class*="MegaMenu"]',
                            '[data-pc-name="tieredmenu_submenu"]',
                            '[data-pc-section="submenu"]',
                            '[class*="submenu-panel"]'
                        ].join(',')
                    );
                }

                /** Prioridad links del menú lateral/overlays Visão (no footer). */
                document.querySelectorAll('a[href*="/es/busca/categoria/"]').forEach((a) => {
                    if (/lista-desejos|lista-deseos|blog/i.test(a.href)) return;
                    if (!anchorLooksLikeCatalogNav(a)) return;

                    let bcUse = breadcrumbsFromCategoryLink(a);
                    if (!bcUse) return;

                    if (
                        hoveredRootCat &&
                        bcUse.length === 1 &&
                        slugify(String(bcUse[0]).replace(/-/g, ' ').trim()) !==
                            slugify(hoveredRootCat.replace(/-/g, ' ').trim())
                    ) {
                        let allowPrepend = true;
                        if (hoverHostSelectorInner) {
                            const host = document.querySelector(hoverHostSelectorInner);
                            allowPrepend = !!(host && typeof host.contains === 'function' && host.contains(a));
                        }
                        if (allowPrepend) {
                            bcUse = [hoveredRootCat, bcUse[0]];
                        }
                    }

                    const row = rowFromBc(bcUse, a.href);
                    if (!row) return;
                    upsert(row);
                });

                /** Si no apareció nada (DOM raro sin aside), igual escaneamos menú conocido más plano JSON. */
                if (!order.length) {
                    document.querySelectorAll('a[href*="/es/busca/categoria/"]').forEach((b) => {
                        const href = b.href.split('?')[0].replace(/\/+$/, '');
                        if (/lista-desejos|lista-deseos|promocoes|blog/i.test(href)) return;
                        const lbl = labelFromDirectA(b) || (b.textContent || '').trim() || 'Item';
                        const m = href.match(/\/categoria\/([^/]+)\/([^/?#]+)/i);
                        const slugSegRaw = m ? m[1] : slugify(lbl.replace(/-/g, ' '));
                        const idPart = m ? m[2] : 'x';
                        const cv = slugify(slugSegRaw.replace(/-/g, ' '));
                        const labelCat = humanizeSlug(slugSegRaw);
                        const sv = `${cv}__${String(idPart).replace(/[^a-z0-9]+/gi, '_')}`;
                        upsert({
                            categoryLabel: labelCat,
                            categoryValue: cv,
                            subcategoryLabel: lbl,
                            subcategoryValue: sv,
                            listingUrl: href
                        });
                    });
                }

                return order.map((u) => outIdx[u]).filter(Boolean);
            }

            return collectScope();
        }, rootPass, hostSel);

        for (const r of batch || []) {
            const u = canonCategoryUrl(r.listingUrl);
            if (!u) continue;
            const normalized = {
                categoryLabel: r.categoryLabel,
                categoryValue: r.categoryValue,
                subcategoryLabel: r.subcategoryLabel,
                subcategoryValue: r.subcategoryValue,
                listingUrl: u
            };
            const prev = merged.get(u);
            merged.set(u, prev ? mergeMenuRowsPreferDeeper(prev, normalized) : normalized);
        }
    }

    await absorbEvaluatedRows(undefined, null);

    let topCandidates = [];
    try {
        topCandidates = await page.$$(
            'aside .menu-list > li.level-0, aside .menu-list > li.menu-item.level-0'
        );
    } catch {
        topCandidates = [];
    }

    /** Si no hay clase level-0, únicamente ítems directos del primer <ul.menu-list>. */
    if (!topCandidates.length) {
        topCandidates = await page.$$('aside .menu-list > li').catch(() => []);
    }

    /** Evitar volar desde la home tocando navegador: sólo hover, nunca clic en enlaces categoría top. */

    try {
        const max = Math.min(topCandidates.length || 0, 60);
        for (let i = 0; i < max; i++) {
            const h = topCandidates[i];
            const hoverLbl =
                (
                    await h
                        .evaluate((li) => {
                            const anchor =
                                li.querySelector(':scope > a.menu-link') ||
                                li.querySelector(':scope > a[href*="/busca/categoria/"]');
                            if (!anchor) return '';
                            const sp = anchor.querySelector(':scope > .menu-label');
                            return (
                                String(sp ? sp.textContent : anchor.textContent || '')
                                    .trim()
                                    .replace(/\s+/g, ' ')
                                    .slice(0, 160)
                            );
                        })
                        .catch(() => '')
                ) || '';

            const box = await h.boundingBox().catch(() => null);
            if (!box || box.height < 1) continue;
            await h
                .hover()
                .catch(() =>
                    h.evaluate((el) =>
                        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))
                    )
                );
            await delay(470);

            const HOST_ATTR = 'data-vv-sync-hover-host';
            await h.evaluate((el, attr) => {
                try {
                    el.setAttribute(attr, '1');
                } catch (_) {
                    /* ignore */
                }
            }, HOST_ATTR);
            await absorbEvaluatedRows(hoverLbl, `[${HOST_ATTR}="1"]`);
            await h.evaluate((el, attr) => {
                try {
                    el.removeAttribute(attr);
                } catch (_) {
                    /* ignore */
                }
            }, HOST_ATTR);
        }

        await page.mouse.move(8, 8).catch(() => {});
        await delay(150);
        await absorbEvaluatedRows(undefined, null);
    } catch (_) {
        /* mejor parcial que fallar todo el scrape */
        await absorbEvaluatedRows(undefined, null);
    }

    /** Listado raíz de categoría (p. ej. /categoria/apple/19) sin hoja intermedia: no es subcategoría real. */
    function isRootOnlyListingRow(row) {
        const cat = String(row.categoryLabel || '').trim().toLowerCase();
        if (!cat) return false;
        const parts = String(row.subcategoryLabel || '')
            .split(/\s*›\s*/)
            .map((s) => s.trim())
            .filter(Boolean);
        if (parts.length !== 1) return false;
        return parts[0].toLowerCase() === cat;
    }

    return [...merged.values()]
        .filter((r) => !isRootOnlyListingRow(r))
        .sort((a, b) => {
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
    const attempts = Math.max(1, Number(opts.attempts) || 3);
    let lastErr = null;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        await ensureMirrorBrowser(ctx);
        let pg;
        try {
            pg = await ctx.browser.newPage();
            await pg.setViewport({ width: 1366, height: 900 });
            const urls = await collectProductUrlsForCategory(pg, row.listingUrl, {
                urlBudget: opts.urlBudget,
                singlePageOnly: opts.singlePageOnly
            });
            return urls;
        } catch (err) {
            lastErr = err;
            const msg = err && err.message ? err.message : String(err);
            console.warn(
                `[Visão mirror][LISTING_RETRY] intento ${attempt}/${attempts} falló en ${row.listingUrl}: ${msg}`
            );
            if (isDisconnectedOrDeadBrowserError(err)) {
                await relaunchMutableBrowserHolder(ctx);
            }
        } finally {
            if (pg) await pg.close().catch(() => {});
        }
    }

    const finalMsg = lastErr && lastErr.message ? lastErr.message : String(lastErr);
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
    const listingConcurrency =
        opts.listingConcurrency != null ? Math.min(6, Math.max(1, opts.listingConcurrency)) : 1;

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
        let menuRows = await collectMenuHierarchy(menuPage);
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
                const sv = `${cv}__${String(idPart).replace(/[^a-z0-9]+/gi, '_')}`;
                return {
                    categoryLabel: labelCat,
                    categoryValue: cv,
                    subcategoryLabel: labelCat,
                    subcategoryValue: sv,
                    listingUrl
                };
            });
        }

        if (maxListings != null) {
            menuRows = menuRows.slice(0, maxListings);
        }

        console.log(`[Visão mirror] Filas de menú / listados: ${menuRows.length}`);

        const urlToMeta = new Map();

        const listingTasks = menuRows.map((row, idx) => ({ row, idx }));
        await mapPool(listingTasks, listingConcurrency, async ({ row }) => {
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
                attempts: 3
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
                _listingUrl: meta.listingUrl
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
