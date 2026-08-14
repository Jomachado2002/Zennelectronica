'use strict';

/**
 * API externa (VPS): worker Visão + catálogo PDF.
 * No es el backend de la tienda. Arranque: npm start (desde esta carpeta).
 */

require('./backendLib');
require('dotenv').config();

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { fromBackend } = require('./backendLib');
const connectDB = fromBackend('config/db');
const { syncVisionVipMirrorToMongo } = fromBackend('services/visionVipSyncService');
const { generateCatalogPdfBuffer } = fromBackend('controller/product/catalogController');
const { setActiveLog, requestLocalCancel, captureConsole } = fromBackend('services/workerLiveLog');
const {
  buildTaxonomyBreakdown,
  sendWorkerReportEmail,
} = require('./services/workerReportService');
const {
  getSettings,
  startLog,
  finishLog,
  consumeRunRequest,
  clearCancelFlag,
} = require('./services/workerControlService');

const PORT = parseInt(process.env.WORKER_PORT || process.env.PORT || '8787', 10);
const SECRET = process.env.WORKER_SECRET || '';
const PDF_DIR = path.join(os.tmpdir(), 'zenn-catalog-pdf');

function truthy(v) {
  return v === '1' || v === 'true' || v === 'yes';
}

function parseMs(name, def) {
  const n = parseInt(process.env[name] || String(def), 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

function requireSecret(req, res, next) {
  if (!SECRET) {
    return res.status(500).json({ ok: false, error: 'WORKER_SECRET no está configurado.' });
  }
  const header = req.get('x-worker-key') || '';
  const bearer = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const query = req.query.key || '';
  if ((header || bearer || query) !== SECRET) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }
  next();
}

async function buildMirrorOpts({ quick }) {
  const settings = await getSettings();
  const opts = {
    resetCatalog: false,
    persistConcurrency: 6,
    mirrorScrapeOpts: {
      maxListings: null,
      singlePageListing: false,
      maxProductUrls: null,
      detailConcurrency: 3,
      listingConcurrency: 1,
    },
    deliveryCost: Number(settings.deliveryCost) > 0 ? Number(settings.deliveryCost) : 30000,
    profitMargin: Math.min(100, Math.max(1, Number(settings.profitMargin) || 20)),
    cleanupMissingStock: settings.cleanupMissingStock !== false,
    mirrorStrict: true,
    mirrorPrune: true,
    exportFrontendProductCategoryJs: false,
    forceReimportImages: true,
  };
  if (quick) {
    opts.mirrorScrapeOpts.maxListings = 3;
    opts.mirrorScrapeOpts.maxProductUrls = 8;
    opts.mirrorScrapeOpts.singlePageListing = true;
    opts.mirrorScrapeOpts.detailConcurrency = 2;
    opts.mirrorScrapeOpts.listingConcurrency = 1;
    opts.persistConcurrency = 6;
    opts.cleanupMissingStock = false;
    opts.mirrorPrune = false;
    opts.forceReimportImages = false;
  }
  return opts;
}

const scrapeJob = {
  running: false,
  startedAt: null,
  finishedAt: null,
  lastLabel: null,
  lastError: null,
  lastSummary: null,
  lastDurationMs: null,
  lastTaxonomy: null,
};

const pdfJobs = new Map();

async function runMirror(label, { quick, trigger = 'manual', logId = null }) {
  if (scrapeJob.running) {
    return { started: false, skipped: true, reason: 'Ya hay una corrida en curso' };
  }
  scrapeJob.running = true;
  scrapeJob.startedAt = new Date().toISOString();
  scrapeJob.finishedAt = null;
  scrapeJob.lastLabel = label;
  scrapeJob.lastError = null;
  const t0 = Date.now();
  const log = await startLog({
    trigger: quick ? 'quick' : trigger,
    label: `${label}${quick ? ' (quick)' : ''}`,
    logId,
  });
  scrapeJob.logId = log._id;
  setActiveLog(log._id);
  const restoreConsole = captureConsole();
  console.log(`[jobs-api][${label}] inicio ${scrapeJob.startedAt}${quick ? ' (quick)' : ' (FULL = run-sync --full)'}`);
  const cancelPoll = setInterval(() => {
    getSettings()
      .then((s) => {
        if (s.cancelRequested) requestLocalCancel();
      })
      .catch(() => {});
  }, 2000);

  try {
    const report = await syncVisionVipMirrorToMongo(await buildMirrorOpts({ quick }));
    const wallMs = Date.now() - t0;
    const s = report.mirrorSummary || {};
    const breakdown = await buildTaxonomyBreakdown(report.persistResults || []);
    scrapeJob.lastDurationMs = wallMs;
    scrapeJob.lastSummary = {
      productsCreated: s.productsCreated,
      productsUpdated: s.productsUpdated,
      productsSkipped: s.productsSkipped,
      productsErrors: s.productsErrors,
      stockCleanupCount: report.stockCleanupCount ?? 0,
    };
    scrapeJob.lastTaxonomy = breakdown.taxonomy;
    scrapeJob.finishedAt = new Date().toISOString();
    await finishLog(log._id, {
      status: 'success',
      durationMs: wallMs,
      summary: scrapeJob.lastSummary,
      taxonomy: breakdown.taxonomy,
    });
    await sendWorkerReportEmail({
      ok: true,
      label,
      durationMs: wallMs,
      summary: scrapeJob.lastSummary,
      taxonomy: breakdown.taxonomy,
      stockCleanupCount: scrapeJob.lastSummary.stockCleanupCount,
    });
    return { started: true, skipped: false, durationMs: wallMs, summary: scrapeJob.lastSummary };
  } catch (err) {
    const cancelled = err && err.code === 'WORKER_CANCELLED';
    scrapeJob.lastError = err && err.message ? err.message : String(err);
    scrapeJob.lastDurationMs = Date.now() - t0;
    scrapeJob.finishedAt = new Date().toISOString();
    await finishLog(log._id, {
      status: cancelled ? 'cancelled' : 'error',
      durationMs: scrapeJob.lastDurationMs,
      summary: scrapeJob.lastSummary,
      taxonomy: scrapeJob.lastTaxonomy,
      errorMessage: scrapeJob.lastError,
    }).catch(() => {});
    if (!cancelled) {
      await sendWorkerReportEmail({
        ok: false,
        label,
        durationMs: scrapeJob.lastDurationMs,
        summary: scrapeJob.lastSummary,
        taxonomy: scrapeJob.lastTaxonomy,
        errorMessage: scrapeJob.lastError,
      }).catch(() => {});
    }
    if (!cancelled) throw err;
    return { started: true, skipped: false, cancelled: true };
  } finally {
    clearInterval(cancelPoll);
    await restoreConsole();
    setActiveLog(null);
    await clearCancelFlag().catch(() => {});
    scrapeJob.running = false;
    scrapeJob.logId = null;
  }
}

function startDbSchedule() {
  console.log('[jobs-api] Poll Mongo 5s | Correr ahora = espejo FULL (run-sync --full)');
  const tick = () => {
    (async () => {
      if (scrapeJob.running) return;
      const requested = await consumeRunRequest();
      if (requested) {
        console.log('[jobs-api] Pedido admin tomado', requested.quick ? 'quick' : 'FULL');
        await runMirror(requested.quick ? 'manual-quick' : 'manual', {
          quick: requested.quick,
          trigger: requested.quick ? 'quick' : 'manual',
          logId: requested.logId,
        });
        return;
      }
      const s = await getSettings();
      if (!s.enabled || !s.nextRunAt) return;
      if (Date.now() >= new Date(s.nextRunAt).getTime()) {
        await runMirror('schedule', { quick: false, trigger: 'schedule' });
      }
    })().catch((err) => console.error('[jobs-api] tick', err.message));
  };
  tick();
  setInterval(tick, 5000);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('[jobs-api] Falta MONGODB_URI');
    process.exit(1);
  }
  fs.mkdirSync(PDF_DIR, { recursive: true });
  await connectDB();

  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Worker-Key, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      return res.sendStatus(204);
    }
    console.log(`[jobs-api] ${req.method} ${req.path}`);
    next();
  });
  app.use(express.json({ limit: '64kb' }));

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'zenn-jobs-api',
      scrapeRunning: scrapeJob.running,
      time: new Date().toISOString(),
    });
  });

  app.get('/status', requireSecret, async (_req, res) => {
    const settings = await getSettings();
    res.json({ ok: true, scrape: scrapeJob, settings });
  });

  app.post('/run', requireSecret, (req, res) => {
    const quick = truthy(req.query.quick);
    if (scrapeJob.running) {
      return res.status(409).json({
        ok: false,
        skipped: true,
        error: 'Ya hay una corrida en curso',
        startedAt: scrapeJob.startedAt,
      });
    }
    res.status(202).json({ ok: true, accepted: true, quick });
    runMirror(quick ? 'http-quick' : 'http-daily', {
      quick,
      trigger: quick ? 'quick' : 'manual',
    }).catch(() => {});
  });

  app.post('/catalog-pdf', requireSecret, (req, res) => {
    const jobId = crypto.randomUUID();
    const filePath = path.join(PDF_DIR, `${jobId}.pdf`);
    const rec = {
      id: jobId,
      status: 'running',
      error: null,
      fileName: null,
      filePath,
      createdAt: new Date().toISOString(),
    };
    pdfJobs.set(jobId, rec);
    res.status(202).json({ ok: true, jobId, status: 'running' });

    generateCatalogPdfBuffer({
      category: req.body?.category,
      subcategory: req.body?.subcategory,
      title: req.body?.title || 'Catálogo de Productos',
    })
      .then(({ buffer, fileName }) => {
        fs.writeFileSync(filePath, buffer);
        rec.status = 'ready';
        rec.fileName = fileName;
      })
      .catch((err) => {
        rec.status = 'error';
        rec.error = err.message || String(err);
      });
  });

  app.get('/catalog-pdf/:jobId', requireSecret, (req, res) => {
    const rec = pdfJobs.get(req.params.jobId);
    if (!rec) return res.status(404).json({ ok: false, error: 'Job no encontrado' });
    res.json({
      ok: true,
      jobId: rec.id,
      status: rec.status,
      error: rec.error,
      fileName: rec.fileName,
    });
  });

  app.get('/catalog-pdf/:jobId/file', requireSecret, (req, res) => {
    const rec = pdfJobs.get(req.params.jobId);
    if (!rec) return res.status(404).json({ ok: false, error: 'Job no encontrado' });
    if (rec.status !== 'ready') {
      return res.status(409).json({ ok: false, status: rec.status, error: rec.error || 'PDF no listo' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${rec.fileName || 'catalogo.pdf'}"`);
    fs.createReadStream(rec.filePath).pipe(res);
  });

  app.get('/', (_req, res) => {
    res.json({
      service: 'zenn-jobs-api',
      endpoints: [
        'GET /health',
        'POST /run',
        'GET /status',
        'POST /catalog-pdf',
      ],
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[jobs-api] escuchando :${PORT}`);
    startDbSchedule();
  });
}

main().catch((err) => {
  console.error('[jobs-api] fatal', err);
  process.exit(1);
});
