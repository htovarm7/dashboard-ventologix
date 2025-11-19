import os
import pickle
from datetime import datetime
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.http import MediaFileUpload, MediaIoBaseUpload
from googleapiclient.errors import HttpError
import io
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import tempfile

# Configuración
OAUTH_CREDENTIALS_FILE = r"C:\Users\vento\OneDrive\Escritorio\credentials.json"
TOKEN_FILE = r"C:\Users\vento\OneDrive\Escritorio\token.pickle"
ROOT_FOLDER_ID = "1go0dsxXDmJ5FyHiUmVa4oXwacIh690g5"

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets"
]

def authenticate_google_services():
    """Authenticate and return Google Drive service"""
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)
    
    if not creds:
        flow = InstalledAppFlow.from_client_secrets_file(OAUTH_CREDENTIALS_FILE, SCOPES)
        creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)
    
    return build('drive', 'v3', credentials=creds)

def get_or_create_folder(drive_service, parent_id, folder_name):
    """Get or create a folder in Google Drive"""
    results = drive_service.files().list(
        q=f"'{parent_id}' in parents and name='{folder_name}' and mimeType='application/vnd.google-apps.folder'",
        fields="files(id, name)"
    ).execute()
    
    files = results.get('files', [])
    if files:
        return files[0]['id']
    
    file_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id]
    }
    folder = drive_service.files().create(body=file_metadata, fields='id').execute()
    return folder['id']

def format_date(date_str):
    """Format date string to readable format"""
    if not date_str:
        return "N/A"
    try:
        date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return date_obj.strftime("%d de %B de %Y a las %H:%M")
    except:
        return date_str

def generate_html_report(report_data):
    """Generate HTML content for the maintenance report"""
    
    # Format maintenance items
    maintenance_items_html = ""
    for item in report_data.get('mantenimientos', []):
        status_class = "bg-green-50 border-green-200" if item['realizado'] else "bg-gray-50 border-gray-200"
        status_icon = "✓" if item['realizado'] else "✗"
        status_color = "color: #16a34a;" if item['realizado'] else "color: #9ca3af;"
        
        maintenance_items_html += f"""
        <div style="display: flex; justify-content: space-between; align-items: center; 
                    padding: 12px; margin-bottom: 8px; border-radius: 8px; border: 1px solid;
                    background-color: {'#f0fdf4' if item['realizado'] else '#f9fafb'};
                    border-color: {'#bbf7d0' if item['realizado'] else '#e5e7eb'};">
            <span style="font-size: 14px; font-weight: 500;">{item['nombre']}</span>
            <span style="font-size: 20px; font-weight: bold; {status_color}">{status_icon}</span>
        </div>
        """
    
    # Comments section
    comments_html = ""
    if report_data.get('comentarios_generales'):
        comments_html += f"""
        <div style="margin-top: 30px; page-break-inside: avoid;">
            <h2 style="background-color: #1e40af; color: white; padding: 12px 16px; 
                       border-radius: 8px; font-size: 16px; font-weight: bold; margin-bottom: 16px;">
                COMENTARIOS GENERALES
            </h2>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px;">
                <p style="font-size: 16px; white-space: pre-wrap;">{report_data['comentarios_generales']}</p>
            </div>
        </div>
        """
    
    if report_data.get('comentario_cliente'):
        comments_html += f"""
        <div style="margin-top: 30px; page-break-inside: avoid;">
            <h2 style="background-color: #1e40af; color: white; padding: 12px 16px; 
                       border-radius: 8px; font-size: 16px; font-weight: bold; margin-bottom: 16px;">
                COMENTARIO DEL CLIENTE
            </h2>
            <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px;">
                <p style="font-size: 16px; white-space: pre-wrap;">{report_data['comentario_cliente']}</p>
            </div>
        </div>
        """
    
    # Resources section
    resources_html = ""
    if report_data.get('carpeta_fotos'):
        resources_html = f"""
        <div style="margin-top: 30px; page-break-inside: avoid;">
            <h2 style="background-color: #1e40af; color: white; padding: 12px 16px; 
                       border-radius: 8px; font-size: 16px; font-weight: bold; margin-bottom: 16px;">
                RECURSOS
            </h2>
            <div style="padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                <p style="font-size: 18px; font-weight: 600; color: #166534; margin-bottom: 8px;">
                    Carpeta de Fotos
                </p>
                <a href="{report_data['carpeta_fotos']}" style="color: #15803d; text-decoration: underline; word-wrap: break-word;">
                    {report_data['carpeta_fotos']}
                </a>
            </div>
        </div>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: letter;
                margin: 2cm;
            }}
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #1f2937;
            }}
            .header {{
                background: linear-gradient(to right, #1e3a8a, #1e40af);
                color: white;
                padding: 24px;
                border-radius: 8px;
                margin-bottom: 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            .header-left {{
                display: flex;
                align-items: center;
                gap: 16px;
            }}
            .logo {{
                width: 64px;
                height: 64px;
                background-color: white;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: #1e40af;
            }}
            .header-title {{
                font-size: 24px;
                font-weight: bold;
            }}
            .header-subtitle {{
                font-size: 14px;
                opacity: 0.9;
            }}
            .header-right {{
                text-align: right;
            }}
            .section {{
                margin-bottom: 30px;
                page-break-inside: avoid;
            }}
            .section-title {{
                background-color: #1e40af;
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 16px;
            }}
            .data-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            }}
            .data-item {{
                margin-bottom: 12px;
            }}
            .data-label {{
                font-size: 12px;
                color: #6b7280;
                margin-bottom: 4px;
            }}
            .data-value {{
                font-weight: 600;
                font-size: 14px;
            }}
            .legend {{
                margin-top: 16px;
                font-size: 16px;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="header-left">
                <div class="logo">VTX</div>
                <div>
                    <div class="header-title">VENTOLOGIX</div>
                    <div class="header-subtitle">REPORTE DE MANTENIMIENTO</div>
                    <div class="header-subtitle">{report_data.get('cliente', 'N/A')}</div>
                </div>
            </div>
            <div class="header-right">
                <div style="font-size: 20px; font-weight: bold;">#{report_data.get('id', 'N/A')}</div>
                <div style="font-size: 12px;">ID Registro</div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">DATOS GENERALES</h2>
            <div class="data-grid">
                <div class="data-item">
                    <div class="data-label">Cliente:</div>
                    <div class="data-value">{report_data.get('cliente', 'N/A')}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Fecha:</div>
                    <div class="data-value">{format_date(report_data.get('timestamp'))}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Técnico:</div>
                    <div class="data-value">{report_data.get('tecnico', 'N/A')}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Email del Técnico:</div>
                    <div class="data-value">{report_data.get('email', 'N/A')}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Tipo:</div>
                    <div class="data-value">{report_data.get('tipo', 'N/A')}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Compresor:</div>
                    <div class="data-value">{report_data.get('compresor', 'N/A')}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Número de Serie:</div>
                    <div class="data-value">{report_data.get('numero_serie', 'N/A')}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Número de Cliente:</div>
                    <div class="data-value">{report_data.get('numero_cliente', 'N/A')}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">MANTENIMIENTOS REALIZADOS</h2>
            {maintenance_items_html}
            <div class="legend">
                <span style="font-weight: bold; color: #16a34a;">✓</span> = Se realizó cambio,&nbsp;
                <span style="font-weight: bold;">✗</span> = Se mantuvo igual
            </div>
        </div>

        {comments_html}
        
        {resources_html}
    </body>
    </html>
    """
    
    return html_content

def generate_pdf_from_html(html_content):
    """Generate PDF from HTML content using WeasyPrint"""
    font_config = FontConfiguration()
    pdf_bytes = HTML(string=html_content).write_pdf(font_config=font_config)
    return pdf_bytes

def upload_pdf_to_drive(drive_service, pdf_bytes, filename, folder_id):
    """Upload PDF to Google Drive and return public link"""
    media = MediaIoBaseUpload(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        resumable=True
    )
    
    file_metadata = {
        'name': filename,
        'parents': [folder_id]
    }
    
    uploaded_file = drive_service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id'
    ).execute()
    
    # Make file publicly accessible
    drive_service.permissions().create(
        fileId=uploaded_file['id'],
        body={'role': 'reader', 'type': 'anyone'}
    ).execute()
    
    # Get public link
    file = drive_service.files().get(
        fileId=uploaded_file['id'],
        fields='webViewLink'
    ).execute()
    
    return file['webViewLink']

def generate_and_upload_maintenance_report(report_data):
    """
    Main function to generate PDF report and upload to Google Drive
    
    Args:
        report_data: Dictionary containing maintenance report data
        
    Returns:
        dict: Contains 'pdf_link' and 'success' status
    """
    try:
        # Authenticate with Google Drive
        drive_service = authenticate_google_services()
        
        # Get report details
        numero_cliente = report_data.get('numero_cliente', 0)
        cliente_nombre = report_data.get('cliente', 'Cliente')
        numero_serie = report_data.get('numero_serie', 'NS')
        fecha = report_data.get('timestamp', datetime.now().isoformat())
        
        # Parse fecha for folder structure
        try:
            fecha_obj = datetime.fromisoformat(fecha.replace('Z', '+00:00'))
            fecha_str = fecha_obj.strftime("%Y-%m-%d")
        except:
            fecha_str = datetime.now().strftime("%Y-%m-%d")
        
        # Create folder structure: Root > {numero_cliente} {nombre_cliente} > Compresor - {numero_serie} > {fecha} > Reportes
        client_folder = get_or_create_folder(drive_service, ROOT_FOLDER_ID, f"{numero_cliente} {cliente_nombre}")
        comp_folder = get_or_create_folder(drive_service, client_folder, f"Compresor - {numero_serie}")
        date_folder = get_or_create_folder(drive_service, comp_folder, fecha_str)
        reports_folder = get_or_create_folder(drive_service, date_folder, "Reportes")
        
        # Generate HTML content
        html_content = generate_html_report(report_data)
        
        # Generate PDF
        pdf_bytes = generate_pdf_from_html(html_content)
        
        # Upload to Drive
        pdf_filename = f"Reporte_Mantenimiento_{numero_serie}_{fecha_str}.pdf"
        pdf_link = upload_pdf_to_drive(drive_service, pdf_bytes, pdf_filename, reports_folder)
        
        return {
            'success': True,
            'pdf_link': pdf_link,
            'filename': pdf_filename,
            'fecha': fecha_str
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == "__main__":
    # Test with sample data
    sample_data = {
        'id': 'TEST123',
        'cliente': 'Cliente de Prueba',
        'numero_cliente': 999,
        'tecnico': 'Juan Pérez',
        'email': 'juan@ventologix.com',
        'tipo': 'Preventivo',
        'compresor': 'Atlas Copco GA75',
        'numero_serie': 'AC12345',
        'timestamp': datetime.now().isoformat(),
        'comentarios_generales': 'Mantenimiento completado sin problemas.',
        'comentario_cliente': 'Excelente servicio.',
        'carpeta_fotos': 'https://drive.google.com/drive/folders/xxxxx',
        'mantenimientos': [
            {'nombre': 'Filtro de Aire', 'realizado': True},
            {'nombre': 'Filtro Aceite', 'realizado': True},
            {'nombre': 'Separador de Aceite', 'realizado': False},
        ]
    }
    
    result = generate_and_upload_maintenance_report(sample_data)
    print(result)
