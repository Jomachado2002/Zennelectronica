const WorkerSettings = require('../models/workerSettingsModel');
const WorkerLog = require('../models/workerLogModel');

const TZ = 'America/Asuncion';

function zonedParts(date, tz = TZ) {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const p = Object.fromEntries(
    dtf.formatToParts(date).filter((x) => x.type !== 'literal').map((x) => [x.type, x.value])
  );
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
  };
}

function asuncionLocalToUtc(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0));
}

function computeNextRun(settings, from = new Date()) {
  const intervalHours = Math.min(168, Math.max(1, Number(settings.intervalHours) || 24));
  const runHour = Math.min(23, Math.max(0, Number(settings.runHour) || 0));
  const runMinute = Math.min(59, Math.max(0, Number(settings.runMinute) || 0));
  const now = zonedParts(from);
  let candidate = asuncionLocalToUtc(now.year, now.month, now.day, runHour, runMinute);
  const step = intervalHours * 60 * 60 * 1000;
  while (candidate.getTime() <= from.getTime()) {
    candidate = new Date(candidate.getTime() + step);
  }
  return candidate;
}

async function getSettings() {
  let doc = await WorkerSettings.findOne({ key: 'vision-worker' });
  if (!doc) {
    doc = await WorkerSettings.create({
      key: 'vision-worker',
      enabled: false,
      timezone: TZ,
      runHour: 3,
      runMinute: 0,
      intervalHours: 24,
      profitMargin: 27,
      deliveryCost: 30000,
      cleanupMissingStock: true,
    });
  }
  return doc;
}

async function saveSettings(patch = {}) {
  const doc = await getSettings();
  const fields = [
    'enabled',
    'runHour',
    'runMinute',
    'intervalHours',
    'profitMargin',
    'deliveryCost',
    'cleanupMissingStock',
    'runRequested',
    'runQuick',
  ];
  for (const k of fields) {
    if (patch[k] !== undefined) doc[k] = patch[k];
  }
  doc.nextRunAt = doc.enabled ? computeNextRun(doc) : null;
  await doc.save();
  return doc;
}

async function requestRun({ quick = false } = {}) {
  if (await isRunning()) {
    const err = new Error('Ya hay una corrida en curso');
    err.statusCode = 409;
    throw err;
  }
  const log = await WorkerLog.create({
    status: 'queued',
    trigger: quick ? 'quick' : 'manual',
    label: quick ? 'Prueba rápida (en cola)' : 'Corrida manual (en cola)',
    startedAt: new Date(),
    events: [
      {
        at: new Date(),
        level: 'info',
        message: quick
          ? 'Pedido de prueba rápida. Esperando a jobs-api…'
          : 'Pedido de corrida. Esperando a jobs-api…',
      },
    ],
  });
  const doc = await getSettings();
  doc.runRequested = true;
  doc.runQuick = Boolean(quick);
  doc.pendingLogId = log._id;
  await doc.save();
  return { settings: doc, log };
}

async function consumeRunRequest() {
  const doc = await getSettings();
  if (!doc.runRequested) return null;
  const payload = {
    quick: Boolean(doc.runQuick),
    logId: doc.pendingLogId,
  };
  doc.runRequested = false;
  doc.runQuick = false;
  doc.pendingLogId = null;
  await doc.save();
  return payload;
}

async function startLog({ trigger, label, logId }) {
  if (logId) {
    await WorkerLog.updateOne(
      { _id: logId },
      {
        $set: { status: 'running', label, trigger, startedAt: new Date() },
        $push: { events: { at: new Date(), level: 'info', message: `jobs-api inició (${label})` } },
      }
    );
    return WorkerLog.findById(logId);
  }
  return WorkerLog.create({
    status: 'running',
    trigger,
    label,
    startedAt: new Date(),
    events: [{ at: new Date(), level: 'info', message: `Inicio (${label})` }],
  });
}

async function finishLog(logId, payload) {
  if (!logId) return null;
  const taxonomy = payload.taxonomy || [];
  const categoriesCount = taxonomy.length;
  const subcategoriesCount = taxonomy.reduce((n, c) => n + (c.subcategories || []).length, 0);
  const summary = {
    ...(payload.summary || {}),
    categoriesCount,
    subcategoriesCount,
  };
  await WorkerLog.updateOne(
    { _id: logId },
    {
      $set: {
        status: payload.status,
        finishedAt: new Date(),
        durationMs: payload.durationMs,
        summary,
        taxonomy,
        errorMessage: payload.errorMessage || null,
      },
      $push: {
        events: {
          at: new Date(),
          level: payload.status === 'success' ? 'info' : 'error',
          message: payload.errorMessage || 'Corrida finalizada',
        },
      },
    }
  );
  const settings = await getSettings();
  settings.lastRunAt = new Date();
  settings.lastStatus = payload.status;
  if (settings.enabled) settings.nextRunAt = computeNextRun(settings);
  await settings.save();
  return WorkerLog.findById(logId).lean();
}

async function listLogs(limit = 50) {
  return WorkerLog.find({}).sort({ startedAt: -1 }).limit(Math.min(100, Math.max(1, limit))).lean();
}

async function requestCancel() {
  const doc = await getSettings();
  doc.cancelRequested = true;
  if (doc.runRequested && doc.pendingLogId) {
    await WorkerLog.updateOne(
      { _id: doc.pendingLogId, status: { $in: ['queued', 'running'] } },
      {
        $set: {
          status: 'cancelled',
          finishedAt: new Date(),
          errorMessage: 'Cancelado desde el admin (no llegó a iniciar)',
        },
      }
    );
    doc.runRequested = false;
    doc.runQuick = false;
    doc.pendingLogId = null;
  }
  await doc.save();
  return doc;
}

async function clearCancelFlag() {
  await WorkerSettings.updateOne({ key: 'vision-worker' }, { $set: { cancelRequested: false } });
}

async function getActiveLog() {
  return WorkerLog.findOne({ status: { $in: ['queued', 'running'] } }).sort({ startedAt: -1 }).lean();
}

async function isRunning() {
  const staleMs = 8 * 60 * 60 * 1000;
  const log = await WorkerLog.findOne({ status: { $in: ['queued', 'running'] } }).sort({ startedAt: -1 });
  if (!log) return false;
  if (Date.now() - new Date(log.startedAt).getTime() > staleMs) {
    log.status = 'error';
    log.errorMessage = 'Corrida abandonada (timeout 8h)';
    log.finishedAt = new Date();
    await log.save();
    return false;
  }
  return true;
}

function getPricingFromDoc(doc) {
  const deliveryRaw = Number(doc?.deliveryCost);
  const deliveryCost = Number.isFinite(deliveryRaw) && deliveryRaw >= 0 ? deliveryRaw : 30000;
  const marginRaw = Number(doc?.profitMargin);
  const profitMargin =
    Number.isFinite(marginRaw) && marginRaw > 0 && marginRaw < 100 ? marginRaw : 27;
  return {
    deliveryCost,
    profitMargin,
    visaoDivisor: Math.round((1 - profitMargin / 100) * 100) / 100,
  };
}

async function getPricingSettings() {
  const doc = await getSettings();
  return getPricingFromDoc(doc);
}

module.exports = {
  TZ,
  computeNextRun,
  getSettings,
  getPricingSettings,
  getPricingFromDoc,
  saveSettings,
  requestRun,
  consumeRunRequest,
  startLog,
  finishLog,
  listLogs,
  isRunning,
  requestCancel,
  clearCancelFlag,
  getActiveLog,
};
