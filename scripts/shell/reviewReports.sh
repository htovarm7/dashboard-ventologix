#!/usr/bin/env bash
set -Eeuo pipefail

# ========= Config =========
VENTO_DIR="/home/hector_tovar/Ventologix"
SCRIPTS_DIR="$VENTO_DIR/scripts"
PYTHON_SCRIPT="$SCRIPTS_DIR/reviewReports.py"
VENV="$VENTO_DIR/vento/bin/activate"

# Puertos (ajusta si cambian)
API_HOST="127.0.0.1"
API_PORT="${API_PORT:-8000}"
WEB_HOST="127.0.0.1"
WEB_PORT="${WEB_PORT:-3002}"

# Logs (en carpeta compartida entre usuarios)
LOGDIR="$VENTO_DIR/logs"
mkdir -p "$LOGDIR"
# asegurar permisos de grupo heredados si usas grupo compartido
chmod 2775 "$LOGDIR" || true

TIMESTAMP="$(date +%F_%H-%M-%S)"
LOGFILE="$LOGDIR/tarea_${TIMESTAMP}.log"

# ========= Utilidades =========
log() {
  # imprime a consola y a archivo
  printf '%s %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOGFILE"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "ERROR: comando requerido no encontrado: $1"
    exit 1
  fi
}

wait_for_port() {
  local host=$1 port=$2 retries=${3:-30} wait=${4:-2}
  for i in $(seq 1 "$retries"); do
    if nc -z "$host" "$port" >/dev/null 2>&1; then
      log "$host:$port está listo"
      return 0
    fi
    log "Esperando $host:$port... intento $i/$retries"
    sleep "$wait"
  done
  log "ERROR: Timeout esperando $host:$port"
  return 1
}

cleanup() {
  # se llama en EXIT por trap
  set +e
  if [[ -n "${WEB_PID:-}" ]]; then
    kill "$WEB_PID" 2>/dev/null || true
    wait "$WEB_PID" 2>/dev/null || true
    log "Web cerrada (PID $WEB_PID)"
  fi
  if [[ -n "${API_PID:-}" ]]; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
    log "API cerrada (PID $API_PID)"
  fi
  if type deactivate >/dev/null 2>&1; then
    deactivate
    log "Entorno virtual desactivado"
  fi
  # Borrar logs antiguos (>10 días)
  find "$LOGDIR" -type f -name "tarea_*.log" -mtime +10 -exec rm -f {} \; 2>/dev/null || true
  log "Logs antiguos eliminados (si aplicó)"
}
trap cleanup EXIT

# ========= Inicio =========
log "==== Tarea iniciada ===="

# Chequeos de dependencias
require_cmd nc
require_cmd python
require_cmd nohup
require_cmd bash
require_cmd npm

# Activar venv (contiene uvicorn y deps de Python)
# shellcheck disable=SC1090
source "$VENV"
export PYTHONPATH="$VENTO_DIR"

# Levantar API (Uvicorn)
cd "$SCRIPTS_DIR"
log "Levantando API en $API_HOST:$API_PORT ..."
nohup uvicorn scripts.api_server:app --host "$API_HOST" --port "$API_PORT" >> "$LOGFILE" 2>&1 &
API_PID=$!
log "API iniciada con PID $API_PID"

# Esperar API
if ! wait_for_port "$API_HOST" "$API_PORT" 60 2; then
  log "ERROR: No se pudo levantar API; abortando."
  exit 1
fi

# Levantar Web (Next.js)
cd "$VENTO_DIR"
# Forzar puerto del dev server (si tu package.json no lo fija)
log "Levantando Web (Next.js) en $WEB_HOST:$WEB_PORT ..."
PORT="$WEB_PORT" nohup npm run dev >> "$LOGFILE" 2>&1 &
WEB_PID=$!
log "Web iniciada con PID $WEB_PID"

# Esperar Web
if ! wait_for_port "$WEB_HOST" "$WEB_PORT" 90 2; then
  log "ERROR: No se pudo levantar Web; abortando."
  exit 1
fi

# Ejecutar script Python
log "Ejecutando script Python: $PYTHON_SCRIPT"
python "$PYTHON_SCRIPT" >> "$LOGFILE" 2>&1
log "Script Python finalizado (exit=$?)"

log "==== Tarea finalizada ===="
