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
import locale
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.http import MediaFileUpload
import glob

try:
    locale.setlocale(locale.LC_TIME, "es_MX.UTF-8")
except Exception:
    pass

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS_FOLDER = os.path.join(BASE_DIR, "pdfs")

ALIAS_NAME = "VTO LOGIX"
SMTP_FROM = "andres.mirazo@ventologix.com"   # para login SMTP
FROM_ADDRESS = "vto@ventologix.com"          # remitente visible
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

LOGO_PATH = os.path.join(BASE_DIR, "public", "Logo vento firma.jpg")
VENTOLOGIX_LOGO_PATH = os.path.join(BASE_DIR, "public", "ventologix firma.jpg")

GOOGLE_DRIVE_FOLDER_ID = "19YM9co-kyogK7iXeJ-Wwq1VnrICr50Xk"
SCOPES = ['https://www.googleapis.com/auth/drive.file']
CREDENTIALS_FILE = os.path.join(BASE_DIR, "VM", "credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "VM", "token.json")

ADMIN_CORREOS = [
    "hector.tovar@ventologix.com",
    "andres.mirazo@ventologix.com"
]

recipients_path = os.getenv("RECIPIENTS_JSON",
                            "/home/hector_tovar/Ventologix/data/recipients.json")

FECHA_HOY = datetime.now()

def get_fecha_reporte(tipo: str = "diario", fecha_base: datetime = None) -> str:
    """Genera formato de fecha según el tipo de reporte."""
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



# --- Función para obtener clientes desde API ---
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
            
            print(f"📊 Datos obtenidos:")
            print(f"   📅 Clientes diarios: {len(diarios)}")
            print(f"   📊 Clientes semanales: {len(semanales)}")
            
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

# --- Función para generar PDF con Playwright ---
def generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, tipo, etiqueta_fecha):
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
                url = f"http://localhost:3000/reportesD?id_cliente={id_cliente}&linea={linea}"
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
                url = f"http://localhost:3000/reportesS?id_cliente={id_cliente}&linea={linea}"
                print(f"   🔗 URL Semanal: {url}")
                
                try:
                    print(f"   ⏳ Navegando a la página...")
                    page.goto(url, timeout=300000)
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

# --- Función para enviar correo ---
def send_mail(recipientConfig, pdf_file_path):
    """Envía correo con PDF adjunto y firmas."""
    msg = EmailMessage()
    msg['From'] = f"{ALIAS_NAME} <{FROM_ADDRESS}>"
    msg['Subject'] = recipientConfig['emailSubject']

    # Procesar destinatarios
    for field, key in [('To', 'email'), ('Cc', 'cc'), ('Bcc', 'bcc')]:
        if key in recipientConfig and recipientConfig[key]:
            value = recipientConfig[key]
            msg[field] = ", ".join(value if isinstance(value, list) else [value])

    # Generar IDs únicos para las imágenes
    logo_cid = make_msgid(domain='ventologix.com')
    firma_cid = make_msgid(domain='ventologix.com')

    # Crear cuerpo HTML con firma
    body = recipientConfig['emailBody'] + f"""
    <br><p><img src="cid:{logo_cid[1:-1]}" alt="Logo Ventologix" /></p>
    <p><img src="cid:{firma_cid[1:-1]}" alt="Ventologix Firma" /></p>
    <br>VTO logix<br>
    <a href='mailto:vto@ventologix.com'>vto@ventologix.com</a><br>
    <a href='https://www.ventologix.com'>www.ventologix.com</a><br>
    """

    # Configurar contenido
    msg.set_content("Este mensaje requiere un cliente con soporte HTML.")
    msg.add_alternative(body, subtype='html')

    # Adjuntar imágenes y PDF
    def attach_file(file_path, maintype, subtype, cid=None):
        if os.path.isfile(file_path):
            with open(file_path, 'rb') as f:
                data = f.read()
                if cid:
                    msg.get_payload()[1].add_related(data, maintype=maintype, subtype=subtype, cid=cid)
                else:
                    msg.add_attachment(data, maintype=maintype, subtype=subtype, 
                                     filename=os.path.basename(file_path))

    # Adjuntar logos
    attach_file(LOGO_PATH, 'image', 'jpeg', logo_cid)
    attach_file(VENTOLOGIX_LOGO_PATH, 'image', 'jpeg', firma_cid)
    # Adjuntar PDF
    attach_file(pdf_file_path, 'application', 'pdf')

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(SMTP_FROM, SMTP_PASSWORD)
            all_recipients = [addr.strip() for addr in (
                msg['To'].split(',') +
                (msg.get('Cc', '').split(',') if msg.get('Cc') else []) +
                (msg.get('Bcc', '').split(',') if msg.get('Bcc') else [])
            ) if addr.strip()]
            smtp.send_message(msg, to_addrs=all_recipients)
        print(f"Correo enviado a {msg['To']}")
    except Exception as e:
        print(f"Error al enviar correo: {e}")

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

def clean_pdfs_folder():
    """Elimina todos los archivos PDF generados en la carpeta pdfs."""
    for filename in os.listdir(DOWNLOADS_FOLDER):
        if filename.endswith(".pdf"):
            try:
                os.remove(os.path.join(DOWNLOADS_FOLDER, filename))
                print(f"Archivo eliminado: {filename}")
            except Exception as e:
                print(f"No se pudo eliminar {filename}: {e}")

# --- Función principal que junta todo ---
def main():
    print(f"🚀 === INICIO PROCESO RESEND REPORTS ===")
    
    if not os.path.exists(recipients_path):
        print(f"❌ ERROR: No se encontró recipients.json en {recipients_path}")
        return
    else:
        print(f"✅ Recipients.json encontrado")
    
    os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)
    print(f"✅ Carpeta PDFs preparada")

    print(f"\n🧹 Limpiando PDFs antiguos...")
    clean_pdfs_folder()

    inicio_total = time.time()
    pdfs_generados = []
    failed_pdfs = []

    while True:
        print(f"\n{'='*60}")
        tipo = input("¿Qué tipo de reporte deseas generar? (diario/semanal): ").strip().lower()
        if tipo not in ["diario", "semanal"]:
            print("❌ Tipo inválido. Debe ser 'diario' o 'semanal'.")
            continue

        print(f"\n🌐 Obteniendo clientes desde API...")
        try:
            clientes_data = obtener_clientes_desde_api()
            clientes = clientes_data["diarios" if tipo == "diario" else "semanales"]
            
            if not clientes:
                print(f"❌ No se encontraron clientes para el tipo {tipo}.")
                continue
                
        except Exception as e:
            print(f"❌ Error obteniendo clientes de la API: {e}")
            continue

        print(f"\n📋 Clientes disponibles para {tipo}:")
        for idx, cliente in enumerate(clientes):
            print(f"{idx + 1:2d}. {cliente['nombre_cliente']} (Alias: {cliente['alias']}, Línea: {cliente['linea']})")

        try:
            seleccion = int(input(f"\nSelecciona el número del cliente a generar PDF (1-{len(clientes)}): ")) - 1
        except ValueError:
            print("❌ Selección inválida.")
            continue

        if seleccion < 0 or seleccion >= len(clientes):
            print("❌ Selección inválida.")
            continue

        cliente = clientes[seleccion]
        id_cliente = cliente['id_cliente']
        nombre_cliente = cliente['nombre_cliente']
        alias = (cliente.get('alias') or "").strip()
        linea = input(f"Ingrese la línea para {nombre_cliente} (valor por defecto: {cliente['linea']}): ") or cliente['linea']

        try:
            print(f"\n🕒 Generando PDF para {nombre_cliente}...")
            print(f"{'='*60}")
            inicio = time.time()

            # Generar etiqueta de fecha según el tipo
            etiqueta = get_fecha_reporte(tipo, FECHA_HOY)
            print(f"📅 Etiqueta fecha: {etiqueta}")

            pdf_path = generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, tipo, etiqueta)
            
            fin = time.time()
            duracion = fin - inicio
            
            # Verificar si el PDF se generó exitosamente
            if pdf_path is None:
                print(f"❌ No se pudo generar PDF para {nombre_cliente} debido a datos inválidos")
                failed_pdfs.append({
                    'nombre_cliente': nombre_cliente,
                    'alias': alias,
                    'tipo': tipo,
                    'error': 'Datos inválidos',
                    'tiempo_procesamiento': duracion
                })
                continue
                
            pdfs_generados.append(pdf_path)

            # Si es un reporte semanal, subirlo a Google Drive
            if tipo == "semanal":
                print(f"📤 Subiendo reporte semanal a Google Drive: {os.path.basename(pdf_path)}")
                upload_success = upload_to_google_drive(pdf_path)
                if upload_success:
                    print(f"✅ Reporte semanal {os.path.basename(pdf_path)} subido exitosamente a Google Drive")
                else:
                    print(f"❌ Error al subir {os.path.basename(pdf_path)} a Google Drive")

            print(f"✅ PDF generado correctamente en {duracion:.2f} segundos.\n")

        except Exception as e:
            fin = time.time()
            duracion = fin - inicio
            print(f"❌ Error durante generación: {e}")
            failed_pdfs.append({
                'nombre_cliente': nombre_cliente,
                'alias': alias,
                'tipo': tipo,
                'error': str(e),
                'tiempo_procesamiento': duracion
            })

        continuar = input("¿Deseas generar otro reporte? (s/n): ").strip().lower()
        if continuar != "s":
            break

    # Resumen final y envío de correos
    fin_total = time.time()
    tiempo_total = fin_total - inicio_total
    
    print(f"\n{'='*60}")
    print(f"📈 === RESUMEN FINAL ===")
    print(f"✅ PDFs generados exitosamente: {len(pdfs_generados)}")
    print(f"❌ PDFs fallidos: {len(failed_pdfs)}")
    print(f"⏱️ Tiempo total del proceso: {tiempo_total:.2f}s")
    
    if pdfs_generados:
        print(f"\n📄 PDFs generados:")
        for idx, pdf in enumerate(pdfs_generados):
            print(f"{idx + 1:2d}. {os.path.basename(pdf)}")
        
        if failed_pdfs:
            print(f"\n🚨 PDFs fallidos:")
            for falla in failed_pdfs:
                print(f"   ❌ {falla['nombre_cliente']} - {falla['alias']}")
                print(f"      Error: {falla.get('error', 'N/A')}")
                print(f"      Tiempo: {falla.get('tiempo_procesamiento', 0):.2f}s")

        enviar = input("\n¿Deseas enviar todos los PDFs generados por correo? (s/n): ").strip().lower()
        if enviar == "s":
            print(f"\n📧 Enviando {len(pdfs_generados)} PDFs por correo...")

            # Cargar configuración de destinatarios desde recipients.json
            try:
                with open(recipients_path, "r", encoding="utf-8") as f:
                    config = json.load(f)
            except Exception as e:
                print(f"❌ Error cargando recipients.json: {e}")
                return

            # Enviar cada PDF al destinatario correspondiente
            archivos_enviados = 0
            archivos_no_enviados = []
            
            for pdf_path in pdfs_generados:
                pdf_name = os.path.basename(pdf_path)
                enviado = False
                
                # Determinar si es diario o semanal basado en el nombre del archivo
                tipo_reporte = "diarios" if "Diario" in pdf_name else "semanales"
                
                print(f"\n🔍 Buscando destinatario para: {pdf_name}")
                print(f"   Tipo: {tipo_reporte}")
                
                # Buscar en la sección correcta de recipients
                for idx, recipient in enumerate(config.get(tipo_reporte, [])):
                    for fileConfig in recipient.get('files', []):
                        # Obtener fecha según el tipo de reporte
                        fecha = get_fecha_reporte(tipo_reporte.rstrip('s'), FECHA_HOY)  # quita la 's' de 'diarios'/'semanales'
                        
                        if tipo_reporte == "diarios":
                            expected_name = fileConfig['fileName'].replace("{fecha}", fecha) + ".pdf"
                        else:
                            fecha_str, rango = fecha.split(" (", 1)
                            rango = rango.rstrip(")")
                            
                            expected_pattern = fileConfig['fileName']
                            expected_pattern = expected_pattern.replace("{fecha_str}", fecha_str)
                            expected_pattern = expected_pattern.replace("{rango}", rango)
                            expected_pattern = expected_pattern.replace("{alias}", "*")  # Placeholder para alias
                            expected_name = expected_pattern + ".pdf"
                        
                        if archivo_coincide(pdf_name, expected_name, tipo_reporte):
                            print(f"   ✅ Match encontrado en recipient #{idx + 1}!")
                            print(f"📧 Enviando {pdf_name} a {recipient.get('email', 'N/A')}...")
                            try:
                                send_mail(recipient, pdf_path)
                                archivos_enviados += 1
                                enviado = True
                                print(f"✅ Correo enviado exitosamente")
                            except Exception as e:
                                print(f"❌ Error enviando correo: {e}")
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
                    print(f"❌ No se encontró destinatario para {pdf_name}")
                    archivos_no_enviados.append(pdf_name)

            print(f"\n📈 === RESUMEN DE ENVÍO ===")
            print(f"✅ Archivos enviados: {archivos_enviados}")
            print(f"❌ Archivos no enviados: {len(archivos_no_enviados)}")
            
            # Enviar correo de error si hay archivos fallidos o no enviados
            if failed_pdfs or archivos_no_enviados:
                print(f"📧 Enviando reporte de errores a administradores...")
                send_error_mail(missing_files=archivos_no_enviados, failed_pdfs=failed_pdfs)
            
            print(f"✅ Proceso de envío finalizado.")
        else:
            print("Los PDFs generados no se enviaron por correo.")
    else:
        print("No se generaron PDFs.")
        
        # Enviar correo de error si hubo fallos
        if failed_pdfs:
            print(f"📧 Enviando reporte de errores a administradores...")
            send_error_mail(failed_pdfs=failed_pdfs)
    
    print(f"\n🏁 === PROCESO COMPLETADO ===")
    print(f"⏱️ Tiempo total de ejecución: {tiempo_total:.2f} segundos")
    print(f"📅 Finalizado el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

def archivo_coincide(archivo_generado: str, expected_name: str, tipo_reporte: str) -> bool:
    """Función simplificada para verificar coincidencia de nombres de archivos."""
    gen = archivo_generado.replace(".pdf", "").lower()
    esp = expected_name.replace(".pdf", "").lower()
    
    # Palabras críticas que deben coincidir exactamente
    critical_words = {"daltile", "acm-0002", "acm-0004", "acm-0005", "acm-0006", 
                     "calidra", "liebherr", "linamar", "bci", "penox"}
    
    # Si hay palabras críticas, deben coincidir exactamente
    for word in critical_words:
        if word in esp and word not in gen:
            return False
        if word in gen and word not in esp:
            return False
    
    # Comparar palabras comunes
    palabras_gen = set(gen.split())
    palabras_esp = set(esp.split())
    intersection = palabras_gen.intersection(palabras_esp)
    
    # Si hay al menos 70% de coincidencia en las palabras
    return len(intersection) >= len(palabras_esp) * 0.7

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️ Proceso cancelado por el usuario. Limpiando PDFs generados...")
        clean_pdfs_folder()
        print("Carpeta de PDFs limpiada. Terminando proceso.")
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