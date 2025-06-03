#!/bin/bash

LOGDIR="/home/hector_tovar/Ventologix/logs"
LOGFILE="$LOGDIR/tarea_$(date +%F).log"
PYTHON_SCRIPT="/home/hector_tovar/Ventologix/scripts/automation.py"
VENV="/home/hector_tovar/Ventologix/vento/bin/activate"
VENTO_DIR="/home/hector_tovar/Ventologix"
SCRIPTS_DIR="$VENTO_DIR/scripts"

mkdir -p $LOGDIR

echo "==== Tarea iniciada: $(date) ====" >> $LOGFILE

# Levantar API
cd $SCRIPTS_DIR
source $VENV
uvicorn scripts.api_server:app & 
API_PID=$!
echo "API iniciada con PID $API_PID" >> $LOGFILE

# Levantar web
cd $VENTO_DIR
npm run dev &
WEB_PID=$!
echo "Web iniciada con PID $WEB_PID" >> $LOGFILE

# Ejecutar Python (espera el frontend con Playwright internamente)
echo "Ejecutando script Python..." >> $LOGFILE
python $PYTHON_SCRIPT >> $LOGFILE 2>&1
echo "Script Python finalizado" >> $LOGFILE

# Cerrar procesos
kill $WEB_PID
echo "Web cerrada (PID $WEB_PID)" >> $LOGFILE
kill $API_PID
echo "API cerrada (PID $API_PID)" >> $LOGFILE

deactivate
echo "Entorno virtual desactivado" >> $LOGFILE

# Borrar logs antiguos (>10 días)
find $LOGDIR -type f -name "tarea_*.log" -mtime +10 -exec rm {} \;
echo "Logs antiguos eliminados" >> $LOGFILE

echo "==== Tarea finalizada: $(date) ====" >> $LOGFILE
