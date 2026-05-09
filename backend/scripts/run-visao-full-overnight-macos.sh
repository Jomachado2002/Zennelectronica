#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Borra todo el catálogo local (products + categorías) y ejecuta mirror Visão
# completo. En macOS usa `caffeinate` para intentar que el equipo no suspenda.
#
# Uso (recomendado: Mac enchufado al cargador, tapa abierta si notaste suspensiones):
#   chmod +x scripts/run-visao-full-overnight-macos.sh
#   cd /ruta/Zennelectronica/backend
#   ./scripts/run-visao-full-overnight-macos.sh
#
# Con opciones extra (ej. paralelismo, stock):
#   ./scripts/run-visao-full-overnight-macos.sh --persist-concurrency=10 --cleanup-missing
#
# Misma seguridad que el script Node:
#   CONFIRM_VISAO_FULL_PURGE=yes (se exporta automáticamente aquí).
# -----------------------------------------------------------------------------
set -euo pipefail
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$(cd "$SCRIPT_DIR/.." && pwd)"
mkdir -p "$BACKEND/logs"
LOG="$BACKEND/logs/visao-purge-full-$(date +%Y%m%d-%H%M%S).log"
LIVE_LOG="$BACKEND/logs/visao-purge-full-live.log"
BACKEND_DEFAULT_LOG="$BACKEND/logs/visao-full-migration.log"

if ! command -v caffeinate >/dev/null 2>&1; then
    echo "[err] Este script está pensado para macOS (falta 'caffeinate')."
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Visão VIP — PURGE Mongo + reconstrucción completa del espejo"
echo "  Directorio: $BACKEND"
echo "  Log:        $LOG"
echo "  Live log:   $LIVE_LOG"
echo "  Backend log:$BACKEND_DEFAULT_LOG"
echo ""
echo "  • Conectá el cargador durante la madrugada (recomendado)."
echo "  • caffeinate -dim evita sueño por disco/display/inactividad aun en batería."
echo "  • NO cierra esta terminal hasta que termine."
echo ""
echo "  ⚠ Este proceso BORRA productos y categorías en esta base (ver visao-purge-and-full-mirror.js)."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# -d  evita que la pantalla duerma
# -i  evita sleep por inactividad del sistema (útil durante crawls largos)
# -m  evita que el disco idle duerma
# Nota: NO usamos -s para que siga activo también si se desenchufa el cargador.
caffeinate -dim -- bash -c '
  set -euo pipefail
  cd "$1"
  export CONFIRM_VISAO_FULL_PURGE=yes
  shift
  exec node scripts/visao-purge-and-full-mirror.js --confirm-purge "$@"
' bash "$BACKEND" "$@" 2>&1 | tee "$LOG" "$LIVE_LOG" "$BACKEND_DEFAULT_LOG"

echo ""
echo "Listo. Revisá el log: $LOG"
