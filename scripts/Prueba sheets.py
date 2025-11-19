import os
import pickle
from datetime import datetime
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError
import gspread

# -----------------------------
# CONFIGURACIÓN
# -----------------------------
OAUTH_CREDENTIALS_FILE = r"C:\Users\vento\OneDrive\Escritorio\credentials.json"  # cuenta personal
TOKEN_FILE = r"C:\Users\vento\OneDrive\Escritorio\token.pickle"

SPREADSHEET_ID = "1SOmQD9uUMVlsGP4OBbZ3lJSBeet1J2fsmbxqYz200mI"
SHEET_NAME = "Resumen Formulario"

TEMPLATE_ID = "1KfpcLGUoM4H_UCVijhIGHLcMwzePk3-WpxXdmMJx_h8"
ROOT_FOLDER_ID = "1go0dsxXDmJ5FyHiUmVa4oXwacIh690g5"

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets"
]

# -----------------------------
# AUTENTICACIÓN
# -----------------------------
creds = None
if os.path.exists(TOKEN_FILE):
    with open(TOKEN_FILE, 'rb') as token:
        creds = pickle.load(token)
if not creds:
    flow = InstalledAppFlow.from_client_secrets_file(OAUTH_CREDENTIALS_FILE, SCOPES)
    creds = flow.run_local_server(port=0)
    with open(TOKEN_FILE, 'wb') as token:
        pickle.dump(creds, token)

# Servicios
drive_service = build('drive', 'v3', credentials=creds)
docs_service = build('docs', 'v1', credentials=creds)
sheets_service = build('sheets', 'v4', credentials=creds)

# Gspread para leer hojas
gc = gspread.authorize(creds)
sheet = gc.open_by_key(SPREADSHEET_ID).worksheet(SHEET_NAME)
all_rows = sheet.get_all_values()

# -----------------------------
# FUNCIONES AUXILIARES
# -----------------------------
def normalize_date(fecha_input):
    formatos = ["%d/%m/%y", "%d-%m-%y", "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"]
    for f in formatos:
        try:
            return datetime.strptime(fecha_input, f).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def get_or_create_folder(parent_id, folder_name):
    results = drive_service.files().list(
        q=f"'{parent_id}' in parents and name='{folder_name}' and mimeType='application/vnd.google-apps.folder'",
        fields="files(id, name)"
    ).execute()
    files = results.get('files', [])
    if files:
        return files[0]['id']
    file_metadata = {'name': folder_name, 'mimeType': 'application/vnd.google-apps.folder', 'parents': [parent_id]}
    folder = drive_service.files().create(body=file_metadata, fields='id').execute()
    return folder['id']

def list_photos_in_folder(folder_id):
    try:
        results = drive_service.files().list(
            q=f"'{folder_id}' in parents and mimeType contains 'image/'",
            fields="files(id, name, mimeType)"
        ).execute()
        return results.get('files', [])
    except HttpError as e:
        print("⚠️ Error listando fotos:", e)
        return []

# -----------------------------
# Rellenar plantilla DOC
# -----------------------------
def fill_template(doc_id, row):
    """
    Rellena la plantilla con los datos de la fila del Sheet.
    Usa las llaves {{Campo}} en el template.
    """
    placeholders = {
            "{{TIMESTAMP}}": row[0],
            "{{CLIENTE}}": row[1],
            "{{TECNICO}}": row[2],
            "{{EMAIL}}": row[3],
            "{{COMPRESOR}}": row[4],
            "{{NUMERO_SERIE}}": row[5],
            "{{TIPO}}": row[6],
            "{{LINK_FORM}}": row[7],
            "{{CARPETA_FOTOS}}": row[8],
            "{{FECHA_MANTENIMIENTO}}": row[9],
            "{{FILTRO_AIRE}}": row[10],
            "{{FILTRO_ACEITE}}": row[11],
            "{{SEPARADOR_ACEITE}}": row[12],
            "{{ACEITE}}": row[13],
            "{{KIT_VALVULA_ADMISION}}": row[14],
            "{{KIT_VALVULA_MINIMA}}": row[15],
            "{{KIT_VALVULA_TERMOSTATICA}}": row[16],
            "{{COPLE_FLEXIBLE}}": row[17],
            "{{VALVULA_SOLENOIDE}}": row[18],
            "{{SENSOR_TEMPERATURA}}": row[19],
            "{{TRANSDUCTOR_PRESION}}": row[20],
            "{{CONTACTORES}}": row[21],
            "{{ANALISIS_BALEROS_COMPRESOR}}": row[22],
            "{{ANALISIS_BALEROS_VENTILADOR}}": row[23],
            "{{LUBRICACION_BALEROS_MOTOR}}": row[24],
            "{{LIMPIEZA_INTERNA_RADIADOR}}": row[25],
            "{{LIMPIEZA_EXTERNA_RADIADOR}}": row[26],
            "{{COMENTARIOS_GENERALES}}": row[27],
            "{{NUMERO_CLIENTE}}": row[28],
            "{{COMENTARIO_CLIENTE}}": row[29]
        }


    requests = []
    for key, value in placeholders.items():
        requests.append({
            'replaceAllText': {
                'containsText': {'text': key, 'matchCase': True},
                'replaceText': value
            }
        })

    try:
        docs_service.documents().batchUpdate(documentId=doc_id, body={'requests': requests}).execute()
    except HttpError as e:
        print("⚠️ Error llenando plantilla:", e)

# -----------------------------
# Insertar fotos al final
# -----------------------------
def insert_images_at_end(doc_id, photos):
    if not photos:
        return

    # Asegurarse que sean públicas
    for photo in photos:
        try:
            drive_service.permissions().create(
                fileId=photo['id'],
                body={'role': 'reader', 'type': 'anyone'}
            ).execute()
        except HttpError:
            pass

    doc = docs_service.documents().get(documentId=doc_id).execute()
    end_index = doc['body']['content'][-1]['endIndex']

    requests = []

    # Salto de página
    requests.append({'insertPageBreak': {'location': {'index': end_index - 1}}})
    end_index += 1

    # Título centrado
    title_text = "EVIDENCIAS\n"
    requests.append({'insertText': {'location': {'index': end_index}, 'text': title_text}})
    requests.append({
        'updateParagraphStyle': {
            'range': {'startIndex': end_index, 'endIndex': end_index + len(title_text)},
            'paragraphStyle': {'alignment': 'CENTER'},
            'fields': 'alignment'
        }
    })
    end_index += len(title_text)

    # Insertar fotos dos por página
    for i, photo in enumerate(photos):
        requests.append({
            'insertInlineImage': {
                'location': {'index': end_index},
                'uri': f"https://drive.google.com/uc?id={photo['id']}",
                'objectSize': {'width': {'magnitude': 250, 'unit': 'PT'}}
            }
        })
        end_index += 1
        if (i + 1) % 2 == 0 and (i + 1) < len(photos):
            requests.append({'insertPageBreak': {'location': {'index': end_index}}})
            end_index += 1

    try:
        docs_service.documents().batchUpdate(documentId=doc_id, body={'requests': requests}).execute()
    except HttpError as e:
        print("⚠️ Error insertando fotos:", e)

# -----------------------------
# CREAR REPORTE
# -----------------------------
def create_report(numero_serie, fecha_input):
    fecha = normalize_date(fecha_input)
    if not fecha:
        print("❌ Fecha inválida")
        return

    filas_filtradas = [r for r in all_rows[1:] if r[5] == numero_serie and normalize_date(r[0]) == fecha]
    if not filas_filtradas:
        print("❌ No se encontró ningún renglón con esos criterios.")
        return
    row = filas_filtradas[0]

    cliente_nombre = row[1]
    numero_cliente = row[28]
    carpeta_fotos_url = row[8]

    client_folder = get_or_create_folder(ROOT_FOLDER_ID, f"{numero_cliente} {cliente_nombre}")
    comp_folder = get_or_create_folder(client_folder, f"Compresor - {numero_serie}")
    date_folder = get_or_create_folder(comp_folder, fecha)
    photo_folder = get_or_create_folder(date_folder, "Fotos")

    copy_title = f"Reporte_{numero_serie}_{fecha}"
    copied_file = drive_service.files().copy(
        fileId=TEMPLATE_ID,
        body={'name': copy_title, 'parents': [date_folder]}
    ).execute()
    doc_id = copied_file['id']

    # Llenar plantilla
    fill_template(doc_id, row)

    # Insertar fotos
    photo_folder_id = carpeta_fotos_url.split('/')[-1]
    photos = list_photos_in_folder(photo_folder_id)
    insert_images_at_end(doc_id, photos)

    # Generar PDF
    pdf_filename = f"{copy_title}.pdf"
    request = drive_service.files().export_media(fileId=doc_id, mimeType='application/pdf')
    pdf_path = os.path.join(os.getcwd(), pdf_filename)
    with open(pdf_path, 'wb') as f:
        f.write(request.execute())

    media = MediaFileUpload(pdf_path, mimetype='application/pdf')
    uploaded_pdf = drive_service.files().create(
        body={'name': pdf_filename, 'parents': [date_folder]},
        media_body=media,
        fields='id'
    ).execute()

    drive_service.permissions().create(
        fileId=uploaded_pdf['id'],
        body={'role': 'reader', 'type': 'anyone'}
    ).execute()

    print(f"✅ DOC y PDF generados en la carpeta de fecha: {fecha}")

# -----------------------------
# EJECUCIÓN
# -----------------------------
numero_serie = input("Ingresa el número de serie: ").strip()
fecha_input = input("Ingresa la fecha (ej. 5/11/2025, 05-11-2025, 2025-11-05): ").strip()

create_report(numero_serie, fecha_input)
