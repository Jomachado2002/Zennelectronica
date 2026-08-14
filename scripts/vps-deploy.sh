#!/usr/bin/env bash
# Actualiza /root/zenn (repo Zennelectronica) y reinicia zenn-jobs.
set -euo pipefail

ZENN_ROOT="${ZENN_ROOT:-/root/zenn}"
JOBS_DIR="${JOBS_DIR:-$ZENN_ROOT/jobs-api}"
LOG="${JOBS_DEPLOY_LOG:-$ZENN_ROOT/logs/jobs-deploy.log}"
mkdir -p "$(dirname "$LOG")"

{
  echo "========== $(date -Iseconds) deploy =========="
  cd "$ZENN_ROOT"
  git fetch origin
  git pull --ff-only origin main || git pull --ff-only origin master

  # jobs-api es un repo aparte; no hace falta pull para deploy de Zennelectronica.
  # Para actualizarlo: JOBS_API_PULL=1 en el .env del worker.
  if [ "${JOBS_API_PULL:-0}" = "1" ] && [ -d "$JOBS_DIR/.git" ]; then
    echo ">> pull jobs-api (repo anidado)"
    cd "$JOBS_DIR"
    git fetch origin || true
    git pull --ff-only origin main || git pull --ff-only origin master || true
    cd "$ZENN_ROOT"
  else
    echo ">> skip pull jobs-api (usa el código local del VPS)"
  fi

  if [ -x "$ZENN_ROOT/scripts/install-jobs-deploy.sh" ]; then
    echo ">> asegurar POST /deploy en jobs-api"
    bash "$ZENN_ROOT/scripts/install-jobs-deploy.sh" || true
  fi

  LOCK="${TMPDIR:-/tmp}/zenn-catalog-pdf.lock"
  if [ -f "$LOCK" ]; then
    echo ">> skip pm2 restart: hay un PDF en curso (el job queda en disco)"
  else
    echo ">> pm2 restart zenn-jobs"
    pm2 restart zenn-jobs --update-env
  fi
  sleep 6
  curl -sS --max-time 10 http://127.0.0.1:8787/health || true
  echo ""
  echo "========== fin $(date -Iseconds) =========="
} >>"$LOG" 2>&1
