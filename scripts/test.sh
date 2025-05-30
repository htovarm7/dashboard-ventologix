#!/bin/bash

LOGDIR="/home/hector_tovar/Ventologix/logs"
LOGFILE="$LOGDIR/tarea_$(date +%F).log"
mkdir -p $LOGDIR

echo "==== Tarea iniciada: $(date) ====" >> $LOGFILE

# Ir a carpeta API y levantar API
cd /home/hector_tovar/Ventologix/scripts/
source /home/hector_tovar/Ventologix/vento/bin/activate
uvicorn scripts.api_server:app --reload &
API_PID=$!
echo "API iniciada con PID $API_PID" >> $LOGFILE

# Esperar que API esté lista en el endpoint real que usa python
for i in {1..60}; do
  if curl -s http://127.0.0.1:8000/report/clients-data > /dev/null; then
    echo "API disponible después de $i segundos" >> $LOGFILE
    break
  else
    echo "Esperando API... ($i s)" >> $LOGFILE
    sleep 1
  fi
done

# Ir a carpeta web y levantar web
cd /home/hector_tovar/Ventologix/
npm run dev &
WEB_PID=$!
echo "Web iniciada con PID $WEB_PID" >> $LOGFILE

# Esperar que web esté lista en el puerto esperado (3000 o 3002)
for i in {1..60}; do
  if curl -s http://localhost:3000 > /dev/null || curl -s http://localhost:3002 > /dev/null; then
    echo "Web disponible después de $i segundos" >> $LOGFILE
    break
  else
    echo "Esperando Web... ($i s)" >> $LOGFILE
    sleep 1
  fi
done

# Ejecutar script Python para generar PDFs
python /home/hector_tovar/Ventologix/scripts/testSendPdfs.py >> $LOGFILE 2>&1
echo "Script de PDF ejecutado" >> $LOGFILE

# Cerrar procesos web y API
kill $WEB_PID
echo "Web cerrada (PID $WEB_PID)" >> $LOGFILE

kill $API_PID
echo "API cerrada (PID $API_PID)" >> $LOGFILE

deactivate
echo "Entorno virtual desactivado" >> $LOGFILE
echo "==== Tarea finalizada: $(date) ====" >> $LOGFILE
