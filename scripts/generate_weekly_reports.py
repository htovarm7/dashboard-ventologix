# generate_weekly_reports.py
from playwright.sync_api import sync_playwright
import requests
from datetime import datetime, timedelta
import json
import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
from email.utils import make_msgid

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
downloads_folder = "pdfs"
alias_name = "VTO LOGIX"
smtp_from = "andres.mirazo@ventologix.com"
from_address = "vto@ventologix.com"
logo_path = "/home/hector_tovar/Ventologix/public/Logo vento firma.jpg"
ventologix_logo_path = "/home/hector_tovar/Ventologix/public/ventologix firma.jpg"
smtp_password = os.getenv("SMTP_PASSWORD")
smtp_server = "smtp.gmail.com"
smtp_port = 587
admin_correos = ["hector.tovar@ventologix.com", "andres.mirazo@ventologix.com"]

fecha_hoy = datetime.now()
tipo_reporte = "semanal"  # Este script es para reportes semanales

def obtener_clientes_desde_api():
    response = requests.get("http://127.0.0.1:8000/report/clients-data")
    if response.status_code == 200:
        data = response.json()
        return {
            "diarios": data.get("diarios", []),
            "semanales": data.get("semanales", [])
        }
    else:
        print("Error al obtener datos de clientes")
        return {"diarios": [], "semanales": []}

def generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 1920, "height": 1080})
        url = f"http://localhost:3002/reportesS?id_cliente={id_cliente}&linea={linea}"
        print(f"Abriendo URL: {url}")
        page.goto(url)
        page.wait_for_function("window.status === 'pdf-ready'", timeout=600000)
        fechaAyer = (fecha_hoy - timedelta(days=1)).strftime("%Y-%m-%d")
        pdf_path = os.path.join(downloads_folder, f"Reporte Semanal {nombre_cliente} {alias} {fechaAyer}.pdf")
        page.pdf(path=pdf_path, format="A2", print_background=True)
        browser.close()
        return pdf_path

def send_mail(recipientConfig, pdf_file_path):
    msg = EmailMessage()
    msg['From'] = f"{alias_name} <{from_address}>"
    msg['To'] = "andres.mirazo@ventologix.com"

    if 'cc' in recipientConfig and recipientConfig['cc']:
        msg['Cc'] = ", ".join(recipientConfig['cc']) if isinstance(recipientConfig['cc'], list) else recipientConfig['cc']

    bcc = recipientConfig.get('bcc', [])
    bcc = bcc if isinstance(bcc, list) else [bcc]

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

    for img_path, cid in [(logo_path, logo_cid), (ventologix_logo_path, ventologix_logo_cid)]:
        with open(img_path, 'rb') as img:
            msg.get_payload()[1].add_related(img.read(), maintype='image', subtype='jpeg', cid=cid)

    with open(pdf_file_path, 'rb') as pdf:
        msg.add_attachment(pdf.read(), maintype='application', subtype='pdf', filename=os.path.basename(pdf_file_path))

    with smtplib.SMTP(smtp_server, smtp_port) as smtp:
        smtp.starttls()
        smtp.login(smtp_from, smtp_password)
        smtp.send_message(msg, to_addrs=[*msg['To'].split(','), *msg.get('Cc', '').split(','), *bcc])
    print(f"Correo enviado a {msg['To']}")

def main():
    os.makedirs(downloads_folder, exist_ok=True)
    with open(os.path.join(os.path.dirname(BASE_DIR), "Destinatarios.json"), "r", encoding="utf-8-sig") as f:
        config = json.load(f)

    clientes = obtener_clientes_desde_api()["semanales"]
    if not clientes:
        print("No se encontraron clientes semanales.")
        return

    for cliente in clientes:
        id_cliente = cliente['id_cliente']
        nombre_cliente = cliente['nombre_cliente']
        alias = cliente['alias'].strip()
        linea = cliente['linea']

        print(f"Generando PDF para {nombre_cliente}, línea {linea}")
        try:
            pdf_path = generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias)
        except Exception as e:
            print(f"Error generando PDF para {nombre_cliente}: {e}")
            continue

        fechaAyer = (fecha_hoy - timedelta(days=1)).strftime("%Y-%m-%d")
        pdf_name_expected = f"Reporte Semanal {nombre_cliente} {alias} {fechaAyer}.pdf"

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
            print(f"No se encontró destinatario para {pdf_name_expected}.")

        try:
            os.remove(pdf_path)
        except Exception as e:
            print(f"No se pudo eliminar {pdf_name_expected}: {e}")

if __name__ == "__main__":
    main()
