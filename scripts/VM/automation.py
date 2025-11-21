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


# ------------- Verificaciones previas -------------
def verificar_conectividad():
    """Verifica que los servicios necesarios estén disponibles."""
    print(f"\n🔍 === VERIFICACIONES PREVIAS ===")
    
    # Verificar API FastAPI
    print(f"🌐 Verificando API FastAPI...")
    try:
        response = requests.get("http://127.0.0.1:8000/", timeout=10)
        if response.status_code == 200:
            print(f"✅ API FastAPI disponible en puerto 8000")
        else:
            print(f"⚠️ API FastAPI responde pero con código: {response.status_code}")
    except Exception as e:
        print(f"❌ API FastAPI no disponible: {e}")
        print(f"   💡 Asegúrate de ejecutar: uvicorn scripts.api_server:app --reload")
    
    # Verificar Next.js
    print(f"🌐 Verificando servidor Next.js...")
    try:
        response = requests.get("http://localhost:3000/", timeout=10)
        if response.status_code == 200:
            print(f"✅ Servidor Next.js disponible en puerto 3000")
        else:
            print(f"⚠️ Next.js responde pero con código: {response.status_code}")
    except Exception as e:
        print(f"❌ Servidor Next.js no disponible: {e}")
        print(f"   💡 Asegúrate de ejecutar: npm run dev")
    
    # Verificar Playwright
    print(f"🎭 Verificando Playwright...")
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            browser.close()
        print(f"✅ Playwright funcional")
    except Exception as e:
        print(f"❌ Error con Playwright: {e}")
        print(f"   💡 Asegúrate de ejecutar: playwright install")


# ------------- API clientes -------------
def obtener_clientes_desde_api():
    """
    Espera un payload:
    {
      "diarios": [ {id_cliente, linea, nombre_cliente, alias}, ... ],
      "semanales": [ {id_cliente, linea, nombre_cliente, alias}, ... ]
    }
    """
    api_url = "http://127.0.0.1:8000/report/clients-data"
    print(f"🌐 Conectando a API: {api_url}")
    
    try:
        print(f"⏳ Realizando petición HTTP...")
        response = requests.get(api_url, timeout=60)
        
        print(f"📡 Código de respuesta: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ Respuesta exitosa de la API")
            data = response.json()
            diarios = data.get("diarios", [])
            semanales = data.get("semanales", [])
            
            print(f"� Datos obtenidos:")
            print(f"   📅 Clientes diarios: {len(diarios)}")
            print(f"   📊 Clientes semanales: {len(semanales)}")
            
            # Mostrar detalles de clientes diarios
            if diarios:
                print(f"📋 Lista de clientes diarios:")
                for i, cliente in enumerate(diarios, 1):
                    print(f"   {i:2d}. {cliente.get('nombre_cliente', 'N/A')} - {cliente.get('alias', 'N/A')} (ID: {cliente.get('id_cliente', 'N/A')})")
            
            # Mostrar detalles de clientes semanales
            if semanales:
                print(f"📋 Lista de clientes semanales:")
                for i, cliente in enumerate(semanales, 1):
                    print(f"   {i:2d}. {cliente.get('nombre_cliente', 'N/A')} - {cliente.get('alias', 'N/A')} (ID: {cliente.get('id_cliente', 'N/A')})")
            
            return {
                "diarios": diarios,
                "semanales": semanales
            }
        else:
            print(f"❌ Error de la API - Código: {response.status_code}")
            print(f"📄 Contenido de respuesta: {response.text[:500]}...")
            
    except requests.exceptions.Timeout:
        print(f"❌ Timeout conectando a la API después de 60 segundos")
    except requests.exceptions.ConnectionError:
        print(f"❌ Error de conexión - Verifica que la API esté corriendo en {api_url}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de petición HTTP: {e}")
    except Exception as e:
        print(f"❌ Error inesperado obteniendo clientes: {e}")
    
    print(f"⚠️ Retornando lista vacía debido a errores")
    return {"diarios": [], "semanales": []}


# ------------- API para reportes de mantenimiento -------------
def obtener_registros_mantenimiento_pendientes():
    """
    Obtiene todos los registros de mantenimiento donde 'generado' es NULL.
    Retorna lista de diccionarios con id, numero_serie, cliente, etc.
    """
    api_url = "http://127.0.0.1:8000/web/maintenance/pending-reports"
    print(f"🔧 Obteniendo reportes de mantenimiento pendientes...")
    
    try:
        response = requests.get(api_url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            registros = data.get("registros", [])
            print(f"✅ {len(registros)} reportes de mantenimiento pendientes")
            return registros
        else:
            print(f"❌ Error API mantenimiento - Código: {response.status_code}")
            return []
            
    except Exception as e:
        print(f"❌ Error obteniendo reportes pendientes: {e}")
        return []


def marcar_reporte_generado(registro_id: int):
    """Marca un registro de mantenimiento como generado."""
    api_url = f"http://127.0.0.1:8000/web/maintenance/mark-generated/{registro_id}"
    
    try:
        response = requests.put(api_url, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error marcando reporte como generado: {e}")
        return False


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
    
    print(f"\n🔍 DEBUG - Iniciando generación PDF:")
    print(f"   📋 Cliente: {nombre_cliente} - {alias_limpio}")
    print(f"   🆔 ID: {id_cliente}, Línea: {linea}")
    print(f"   📄 Archivo: {nombre_archivo}")

    try:
        with sync_playwright() as p:
            print(f"   🌐 Iniciando navegador...")
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_viewport_size({"width": 1920, "height": 1080})

            if tipo == "diario":
                url = f"http://localhost:3000/automation/reportesD?id_cliente={id_cliente}&linea={linea}"
                print(f"   🔗 URL Diario: {url}")
                
                try:
                    print(f"   ⏳ Navegando a la página...")
                    page.goto(url, timeout=300000) 
                    print(f"   ✅ Página cargada, esperando contenido...")

                    page.wait_for_function("window.status === 'pdf-ready' || window.status === 'data-error'", timeout=300000)
                    
                    # Verificar status
                    status = page.evaluate("() => window.status")
                    print(f"   📊 Status de la página: {status}")
                    
                    if status == "data-error":
                        print(f"   ❌ Error de datos reportado por la página")
                        browser.close()
                        return None

                    print(f"   📏 Calculando altura de la página...")
                    page_height = page.evaluate("() => document.body.scrollHeight")
                    print(f"   📐 Altura calculada: {page_height}px")
                    
                    print(f"   🖨️ Generando PDF...")
                    page.pdf(
                        path=pdf_path,
                        width="1920px",
                        height=f"{page_height}px",
                        print_background=True,
                        margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
                    )

                except Exception as e:
                    print(f"   ❌ Error en proceso diario: {str(e)}")
                    browser.close()
                    return None

            else:  # semanal
                url = f"http://localhost:3000/automation/reportesS?id_cliente={id_cliente}&linea={linea}"
                print(f"   🔗 URL Semanal: {url}")
                
                try:
                    print(f"   ⏳ Navegando a la página...")
                    page.goto(url, timeout=300000)  # Reducido a 300s
                    print(f"   ✅ Página cargada, esperando contenido...")

                    # Esperar que la página esté lista
                    page.wait_for_function("window.status === 'pdf-ready' || window.status === 'data-error'", timeout=300000)
                    
                    # Verificar status
                    status = page.evaluate("() => window.status")
                    print(f"   📊 Status de la página: {status}")
                    
                    if status == "data-error":
                        print(f"   ❌ Error de datos reportado por la página")
                        browser.close()
                        return None

                    print(f"   📏 Calculando altura de la página...")
                    full_height = page.evaluate("""
                    () => Math.max(
                        document.body.scrollHeight,
                        document.documentElement.scrollHeight
                    )
                    """)
                    safe_height = max(int(full_height) - 2, 1)
                    print(f"   📐 Altura calculada: {full_height}px, ajustada: {safe_height}px")

                    print(f"   🖨️ Generando PDF...")
                    page.pdf(
                        path=pdf_path,
                        width="1920px",
                        height=f"{safe_height}px",
                        print_background=True,
                        margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
                    )

                except Exception as e:
                    print(f"   ❌ Error en proceso semanal: {str(e)}")
                    browser.close()
                    return None

            browser.close()
            
            # Verificar que el archivo se creó correctamente
            if os.path.exists(pdf_path):
                file_size = os.path.getsize(pdf_path)
                print(f"   ✅ PDF generado exitosamente - Tamaño: {file_size} bytes")
                return pdf_path
            else:
                print(f"   ❌ El archivo PDF no se encontró después de la generación")
                return None
                
    except Exception as e:
        print(f"   ❌ Error general en generación PDF: {str(e)}")
        return None


def generar_pdf_reporte_mantenimiento(registro_id: int, numero_serie: str, cliente: str, fecha: str) -> str:
    """
    Genera PDF de reporte de mantenimiento usando la página mtto-report.
    
    Args:
        registro_id: ID del registro de mantenimiento
        numero_serie: Número de serie del compresor
        cliente: Nombre del cliente
        fecha: Fecha del mantenimiento (YYYY-MM-DD)
    
    Returns:
        str: Ruta del PDF generado o None si falla
    """
    # Sanitizar nombre de archivo
    cliente_limpio = cliente.replace("/", "-").replace("\\", "-")
    nombre_archivo = f"Reporte Mantenimiento {cliente_limpio} {numero_serie} {fecha}.pdf"
    pdf_path = os.path.join(DOWNLOADS_FOLDER, nombre_archivo)
    
    print(f"\n🔧 Generando reporte de mantenimiento:")
    print(f"   📋 Cliente: {cliente}")
    print(f"   🔢 Número Serie: {numero_serie}")
    print(f"   🆔 Registro ID: {registro_id}")
    print(f"   📄 Archivo: {nombre_archivo}")

    try:
        with sync_playwright() as p:
            print(f"   🌐 Iniciando navegador...")
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_viewport_size({"width": 1920, "height": 1080})

            url = f"http://localhost:3000/automation/mtto-report?id={registro_id}"
            print(f"   🔗 URL: {url}")
            
            try:
                print(f"   ⏳ Navegando a la página...")
                page.goto(url, timeout=180000)  # 3 minutos
                print(f"   ✅ Página cargada, esperando contenido...")

                # Esperar señal de la página
                page.wait_for_function(
                    "window.status === 'pdf-ready' || window.status === 'data-error'",
                    timeout=180000
                )
                
                # Verificar status
                status = page.evaluate("() => window.status")
                print(f"   📊 Status de la página: {status}")
                
                if status == "data-error":
                    print(f"   ❌ Error de datos reportado por la página")
                    browser.close()
                    return None

                print(f"   📏 Calculando altura de la página...")
                full_height = page.evaluate("""
                () => Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight
                )
                """)
                safe_height = max(int(full_height) - 2, 1)
                print(f"   📐 Altura calculada: {full_height}px, ajustada: {safe_height}px")
                
                print(f"   🖨️ Generando PDF...")
                page.pdf(
                    path=pdf_path,
                    width="1920px",
                    height=f"{safe_height}px",
                    print_background=True,
                    margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
                )

                print(f"   ✅ PDF generado exitosamente")

            except Exception as e:
                print(f"   ❌ Error en proceso de generación: {str(e)}")
                browser.close()
                return None

            browser.close()
            
            # Verificar que el archivo se creó correctamente
            if os.path.exists(pdf_path):
                file_size = os.path.getsize(pdf_path)
                print(f"   ✅ Archivo creado - Tamaño: {file_size} bytes")
                
                # Marcar como generado en la base de datos
                if marcar_reporte_generado(registro_id):
                    print(f"   ✅ Registro marcado como generado en BD")
                else:
                    print(f"   ⚠️ No se pudo marcar como generado en BD")
                
                return pdf_path
            else:
                print(f"   ❌ El archivo PDF no se encontró después de la generación")
                return None
                
    except Exception as e:
        print(f"   ❌ Error general: {str(e)}")
        return None


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
    print(f"\n🚀 === INICIO GENERACIÓN PDFs {tipo.upper()} ===")
    print(f"📊 Total de clientes a procesar: {len(clientes)}")
    print(f"📁 Carpeta de destino: {DOWNLOADS_FOLDER}")
    
    # Verificar que la carpeta existe
    os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)
    
    generados = set()
    fallidos = []
    inicio_proceso = time.time()
    
    for i, c in enumerate(clientes, 1):
        inicio_cliente = time.time()
        try:
            id_cliente = c['id_cliente']
            linea = c['linea']
            nombre_cliente = c['nombre_cliente']
            alias = (c.get('alias') or "").strip()

            print(f"\n{'='*60}")
            print(f"🔄 [{i}/{len(clientes)}] Procesando: {nombre_cliente} - {alias}")
            print(f"🆔 ID Cliente: {id_cliente} | Línea: {linea}")

            etiqueta = get_fecha_reporte(tipo, FECHA_HOY)
            print(f"📅 Etiqueta fecha: {etiqueta}")
            
            pdf_path = generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, tipo, etiqueta)
            
            tiempo_cliente = time.time() - inicio_cliente
            
            if pdf_path is None:
                print(f"❌ FALLÓ - Cliente: {nombre_cliente} - {alias} (Tiempo: {tiempo_cliente:.2f}s)")
                fallidos.append({
                    'nombre_cliente': nombre_cliente,
                    'alias': alias,
                    'tipo': tipo,
                    'etiqueta': etiqueta,
                    'id_cliente': id_cliente,
                    'linea': linea,
                    'tiempo_procesamiento': tiempo_cliente
                })
                continue
                
            print(f"✅ ÉXITO - PDF generado en {tiempo_cliente:.2f}s")
            pdf_name = os.path.basename(pdf_path)
            generados.add(pdf_name)
            
            # Subir a Google Drive si es semanal
            if tipo == "semanal":
                print(f"☁️ Subiendo a Google Drive...")
                if upload_to_google_drive(pdf_path):
                    print(f"✅ Subido a Google Drive exitosamente")
                else:
                    print(f"⚠️ Error subiendo a Google Drive")
                    
        except Exception as e:
            tiempo_cliente = time.time() - inicio_cliente
            print(f"❌ EXCEPCIÓN - Cliente: {nombre_cliente} - {alias}")
            print(f"   Error: {str(e)}")
            print(f"   Tiempo: {tiempo_cliente:.2f}s")
            fallidos.append({
                'nombre_cliente': nombre_cliente,
                'alias': alias,
                'tipo': tipo,
                'error': str(e),
                'id_cliente': id_cliente,
                'linea': linea,
                'tiempo_procesamiento': tiempo_cliente
            })
    
    tiempo_total = time.time() - inicio_proceso
    
    print(f"\n{'='*60}")
    print(f"📈 === RESUMEN FINAL {tipo.upper()} ===")
    # print(f"✅ PDFs generados exitosamente: {len(generados)}")
    print(f"❌ PDFs fallidos: {len(fallidos)}")
    print(f"⏱️ Tiempo total del proceso: {tiempo_total:.2f}s")
    print(f"⚡ Tiempo promedio por cliente: {tiempo_total/len(clientes):.2f}s")
    
    if generados:
        print(f"\n📄 Archivos generados:")
        for archivo in sorted(generados):
            print(f"   ✅ {archivo}")
    
    if fallidos:
        print(f"\n🚨 Clientes fallidos:")
        for falla in fallidos:
            print(f"   ❌ {falla['nombre_cliente']} - {falla['alias']}")
            if 'error' in falla:
                print(f"      Error: {falla['error']}")
            print(f"      Tiempo: {falla.get('tiempo_procesamiento', 0):.2f}s")
    
    return generados, fallidos


def generar_reportes_mantenimiento_pendientes() -> tuple[int, int]:
    """
    Genera todos los reportes de mantenimiento pendientes (donde generado es NULL).
    
    Returns:
        tuple: (exitosos, fallidos)
    """
    print(f"\n🔧 === PROCESANDO REPORTES DE MANTENIMIENTO PENDIENTES ===")
    
    registros = obtener_registros_mantenimiento_pendientes()
    
    if not registros:
        print(f"✅ No hay reportes de mantenimiento pendientes")
        return 0, 0
    
    print(f"📋 Total de reportes pendientes: {len(registros)}")
    
    exitosos = 0
    fallidos = 0
    inicio_proceso = time.time()
    
    for i, registro in enumerate(registros, 1):
        inicio_registro = time.time()
        
        try:
            registro_id = registro['id']
            numero_serie = registro['numero_serie']
            cliente = registro.get('cliente', 'Cliente')
            fecha = registro.get('fecha', datetime.now().strftime('%Y-%m-%d'))
            
            print(f"\n{'='*60}")
            print(f"🔧 [{i}/{len(registros)}] Procesando reporte de mantenimiento")
            print(f"   🆔 ID: {registro_id}")
            print(f"   📋 Cliente: {cliente}")
            print(f"   🔢 Serie: {numero_serie}")
            
            pdf_path = generar_pdf_reporte_mantenimiento(
                registro_id=registro_id,
                numero_serie=numero_serie,
                cliente=cliente,
                fecha=fecha
            )
            
            tiempo_registro = time.time() - inicio_registro
            
            if pdf_path:
                print(f"✅ ÉXITO - Reporte generado en {tiempo_registro:.2f}s")
                exitosos += 1
            else:
                print(f"❌ FALLÓ - Reporte no generado (Tiempo: {tiempo_registro:.2f}s)")
                fallidos += 1
                
        except Exception as e:
            tiempo_registro = time.time() - inicio_registro
            print(f"❌ EXCEPCIÓN - Registro ID: {registro.get('id', 'N/A')}")
            print(f"   Error: {str(e)}")
            print(f"   Tiempo: {tiempo_registro:.2f}s")
            fallidos += 1
    
    tiempo_total = time.time() - inicio_proceso
    
    print(f"\n{'='*60}")
    print(f"📈 === RESUMEN REPORTES DE MANTENIMIENTO ===")
    print(f"✅ Exitosos: {exitosos}")
    print(f"❌ Fallidos: {fallidos}")
    print(f"⏱️ Tiempo total: {tiempo_total:.2f}s")
    if len(registros) > 0:
        print(f"⚡ Tiempo promedio: {tiempo_total/len(registros):.2f}s")
    
    return exitosos, fallidos


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
    print(f"🚀 === INICIO PROCESO AUTOMATION.PY ===")
    print(f"📅 Fecha de ejecución: {FECHA_HOY.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🏠 Directorio base: {BASE_DIR}")
    print(f"📁 Carpeta PDFs: {DOWNLOADS_FOLDER}")
    print(f"📧 SMTP desde: {SMTP_FROM}")
    print(f"📝 Archivo recipients: {recipients_path}")
    print(f"🔧 Solo tipo: {SOLO_TIPO or 'auto'}")
    print(f"📊 Forzar semanales: {FORZAR_SEMANALES}")
    
    # Verificar conectividad
    verificar_conectividad()
    
    # Verificar archivos y carpetas esenciales
    print(f"\n🔍 Verificando archivos esenciales...")
    if not os.path.exists(recipients_path):
        print(f"❌ ERROR: No se encontró recipients.json en {recipients_path}")
        return
    else:
        print(f"✅ Recipients.json encontrado")
    
    os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)
    print(f"✅ Carpeta PDFs preparada")
    
    # Limpiar PDFs antiguos antes de generar nuevos
    print(f"\n🧹 Limpiando PDFs antiguos...")
    clean_pdfs_folder()
    
    inicio_total = time.time()

    # Carga recipients y clientes
    print(f"\n📋 Cargando configuración...")
    try:
        recipients_cfg = cargar_recipients()
        print(f"✅ Recipients cargados: {len(recipients_cfg.get('diarios', []))} diarios, {len(recipients_cfg.get('semanales', []))} semanales")
    except Exception as e:
        print(f"❌ Error cargando recipients: {e}")
        return
    
    print(f"\n🌐 Obteniendo clientes desde API...")
    try:
        clientes_api = obtener_clientes_desde_api()
        clientes_diarios = clientes_api.get("diarios", [])
        clientes_semanales = clientes_api.get("semanales", [])
        
        if not clientes_diarios and not clientes_semanales:
            print(f"⚠️ No se obtuvieron clientes de la API")
            return
            
    except Exception as e:
        print(f"❌ Error obteniendo clientes de la API: {e}")
        return

    # Determinar qué ejecutar
    ejecutar_diarios = (SOLO_TIPO in ("", "diario"))
    ejecutar_semanales = (SOLO_TIPO in ("", "semanal")) and debe_generar_semanales_hoy(FECHA_HOY)
    
    print(f"\n📋 Plan de ejecución:")
    print(f"   📊 Ejecutar diarios: {ejecutar_diarios} ({len(clientes_diarios)} clientes)")
    print(f"   📊 Ejecutar semanales: {ejecutar_semanales} ({len(clientes_semanales)} clientes)")

    # ---- DIARIOS ----
    if ejecutar_diarios and recipients_cfg.get("diarios"):
        print("\n" + "="*80)
        print("🌅 === PROCESANDO REPORTES DIARIOS ===")
        print("="*80)
        pdfs_generados, pdfs_fallidos = generar_todos_los_pdfs(clientes_diarios, "diario")
        print(f"\n📧 Iniciando envío de correos diarios...")
        enviar_por_recipients(recipients_cfg, "diarios", pdfs_fallidos)
        
        # ---- REPORTES DE MANTENIMIENTO (se ejecutan junto con diarios) ----
        print("\n" + "="*80)
        print("🔧 === VERIFICANDO REPORTES DE MANTENIMIENTO PENDIENTES ===")
        print("="*80)
        exitosos_mtto, fallidos_mtto = generar_reportes_mantenimiento_pendientes()
        
        if fallidos_mtto > 0:
            print(f"⚠️ Hay {fallidos_mtto} reportes de mantenimiento que fallaron")
        
    else:
        print("\n" + "="*80)
        print("🌅 === REPORTES DIARIOS OMITIDOS ===")
        if not ejecutar_diarios:
            print("   Razón: SOLO_TIPO configurado para otro tipo")
        elif not recipients_cfg.get("diarios"):
            print("   Razón: No hay configuración de diarios en recipients.json")
        print("="*80)

    # ---- SEMANALES ----
    if ejecutar_semanales and recipients_cfg.get("semanales"):
        print("\n" + "="*80)
        print("📊 === PROCESANDO REPORTES SEMANALES ===")
        print("="*80)
        pdfs_generados, pdfs_fallidos = generar_todos_los_pdfs(clientes_semanales, "semanal")
        print(f"\n📧 Iniciando envío de correos semanales...")
        enviar_por_recipients(recipients_cfg, "semanales", pdfs_fallidos)
    else:
        print("\n" + "="*80)
        print("📊 === REPORTES SEMANALES OMITIDOS ===")
        if not ejecutar_semanales:
            if not debe_generar_semanales_hoy(FECHA_HOY):
                print(f"   Razón: Hoy es {FECHA_HOY.strftime('%A')} - los semanales solo se ejecutan los lunes")
            else:
                print("   Razón: SOLO_TIPO configurado para otro tipo")
        elif not recipients_cfg.get("semanales"):
            print("   Razón: No hay configuración de semanales en recipients.json")
        print("="*80)

    fin_total = time.time()
    print(f"\n" + "="*80)
    print(f"🏁 === PROCESO COMPLETADO ===")
    print(f"⏱️ Tiempo total de ejecución: {fin_total - inicio_total:.2f} segundos")
    print(f"📅 Finalizado el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)


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