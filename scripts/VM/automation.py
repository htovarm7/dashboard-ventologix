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

        # Usamos fecha hoy pero el renombrado se hace luego
        # Reporte Diario Cliente Alias Fecha

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

        # Usamos fecha hoy pero el renombrado se hace luego
        # Reporte Diario Cliente Alias Fecha
        pdf_path = os.path.join(downloads_folder, f"Reporte Diario {nombre_cliente} {alias} {fechaAyer}.pdf")
        # Capturar el alto completo del contenido
        page_height = page.evaluate("() => document.body.scrollHeight")

        page.pdf(
            path=pdf_path,
            width="1920px",  # mismo que el viewport
            height=f"{page_height}px",  # alto dinámico del contenido
            print_background=True
        )

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

# --- Función principal que junta todo ---
def clean_pdfs_folder():
    """Elimina todos los archivos PDF generados en la carpeta pdfs."""
    for filename in os.listdir(downloads_folder):
        if filename.endswith(".pdf"):
            try:
                os.remove(os.path.join(downloads_folder, filename))
                print(f"Archivo eliminado: {filename}")
            except Exception as e:
                print(f"No se pudo eliminar {filename}: {e}")

def main():
    os.makedirs(downloads_folder, exist_ok=True)

    with open(os.path.join(os.path.dirname(BASE_DIR), "Destinatarios.json"), "r", encoding="utf-8-sig") as f:
        config = json.load(f)

    clientes = obtener_clientes_desde_api()
    if not clientes:
        print("No se encontraron clientes.")
        return

    for cliente in clientes:
        id_cliente = cliente['id_cliente']
        linea = cliente['linea']
        nombre_cliente = cliente['nombre_cliente']
        alias = (cliente.get('alias') or "").strip()
        try:
            print(f"Generando PDF para cliente {nombre_cliente}, línea {linea}")
            generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias)
        except Exception as e:
            print(f"Error generando PDF para cliente {nombre_cliente}: {e}")

    missing_files = []

    for recipient in config['recipients']:
        for fileConfig in recipient.get('files', []):
            fechaAyer = (fecha_hoy - timedelta(days=1)).strftime("%Y-%m-%d")
            pdf_name = fileConfig['fileName'].replace("{fecha}", fechaAyer) + ".pdf"
            pdf_path = os.path.join(downloads_folder, pdf_name)

            if os.path.isfile(pdf_path):
                send_mail(recipient, pdf_path)
                try:
                    os.remove(pdf_path)
                except Exception as e:
                    print(f"No se pudo eliminar {pdf_name}: {e}")
            else:
                print(f"No se encontró archivo esperado: {pdf_name}")
                missing_files.append(pdf_name)

    send_error_mail(missing_files, admin_correos)
    print("Proceso finalizado.")

# --- Ejecutar con control de interrupción ---
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️ Proceso cancelado por el usuario. Limpiando PDFs generados...")
        clean_pdfs_folder()
        print("Carpeta de PDFs limpiada. Terminando proceso.")
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}. Limpiando PDFs generados...")
        clean_pdfs_folder()