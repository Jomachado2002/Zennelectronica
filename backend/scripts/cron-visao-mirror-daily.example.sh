#!/usr/bin/env bash
# Ejemplo: job diario (cron / systemd timer) — mirror completo Visao + cleanup stock.
# Ajustá BASE_URL y credenciales si protegés la ruta. El JSON incluye mirrorSummary.updatesByChangedField
# (conteo por campo: productName, description, sellingPrice, etc.) para alertas o logs.

set -euo pipefail
BASE_URL="${VISAO_MIRROR_BASE_URL:-http://127.0.0.1:8080}"
LOG_DIR="${VISAO_MIRROR_LOG_DIR:-$(dirname "$0")/../logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/visao-mirror-daily-$(date +%Y%m%d-%H%M%S).log"

QUERY="persist=1&mirrorSync=1&full=1&cleanupMissingStock=1"
curl -sS --fail --max-time 0 "${BASE_URL}/api/test-routes/visaovip-catalog?${QUERY}" | tee "$LOG_FILE"
