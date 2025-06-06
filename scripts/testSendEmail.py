from playwright.sync_api import sync_playwright
import requests
from datetime import datetime, timedelta
import json
import os
import smtplib
from email.message import EmailMessage
from email.utils import make_msgid
from dotenv import load_dotenv
import time

load_dotenv()

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

# Correos importantes
admin_correo = "hector.tovar@ventologix.com"

# Fecha base de hoy
fecha_hoy = datetime.now()

def obtener_clientes_desde_api():
    response = requests.get("http://127.0.0.1:8000/report/clients-data")
    if response.status_code == 200:
        return response.json().get("data", [])
    else:
        print("Error al obtener datos de clientes")
        return []

def generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 1920, "height": 1080})

        url = f"http://localhost:3000/reportes?id_cliente={id_cliente}&linea={linea}"
        print(f"Abriendo URL: {url}")
        page.goto(url)

        fechaAyer = (fecha_hoy - timedelta(days=1)).strftime("%Y-%m-%d")
        print("Esperando que frontend avise que terminó de renderizar...")
        page.wait_for_function("window.status === 'pdf-ready'", timeout=180000)
        print("Frontend listo, generando PDF...")

        pdf_path = os.path.join(downloads_folder, f"Reporte Diario {nombre_cliente} {alias} {fechaAyer}.pdf")
        page.pdf(path=pdf_path, format="A2", print_background=True)
        browser.close()
        return pdf_path

def send_mail(destinatario, pdf_file_paths, asunto):
    msg = EmailMessage()
    msg['From'] = f"{alias_name} <{from_address}>"
    msg['To'] = destinatario
    msg['Subject'] = asunto

    logo_cid = make_msgid(domain='ventologix.com')
    ventologix_logo_cid = make_msgid(domain='ventologix.com')

    body = f"""
    <p>Adjunto encontrarás los reportes PDF generados.</p>
    <br><p><img src="cid:{logo_cid[1:-1]}" alt="Logo Ventologix" /></p>
    <p><img src="cid:{ventologix_logo_cid[1:-1]}" alt="Ventologix Firma" /></p>
    <br>VTO logix<br>
    <a href='mailto:vto@ventologix.com'>vto@ventologix.com</a><br>
    <a href='https://www.ventologix.com'>www.ventologix.com</a><br>
    """

    msg.set_content("Este mensaje requiere un cliente con soporte HTML.")
    msg.add_alternative(body, subtype='html')

    for img_path, cid in [(logo_path, logo_cid), (ventologix_logo_path, ventologix_logo_cid)]:
        with open(img_path, 'rb') as img:
            img_data = img.read()
            maintype, subtype = 'image', 'jpeg'
            msg.get_payload()[1].add_related(img_data, maintype=maintype, subtype=subtype, cid=cid)

    for pdf_file_path in pdf_file_paths:
        with open(pdf_file_path, 'rb') as pdf:
            pdf_data = pdf.read()
            msg.add_attachment(pdf_data, maintype='application', subtype='pdf', filename=os.path.basename(pdf_file_path))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as smtp:
            smtp.starttls()
            smtp.login(smtp_from, smtp_password)
            smtp.send_message(msg)
        print(f"Correo enviado a {destinatario} con {len(pdf_file_paths)} archivos adjuntos")
    except Exception as e:
        print(f"Error al enviar correo a {destinatario}: {e}")

def send_error_mail(missing_files):
    if not missing_files:
        return

    msg = EmailMessage()
    msg['From'] = f"{alias_name} <{from_address}>"
    msg['To'] = admin_correo
    msg['Subject'] = "⚠️ Reporte - Archivos PDF no generados"

    body = f"<p>No se encontraron los siguientes archivos PDF esperados:</p><ul>"
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
        print(f"Correo de advertencia enviado a {admin_correo}")
    except Exception as e:
        print(f"Error al enviar correo de advertencia: {e}")

def main():
    os.makedirs(downloads_folder, exist_ok=True)

    clientes = obtener_clientes_desde_api()
    if not clientes:
        print("No se encontraron clientes.")
        return

    print("\nClientes disponibles:")
    for cliente in clientes:
        print(f"{cliente['id_cliente']}: {cliente['nombre_cliente']} (Línea: {cliente['linea']})")

    seleccion = input("\nIngresa los ID de clientes separados por coma (ej: 1,3,5): ").strip()
    if not seleccion:
        print("No se seleccionaron clientes. Terminando.")
        return

    try:
        clientes_a_incluir = [int(x.strip()) for x in seleccion.split(",")]
    except ValueError:
        print("Error: Solo se permiten números de ID separados por coma.")
        return

    pdf_paths_to_send = []
    missing_files = []

    for cliente in clientes:
        id_cliente = cliente['id_cliente']

        # Solo procesar si está en la lista de clientes seleccionados
        if id_cliente not in clientes_a_incluir:
            continue

        linea = cliente['linea']
        nombre_cliente = cliente['nombre_cliente']
        alias = cliente['alias']

        try:
            print(f"\nGenerando PDF para cliente {nombre_cliente}, línea {linea}")
            pdf_path = generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias)
            pdf_paths_to_send.append(pdf_path)
        except Exception as e:
            print(f"Error generando PDF para cliente {nombre_cliente}: {e}")
            missing_files.append(f"{nombre_cliente} ({alias})")

    hora = datetime.now().strftime("%H:%M")
    recipient_email = "hector.tovar@ventologix.com"

    if pdf_paths_to_send:
        send_mail(recipient_email, pdf_paths_to_send, f"Reportes Diarios VENTOLOGIX {hora}")

        for path in pdf_paths_to_send:
            try:
                os.remove(path)
            except Exception as e:
                print(f"No se pudo eliminar {path}: {e}")

    send_error_mail(missing_files)
    print("\nProceso finalizado.")

if __name__ == "__main__":
    main()

