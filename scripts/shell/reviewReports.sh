#!/usr/bin/env bash
set -Eeuo pipefail

# ========= Config =========
VENTO_DIR="/home/hector_tovar/Ventologix"
SCRIPTS_DIR="$VENTO_DIR/scripts"
PYTHON_SCRIPT="$SCRIPTS_DIR/reviewReports.py"
VENV="$VENTO_DIR/vento/bin/activate"

# Puertos y hosts (puedes sobreescribir con variables de entorno)
API_HOST="127.0.0.1"
API_PORT="${API_PORT:-8000}"

WEB_HOST="127.0.0.1"
WEB_PORT="${WEB_PORT:-3002}"

# Modo del frontend: dev (npm run dev) o start (npm start)
WEB_MODE="${WEB_MODE:-dev}"

# Logs
LOGDIR="$VENTO_DIR/logs"
mkdir -p "$LOGDIR" || true
# No forzamos chmod aquí para evitar errores por propiedad del directorio
TIMESTAMP="$(date +%F_%H-%M-%S)"
LOGFILE="$LOGDIR/tarea_${TIMESTAMP}.log"

# ========= Utilidades =========
log() {
  printf '%s %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOGFILE"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "ERROR: comando requerido no encontrado: $1"
    exit 1
  fi
}

wait_for_port() {
  local host=$1 port=$2 retries=${3:-60} wait=${4:-2}
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
  set +e

  if [[ -n "${WEB_PID:-}" ]] && kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
    wait "$WEB_PID" 2>/dev/null || true
    log "Web cerrada (PID $WEB_PID)"
  fi

  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
    log "API cerrada (PID $API_PID)"
  fi

  if type deactivate >/dev/null 2>&1; then
    deactivate
    log "Entorno virtual desactivado"
  fi

  # Borrar logs antiguos (>10 días) silenciosamente
  find "$LOGDIR" -type f -name "tarea_*.log" -mtime +10 -exec rm -f {} \; 2>/dev/null || true
  log "Logs antiguos eliminados (si aplicó)"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# ========= Inicio =========
log "==== Tarea iniciada ===="

# Chequeos que no dependen del venv
require_cmd nc
require_cmd nohup
require_cmd bash
require_cmd npm

# Activar venv y preparar entorno Python
# shellcheck disable=SC1090
source "$VENV"
export PYTHONPATH="$VENTO_DIR"
require_cmd python

# ========= Levantar API (Uvicorn) =========
cd "$SCRIPTS_DIR"
log "Levantando API en $API_HOST:$API_PORT ..."
nohup python -m uvicorn scripts.api_server:app --host "$API_HOST" --port "$API_PORT" >> "$LOGFILE" 2>&1 &
API_PID=$!
log "API iniciada con PID $API_PID"

if ! wait_for_port "$API_HOST" "$API_PORT" 60 2; then
  log "ERROR: No se pudo levantar API; abortando."
  exit 1
fi

# ========= Levantar Web (Next.js) =========
cd "$VENTO_DIR"
if [[ "$WEB_MODE" == "start" ]]; then
  # Producción: requiere que previamente se haya corrido `npm run build`
  WEB_CMD="npm start -- -p ${WEB_PORT}"
  log "Levantando Web (Next.js) en modo start (producción) puerto $WEB_PORT ..."
else
  # Desarrollo: respeta PORT
  WEB_CMD="PORT=${WEB_PORT} npm run dev"
  log "Levantando Web (Next.js) en modo dev puerto $WEB_PORT ..."
fi

# Ejecutar el comando en una subshell de bash
nohup bash -lc "$WEB_CMD" >> "$LOGFILE" 2>&1 &
WEB_PID=$!
log "Web iniciada con PID $WEB_PID"

if ! wait_for_port "$WEB_HOST" "$WEB_PORT" 90 2; then
  log "ERROR: No se pudo levantar Web; abortando."
  exit 1
fi

# ========= Ejecutar script Python principal =========
log "Ejecutando script Python: $PYTHON_SCRIPT $*"
# Pasamos todos los argumentos al script Python, por si los usas
python "$PYTHON_SCRIPT" "$@" >> "$LOGFILE" 2>&1
SCRIPT_EXIT=$?
log "Script Python finalizado (exit=$SCRIPT_EXIT)"

log "==== Tarea finalizada ===="
exit "$SCRIPT_EXIT"
