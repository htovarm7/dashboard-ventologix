#!/bin/bash

VENV="/home/hector_tovar/Ventologix/vento/bin/activate"
PYTHON_SCRIPT="/home/hector_tovar/Ventologix/scripts/VM/whatsapp.py"
export RECIPIENTS_JSON="/home/hector_tovar/Ventologix/data/recipients.json"
LOG_FILE="/home/hector_tovar/Ventologix/logs/sendWp.log"

{
    echo "[$(date)] --- Script iniciado ---"
    source $VENV
    python $PYTHON_SCRIPT
    STATUS=$?
    deactivate
    echo "[$(date)] --- Script finalizado con código $STATUS ---"
} >> "$LOG_FILE" 2>&1
