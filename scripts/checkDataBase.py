from fastapi import FastAPI, Query, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse

import mysql.connector
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import smtplib
from email.message import EmailMessage
import time

# Load environment variables
load_dotenv()

# Database connection details
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

alias_name = "VTO LOGIX"
smtp_from = "andres.mirazo@ventologix.com"
smtp_password = os.getenv("SMTP_PASSWORD")  # Usa variable de entorno para la contraseña
smtp_server = "smtp.gmail.com"
smtp_port = 587

admin_correos = [
    "hector.tovar@ventologix.com",
    "andres.mirazo@ventologix.com"
]

# Inicializar FastAPI (opcional si quieres montar como endpoint)
app = FastAPI()

# Permitir CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def send_emergency_email(subject, body):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = admin_correos
    msg.set_content(body)

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_from, smtp_password)
            server.send_message(msg)
        print("Correo de emergencia enviado.")
    except Exception as e:
        print(f"Error enviando correo: {e}")

def check_data():
    try:
        # Conexión a la base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        now = datetime.now()
        previous_hour = now - timedelta(hours=1)
         
        prev_hour_str = previous_hour.strftime('%H:%M:%S')
        current_hour_str = now.strftime('%H:%M:%S')

        query = """
        SELECT COUNT(*) FROM pruebas
        WHERE TIME(time) BETWEEN %s AND %s
        """

        cursor.execute(query, (prev_hour_str, current_hour_str))

        result = cursor.fetchone()

        if result[0] == 0:
            # Si no hay datos, enviar correo de emergencia
            subject = "🚨 Alerta: No se recibieron datos en 'pruebas'"
            body = f"No se encontraron registros en la tabla 'pruebas' entre {prev_hour_str} y {current_hour_str}."
            send_emergency_email(subject, body)
        else:
            print(f"Se encontraron {result[0]} registros en el rango.")

    except mysql.connector.Error as err:
        print(f"Error en base de datos: {err}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Si quieres correrlo como script standalone
while True:
    check_data()
    time.sleep(1800)  # Espera 300 segundos (5 minutos)