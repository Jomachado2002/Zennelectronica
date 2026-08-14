const WorkerLogLine = require('../models/workerLogLineModel');

let cancelFlag = false;
let activeLogId = null;
let buffer = [];
let flushing = false;

function setActiveLog(id) {
  activeLogId = id || null;
  cancelFlag = false;
  buffer = [];
}

function requestLocalCancel() {
  cancelFlag = true;
}

function isCancelled() {
  return cancelFlag;
}

function throwIfCancelled() {
  if (!cancelFlag) return;
  const err = new Error('Corrida cancelada desde el admin');
  err.code = 'WORKER_CANCELLED';
  throw err;
}

function stringifyArg(a) {
  if (a == null) return String(a);
  if (typeof a === 'string') return a;
  if (a instanceof Error) return a.message || String(a);
  try {
    return JSON.stringify(a);
  } catch {
    return String(a);
  }
}

function enqueue(level, args) {
  if (!activeLogId) return;
  const message = args.map(stringifyArg).join(' ').trim().slice(0, 4000);
  if (!message) return;
  buffer.push({ logId: activeLogId, at: new Date(), level, message });
  if (buffer.length >= 20) flushLiveLines().catch(() => {});
}

async function flushLiveLines() {
  if (flushing || buffer.length === 0) return;
  flushing = true;
  const batch = buffer.splice(0, 80);
  try {
    await WorkerLogLine.insertMany(batch, { ordered: false });
  } catch {
    /* no cortar el scrape por logs */
  } finally {
    flushing = false;
  }
}

function captureConsole() {
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  console.log = (...args) => {
    orig.log(...args);
    enqueue('info', args);
  };
  console.warn = (...args) => {
    orig.warn(...args);
    enqueue('warn', args);
  };
  console.error = (...args) => {
    orig.error(...args);
    enqueue('error', args);
  };
  const timer = setInterval(() => flushLiveLines().catch(() => {}), 800);
  return async () => {
    clearInterval(timer);
    console.log = orig.log;
    console.warn = orig.warn;
    console.error = orig.error;
    await flushLiveLines();
  };
}

async function listLiveLines(logId, afterId, limit = 150) {
  const q = { logId };
  if (afterId) q._id = { $gt: afterId };
  return WorkerLogLine.find(q).sort({ _id: 1 }).limit(Math.min(300, Math.max(1, limit))).lean();
}

module.exports = {
  setActiveLog,
  requestLocalCancel,
  isCancelled,
  throwIfCancelled,
  captureConsole,
  flushLiveLines,
  listLiveLines,
};
