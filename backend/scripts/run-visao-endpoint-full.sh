#!/usr/bin/env bash
set -euo pipefail

cd "/Users/josiasnicolas02gmail.com/Documents/Zennelectronica/backend"

TS="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/visao-full-$TS.log"
mkdir -p "$LOG_DIR"

ENDPOINT="http://localhost:8080/api/test-routes/visaovip-catalog?persist=1&mirrorSync=1&full=1&cleanupMissingStock=1"

echo "Iniciando espejo completo Visao..."
echo "Log: $LOG_FILE"
echo "Endpoint: $ENDPOINT"

# Mantiene el Mac despierto mientras corre el curl
caffeinate -dimsu bash -c "
  curl -sS --fail --max-time 0 \"$ENDPOINT\"
" | tee "$LOG_FILE"

echo "Proceso finalizado. Revisá: $LOG_FILE"
