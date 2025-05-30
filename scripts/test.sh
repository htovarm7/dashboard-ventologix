#!/bin/bash

# Definir ruta de logs y nombre de archivo
LOGDIR="/home/hector_tovar/Ventologix/logs"
LOGFILE="$LOGDIR/tarea_$(date +%F).log"

# Crear carpeta de logs si no existe
mkdir -p $LOGDIR

echo "==== Tarea iniciada: $(date) ====" >> $LOGFILE

# Iniciar la web
cd /home/hector_tovar/Ventologix/
npm run dev &
WEB_PID=$!
echo "Web iniciada con PID $WEB_PID" >> $LOGFILE

# Activar entorno virtual
source /home/hector_tovar/Ventologix/vento/bin/activate
echo "Entorno virtual activado" >> $LOGFILE

# Iniciar la API
cd /home/hector_tovar/Ventologix/scripts/
uvicorn scripts.api_server:app --reload &
API_PID=$!
echo "API iniciada con PID $API_PID" >> $LOGFILE

# Esperar a que la API esté disponible (máximo 60 segundos)
for i in {1..60}
do
  if curl -s http://127.0.0.1:8000/docs > /dev/null
  then
    echo "API disponible después de $i segundos" >> $LOGFILE
    break
  else
    echo "Esperando API... ($i s)" >> $LOGFILE
    sleep 1
  fi
done

# Ejecutar el script de generación de PDFs
python /home/hector_tovar/Ventologix/scripts/testSendPdfs.py >> $LOGFILE 2>&1
echo "Script de PDF ejecutado" >> $LOGFILE

# Cerrar procesos de web y API
kill $WEB_PID
echo "Web cerrada (PID $WEB_PID)" >> $LOGFILE

kill $API_PID
echo "API cerrada (PID $API_PID)" >> $LOGFILE

# Desactivar entorno virtual
deactivate
echo "Entorno virtual desactivado" >> $LOGFILE

echo "==== Tarea finalizada: $(date) ====" >> $LOGFILE
