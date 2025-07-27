"""
selectEmailtoSend.py

Script para generar y enviar reportes PDF diarios por correo electrónico
usando Playwright y configuración personalizada de destinatarios.

Autor: Hector 
Fecha: 2024-06
"""


from playwright.sync_api import sync_playwright
import requests
from datetime import datetime, timedelta
import json
import os
import smtplib
import time
from email.message import EmailMessage
from dotenv import load_dotenv
from email.utils import make_msgid

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Configuración general
downloads_folder = "pdfs"
alias_name = "VTO LOGIX"
smtp_from = "andres.mirazo@ventologix.com"
from_address = "vto@ventologix.com"
logo_path = "/home/hector_tovar/Ventologix/public/Logo vento firma.jpg"
ventologix_logo_path = "/home/hector_tovar/Ventologix/public/ventologix firma.jpg"
smtp_password = os.getenv("SMTP_PASSWORD")

smtp_server = "smtp.gmail.com"
smtp_port = 587

admin_correos = [
    "hector.tovar@ventologix.com",
    "andres.mirazo@ventologix.com"
]

# Fecha base de hoy
fecha_hoy = datetime.now()

# --- Función para obtener clientes desde API ---
def obtener_clientes_desde_api():
    response = requests.get("http://127.0.0.1:8000/report/clients-data")
    if response.status_code == 200:
        return response.json().get("data", [])
    else:
        print("Error al obtener datos de clientes")
        return []

# --- Función para generar PDF con Playwright ---
def generar_pdf_cliente(id_cliente, linea, nombre_cliente,alias):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 1920, "height": 1080})

        url = f"http://localhost:3002/reportesD?id_cliente={id_cliente}&linea={linea}"
        print(f"Abriendo URL: {url}")
        page.goto(url)

        fechaAyer = (fecha_hoy - timedelta(days=1)).strftime("%Y-%m-%d")
        print("Esperando que frontend avise que terminó de renderizar...")
        page.wait_for_function("window.status === 'pdf-ready'",timeout=300000)
        print("Frontend listo, generando PDF...")

        pdf_path = os.path.join(downloads_folder, f"Reporte Diario {nombre_cliente} {alias} {fechaAyer}.pdf")
        page.pdf(path=pdf_path, format="A2", print_background=True)
        browser.close()
        return pdf_path

def send_error_mail(missing_files, admin_emails):
    if not missing_files:
        return

    msg = EmailMessage()
    msg['From'] = f"{alias_name} <{from_address}>"
    msg['To'] = ", ".join(admin_emails)
    msg['Subject'] = "⚠️ Reporte - Archivos PDF no generados"

    body = "<p>No se encontraron los siguientes archivos PDF esperados:</p><ul>"
    for f in missing_files:
        body += f"<li>{f}</li>"
    body += "</ul><br>VTO logix"

    msg.set_content("Este mensaje requiere un cliente con soporte HTML.")
    msg.add_alternative(body, subtype='html')

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as smtp:
            smtp.starttls()
            smtp.login(smtp_from, smtp_password)
            smtp.send_message(msg)
        print(f"Correo de advertencia enviado a {', '.join(admin_emails)}")
    except Exception as e:
        print(f"Error al enviar correo de advertencia: {e}")

# --- Función para enviar correo ---
def send_mail(recipientConfig, pdf_file_path):
    msg = EmailMessage()
    msg['From'] = f"{alias_name} <{from_address}>"

    # Destinatarios
    if isinstance(recipientConfig['email'], list):
        msg['To'] = ", ".join(recipientConfig['email'])
    else:
        msg['To'] = recipientConfig['email']

    if 'cc' in recipientConfig and recipientConfig['cc']:
        if isinstance(recipientConfig['cc'], list):
            msg['Cc'] = ", ".join(recipientConfig['cc'])
        else:
            msg['Cc'] = recipientConfig['cc']

    bcc = []
    if 'bcc' in recipientConfig and recipientConfig['bcc']:
        if isinstance(recipientConfig['bcc'], list):
            bcc = recipientConfig['bcc']
        else:
            bcc = [recipientConfig['bcc']]

    msg['Subject'] = recipientConfig['emailSubject']

    logo_cid = make_msgid(domain='ventologix.com')
    ventologix_logo_cid = make_msgid(domain='ventologix.com')

    body = recipientConfig['emailBody'] + f"""
    <br><p><img src="cid:{logo_cid[1:-1]}" alt="Logo Ventologix" /></p>
    <p><img src="cid:{ventologix_logo_cid[1:-1]}" alt="Ventologix Firma" /></p>
    <br>VTO logix<br>
    <a href='mailto:vto@ventologix.com'>vto@ventologix.com</a><br>
    <a href='https://www.ventologix.com'>www.ventologix.com</a><br>
    """

    msg.set_content("Este mensaje requiere un cliente con soporte HTML.")
    msg.add_alternative(body, subtype='html')

    # Adjuntar imágenes
    for img_path, cid in [(logo_path, logo_cid), (ventologix_logo_path, ventologix_logo_cid)]:
        with open(img_path, 'rb') as img:
            img_data = img.read()
            maintype, subtype = 'image', 'jpeg'  # Cambia si no son jpeg
            msg.get_payload()[1].add_related(img_data, maintype=maintype, subtype=subtype, cid=cid)

    # Adjuntar PDF
    with open(pdf_file_path, 'rb') as pdf:
        pdf_data = pdf.read()
        msg.add_attachment(pdf_data, maintype='application', subtype='pdf', filename=os.path.basename(pdf_file_path))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as smtp:
            smtp.starttls()
            smtp.login(smtp_from, smtp_password)
            smtp.send_message(msg, to_addrs=[*msg['To'].split(','), *msg.get('Cc', '').split(','), *bcc])
        print(f"Correo enviado a {msg['To']}")
    except Exception as e:
        print(f"Error al enviar correo: {e}")

# --- Función principal que junta todo ---
def main():
    # Crear carpeta pdfs si no existe
    os.makedirs(downloads_folder, exist_ok=True)

    # Leer configuración destinatarios
    with open(os.path.join(os.path.dirname(BASE_DIR), "Destinatarios.json"), "r", encoding="utf-8-sig") as f:
        config = json.load(f)

    # Obtener clientes
    clientes = obtener_clientes_desde_api()
    if not clientes:
        print("No se encontraron clientes.")
        return

    # Mostrar clientes disponibles
    print("Clientes disponibles:")
    for idx, cliente in enumerate(clientes):
        print(f"{idx + 1}. {cliente['nombre_cliente']} (Alias: {cliente['alias']}, Línea: {cliente['linea']})")

    # Elegir cliente
    seleccion = int(input("Selecciona el número del cliente a generar PDF: ")) - 1
    if seleccion < 0 or seleccion >= len(clientes):
        print("Selección inválida.")
        return

    cliente = clientes[seleccion]
    id_cliente = cliente['id_cliente']
    nombre_cliente = cliente['nombre_cliente']
    alias = cliente['alias'].strip()

    # Preguntar línea
    linea = input(f"Ingrese la línea para {nombre_cliente} (valor por defecto: {cliente['linea']}): ") or cliente['linea']

    # Generar PDF
    try:
        print(f"Generando PDF para cliente {nombre_cliente}, línea {linea}")
        pdf_path = generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias)
    except Exception as e:
        print(f"Error generando PDF: {e}")
        return

    # Determinar destinatario
    fechaAyer = (fecha_hoy - timedelta(days=1)).strftime("%Y-%m-%d")
    pdf_name_expected = f"Reporte Diario {nombre_cliente} {alias} {fechaAyer}.pdf"

    destinatario_encontrado = False
    for recipient in config['recipients']:
        for fileConfig in recipient.get('files', []):
            expected_name = fileConfig['fileName'].replace("{fecha}", fechaAyer) + ".pdf"
            if expected_name == os.path.basename(pdf_path):
                send_mail(recipient, pdf_path)
                destinatario_encontrado = True
                break
        if destinatario_encontrado:
            break

    if not destinatario_encontrado:
        print(f"No se encontró destinatario para {pdf_name_expected}, o no está configurado en Destinatarios.json.")

    try:
        os.remove(pdf_path)
    except Exception as e:
        print(f"No se pudo eliminar {pdf_name_expected}: {e}")

    print("Proceso finalizado.")

if __name__ == "__main__":
    while True:
        main()
