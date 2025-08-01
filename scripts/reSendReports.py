"""
------------------------------------------------------------
 Ventologix PDF Report Generator
 Author: Hector Tovar
 Description: Script that allows to generate the reports between daily or weekly.
 Only for allowed clients and this code is mainly used if the client didn't receive its report
 Date: 26-07-2025
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
        data = response.json()
        return {
            "diarios": data.get("diarios", []),
            "semanales": data.get("semanales", [])
        }
    else:
        print("Error al obtener datos de clientes")
        return {"diarios": [], "semanales": []}

# --- Función para generar PDF con Playwright ---
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

def clean_pdfs_folder():
    """Elimina todos los archivos PDF generados en la carpeta pdfs."""
    for filename in os.listdir(downloads_folder):
        if filename.endswith(".pdf"):
            try:
                os.remove(os.path.join(downloads_folder, filename))
                print(f"Archivo eliminado: {filename}")
            except Exception as e:
                print(f"No se pudo eliminar {filename}: {e}")

# --- Función principal que junta todo ---
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
            print(f"\n📧 Enviando {len(pdfs_generados)} PDFs por correo...")

            # Cargar configuración de destinatarios desde Destinatarios.json
            destinatarios_path = os.path.join("data", "recipients.json")
            with open(destinatarios_path, "r", encoding="utf-8-sig") as f:
                config = json.load(f)

            # Enviar cada PDF al destinatario correspondiente
            for pdf_path in pdfs_generados:
                pdf_name = os.path.basename(pdf_path)
                enviado = False
                for recipient in config['recipients']:
                    for fileConfig in recipient.get('files', []):
                        fechaAyer = (fecha_hoy - timedelta(days=1)).strftime("%Y-%m-%d")
                        expected_name = fileConfig['fileName'].replace("{fecha}", fechaAyer) + ".pdf"
                        if pdf_name == expected_name:
                            send_mail(recipient, pdf_path)
                            enviado = True
                            break
                    if enviado:
                        break
                if enviado:
                    try:
                        os.remove(pdf_path)
                        print(f"✅ PDF {pdf_name} eliminado.")
                    except Exception as e:
                        print(f"❌ Error al eliminar {pdf_name}: {e}")
                else:
                    print(f"❌ No se encontró destinatario para {pdf_name}, no se envió ni eliminó.")

            print(f"✅ Proceso de envío finalizado.")
        else:
            print("Los PDFs generados no se enviaron por correo.")
    else:
        print("No se generaron PDFs.")

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