import requests
from email.message import EmailMessage
import smtplib
from apscheduler.schedulers.blocking import BlockingScheduler
import json

# Obtiene lista de usuarios desde tu API
def obtener_usuarios():
    response = requests.get("http://127.0.0.1:8000/reporte/reporte/id_clientes")
    return json.loads(response.text)

# Obtiene link del PDF desde la API de generación de PDF
def obtener_link_pdf(id_cliente):
    response = requests.get(f"http://127.0.0.1:8001/generar-pdf/{id_cliente}")
    return response.json().get("pdf_url")

# Envía email con link al PDF
def enviar_email(destinatario, asunto, cuerpo):
    email = EmailMessage()
    email['From'] = 'tucorreo@gmail.com'
    email['To'] = destinatario
    email['Subject'] = asunto
    email.set_content(cuerpo)

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login('tucorreo@gmail.com', 'tu_contraseña_app')
        smtp.send_message(email)

# Proceso completo
def enviar_reportes():
    raw_data = obtener_usuarios()
    usuarios = [
        {
            "id_cliente": item["id_cliente"],
            "nombre": item["nombre_cliente"],
            "email": item["email"]  # Asegúrate que tu API lo tenga
        }
        for item in raw_data.get("data", [])
    ]

    for usuario in usuarios:
        print(f"Generando reporte para {usuario['nombre']}")
        link_pdf = obtener_link_pdf(usuario['id_cliente'])
        cuerpo = f"Hola {usuario['nombre']},\n\nAquí tienes tu reporte:\n{link_pdf}"
        enviar_email(usuario['email'], 'Tu reporte mensual', cuerpo)

# Scheduler: todos los días a las 8:00 am
scheduler = BlockingScheduler()
scheduler.add_job(enviar_reportes, 'cron', hour=8, minute=0)
scheduler.start()
