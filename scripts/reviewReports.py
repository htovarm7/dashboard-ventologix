"""
------------------------------------------------------------
 Ventologix PDF Report Generator
 Author: Hector Tovar
 Description: Script that allows to generate the reports between daily or weekly.
 For all clients and its sended to andres
 Date: 2024-06
------------------------------------------------------------
"""

from playwright.sync_api import sync_playwright
import requests
from datetime import datetime, timedelta
import json
import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
from email.utils import make_msgid
import time

inicio_total = time.time()


load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
downloads_folder = "pdfs"
alias_name = "VTO LOGIX"
smtp_from = "andres.mirazo@ventologix.com"
from_address = "vto@ventologix.com"
logo_path = "public/Logo vento firma.jpg"
ventologix_logo_path = "public/ventologix firma.jpg"
smtp_password = os.getenv("SMTP_PASSWORD")
smtp_server = "smtp.gmail.com"
smtp_port = 587
admin_correos = ["andres.mirazo@ventologix.com"]
fecha_hoy = datetime.now()

def obtener_clientes_desde_api():
    response = requests.get("http://127.0.0.1:8000/report/all-clients")
    if response.status_code == 200:
        data = response.json()
        return {
            "diarios": data.get("diarios", []),
            "semanales": data.get("semanales", [])
        }
    else:
        print("Error al obtener datos de clientes")
        return {"diarios": [], "semanales": []}

def generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, tipo):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 1920, "height": 1080})

        url = f"http://localhost:3002/reportes{'D' if tipo == 'diario' else 'S'}?id_cliente={id_cliente}&linea={linea}"
        print(f"Abriendo URL: {url}")
        page.goto(url)

        # Esperar a que el frontend avise que terminó
        page.wait_for_function("window.status === 'pdf-ready'", timeout=600000)

        # Obtener la altura real del contenido
        full_height = page.evaluate("() => document.body.scrollHeight")

        fechaAyer = (fecha_hoy - timedelta(days=1)).strftime("%Y-%m-%d")
        pdf_path = os.path.join(downloads_folder, f"Reporte {tipo.capitalize()} {nombre_cliente} {alias} {fechaAyer}.pdf")

        page.pdf(
            path=pdf_path,
            width="1920px",
            height=f"{full_height}px",
            print_background=True,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
        )

        browser.close()
        return pdf_path

def send_mail(pdf_file_path):
    msg = EmailMessage()
    msg['From'] = f"{alias_name} <{from_address}>"
    msg['To'] = "andres.mirazo@ventologix.com, octavio.murillo@ventologix.com"
    msg['Subject'] = "Reporte PDF generado"

    logo_cid = make_msgid(domain='ventologix.com')
    ventologix_logo_cid = make_msgid(domain='ventologix.com')

    body = f"""
    <p>Se adjunta el reporte generado:</p>
    <p><b>{os.path.basename(pdf_file_path)}</b></p>
    <br><p><img src=\"cid:{logo_cid[1:-1]}\" alt=\"Logo Ventologix\" /></p>
    <p><img src=\"cid:{ventologix_logo_cid[1:-1]}\" alt=\"Ventologix Firma\" /></p>
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
        smtp.send_message(msg)
    print(f"Correo enviado con {os.path.basename(pdf_file_path)}")

def main():
    os.makedirs(downloads_folder, exist_ok=True)

    pdfs_generados = []

    while True:
        tipo = input("¿Qué tipo de reporte deseas generar? (diario/semanal): ").strip().lower()
        if tipo not in ["diario", "semanal"]:
            print("Tipo inválido. Debe ser 'diario' o 'semanal'.")
            continue

        clientes = obtener_clientes_desde_api()["diarios" if tipo == "diario" else "semanales"]

        if not clientes:
            print(f"No se encontraron clientes para el tipo {tipo}.")
            continue

        print("Clientes disponibles:")
        for idx, cliente in enumerate(clientes):
            print(f"{idx + 1}. {cliente['nombre_cliente']} (Alias: {cliente['alias']}, Línea: {cliente['linea']})")

        try:
            seleccion = int(input("Selecciona el número del cliente a generar PDF: ")) - 1
        except ValueError:
            print("Selección inválida.")
            continue

        if seleccion < 0 or seleccion >= len(clientes):
            print("Selección inválida.")
            continue

        cliente = clientes[seleccion]
        id_cliente = cliente['id_cliente']
        nombre_cliente = cliente['nombre_cliente']
        alias = cliente['alias'].strip()
        linea = input(f"Ingrese la línea para {nombre_cliente} (valor por defecto: {cliente['linea']}): ") or cliente['linea']

        try:
            print(f"\n🕒 Generando PDF para {nombre_cliente}...")
            inicio = time.time()

            pdf_path = generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, tipo)
            pdfs_generados.append(pdf_path)

            fin = time.time()
            duracion = fin - inicio
            print(f"✅ PDF generado correctamente en {duracion:.2f} segundos.\n")

        except Exception as e:
            print(f"❌ Error durante generación: {e}")

        continuar = input("¿Deseas generar otro reporte? (s/n): ").strip().lower()
        if continuar != "s":
            break

    if pdfs_generados:
        print("\nPDFs generados:")
        for idx, pdf in enumerate(pdfs_generados):
            print(f"{idx + 1}. {os.path.basename(pdf)}")

        enviar = input("¿Deseas enviar todos los PDFs generados por correo? (s/n): ").strip().lower()
        if enviar == "s":
            for pdf_path in pdfs_generados:
                try:
                    send_mail(pdf_path)
                    os.remove(pdf_path)
                    print(f"✅ PDF {os.path.basename(pdf_path)} enviado y eliminado.")
                except Exception as e:
                    print(f"❌ Error al enviar {os.path.basename(pdf_path)}: {e}")
        else:
            print("Los PDFs generados no se enviaron por correo.")
    else:
        print("No se generaron PDFs.")

try:
    main()
except KeyboardInterrupt:
    print("Ejecución detenida por el usuario.")