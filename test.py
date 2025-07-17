import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

load_dotenv()

# Configuración
smtp_server = "smtp.gmail.com"
smtp_port = 587
smtp_user = "andres.mirazo@ventologix.com"       # Cambia esto
smtp_password = os.getenv("SMTP_PASSWORD")     # Usa una contraseña de aplicación si usas Gmail

remitente = smtp_user
destinatarios = ['andres.mirazo@ventologix.com', 'octavio.murillo@ventologix.coms']  # Cambia estos correos

# Archivos a enviar
ruta_pdfs = '/home/hector_tovar/Ventologix/pdfs'
archivos = [
    'Reporte Diario Daltile ACM-0002 2025-07-16.pdf',
    'Reporte Diario Daltile ACM-0004 2025-07-16.pdf',
    'Reporte Diario Daltile ACM-0005 2025-07-16.pdf',
    'Reporte Diario Daltile ACM-0006 2025-07-16.pdf'
]

# Crear mensaje
msg = EmailMessage()
msg['Subject'] = 'Reportes diarios Daltile - 2025-07-16'
msg['From'] = remitente
msg['To'] = ', '.join(destinatarios)
msg.set_content('Adjunto los reportes diarios.')

# Adjuntar PDFs
for nombre_archivo in archivos:
    ruta = os.path.join(ruta_pdfs, nombre_archivo)
    with open(ruta, 'rb') as f:
        data = f.read()
        msg.add_attachment(data, maintype='application', subtype='pdf', filename=nombre_archivo)

# Enviar correo
with smtplib.SMTP(smtp_server, smtp_port) as smtp:
    smtp.starttls()
    smtp.login(smtp_user, smtp_password)
    smtp.send_message(msg)

print("Correo enviado con éxito.")
