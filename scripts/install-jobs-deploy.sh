#!/usr/bin/env bash
# Idempotente: POST /deploy + persistencia de jobs PDF en disco.
set -euo pipefail
export JOBS_SERVER="${1:-/root/zenn/jobs-api/server.js}"
export DEPLOY_SCRIPT="${JOBS_DEPLOY_SCRIPT:-/root/zenn/scripts/vps-deploy.sh}"

if [ ! -f "$JOBS_SERVER" ]; then
  echo "No existe $JOBS_SERVER" >&2
  exit 1
fi

node <<'NODE'
const fs = require('fs');
const file = process.env.JOBS_SERVER;
const deployScript = process.env.DEPLOY_SCRIPT;
let s = fs.readFileSync(file, 'utf8');
let changed = false;

if (!s.includes("catalogPdfJobStore")) {
  if (!s.includes("const pdfJobs = new Map();")) {
    console.error('No encontré const pdfJobs = new Map() para persistir jobs');
  } else {
    s = s.replace(
      "const pdfJobs = new Map();",
      "const { catalogPdfJobs: pdfJobs } = fromBackend('services/catalogPdfJobStore');"
    );
    changed = true;
    console.log('OK: pdfJobs persiste en disco');
  }
} else {
  console.log('OK: pdfJobs ya persiste en disco');
}

if (!s.includes("app.post('/deploy'")) {
  if (!s.includes("child_process")) {
    if (!s.includes("const crypto = require('crypto');")) {
      console.error('No encontré crypto require en server.js');
      process.exit(1);
    }
    s = s.replace(
      "const crypto = require('crypto');",
      "const crypto = require('crypto');\nconst { spawn } = require('child_process');"
    );
  }
  const hook = `
  app.post('/deploy', requireSecret, (req, res) => {
    const script = process.env.JOBS_DEPLOY_SCRIPT || ${JSON.stringify(deployScript)};
    const fs = require('fs');
    if (!fs.existsSync(script)) {
      return res.status(500).json({ ok: false, error: 'No existe ' + script });
    }
    res.status(202).json({ ok: true, accepted: true, message: 'Deploy encolado' });
    setTimeout(() => {
      const child = spawn('bash', [script], { detached: true, stdio: 'ignore', env: process.env });
      child.unref();
      console.log('[jobs-api] deploy lanzado', script);
    }, 400);
  });
`;
  const needle = "  app.get('/', (_req, res) => {";
  if (!s.includes(needle)) {
    console.error("No encontré app.get('/') en server.js");
    process.exit(1);
  }
  s = s.replace(needle, hook + '\n' + needle);
  changed = true;
  console.log('OK: /deploy insertado');
} else {
  console.log('OK: /deploy ya existe');
}

if (changed) fs.writeFileSync(file, s);
NODE
