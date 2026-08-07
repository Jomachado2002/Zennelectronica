#!/usr/bin/env node
/**
 * Lanza el espejo Visão FULL totalmente detached (sobrevive a cerrar Cursor/terminal).
 *
 * Uso:
 *   node scripts/daemon-visao-full-mirror.js
 *   node scripts/daemon-visao-full-mirror.js --force-reimport-images
 *   node scripts/daemon-visao-full-mirror.js --no-force-images
 *
 * Luego:
 *   npm run watch-visao-sync
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const LOG_DIR = path.join(BACKEND, 'logs');
const PID_FILE = path.join(LOG_DIR, 'visao-mirror-full.pid');
const LATEST_PTR = path.join(LOG_DIR, 'visao-mirror-full-latest.txt');

fs.mkdirSync(LOG_DIR, { recursive: true });

function has(flag) {
    return process.argv.includes(flag);
}

function killOrphans() {
    try {
        // Solo perfiles Puppeteer (no el Chrome del usuario).
        execSync('pkill -f "puppeteer_dev_chrome_profile" || true', { stdio: 'ignore' });
    } catch {
        /* ignore */
    }
    try {
        execSync('pkill -f "node scripts/run-sync.js --full" || true', { stdio: 'ignore' });
    } catch {
        /* ignore */
    }
}

function readAlivePid() {
    try {
        if (!fs.existsSync(PID_FILE)) return null;
        const pid = Number(String(fs.readFileSync(PID_FILE, 'utf8')).trim());
        if (!Number.isFinite(pid) || pid <= 0) return null;
        process.kill(pid, 0);
        return pid;
    } catch {
        return null;
    }
}

const existing = readAlivePid();
if (existing && !has('--restart')) {
    console.error(`Ya hay un mirror vivo (PID ${existing}). Usá --restart para matarlo y relanzar.`);
    process.exit(1);
}

console.log('[daemon] limpiando Chrome Puppeteer huérfanos + sync viejos…');
killOrphans();
// Dar tiempo a que mueran
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);

const ts = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
const logRel = `logs/visao-mirror-full-${stamp}.log`;
const logAbs = path.join(BACKEND, logRel);
fs.writeFileSync(LATEST_PTR, logRel + '\n');

const forceImages = !has('--no-force-images');
const syncArgs = [
    'scripts/run-sync.js',
    '--full',
    '--cleanup-missing',
    '--detail-concurrency=3',
    '--persist-concurrency=6',
    '--listing-concurrency=1',
    '--no-export-frontend'
];
if (forceImages || has('--force-reimport-images')) {
    if (!syncArgs.includes('--force-reimport-images')) syncArgs.push('--force-reimport-images');
}
if (has('--no-force-images')) {
    const i = syncArgs.indexOf('--force-reimport-images');
    if (i >= 0) syncArgs.splice(i, 1);
}

const outFd = fs.openSync(logAbs, 'a');
fs.writeSync(
    outFd,
    `Daemon start ${ts.toISOString()}\nargs: node ${syncArgs.join(' ')}\n\n`
);

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const env = {
    ...process.env,
    PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH || chromePath
};

// caffeinate evita sleep de macOS; detached+unref despega del proceso padre (Cursor).
const child = spawn('caffeinate', ['-dimsu', 'node', ...syncArgs], {
    cwd: BACKEND,
    env,
    detached: true,
    stdio: ['ignore', outFd, outFd]
});

fs.writeFileSync(PID_FILE, String(child.pid) + '\n');
child.unref();

console.log(`[daemon] PID ${child.pid}`);
console.log(`[daemon] LOG ${logAbs}`);
console.log('[daemon] Monitor:');
console.log('  npm run watch-visao-sync');
console.log('  tail -f ' + logAbs);
process.exit(0);
