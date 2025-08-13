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
        print("Obteniendo lista de clientes de la API...")
        response = requests.get("http://127.0.0.1:8000/report/clients-data", timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            diarios = data.get("diarios", [])
            semanales = data.get("semanales", [])
            
            print(f"Encontrados {len(diarios)} clientes diarios y {len(semanales)} clientes semanales")
            
            return {
                "diarios": diarios,
                "semanales": semanales
            }
        else:
            print(f"❌ Error al obtener clientes: {response.status_code}")
            print(f"📄 Contenido de error: {response.text}")
    except Exception as e:
        print(f"❌ Excepción al llamar a API de clientes: {e}")
        import traceback
        print(f"📋 Traceback completo: {traceback.format_exc()}")
    
    print("⚠️ Retornando listas vacías debido a error en API")
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
            page.goto(url, timeout=300000)

            print("Esperando que frontend avise que terminó de renderizar...")
            try:
                page.wait_for_function("window.status === 'pdf-ready' || window.status === 'data-error'", timeout=300000)
                
                # Verificar si hay error de datos
                status = page.evaluate("() => window.status")
                if status == "data-error":
                    print(f"ERROR: Datos inválidos para cliente {id_cliente}, línea {linea}. Cancelando generación de PDF.")
                    browser.close()
                    return None
                    
                print("Frontend listo, generando PDF...")
            except Exception as e:
                print(f"Error esperando estado del frontend: {e}")
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
            print(f"Abriendo URL: {url}")
            page.goto(url, timeout=600000)

            try:
                page.wait_for_function("window.status === 'pdf-ready' || window.status === 'data-error'", timeout=600000)
                
                # Verificar si hay error de datos
                status = page.evaluate("() => window.status")
                if status == "data-error":
                    print(f"ERROR: Datos inválidos para cliente {id_cliente}, línea {linea}. Cancelando generación de PDF.")
                    browser.close()
                    return None
                    
                print("Frontend listo, generando PDF semanal...")
            except Exception as e:
                print(f"Error esperando estado del frontend: {e}")
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
    Si el tipo es 'semanal', también sube los archivos a Google Drive.
    """
    print(f"\nGenerando PDFs {tipo} para {len(clientes)} clientes...")
    
    generados = set()
    for i, c in enumerate(clientes, 1):
        try:
            id_cliente = c['id_cliente']
            linea = c['linea']
            nombre_cliente = c['nombre_cliente']
            alias = (c.get('alias') or "").strip()

            print(f"[{i}/{len(clientes)}] {nombre_cliente} - {alias}...")

            etiqueta = get_fecha_reporte(tipo, FECHA_HOY)
            pdf_path = generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, tipo, etiqueta)
            
            if pdf_path is None:
                print(f"  Error: datos inválidos para {nombre_cliente}")
                continue
                
            generados.add(os.path.basename(pdf_path))
            
            # Subir a Google Drive si es semanal
            if tipo == "semanal" and not upload_to_google_drive(pdf_path):
                print(f"  Error: no se pudo subir a Google Drive")
                    
        except Exception as e:
            print(f"  Error: {e}")
    
    print(f"\n📈 Resumen de generación {tipo}:")
    print(f"  ✅ PDFs generados exitosamente: {len(generados)}")
    print(f"  📁 Archivos creados:")
    for archivo in sorted(generados):
        print(f"    - {archivo}")
    
    return generados


def enviar_por_recipients(config: dict, seccion: str):
    """
    - seccion: 'diarios' | 'semanales'
    - Usa config['diarios'] o config['semanales'].
    - Busca archivos generados que coincidan con los patrones de recipients.json
    - Solo envía correos para archivos que realmente existen (fueron generados exitosamente)
    """
    missing_files = []
    sent_files = []
    processed_files = set()  # Rastrear archivos ya procesados para evitar duplicados

    # Obtener lista de archivos PDF generados
    pdf_files = glob.glob(os.path.join(DOWNLOADS_FOLDER, "*.pdf"))
    pdf_basenames = [os.path.basename(f) for f in pdf_files]
    
    print(f"\n📂 Archivos PDF encontrados en {DOWNLOADS_FOLDER}:")
    for pdf in pdf_basenames:
        print(f"  - {pdf}")

    for recipient in config.get(seccion, []):
        archivos = recipient.get('files', [])
        for file_cfg in archivos:
            date_offset = int(file_cfg.get('dateOffset', -1 if seccion == 'diarios' else 0))
            
            if seccion == "diarios":
                etiqueta = get_fecha_reporte("diario", FECHA_HOY)
                # Para diarios, buscar archivos que contengan la fecha
                expected_date = etiqueta
                matching_files = [f for f in pdf_files if expected_date in os.path.basename(f) and "Diario" in os.path.basename(f)]
                
                # Filtrado más específico para diarios basado en el fileName template
                file_name_template = file_cfg['fileName']
                if "ALLTANSA" in file_name_template:
                    matching_files = [f for f in matching_files if "ALLTANSA" in os.path.basename(f) and "Primario" in os.path.basename(f)]
                elif "Power Paint Solutions Primario" in file_name_template:
                    matching_files = [f for f in matching_files if "Power Paint Solutions" in os.path.basename(f) and "Primario" in os.path.basename(f)]
                elif "Power Paint Solutions Secundario" in file_name_template:
                    matching_files = [f for f in matching_files if "Power Paint Solutions" in os.path.basename(f) and "Secundario" in os.path.basename(f)]
                elif "Penox Mexico Compresor 1" in file_name_template:
                    matching_files = [f for f in matching_files if "Penox" in os.path.basename(f) and "Compresor 1" in os.path.basename(f)]
                elif "Penox Mexico Compresor 2" in file_name_template:
                    matching_files = [f for f in matching_files if "Penox" in os.path.basename(f) and "Compresor 2" in os.path.basename(f)]
                elif "Manttra Gimsa" in file_name_template:
                    matching_files = [f for f in matching_files if "Manttra Gimsa" in os.path.basename(f)]
                elif "Calidra HORNO 5" in file_name_template:
                    matching_files = [f for f in matching_files if "Calidra" in os.path.basename(f) and "HORNO 5" in os.path.basename(f)]
                elif "Calidra HORNO MEARZ" in file_name_template:
                    matching_files = [f for f in matching_files if "Calidra" in os.path.basename(f) and "HORNO MEARZ" in os.path.basename(f)]
                elif "Calidra" in file_name_template:
                    matching_files = [f for f in matching_files if "Calidra" in os.path.basename(f)]
                elif "Liebherr" in file_name_template:
                    matching_files = [f for f in matching_files if "Liebherr" in os.path.basename(f)]
                elif "Linamar" in file_name_template:
                    matching_files = [f for f in matching_files if "Linamar" in os.path.basename(f)]
                elif "BCI" in file_name_template:
                    matching_files = [f for f in matching_files if "BCI" in os.path.basename(f)]
                elif "Daltile" in file_name_template:
                    matching_files = [f for f in matching_files if "Daltile" in os.path.basename(f)]
                elif "Impac" in file_name_template:
                    matching_files = [f for f in matching_files if "Impac" in os.path.basename(f)]
                
            else:
                # Para semanales, buscar archivos que contengan la fecha y "Semanal"
                fecha_str = get_fecha_reporte("diario", FECHA_HOY)
                
                # Buscar archivos por patrones específicos según el cliente
                file_name_template = file_cfg['fileName']
                keywords = []
                
                # Extraer palabras clave del nombre del archivo
                if "Altansa" in file_name_template or "ALLTANSA" in file_name_template:
                    keywords = ["ALLTANSA"]
                elif "Impac" in file_name_template:
                    keywords = ["Impac", "Compresor " + ("1" if "75hp" in file_name_template else "2")]
                elif "Daltile" in file_name_template:
                    keywords = ["Daltile", file_name_template.split()[-1]]  # Extraer el código ACM
                else:
                    # Para otros clientes, usar la primera palabra del template
                    keywords = [next(word for word in file_name_template.split() if word not in ["Diario", "Semanal"])]
                
                # Buscar archivos que coincidan con todas las palabras clave
                matching_files = [
                    f for f in pdf_files 
                    if all(keyword in os.path.basename(f) for keyword in keywords)
                    and "Semanal" in os.path.basename(f) 
                    and fecha_str in os.path.basename(f)
                ]

            if matching_files:
                # Filtrar archivos que no han sido procesados aún
                unprocessed_files = [f for f in matching_files if os.path.basename(f) not in processed_files]
                # Verificar si el archivo todavía existe antes de intentar enviarlo
                existing_files = [f for f in unprocessed_files if os.path.exists(f)]
                
                if existing_files:
                    # Enviar el primer archivo que coincida y que todavía exista
                    pdf_path = existing_files[0]
                    pdf_name = os.path.basename(pdf_path)
                    print(f"📧 Enviando archivo: {pdf_name}")
                    
                    try:
                        send_mail(recipient, pdf_path)
                        sent_files.append(pdf_name)
                        processed_files.add(pdf_name)  # Marcar como procesado
                        try:
                            os.remove(pdf_path)
                            print(f"🗑️ Archivo eliminado: {pdf_name}")
                        except Exception as e:
                            print(f"⚠️ No se pudo eliminar {pdf_name}: {e}")
                    except FileNotFoundError:
                        print(f"❌ Error: El archivo {pdf_name} ya no existe. Probablemente fue enviado en una iteración anterior.")
                        processed_files.add(pdf_name)  # Marcar como procesado para evitar futuros intentos
                    except Exception as e:
                        print(f"❌ Error enviando correo para {pdf_name}: {e}")
                        # No agregamos a processed_files para permitir reintento en caso de error temporal
                else:
                    # El archivo fue encontrado pero ya no existe o ya fue procesado
                    file_name_template = file_cfg['fileName']
                    if any(os.path.basename(f) in processed_files for f in matching_files):
                        print(f"⚠️ Archivo ya fue procesado anteriormente: {file_name_template}")
                    else:
                        print(f"⚠️ Archivo encontrado pero ya no existe: {file_name_template}")
            else:
                # Solo agregar a missing_files si el cliente no parece estar inactivo
                file_name_template = file_cfg['fileName']
                
                # Determinar si es un cliente que probablemente está inactivo
                is_likely_inactive = False
                if "Penox" in file_name_template:
                    # Penox parece estar inactivo ya que no aparece en la API
                    is_likely_inactive = True
                    print(f"⚠️ Cliente Penox parece estar inactivo - saltando: {file_name_template}")
                
                if not is_likely_inactive:
                    # Construir nombre esperado para el error solo si no es un cliente inactivo
                    if seccion == "diarios":
                        expected_name = file_cfg['fileName'].replace("{fecha}", etiqueta) + ".pdf"
                    else:
                        expected_name = file_cfg['fileName'] + ".pdf"
                    print(f"❌ No se encontró archivo que coincida con: {file_cfg['fileName']}")
                    missing_files.append(expected_name)

    print(f"\n📈 Resumen de envío de {seccion}:")
    print(f"  ✅ Archivos enviados: {len(sent_files)}")
    print(f"  ❌ Archivos faltantes: {len(missing_files)}")
    
    if missing_files:
        print(f"  📋 Archivos faltantes:")
        for mf in missing_files:
            print(f"    - {mf}")
        send_error_mail(missing_files, ADMIN_CORREOS)
    else:
        print("  🎉 Todos los reportes disponibles fueron enviados exitosamente!")


def main():    
    os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)
    
    # Limpiar PDFs antiguos antes de generar nuevos
    print("🧹 Limpiando PDFs antiguos...")
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
        print("\n=== Generando DIARIOS ===")
        
        # Mostrar lista de clientes que se van a procesar
        for i, cliente in enumerate(clientes_diarios, 1):
            print(f"  {i}. {cliente.get('nombre_cliente')} - {cliente.get('alias')} (ID: {cliente.get('id_cliente')}, Línea: {cliente.get('linea')})")
        
        generar_todos_los_pdfs(clientes_diarios, "diario")
        enviar_por_recipients(recipients_cfg, "diarios")
    else:
        print("\n=== DIARIOS omitidos ===")
        if not ejecutar_diarios:
            print("Razón: SOLO_TIPO no incluye 'diario'")
        if not recipients_cfg.get("diarios"):
            print("Razón: No hay configuración de recipients para diarios")

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
        print(f"\n❌ Error inesperado: {e}")
        # Solo limpiar PDFs si el error no está relacionado con envío de correos
        if "No such file or directory" not in str(e) and "FileNotFoundError" not in str(e):
            print("Limpiando PDFs generados...")
            clean_pdfs_folder()
        else:
            print("Error relacionado con archivos. No se limpiarán PDFs automáticamente.")
            print("Revise los logs para identificar el problema específico.")