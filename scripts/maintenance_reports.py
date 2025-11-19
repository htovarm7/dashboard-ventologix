import os
import pickle
from datetime import datetime
import gspread
import mysql.connector
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow

# -----------------------------
# CONFIGURACIÓN
# -----------------------------
SCRIPT_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SCRIPT_DIR.parent
LIB_DIR = PROJECT_ROOT / "lib"

OAUTH_CREDENTIALS_FILE = str(LIB_DIR / "credentials.json")
TOKEN_FILE = str(LIB_DIR / "token.pickle")

SPREADSHEET_ID = "1SOmQD9uUMVlsGP4OBbZ3lJSBeet1J2fsmbxqYz200mI"
SHEET_NAME = "Resumen Formulario"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets"
]

DB_HOST = "34.174.55.1"
DB_USER = "andres"
DB_PASS = 'as"#%dasdr'
DB_NAME = "pruebas"
DB_TABLE = "registros_mantenimiento_tornillo"

# -----------------------------
# AUTENTICACIÓN
# -----------------------------
def get_google_credentials():
    """Obtiene las credenciales de Google con autenticación OAuth"""
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)
    if not creds:
        flow = InstalledAppFlow.from_client_secrets_file(OAUTH_CREDENTIALS_FILE, SCOPES)
        creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)
    return creds

# -----------------------------
# FUNCIONES AUXILIARES
# -----------------------------
def normalize_date(fecha_input):
    """Normaliza diferentes formatos de fecha a YYYY-MM-DD"""
    formatos = ["%d/%m/%Y %H:%M:%S", "%d/%m/%Y", "%d/%m/%y %H:%M:%S", "%d/%m/%y",
                "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d-%m-%y", "%d-%m-%Y"]
    for f in formatos:
        try:
            return datetime.strptime(fecha_input, f).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def map_row_to_sql(row):
    """Mapea una fila de Google Sheets a formato SQL"""
    ts = row[0]
    # Intentar normalizar timestamp
    for f in ["%d/%m/%Y %H:%M:%S", "%d/%m/%y %H:%M:%S", "%Y-%m-%d %H:%M:%S"]:
        try:
            ts = datetime.strptime(row[0], f).strftime("%Y-%m-%d %H:%M:%S")
            break
        except:
            continue
    
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

def sync_sheets_to_sql():
    """
    Sincroniza los datos de Google Sheets con la base de datos MySQL
    Solo procesa registros que NO tienen la marca ✅ en la columna de procesado
    """
    try:
        print("\n" + "="*60)
        print("SINCRONIZANDO DATOS DE GOOGLE SHEETS A SQL")
        print("="*60 + "\n")
        
        # Autenticar con Google
        creds = get_google_credentials()
        gc = gspread.authorize(creds)
        sheet = gc.open_by_key(SPREADSHEET_ID).worksheet(SHEET_NAME)
        all_rows = sheet.get_all_values()
        
        # Conectar a MySQL
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
        cursor = conn.cursor()
        
        # Columna de procesado (columna 31 = AE)
        COL_PROCESADO = 31
        
        sql = f"""
        INSERT INTO {DB_TABLE} (
            timestamp, cliente, tecnico, email, tipo, compresor, numero_serie,
            filtro_aire, filtro_aceite, separador_aceite, aceite,
            kit_admision, kit_minima, kit_termostatica, cople_flexible,
            valvula_solenoide, sensor_temperatura, transductor_presion, contactores,
            analisis_baleros_unidad, analisis_baleros_ventilador, lubricacion_baleros,
            limpieza_radiador_interna, limpieza_radiador_externa,
            comentarios_generales, numero_cliente, comentario_cliente,
            link_form, carpeta_fotos
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        inserted_count = 0
        skipped_count = 0
        error_count = 0
        
        # Empezar desde fila 2 (índice 1, saltando el header)
        for i, row in enumerate(all_rows[1:], start=2):
            # Extender la fila si no tiene suficientes columnas
            if len(row) < COL_PROCESADO:
                row.extend([''] * (COL_PROCESADO - len(row)))
            
            procesado = row[COL_PROCESADO - 1]
            
            # Si ya tiene marca de procesado (✅ o X o cualquier texto), saltar
            if procesado.strip() != '':
                skipped_count += 1
                continue
            
            try:
                values = map_row_to_sql(row)
                cursor.execute(sql, values)
                
                # Marcar como procesado con ✅
                sheet.update_cell(i, COL_PROCESADO, "✅")
                inserted_count += 1
                
                cliente = row[1] if len(row) > 1 else 'N/A'
                numero_serie = row[5] if len(row) > 5 else 'N/A'
                print(f"✅ Fila {i}: {cliente} - Serie: {numero_serie}")
                
            except mysql.connector.IntegrityError as e:
                # Registro duplicado, marcar como procesado de todas formas
                sheet.update_cell(i, COL_PROCESADO, "✅")
                skipped_count += 1
                print(f"⚠️  Fila {i}: Registro duplicado, omitiendo...")
            except Exception as e:
                error_count += 1
                print(f"❌ Fila {i}: Error - {str(e)}")
                continue
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n" + "="*60)
        print("RESUMEN DE SINCRONIZACIÓN")
        print("="*60)
        print(f"✅ Registros insertados: {inserted_count}")
        print(f"⏭️  Registros omitidos: {skipped_count}")
        print(f"❌ Errores: {error_count}")
        print("="*60 + "\n")
        
        return {
            "success": True,
            "inserted": inserted_count,
            "skipped": skipped_count,
            "errors": error_count,
            "message": f"Sincronización completada. {inserted_count} registros insertados, {skipped_count} omitidos."
        }
        
    except Exception as e:
        print(f"\n❌ Error crítico: {str(e)}\n")
        return {
            "success": False,
            "error": str(e),
            "message": f"Error durante la sincronización: {str(e)}"
        }

if __name__ == "__main__":
    print("🚀 Iniciando sincronización automática...")
    result = sync_sheets_to_sql()
    
    if result["success"]:
        print(f"✅ Sincronización exitosa: {result['inserted']} registros procesados")
    else:
        print(f"❌ Error en sincronización: {result.get('error', 'Error desconocido')}")
