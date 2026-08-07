#!/usr/bin/env bash
#
# Espejo Visão VIP: scrapea visao.com.py y COMPARA con MongoDB (no borra productos).
#
# Endpoint:
#   GET /api/test-routes/visaovip-catalog?persist=1&mirrorSync=1&full=1&cleanupMissingStock=1
#
# Qué hace:
#   - Lee el catálogo en Visão (menú + PDPs)
#   - Si el SKU ya está en DB → actualiza precio, nombre, descripción, specs, imágenes, stock=1
#   - Si el SKU es nuevo en Visão → lo crea
#   - Si un producto visao_vip NO apareció en este scrape → stock=0 (sigue en DB, no se elimina)
#
# Qué NO hace:
#   - NO usa resetCatalog (no pone stock 0 a todo el catálogo al inicio)
#   - NO elimina documentos de la colección products
#   - NO toca productos que no sean syncSource visao_vip en el cleanup de stock
#
# Uso:
#   ./scripts/visao-mirror-update.sh              # primer plano
#   ./scripts/visao-mirror-update.sh --background # segundo plano
#
# Requisitos: backend corriendo (npm start), internet estable, varias horas.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

PORT="${VISAO_MIRROR_PORT:-8080}"
BASE_URL="${VISAO_MIRROR_BASE_URL:-http://127.0.0.1:${PORT}}"
LOG_DIR="${VISAO_MIRROR_LOG_DIR:-$BACKEND_DIR/logs}"
PID_FILE="$LOG_DIR/visao-mirror-update.pid"

QUERY="persist=1&mirrorSync=1&full=1&cleanupMissingStock=1"
ENDPOINT="${BASE_URL}/api/test-routes/visaovip-catalog?${QUERY}"

mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${VISAO_MIRROR_LOG_FILE:-$LOG_DIR/visao-mirror-update-${TS}.log}"

BACKGROUND=false
if [[ "${1:-}" == "--background" ]] || [[ "${1:-}" == "-b" ]]; then
  BACKGROUND=true
fi

check_backend() {
  if ! curl -sS --connect-timeout 5 --max-time 10 "${BASE_URL}/api/test-routes/ping" >/dev/null 2>&1; then
    echo "❌ El backend no responde en ${BASE_URL}"
    echo "   Levantalo primero: cd backend && npm start"
    exit 1
  fi
}

run_mirror() {
  {
    echo "=========================================="
    echo "Visão mirror update — inicio: $(date -Iseconds)"
    echo "Endpoint: ${ENDPOINT}"
    echo "=========================================="
    echo ""
    caffeinate -dimsu curl -sS --fail --max-time 0 "${ENDPOINT}"
    echo ""
    echo "=========================================="
    echo "Fin OK: $(date -Iseconds)"
    echo "=========================================="
  } 2>&1
}

if [[ "$BACKGROUND" == true ]]; then
  if [[ -f "$PID_FILE" ]]; then
    OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
      echo "⚠️  Ya hay un mirror corriendo (PID $OLD_PID)."
      echo "   Log: tail -f $LOG_DIR/visao-mirror-update-*.log"
      exit 1
    fi
  fi

  check_backend
  echo "🚀 Mirror en segundo plano → $LOG_FILE"

  (
    export VISAO_MIRROR_LOG_FILE="$LOG_FILE"
    export VISAO_MIRROR_BASE_URL="$BASE_URL"
    run_mirror >>"$LOG_FILE" 2>&1
    rm -f "$PID_FILE"
  ) &

  echo $! >"$PID_FILE"
  echo "✅ PID $(cat "$PID_FILE")"
  echo "   Seguir: tail -f \"$LOG_FILE\""
  exit 0
fi

echo "🔄 Espejo completo Visão VIP"
echo "   Log: $LOG_FILE"
echo "   Duración estimada: varias horas"
echo ""

check_backend
run_mirror | tee -a "$LOG_FILE"

echo ""
echo "✅ Terminado. Log: $LOG_FILE"
