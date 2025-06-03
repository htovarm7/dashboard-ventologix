#!/bin/bash

LOGDIR="/home/hector_tovar/Ventologix/logs"
LOGFILE="$LOGDIR/tarea_$(date +%F).log"
PYTHON_SCRIPT="/home/hector_tovar/Ventologix/scripts/testSendPdfs.py"
VENV="/home/hector_tovar/Ventologix/vento/bin/activate"
VENTO_DIR="/home/hector_tovar/Ventologix"

mkdir -p $LOGDIR

echo "==== Tarea iniciada: $(date) ====" >> $LOGFILE

# Levantar API
cd $VENTO_DIR
source $VENV

# Ir a raíz del proyecto
cd $VENTO_DIR

# Matar procesos previos en los puertos
fuser -k 8000/tcp || true
fuser -k 3000/tcp || true

# Levantar API
uvicorn scripts.api_server:app &
API_PID=$!
echo "API iniciada con PID $API_PID" >> $LOGFILE

# Levantar web
npm run dev &
WEB_PID=$!
echo "Web iniciada con PID $WEB_PID" >> $LOGFILE

# Ejecutar Python (espera el frontend con Playwright internamente)
echo "Ejecutando script Python..." >> $LOGFILE
python $PYTHON_SCRIPT >> $LOGFILE 2>&1
echo "Script Python finalizado" >> $LOGFILE

# Cerrar procesos
if ps -p $WEB_PID > /dev/null; then
  kill $WEB_PID
  echo "Web cerrada (PID $WEB_PID)" >> $LOGFILE
else
  echo "Web no estaba corriendo" >> $LOGFILE
fi

if ps -p $API_PID > /dev/null; then
  kill $API_PID
  echo "API cerrada (PID $API_PID)" >> $LOGFILE
else
  echo "API no estaba corriendo" >> $LOGFILE
fi

deactivate
echo "Entorno virtual desactivado" >> $LOGFILE

# Borrar logs antiguos (>10 días)
find $LOGDIR -type f -name "tarea_*.log" -mtime +10 -exec rm {} \;
echo "Logs antiguos eliminados" >> $LOGFILE

echo "==== Tarea finalizada: $(date) ====" >> $LOGFILE
