#!/bin/bash

LOGDIR="/home/hector_tovar/Ventologix/logs"
LOGFILE="$LOGDIR/tarea_$(date +%F).log"
PYTHON_SCRIPT="/home/hector_tovar/Ventologix/scripts/VM/automation.py"
VENV="/home/hector_tovar/Ventologix/vento/bin/activate"
VENTO_DIR="/home/hector_tovar/Ventologix"

mkdir -p $LOGDIR

echo "==== Tarea iniciada: $(date) ====" >> $LOGFILE

wait_for_port() {
  local host=$1
  local port=$2
  local retries=15
  local wait=2
  for i in $(seq 1 $retries); do
    if nc -z $host $port; then
      echo "$(date '+%T') $host:$port está listo" >> $LOGFILE
      return 0
    fi
    echo "$(date '+%T') Esperando $host:$port... intento $i/$retries" >> $LOGFILE
    sleep $wait
  done
  echo "$(date '+%T') Timeout esperando $host:$port" >> $LOGFILE
  return 1
}

# Asegurarse de que no haya nada ocupando 3000
EXISTING_PID=$(lsof -ti :3000)
if [ -n "$EXISTING_PID" ]; then
  echo "Matando procesos en puerto 3000: $EXISTING_PID" >> $LOGFILE
  kill -9 $EXISTING_PID
fi

# Activar entorno virtual
source $VENV

# Levantar frontend temporalmente
cd $VENTO_DIR
npm run dev &
WEB_PID=$!
echo "Frontend iniciado con PID $WEB_PID" >> $LOGFILE

# Esperar a que esté listo en 3000
if ! wait_for_port 127.0.0.1 3000; then
  echo "No se pudo levantar frontend, abortando." >> $LOGFILE
  kill -9 $WEB_PID
  deactivate
  exit 1
fi

# Ejecutar Python (usa Playwright que depende del frontend)
echo "Ejecutando script Python..." >> $LOGFILE
export RECIPIENTS_JSON="/home/hector_tovar/Ventologix/data/recipients.json"
python $PYTHON_SCRIPT >> $LOGFILE 2>&1
echo "Script Python finalizado" >> $LOGFILE

# Cerrar frontend
kill -9 $WEB_PID
echo "Frontend cerrado (PID $WEB_PID)" >> $LOGFILE

# Desactivar venv
deactivate
echo "Entorno virtual desactivado" >> $LOGFILE

# Borrar logs antiguos (>5 días)
find "$LOGDIR" -type f -name "tarea_*.log" -mtime +5 -exec rm {} \;
echo "Logs antiguos eliminados" >> $LOGFILE

echo "==== Tarea finalizada: $(date) ====" >> $LOGFILE
