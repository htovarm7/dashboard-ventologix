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
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.http import MediaFileUpload
import glob

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

# Google Drive Configuration
GOOGLE_DRIVE_FOLDER_ID = "19YM9co-kyogK7iXeJ-Wwq1VnrICr50Xk"  # ID de la carpeta de Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive.file']
CREDENTIALS_FILE = os.path.join(BASE_DIR, "credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "token.json")

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
                            "/home/hector_tovar/Ventologix/data/recipients.json")


# ------------- Utilidades de fecha -------------
def get_fecha_reporte(tipo: str = "diario", fecha_base: datetime = None) -> str:
    """Genera el formato de fecha para reportes diarios o semanales."""
    fecha_base = fecha_base or datetime.now()
    
    if tipo == "diario":
        return (fecha_base - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Para reporte semanal
    lunes = fecha_base - timedelta(days=fecha_base.weekday() + 7)
    domingo = lunes + timedelta(days=6)
    fecha = fecha_base.strftime("%Y-%m-%d")
    try:
        mes = domingo.strftime("%B")
    except Exception:
        mes = domingo.strftime("%m")
    return f"{fecha} (Semana del {lunes.day} al {domingo.day} {mes})"


# ------------- Google Drive Functions -------------
def authenticate_google_drive():
    """Autentica con Google Drive usando OAuth2."""
    creds = None
    
    # El archivo token.json almacena los tokens de acceso y actualización del usuario.
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    
    # Si no hay credenciales válidas disponibles, permite al usuario autenticarse.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"Error al refrescar token: {e}")
                # Si falla el refresh, eliminar token y reautenticar
                if os.path.exists(TOKEN_FILE):
                    os.remove(TOKEN_FILE)
                creds = None
        
        if not creds:
            if not os.path.exists(CREDENTIALS_FILE):
                print(f"Error: No se encontró el archivo de credenciales en {CREDENTIALS_FILE}")
                print("Descarga el archivo credentials.json desde Google Cloud Console y colócalo en la carpeta scripts/VM/")
                print("Asegúrate de que sea para 'Aplicación de escritorio'")
                return None
            
            try:
                flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
                # Usar un puerto específico para evitar problemas de redirect_uri
                creds = flow.run_local_server(port=8080, open_browser=True)
            except Exception as e:
                print(f"Error durante la autenticación OAuth: {e}")
                print("Verifica que:")
                print("1. El archivo credentials.json sea para 'Aplicación de escritorio'")
                print("2. Las URIs de redirección estén configuradas correctamente")
                print("3. Revisa el archivo GOOGLE_DRIVE_SETUP.md para más detalles")
                return None
        
        # Guarda las credenciales para la próxima ejecución
        try:
            with open(TOKEN_FILE, 'w') as token:
                token.write(creds.to_json())
            print(f"Token guardado en {TOKEN_FILE}")
        except Exception as e:
            print(f"Error al guardar token: {e}")
    
    return creds

def upload_to_google_drive(file_path: str, folder_id: str = GOOGLE_DRIVE_FOLDER_ID) -> bool:
    """
    Sube un archivo a Google Drive en la carpeta especificada.
    
    Args:
        file_path: Ruta del archivo a subir
        folder_id: ID de la carpeta de Google Drive donde subir el archivo
    
    Returns:
        bool: True si la subida fue exitosa, False en caso contrario
    """
    try:
        creds = authenticate_google_drive()
        if not creds:
            return False
        
        service = build('drive', 'v3', credentials=creds)
        
        file_name = os.path.basename(file_path)
        
        file_metadata = {
            'name': file_name,
            'parents': [folder_id]
        }
        
        media = MediaFileUpload(file_path, mimetype='application/pdf')
        
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        
        print(f"Archivo {file_name} subido exitosamente a Google Drive con ID: {file.get('id')}")
        return True
        
    except Exception as e:
        print(f"Error al subir {os.path.basename(file_path)} a Google Drive: {e}")
        return False


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
            diarios = data.get("diarios", [])
            semanales = data.get("semanales", [])
            
            print(f"📋 API: {len(diarios)} diarios, {len(semanales)} semanales")
            
            return {
                "diarios": diarios,
                "semanales": semanales
            }
        else:
            print(f"❌ Error API: {response.status_code}")
    except Exception as e:
        print(f"❌ Error conectando API: {e}")
    
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
            page.goto(url, timeout=300000)

            try:
                page.wait_for_function("window.status === 'pdf-ready' || window.status === 'data-error'", timeout=300000)
                
                # Verificar si hay error de datos
                status = page.evaluate("() => window.status")
                if status == "data-error":
                    browser.close()
                    return None

            except Exception as e:
                browser.close()
                return None

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
            page.goto(url, timeout=600000)

            try:
                page.wait_for_function("window.status === 'pdf-ready' || window.status === 'data-error'", timeout=600000)
                
                # Verificar si hay error de datos
                status = page.evaluate("() => window.status")
                if status == "data-error":
                    browser.close()
                    return None

            except Exception as e:
                browser.close()
                return None

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
        return pdf_path

# ------------- Envío correo -------------
def send_mail(recipient_config: dict, pdf_file_path: str):
    # Verificar que el archivo existe antes de proceder
    if not os.path.exists(pdf_file_path):
        return False
    
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
        return True
    except Exception as e:
        print(f"❌ Error enviando a {msg['To']}: {e}")
        return False

def send_error_mail(missing_files: list = None, failed_pdfs: list = None, admin_emails: list = None):
    """
    Envía correo de error a los administradores con información sobre:
    - missing_files: Archivos PDF que se esperaban pero no se encontraron
    - failed_pdfs: PDFs que fallaron durante la generación
    """
    if not missing_files and not failed_pdfs:
        return
    
    if admin_emails is None:
        admin_emails = ADMIN_CORREOS

    msg = EmailMessage()
    msg['From'] = f"{ALIAS_NAME} <{FROM_ADDRESS}>"
    msg['To'] = ", ".join(admin_emails)
    msg['Subject'] = "⚠️ Reporte - Errores en generación/envío de PDFs"

    body = "<h3>Reporte de Errores - Ventologix</h3>"
    
    if failed_pdfs:
        body += "<h4>PDFs que fallaron en la generación:</h4><ul>"
        for pdf in failed_pdfs:
            body += f"<li><strong>{pdf['nombre_cliente']} - {pdf['alias']}</strong> (Tipo: {pdf['tipo']})"
            if 'error' in pdf:
                body += f" - Error: {pdf['error']}"
            body += "</li>"
        body += "</ul>"
    
    if missing_files:
        body += "<h4>Archivos PDF esperados pero no encontrados:</h4><ul>"
        for f in missing_files:
            body += f"<li>{f}</li>"
        body += "</ul>"
    
    body += f"<br><p><strong>Fecha/Hora:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>"
    body += "<br>VTO logix<br>"
    body += "<a href='mailto:vto@ventologix.com'>vto@ventologix.com</a><br>"
    body += "<a href='https://www.ventologix.com'>www.ventologix.com</a>"

    msg.set_content("Este mensaje requiere un cliente con soporte HTML.")
    msg.add_alternative(body, subtype='html')

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(SMTP_FROM, SMTP_PASSWORD)
            smtp.send_message(msg)
        print(f"✅ Correo de error enviado a {', '.join(admin_emails)}")
    except Exception as e:
        print(f"❌ Error al enviar correo de advertencia: {e}")


# ------------- Core -------------
def cargar_recipients():
    with open(recipients_path, "r", encoding="utf-8") as f:
        recipients = json.load(f)
    return recipients

def clean_pdfs_folder():
    """Limpia todos los archivos PDF de la carpeta de descargas."""
    os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)
    count = 0
    for filename in os.listdir(DOWNLOADS_FOLDER):
        if filename.endswith(".pdf"):
            try:
                os.remove(os.path.join(DOWNLOADS_FOLDER, filename))
                count += 1
            except Exception:
                pass
    if count > 0:
        print(f"🧹 {count} archivos PDF eliminados")


def debe_generar_semanales_hoy(fecha_base: datetime) -> bool:
    """Por defecto, solo lunes. Se puede forzar con FORZAR_SEMANALES=1."""
    if FORZAR_SEMANALES:
        return True
    return fecha_base.weekday() == 0  # Lunes

def generar_todos_los_pdfs(clientes: list, tipo: str) -> tuple[set, list]:
    """
    Genera PDFs para cada cliente del tipo indicado.
    Retorna una tupla con:
    - set: nombres de archivo generados exitosamente
    - list: clientes que fallaron en la generación
    Si el tipo es 'semanal', también sube los archivos a Google Drive.
    """
    print(f"\nGenerando PDFs {tipo} para {len(clientes)} clientes...")
    
    generados = set()
    fallidos = []
    
    for i, c in enumerate(clientes, 1):
        try:
            id_cliente = c['id_cliente']
            linea = c['linea']
            nombre_cliente = c['nombre_cliente']
            alias = (c.get('alias') or "").strip()

            # Línea compacta con resultado
            print(f"[{i}/{len(clientes)}] {nombre_cliente} - {alias}...", end=" ")

            etiqueta = get_fecha_reporte(tipo, FECHA_HOY)
            pdf_path = generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, tipo, etiqueta)
            
            if pdf_path is None:
                print("❌")
                fallidos.append({
                    'nombre_cliente': nombre_cliente,
                    'alias': alias,
                    'tipo': tipo,
                    'etiqueta': etiqueta
                })
                continue
                
            print("✅")
            generados.add(os.path.basename(pdf_path))
            
            # Subir a Google Drive si es semanal
            if tipo == "semanal" and not upload_to_google_drive(pdf_path):
                print(f"  ⚠️ Error subiendo a Google Drive")
                    
        except Exception as e:
            print("❌")
            fallidos.append({
                'nombre_cliente': nombre_cliente,
                'alias': alias,
                'tipo': tipo,
                'error': str(e)
            })
    
    print(f"\n📈 Resumen: {len(generados)} PDFs generados de {len(clientes)} clientes")
    if fallidos:
        print(f"⚠️ {len(fallidos)} PDFs fallaron en la generación")
    
    return generados, fallidos


def enviar_por_recipients(config: dict, seccion: str, failed_generation_pdfs: list = None):
    """
    Envía correos basándose directamente en recipients.json.
    Busca archivos PDF que coincidan con los nombres especificados.
    """
    missing_files = []
    sent_files = []
    archivos_enviados = set()

    # Obtener lista de archivos PDF generados
    pdf_files = glob.glob(os.path.join(DOWNLOADS_FOLDER, "*.pdf"))
    
    print(f"\n� Enviando correos para {len(pdf_files)} archivos PDF...")

    for recipient in config.get(seccion, []):
        archivos = recipient.get('files', [])
        for file_cfg in archivos:
            # Construir nombre esperado del archivo
            if seccion == "diarios":
                etiqueta = get_fecha_reporte("diario", FECHA_HOY)
                expected_name = file_cfg['fileName'].replace("{fecha}", etiqueta) + ".pdf"
            else:
                etiqueta = get_fecha_reporte("semanal", FECHA_HOY)
                expected_name = file_cfg['fileName'].replace("{fecha_str}", etiqueta.split(' ')[0]) + ".pdf"
            
            # Buscar archivo que coincida exactamente
            matching_file = None
            for pdf_file in pdf_files:
                if os.path.basename(pdf_file) == expected_name:
                    matching_file = pdf_file
                    break
            
            # Si no encuentra exacto, buscar por coincidencia parcial
            if not matching_file:
                file_name_base = file_cfg['fileName'].split(' {')[0]  # Quitar parte de fecha
                for pdf_file in pdf_files:
                    if file_name_base in os.path.basename(pdf_file) and etiqueta.split(' ')[0] in os.path.basename(pdf_file):
                        matching_file = pdf_file
                        break
            
            if matching_file and os.path.exists(matching_file):
                pdf_name = os.path.basename(matching_file)
                
                # Verificar si ya fue enviado
                if pdf_name in archivos_enviados:
                    continue
                
                if send_mail(recipient, matching_file):
                    sent_files.append(pdf_name)
                    archivos_enviados.add(pdf_name)
                    
                    try:
                        os.remove(matching_file)
                        pdf_files.remove(matching_file)
                    except Exception as e:
                        print(f"⚠️ No se pudo eliminar {pdf_name}: {e}")
            else:
                # Cliente inactivo check
                if "Penox" not in file_cfg['fileName']:
                    missing_files.append(expected_name)

    print(f"📈 Enviados: {len(sent_files)} | Faltantes: {len(missing_files)}")
    
    # Enviar correo de error si hay problemas
    if missing_files or failed_generation_pdfs:
        send_error_mail(missing_files=missing_files, failed_pdfs=failed_generation_pdfs)


def main():    
    os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)
    
    # Limpiar PDFs antiguos antes de generar nuevos
    clean_pdfs_folder()
    
    inicio_total = time.time()

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
        print("\n=== DIARIOS ===")
        pdfs_generados, pdfs_fallidos = generar_todos_los_pdfs(clientes_diarios, "diario")
        enviar_por_recipients(recipients_cfg, "diarios", pdfs_fallidos)
    else:
        print("\n=== DIARIOS omitidos ===")

    # ---- SEMANALES ----
    if ejecutar_semanales and recipients_cfg.get("semanales"):
        print("\n=== SEMANALES ===")
        pdfs_generados, pdfs_fallidos = generar_todos_los_pdfs(clientes_semanales, "semanal")
        enviar_por_recipients(recipients_cfg, "semanales", pdfs_fallidos)
    else:
        print("\n=== SEMANALES omitidos ===")

    fin_total = time.time()
    print(f"\n✅ Proceso finalizado en {fin_total - inicio_total:.2f}s")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️ Proceso cancelado por el usuario. Limpiando PDFs generados...")
        clean_pdfs_folder()
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        
        # Enviar correo de error crítico a los administradores
        try:
            error_info = [{
                'nombre_cliente': 'Sistema',
                'alias': 'Error General',
                'tipo': 'crítico',
                'error': str(e)
            }]
            send_error_mail(failed_pdfs=error_info)
        except Exception as email_error:
            print(f"❌ No se pudo enviar correo de error: {email_error}")
        
        # Solo limpiar PDFs si el error no está relacionado con envío de correos
        if "No such file or directory" not in str(e) and "FileNotFoundError" not in str(e):
            print("Limpiando PDFs generados...")
            clean_pdfs_folder()
        else:
            print("Error relacionado con archivos. No se limpiarán PDFs automáticamente.")
            print("Revise los logs para identificar el problema específico.")