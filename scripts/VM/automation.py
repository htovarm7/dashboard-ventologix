# ------------------------------------------------------------
# Ventologix PDF Report Generator - Automático Diario y Semanal
# Autor: Hector Tovar (integración automatizada por ChatGPT)
# Descripción: Genera y envía reportes DIARIOS y/o SEMANALES
#              según 'data/recipients.json' y la API /report/all-clients.
# Fecha: 2025-07
# ------------------------------------------------------------

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

# ---- Config regional (meses en español) ----
try:
    locale.setlocale(locale.LC_TIME, "es_MX.UTF-8")
except Exception:
    # Fallback si el locale no está instalado
    pass

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS_FOLDER = os.path.join(BASE_DIR, "pdfs")

# Identidad y correo
ALIAS_NAME = "VTO LOGIX"
SMTP_FROM = "andres.mirazo@ventologix.com"   # para login SMTP
FROM_ADDRESS = "vto@ventologix.com"          # remitente visible
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# Rutas de logos (ajusta si es necesario)
LOGO_PATH = os.path.join(BASE_DIR, "public", "Logo vento firma.jpg")
VENTOLOGIX_LOGO_PATH = os.path.join(BASE_DIR, "public", "ventologix firma.jpg")

# Admins para alertas
ADMIN_CORREOS = [
    "hector.tovar@ventologix.com",
    "andres.mirazo@ventologix.com"
]

# Flags de control
FORZAR_SEMANALES = os.getenv("FORZAR_SEMANALES", "0") == "1"  # Forzar semanales cualquier día
SOLO_TIPO = os.getenv("REPORTE_TIPO", "").strip().lower()     # "diario" | "semanal" | "" (auto)

FECHA_HOY = datetime.now()

recipients_path = os.getenv("RECIPIENTS_JSON",
                            "/home/hector_tovar/Ventologix/scripts/VM/data/recipients.json")


# ------------- Utilidades de fecha -------------
def obtener_rango_semana_anterior(fecha_base: datetime):
    """Devuelve (lunes, domingo) de la semana anterior a fecha_base."""
    lunes_pasado = fecha_base - timedelta(days=fecha_base.weekday() + 7)
    domingo_pasado = lunes_pasado + timedelta(days=6)
    return lunes_pasado, domingo_pasado


def etiqueta_fecha_diaria(fecha_base: datetime, offset_dias: int = -1) -> str:
    """YYYY-MM-DD para diarios (por defecto: ayer)."""
    return (fecha_base + timedelta(days=offset_dias)).strftime("%Y-%m-%d")


def etiqueta_fecha_semanal(fecha_base: datetime, offset_dias: int = 0) -> str:
    """
    Devuelve: 'YYYY-MM-DD (Semana del L al D mes)'
    - YYYY-MM-DD: fecha_base + offset_dias (para control desde JSON).
    - Rango: siempre lunes-domingo de la semana anterior a fecha_base.
    """
    fecha_str = (fecha_base + timedelta(days=offset_dias)).strftime("%Y-%m-%d")
    lunes, domingo = obtener_rango_semana_anterior(fecha_base)
    try:
        mes_domingo = domingo.strftime("%B")  # respeta locale si disponible
    except Exception:
        mes_domingo = domingo.strftime("%m")
    rango = f"Semana del {lunes.day} al {domingo.day} {mes_domingo}"
    return f"{fecha_str} ({rango})"


# ------------- API clientes -------------
def obtener_clientes_desde_api():
    """
    Espera un payload:
    {
      "diarios": [ {id_cliente, linea, nombre_cliente, alias}, ... ],
      "semanales": [ {id_cliente, linea, nombre_cliente, alias}, ... ]
    }
    """
    try:
        response = requests.get("http://127.0.0.1:8000/report/clients-data", timeout=60)
        if response.status_code == 200:
            data = response.json()
            return {
                "diarios": data.get("diarios", []),
                "semanales": data.get("semanales", [])
            }
        else:
            print(f"Error al obtener clientes: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Excepción al llamar a API de clientes: {e}")
    return {"diarios": [], "semanales": []}


# ------------- Render PDF -------------
def generar_pdf_cliente(id_cliente: int, linea: str, nombre_cliente: str, alias: str, tipo: str, etiqueta_fecha: str) -> str:
    """
    Renderiza el reporte y guarda:
    - Diario : 'Reporte Diario {cliente} {alias} {YYYY-MM-DD}.pdf'
    - Semanal: 'Reporte Semanal {cliente} {alias} {YYYY-MM-DD} (Semana del ...).pdf'
    """
    alias_limpio = (alias or "").strip()
    nombre_archivo = f"Reporte {'Diario' if tipo=='diario' else 'Semanal'} {nombre_cliente} {alias_limpio} {etiqueta_fecha}.pdf"
    pdf_path = os.path.join(DOWNLOADS_FOLDER, nombre_archivo)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 1920, "height": 1080})

        if tipo == "diario":
            url = f"http://localhost:3002/reportesD?id_cliente={id_cliente}&linea={linea}"
            print(f"Abriendo URL: {url}")
            page.goto(url)

            print("Esperando que frontend avise que terminó de renderizar...")
            page.wait_for_function("window.status === 'pdf-ready'", timeout=300000)
            print("Frontend listo, generando PDF...")

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
            safe_height = max(int(full_height) - 2, 1)

            page.pdf(
                path=pdf_path,
                width="1920px",
                height=f"{safe_height}px",
                print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
            )

        browser.close()
        print(f"PDF generado: {os.path.basename(pdf_path)}")
        return pdf_path

# ------------- Envío correo -------------
def send_mail(recipient_config: dict, pdf_file_path: str):
    msg = EmailMessage()
    msg['From'] = f"{ALIAS_NAME} <{FROM_ADDRESS}>"

    # To
    if isinstance(recipient_config.get('email'), list):
        msg['To'] = ", ".join(recipient_config['email'])
    else:
        msg['To'] = recipient_config.get('email', '')

    # Cc
    if recipient_config.get('cc'):
        if isinstance(recipient_config['cc'], list):
            msg['Cc'] = ", ".join(recipient_config['cc'])
        else:
            msg['Cc'] = recipient_config['cc']

    # Bcc (enviar aparte)
    bcc = []
    if recipient_config.get('bcc'):
        bcc = recipient_config['bcc'] if isinstance(recipient_config['bcc'], list) else [recipient_config['bcc']]

    msg['Subject'] = recipient_config.get('emailSubject', 'Reporte VENTOLOGIX')

    # Logos embebidos
    logo_cid = make_msgid(domain='ventologix.com')
    ventologix_logo_cid = make_msgid(domain='ventologix.com')

    body = recipient_config.get('emailBody', '') + f"""
    <br><p><img src="cid:{logo_cid[1:-1]}" alt="Logo Ventologix" /></p>
    <p><img src="cid:{ventologix_logo_cid[1:-1]}" alt="Ventologix Firma" /></p>
    <br>VTO logix<br>
    <a href='mailto:vto@ventologix.com'>vto@ventologix.com</a><br>
    <a href='https://www.ventologix.com'>www.ventologix.com</a><br>
    """
    msg.set_content("Este mensaje requiere un cliente con soporte HTML.")
    msg.add_alternative(body, subtype='html')

    # Adjuntar imágenes (si existen)
    for img_path, cid in [(LOGO_PATH, logo_cid), (VENTOLOGIX_LOGO_PATH, ventologix_logo_cid)]:
        if os.path.isfile(img_path):
            with open(img_path, 'rb') as img:
                img_data = img.read()
                msg.get_payload()[1].add_related(img_data, maintype='image', subtype='jpeg', cid=cid)

    # Adjuntar PDF
    with open(pdf_file_path, 'rb') as pdf:
        pdf_data = pdf.read()
        msg.add_attachment(pdf_data, maintype='application', subtype='pdf', filename=os.path.basename(pdf_file_path))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(SMTP_FROM, SMTP_PASSWORD)
            smtp.send_message(msg, to_addrs=[*msg['To'].split(','), *msg.get('Cc', '').split(','), *bcc])
        print(f"Correo enviado a {msg['To']}")
    except Exception as e:
        print(f"Error al enviar correo: {e}")

def send_error_mail(missing_files: list, admin_emails: list):
    if not missing_files:
        return

    msg = EmailMessage()
    msg['From'] = f"{ALIAS_NAME} <{FROM_ADDRESS}>"
    msg['To'] = ", ".join(admin_emails)
    msg['Subject'] = "⚠️ Reporte - Archivos PDF no generados"

    body = "<p>No se encontraron los siguientes archivos PDF esperados:</p><ul>"
    for f in missing_files:
        body += f"<li>{f}</li>"
    body += "</ul><br>VTO logix"

    msg.set_content("Este mensaje requiere un cliente con soporte HTML.")
    msg.add_alternative(body, subtype='html')

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(SMTP_FROM, SMTP_PASSWORD)
            smtp.send_message(msg)
        print(f"Correo de advertencia enviado a {', '.join(admin_emails)}")
    except Exception as e:
        print(f"Error al enviar correo de advertencia: {e}")


# ------------- Core -------------
def cargar_recipients():
    with open(recipients_path, "r", encoding="utf-8") as f:
        recipients = json.load(f)
    return recipients

def clean_pdfs_folder():
    os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)
    for filename in os.listdir(DOWNLOADS_FOLDER):
        if filename.endswith(".pdf"):
            try:
                os.remove(os.path.join(DOWNLOADS_FOLDER, filename))
                print(f"Archivo eliminado: {filename}")
            except Exception as e:
                print(f"No se pudo eliminar {filename}: {e}")


def debe_generar_semanales_hoy(fecha_base: datetime) -> bool:
    """Por defecto, solo lunes. Se puede forzar con FORZAR_SEMANALES=1."""
    if FORZAR_SEMANALES:
        return True
    return fecha_base.weekday() == 0  # Lunes

def generar_todos_los_pdfs(clientes: list, tipo: str) -> set:
    """
    Genera PDFs para cada cliente del tipo indicado y devuelve el conjunto de nombres de archivo generados.
    """
    generados = set()
    for c in clientes:
        try:
            id_cliente = c['id_cliente']
            linea = c['linea']
            nombre_cliente = c['nombre_cliente']
            alias = (c.get('alias') or "").strip()

            if tipo == "diario":
                etiqueta = etiqueta_fecha_diaria(FECHA_HOY, -1)
            else:
                etiqueta = etiqueta_fecha_semanal(FECHA_HOY, 0)

            pdf_path = generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, tipo, etiqueta)
            generados.add(os.path.basename(pdf_path))
        except Exception as e:
            print(f"Error generando PDF para {c.get('nombre_cliente')} ({tipo}): {e}")
    return generados


def enviar_por_recipients(config: dict, seccion: str):
    """
    - seccion: 'diarios' | 'semanales'
    - Usa config['diarios'] o config['semanales'].
    - Reemplaza {fecha} en 'fileName' según reglas del tipo.
    """
    missing_files = []

    # Construcción del valor {fecha} esperado por recipients.json
    for recipient in config.get(seccion, []):
        archivos = recipient.get('files', [])
        for file_cfg in archivos:
            date_offset = int(file_cfg.get('dateOffset', -1 if seccion == 'diarios' else 0))
            if seccion == "diarios":
                etiqueta = etiqueta_fecha_diaria(FECHA_HOY, date_offset)
            else:
                etiqueta = etiqueta_fecha_semanal(FECHA_HOY, date_offset)

            pdf_name = file_cfg['fileName'].replace("{fecha}", etiqueta) + ".pdf"
            pdf_path = os.path.join(DOWNLOADS_FOLDER, pdf_name)

            if os.path.isfile(pdf_path):
                send_mail(recipient, pdf_path)
                try:
                    os.remove(pdf_path)
                except Exception as e:
                    print(f"No se pudo eliminar {pdf_name}: {e}")
            else:
                print(f"No se encontró archivo esperado: {pdf_name}")
                missing_files.append(pdf_name)

    if missing_files:
        send_error_mail(missing_files, ADMIN_CORREOS)


def main():
    os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)
    inicio_total = time.time()

    print("SMTP_PASSWORD presente:", bool(SMTP_PASSWORD))

    # Carga recipients y clientes
    recipients_cfg = cargar_recipients()
    clientes_api = obtener_clientes_desde_api()
    clientes_diarios = clientes_api.get("diarios", [])
    clientes_semanales = clientes_api.get("semanales", [])

    # Determinar qué ejecutar
    ejecutar_diarios = (SOLO_TIPO in ("", "diario"))
    ejecutar_semanales = (SOLO_TIPO in ("", "semanal")) and debe_generar_semanales_hoy(FECHA_HOY)

    # ---- DIARIOS ----
    if ejecutar_diarios and recipients_cfg.get("diarios"):
        print("\n=== Generando DIARIOS ===")
        generar_todos_los_pdfs(clientes_diarios, "diario")
        enviar_por_recipients(recipients_cfg, "diarios")
    else:
        print("\n=== DIARIOS omitidos ===")

    # ---- SEMANALES ----
    if ejecutar_semanales and recipients_cfg.get("semanales"):
        print("\n=== Generando SEMANALES ===")
        generar_todos_los_pdfs(clientes_semanales, "semanal")
        enviar_por_recipients(recipients_cfg, "semanales")
    else:
        print("\n=== SEMANALES omitidos (no es lunes o no forzado) ===")

    fin_total = time.time()
    print(f"\nProceso finalizado en {fin_total - inicio_total:.2f} s.")


# ---- Ejecutar con control de interrupción ----
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