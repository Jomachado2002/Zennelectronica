#!/usr/bin/env bash
# Inserta POST /deploy en jobs-api/server.js del VPS (idempotente).
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
if (s.includes("app.post('/deploy'")) {
  console.log('OK: /deploy ya existe');
  process.exit(0);
}
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
fs.writeFileSync(file, s);
console.log('OK: /deploy insertado en', file);
NODE
