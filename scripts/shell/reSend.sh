#!/bin/bash

LOGDIR="/home/hector_tovar/Ventologix/logs"
LOGFILE="$LOGDIR/tarea_$(date +%F).log"
PYTHON_SCRIPT="/home/hector_tovar/Ventologix/scripts/reSendReports.py"
VENV="/home/hector_tovar/Ventologix/vento/bin/activate"
VENTO_DIR="/home/hector_tovar/Ventologix"
SCRIPTS_DIR="$VENTO_DIR/scripts"

mkdir -p $LOGDIR

echo "==== Tarea iniciada: $(date) ====" >> $LOGFILE

# Activar entorno virtual
echo "Activando entorno virtual..." >> $LOGFILE
source $VENV
echo "Entorno virtual activado" >> $LOGFILE

wait_for_port() {
  local host=$1
  local port=$2
  local retries=30
  local wait=2
  echo "Verificando conexión a $host:$port..." >> $LOGFILE
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

# Verificar que la API esté corriendo (no la levantamos, solo verificamos)
echo "Verificando que la API esté disponible en puerto 8000..." >> $LOGFILE
if ! wait_for_port 127.0.0.1 8000; then
  echo "ERROR: La API no está disponible en puerto 8000. Asegúrate de que esté corriendo." >> $LOGFILE
  echo "Abortando ejecución." >> $LOGFILE
  deactivate
  exit 1
fi
echo "API detectada y disponible en puerto 8000" >> $LOGFILE

# Levantar web (frontend)
echo "Iniciando frontend..." >> $LOGFILE
cd $VENTO_DIR
npm run dev >> $LOGFILE 2>&1 &
WEB_PID=$!
echo "Web iniciada con PID $WEB_PID" >> $LOGFILE

# Esperar a que el frontend esté listo (puerto 3002)
echo "Verificando que el frontend esté disponible en puerto 3002..." >> $LOGFILE
if ! wait_for_port 127.0.0.1 3002; then
  echo "ERROR: No se pudo levantar web en puerto 3002." >> $LOGFILE
  if [ ! -z "$WEB_PID" ]; then
    kill $WEB_PID 2>/dev/null
    echo "Proceso web terminado (PID $WEB_PID)" >> $LOGFILE
  fi
  deactivate
  exit 1
fi
echo "Frontend disponible en puerto 3002" >> $LOGFILE

# Ejecutar script Python (interactivo)
echo "==== Iniciando ejecución del script Python ====" >> $LOGFILE
echo "Ejecutando: $PYTHON_SCRIPT" >> $LOGFILE
cd $SCRIPTS_DIR
python $PYTHON_SCRIPT 2>&1 | tee -a $LOGFILE
PYTHON_EXIT_CODE=${PIPESTATUS[0]}
echo "==== Script Python finalizado con código: $PYTHON_EXIT_CODE ====" >> $LOGFILE

# Cerrar procesos
echo "==== Limpieza de procesos ====" >> $LOGFILE
if [ ! -z "$WEB_PID" ]; then
  kill $WEB_PID 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "Web cerrada correctamente (PID $WEB_PID)" >> $LOGFILE
  else
    echo "Web ya estaba cerrada o no se pudo cerrar (PID $WEB_PID)" >> $LOGFILE
  fi
fi

echo "Desactivando entorno virtual..." >> $LOGFILE
deactivate
echo "Entorno virtual desactivado" >> $LOGFILE

# Borrar logs antiguos (>10 días)
echo "Limpiando logs antiguos..." >> $LOGFILE
DELETED_LOGS=$(find $LOGDIR -type f -name "tarea_*.log" -mtime +10 2>/dev/null)
if [ ! -z "$DELETED_LOGS" ]; then
  echo "Logs eliminados: $DELETED_LOGS" >> $LOGFILE
  find $LOGDIR -type f -name "tarea_*.log" -mtime +10 -exec rm {} \;
else
  echo "No hay logs antiguos para eliminar" >> $LOGFILE
fi

echo "==== Tarea finalizada: $(date) ====" >> $LOGFILE
echo "Código de salida del script Python: $PYTHON_EXIT_CODE" >> $LOGFILE
