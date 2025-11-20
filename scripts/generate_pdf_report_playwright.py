"""
Módulo para generar reportes PDF de mantenimiento usando Playwright y Google Drive
Basado en la funcionalidad de automation.py
Compatible con Python 3.13 y Windows usando threading
"""

import os
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import tempfile
import time

# Configuración - Usar las mismas rutas que automation.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VM_DIR = os.path.join(BASE_DIR, "VM")
CREDENTIALS_FILE = os.path.join(VM_DIR, "credentials.json")
TOKEN_FILE = os.path.join(VM_DIR, "token.json")

# Carpeta raíz en Google Drive para reportes de mantenimiento
# Estructura: Root > {numero_cliente} {nombre_cliente} > Compresor - {numero_serie} > {fecha} > Reportes
ROOT_FOLDER_ID = "19YM9co-kyogK7iXeJ-Wwq1VnrICr50Xk"

SCOPES = ['https://www.googleapis.com/auth/drive.file']

# URL base del servidor Next.js
NEXTJS_URL = os.getenv("NEXTJS_URL", "http://localhost:3000")


def authenticate_google_drive():
    """Autentica con Google Drive usando OAuth2 - Compatible con automation.py"""
    creds = None
    
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"Error al refrescar token: {e}")
                if os.path.exists(TOKEN_FILE):
                    os.remove(TOKEN_FILE)
                creds = None
        
        if not creds:
            if not os.path.exists(CREDENTIALS_FILE):
                raise Exception(f"No se encontró el archivo de credenciales en {CREDENTIALS_FILE}")
            
            try:
                flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
                creds = flow.run_local_server(port=8080, open_browser=True)
            except Exception as e:
                raise Exception(f"Error durante la autenticación OAuth: {e}")
        
        try:
            with open(TOKEN_FILE, 'w') as token:
                token.write(creds.to_json())
        except Exception as e:
            print(f"Error al guardar token: {e}")
    
    return build('drive', 'v3', credentials=creds)


def get_or_create_folder(drive_service, parent_id, folder_name):
    """Obtiene o crea una carpeta en Google Drive"""
    try:
        # Buscar carpeta existente
        results = drive_service.files().list(
            q=f"'{parent_id}' in parents and name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields="files(id, name)",
            spaces='drive'
        ).execute()
        
        files = results.get('files', [])
        if files:
            print(f"   📁 Carpeta '{folder_name}' encontrada")
            return files[0]['id']
        
        # Crear nueva carpeta
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id]
        }
        folder = drive_service.files().create(body=file_metadata, fields='id').execute()
        print(f"   📁 Carpeta '{folder_name}' creada")
        return folder['id']
        
    except Exception as e:
        print(f"   ❌ Error manejando carpeta '{folder_name}': {e}")
        raise


async def generate_pdf_with_playwright_async(visit_id: str, numero_serie: str, fecha_str: str) -> str:
    """
    Genera un PDF usando Playwright (async) renderizando la página de generación de reportes.
    Versión asíncrona compatible con FastAPI/uvicorn
    
    Args:
        visit_id: ID del registro de mantenimiento
        numero_serie: Número de serie del compresor
        fecha_str: Fecha del mantenimiento
        
    Returns:
        str: Ruta del archivo PDF generado
    """
    print(f"\n🔍 Generando PDF con Playwright (Async)")
    print(f"   📋 Visita ID: {visit_id}")
    print(f"   🔢 Serie: {numero_serie}")
    print(f"   📅 Fecha: {fecha_str}")
    
    # Crear carpeta temporal para el PDF
    temp_dir = tempfile.gettempdir()
    pdf_filename = f"Reporte_Mantenimiento_{numero_serie}_{fecha_str}_{int(time.time())}.pdf"
    pdf_path = os.path.join(temp_dir, pdf_filename)
    
    print(f"   📁 Ruta temporal: {pdf_path}")
    
    browser = None
    try:
        print(f"   🎭 Importando Playwright async...")
        from playwright.async_api import async_playwright
        
        print(f"   🌐 Iniciando Playwright...")
        async with async_playwright() as p:
            print(f"   🌐 Lanzando navegador Chromium...")
            try:
                browser = await p.chromium.launch(
                    headless=True,
                    args=['--disable-dev-shm-usage', '--no-sandbox']
                )
            except Exception as browser_error:
                print(f"   ❌ Error lanzando navegador: {str(browser_error)}")
                print(f"   💡 Intenta ejecutar: playwright install chromium")
                raise Exception(f"Error lanzando navegador Chromium: {str(browser_error)}")
            
            print(f"   ✅ Navegador lanzado")
            page = await browser.new_page()
            await page.set_viewport_size({"width": 1920, "height": 1080})
            
            # Construir URL para la página de generación
            url = f"{NEXTJS_URL}/compressor-maintenance/technician/views/generate-report?id={visit_id}"
            print(f"   🔗 URL: {url}")
            
            try:
                print(f"   ⏳ Navegando a la página...")
                response = await page.goto(url, timeout=60000, wait_until="networkidle")
                
                if not response or response.status >= 400:
                    error_msg = f"Error HTTP {response.status if response else 'sin respuesta'}"
                    print(f"   ❌ {error_msg}")
                    # Capturar contenido de la página para debug
                    content = await page.content()
                    print(f"   📄 Contenido de la página: {content[:500]}...")
                    raise Exception(error_msg)
                
                print(f"   ✅ Página cargada (HTTP {response.status})")
                
                # Esperar a que el reporte esté completamente cargado
                print(f"   ⏳ Esperando a que el contenido se cargue...")
                try:
                    await page.wait_for_selector('text=REPORTE DE MANTENIMIENTO', timeout=30000)
                    print(f"   ✅ Contenido encontrado")
                except Exception as wait_error:
                    print(f"   ⚠️ Timeout esperando contenido: {str(wait_error)}")
                    # Capturar screenshot para debug
                    screenshot_path = os.path.join(temp_dir, f"error_screenshot_{int(time.time())}.png")
                    await page.screenshot(path=screenshot_path)
                    print(f"   📸 Screenshot guardado: {screenshot_path}")
                    raise Exception(f"No se encontró el contenido del reporte. Screenshot: {screenshot_path}")
                
                # Esperar un poco más para asegurar que todo el contenido esté renderizado
                print(f"   ⏳ Esperando renderizado completo...")
                await page.wait_for_timeout(3000)
                
                print(f"   📄 Generando PDF...")
                # Generar el PDF con opciones similares a automation.py
                await page.pdf(
                    path=pdf_path,
                    format="Letter",
                    print_background=True,
                    margin={
                        "top": "0.5in",
                        "right": "0.5in",
                        "bottom": "0.5in",
                        "left": "0.5in"
                    }
                )
                
                print(f"   ✅ PDF generado exitosamente")
                
            except Exception as page_error:
                print(f"   ❌ Error durante la navegación/generación: {str(page_error)}")
                print(f"   🔍 Tipo de error: {type(page_error).__name__}")
                raise
            finally:
                if browser:
                    print(f"   🔒 Cerrando navegador...")
                    await browser.close()
        
        # Verificar que el archivo se creó correctamente
        if os.path.exists(pdf_path):
            file_size = os.path.getsize(pdf_path)
            print(f"   ✅ Archivo PDF creado - Tamaño: {file_size} bytes")
            
            if file_size < 1000:
                print(f"   ⚠️ ADVERTENCIA: Archivo muy pequeño, puede estar vacío o corrupto")
            
            return pdf_path
        else:
            raise Exception("El archivo PDF no se encontró después de la generación")
            
    except ImportError as import_error:
        error_msg = f"Error importando Playwright: {str(import_error)}. Ejecuta: pip install playwright && playwright install chromium"
        print(f"   ❌ {error_msg}")
        raise Exception(error_msg)
    except Exception as e:
        error_msg = str(e) if str(e) else "Error desconocido en la generación del PDF"
        print(f"   ❌ Error en generación PDF: {error_msg}")
        print(f"   🔍 Traceback completo:")
        import traceback
        traceback.print_exc()
        raise Exception(error_msg)


def generate_pdf_with_playwright(visit_id: str, numero_serie: str, fecha_str: str) -> str:
    """
    Genera PDF usando Playwright sync en un thread separado.
    Compatible con Python 3.13, Windows y FastAPI/uvicorn.
    """
    print(f"\n🔍 Generando PDF con Playwright")
    print(f"   📋 Visita ID: {visit_id}")
    print(f"   🔢 Serie: {numero_serie}")
    print(f"   📅 Fecha: {fecha_str}")
    
    # Crear carpeta temporal para el PDF
    temp_dir = tempfile.gettempdir()
    pdf_filename = f"Reporte_Mantenimiento_{numero_serie}_{fecha_str}_{int(time.time())}.pdf"
    pdf_path = os.path.join(temp_dir, pdf_filename)
    
    print(f"   📁 Ruta temporal: {pdf_path}")
    
    result = {"pdf_path": None, "error": None}
    
    def run_playwright_sync():
        """Ejecuta Playwright SYNC en un thread nuevo"""
        try:
            print(f"   🎭 Importando Playwright sync...")
            from playwright.sync_api import sync_playwright
            
            print(f"   🌐 Iniciando Playwright sync...")
            with sync_playwright() as p:
                print(f"   🌐 Lanzando navegador Chromium...")
                try:
                    browser = p.chromium.launch(
                        headless=True,
                        args=['--disable-dev-shm-usage', '--no-sandbox']
                    )
                except Exception as browser_error:
                    error_msg = f"Error lanzando navegador: {str(browser_error)}"
                    print(f"   ❌ {error_msg}")
                    print(f"   💡 Intenta ejecutar: playwright install chromium")
                    result["error"] = Exception(error_msg)
                    return
                
                print(f"   ✅ Navegador lanzado")
                page = browser.new_page()
                page.set_viewport_size({"width": 1920, "height": 1080})
                
                # Construir URL para la página de generación
                url = f"{NEXTJS_URL}/compressor-maintenance/technician/views/generate-report?id={visit_id}"
                print(f"   🔗 URL: {url}")
                
                try:
                    print(f"   ⏳ Navegando a la página...")
                    response = page.goto(url, timeout=60000, wait_until="networkidle")
                    
                    if not response or response.status >= 400:
                        error_msg = f"Error HTTP {response.status if response else 'sin respuesta'}"
                        print(f"   ❌ {error_msg}")
                        # Capturar contenido de la página para debug
                        content = page.content()
                        print(f"   📄 Contenido de la página: {content[:500]}...")
                        result["error"] = Exception(error_msg)
                        return
                    
                    print(f"   ✅ Página cargada (HTTP {response.status})")
                    
                    # Esperar a que el reporte esté completamente cargado
                    print(f"   ⏳ Esperando a que el contenido se cargue...")
                    try:
                        page.wait_for_selector('text=REPORTE DE MANTENIMIENTO', timeout=30000)
                        print(f"   ✅ Contenido encontrado")
                    except Exception as wait_error:
                        print(f"   ⚠️ Timeout esperando contenido: {str(wait_error)}")
                        # Capturar screenshot para debug
                        screenshot_path = os.path.join(temp_dir, f"error_screenshot_{int(time.time())}.png")
                        page.screenshot(path=screenshot_path)
                        print(f"   📸 Screenshot guardado: {screenshot_path}")
                        result["error"] = Exception(f"No se encontró el contenido del reporte. Screenshot: {screenshot_path}")
                        return
                    
                    # Esperar un poco más para asegurar que todo el contenido esté renderizado
                    print(f"   ⏳ Esperando renderizado completo...")
                    page.wait_for_timeout(3000)
                    
                    print(f"   📄 Generando PDF...")
                    # Generar el PDF
                    page.pdf(
                        path=pdf_path,
                        format="Letter",
                        print_background=True,
                        margin={
                            "top": "0.5in",
                            "right": "0.5in",
                            "bottom": "0.5in",
                            "left": "0.5in"
                        }
                    )
                    
                    print(f"   ✅ PDF generado exitosamente")
                    
                except Exception as page_error:
                    print(f"   ❌ Error durante la navegación/generación: {str(page_error)}")
                    print(f"   🔍 Tipo de error: {type(page_error).__name__}")
                    result["error"] = page_error
                    return
                finally:
                    print(f"   🔒 Cerrando navegador...")
                    browser.close()
            
            # Verificar que el archivo se creó correctamente
            if os.path.exists(pdf_path):
                file_size = os.path.getsize(pdf_path)
                print(f"   ✅ Archivo PDF creado - Tamaño: {file_size} bytes")
                
                if file_size < 1000:
                    print(f"   ⚠️ ADVERTENCIA: Archivo muy pequeño, puede estar vacío o corrupto")
                
                result["pdf_path"] = pdf_path
            else:
                result["error"] = Exception("El archivo PDF no se encontró después de la generación")
                
        except ImportError as import_error:
            error_msg = f"Error importando Playwright: {str(import_error)}. Ejecuta: pip install playwright && playwright install chromium"
            print(f"   ❌ {error_msg}")
            result["error"] = Exception(error_msg)
        except Exception as e:
            error_msg = str(e) if str(e) else "Error desconocido en la generación del PDF"
            print(f"   ❌ Error en generación PDF: {error_msg}")
            print(f"   🔍 Traceback completo:")
            import traceback
            traceback.print_exc()
            result["error"] = Exception(error_msg)
    
    # Ejecutar en un thread separado
    print(f"   🧵 Iniciando thread separado para Playwright sync...")
    thread = threading.Thread(target=run_playwright_sync)
    thread.start()
    thread.join(timeout=120)  # Timeout de 2 minutos
    
    if thread.is_alive():
        print(f"   ⏱️ Timeout: El thread aún está ejecutándose")
        raise Exception("Timeout generando PDF (120 segundos)")
    
    # Verificar resultado
    if result["error"]:
        raise result["error"]
    
    if result["pdf_path"]:
        return result["pdf_path"]
    else:
        raise Exception("No se pudo generar el PDF")
        raise


def upload_pdf_to_drive(drive_service, pdf_path: str, folder_id: str) -> str:
    """
    Sube un archivo PDF a Google Drive y lo hace público
    
    Args:
        drive_service: Servicio autenticado de Google Drive
        pdf_path: Ruta local del archivo PDF
        folder_id: ID de la carpeta de destino en Drive
        
    Returns:
        str: URL pública del archivo en Drive
    """
    try:
        pdf_filename = os.path.basename(pdf_path)
        print(f"\n☁️ Subiendo a Google Drive: {pdf_filename}")
        
        file_metadata = {
            'name': pdf_filename,
            'parents': [folder_id]
        }
        
        media = MediaFileUpload(pdf_path, mimetype='application/pdf', resumable=True)
        
        uploaded_file = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink'
        ).execute()
        
        # Hacer el archivo público
        drive_service.permissions().create(
            fileId=uploaded_file['id'],
            body={'role': 'reader', 'type': 'anyone'}
        ).execute()
        
        print(f"   ✅ Archivo subido exitosamente")
        print(f"   🔗 Link: {uploaded_file['webViewLink']}")
        
        return uploaded_file['webViewLink']
        
    except Exception as e:
        print(f"   ❌ Error subiendo a Drive: {e}")
        raise


def generate_and_upload_maintenance_report(report_data: dict) -> dict:
    """
    Función principal para generar PDF con Playwright y subirlo a Google Drive
    
    Args:
        report_data: Diccionario con datos del reporte de mantenimiento
        
    Returns:
        dict: {
            'success': bool,
            'pdf_link': str (si success=True),
            'filename': str (si success=True),
            'fecha': str (si success=True),
            'error': str (si success=False)
        }
    """
    try:
        print(f"\n{'='*60}")
        print(f"🚀 GENERANDO REPORTE DE MANTENIMIENTO")
        print(f"{'='*60}")
        
        # Extraer información del reporte
        visit_id = report_data.get('id')
        numero_cliente = report_data.get('numero_cliente', 0)
        cliente_nombre = report_data.get('cliente', 'Cliente')
        numero_serie = report_data.get('numero_serie', 'NS')
        compresor = report_data.get('compresor', 'Compresor')
        timestamp = report_data.get('timestamp', datetime.now().isoformat())
        
        print(f"📋 Cliente: {cliente_nombre} (#{numero_cliente})")
        print(f"🔧 Compresor: {compresor}")
        print(f"🔢 Serie: {numero_serie}")
        print(f"📅 Timestamp: {timestamp}")
        
        # Parsear fecha para estructura de carpetas
        try:
            fecha_obj = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            fecha_str = fecha_obj.strftime("%Y-%m-%d")
        except:
            fecha_str = datetime.now().strftime("%Y-%m-%d")
        
        print(f"📅 Fecha formateada: {fecha_str}")
        
        # 1. Generar PDF con Playwright
        print(f"\n📄 Paso 1/3: Generación del PDF")
        pdf_path = generate_pdf_with_playwright(visit_id, numero_serie, fecha_str)
        
        # 2. Autenticar con Google Drive
        print(f"\n🔐 Paso 2/3: Autenticación con Google Drive")
        drive_service = authenticate_google_drive()
        print(f"   ✅ Autenticación exitosa")
        
        # 3. Crear estructura de carpetas y subir
        print(f"\n📁 Paso 3/3: Estructura de carpetas y subida")
        print(f"   Estructura: Root > {numero_cliente} {cliente_nombre} > Compresor - {numero_serie} > {fecha_str} > Reportes")
        
        # Crear estructura de carpetas
        client_folder = get_or_create_folder(drive_service, ROOT_FOLDER_ID, f"{numero_cliente} {cliente_nombre}")
        comp_folder = get_or_create_folder(drive_service, client_folder, f"Compresor - {numero_serie}")
        date_folder = get_or_create_folder(drive_service, comp_folder, fecha_str)
        reports_folder = get_or_create_folder(drive_service, date_folder, "Reportes")
        
        # Subir PDF
        pdf_link = upload_pdf_to_drive(drive_service, pdf_path, reports_folder)
        
        # Limpiar archivo temporal
        try:
            os.remove(pdf_path)
            print(f"   🧹 Archivo temporal eliminado")
        except:
            pass
        
        print(f"\n{'='*60}")
        print(f"✅ REPORTE GENERADO EXITOSAMENTE")
        print(f"{'='*60}")
        
        return {
            'success': True,
            'pdf_link': pdf_link,
            'filename': os.path.basename(pdf_path),
            'fecha': fecha_str
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"\n{'='*60}")
        print(f"❌ ERROR EN GENERACIÓN DEL REPORTE")
        print(f"   {error_msg}")
        print(f"{'='*60}")
        
        return {
            'success': False,
            'error': error_msg
        }


if __name__ == "__main__":
    # Test con datos de ejemplo
    print("🧪 Modo de prueba - Generando reporte de ejemplo...")
    
    sample_data = {
        'id': '1',
        'cliente': 'Cliente de Prueba',
        'numero_cliente': 999,
        'tecnico': 'Juan Pérez',
        'email': 'juan@ventologix.com',
        'tipo': 'Preventivo',
        'compresor': 'Atlas Copco GA75',
        'numero_serie': 'TEST12345',
        'timestamp': datetime.now().isoformat(),
        'comentarios_generales': 'Mantenimiento de prueba.',
        'comentario_cliente': 'Servicio excelente.',
        'carpeta_fotos': 'https://drive.google.com/drive/folders/xxxxx'
    }
    
    result = generate_and_upload_maintenance_report(sample_data)
    
    if result['success']:
        print(f"\n✅ Prueba exitosa!")
        print(f"🔗 Link del PDF: {result['pdf_link']}")
    else:
        print(f"\n❌ Prueba fallida: {result['error']}")
