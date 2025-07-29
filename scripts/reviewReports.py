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
import time
from email.message import EmailMessage
from dotenv import load_dotenv
from email.utils import make_msgid
import locale

locale.setlocale(locale.LC_TIME, "es_MX.UTF-8")
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

print("SMTP_PASSWORD presente:", bool(smtp_password))

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

        if tipo == "diario":
            url = f"http://localhost:3002/reportesD?id_cliente={id_cliente}&linea={linea}"
            print(f"Abriendo URL: {url}")
            page.goto(url)

            fechaAyer = (fecha_hoy - timedelta(days=1)).strftime("%Y-%m-%d")
            print("Esperando que frontend avise que terminó de renderizar...")
            page.wait_for_function("window.status === 'pdf-ready'", timeout=300000)
            print("Frontend listo, generando PDF...")
            
            pdf_name = f"Reporte Diario {nombre_cliente} {alias} {fechaAyer}.pdf"
            pdf_path = os.path.join(downloads_folder, pdf_name)
            page_height = page.evaluate("() => document.body.scrollHeight")
            page.pdf(
                path=pdf_path,
                width="1920px",
                height=f"{page_height}px",
                print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
            )
        else:
            url = f"http://localhost:3002/reportesS?id_cliente={id_cliente}&linea={linea}"
            print(f"Abriendo URL: {url}")
            page.goto(url)

            page.wait_for_function("window.status === 'pdf-ready'", timeout=600000)

            full_height = page.evaluate("""
            () => Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight
            )
            """)
            safe_height = max(full_height - 2, 1)

            lunes, domingo = obtener_rango_semana_anterior(fecha_hoy)
            fecha_str = fecha_hoy.strftime("%Y-%m-%d")
            rango = f"Semana del {lunes.day} al {domingo.day} {domingo.strftime('%B')}"
            pdf_name = f"Reporte Semanal {nombre_cliente} {alias} {fecha_str} ({rango}).pdf"
            pdf_path = os.path.join(downloads_folder, pdf_name)

            page.pdf(
                path=pdf_path,
                width="1920px",
                height=f"{safe_height}px",
                print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
            )

        browser.close()
        return pdf_path

def send_mail(pdf_file_path):
    # === HARD-CODE ===
    RECIPIENT = "andres.mirazo@ventologix.com, octavio.murillo@ventologix.com"
    SUBJECT = "Reporte PDF generado"

    msg = EmailMessage()
    msg['From'] = f"{alias_name} <{from_address}>"
    msg['To'] = RECIPIENT
    msg['Subject'] = SUBJECT

    logo_cid = make_msgid(domain='ventologix.com')
    ventologix_logo_cid = make_msgid(domain='ventologix.com')

    body = f"""
    <p>Se adjunta el reporte generado:</p>
    <p><b>{os.path.basename(pdf_file_path)}</b></p>
    <br><p><img src="cid:{logo_cid[1:-1]}" alt="Logo Ventologix" /></p>
    <p><img src="cid:{ventologix_logo_cid[1:-1]}" alt="Ventologix Firma" /></p>
    <br>VTO logix<br>
    <a href='mailto:vto@ventologix.com'>vto@ventologix.com</a><br>
    <a href='https://www.ventologix.com'>www.ventologix.com</a><br>
    """
    msg.set_content("Este mensaje requiere un cliente con soporte HTML.")
    msg.add_alternative(body, subtype='html')

    # Adjuntar PDF
    with open(pdf_file_path, 'rb') as pdf:
        msg.add_attachment(pdf.read(), maintype='application', subtype='pdf',
                           filename=os.path.basename(pdf_file_path))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as smtp:
            # smtp.set_debuglevel(1)  # <-- descomenta si quieres ver el diálogo SMTP
            smtp.starttls()
            smtp.login("andres.mirazo@ventologix.com", smtp_password)
            smtp.send_message(msg)  # toma To de los headers; no hay CC/BCC
        print(f"Correo enviado a {RECIPIENT} con {os.path.basename(pdf_file_path)}")
    except Exception as e:
        print(f"Error al enviar correo: {e}")

def obtener_rango_semana_anterior(fecha_base):
    lunes_pasado = fecha_base - timedelta(days=fecha_base.weekday() + 7)
    domingo_pasado = lunes_pasado + timedelta(days=6)
    return lunes_pasado, domingo_pasado

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