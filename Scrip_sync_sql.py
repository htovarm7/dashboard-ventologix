import mysql.connector
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
from pathlib import Path

# -----------------------------
# CONFIGURACIÓN
# -----------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR  # dashboard-ventologix (script is already in project root)
LIB_DIR = PROJECT_ROOT / "lib"

SERVICE_ACCOUNT_FILE = str(LIB_DIR / "credentials.json")
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

SPREADSHEET_ID = "1SOmQD9uUMVlsGP4OBbZ3lJSBeet1J2fsmbxqYz200mI"
SHEET_NAME = "Resumen Formulario"

DB_HOST = "34.174.55.1"
DB_USER = "andres"
DB_PASS = 'as"#%dasdr'
DB_NAME = "pruebas"
DB_TABLE = "registros_mantenimiento_tornillo"

# -----------------------------
# CONEXIÓN A GOOGLE SHEETS
# -----------------------------
creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
gc = gspread.authorize(creds)
sheet = gc.open_by_key(SPREADSHEET_ID).worksheet(SHEET_NAME)

# -----------------------------
# CONEXIÓN A MYSQL
# -----------------------------
conn = mysql.connector.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASS,
    database=DB_NAME
)
cursor = conn.cursor()

# -----------------------------
# FUNCIONES AUXILIARES
# -----------------------------
def normalize_date(fecha_input):
    formatos = ["%d/%m/%Y %H:%M:%S", "%d/%m/%Y", "%d/%m/%y %H:%M:%S", "%d/%m/%y",
                "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]
    for f in formatos:
        try:
            return datetime.strptime(fecha_input, f).strftime("%Y-%m-%d %H:%M:%S")
        except:
            continue
    return None

def map_row(row):
    ts = normalize_date(row[9])  # columna 10 = Marca temporal
    return (
        ts,
        row[1],   # cliente
        row[2],   # tecnico
        row[3],   # email
        row[6],   # tipo
        row[4],   # compresor
        row[5],   # numero_serie
        row[10],  # filtro_aire
        row[11],  # filtro_aceite
        row[12],  # separador_aceite
        row[13],  # aceite
        row[14],  # kit_admision
        row[15],  # kit_minima
        row[16],  # kit_termostatica
        row[17],  # cople_flexible
        row[18],  # valvula_solenoide
        row[19],  # sensor_temperatura
        row[20],  # transductor_presion
        row[21],  # contactores
        row[22],  # analisis_baleros_unidad
        row[23],  # analisis_baleros_ventilador
        row[24],  # lubricacion_baleros
        row[25],  # limpieza_radiador_interna
        row[26],  # limpieza_radiador_externa
        row[27],  # comentarios_generales
        row[28],  # numero_cliente
        row[29],  # comentario_cliente
        row[7],   # link_form
        row[8]    # carpeta_fotos
    )

# -----------------------------
# SINCRONIZACIÓN
# -----------------------------
all_rows = sheet.get_all_values()

COL_PROCESADO = 31  # AE = columna 31

sql = f"""
INSERT INTO {DB_TABLE} (
    timestamp, cliente, tecnico, email, tipo, compresor, numero_serie,
    filtro_aire, filtro_aceite, separador_aceite, aceite, kit_admision,
    kit_minima, kit_termostatica, cople_flexible, valvula_solenoide,
    sensor_temperatura, transductor_presion, contactores,
    analisis_baleros_unidad, analisis_baleros_ventilador,
    lubricacion_baleros, limpieza_radiador_interna, limpieza_radiador_externa,
    comentarios_generales, numero_cliente, comentario_cliente, link_form, carpeta_fotos
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

for i, row in enumerate(all_rows[1:], start=2):
    
    # Si ya tiene procesado en AE → saltar la fila
    if len(row) >= COL_PROCESADO and row[COL_PROCESADO-1].strip() == "✅":
        continue

    try:
        cursor.execute(sql, map_row(row))
        sheet.update_cell(i, COL_PROCESADO, "✅")  # Marca en AE
    except Exception as e:
        print(f"❌ Error fila {i}: {e}")

conn.commit()
cursor.close()
conn.close()

print("✅ Sincronización completada correctamente usando columna AE")

