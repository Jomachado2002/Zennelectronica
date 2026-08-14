'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DIR = path.join(os.tmpdir(), 'zenn-catalog-pdf');

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true });
}

function metaPath(id) {
  return path.join(DIR, `${id}.json`);
}

function pdfPath(id) {
  return path.join(DIR, `${id}.pdf`);
}

function writeMeta(rec) {
  ensureDir();
  const payload = {
    id: rec.id,
    status: rec.status,
    progress: rec.progress || null,
    error: rec.error || null,
    fileName: rec.fileName || null,
    filePath: rec.filePath || pdfPath(rec.id),
    createdAt: rec.createdAt,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(metaPath(rec.id), JSON.stringify(payload));
}

function readMeta(id) {
  const file = metaPath(id);
  if (!fs.existsSync(file)) return null;
  try {
    const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
    rec.filePath = rec.filePath || pdfPath(id);
    return rec;
  } catch {
    return null;
  }
}

function markInterrupted(rec) {
  rec.status = 'error';
  rec.error = 'jobs-api se reinició mientras se generaba el PDF. Volvé a generar.';
  rec.progress = rec.error;
  writeMeta(rec);
  return rec;
}

class CatalogPdfJobStore {
  constructor() {
    this.mem = new Map();
    this._recover();
  }

  _recover() {
    ensureDir();
    let files = [];
    try {
      files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
    } catch {
      return;
    }
    for (const f of files) {
      const id = f.replace(/\.json$/, '');
      const rec = readMeta(id);
      if (!rec) continue;
      if (rec.status === 'running') {
        if (fs.existsSync(pdfPath(id))) {
          rec.status = 'ready';
          rec.progress = rec.progress || 'Listo';
          writeMeta(rec);
        } else {
          markInterrupted(rec);
        }
      }
      this.mem.set(id, rec);
    }
  }

  set(id, rec) {
    rec.id = rec.id || id;
    rec.filePath = rec.filePath || pdfPath(id);
    this.mem.set(id, rec);
    writeMeta(rec);
    return this;
  }

  get(id) {
    if (this.mem.has(id)) return this.mem.get(id);
    const rec = readMeta(id);
    if (rec) {
      this.mem.set(id, rec);
      return rec;
    }
    if (fs.existsSync(pdfPath(id))) {
      const recFromFile = {
        id,
        status: 'ready',
        progress: 'Listo',
        error: null,
        fileName: `catalogo-${id}.pdf`,
        filePath: pdfPath(id),
        createdAt: new Date().toISOString(),
      };
      this.mem.set(id, recFromFile);
      return recFromFile;
    }
    return undefined;
  }
}

const catalogPdfJobs = new CatalogPdfJobStore();

module.exports = {
  catalogPdfJobs,
  PDF_JOB_DIR: DIR,
  pdfPath,
};
