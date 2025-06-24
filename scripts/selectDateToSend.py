from playwright.sync_api import sync_playwright
import requests
from datetime import datetime, timedelta
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

fecha_hoy = datetime.now()

destinatario_fijo = "andres.mirazo@ventologix.com"

def obtener_clientes_desde_api():
    response = requests.get("http://127.0.0.1:8000/report/clients-data")
    if response.status_code == 200:
        return response.json().get("data", [])
    else:
        print("Error al obtener datos de clientes")
        return []

def generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, fecha_reporte):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 1920, "height": 1080})

        url = f"http://localhost:3002/reportesDate?id_cliente={id_cliente}&linea={linea}&date={fecha_reporte}"
        print(f"Abriendo URL: {url}")
        page.goto(url)

        print("Esperando que frontend avise que terminó de renderizar...")
        page.wait_for_function("window.status === 'pdf-ready'", timeout=300000)
        print("Frontend listo, generando PDF...")

        pdf_path = os.path.join(downloads_folder, f"Reporte Diario {nombre_cliente} {alias} {fecha_reporte}.pdf")
        page.pdf(path=pdf_path, format="A2", print_background=True)
        browser.close()
        return pdf_path

def send_mail(pdf_file_path, nombre_cliente, fecha_reporte):
    msg = EmailMessage()
    msg['From'] = f"{alias_name} <{from_address}>"
    msg['To'] = destinatario_fijo
    msg['Subject'] = f"Reporte del dia {fecha_reporte} de {nombre_cliente}"

    logo_cid = make_msgid(domain='ventologix.com')
    ventologix_logo_cid = make_msgid(domain='ventologix.com')

    body = f"""
    <p>Adjunto reporte de <strong>{nombre_cliente}</strong> correspondiente al día <strong>{fecha_reporte}</strong>.</p>
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

    with open(pdf_file_path, 'rb') as pdf:
        pdf_data = pdf.read()
        msg.add_attachment(pdf_data, maintype='application', subtype='pdf', filename=os.path.basename(pdf_file_path))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as smtp:
            smtp.starttls()
            smtp.login(smtp_from, smtp_password)
            smtp.send_message(msg)
        print(f"Correo enviado a {destinatario_fijo}")
    except Exception as e:
        print(f"Error al enviar correo: {e}")

def main():
    os.makedirs(downloads_folder, exist_ok=True)

    clientes = obtener_clientes_desde_api()
    if not clientes:
        print("No se encontraron clientes.")
        return

    print("Clientes disponibles:")
    for idx, cliente in enumerate(clientes):
        print(f"{idx + 1}. {cliente['nombre_cliente']} (Alias: {cliente['alias']}, Línea: {cliente['linea']})")

    seleccion = int(input("Selecciona el número del cliente a generar PDF: ")) - 1
    if seleccion < 0 or seleccion >= len(clientes):
        print("Selección inválida.")
        return

    cliente = clientes[seleccion]
    id_cliente = cliente['id_cliente']
    nombre_cliente = cliente['nombre_cliente']
    alias = cliente['alias'].strip()

    linea = input(f"Ingrese la línea para {nombre_cliente} (valor por defecto: {cliente['linea']}): ") or cliente['linea']

    while True:
        fecha_str = input("Ingrese la fecha para el reporte (YYYY-MM-DD) [por defecto ayer]: ") or (fecha_hoy - timedelta(days=1)).strftime("%Y-%m-%d")
        try:
            datetime.strptime(fecha_str, "%Y-%m-%d")
            break
        except ValueError:
            print("⚠️ Fecha inválida, use formato YYYY-MM-DD.")

    try:
        print(f"Generando PDF para cliente {nombre_cliente}, línea {linea}, fecha {fecha_str}")
        pdf_path = generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, fecha_str)
    except Exception as e:
        print(f"Error generando PDF: {e}")
        return

    send_mail(pdf_path, nombre_cliente, fecha_str)

    try:
        os.remove(pdf_path)
    except Exception as e:
        print(f"No se pudo eliminar {pdf_path}: {e}")

    print("Proceso finalizado.")

if __name__ == "__main__":
    main()