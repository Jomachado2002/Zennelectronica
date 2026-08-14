#!/usr/bin/env bash
# Diagnóstico VPS zenn-jobs. Pegar como root en el VPS.
# No imprime secretos ni la URI de Mongo.
set -u

ZENN_ROOT="${ZENN_ROOT:-/root/zenn}"
JOBS_DIR="${JOBS_DIR:-$ZENN_ROOT/jobs-api}"
ENV_FILE="${JOBS_DIR}/.env"
LOCK="${TMPDIR:-/tmp}/zenn-catalog-pdf.lock"
PDF_DIR="${TMPDIR:-/tmp}/zenn-catalog-pdf"
LOG="${JOBS_DEPLOY_LOG:-$ZENN_ROOT/logs/jobs-deploy.log}"

ok() { echo "  [OK] $*"; }
bad() { echo "  [FAIL] $*"; }
info() { echo "  [..] $*"; }

echo "========== $(date -Iseconds) diagnose zenn-jobs =========="
echo

echo "== 1. Sistema =="
info "host=$(hostname)  kernel=$(uname -r)"
info "uptime: $(uptime)"
df -h / | sed 's/^/  /'
free -h | sed 's/^/  /'
echo

echo "== 2. PM2 zenn-jobs =="
if command -v pm2 >/dev/null 2>&1; then
  pm2 describe zenn-jobs 2>/dev/null | sed -n '1,40p' | sed 's/^/  /' || bad "pm2 describe zenn-jobs falló"
  STATUS=$(pm2 jlist 2>/dev/null | node -e '
    let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>{
      try {
        const a=JSON.parse(d);
        const p=a.find(x=>x.name==="zenn-jobs");
        if(!p){ console.log("MISSING"); process.exit(0); }
        console.log([p.pm2_env.status, p.pm2_env.restart_time, p.pid, p.pm2_env.exec_mode].join(" "));
      } catch(e){ console.log("PARSE_ERR"); }
    });
  ' 2>/dev/null || true)
  info "status restarts pid mode: ${STATUS:-no-json}"
  echo "${STATUS:-}" | grep -q '^online ' && ok "proceso online" || bad "zenn-jobs no está online"
else
  bad "pm2 no está instalado"
fi
echo

echo "== 3. Puerto 8787 =="
if ss -lntp 2>/dev/null | grep -q ':8787'; then
  ok "escucha :8787"
  ss -lntp | grep ':8787' | sed 's/^/  /'
else
  bad "nada escucha en :8787"
fi
echo

echo "== 4. Health local y público =="
LOCAL=$(curl -sS --max-time 5 http://127.0.0.1:8787/health || echo '{"ok":false}')
echo "  local: $LOCAL"
echo "$LOCAL" | grep -q '"ok":true' && ok "health local" || bad "health local"
PUB=$(curl -sS --max-time 8 https://jobs.zenn.com.py/health || echo '{"ok":false}')
echo "  public: $PUB"
echo "$PUB" | grep -q '"ok":true' && ok "health público" || bad "health público (nginx/dns/ssl)"
if echo "$LOCAL" | grep -q '"scrapeRunning":true'; then
  bad "hay un scrape Visão en curso (Chrome ocupado; el PDF espera o falla 409)"
else
  ok "no hay scrape en curso"
fi
echo

echo "== 5. Ruta / y /deploy =="
ROOT=$(curl -sS --max-time 5 http://127.0.0.1:8787/ || true)
echo "  / => $ROOT"
echo "$ROOT" | grep -q 'catalog-pdf' && ok "API jobs responde" || info "GET / no lista catalog-pdf (puede ser normal)"
# OPTIONS/POST deploy sin secret debe ser 401, no 404
CODE=$(curl -sS -o /tmp/zenn-diag-deploy.body -w '%{http_code}' --max-time 8 -X POST http://127.0.0.1:8787/deploy || echo '000')
BODY=$(cat /tmp/zenn-diag-deploy.body 2>/dev/null || true)
info "POST /deploy sin clave => HTTP $CODE  body=${BODY:0:120}"
if [ "$CODE" = "404" ]; then
  bad "Cannot POST /deploy: el proceso no tiene la ruta (server.js viejo)"
elif [ "$CODE" = "401" ] || [ "$CODE" = "202" ]; then
  ok "POST /deploy existe ($CODE)"
else
  info "POST /deploy HTTP $CODE (revisar)"
fi
echo

echo "== 6. .env jobs-api (sin secretos) =="
if [ -f "$ENV_FILE" ]; then
  ok "existe $ENV_FILE"
  grep -E '^(WORKER_PORT|WORKER_SECRET|MONGODB_URI|PUPPETEER_EXECUTABLE_PATH|JOBS_DEPLOY_SCRIPT)=' "$ENV_FILE" \
    | sed -E 's/^(WORKER_SECRET|MONGODB_URI)=.*/\1=***oculto***/' \
    | sed 's/^/  /'
  grep -q '^WORKER_SECRET=.\+' "$ENV_FILE" && ok "WORKER_SECRET definido" || bad "falta WORKER_SECRET"
  grep -q '^MONGODB_URI=.\+' "$ENV_FILE" && ok "MONGODB_URI definido" || bad "falta MONGODB_URI"
else
  bad "no existe $ENV_FILE"
fi
echo

echo "== 7. Chrome / Puppeteer =="
CHROME_ENV=""
if [ -f "$ENV_FILE" ]; then
  CHROME_ENV=$(grep '^PUPPETEER_EXECUTABLE_PATH=' "$ENV_FILE" | cut -d= -f2- || true)
fi
for c in \
  "$CHROME_ENV" \
  /usr/bin/google-chrome-stable \
  /usr/bin/google-chrome \
  /usr/bin/chromium-browser \
  /usr/bin/chromium
do
  [ -z "$c" ] && continue
  if [ -x "$c" ]; then
    ok "chrome: $c"
    "$c" --version 2>/dev/null | sed 's/^/  /' || true
    FOUND_CHROME=1
    break
  fi
done
[ "${FOUND_CHROME:-0}" = "1" ] || bad "no hay binario de Chrome/Chromium (el PDF no puede arrancar)"
CHROME_N=$(pgrep -af 'chrome|chromium|puppeteer' 2>/dev/null | wc -l | tr -d ' ')
info "procesos chrome/chromium/puppeteer: $CHROME_N"
if [ "${CHROME_N:-0}" -gt 20 ]; then
  bad "demasiados Chrome; posible colgado. Ver: pgrep -af chrome"
  pgrep -af 'chrome|chromium' | head -20 | sed 's/^/  /'
fi
echo

echo "== 8. Locks y jobs PDF en disco =="
if [ -f "$LOCK" ]; then
  bad "LOCK presente $LOCK (PDF a medias o colgado). edad: $(stat -c %y "$LOCK" 2>/dev/null || stat -f %Sm "$LOCK")"
  echo "    si lleva >5 min: rm -f $LOCK"
else
  ok "no hay lock de PDF"
fi
if [ -d "$PDF_DIR" ]; then
  info "archivos en $PDF_DIR:"
  ls -lt "$PDF_DIR" 2>/dev/null | head -15 | sed 's/^/  /'
  JSON_N=$(ls "$PDF_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
  PDF_N=$(ls "$PDF_DIR"/*.pdf 2>/dev/null | wc -l | tr -d ' ')
  info "json=$JSON_N  pdf=$PDF_N"
  if [ "$JSON_N" -gt 0 ]; then
    echo "  últimos estados:"
    for f in $(ls -t "$PDF_DIR"/*.json 2>/dev/null | head -5); do
      node -e 'const j=require(process.argv[1]); console.log("   ", j.id, j.status, j.error||j.progress||"");' "$f" 2>/dev/null \
        || echo "   (no parseó $f)"
    done
  fi
else
  info "no existe $PDF_DIR (aún no se generó un PDF con persistencia)"
fi
echo

echo "== 9. Código en $ZENN_ROOT =="
if [ -d "$ZENN_ROOT/.git" ]; then
  git -C "$ZENN_ROOT" log -1 --oneline | sed 's/^/  HEAD /'
  git -C "$ZENN_ROOT" status -sb | sed 's/^/  /'
  if grep -q 'catalogPdfJobStore' "$JOBS_DIR/server.js" 2>/dev/null; then
    ok "jobs-api usa persistencia de jobs en disco"
  elif grep -q 'const pdfJobs = new Map' "$JOBS_DIR/server.js" 2>/dev/null; then
    bad "jobs-api TODAVÍA usa Map() en RAM: un restart borra el job (404 Job no encontrado)"
  else
    info "no pude detectar pdfJobs en $JOBS_DIR/server.js"
  fi
  grep -q "app.post('/deploy'" "$JOBS_DIR/server.js" 2>/dev/null \
    && ok "server.js tiene POST /deploy" \
    || bad "server.js no tiene POST /deploy"
  [ -f "$ZENN_ROOT/backend/services/catalogPdfJobStore.js" ] \
    && ok "existe backend/services/catalogPdfJobStore.js" \
    || bad "falta catalogPdfJobStore.js (git pull incompleto)"
else
  bad "no es un repo git: $ZENN_ROOT"
fi
echo

echo "== 10. Logs =="
if [ -f "$LOG" ]; then
  info "últimas líneas $LOG:"
  tail -25 "$LOG" | sed 's/^/  /'
else
  info "no hay $LOG"
fi
echo "  pm2 logs zenn-jobs (err+out, 30 líneas):"
pm2 logs zenn-jobs --lines 30 --nostream 2>/dev/null | tail -40 | sed 's/^/  /' || true
echo

echo "== 11. Mongo rápido (sin imprimir URI) =="
if [ -f "$ENV_FILE" ] && command -v node >/dev/null 2>&1; then
  ( cd "$JOBS_DIR" && ENV_FILE="$ENV_FILE" node -e '
    const fs = require("fs");
    const env = fs.readFileSync(process.env.ENV_FILE, "utf8");
    const uri = (env.split("\n").find((l) => l.startsWith("MONGODB_URI=")) || "").slice(12).trim();
    if (!uri) { console.log("  [FAIL] sin MONGODB_URI"); process.exit(0); }
    let mongoose;
    try { mongoose = require("mongoose"); }
    catch (e) { console.log("  [FAIL] no hay mongoose en jobs-api"); process.exit(0); }
    mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 }).then(() => {
      console.log("  [OK] Mongo conecta");
      return mongoose.disconnect();
    }).catch((e) => { console.log("  [FAIL] Mongo:", e.message); process.exit(0); });
  ' )
else
  info "salteo ping Mongo"
fi
echo

echo "========== fin diagnose =========="
echo "Lectura rápida:"
echo "  - health local+público OK y PM2 online => VPS vivo; el 404 de job era código (Map en RAM) o un restart."
echo "  - LOCK colgado >5 min => rm -f $LOCK y pm2 restart zenn-jobs"
echo "  - Chrome ausente o cientos de procesos => el PDF revienta por infra, no por el front."
echo "  - scrapeRunning true => no generes PDF hasta que termine el Visão."
