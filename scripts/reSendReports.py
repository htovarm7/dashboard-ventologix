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
LOGO_PATH = os.path.join(os.path.dirname(BASE_DIR), "public", "Logo vento firma.jpg")
VENTOLOGIX_LOGO_PATH = os.path.join(os.path.dirname(BASE_DIR), "public", "ventologix firma.jpg")

# Google Drive Configuration
GOOGLE_DRIVE_FOLDER_ID = "19YM9co-kyogK7iXeJ-Wwq1VnrICr50Xk"  # ID de la carpeta de Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive.file']
CREDENTIALS_FILE = os.path.join(BASE_DIR, "VM", "credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "VM", "token.json")

# Admins para alertas
ADMIN_CORREOS = [
    "hector.tovar@ventologix.com",
    "andres.mirazo@ventologix.com"
]

recipients_path = os.getenv("RECIPIENTS_JSON",
                            os.path.join(os.path.dirname(BASE_DIR), "data", "recipients.json"))

# Fecha base de hoy
FECHA_HOY = datetime.now()


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
def generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, tipo, etiqueta_fecha):
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

# --- Función para enviar correo ---
def send_mail(recipientConfig, pdf_file_path):
    msg = EmailMessage()
    msg['From'] = f"{ALIAS_NAME} <{FROM_ADDRESS}>"

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
    os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)

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
        alias = (cliente.get('alias') or "").strip()
        linea = input(f"Ingrese la línea para {nombre_cliente} (valor por defecto: {cliente['linea']}): ") or cliente['linea']

        try:
            print(f"\n🕒 Generando PDF para {nombre_cliente}...")
            inicio = time.time()

            # Generar etiqueta de fecha apropiada según el tipo
            if tipo == "diario":
                etiqueta = etiqueta_fecha_diaria(FECHA_HOY, -1)
            else:
                etiqueta = etiqueta_fecha_semanal(FECHA_HOY, 0)

            pdf_path = generar_pdf_cliente(id_cliente, linea, nombre_cliente, alias, tipo, etiqueta)
            
            # Verificar si el PDF se generó exitosamente
            if pdf_path is None:
                print(f"❌ No se pudo generar PDF para {nombre_cliente} debido a datos inválidos")
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

            # Cargar configuración de destinatarios desde recipients.json
            with open(recipients_path, "r", encoding="utf-8") as f:
                config = json.load(f)

            # Enviar cada PDF al destinatario correspondiente
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
                        # Para diarios, usar fecha de ayer
                        if tipo_reporte == "diarios":
                            fecha_esperada = etiqueta_fecha_diaria(FECHA_HOY, -1)
                            expected_name = fileConfig['fileName'].replace("{fecha}", fecha_esperada) + ".pdf"
                        else:
                            # Para semanales, reemplazar todos los placeholders
                            fecha_str = (FECHA_HOY + timedelta(days=0)).strftime("%Y-%m-%d")
                            lunes, domingo = obtener_rango_semana_anterior(FECHA_HOY)
                            try:
                                mes_domingo = domingo.strftime("%B")
                            except Exception:
                                mes_domingo = domingo.strftime("%m")
                            rango = f"Semana del {lunes.day} al {domingo.day} {mes_domingo}"
                            
                            expected_pattern = fileConfig['fileName']
                            expected_pattern = expected_pattern.replace("{fecha_str}", fecha_str)
                            expected_pattern = expected_pattern.replace("{rango}", rango)
                            expected_pattern = expected_pattern.replace("{alias}", "*")  # Placeholder para alias
                            expected_name = expected_pattern + ".pdf"
                        
                        print(f"   Comparando con: {expected_name}")
                        
                        # Usar coincidencia mejorada para nombres de archivos
                        if archivo_coincide_mejorado(pdf_name, expected_name, tipo_reporte):
                            print(f"   ✅ Match encontrado en recipient #{idx + 1}!")
                            print(f"📧 Enviando {pdf_name} a {recipient.get('email', 'N/A')}...")
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

def archivos_coinciden(archivo_generado: str, archivo_esperado: str) -> bool:
    """
    Función auxiliar para verificar si un archivo generado coincide con el patrón esperado,
    teniendo en cuenta variaciones en nombres de clientes y aliases.
    """
    # Remover extensiones para comparar
    gen = archivo_generado.replace(".pdf", "")
    esp = archivo_esperado.replace(".pdf", "")
    
    # Si contienen palabras clave similares, considerarlos coincidentes
    palabras_gen = gen.lower().split()
    palabras_esp = esp.lower().split()
    
    # Verificar si hay coincidencias significativas
    coincidencias = 0
    for palabra in palabras_esp:
        if palabra in palabras_gen:
            coincidencias += 1
    
    # Si al menos el 60% de las palabras coinciden, considerarlo una coincidencia
    return coincidencias >= len(palabras_esp) * 0.6

def archivo_coincide_mejorado(archivo_generado: str, expected_name: str, tipo_reporte: str) -> bool:
    """
    Función mejorada para hacer matching entre archivos generados y patrones esperados.
    Maneja casos específicos como ALLTANSA vs Altansa, etc.
    """
    # Remover extensiones
    gen = archivo_generado.replace(".pdf", "").lower()
    esp = expected_name.replace(".pdf", "").lower()
    
    # Mapeos de nombres conocidos
    name_mappings = {
        "alltansa": "altansa",
        "altansa": "alltansa", 
        "impac compresor 1 (75hp)": "impac (75hp)",
        "impac compresor 2 (100 hp)": "impac (100hp)",
        "impac (75hp)": "impac compresor 1 (75hp)",
        "impac (100hp)": "impac compresor 2 (100 hp)"
    }
    
    # Aplicar mapeos
    for original, mapped in name_mappings.items():
        if original in gen:
            gen = gen.replace(original, mapped)
        if original in esp:
            esp = esp.replace(original, mapped)
    
    # Verificar coincidencia exacta después de normalización
    if gen == esp:
        return True
    
    # Verificar palabras clave importantes
    palabras_gen = set(gen.split())
    palabras_esp = set(esp.split())
    
    # Palabras críticas que deben coincidir
    critical_words = {"daltile", "acm-0002", "acm-0004", "acm-0005", "acm-0006", 
                     "calidra", "liebherr", "linamar", "bci", "penox"}
    
    for word in critical_words:
        if word in palabras_esp and word not in palabras_gen:
            return False
        if word in palabras_gen and word not in palabras_esp:
            return False
    
    # Verificar coincidencia por porcentaje de palabras
    intersection = palabras_gen.intersection(palabras_esp)
    union = palabras_gen.union(palabras_esp)
    
    if len(union) > 0:
        similarity = len(intersection) / len(union)
        return similarity >= 0.7
    
    return False

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