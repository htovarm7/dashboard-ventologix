#!/bin/bash

LOGDIR="/home/hector_tovar/Ventologix/logs"
LOGFILE="$LOGDIR/tarea_date_$(date +%F).log"
PYTHON_SCRIPT="/home/hector_tovar/Ventologix/scripts/selectDateToSend.py"
VENV="/home/hector_tovar/Ventologix/vento/bin/activate"
VENTO_DIR="/home/hector_tovar/Ventologix"
SCRIPTS_DIR="$VENTO_DIR/scripts"

mkdir -p $LOGDIR

echo "==== Tarea selectDateToSend iniciada: $(date) ====" >> $LOGFILE

wait_for_port() {
  local host=$1
  local port=$2
  local retries=30
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

# Levantar API
cd $SCRIPTS_DIR
source $VENV
export PYTHONPATH=/home/hector_tovar/Ventologix
uvicorn scripts.api_server:app >> $LOGFILE 2>&1 &
API_PID=$!
echo "API iniciada con PID $API_PID" >> $LOGFILE

# Esperar a que la API esté lista
if ! wait_for_port 127.0.0.1 8000; then
  echo "No se pudo levantar API, abortando." >> $LOGFILE
  kill $API_PID
  deactivate
  exit 1
fi

# Levantar web
cd $VENTO_DIR
npm run dev >> $LOGFILE 2>&1 &
WEB_PID=$!
echo "Web iniciada con PID $WEB_PID" >> $LOGFILE

# Esperar a que el frontend esté listo (puerto 3002)
if ! wait_for_port 127.0.0.1 3002; then
  echo "No se pudo levantar web, abortando." >> $LOGFILE
  kill $WEB_PID
  kill $API_PID
  deactivate
  exit 1
fi

# Ejecutar script Python (interactivo)
echo "Ejecutando selectDate.py..." >> $LOGFILE
python $PYTHON_SCRIPT
echo "selectDate.py finalizado" >> $LOGFILE

# Cerrar procesos
kill $WEB_PID 2>/dev/null
echo "Web cerrada (PID $WEB_PID)" >> $LOGFILE
kill $API_PID 2>/dev/null
echo "API cerrada (PID $API_PID)" >> $LOGFILE

deactivate
echo "Entorno virtual desactivado" >> $LOGFILE

# Borrar logs antiguos (>10 días)
find $LOGDIR -type f -name "tarea_date_*.log" -mtime +10 -exec rm {} \;
echo "Logs antiguos eliminados" >> $LOGFILE

echo "==== Tarea selectDate finalizada: $(date) ====" >> $LOGFILE
