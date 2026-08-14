#!/usr/bin/env bash
# Crontab 03:00 Asunción ≈ 06:00 UTC:
#   0 6 * * * WORKER_SECRET=xxx /var/www/zenn/jobs-api/scripts/cron-daily.sh

set -euo pipefail
BASE_URL="${WORKER_BASE_URL:-http://127.0.0.1:8787}"
SECRET="${WORKER_SECRET:?Definí WORKER_SECRET}"
LOG_DIR="${WORKER_LOG_DIR:-$(dirname "$0")/../logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/jobs-daily-$(date +%Y%m%d).log"

{
  echo "==== $(date -Iseconds) POST /run ===="
  curl -sS -X POST "${BASE_URL}/run" \
    -H "X-Worker-Key: ${SECRET}" \
    -H "Content-Type: application/json" \
    --max-time 30
  echo
} >> "$LOG_FILE" 2>&1
