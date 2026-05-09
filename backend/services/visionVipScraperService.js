// backend/services/visionVipScraperService.js
// Fase 1: extracción de catálogo Visão Vip (solo lectura, sin MongoDB).

const puppeteer = require('puppeteer');

const HOME_URL = 'https://www.visaovip.com/es/';

function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * PDP en paralelo comparten disco de caché HTTP del browser → respuestas de documento mezcladas
 * (mismo síntoma que 6/20 sin precio). `page.setCacheEnabled` no existe en Puppeteer ≥24; usar CDP.
 */
async function configureScraperPage(page) {
    await page.setViewport({ width: 1366, height: 900 });
    try {
        const client = await page.createCDPSession();
        await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    } catch {
        /* ignore */
    }
}

/** Compartido con mirror PDP: errores típicos de Chromium muerto/desconectado */
function isDisconnectedOrDeadBrowserError(err) {
    const msg = err && err.message ? String(err.message) : String(err || '');
    return /Connection\s+closed|ConnectionClosedError|Target closed|Browser closed|EPIPE|protocol error \(\w+\.\w+|Execution context was destroyed|Navigating frame was detached|Session closed|The browser has disconnected/i.test(
        msg
    );
}

async function puppeteerBrowserResponsive(b) {
    if (!b) return false;
    try {
        await b.version();
        return true;
    } catch {
        return false;
    }
}

async function relaunchMutableBrowserHolder(holder) {
    console.warn('[Visão mirror] Reiniciando Chromium (holder mutable)…');
    try {
        await holder.browser?.close?.();
    } catch {
        /* ignore */
    }
    await delay(2200);
    holder.browser = await puppeteer.launch(getLaunchOptions());
}

function getProtocolTimeoutMs() {
    const v = Number(process.env.VISAO_PROTOCOL_TIMEOUT_MS);
    if (Number.isFinite(v) && v > 0) return Math.min(Math.max(v, 60_000), 3_600_000);
    /** 0 en CDP = sin límite → un evaluate/goto colgado puede bloquear horas. */
    return 300_000;
}

/** Tope duro por PDP (Promise.race); si vence, se cierra la pestaña y se abre otra en ese worker. */
function getPdpHardTimeoutMs() {
    const v = Number(process.env.VISAO_PDP_HARD_TIMEOUT_MS);
    if (Number.isFinite(v) && v > 0) return Math.min(Math.max(v, 30_000), 3_600_000);
    return 180_000;
}

/** Mismas opciones que backend/scripts/test-puppeteer.js */
function getLaunchOptions() {
    return {
        headless: 'new',
        protocolTimeout: getProtocolTimeoutMs(),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    };
}

function absolutize(base, href) {
    try {
        const u = new URL(href, base);
        if (!u.hostname.includes('visaovip.com')) return null;
        u.hash = '';
        return u.href;
    } catch {
        return null;
    }
}

/**
 * URLs de categorías / subcategorías desde el menú lateral.
 */
async function collectCategoryUrls(page) {
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try {
        await page.waitForSelector('aside .menu-list', { timeout: 15000 });
    } catch {
        await page.waitForSelector('.menu-list', { timeout: 10000 });
    }

    const hrefs = await page.evaluate(() => {
        const root = document.querySelector('aside .menu-list') || document.querySelector('.menu-list');
        if (!root) return [];
        const out = [];
        root.querySelectorAll('a[href]').forEach((a) => {
            const href = a.getAttribute('href');
            if (!href || href.startsWith('#')) return;
            out.push({ href: a.href || href });
        });
        return out;
    });

    const set = new Set();
    const list = [];
    for (const { href } of hrefs) {
        const abs = absolutize(HOME_URL, href);
        if (!abs || !/\/es\/busca\/categoria\//i.test(abs)) continue;
        if (/\/blog\.|lista-desejos|promocoes/i.test(abs)) continue;
        const norm = abs.split('?')[0].replace(/\/+$/, '/') || abs;
        if (!set.has(norm)) {
            set.add(norm);
            list.push(norm);
        }
    }
    return list;
}

function isListingNextDisabled(nextHandle) {
    return nextHandle.evaluate((btn) => {
        if (!(btn instanceof HTMLButtonElement)) return true;
        if (btn.disabled) return true;
        if (btn.getAttribute('aria-disabled') === 'true') return true;
        return btn.classList.contains('p-disabled');
    }).catch(() => true);
}

const PRODUCT_PATH_RE_STR = '^/es/prod/[^/]+/.+/\\d+/?$';

/**
 * Recolecta URLs de productos en una página de categoría; pagina con .p-paginator-next.
 * El grid no usa siempre `.product-card`; se espera enlaces `/es/prod/.../<id>/`.
 */
async function collectProductUrlsForCategory(page, categoryUrl, opts = {}) {
    const { urlBudget, singlePageOnly } = opts;
    await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try {
        await page.waitForSelector('a[href*="/es/prod/"]', { timeout: singlePageOnly ? 8000 : 5000 });
    } catch {
        return [];
    }

    const seen = new Set();
    let safetyPages = 0;
    const maxPages = 200;

    while (safetyPages < maxPages) {
        await page.waitForSelector('a[href*="/es/prod/"]', { timeout: 8000 }).catch(() => null);

        const batch = await page.evaluate((reSource) => {
            const pathReInner = new RegExp(reSource, 'i');
            const urls = [];
            document.querySelectorAll('a[href*="/es/prod/"]').forEach((a) => {
                try {
                    const pathname = new URL(a.href).pathname;
                    if (pathReInner.test(pathname)) urls.push(a.href.split('?')[0]);
                } catch (_) {
                    /* ignore */
                }
            });
            return urls;
        }, PRODUCT_PATH_RE_STR);

        for (const u of batch) {
            const abs = absolutize(categoryUrl, u);
            if (abs) seen.add(abs.split('?')[0]);
            if (urlBudget != null && seen.size >= urlBudget) break;
        }

        if (urlBudget != null && seen.size >= urlBudget) break;
        if (singlePageOnly) break;

        const nextSel = '.p-paginator-next:not(.p-disabled)';
        let nextBtn = await page.$(nextSel);
        if (!nextBtn) {
            nextBtn = await page.$('.p-paginator-next');
            if (!nextBtn) break;
            const disabled = await isListingNextDisabled(nextBtn);
            if (disabled) break;
        } else if (await isListingNextDisabled(nextBtn)) break;

        safetyPages++;
        await Promise.all([
            nextBtn.click(),
            page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 }).catch(() => delay(1200))
        ]);
    }

    return [...seen];
}

/** Marcadores después de los cuales suele aparecer otro PDP en carrusel (ruido de precios). */
const HERO_CUT_MARKERS = [
    'Productos relacionados',
    'Produtos relacionados',
    'Productos similares',
    'Produtos similares',
    'Tal vez te interese',
    'Quizás te interese',
    'Otros también compraron',
    'Cliente también compró',
    'También te puede gustar',
    'Vistos recientemente',
    'Últimos vistos'
];

function trimHeroBlock(text, markersList) {
    if (!text || typeof text !== 'string') return '';
    let trimmed = text;
    let cut = Infinity;
    for (const mk of markersList) {
        const i = trimmed.indexOf(mk);
        if (i !== -1 && i < cut) cut = i;
    }
    if (cut !== Infinity) trimmed = trimmed.slice(0, cut);
    return trimmed;
}

/** Guaraníes en PDP (p. ej. G$ 4.606.250): miles con punto; admite espacios como miles. */
function normalizeGuaraniesFragment(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const s = String(raw).replace(/\s+/g, '').replace(/\./g, '').replace(/'/g, '');
    if (!/\d/.test(s)) return null;
    const n = Number.parseFloat(s.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Interpreta número con miles/decimales en formatos BR/US/EU típicos de Visão.
 */
function parseMoneyTokenToFloat(token) {
    if (token == null) return NaN;
    let t = String(token)
        .trim()
        .replace(/\u00a0/g, '')
        .replace(/\s+/g, '');
    if (!t || !/\d/.test(t)) return NaN;
    if (/^\d+$/.test(t)) return Number.parseFloat(t);
    const lastComma = t.lastIndexOf(',');
    const lastDot = t.lastIndexOf('.');
    if (lastComma !== -1 && lastDot !== -1) {
        if (lastDot > lastComma) {
            return Number.parseFloat(t.replace(/,/g, ''));
        }
        return Number.parseFloat(t.replace(/\./g, '').replace(',', '.'));
    }
    if (lastComma !== -1 && lastDot === -1) {
        const after = t.slice(lastComma + 1);
        const intSlice = t.slice(0, lastComma);
        if (/^\d{1,6}$/.test(after.replace(/\s/g, ''))) {
            const intPart = intSlice.replace(/\./g, '');
            const joined =
                after.length <= 2 ? `${intPart}.${after}` : intPart.replace(/[^\d]/g, '');
            const n = Number.parseFloat(joined);
            return Number.isFinite(n) ? n : Number.parseFloat(t.replace(/,/g, ''));
        }
        return Number.parseFloat(t.replace(/,/g, ''));
    }
    if (lastDot !== -1 && lastComma === -1) {
        const parts = t.split('.');
        const last = parts[parts.length - 1];
        if (parts.length > 1 && last.length === 3 && /^\d{3}$/.test(last)) {
            return Number.parseFloat(parts.join('').replace(/^0+/, '') || '0');
        }
        if (parts.length === 2 && last.length <= 2) return Number.parseFloat(t);
        return Number.parseFloat(t.replace(/\./g, ''));
    }
    return Number.parseFloat(t);
}

/** @deprecated usar parseMoneyTokenToFloat — alias por compatibilidad interna */
function parseUsdFromNumberToken(token) {
    const n = parseMoneyTokenToFloat(token);
    return Number.isFinite(n) ? n : NaN;
}

/** U$, US$, U$S, USD, etc.; orden de aparición en el texto. */
function parseUsdPrices(text) {
    if (!text || typeof text !== 'string') return [];
    const ordered = [];
    const seen = new Set();
    const add = (n) => {
        if (!Number.isFinite(n) || n <= 0) return;
        const rounded = Math.round(n * 100000) / 100000;
        if (seen.has(rounded)) return;
        seen.add(rounded);
        ordered.push(n);
    };
    /** Grupo de captura para importe flexible (espacios / miles / coma o punto decimal). */
    const capAmt =
        '(\\d{1,3}(?:[\\s\\.\\u00a0]\\d{3})*(?:[\\.,]\\d{1,6})|\\d+[\\.,]\\d{1,6}|\\d+)';

    const patU = new RegExp(
        `(?:^|[^\\w$])(?:U\\.?\\s*\\$\\s*|U\\s*\\$\\s*|U\\$\\s*|U\\.?S\\.?\\s*\\$\\s*|US\\s*\\$\\s*|U\\$S\\s*|U\\.?S\\.?\\$\\s*|USS\\s*\\$\\s*)${capAmt}`,
        'gi'
    );
    for (const m of text.matchAll(patU)) add(parseMoneyTokenToFloat(m[1]));

    const usdLabel = new RegExp(`\\bUSD\\b\\s*[\\.:]?\\s*${capAmt}`, 'gi');
    for (const m of text.matchAll(usdLabel)) add(parseMoneyTokenToFloat(m[1]));

    /** Prefijo textual "dolares"/"dólares". */
    const dolWord = new RegExp(
        `(?:(?:dol[aá]r(?:es)?|d[oó]lar(?:es)?))\\s*(?:\\/\\s*USD\\b)?\\s*[:.]?\\s*${capAmt}`,
        'gi'
    );
    for (const m of text.matchAll(dolWord)) add(parseMoneyTokenToFloat(m[1]));

    return ordered;
}

/** Todos los importes PYG visibles antes del corte hero (primer valor razonable de catálogo). */
function extractGuaraniAmounts(text) {
    if (!text || typeof text !== 'string') return [];
    const trimmed = trimHeroBlock(text, HERO_CUT_MARKERS);
    const outs = [];
    const patterns = [
        /G\$\s*([\d][\d\s.\u00a0\,á]*)/gi,
        /\bGs\.?\s*:?\s*([\d][\d\s.\u00a0\,]*)/gi,
        /\bPYG\s*[:\s]*([\d][\d\s.\u00a0\,]*)/gi,
        /Guaran[iíÍ][eE]?s\s*[:\s]*([\d][\d\s.\u00a0\,]*)/gi
    ];
    for (const re of patterns) {
        let m;
        const r = new RegExp(re.source, re.flags);
        while ((m = r.exec(trimmed)) !== null) {
            const frag = String(m[1] || '')
                .replace(/[^\d\s.,']/g, '')
                .trim()
                .split(/[^\d\s.,']/)[0];
            const n = normalizeGuaraniesFragment(frag);
            if (n != null && n >= 500) outs.push(n);
        }
    }
    return outs;
}

/** Primer valor G$ / Gs. / PYG en la zona hero. */
function parseHeroGsAmount(text) {
    const all = extractGuaraniAmounts(text);
    for (const a of all) {
        if (a >= 1500) return a;
    }
    return all[0] ?? null;
}

/** Precios antes de marcadores de carrusel (orden textual = suele coincidir con el PDP actual). */
function parseHeroUsdPrices(text) {
    return parseUsdPrices(trimHeroBlock(text, HERO_CUT_MARKERS));
}

function roundUsd2(x) {
    return Math.round(x * 100) / 100;
}

/** Umbrales: números enormes pegados como "USD" en texto suelen ser error de parser → tratar PYG. */
function getMaxReasonableUsd() {
    const v = Number(process.env.VISAO_MAX_REASONABLE_USD);
    return Number.isFinite(v) && v > 50 ? v : 500_000;
}

function getAssumePygAbove() {
    const v = Number(process.env.VISAO_AMBIG_PRICE_ASSUME_PYG_ABOVE);
    return Number.isFinite(v) && v > 999 ? v : 300_000;
}

/**
 * Lista señales JSON-LD / meta[itemprop]. Generado en snapshotDom(browser).
 */
function resolveUsdFromStructuredHints(hints) {
    if (!Array.isArray(hints) || hints.length === 0) return null;
    const maxUsd = getMaxReasonableUsd();
    const pygLikelyAbove = getAssumePygAbove();
    /** @type {{ n: number; source: string }[]} */
    const accepted = [];

    for (let i = 0; i < hints.length; i++) {
        const h = hints[i];
        let cur = String(h.currency ?? '')
            .toUpperCase()
            .replace(/\s+/g, '');
        cur = cur.replace(/\./g, '');
        let rawPrice = String(h.price ?? '').trim();
        rawPrice = rawPrice.replace(/^["']+|["']+$/g, '');
        const num = parseMoneyTokenToFloat(rawPrice);
        if (!Number.isFinite(num) || num <= 0) continue;

        if (cur === 'GS' || cur === 'GUARANI' || cur === 'GUARANIES') cur = 'PYG';

        if (cur === 'USD' || cur === 'US$' || cur === 'DÓLARES') {
            if (num > maxUsd) {
                const asPyg = deriveUsdFromGuaranies(num);
                if (asPyg != null && asPyg > 0) accepted.push({ n: asPyg, source: `${i}:usd-huge-as-pyg` });
            } else accepted.push({ n: roundUsd2(num), source: `${i}:usd-meta` });
            continue;
        }
        if (cur === 'PYG') {
            const usd = deriveUsdFromGuaranies(num);
            if (usd != null) accepted.push({ n: usd, source: `${i}:pyg-meta` });
            continue;
        }
        if (!cur || cur === 'NONE') {
            if (num >= pygLikelyAbove) {
                const usd = deriveUsdFromGuaranies(num);
                if (usd != null) accepted.push({ n: usd, source: `${i}:ambiguous-pyg` });
            } else if (num <= maxUsd && num <= 99999) accepted.push({ n: roundUsd2(num), source: `${i}:ambiguous-usd-like` });
        }
    }

    if (!accepted.length) return null;
    return accepted[0].n;
}

/**
 * Elige mejor USD textual: primera coincidencia razonable; si parece PYG masquerading, corrige.
 */
function pickUsdFromTextUsdList(usdPrices) {
    if (!usdPrices.length) return null;
    const maxUsd = getMaxReasonableUsd();
    const pygLikelyAbove = getAssumePygAbove();
    for (const cand of usdPrices) {
        if (!Number.isFinite(cand) || cand <= 0) continue;
        if (cand > maxUsd || cand >= pygLikelyAbove) {
            const fromGs = deriveUsdFromGuaranies(cand);
            if (fromGs != null) return fromGs;
            continue;
        }
        return roundUsd2(cand);
    }
    return null;
}

/** PYG→USD usando VISAO_PYG_PER_USD o 7300 (alineado con sync por defecto). */
function deriveUsdFromGuaranies(gsAmount) {
    if (gsAmount == null || gsAmount <= 0) return null;
    const rate = Number(process.env.VISAO_PYG_PER_USD);
    const div = Number.isFinite(rate) && rate > 0 ? rate : 7300;
    const usd = gsAmount / div;
    const rounded = Math.round(usd * 100) / 100;
    return rounded > 0 ? rounded : null;
}

function extractSupplierCodeFromPath(pathname) {
    const m = pathname.match(/\/(\d+)\/?$/);
    return m ? m[1] : null;
}

/**
 * Datos del detalle de producto (Nivel 3).
 */
async function scrapeProductDetail(page, productUrl, detailOpts = {}) {
    const preview = !!detailOpts.preview;

    async function snapshotDom(urlParam) {
        return page.evaluate((url) => {
            const pathname = new URL(url).pathname;
            const fromPath = pathname.match(/\/(\d+)\/?$/);

            let supplierCodeFromDom = '';
            document.querySelectorAll('p, span, div').forEach((el) => {
                const t = el.textContent || '';
                if (/código\s*:\s*\d+/i.test(t) || /codigo\s*:\s*\d+/i.test(t)) {
                    const m = t.match(/(?:código|codigo)\s*:\s*(\d+)/i);
                    if (m && !supplierCodeFromDom) supplierCodeFromDom = m[1];
                }
            });

            const h2 =
                [...document.querySelectorAll('h2')].find((h) => {
                    const s = (h.textContent || '').trim();
                    return s.length > 10 && !/visaovip|categoría|lista/i.test(s);
                }) || document.querySelector('h2');

            const titulo = (h2 && h2.textContent ? h2.textContent : '').trim().replace(/\s+/g, ' ');
            const supplierCodeFinal = supplierCodeFromDom || (fromPath ? fromPath[1] : '');
            const mainT = document.querySelector('main')?.innerText || '';
            const bodyT = document.body?.innerText || '';
            const bodyText = `${mainT}\n${bodyT}`.trim();

            const codeSeg = supplierCodeFinal ? `/${supplierCodeFinal}/` : '';
            const imgsBase = [...document.querySelectorAll('img[src*="cdn.visaovip.com/img/prod"]')]
                .map((img) => img.src)
                .filter(Boolean);
            const imgs =
                codeSeg.length > 0
                    ? imgsBase.filter((src) => src.includes(codeSeg))
                    : imgsBase;

            const especificaciones = {};
            function putSpec(key, val) {
                const k = (key || '').trim().replace(/\s*:\s*$/, '').replace(/\s+/g, ' ');
                const v = (val || '').trim().replace(/\s+/g, ' ');
                if (k && v) especificaciones[k] = v;
            }
            const specRoots = [
                ...document.querySelectorAll(
                    '.p-panel-content, [class*="spec"], [id*="spec"], article, main section, main'
                )
            ];
            specRoots.forEach((panel) => {
                panel.querySelectorAll('table tr').forEach((row) => {
                    const cells = row.querySelectorAll('th, td');
                    const keyEl = cells[0];
                    const valEl = cells[1];
                    if (!keyEl || !valEl) return;
                    putSpec(keyEl.textContent, valEl.textContent);
                });
                panel.querySelectorAll('dl dt').forEach((dt) => {
                    const dd = dt.nextElementSibling;
                    const key = dt.textContent.trim().replace(/\s*:\s*$/, '');
                    if (dd && dd.tagName === 'DD') putSpec(key, dd.textContent);
                });
                /**
                 * Next.js + PrimeReact (2025+): "Especificaciones" en filas flex con <p> (clave) + <span> (valor).
                 * Ej: https://www.visaovip.com/es/prod/.../54489/
                 */
                panel.querySelectorAll('div[class*="flex"]').forEach((row) => {
                    const kids = [...row.children];
                    const pEl = kids.find((c) => c.tagName === 'P');
                    const spanEl = kids.find((c) => c.tagName === 'SPAN');
                    if (!pEl || !spanEl) return;
                    const key = String(pEl.textContent || '').trim().replace(/\s*:\s*$/, '');
                    const val = String(spanEl.textContent || '').trim().replace(/\s+/g, ' ');
                    if (!key || !val || key.length > 140) return;
                    if (/^especificaciones$/i.test(key)) return;
                    if (/comparte|lista de deseos|agregar a lista/i.test(key)) return;
                    putSpec(key, val);
                });
                panel.querySelectorAll('li').forEach((li) => {
                    const pEl = li.querySelector('p');
                    const spanEl = li.querySelector('span');
                    if (!pEl || !spanEl) return;
                    putSpec(pEl.textContent, spanEl.textContent);
                });
                panel.querySelectorAll('div, li').forEach((row) => {
                    const children = [...row.children];
                    if (children.length !== 2) return;
                    const [left, right] = children;
                    const leftText = (left.textContent || '').trim();
                    const rightText = (right.textContent || '').trim();
                    if (!leftText || !rightText) return;
                    if (leftText.length > 120 || rightText.length > 240) return;
                    if (/comparte|lista de deseos|agregar a lista/i.test(leftText)) return;
                    putSpec(leftText, rightText);
                });
            });
            // PDP alternativas / tablas fuera del panel → mismo objeto para technicalSpecifications en Mongo (strict: false)
            document.querySelectorAll('article table tr, main section table tr').forEach((row) => {
                const cells = row.querySelectorAll('th, td');
                if (cells.length < 2) return;
                const key = cells[0].textContent.trim().replace(/\s*:\s*$/, '').replace(/\s+/g, ' ');
                const val = cells[1].textContent.trim().replace(/\s+/g, ' ');
                if (key && val && especificaciones[key] === undefined) putSpec(key, val);
            });
            if (Object.keys(especificaciones).length === 0) {
                const textPool = [
                    document.querySelector('main')?.innerText || '',
                    document.body?.innerText || ''
                ]
                    .join('\n')
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean);
                for (const line of textPool) {
                    if (!/:/.test(line)) continue;
                    const parts = line.split(':');
                    if (parts.length < 2) continue;
                    const key = parts[0];
                    const val = parts.slice(1).join(':');
                    if (!key || !val) continue;
                    if (key.length > 100 || val.length > 260) continue;
                    if (/c[oó]digo|categor[ií]a|comparte|lista de deseos/i.test(key)) continue;
                    putSpec(key, val);
                }
            }

            const descNoise =
                /inscribite|recib[ií]|novedades\s+de\s+vis[aã]|newsletter|categor[ií]a\s*:|c[oó]digo\s*:|comparte\s*:|lista\s+de\s+deseos|produtos?\s+relacionados|productos?\s+relacionados|vistos\s+recientemente|últimos\s+vistos/i;

            const descCandidates = [
                ...document.querySelectorAll('article p, [class*="description"] p, main p')
            ];
            let descripcion = '';
            const titleLower = titulo.slice(0, 40).toLowerCase();
            for (const p of descCandidates) {
                const t = (p.textContent || '').trim().replace(/\s+/g, ' ');
                if (
                    t.length > 120 &&
                    titulo &&
                    !t.toLowerCase().startsWith(titleLower.slice(0, 15)) &&
                    !descNoise.test(t)
                ) {
                    descripcion = t;
                    break;
                }
            }
            if (!descripcion) {
                const main = document.querySelector('main') || document.body;
                const parts = [...main.querySelectorAll('p')]
                    .map((p) => p.textContent.trim())
                    .filter(
                        (t) =>
                            t.length > 80 &&
                            !/^U\s*\$/i.test(t) &&
                            !descNoise.test(t) &&
                            !/^G\$\s*[\d]/.test(t) &&
                            !/^R\$\s*[\d]/.test(t)
                    );
                descripcion = parts[0] || '';
            }

            /** Mismo orden que `bodyText` (main + body): en algunos builds `main` puede estar vacío en CDP pero conviene un único haystack coherente. */
            const priceHaystack = bodyText.slice(0, 80000);

            /** JSON-LD, meta OG y microdata típicos de PDP e-commerce — suelen tener precio antes del render del hero. */
            const structuredHints = [];

            function addHint(price, currency) {
                const pStr =
                    price != null
                        ? String(price)
                              .trim()
                              .replace(/^["']+|["']+$/g, '')
                              .trim()
                        : '';
                if (!pStr || !/\d/.test(pStr)) return;
                structuredHints.push({
                    price: pStr,
                    currency: currency != null ? String(currency).trim() : ''
                });
            }

            document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
                const txt = el.textContent && el.textContent.trim();
                if (!txt) return;
                let data;
                try {
                    data = JSON.parse(txt);
                } catch {
                    return;
                }
                function visitLd(node) {
                    if (!node || typeof node !== 'object') return;
                    if (
                        node.price != null ||
                        node.lowPrice != null ||
                        node.highPrice != null
                    ) {
                        const cur = node.priceCurrency || node.PriceCurrency || '';
                        const amt = node.lowPrice ?? node.price ?? node.highPrice;
                        addHint(amt, cur);
                    }
                    for (const v of Object.values(node)) {
                        if (Array.isArray(v)) v.forEach((x) => visitLd(x));
                        else if (v && typeof v === 'object') visitLd(v);
                    }
                }
                if (Array.isArray(data)) data.forEach((x) => visitLd(x));
                else visitLd(data);
            });

            [['og:price:amount', 'og:price:currency'], ['product:price:amount', 'product:price:currency']].forEach(
                ([amtProp, curProp]) => {
                    const a = document.querySelector(`meta[property="${amtProp}"]`);
                    const c = document.querySelector(`meta[property="${curProp}"]`);
                    if (a && a.content) addHint(a.content, c ? c.content : '');
                }
            );

            document.querySelectorAll('[itemprop="price"]').forEach((node) => {
                const amt = node.getAttribute('content') || (node.textContent || '').trim();
                let cur = '';
                const scope =
                    typeof node.closest === 'function'
                        ? node.closest('[itemscope]')
                        : null;
                if (scope && scope.querySelector('[itemprop="priceCurrency"]')) {
                    cur =
                        scope
                            .querySelector('[itemprop="priceCurrency"]')
                            ?.getAttribute('content')
                            ?.trim() || '';
                }
                addHint(amt, cur);
            });

            const mainPrices = [];
            document.querySelectorAll('main [data-pc-section="pricing"] *, main [data-pc-section="pricing"]').forEach((el, i) => {
                if (i > 120) return;
                const txt = String(el.textContent || '').slice(0, 80);
                if (/U\s*\$\s*|G\$\s*[\d]/i.test(txt)) mainPrices.push(txt);
            });

            /** Migas de categoría desde la PDP (no el menú lateral). */
            function extractPdpBreadcrumbLabelsPDP() {
                const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, 200);
                const skip = /^(inicio|home|visaovi?p\.?com|visaovip|catálogo|catalogo)$/i;

                function dedupeSeq(items) {
                    const out = [];
                    const seen = new Set();
                    for (const item of items) {
                        const k = String(item).toLowerCase();
                        if (!k || skip.test(norm(item))) continue;
                        if (seen.has(k)) continue;
                        seen.add(k);
                        out.push(norm(item));
                    }
                    return out.slice(0, 32);
                }

                function linksToLabels(nodes) {
                    const out = [];
                    const list = [...nodes];
                    for (let i = 0; i < list.length && out.length < 32; i++) {
                        const a = list[i];
                        if (!(a instanceof HTMLAnchorElement)) continue;
                        const href = String(a.getAttribute('href') || a.href || '');
                        if (!/\/es\/busca\/categoria\//i.test(href)) continue;
                        const t = norm(a.textContent);
                        if (!t || skip.test(t)) continue;
                        out.push(t);
                    }
                    return dedupeSeq(out);
                }

                const rootEl = document.querySelector('main') || document.body;
                if (!rootEl) return [];

                const containers = [
                    ...rootEl.querySelectorAll(
                        '[class*="breadcrumb"], [data-pc-name="breadcrumb"], [data-pc-section="breadcrumb"], nav[aria-label*="readcrumb" i]'
                    )
                ];
                let best = [];
                for (const c of containers) {
                    const labs = linksToLabels([...c.querySelectorAll('a[href]')]);
                    if (labs.length > best.length) best = labs;
                }
                if (best.length) return best;

                /** Respaldo: primeros enlaces de categoría en orden visual del main. */
                const flatAnchors = [...rootEl.querySelectorAll('a[href*="/es/busca/categoria/"]')].slice(0, 16);
                return linksToLabels(flatAnchors);
            }

            const pdpBreadcrumbLabels = extractPdpBreadcrumbLabelsPDP();

            return {
                supplierCodeStr: supplierCodeFinal ? String(supplierCodeFinal).trim() : '',
                titulo,
                priceHaystack,
                mainPriceFragments: mainPrices.slice(0, 8),
                structuredPriceHints: structuredHints.slice(0, 24),
                rawTextSnippet: bodyText.slice(0, 12000),
                imagenes: [...new Set(imgs)],
                especificaciones,
                descripcionFull: bodyText.slice(0, 10000),
                descripcion,
                pdpBreadcrumbLabels
            };
        }, urlParam);
    }

    await page.goto(productUrl, {
        waitUntil: 'domcontentloaded',
        timeout: preview ? 45000 : 60000
    });
    await page.waitForSelector('h2', { timeout: preview ? 12000 : 12000 }).catch(() => null);
    await page
        .waitForSelector('.p-panel-content, [class*="price"], [data-pc-name="product"]', {
            timeout: preview ? 4000 : 6000
        })
        .catch(() => {});
    /**
     * No usar flex genérico en todo el documento: el menú/header suele tener <p>+<span>
     * y hace que esta espera se cumpla antes de hidratar el PDP → timeouts en señal de precio.
     */
    await page
        .waitForFunction(
            () => {
                const b = document.body?.innerText || '';
                if (!/(?:c[oó]digo|código)\s*:\s*\d+/i.test(b)) return false;
                const productRoot =
                    document.querySelector('[data-pc-name="product"]') ||
                    document.querySelector('article') ||
                    document.querySelector('main') ||
                    document.body;
                if (!productRoot) return false;
                if (productRoot.querySelector('table tr td, dl dt')) return true;
                if (productRoot.querySelector('[class*="spec"], [id*="spec"]')) return true;
                return [...productRoot.querySelectorAll('div[class*="flex"], li')].some((row) => {
                    const kids = [...row.children];
                    return kids.some((c) => c.tagName === 'P') && kids.some((c) => c.tagName === 'SPAN');
                });
            },
            { timeout: preview ? 8000 : 18000 }
        )
        .catch(() => {});
    const priceSignalsReadyJs = () => {
        /* eslint-env browser */
        const b = document.body?.innerText || '';
        const m = document.querySelector('main')?.innerText || '';
        const t = `${m}\n${b}`;
        const html = document.documentElement?.innerHTML || '';
        return (
            /U\s*\$\s*[\d]/i.test(t) ||
            /US\s*\$\s*[\d]/i.test(t) ||
            /U\$S\s*[\d]/i.test(t) ||
            /\bGs\.?\s*[\d]/i.test(t) ||
            /\bUSD\s*[:\.]?\s*[\d]/i.test(t) ||
            /G\s*\$\s*[\d]/i.test(t) ||
            /itemprop\s*=\s*"price"/i.test(html) ||
            /"priceCurrency"/i.test(html)
        );
    };
    await page
        .waitForFunction(priceSignalsReadyJs, { timeout: preview ? 18000 : 32000 })
        .catch(() => {});
    await delay(preview ? 550 : 300);

    function resolvePrecioUsd(domRaw) {
        const hay =
            domRaw.priceHaystack ||
            domRaw.rawTextSnippet ||
            domRaw.descripcionFull ||
            '';

        const hinted = resolveUsdFromStructuredHints(domRaw.structuredPriceHints || []);
        if (hinted != null) return hinted;

        const fragText = Array.isArray(domRaw.mainPriceFragments)
            ? domRaw.mainPriceFragments.filter(Boolean).join('\n')
            : '';
        if (fragText) {
            const uFrag = pickUsdFromTextUsdList(parseUsdPrices(fragText));
            if (uFrag != null) return uFrag;
            const fromGsFrag = deriveUsdFromGuaranies(parseHeroGsAmount(fragText));
            if (fromGsFrag != null) return fromGsFrag;
        }

        const heroTrim = trimHeroBlock(hay, HERO_CUT_MARKERS);

        let u = pickUsdFromTextUsdList(parseUsdPrices(heroTrim));
        if (u != null) return u;

        const fromGsHay = deriveUsdFromGuaranies(parseHeroGsAmount(hay));
        if (fromGsHay != null) return fromGsHay;

        /** Zona alta del PDP (precio antes de bloques relacionados cuando el marcador corta tarde). */
        const early = hay.slice(0, Math.min(hay.length, 7200));
        u = pickUsdFromTextUsdList(parseUsdPrices(early));
        if (u != null) return u;

        return deriveUsdFromGuaranies(parseHeroGsAmount(early));
    }

    let raw = await snapshotDom(productUrl);
    let precioUsd = resolvePrecioUsd(raw);

    if (precioUsd == null) {
        await delay(preview ? 900 : 500);
        await page.evaluate(() => {
            window.scrollTo(0, 0);
        }).catch(() => {});
        await page
            .waitForFunction(priceSignalsReadyJs, { timeout: preview ? 16000 : 28000 })
            .catch(() => {});
        await delay(preview ? 400 : 200);
        raw = await snapshotDom(productUrl);
        precioUsd = resolvePrecioUsd(raw);
    }

    if (precioUsd == null) {
        await page
            .evaluate(() => {
                const mainEl = document.querySelector('main') || document.body;
                window.scrollTo(0, Math.min((mainEl && mainEl.offsetTop) ? mainEl.offsetTop + 280 : 360, 900));
            })
            .catch(() => {});
        await delay(preview ? 550 : 400);
        raw = await snapshotDom(productUrl);
        precioUsd = resolvePrecioUsd(raw);
    }

    if (precioUsd == null && !preview) {
        await page
            .reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
            .catch(() => null);
        await page.waitForSelector('h2', { timeout: 12000 }).catch(() => null);
        await page
            .waitForFunction(priceSignalsReadyJs, { timeout: 28000 })
            .catch(() => {});
        await delay(450);
        raw = await snapshotDom(productUrl);
        precioUsd = resolvePrecioUsd(raw);
    }

    let descripcion = raw.descripcion;
    const lineNoise =
        /inscribite|recib[ií]|novedades\s+de\s+vis[aã]|newsletter|^G\$\s|^R\$\s|categor[ií]a\s*:|c[oó]digo\s*:|comparte\s*:|relacionados|^U\s*\$/i;
    if (!descripcion || descripcion.length < 50) {
        const lines = raw.descripcionFull.split('\n').map((l) => l.trim()).filter(Boolean);
        const good = lines.find(
            (l) => l.length > 120 && !lineNoise.test(l)
        );
        if (good) descripcion = good;
    }

    const specsCount =
        raw.especificaciones && typeof raw.especificaciones === 'object'
            ? Object.keys(raw.especificaciones).length
            : 0;
    if (specsCount === 0) {
        console.warn(`[SCRAPER][SIN_SPECS] ${productUrl}`);
    }

    const pdpBreadcrumbLabels =
        Array.isArray(raw.pdpBreadcrumbLabels) && raw.pdpBreadcrumbLabels.length
            ? raw.pdpBreadcrumbLabels.map((s) => String(s || '').trim()).filter(Boolean)
            : [];

    return {
        url: productUrl,
        supplierCode: raw.supplierCodeStr ? parseInt(raw.supplierCodeStr, 10) || raw.supplierCodeStr : null,
        titulo: raw.titulo || '',
        precioUsd,
        descripcion,
        especificaciones: raw.especificaciones,
        imagenes: raw.imagenes,
        pdpBreadcrumbLabels
    };
}

async function scrapeProductDetailsParallel(browserParam, urls, detailOpts = {}) {
    const { preview, concurrency, mutableBrowserCtx } = detailOpts;
    const n = urls.length;
    const workers = Math.max(1, Math.min(Number(concurrency) || 4, 8, Math.max(n, 1)));

    const getBrowser = () =>
        mutableBrowserCtx && mutableBrowserCtx.browser != null ? mutableBrowserCtx.browser : browserParam;

    /** Con salida a `tee`/archivo, Node puede bufferizar; forzar línea a línea si el runtime lo permite. */
    try {
        if (typeof process.stdout.setBlocking === 'function') {
            process.stdout.setBlocking(true);
        }
    } catch {
        /* ignore */
    }

    const results = new Array(n);
    let next = 0;
    let pdpCompleted = 0;
    /** Tras cada relanzamiento de Chromium todos los BrowserContext previos son inválidos */
    let browserGeneration = 0;
    /** Serializa relaunch global (un solo Chromium mut ref) */
    let relaunchMux = Promise.resolve();
    function runSerialized(fn) {
        const p = relaunchMux.then(fn, fn);
        relaunchMux = p.catch(() => {});
        return p;
    }

    const logEvery = Math.max(
        1,
        Math.min(
            500,
            Number(process.env.VISAO_PDP_LOG_EVERY) > 0 ? Number(process.env.VISAO_PDP_LOG_EVERY) : 20
        )
    );

    if (n > 0) {
        console.log(
            `[Visão mirror][PDP] Inicio scrape de ${n} PDP (workers=${workers}, log cada ${logEvery} completados)…`
        );
    }

    const pdpHardMs = getPdpHardTimeoutMs();

    /** Cierra solo el BrowserContext del worker cada N PDP (reduce RAM / pestañas colgadas en corridas largas). 0 = desactivar. */
    function getRecycleContextEvery() {
        const v = Number(process.env.VISAO_PDP_RECYCLE_CONTEXT_EVERY);
        if (v === 0) return 0;
        if (!Number.isFinite(v) || v < 0) return 140;
        return Math.min(Math.max(Math.round(v), 40), 800);
    }
    const recycleContextEvery = getRecycleContextEvery();

    async function refreshBrowserIfStaleOrDead() {
        if (!mutableBrowserCtx) return;
        if (!(await puppeteerBrowserResponsive(getBrowser()))) {
            await runSerialized(async () => {
                if (await puppeteerBrowserResponsive(getBrowser())) return;
                await relaunchMutableBrowserHolder(mutableBrowserCtx);
                browserGeneration++;
            });
        }
    }

    /** Un contexto por worker sobre `getBrowser()` actual (mirror relanza el mismo objeto ctx.browser). */
    async function worker() {
        const ws = { bctx: null, page: null, boundGen: -1 };
        let localPdpDone = 0;

        async function recreateWorkerSession(reason) {
            const br = getBrowser();
            await ws.bctx?.close()?.catch(() => {});
            ws.bctx = await br.createBrowserContext();
            ws.page = await ws.bctx.newPage();
            await configureScraperPage(ws.page);
            ws.boundGen = browserGeneration;
            if (reason) {
                console.warn(`[Visão mirror][PDP] Nueva sesión PDP (${reason}) gen=${browserGeneration}`);
            }
        }

        async function ensureSession(reason) {
            await refreshBrowserIfStaleOrDead();
            if (!mutableBrowserCtx) {
                if (!ws.page) await recreateWorkerSession(reason || 'inicio');
                return;
            }
            if (ws.boundGen !== browserGeneration || ws.page == null) {
                await recreateWorkerSession(reason || 'sin_gen');
            }
        }

        try {
            await ensureSession('bootstrap');
            for (;;) {
                const i = next;
                next += 1;
                if (i >= n) break;
                const u = urls[i];
                let hardTimer;

                /** Hasta 3 intentos PDP: errores Puppeteer blandos ⇒ nuevo contexto; desconectado ⇒ relaunch global */
                let scrapeOk = false;
                let lastErrCatched = null;
                const maxPdpAttempts = 3;

                for (let attempt = 0; attempt < maxPdpAttempts && !scrapeOk; attempt++) {
                    await ensureSession(attempt === 0 ? '' : `reintento ${attempt}`);

                    /**
                     * No dejar que `scrapeProductDetail` rechace salvo errores “browser muerto”: el rechazo compite mal
                     * con `Promise.race` ante timeouts CDP. El resto ⇒ objeto `{ error, scrapeRejectReason }`.
                     */
                    const innerDetail = (async () => {
                        try {
                            return await scrapeProductDetail(ws.page, u, { preview });
                        } catch (e) {
                            if (mutableBrowserCtx && isDisconnectedOrDeadBrowserError(e)) {
                                throw e;
                            }
                            return {
                                url: u,
                                supplierCode: extractSupplierCodeFromPath(new URL(u).pathname),
                                error: 'detail_exception',
                                scrapeRejectReason: e && e.message ? String(e.message).slice(0, 560) : String(e || '')
                            };
                        }
                    })();

                    const timeoutPromise = new Promise((_, reject) => {
                        hardTimer = setTimeout(() => reject(new Error('pdp_hard_timeout')), pdpHardMs);
                    });

                    try {
                        results[i] = await Promise.race([innerDetail, timeoutPromise]);
                        await innerDetail.catch(() => {});

                        if (results[i] && results[i].error && attempt < maxPdpAttempts - 1) {
                            const softBackoff =
                                Number.isFinite(Number(process.env.VISAO_PDP_SOFT_RETRY_MS)) &&
                                Number(process.env.VISAO_PDP_SOFT_RETRY_MS) >= 0
                                    ? Math.min(5000, Number(process.env.VISAO_PDP_SOFT_RETRY_MS))
                                    : 450;
                            await delay(softBackoff);
                            await ws.bctx?.close?.().catch(() => {});
                            ws.bctx = null;
                            ws.page = null;
                            ws.boundGen = -1;
                            const rj = String(results[i].scrapeRejectReason || '');
                            if (mutableBrowserCtx && isDisconnectedOrDeadBrowserError({ message: rj })) {
                                console.warn(`[Visão mirror][PDP] error tipo desconexión — relanzando Chromium\n  ${u}`);
                                await runSerialized(async () => {
                                    await relaunchMutableBrowserHolder(mutableBrowserCtx);
                                    browserGeneration++;
                                });
                            }
                            continue;
                        }

                        scrapeOk = true;
                    } catch (e) {
                        lastErrCatched = e;
                        await innerDetail.catch(() => {});
                        const isHardTimeout = e && String(e.message) === 'pdp_hard_timeout';
                        const disconnected = mutableBrowserCtx && isDisconnectedOrDeadBrowserError(e);
                        results[i] = {
                            url: u,
                            error: isHardTimeout ? 'pdp_hard_timeout' : 'fallback_detail_failed',
                            scrapeRejectReason: e && e.message ? String(e.message).slice(0, 560) : String(e || ''),
                            supplierCode: extractSupplierCodeFromPath(new URL(u).pathname)
                        };

                        if (disconnected && mutableBrowserCtx) {
                            console.warn(`[Visão mirror][PDP] desconectado — relanzando Chromium e reintentando\n  ${u}`);
                            await runSerialized(async () => {
                                await relaunchMutableBrowserHolder(mutableBrowserCtx);
                                browserGeneration++;
                            });
                            await ws.bctx?.close?.().catch(() => {});
                            ws.bctx = null;
                            ws.page = null;
                            ws.boundGen = -1;
                            if (attempt < maxPdpAttempts - 1) continue;
                        } else if (isHardTimeout) {
                            console.warn(`[Visão mirror][PDP] timeout ${pdpHardMs}ms — nuevo contexto local\n  ${u}`);
                            await ws.bctx?.close?.().catch(() => {});
                            ws.bctx = null;
                            ws.page = null;
                            ws.boundGen = -1;
                            if (attempt < maxPdpAttempts - 1) continue;
                        }
                        break;
                    } finally {
                        if (hardTimer != null) {
                            clearTimeout(hardTimer);
                            hardTimer = null;
                        }
                    }
                }

                if (!scrapeOk && !results[i]) {
                    results[i] = {
                        url: u,
                        error: 'fallback_detail_failed',
                        scrapeRejectReason:
                            lastErrCatched && lastErrCatched.message
                                ? String(lastErrCatched.message).slice(0, 560)
                                : String(lastErrCatched || ''),
                        supplierCode: extractSupplierCodeFromPath(new URL(u).pathname)
                    };
                }

                pdpCompleted += 1;
                localPdpDone += 1;
                if (recycleContextEvery > 0 && localPdpDone % recycleContextEvery === 0) {
                    await ws.bctx?.close?.().catch(() => {});
                    ws.bctx = null;
                    ws.page = null;
                }

                const remaining = n - pdpCompleted;
                const homeStretch = remaining < 30 && remaining >= 0;
                if (
                    pdpCompleted === 1 ||
                    pdpCompleted === n ||
                    pdpCompleted % logEvery === 0 ||
                    homeStretch
                ) {
                    console.log(`[Visão mirror][PDP] ${pdpCompleted}/${n} PDP scrapeados…`);
                }
            }
        } finally {
            await ws.bctx?.close?.().catch(() => {});
        }
    }

    if (n === 0) return [];

    await Promise.all(Array.from({ length: workers }, () => worker()));

    let scrapeRejected = 0;
    let nullPriceOk = 0;
    for (const r of results) {
        if (!r) continue;
        if (r.error) scrapeRejected += 1;
        else if (r.precioUsd == null) nullPriceOk += 1;
    }
    if (n > 0 && (scrapeRejected > 0 || nullPriceOk > 0)) {
        console.warn(
            `[Visão mirror][PDP] Calidad muestra scrape: errores=${scrapeRejected} precioUsd_null_sin_error=${nullPriceOk} (si errores≈omitidos revisá TIMEOUT/protocolTimeout; si null alto revisá paralelismo/red)`
        );
    }

    if (scrapeRejected > 0 && n > 0) {
        const reasons = [];
        const seen = new Set();
        for (const r of results) {
            if (!r || !r.error) continue;
            const key = `${r.error}|${String(r.scrapeRejectReason || '').slice(0, 140)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            reasons.push(key.slice(0, 220));
            if (reasons.length >= 6) break;
        }
        if (reasons.length) {
            console.warn('[Visão mirror][PDP] Muestra motivos error (primeros únicos):', reasons);
        }
    }

    return results;
}

/**
 * @param {object} opts
 * @param {number} [opts.maxCategories=2]
 * @param {number|null} [opts.maxProductDetails=null] — null = todas las URLs halladas en esas categorías
 * @param {number|null} [opts.urlsPerCategoryCap=null] — tope opcional por categoría antes de pasar página
 * @param {boolean} [opts.previewMode=false] — solo primera página de listados + trabajo en paralelo
 * @param {number} [opts.detailConcurrency=1] — pestañas simultáneas al abrir PDP (recomendado 4–8 con previewMode)
 */
async function scrapeVisionVipCatalog(opts = {}) {
    const maxCategories =
        opts.maxCategories != null && Number.isFinite(opts.maxCategories)
            ? Math.min(Math.max(1, opts.maxCategories), 100)
            : 2;
    const maxProductDetails =
        opts.maxProductDetails != null && Number.isFinite(opts.maxProductDetails)
            ? Math.max(1, opts.maxProductDetails)
            : null;
    const urlsPerCategoryCap =
        opts.urlsPerCategoryCap != null && Number.isFinite(opts.urlsPerCategoryCap)
            ? Math.max(1, opts.urlsPerCategoryCap)
            : null;
    const previewMode = !!opts.previewMode;
    const detailConcurrency =
        opts.detailConcurrency != null && Number.isFinite(opts.detailConcurrency)
            ? Math.max(1, Math.min(16, opts.detailConcurrency))
            : previewMode
              ? 6
              : 1;

    let browser;
    try {
        browser = await puppeteer.launch(getLaunchOptions());
        const page = await browser.newPage();
        await configureScraperPage(page);

        const allCategoryUrls = await collectCategoryUrls(page);
        const selectedCategories = allCategoryUrls.slice(0, maxCategories);

        const productsByCat = {};
        let allUrls = [];

        let remainingBudget =
            maxProductDetails != null && Number.isFinite(maxProductDetails) ? maxProductDetails : null;
        for (const catUrl of selectedCategories) {
            let budgetForFetch;
            if (urlsPerCategoryCap != null && remainingBudget != null) {
                budgetForFetch = Math.min(urlsPerCategoryCap, remainingBudget);
            } else if (urlsPerCategoryCap != null) {
                budgetForFetch = urlsPerCategoryCap;
            } else if (remainingBudget != null) {
                budgetForFetch = remainingBudget;
            } else {
                budgetForFetch = undefined;
            }
            const urls = await collectProductUrlsForCategory(page, catUrl, {
                urlBudget: budgetForFetch,
                singlePageOnly: previewMode
            });
            productsByCat[catUrl] = urls;
            allUrls.push(...urls);
            if (remainingBudget != null) remainingBudget -= urls.length;
            if (remainingBudget != null && remainingBudget <= 0) break;
        }

        const uniqueUrls = [...new Set(allUrls)];

        const detailLimit =
            maxProductDetails != null ? Math.min(maxProductDetails, uniqueUrls.length) : uniqueUrls.length;
        const toDetail = uniqueUrls.slice(0, detailLimit);

        let products;
        if (previewMode || detailConcurrency > 1) {
            await page.close().catch(() => {});
            products = await scrapeProductDetailsParallel(browser, toDetail, {
                preview: previewMode,
                concurrency: detailConcurrency
            });
        } else {
            const sequential = [];
            for (let i = 0; i < toDetail.length; i++) {
                const u = toDetail[i];
                try {
                    sequential.push(await scrapeProductDetail(page, u));
                } catch {
                    sequential.push({
                        url: u,
                        error: 'fallback_detail_failed',
                        supplierCode: extractSupplierCodeFromPath(new URL(u).pathname)
                    });
                }
            }
            products = sequential;
        }

        return {
            mode: previewMode ? 'preview' : 'full',
            detailConcurrency:
                previewMode || detailConcurrency > 1 ? detailConcurrency : 1,
            singlePageListing: !!previewMode,
            home: HOME_URL,
            categoriesDiscoveredTotal: allCategoryUrls.length,
            categoriesSelected: selectedCategories,
            urlsPerCategoryCounts: Object.fromEntries(
                Object.entries(productsByCat).map(([k, v]) => [k, v.length])
            ),
            uniqueProductUrls: uniqueUrls.length,
            productsReturned: products.length,
            products
        };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

module.exports = {
    scrapeVisionVipCatalog,
    getLaunchOptions,
    HOME_URL,
    collectCategoryUrls,
    collectProductUrlsForCategory,
    scrapeProductDetailsParallel,
    /** Diagnóstico / pruebas unitarias manuales (`scripts/debug-pdp-sample.js`). */
    scrapeProductDetail,
    puppeteerBrowserResponsive,
    relaunchMutableBrowserHolder,
    isDisconnectedOrDeadBrowserError
};
