"""
Endpoints de mantenimiento web - Gestión de registros y reportes de mantenimiento
"""
from fastapi import HTTPException, APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
import os
import pickle

from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from pathlib import Path

from .db_utils import get_db_connection


# Paths para OAuth
SCRIPT_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SCRIPT_DIR.parent
LIB_DIR = PROJECT_ROOT / "lib"
OAUTH_CREDENTIALS_FILE = str(LIB_DIR / "credentials.json")
TOKEN_FILE = str(LIB_DIR / "token.pickle")
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


# Mapeo de columnas de BD a nombres legibles
MAINTENANCE_COLUMN_MAPPING = {
    "filtro_aire": "Filtro de Aire",
    "filtro_aceite": "Filtro Aceite",
    "separador_aceite": "Separador de Aceite",
    "aceite": "Aceite Sintético",
    "kit_admision": "Kit Válvula de Admisión",
    "kit_minima": "Kit Válvula de mínima presión",
    "kit_termostatica": "Kit de Válvula Termostática",
    "cople_flexible": "Cople Flexible",
    "valvula_solenoide": "Válvula Solenoide",
    "sensor_temperatura": "Sensor de Temperatura",
    "transductor_presion": "Transductor de Presión",
    "contactores": "Contactores Eléctricos",
    "analisis_baleros_unidad": "Análisis baleros, unidad de compresión y motor eléctrico",
    "analisis_baleros_ventilador": "Análisis baleros ventilador enfriamiento",
    "lubricacion_baleros": "Lubricación Baleros Motor Electrico",
    "limpieza_radiador_interna": "Limpieza interna de Radiador",
    "limpieza_radiador_externa": "Limpieza externa de Radiador"
}


# Modelos Pydantic
class AddMaintenanceRequest(BaseModel):
    id_compresor: int
    id_mantenimiento: int
    frecuencia_horas: int
    ultimo_mantenimiento: date
    activo: bool = True
    observaciones: str = ""
    costo: Optional[float] = None
    creado_por: str
    fecha_creacion: date


class UpdateMaintenanceRequest(BaseModel):
    id_mantenimiento: Optional[int] = None
    frecuencia_horas: Optional[int] = None
    ultimo_mantenimiento: Optional[date] = None
    activo: Optional[bool] = None
    observaciones: Optional[str] = None
    costo: Optional[float] = None
    editado_por: Optional[str] = None


class MaintenanceItem(BaseModel):
    nombre: str
    realizado: bool


class UpdateMaintenanceReportRequest(BaseModel):
    id: int
    cliente: str
    tipo: str
    Alias: Optional[str] = None
    hp: Optional[str] = None
    voltaje: Optional[str] = None
    compresor: str
    anio: Optional[str] = None
    numero_serie: str
    tecnico: str
    email: str
    mantenimientos: List[MaintenanceItem]
    comentarios_generales: Optional[str] = None
    comentario_cliente: Optional[str] = None


maintenance_web = APIRouter(prefix="/web", tags=["🛠️ Mantenimiento de Compresores"])


def get_public_image_url(file_id: str) -> str:
    return f"https://drive.google.com/thumbnail?id={file_id}&sz=w1000"


def get_drive_folder_images(folder_url: str) -> List[dict]:
    """Conecta a Google Drive y extrae imágenes de una carpeta"""
    if not folder_url:
        return []

    try:
        folder_id = folder_url.split("/folders/")[1].split("?")[0]
    except Exception:
        return []

    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "rb") as token:
            creds = pickle.load(token)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(OAUTH_CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_FILE, "wb") as token:
            pickle.dump(creds, token)

    service = build("drive", "v3", credentials=creds)

    try:
        results = service.files().list(
            q=f"'{folder_id}' in parents and mimeType contains 'image/'",
            fields="files(id, name, mimeType)",
            pageSize=100
        ).execute()

        files = results.get('files', [])
        return [
            {
                "id": f["id"],
                "name": f["name"],
                "url": get_public_image_url(f["id"]),
                "mimeType": f.get("mimeType", "image/jpeg")
            }
            for f in files
        ]
    except Exception:
        return []


@maintenance_web.get("/registros-mantenimiento", tags=["🔧 Mantenimiento"])
def get_registros_mantenimiento(numero_cliente: Optional[int] = Query(None, description="Número del cliente")):
    """Obtiene los registros de mantenimiento"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        base_query = """
            SELECT
                id, timestamp, cliente, tecnico, email, tipo, compresor, numero_serie,
                filtro_aire, filtro_aceite, separador_aceite, aceite, kit_admision,
                kit_minima, kit_termostatica, cople_flexible, valvula_solenoide,
                sensor_temperatura, transductor_presion, contactores,
                analisis_baleros_unidad, analisis_baleros_ventilador, lubricacion_baleros,
                limpieza_radiador_interna, limpieza_radiador_externa, comentarios_generales,
                numero_cliente, comentario_cliente, link_form, carpeta_fotos
            FROM registros_mantenimiento_tornillo
        """

        if numero_cliente is not None:
            query = base_query + "\n WHERE numero_cliente = %s\n ORDER BY timestamp DESC"
            cursor.execute(query, (numero_cliente,))
        else:
            query = base_query + "\n ORDER BY timestamp DESC"
            cursor.execute(query)

        registros = cursor.fetchall()
        cursor.close()
        conn.close()

        formatted_registros = []
        for registro in registros:
            tasks = []
            for col_name, display_name in MAINTENANCE_COLUMN_MAPPING.items():
                if col_name in registro and registro[col_name]:
                    value = registro[col_name].strip() if isinstance(registro[col_name], str) else registro[col_name]
                    if value == "Sí":
                        tasks.append({
                            "id": col_name,
                            "name": display_name,
                            "completed": True,
                            "comments": ""
                        })

            formatted_registro = {
                "id": str(registro['id']),
                "date": registro['timestamp'].strftime('%Y-%m-%d') if registro['timestamp'] else "",
                "technician": registro['tecnico'] or "",
                "cliente": registro['cliente'] or "",
                "compresor": registro['compresor'] or "",
                "numero_serie": registro['numero_serie'] or "",
                "tasks": tasks,
                "photos": [],
                "carpeta_fotos": registro['carpeta_fotos'] or "",
                "link_form": registro['link_form'] or "",
                "comentarios_generales": registro['comentarios_generales'] or "",
                "comentario_cliente": registro['comentario_cliente'] or ""
            }
            formatted_registros.append(formatted_registro)

        return formatted_registros

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching registros de mantenimiento: {str(e)}")


@maintenance_web.get("/maintenance/types", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_types(tipo: str = Query(..., description="Tipo de compresor: piston o tornillo")):
    """Obtiene tipos de mantenimiento para compresores"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM mantenimientos_tipo WHERE tipo_compresor = %s", (tipo,))
        maintenance_types = cursor.fetchall()
        return {"maintenance_types": maintenance_types}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching maintenance types: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@maintenance_web.post("/maintenance/add", tags=["🛠️ Mantenimiento de Compresores"])
def add_maintenance(request: AddMaintenanceRequest):
    """Agregar un nuevo registro de mantenimiento"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM compresores WHERE id = %s", (request.id_compresor,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Compresor no encontrado")

        cursor.execute(
            """INSERT INTO mantenimientos
               (id_compresor, id_mantenimiento, frecuencia_horas, ultimo_mantenimiento, activo,
                observaciones, costo, creado_por, fecha_creacion)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (request.id_compresor, request.id_mantenimiento, request.frecuencia_horas,
             request.ultimo_mantenimiento, request.activo, request.observaciones,
             request.costo, request.creado_por, request.fecha_creacion)
        )

        maintenance_id = cursor.lastrowid
        conn.commit()

        return {
            "message": "Mantenimiento agregado exitosamente",
            "id": maintenance_id,
            "id_compresor": request.id_compresor,
            "id_mantenimiento": request.id_mantenimiento,
            "frecuencia_horas": request.frecuencia_horas
        }

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding maintenance: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@maintenance_web.get("/maintenance/list", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_records(numero_cliente: Optional[int] = Query(None, description="Número de cliente")):
    """Obtener todos los registros de mantenimiento"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        if numero_cliente:
            cursor.execute("""
                SELECT m.*, c.Alias as compressor_alias, c.linea, cl.nombre_cliente, cl.numero_cliente,
                       mt.nombre_tipo, mt.tipo_compresor
                FROM mantenimientos m
                JOIN compresores c ON m.id_compresor = c.id
                JOIN clientes cl ON c.id_cliente = cl.id_cliente
                LEFT JOIN mantenimientos_tipo mt ON m.id_mantenimiento = mt.id_mantenimiento
                WHERE cl.numero_cliente = %s
                ORDER BY cl.nombre_cliente, c.Alias, m.fecha_creacion DESC
            """, (numero_cliente,))
        else:
            cursor.execute("""
                SELECT m.*, c.Alias as compressor_alias, c.linea, cl.nombre_cliente, cl.numero_cliente,
                       mt.nombre_tipo, mt.tipo_compresor
                FROM mantenimientos m
                JOIN compresores c ON m.id_compresor = c.id
                JOIN clientes cl ON c.id_cliente = cl.id_cliente
                LEFT JOIN mantenimientos_tipo mt ON m.id_mantenimiento = mt.id_mantenimiento
                ORDER BY cl.nombre_cliente, c.Alias, m.fecha_creacion DESC
            """)

        maintenance_records = cursor.fetchall()
        return {"maintenance_records": maintenance_records, "total": len(maintenance_records)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching maintenance records: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@maintenance_web.get("/maintenance/semaforo/{id_compresor}", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_semaforo(id_compresor: int):
    """Obtener las horas acumuladas por mantenimiento"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id_mantenimiento, horas_acumuladas FROM mantenimientos WHERE id_compresor = %s",
            (id_compresor,)
        )
        rows = cursor.fetchall()

        if not rows:
            return {"id_compresor": id_compresor, "mantenimientos": [], "message": "No hay datos disponibles"}

        mantenimientos_horas = []
        for row in rows:
            id_m = None
            horas = 0.0
            if row.get('id_mantenimiento') is not None:
                try:
                    id_m = int(row['id_mantenimiento'])
                except Exception:
                    id_m = None
            if row.get('horas_acumuladas') is not None:
                try:
                    horas = float(row['horas_acumuladas'])
                except Exception:
                    horas = 0.0

            if id_m is not None:
                mantenimientos_horas.append({"id_mantenimiento": id_m, "horas_acumuladas": horas})

        return {"id_compresor": id_compresor, "mantenimientos": mantenimientos_horas}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching semaforo data: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@maintenance_web.get("/maintenance/{maintenance_id}", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_by_id(maintenance_id: int):
    """Obtener un registro de mantenimiento específico por ID"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT m.*, c.Alias as compressor_alias, c.linea, cl.nombre_cliente, cl.numero_cliente,
                   mt.nombre_tipo, mt.tipo_compresor
            FROM mantenimientos m
            JOIN compresores c ON m.id_compresor = c.id
            JOIN clientes cl ON c.id_cliente = cl.id_cliente
            LEFT JOIN mantenimientos_tipo mt ON m.id_mantenimiento = mt.id_mantenimiento
            WHERE m.id = %s
        """, (maintenance_id,))

        maintenance = cursor.fetchone()
        if not maintenance:
            raise HTTPException(status_code=404, detail="Registro de mantenimiento no encontrado")

        return maintenance

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching maintenance record: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@maintenance_web.put("/maintenance/{maintenance_id}", tags=["🛠️ Mantenimiento de Compresores"])
def update_maintenance(maintenance_id: int, request: UpdateMaintenanceRequest):
    """Actualizar un registro de mantenimiento existente"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM mantenimientos WHERE id = %s", (maintenance_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Registro de mantenimiento no encontrado")

        update_fields = []
        update_values = []

        if request.id_mantenimiento is not None:
            update_fields.append("id_mantenimiento = %s")
            update_values.append(request.id_mantenimiento)
        if request.frecuencia_horas is not None:
            update_fields.append("frecuencia_horas = %s")
            update_values.append(request.frecuencia_horas)
        if request.ultimo_mantenimiento is not None:
            update_fields.append("ultimo_mantenimiento = %s")
            update_values.append(request.ultimo_mantenimiento)
        if request.activo is not None:
            update_fields.append("activo = %s")
            update_values.append(request.activo)
        if request.observaciones is not None:
            update_fields.append("observaciones = %s")
            update_values.append(request.observaciones)
        if request.costo is not None:
            update_fields.append("costo = %s")
            update_values.append(request.costo)
        if request.editado_por is not None:
            update_fields.append("editado_por = %s")
            update_values.append(request.editado_por)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")

        update_query = f"UPDATE mantenimientos SET {', '.join(update_fields)} WHERE id = %s"
        update_values.append(maintenance_id)

        cursor.execute(update_query, update_values)
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="No se pudo actualizar el registro")

        return {"message": "Mantenimiento actualizado exitosamente", "id": maintenance_id}

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating maintenance: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@maintenance_web.delete("/maintenance/{maintenance_id}", tags=["🛠️ Mantenimiento de Compresores"])
def delete_maintenance(maintenance_id: int):
    """Eliminar un registro de mantenimiento"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id, id_compresor FROM mantenimientos WHERE id = %s", (maintenance_id,))
        maintenance = cursor.fetchone()
        if not maintenance:
            raise HTTPException(status_code=404, detail="Registro de mantenimiento no encontrado")

        cursor.execute("DELETE FROM mantenimientos WHERE id = %s", (maintenance_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="No se pudo eliminar el registro")

        return {
            "message": "Mantenimiento eliminado exitosamente",
            "id": maintenance_id,
            "id_compresor": maintenance["id_compresor"]
        }

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting maintenance: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@maintenance_web.get("/maintenance/report-data-by-id/{registro_id}", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_report_data_by_id(registro_id: str):
    """Obtener datos del reporte de mantenimiento por ID de registro"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
        SELECT rmt.*, c.hp, c.voltaje, c.anio, c.Alias
        FROM registros_mantenimiento_tornillo rmt
        LEFT JOIN compresores c ON rmt.numero_serie = c.numero_serie
        WHERE rmt.id = %s
        LIMIT 1
        """

        cursor.execute(query, (registro_id,))
        registro = cursor.fetchone()

        if not registro:
            raise HTTPException(status_code=404, detail=f"No se encontró registro con ID {registro_id}")

        fotos_drive = get_drive_folder_images(registro.get("carpeta_fotos"))

        mantenimientos_realizados = []
        for columna_bd, nombre_mantenimiento in MAINTENANCE_COLUMN_MAPPING.items():
            valor = registro.get(columna_bd, "No")
            if valor and valor.lower() in ["sí", "si", "yes", "1"]:
                mantenimientos_realizados.append({"nombre": nombre_mantenimiento, "realizado": True, "valor": valor})
            else:
                mantenimientos_realizados.append({"nombre": nombre_mantenimiento, "realizado": False, "valor": valor if valor else "No"})

        reporte = {
            "id": registro.get("id"),
            "timestamp": registro.get("timestamp").isoformat() if registro.get("timestamp") else None,
            "cliente": registro.get("cliente"),
            "tecnico": registro.get("tecnico"),
            "email": registro.get("email"),
            "tipo": registro.get("tipo"),
            "compresor": registro.get("compresor"),
            "numero_serie": registro.get("numero_serie"),
            "comentarios_generales": registro.get("comentarios_generales"),
            "numero_cliente": registro.get("numero_cliente"),
            "comentario_cliente": registro.get("comentario_cliente"),
            "link_form": registro.get("link_form"),
            "carpeta_fotos": registro.get("carpeta_fotos"),
            "fotos_drive": fotos_drive,
            "mantenimientos": mantenimientos_realizados,
            "Generado": registro.get("Generado", 0),
            "link_pdf": registro.get("link_pdf"),
            "hp": registro.get("hp"),
            "voltaje": registro.get("voltaje"),
            "anio": registro.get("anio"),
            "Alias": registro.get("Alias")
        }

        return {"success": True, "reporte": reporte}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching maintenance report data: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@maintenance_web.put("/maintenance/update-report/{registro_id}", tags=["🛠️ Mantenimiento de Compresores"])
def update_maintenance_report(registro_id: int, request: UpdateMaintenanceReportRequest):
    """Actualiza los datos de un reporte de mantenimiento existente"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        reverse_mapping = {v: k for k, v in MAINTENANCE_COLUMN_MAPPING.items()}

        maintenance_updates = {}
        for item in request.mantenimientos:
            column_name = reverse_mapping.get(item.nombre)
            if column_name:
                maintenance_updates[column_name] = "Sí" if item.realizado else "No"

        update_fields = []
        update_values = []

        if request.cliente:
            update_fields.append("cliente = %s")
            update_values.append(request.cliente)
        if request.tipo:
            update_fields.append("tipo = %s")
            update_values.append(request.tipo)
        if request.compresor:
            update_fields.append("compresor = %s")
            update_values.append(request.compresor)
        if request.numero_serie:
            update_fields.append("numero_serie = %s")
            update_values.append(request.numero_serie)
        if request.tecnico:
            update_fields.append("tecnico = %s")
            update_values.append(request.tecnico)
        if request.email:
            update_fields.append("email = %s")
            update_values.append(request.email)
        if request.anio is not None:
            update_fields.append("anio = %s")
            update_values.append(request.anio)
        if request.comentarios_generales is not None:
            update_fields.append("comentarios_generales = %s")
            update_values.append(request.comentarios_generales)
        if request.comentario_cliente is not None:
            update_fields.append("comentario_cliente = %s")
            update_values.append(request.comentario_cliente)

        for column, value in maintenance_updates.items():
            update_fields.append(f"{column} = %s")
            update_values.append(value)

        update_values.append(registro_id)

        if update_fields:
            query = f"UPDATE registros_mantenimiento_tornillo SET {', '.join(update_fields)} WHERE id = %s"
            cursor.execute(query, update_values)
            conn.commit()

        # Actualizar compresores si hay campos relacionados
        compressor_updates = []
        compressor_values = []

        if request.hp is not None:
            compressor_updates.append("hp = %s")
            compressor_values.append(request.hp)
        if request.voltaje is not None:
            compressor_updates.append("voltaje = %s")
            compressor_values.append(request.voltaje)
        if request.Alias is not None:
            compressor_updates.append("Alias = %s")
            compressor_values.append(request.Alias)
        if request.anio is not None:
            compressor_updates.append("anio = %s")
            compressor_values.append(request.anio)
        if request.compresor:
            compressor_updates.append("marca = %s")
            compressor_values.append(request.compresor)

        if compressor_updates and request.numero_serie:
            compressor_values.append(request.numero_serie)
            compressor_query = f"UPDATE compresores SET {', '.join(compressor_updates)} WHERE numero_serie = %s"
            cursor.execute(compressor_query, compressor_values)
            conn.commit()

        return {"success": True, "message": "Reporte actualizado exitosamente", "registro_id": registro_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating maintenance report: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@maintenance_web.get("/maintenance/report-data/{numero_serie}", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_report_data(numero_serie: str):
    """Obtener datos del reporte de mantenimiento por número de serie del día actual"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
        SELECT * FROM registros_mantenimiento_tornillo
        WHERE numero_serie = %s
          AND timestamp >= CURDATE()
          AND timestamp < CURDATE() + INTERVAL 1 DAY
        ORDER BY timestamp DESC
        LIMIT 1
        """

        cursor.execute(query, (numero_serie,))
        registro = cursor.fetchone()

        if not registro:
            raise HTTPException(status_code=404, detail=f"No se encontró registro para {numero_serie} hoy")

        mantenimientos_realizados = []
        for columna_bd, nombre_mantenimiento in MAINTENANCE_COLUMN_MAPPING.items():
            valor = registro.get(columna_bd, "No")
            if valor and valor.lower() in ["sí", "si", "yes", "1"]:
                mantenimientos_realizados.append({"nombre": nombre_mantenimiento, "realizado": True, "valor": valor})
            else:
                mantenimientos_realizados.append({"nombre": nombre_mantenimiento, "realizado": False, "valor": valor if valor else "No"})

        reporte = {
            "id": registro.get("id"),
            "timestamp": registro.get("timestamp").isoformat() if registro.get("timestamp") else None,
            "cliente": registro.get("cliente"),
            "tecnico": registro.get("tecnico"),
            "email": registro.get("email"),
            "tipo": registro.get("tipo"),
            "compresor": registro.get("compresor"),
            "numero_serie": registro.get("numero_serie"),
            "comentarios_generales": registro.get("comentarios_generales"),
            "numero_cliente": registro.get("numero_cliente"),
            "comentario_cliente": registro.get("comentario_cliente"),
            "link_form": registro.get("link_form"),
            "carpeta_fotos": registro.get("carpeta_fotos"),
            "mantenimientos": mantenimientos_realizados,
            "Generado": registro.get("Generado", 0),
            "link_pdf": registro.get("link_pdf")
        }

        return {"success": True, "reporte": reporte}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching maintenance report data: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@maintenance_web.get("/compressor/by-serial/{numero_serie}", tags=["⚙️ Gestión de Compresores"])
def get_compressor_by_serial(numero_serie: str):
    """Obtiene información de un compresor por número de serie"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT c.*, cl.nombre_cliente, cl.numero_cliente
            FROM compresores c
            LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
            WHERE c.numero_serie = %s
        """, (numero_serie,))

        compressor = cursor.fetchone()

        if not compressor:
            raise HTTPException(status_code=404, detail=f"No se encontró compresor con número de serie: {numero_serie}")

        return {"success": True, "data": compressor}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching compressor data: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
