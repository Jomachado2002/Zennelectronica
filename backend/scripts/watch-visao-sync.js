#!/usr/bin/env node
/**
 * Monitor en tiempo real del mirror Visão (workers PDP / listados / persist).
 *
 * Uso (desde backend):
 *   node scripts/watch-visao-sync.js
 *   npm run watch-visao-sync
 *   node scripts/watch-visao-sync.js --log=logs/visao-mirror-full-XXXX.log
 *   node scripts/watch-visao-sync.js --no-clear
 *
 * Lee el log del sync (latest o --log) y muestra:
 *   - PID vivo / muerto
 *   - Fase: MENU | LISTING | PDP | PERSIST | DONE
 *   - Contadores: listados, URLs, PDP, productos persistidos, specs vacías, errores
 *   - Últimas líneas relevantes de workers
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BACKEND = path.join(__dirname, '..');
const LOG_DIR = path.join(BACKEND, 'logs');
const LATEST_PTR = path.join(LOG_DIR, 'visao-mirror-full-latest.txt');
const PID_FILE = path.join(LOG_DIR, 'visao-mirror-full.pid');

const args = process.argv.slice(2);
const noClear = args.includes('--no-clear');
const logArg = args.find((a) => a.startsWith('--log='));
const refreshMs = (() => {
    const raw = args.find((a) => a.startsWith('--refresh='));
    const n = raw ? Number(raw.slice('--refresh='.length)) : 800;
    return Number.isFinite(n) && n >= 200 ? n : 800;
})();

const C = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function resolveLogPath() {
    if (logArg) {
        const p = logArg.slice('--log='.length);
        return path.isAbsolute(p) ? p : path.join(BACKEND, p);
    }
    if (fs.existsSync(LATEST_PTR)) {
        const rel = fs.readFileSync(LATEST_PTR, 'utf8').trim();
        if (rel) {
            const abs = path.isAbsolute(rel) ? rel : path.join(BACKEND, rel);
            if (fs.existsSync(abs)) return abs;
        }
    }
    const files = fs
        .readdirSync(LOG_DIR)
        .filter((f) => /^visao-mirror-full-\d{8}-\d{6}\.log$/.test(f))
        .map((f) => ({ f, m: fs.statSync(path.join(LOG_DIR, f)).mtimeMs }))
        .sort((a, b) => b.m - a.m);
    if (!files.length) return null;
    return path.join(LOG_DIR, files[0].f);
}

function readPid() {
    try {
        if (!fs.existsSync(PID_FILE)) return null;
        const n = Number(String(fs.readFileSync(PID_FILE, 'utf8')).trim());
        return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
        return null;
    }
}

function isPidAlive(pid) {
    if (!pid) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

function processInfo(pid) {
    if (!pid || !isPidAlive(pid)) return null;
    try {
        const out = spawnSync('ps', ['-p', String(pid), '-o', 'etime=,%cpu=,rss='], {
            encoding: 'utf8'
        });
        if (out.status !== 0) return { pid, alive: true };
        const parts = String(out.stdout || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        return {
            pid,
            alive: true,
            etime: parts[0] || '?',
            cpu: parts[1] || '?',
            rssMb: parts[2] ? (Number(parts[2]) / 1024).toFixed(0) : '?'
        };
    } catch {
        return { pid, alive: true };
    }
}

function emptyState() {
    return {
        phase: 'WAITING',
        menuRoots: 0,
        menuExpanded: 0,
        menuLeafListings: 0,
        listingsDone: 0,
        listingUrlsTotal: 0,
        listingZeros: 0,
        listingRetries: 0,
        uniqueProductUrls: null,
        pdpDone: 0,
        pdpTotal: 0,
        persistDone: 0,
        persistTotal: 0,
        sinSpecs: 0,
        workerDown: 0,
        errors: 0,
        lastPdpLine: '',
        lastListingLine: '',
        lastProgressLine: '',
        lastErrorLine: '',
        resumen: '',
        finished: false,
        recent: []
    };
}

function pushRecent(state, line, max = 14) {
    state.recent.push(line);
    if (state.recent.length > max) state.recent.shift();
}

function ingestLine(state, line) {
    const s = String(line || '').replace(/\r$/, '');
    if (!s.trim()) return;

    const interesting =
        /\[Visão|\[PROGRESO\]|\[RESUMEN\]|\[SCRAPER\]|\[INICIO\]|\[MIRROR\]|\[run-sync\]|uncaught|Error|worker/i.test(
            s
        );
    if (interesting) pushRecent(state, s);

    if (/Fase menú|\[MENU\]/.test(s)) state.phase = 'MENU';
    if (/\[LISTING\]|Filas de menú|URLs únicas de producto/.test(s)) state.phase = 'LISTING';
    if (/\[PDP\]/.test(s)) state.phase = 'PDP';
    if (/\[PROGRESO\]|Prep árbol categorías|Iniciando scrape espejo.*terminó/.test(s)) {
        if (/\[PROGRESO\]/.test(s)) state.phase = 'PERSIST';
    }
    if (/\[RESUMEN\]|run-sync\] Fin/.test(s)) {
        state.phase = 'DONE';
        state.finished = true;
    }

    let m;
    if ((m = s.match(/Categorías raíz detectadas:\s*(\d+)/i))) {
        state.menuRoots = Number(m[1]);
    }
    if ((m = s.match(/\[MENU\]\s*\((\d+)\/(\d+)\)\s*expandiendo/i))) {
        state.menuExpanded = Number(m[1]);
        state.menuRoots = Number(m[2]);
        state.phase = 'MENU';
    }
    if ((m = s.match(/Total listados hoja únicos:\s*(\d+)/i))) {
        state.menuLeafListings = Number(m[1]);
    }
    if ((m = s.match(/Filas de menú[^:]*:\s*(\d+)/i))) {
        state.menuLeafListings = Number(m[1]);
    }

    if (/\[LISTING_RETRY\]/.test(s)) {
        state.listingRetries += 1;
        state.lastListingLine = s;
    }
    if ((m = s.match(/\[LISTING\].*->\s*(\d+)\s*URLs/i))) {
        state.listingsDone += 1;
        const n = Number(m[1]);
        state.listingUrlsTotal += n;
        if (n === 0) state.listingZeros += 1;
        state.lastListingLine = s;
        state.phase = 'LISTING';
    }
    if ((m = s.match(/URLs únicas de producto \(PDP\):\s*(\d+)/i))) {
        state.uniqueProductUrls = Number(m[1]);
        state.pdpTotal = Number(m[1]);
    }

    if ((m = s.match(/\[PDP\]\s*(\d+)\/(\d+)\s*PDP/i))) {
        state.pdpDone = Number(m[1]);
        state.pdpTotal = Number(m[2]);
        state.lastPdpLine = s;
        state.phase = 'PDP';
    }
    if (/\[PDP\] worker caído/i.test(s)) {
        state.workerDown += 1;
        state.lastErrorLine = s;
    }

    if ((m = s.match(/\[PROGRESO\]\s*Procesado producto\s+(\d+)\s+de\s+(\d+)/i))) {
        state.persistDone = Number(m[1]);
        state.persistTotal = Number(m[2]);
        state.lastProgressLine = s;
        state.phase = 'PERSIST';
    }

    if (/\[SCRAPER\]\[SIN_SPECS\]/i.test(s)) state.sinSpecs += 1;
    if (/uncaughtException|unhandledRejection|SyntaxError|\[run-sync\] Error/i.test(s)) {
        state.errors += 1;
        state.lastErrorLine = s;
    }
    if (/\[RESUMEN\]/.test(s)) {
        state.resumen = s;
        state.finished = true;
        state.phase = 'DONE';
    }
}

function bar(done, total, width = 28) {
    if (!total || total <= 0) return `${C.dim}${'·'.repeat(width)}${C.reset}`;
    const ratio = Math.max(0, Math.min(1, done / total));
    const filled = Math.round(ratio * width);
    return `${C.green}${'█'.repeat(filled)}${C.dim}${'░'.repeat(width - filled)}${C.reset} ${(
        ratio * 100
    ).toFixed(1)}%`;
}

function phaseColor(phase) {
    switch (phase) {
        case 'MENU':
            return C.cyan;
        case 'LISTING':
            return C.blue;
        case 'PDP':
            return C.magenta;
        case 'PERSIST':
            return C.yellow;
        case 'DONE':
            return C.green;
        default:
            return C.dim;
    }
}

function short(s, n = 110) {
    const t = String(s || '');
    return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function render(logPath, state, proc, fileSize) {
    const alive = !!(proc && proc.alive);
    const lines = [];
    lines.push(`${C.bold}Visão sync monitor${C.reset}  ${C.dim}${new Date().toLocaleTimeString()}${C.reset}`);
    lines.push(`${C.dim}log:${C.reset} ${logPath}`);
    lines.push(
        `${C.dim}proceso:${C.reset} ${
            alive
                ? `${C.green}VIVO${C.reset} pid=${proc.pid} etime=${proc.etime} cpu=${proc.cpu}% rss=${proc.rssMb}MB`
                : `${C.red}MUERTO / no hay run-sync${C.reset}${
                      proc && proc.pid ? ` (pid file ${proc.pid})` : ''
                  }`
        }`
    );
    lines.push(
        `${C.dim}fase:${C.reset} ${phaseColor(state.phase)}${C.bold}${state.phase}${C.reset}   ${C.dim}log size:${C.reset} ${(
            fileSize / 1024
        ).toFixed(1)} KB`
    );
    lines.push('');
    lines.push(
        `${C.cyan}MENU${C.reset}     raíces ${state.menuExpanded || 0}/${state.menuRoots || '?'}   hojas/listados=${state.menuLeafListings || '?'}`
    );
    lines.push(
        `${C.blue}LISTING${C.reset}  hechos=${state.listingsDone}  urls_sum=${state.listingUrlsTotal}  vacíos=${state.listingZeros}  retries=${state.listingRetries}  únicos_PDP=${state.uniqueProductUrls ?? '?'}`
    );
    lines.push(
        `${C.magenta}PDP${C.reset}      ${state.pdpDone}/${state.pdpTotal || '?'}  ${bar(
            state.pdpDone,
            state.pdpTotal
        )}  workers_caídos=${state.workerDown}`
    );
    lines.push(
        `${C.yellow}PERSIST${C.reset}  ${state.persistDone}/${state.persistTotal || '?'}  ${bar(
            state.persistDone,
            state.persistTotal
        )}  sin_specs=${state.sinSpecs}  errs=${state.errors}`
    );
    if (state.resumen) lines.push(`${C.green}RESUMEN${C.reset}  ${short(state.resumen, 140)}`);
    lines.push('');
    if (state.lastPdpLine) lines.push(`${C.dim}último PDP:${C.reset} ${short(state.lastPdpLine)}`);
    if (state.lastListingLine)
        lines.push(`${C.dim}último LISTING:${C.reset} ${short(state.lastListingLine)}`);
    if (state.lastProgressLine)
        lines.push(`${C.dim}último PERSIST:${C.reset} ${short(state.lastProgressLine)}`);
    if (state.lastErrorLine)
        lines.push(`${C.red}último error:${C.reset} ${short(state.lastErrorLine, 140)}`);
    lines.push('');
    lines.push(`${C.bold}Últimas líneas relevantes${C.reset}`);
    for (const r of state.recent) {
        let color = C.dim;
        if (/ERROR|uncaught|worker caído|SIN_SPECS/i.test(r)) color = C.red;
        else if (/\[PDP\]/.test(r)) color = C.magenta;
        else if (/\[LISTING\]/.test(r)) color = C.blue;
        else if (/\[MENU\]/.test(r)) color = C.cyan;
        else if (/\[PROGRESO\]|\[RESUMEN\]/.test(r)) color = C.yellow;
        lines.push(`  ${color}${short(r, 120)}${C.reset}`);
    }
    lines.push('');
    lines.push(`${C.dim}Ctrl+C para salir · refresh ${refreshMs}ms${C.reset}`);
    return lines.join('\n');
}

function main() {
    const logPath = resolveLogPath();
    if (!logPath || !fs.existsSync(logPath)) {
        console.error(
            'No encontré log de mirror. Esperado: logs/visao-mirror-full-*.log o logs/visao-mirror-full-latest.txt'
        );
        process.exit(1);
    }

    const state = emptyState();
    let offset = 0;
    let buf = '';

    // Bootstrap: leer todo lo existente una vez
    try {
        const existing = fs.readFileSync(logPath, 'utf8');
        offset = Buffer.byteLength(existing, 'utf8');
        for (const line of existing.split(/\n/)) ingestLine(state, line);
    } catch (e) {
        console.error('No pude leer el log:', e.message);
        process.exit(1);
    }

    const tick = () => {
        const pid = readPid();
        const proc = processInfo(pid) || { pid, alive: false };

        try {
            const st = fs.statSync(logPath);
            if (st.size < offset) {
                // log rotado / truncado
                offset = 0;
                buf = '';
                Object.assign(state, emptyState());
            }
            if (st.size > offset) {
                const fd = fs.openSync(logPath, 'r');
                const len = st.size - offset;
                const chunk = Buffer.alloc(len);
                fs.readSync(fd, chunk, 0, len, offset);
                fs.closeSync(fd);
                offset = st.size;
                buf += chunk.toString('utf8');
                const parts = buf.split(/\n/);
                buf = parts.pop() || '';
                for (const line of parts) ingestLine(state, line);
            }

            const out = render(logPath, state, proc, st.size);
            if (!noClear) {
                process.stdout.write('\x1b[2J\x1b[H');
            } else {
                process.stdout.write('\n────────────\n');
            }
            process.stdout.write(out + '\n');
        } catch (e) {
            process.stdout.write(`${C.red}watch error: ${e.message}${C.reset}\n`);
        }
    };

    tick();
    const iv = setInterval(tick, refreshMs);
    process.on('SIGINT', () => {
        clearInterval(iv);
        process.stdout.write('\n');
        process.exit(0);
    });
}

main();
