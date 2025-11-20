from fastapi import Query, HTTPException, APIRouter, Body
from fastapi.responses import StreamingResponse

import mysql.connector
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.statespace.sarimax import SARIMAX
from pmdarima import auto_arima
from datetime import timedelta, date
import os
import dotenv as dotenv
import io
import logging
from typing import List, Tuple, Optional
from pydantic import BaseModel, EmailStr
import sys
from pathlib import Path

# Agregar el directorio de scripts al path para importar maintenance_reports
SCRIPT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

# Modelos para las actualizaciones
class UpdateClientNumberRequest(BaseModel):
    email: str
    nuevo_numero_cliente: int

class UpdateUserRoleRequest(BaseModel):
    email: str
    nuevo_rol: int # 0 = SuperAdmin, 1 = Gerente VT, 2 = VAST, 3 = Gerente Cliente, 4 = Cliente

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

class GenerateReportRequest(BaseModel):
    numero_serie: str
    fecha: str
    registro_id: Optional[str] = None


# Mapeo de columnas de BD a nombres de mantenimientos legibles
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

# Load environment variables
dotenv.load_dotenv()

# Create FastAPI instance
web = APIRouter(prefix="/web", tags=["🌐 Web API"])

# Get database credentials from environment variables
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

# Constants
COLORES = ['purple', 'orange', 'blue', 'green', 'red', 'cyan', 'brown']
FP = 0.9
HORAS = 24
logging.basicConfig(level=logging.INFO)

# GET - Obtener usuario por email (para autenticación)
@web.get("/usuarios/{email}", tags=["🔐 Autenticación"])
def get_usuario_by_email(email: str):
    """Obtiene los datos del usuario por email para autenticación"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, email, numeroCliente, rol, name FROM usuarios_auth WHERE email = %s",
            (email,)
        )
        usuario = cursor.fetchall()

        id = usuario[0]['id'] if usuario else None
        email = usuario[0]['email'] if usuario else None
        numeroCliente = usuario[0]['numeroCliente'] if usuario else None
        rol = usuario[0]['rol'] if usuario else None
        name = usuario[0]['name'] if usuario else None 

        # Initialize compresores as empty list
        compresores = []

        # 0 = Admin, 1 = Gerente VT, 2 = VAST, 3 = Gerente Cliente, 4 = Cliente
        if(rol == 3 or rol == 4):
            cursor.execute("SELECT c.id as id_compresor, c.linea, c.proyecto as id_cliente, c.Alias as alias, c.tipo as tipo, c.numero_serie as numero_serie FROM compresores c JOIN clientes c2 ON c2.id_cliente = c.id_cliente WHERE c2.numero_cliente  = %s;", (numeroCliente,))
            compresores = cursor.fetchall()

        if(rol == 0 or rol == 1 or rol == 2):
            cursor.execute("SELECT  c.id as id_compresor, c.linea, c.proyecto as id_cliente, c.Alias as alias, c.numero_serie as numero_serie, c.tipo as tipo, c2.nombre_cliente, c2.numero_cliente FROM compresores c JOIN clientes c2 ON c.id_cliente = c2.id_cliente")
            compresores = cursor.fetchall()

        # For rol == 2 (VAST), compresores remains as empty list

        cursor.close()
        conn.close()

        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        return {
            "id": id,
            "email": email,
            "numeroCliente": numeroCliente,
            "rol": rol,
            "name": name,
            "compresores": compresores
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching usuario: {str(e)}")

# GET - Obtener ingenieros filtrados por cliente
@web.get("/ingenieros", tags=["👥 Gestión de Usuarios"])
def get_ingenieros(cliente: int = Query(..., description="Número de cliente")):
    """Obtiene todos los ingenieros de un cliente específico con sus compresores asignados"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Query que filtra por número de cliente y obtiene rol desde usuarios_auth
        query = """
            SELECT 
                e.id, 
                e.name, 
                e.email,
                e.numeroCliente,
                e.email_daily,
                e.email_weekly,
                e.email_monthly,
                u.rol,
                GROUP_CONCAT(DISTINCT c.Alias) as compressor_names
            FROM ingenieros e
            LEFT JOIN usuarios_auth u ON e.email = u.email AND e.numeroCliente = u.numeroCliente
            LEFT JOIN ingeniero_compresor ic ON e.id = ic.ingeniero_id
            LEFT JOIN compresores c ON ic.compresor_id = c.id
            WHERE e.numeroCliente = %s
            GROUP BY e.id, e.name, e.email, e.numeroCliente, e.email_daily, e.email_weekly, e.email_monthly, u.rol
            ORDER BY e.name;
        """
        cursor.execute(query, (cliente,))
        ingenieros = cursor.fetchall()

        # Formatear los datos para el frontend
        formatted_ingenieros = []
        for ingeniero in ingenieros:
            formatted_ingeniero = {
                "id": str(ingeniero['id']),
                "name": ingeniero['name'],
                "email": ingeniero['email'],
                "rol": ingeniero.get('rol', 4),  # Por defecto rol 1 si no existe
                "compressors": [],
                "emailPreferences": {
                    "daily": bool(ingeniero.get('email_daily', False)),
                    "weekly": bool(ingeniero.get('email_weekly', False)),
                    "monthly": bool(ingeniero.get('email_monthly', False))
                }
            }
            
            # Procesar compresores
            if ingeniero['compressor_names']:
                formatted_ingeniero['compressors'] = ingeniero['compressor_names'].split(',')
            
            formatted_ingenieros.append(formatted_ingeniero)

        cursor.close()
        conn.close()

        return formatted_ingenieros

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching ingenieros: {str(e)}")

# GET - Obtener compresores filtrados por cliente
@web.get("/compresores", tags=["⚙️ Gestión de Compresores"])
def get_compresores(cliente: int = Query(..., description="Número de cliente")):
    """Obtiene todos los compresores de un cliente específico"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT c.id, c.linea, c.proyecto as id_cliente, c.Alias as alias FROM compresores c JOIN clientes c2 ON c2.id_cliente = c.id_cliente WHERE c2.numero_cliente  = %s;",
            (cliente,)
        )
        compresores = cursor.fetchall()

        cursor.close()
        conn.close()

        # Formatear para el frontend
        formatted_compresores = [
            {
                "id": str(comp['id']),
                "id_cliente": comp['id_cliente'],
                "linea": comp['linea'], 
                "alias": comp['alias'],
            } 
            for comp in compresores
        ]

        return formatted_compresores

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching compresores: {str(e)}")

# POST - Crear nuevo ingeniero
@web.post("/ingenieros", tags=["👥 Gestión de Usuarios"])
def create_ingeniero(
    name: str = Body(...),
    email: EmailStr = Body(...),
    compressors: list[str] = Body(default=[]),
    numeroCliente: int = Body(..., description="Número de cliente"),
    rol: int = Body(default=4, description="Rol del usuario: 0 = SuperAdmin, 1 = Gerente VT, 2 = VAST, 3 = Gerente Cliente, 4 = Cliente")
):
    """Crea un nuevo ingeniero con sus compresores asignados para un cliente específico"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Verificar si el email ya existe
        cursor.execute("SELECT id FROM ingenieros WHERE email = %s", (email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="El email ya está registrado")

        # Insertar el ingeniero con número de cliente
        cursor.execute(
            """INSERT INTO ingenieros (name, email, numeroCliente, email_daily, email_weekly, email_monthly) 
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (name, email, numeroCliente, False, False, False)
        )
        ingeniero_id = cursor.lastrowid

        # Asignar compresores si se proporcionaron
        if compressors and len(compressors) > 0:
            # Buscar compresores por ID y verificar que pertenecen al cliente
            cursor.execute(
                """SELECT c.id, c.id_cliente, c.linea, c.Alias 
                   FROM compresores c 
                   JOIN clientes cl ON c.id_cliente = cl.id_cliente 
                   WHERE c.id IN (%s) AND cl.numero_cliente = %s""" % 
                (','.join(['%s'] * len(compressors)), '%s'),
                compressors + [numeroCliente]
            )
            valid_compressors = cursor.fetchall()
            
            if valid_compressors:
                values = [(ingeniero_id, comp['id']) for comp in valid_compressors]
                cursor.executemany(
                    "INSERT INTO ingeniero_compresor (ingeniero_id, compresor_id) VALUES (%s, %s)",
                    values
                )

        # También crear entrada en usuarios_auth para el ingeniero (usando el rol proporcionado)
        cursor.execute(
            """INSERT INTO usuarios_auth (email, numeroCliente, rol, name) 
               VALUES (%s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE 
               numeroCliente = VALUES(numeroCliente),
               rol = VALUES(rol),
               name = VALUES(name)""",
            (email, numeroCliente, rol, name)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": str(ingeniero_id),
            "name": name,
            "email": email,
            "compressors": compressors,
            "emailPreferences": {
                "daily": False,
                "weekly": False,
                "monthly": False
            }
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating ingeniero: {str(e)}")

# PUT - Actualizar ingeniero existente
@web.put("/ingenieros/{ingeniero_id}", tags=["👥 Gestión de Usuarios"])
def update_ingeniero(
    ingeniero_id: int,
    name: str = Body(...),
    email: EmailStr = Body(...),
    compressors: list[str] = Body(default=[]),
    numeroCliente: int = Body(..., description="Número de cliente"),
    rol: int = Body(default=4, description="Rol del usuario: 0 = SuperAdmin, 1 = Gerente VT, 2 = VAST, 3 = Gerente Cliente, 4 = Cliente")
):
    """Actualiza un ingeniero existente y sus compresores asignados"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Verificar si el ingeniero existe y pertenece al cliente
        cursor.execute(
            "SELECT id, email FROM ingenieros WHERE id = %s AND numeroCliente = %s", 
            (ingeniero_id, numeroCliente)
        )
        existing_engineer = cursor.fetchone()
        if not existing_engineer:
            raise HTTPException(status_code=404, detail="Ingeniero no encontrado")

        old_email = existing_engineer['email']

        # Verificar si el email ya existe en otro ingeniero
        cursor.execute(
            "SELECT id FROM ingenieros WHERE email = %s AND id != %s", 
            (email, ingeniero_id)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="El email ya está registrado")

        # Actualizar datos del ingeniero
        cursor.execute(
            "UPDATE ingenieros SET name = %s, email = %s WHERE id = %s",
            (name, email, ingeniero_id)
        )

        # Eliminar asignaciones de compresores existentes
        cursor.execute(
            "DELETE FROM ingeniero_compresor WHERE ingeniero_id = %s",
            (ingeniero_id,)
        )

        # Asignar nuevos compresores
        if compressors and len(compressors) > 0:
            # Buscar compresores por ID y verificar que pertenecen al cliente
            cursor.execute(
                """SELECT c.id, c.id_cliente, c.linea, c.Alias 
                   FROM compresores c 
                   JOIN clientes cl ON c.id_cliente = cl.id_cliente 
                   WHERE c.id IN (%s) AND cl.numero_cliente = %s""" % 
                (','.join(['%s'] * len(compressors)), '%s'),
                compressors + [numeroCliente]
            )
            valid_compressors = cursor.fetchall()
            
            if valid_compressors:
                values = [(ingeniero_id, comp['id']) for comp in valid_compressors]
                cursor.executemany(
                    "INSERT INTO ingeniero_compresor (ingeniero_id, compresor_id) VALUES (%s, %s)",
                    values
                )

        # Actualizar también la tabla usuarios_auth
        cursor.execute(
            """UPDATE usuarios_auth SET email = %s, name = %s, rol = %s 
               WHERE email = %s AND numeroCliente = %s""",
            (email, name, rol, old_email, numeroCliente)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": str(ingeniero_id),
            "name": name,
            "email": email,
            "compressors": compressors
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating ingeniero: {str(e)}")

# DELETE - Eliminar ingeniero
@web.delete("/ingenieros/{ingeniero_id}", tags=["👥 Gestión de Usuarios"])
def delete_ingeniero(
    ingeniero_id: int,
    cliente: int = Query(..., description="Número de cliente para verificación")
):
    """Elimina un ingeniero y sus asignaciones de compresores"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Verificar si el ingeniero existe y pertenece al cliente
        cursor.execute(
            "SELECT name, email FROM ingenieros WHERE id = %s AND numeroCliente = %s", 
            (ingeniero_id, cliente)
        )
        ingeniero = cursor.fetchone()
        if not ingeniero:
            raise HTTPException(status_code=404, detail="Ingeniero no encontrado")

        # Eliminar asignaciones de compresores primero (FK constraint)
        cursor.execute(
            "DELETE FROM ingeniero_compresor WHERE ingeniero_id = %s",
            (ingeniero_id,)
        )

        # Eliminar el ingeniero
        cursor.execute("DELETE FROM ingenieros WHERE id = %s", (ingeniero_id,))

        # Eliminar también de usuarios_auth
        cursor.execute(
            "DELETE FROM usuarios_auth WHERE email = %s AND numeroCliente = %s AND rol = 3",
            (ingeniero['email'], cliente)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": f"Ingeniero {ingeniero['name']} eliminado correctamente",
            "id": str(ingeniero_id)
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting ingeniero: {str(e)}")

# PUT - Actualizar preferencias de email
@web.put("/ingenieros/{ingeniero_id}/email-preferences", tags=["⚙️ Configuración de Usuario"])
def update_email_preferences(
    ingeniero_id: int,
    daily: bool = Body(...),
    weekly: bool = Body(...),
    monthly: bool = Body(...)
):
    """Actualiza las preferencias de email de un ingeniero"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Verificar si el ingeniero existe
        cursor.execute("SELECT id FROM ingenieros WHERE id = %s", (ingeniero_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Ingeniero no encontrado")

        # Actualizar preferencias
        cursor.execute(
            """UPDATE ingenieros 
               SET email_daily = %s, email_weekly = %s, email_monthly = %s 
               WHERE id = %s""",
            (daily, weekly, monthly, ingeniero_id)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": str(ingeniero_id),
            "emailPreferences": {
                "daily": daily,
                "weekly": weekly,
                "monthly": monthly
            }
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating email preferences: {str(e)}")

# PATCH - Actualizar preferencias de email (endpoint alternativo para PATCH requests)
@web.patch("/ingenieros/{ingeniero_id}/preferences", tags=["⚙️ Configuración de Usuario"])
def patch_email_preferences(
    ingeniero_id: int,
    daily: Optional[bool] = Body(None),
    weekly: Optional[bool] = Body(None),
    monthly: Optional[bool] = Body(None)
):
    """Actualiza las preferencias de email de un ingeniero (PATCH method)"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Verificar si el ingeniero existe
        cursor.execute("SELECT email_daily, email_weekly, email_monthly FROM ingenieros WHERE id = %s", (ingeniero_id,))
        current_prefs = cursor.fetchone()
        if not current_prefs:
            raise HTTPException(status_code=404, detail="Ingeniero no encontrado")

        # Usar valores actuales si no se proporcionan nuevos
        new_daily = daily if daily is not None else current_prefs['email_daily']
        new_weekly = weekly if weekly is not None else current_prefs['email_weekly']
        new_monthly = monthly if monthly is not None else current_prefs['email_monthly']

        # Actualizar preferencias
        cursor.execute(
            """UPDATE ingenieros 
               SET email_daily = %s, email_weekly = %s, email_monthly = %s 
               WHERE id = %s""",
            (new_daily, new_weekly, new_monthly, ingeniero_id)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": str(ingeniero_id),
            "emailPreferences": {
                "daily": new_daily,
                "weekly": new_weekly,
                "monthly": new_monthly
            }
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating email preferences: {str(e)}")

# GET - Obtener compresores asignados a un ingeniero (para vista de ingeniero)
@web.get("/ingenieros/{email}/compresores", tags=["👨‍💼 Vista de Ingeniero"])
def get_engineer_compressors(email: str):
    """Obtiene los compresores asignados a un ingeniero específico"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT DISTINCT 
                c.id, 
                COALESCE(c.Alias, CONCAT(c.marca, ' - ', c.numero_serie)) as name,
                c.id_cliente,
                c.tipo,
                c.hp
            FROM compresores c
            INNER JOIN ingeniero_compresor ec ON c.id = ec.compresor_id
            INNER JOIN ingenieros e ON ec.ingeniero_id = e.id
            WHERE e.email = %s
            ORDER BY COALESCE(c.Alias, c.marca)
        """
        cursor.execute(query, (email,))
        compresores = cursor.fetchall()

        cursor.close()
        conn.close()

        formatted_compresores = [
            {
                "id": str(comp['id']), 
                "name": comp['name'],
                "id_cliente": comp['id_cliente'],
                "details": f"{comp['tipo']} - {comp['hp']}HP" if comp['tipo'] and comp['hp'] else ""
            } 
            for comp in compresores
        ]

        return formatted_compresores

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching engineer compressors: {str(e)}")

# GET - Obtener registros de mantenimiento por número de cliente
@web.get("/registros-mantenimiento", tags=["🔧 Mantenimiento"])
def get_registros_mantenimiento(numero_cliente: int = Query(..., description="Número del cliente")):
    """Obtiene los registros de mantenimiento de compresores de un cliente"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Consulta para obtener registros de mantenimiento filtrados por número de cliente
        query = """
            SELECT 
                id,
                timestamp,
                cliente,
                tecnico,
                email,
                tipo,
                compresor,
                numero_serie,
                filtro_aire,
                filtro_aceite,
                separador_aceite,
                aceite,
                kit_admision,
                kit_minima,
                kit_termostatica,
                cople_flexible,
                valvula_solenoide,
                sensor_temperatura,
                transductor_presion,
                contactores,
                analisis_baleros_unidad,
                analisis_baleros_ventilador,
                lubricacion_baleros,
                limpieza_radiador_interna,
                limpieza_radiador_externa,
                comentarios_generales,
                numero_cliente,
                comentario_cliente,
                link_form,
                carpeta_fotos
            FROM registros_mantenimiento_tornillo
            WHERE numero_cliente = %s
            ORDER BY timestamp DESC
        """
        cursor.execute(query, (numero_cliente,))
        registros = cursor.fetchall()

        cursor.close()
        conn.close()

        # Formatear los registros para el frontend
        formatted_registros = []
        for registro in registros:
            # Construir lista de tareas realizadas usando el mapeo
            tasks = []
            for col_name, display_name in MAINTENANCE_COLUMN_MAPPING.items():
                if col_name in registro and registro[col_name]:
                    # Verificar si se realizó el mantenimiento (Sí/No)
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
                "photos": [],  # Las fotos están en Google Drive (carpeta_fotos)
                "carpeta_fotos": registro['carpeta_fotos'] or "",
                "link_form": registro['link_form'] or "",
                "comentarios_generales": registro['comentarios_generales'] or "",
                "comentario_cliente": registro['comentario_cliente'] or ""
            }
            formatted_registros.append(formatted_registro)

        return formatted_registros

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching registros de mantenimiento: {str(e)}")
    
@web.get("/beta/consumption_prediction", tags=["📊 Análisis y Predicciones"])
def consumption_prediction_plot(
    numero_cliente: int = Query(..., description="Número del cliente")
):
    try:
        compresores = obtener_compresores(numero_cliente)
        if not compresores:
            return {"error": "El cliente no tiene compresores registrados"}

        df_total = pd.DataFrame()
        nombres_compresores = {}
        voltaje_ref = 440
        costoKwh = 0.1

        # Para cada compresor, cargar datos (optimizado)
        for (id_cliente, linea, alias, segundosPR, voltaje, costo), color in zip(compresores, COLORES):
            try:
                df = obtener_kwh_fp(id_cliente, linea, segundosPR, voltaje)
                if df.empty:
                    continue
                    
                df['Fecha'] = pd.to_datetime(df['Fecha'])
                df['kWh'] = pd.to_numeric(df['kWh'], errors='coerce')
                
                # Simplificado: solo agrupar por fecha y sumar
                df_grouped = df.groupby('Fecha')['kWh'].sum().asfreq('D')
                df_grouped = pd.DataFrame({'kWh': df_grouped})
                df_grouped[f'kWh_{id_cliente}_{linea}'] = df_grouped['kWh']
                
                nombres_compresores[f'kWh_{id_cliente}_{linea}'] = alias
                voltaje_ref = voltaje
                costoKwh = costo

                if df_total.empty:
                    df_total = df_grouped
                else:
                    df_total = df_total.join(df_grouped[f'kWh_{id_cliente}_{linea}'], how='outer')
                    
            except Exception as e:
                continue

        if df_total.empty:
            return {"error": "No se pudieron cargar datos de ningún compresor"}

        # Identificar columnas para gráfico (simplificado)
        kwh_cols = [col for col in df_total.columns if col.startswith('kWh_') and '_' in col]
        
        # Total diario (simplificado)
        df_total['kWh'] = df_total[kwh_cols].sum(axis=1, skipna=True)
        
        # Limpieza simple usando quantiles (como pythonDaltile.py)
        mask_no_zeros = df_total['kWh'].notna() & (df_total['kWh'] > 0)
        if mask_no_zeros.sum() > 3:
            q_low = df_total.loc[mask_no_zeros, 'kWh'].quantile(0.05)
            q_high = df_total.loc[mask_no_zeros, 'kWh'].quantile(0.95)
            df_total.loc[mask_no_zeros, 'kWh'] = df_total.loc[mask_no_zeros, 'kWh'].clip(q_low, q_high)
        
        # Generate predictions usando función optimizada
        dias_prediccion = 3
        ultima_fecha = df_total.index[-1]
        fechas_prediccion = pd.date_range(ultima_fecha + timedelta(days=1), periods=dias_prediccion, freq='D')
        
        predicciones, metodo_usado = generate_predictions_fast(df_total['kWh'], dias_prediccion)

        # Estimación anual simplificada
        hist_kwh = df_total['kWh'].dropna()[-6:].tolist()
        kwh_validos = [x for x in hist_kwh if x > 0] + [x for x in predicciones if x > 0]
        
        if kwh_validos:
            promedio_diario = np.mean(kwh_validos)
        else:
            promedio_diario = 0
            
        kwh_anual = promedio_diario * 365
        costo_anual = kwh_anual * costoKwh

        # 🎨 GRAFICAR (apilado por compresor)
        plt.switch_backend('Agg')  # Usar backend no-GUI
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Fill missing values with 0 for stacking
        df_plot = df_total[kwh_cols].fillna(0)
        bottom = np.zeros(len(df_total))
        
        for col, color in zip(kwh_cols, COLORES):
            if col in nombres_compresores:
                label = nombres_compresores[col]
                ax.bar(df_total.index, df_plot[col], label=label, color=color, bottom=bottom, width=0.8)
                bottom += df_plot[col].values

        # Total diario anotado
        for x, y in zip(df_total.index, df_total['kWh']):
            if pd.notna(y) and y > 0:
                ax.text(x, y + max(y * 0.05, 5), f'{y:.0f}', ha='center', va='bottom', fontsize=8, color='black')

        # Predicciones
        if any(p > 0 for p in predicciones):
            ax.plot(fechas_prediccion, predicciones, label="Predicción", color="black", marker="o", linewidth=2)
            for x, y in zip(fechas_prediccion, predicciones):
                ax.text(x, y + max(y * 0.05, 5), f"{y:.0f}", ha="center", va="bottom", fontsize=9, color="black", weight='bold')

        # Recuadro con estimación
        recuadro = f"Estimación Anual: {kwh_anual:,.0f} kWh\nCosto Estimado: ${costo_anual:,.0f} USD"
        plt.gcf().text(0.72, 0.82, recuadro, fontsize=11, bbox=dict(facecolor='white', edgecolor='black', alpha=0.9))

        ax.set_title(f"Consumo Energético Diario", fontsize=14, weight='bold')
        ax.set_xlabel("Fecha")
        ax.set_ylabel("Consumo (kWh)")
        ax.legend(loc='upper left')
        ax.grid(True, alpha=0.3)
        
        # Improve date formatting
        fig.autofmt_xdate()
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)

        return StreamingResponse(buf, media_type="image/png")
        
    except Exception as e:
        return {"error": f"Error interno del servidor: {str(e)}"}

@web.get("/beta/pressure-plot", tags=["📈 Visualización de Datos"])
def pressure_analysis_plot( numero_cliente: int = Query(..., description="Número del cliente"), fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    try:
        dispositivos = obtener_medidores_presion(numero_cliente)
        
        if not dispositivos:
            return {"error": "No se encontraron dispositivos de presión para este cliente"}
        
        # Enhanced Constants
        presion_min = 100
        presion_max = 120
        V_tanque = 700  # litros
        P_ATM = 14.7  # psia, referencia
        COMP_FLOW_REF_CFM = 50.0
        COMP_P_REF_PSIG = 100.0
        COMP_SENS_PSI = 0.005
        MARGEN_SEGURIDAD = 0.20
        
        # Use the first pressure device available
        first_device = dispositivos[0]
        p_device_id = first_device["p_device_id"]
        dispositivo_id = first_device["dispositivo_id"]
        linea = first_device["linea"].strip()

        # Fetch data
        df = obtener_datos_presion(p_device_id, dispositivo_id, linea, fecha)
        
        if df.empty:
            return {"error": "No se encontraron datos de presión para los parámetros especificados"}

        # Convert time column to datetime
        if 'time' in df.columns:
            df['time'] = pd.to_datetime(df['time'], errors='coerce')

        df['presion1_psi'] = pd.to_numeric(df['presion1_psi'], errors='coerce')
        df = df.dropna(subset=['presion1_psi']).reset_index(drop=True)

        # Enhanced filter for real operation
        start_idx = df.index[df['presion1_psi'] >= presion_min].min()
        end_idx = df.index[df['estado'].notna()].max() if df['estado'].notna().any() else df.index[-1]
        
        if pd.isna(start_idx):
            start_idx = 0
            
        df_operativa = df.loc[start_idx:end_idx].copy()

        if df_operativa.empty:
            return {"error": "No hay datos operativos válidos con las condiciones definidas"}

        # Smooth average
        df_operativa['presion_suavizada'] = df_operativa['presion1_psi'].rolling(window=3, min_periods=1).mean()
        promedio = df_operativa['presion_suavizada'].mean()

        # Enhanced critical events detection
        fuera_bajo = df_operativa['presion1_psi'] < presion_min
        df_operativa['evento_bajo'] = fuera_bajo & (~fuera_bajo.shift(1, fill_value=False))

        eventos = []
        i = 0
        last_idx = len(df_operativa) - 1
        while i < len(df_operativa):
            if fuera_bajo.iloc[i]:
                start = i
                while i + 1 < len(df_operativa) and fuera_bajo.iloc[i+1]:
                    i += 1
                end = i
                if end < last_idx:
                    eventos.append((start, end))
            i += 1

        # Calculate enhanced critical events with flow modeling
        eventos_criticos = []
        for start, end in eventos:
            registros = df_operativa.loc[start:end]
            if registros.empty:
                continue
                
            delta_t_min = 30.0 / 60.0
            volumen_faltante_L = np.sum((1 - registros['presion1_psi'] / promedio) * V_tanque * delta_t_min)
            duracion = len(registros) * delta_t_min
            min_presion = registros['presion1_psi'].min()
            
            eventos_criticos.append({
                'start_idx': start,
                'end_idx': end,
                'inicio': registros['time'].iloc[0],
                'fin': registros['time'].iloc[-1],
                'min_presion': min_presion,
                'volumen_faltante_L': volumen_faltante_L,
                'duracion_min': duracion
            })

        eventos_criticos = sorted(eventos_criticos, key=lambda x: x['volumen_faltante_L'], reverse=True)
        top_eventos = eventos_criticos[:3]

        # Enhanced metrics calculation
        df_operativa['delta_presion'] = df_operativa['presion1_psi'].diff()
        df_operativa['delta_t'] = 30 / 60
        df_operativa['pendiente'] = df_operativa['delta_presion'] / df_operativa['delta_t']
        pendiente_subida = df_operativa[df_operativa['pendiente'] > 0]['pendiente'].mean()
        pendiente_bajada = df_operativa[df_operativa['pendiente'] < 0]['pendiente'].mean()
        desviacion = df_operativa['presion_suavizada'].std()
        variabilidad_relativa = desviacion / (presion_max - presion_min)
        df_operativa['dentro_estable'] = df_operativa['presion_suavizada'].between(promedio-5, promedio+5)
        indice_estabilidad = df_operativa['dentro_estable'].sum() / len(df_operativa) * 100
        tiempo_total_min = (df_operativa['time'].iloc[-1] - df_operativa['time'].iloc[0]).total_seconds() / 60
        tiempo_horas = int(tiempo_total_min // 60)
        tiempo_minutos = int(tiempo_total_min % 60)

        # Create plot
        plt.switch_backend('Agg')  # Use non-GUI backend
        fig, ax = plt.subplots(figsize=(15, 6))
        
        # Main pressure line
        ax.plot(df_operativa['time'], df_operativa['presion1_psi'], color='blue', label='Presión registrada')
        
        # Operational range
        ax.fill_between(df_operativa['time'], presion_min, presion_max, 
                       color='green', alpha=0.1, label=f'Rango operativo {presion_min}-{presion_max} psi')
        
        # Out of range points
        ax.plot(df_operativa['time'][fuera_bajo], df_operativa['presion1_psi'][fuera_bajo], 
               'o', color='red', label='Fuera de rango')
        
        # Average line
        ax.axhline(promedio, color='black', linestyle='-', label='Promedio suavizado')

        # Highlight critical events with enhanced visualization
        for ev in top_eventos:
            registros = df_operativa.loc[ev['start_idx']:ev['end_idx']]
            if not registros.empty:
                ax.fill_between(registros['time'], registros['presion1_psi'], presion_max, 
                               color='red', alpha=0.25)

        # Set labels and title
        ax.set_xlabel('Tiempo')
        ax.set_ylabel('Presión (psi)')
        ax.set_title('Presión y operación real - Indicadores y evaluación de bandas 10psi')
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()

        # Generate detailed statistics for frontend (not displayed on image)
        stats_data = {
            "presion_promedio": round(promedio, 2),
            "tiempo_total_horas": tiempo_horas,
            "tiempo_total_minutos": tiempo_minutos,
            "pendiente_subida": round(pendiente_subida, 2) if not pd.isna(pendiente_subida) else 0,
            "pendiente_bajada": round(pendiente_bajada, 2) if not pd.isna(pendiente_bajada) else 0,
            "variabilidad_relativa": round(variabilidad_relativa, 3),
            "indice_estabilidad": round(indice_estabilidad, 2),
            "eventos_criticos_total": len(eventos),
            "top_eventos": []
        }

        # Add detailed analysis for top critical events
        for idx, ev in enumerate(top_eventos, 1):
            deficit_cfm = déficit_cfm_from_vol_liters(ev['volumen_faltante_L'], ev['duracion_min'])
            resultados = evaluar_rangos_10psi_api(ev, deficit_cfm, presion_min, presion_max, 
                                                 COMP_FLOW_REF_CFM, COMP_P_REF_PSIG, COMP_SENS_PSI, MARGEN_SEGURIDAD)
            
            cubre_lista = [r for r in resultados if r['cubre']]
            
            evento_info = {
                "evento_numero": idx,
                "inicio": ev['inicio'].strftime('%H:%M:%S'),
                "fin": ev['fin'].strftime('%H:%M:%S'),
                "min_presion": round(ev['min_presion'], 2),
                "duracion_min": round(ev['duracion_min'], 1),
                "volumen_faltante_L": round(ev['volumen_faltante_L'], 1),
                "volumen_faltante_ft3": round(litros_to_ft3(ev['volumen_faltante_L']), 1),
                "deficit_cfm": round(deficit_cfm, 2),
                "tiene_solucion": len(cubre_lista) > 0
            }
            
            if cubre_lista:
                mejor = sorted(cubre_lista, key=lambda x: -x['cut_out'])[0]
                evento_info["solucion"] = {
                    "cut_out": mejor['cut_out'],
                    "cut_in": mejor['cut_in'],
                    "flow_out_cfm": round(mejor['flow_out_cfm'], 2),
                    "flow_in_cfm": round(mejor['flow_in_cfm'], 2),
                    "incremento_cfm": round(mejor['incremento_cfm'], 2),
                    "objetivo_cfm": round(mejor['objetivo_cfm'], 2)
                }
            else:
                max_incremento = max(resultados, key=lambda x: x['incremento_cfm'])
                falta_cfm = max(0.0, deficit_cfm * (1 + MARGEN_SEGURIDAD) - max_incremento['incremento_cfm'])
                evento_info["problema"] = {
                    "max_incremento_cfm": round(max_incremento['incremento_cfm'], 2),
                    "cfm_faltante": round(falta_cfm, 2),
                    "recomendacion": "Considerar: 1) añadir segundo compresor; 2) aumentar almacenamiento; 3) permitir mayor banda (>10 psi)"
                }
            
            stats_data["top_eventos"].append(evento_info)

        # Save plot to buffer
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        
        return StreamingResponse(buf, media_type="image/png")

    except Exception as e:
        return {"error": f"Error interno del servidor: {str(e)}"}

@web.get("/beta/pressure-stats", tags=["📊 Análisis y Predicciones"])
def pressure_analysis_stats(numero_cliente: int = Query(..., description="Número del cliente"), fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    """Get detailed pressure analysis statistics for frontend display"""
    try:
        dispositivos = obtener_medidores_presion(numero_cliente)
        
        if not dispositivos:
            return {"error": "No se encontraron dispositivos de presión para este cliente"}
        
        # Enhanced Constants
        presion_min = 100
        presion_max = 120
        V_tanque = 700  # litros
        P_ATM = 14.7  # psia, referencia
        COMP_FLOW_REF_CFM = 50.0
        COMP_P_REF_PSIG = 100.0
        COMP_SENS_PSI = 0.005
        MARGEN_SEGURIDAD = 0.20
        
        # Use the first pressure device available
        first_device = dispositivos[0]
        p_device_id = first_device["p_device_id"]
        dispositivo_id = first_device["dispositivo_id"]
        linea = first_device["linea"].strip()

        # Fetch data
        df = obtener_datos_presion(p_device_id, dispositivo_id, linea, fecha)
        
        if df.empty:
            return {"error": "No se encontraron datos de presión para los parámetros especificados"}

        # Convert time column to datetime
        if 'time' in df.columns:
            df['time'] = pd.to_datetime(df['time'], errors='coerce')

        df['presion1_psi'] = pd.to_numeric(df['presion1_psi'], errors='coerce')
        df = df.dropna(subset=['presion1_psi']).reset_index(drop=True)

        # Enhanced filter for real operation
        start_idx = df.index[df['presion1_psi'] >= presion_min].min()
        end_idx = df.index[df['estado'].notna()].max() if df['estado'].notna().any() else df.index[-1]
        
        if pd.isna(start_idx):
            start_idx = 0
            
        df_operativa = df.loc[start_idx:end_idx].copy()

        if df_operativa.empty:
            return {"error": "No hay datos operativos válidos con las condiciones definidas"}

        # Smooth average
        df_operativa['presion_suavizada'] = df_operativa['presion1_psi'].rolling(window=3, min_periods=1).mean()
        promedio = df_operativa['presion_suavizada'].mean()

        # Enhanced critical events detection
        fuera_bajo = df_operativa['presion1_psi'] < presion_min
        df_operativa['evento_bajo'] = fuera_bajo & (~fuera_bajo.shift(1, fill_value=False))

        eventos = []
        i = 0
        last_idx = len(df_operativa) - 1
        while i < len(df_operativa):
            if fuera_bajo.iloc[i]:
                start = i
                while i + 1 < len(df_operativa) and fuera_bajo.iloc[i+1]:
                    i += 1
                end = i
                if end < last_idx:
                    eventos.append((start, end))
            i += 1

        # Calculate enhanced critical events with flow modeling
        eventos_criticos = []
        for start, end in eventos:
            registros = df_operativa.loc[start:end]
            if registros.empty:
                continue
                
            delta_t_min = 30.0 / 60.0
            volumen_faltante_L = np.sum((1 - registros['presion1_psi'] / promedio) * V_tanque * delta_t_min)
            duracion = len(registros) * delta_t_min
            min_presion = registros['presion1_psi'].min()
            
            eventos_criticos.append({
                'start_idx': start,
                'end_idx': end,
                'inicio': registros['time'].iloc[0],
                'fin': registros['time'].iloc[-1],
                'min_presion': min_presion,
                'volumen_faltante_L': volumen_faltante_L,
                'duracion_min': duracion
            })

        eventos_criticos = sorted(eventos_criticos, key=lambda x: x['volumen_faltante_L'], reverse=True)
        top_eventos = eventos_criticos[:3]

        # Enhanced metrics calculation
        df_operativa['delta_presion'] = df_operativa['presion1_psi'].diff()
        df_operativa['delta_t'] = 30 / 60
        df_operativa['pendiente'] = df_operativa['delta_presion'] / df_operativa['delta_t']
        pendiente_subida = df_operativa[df_operativa['pendiente'] > 0]['pendiente'].mean()
        pendiente_bajada = df_operativa[df_operativa['pendiente'] < 0]['pendiente'].mean()
        desviacion = df_operativa['presion_suavizada'].std()
        variabilidad_relativa = desviacion / (presion_max - presion_min)
        df_operativa['dentro_estable'] = df_operativa['presion_suavizada'].between(promedio-5, promedio+5)
        indice_estabilidad = df_operativa['dentro_estable'].sum() / len(df_operativa) * 100
        tiempo_total_min = (df_operativa['time'].iloc[-1] - df_operativa['time'].iloc[0]).total_seconds() / 60
        tiempo_horas = int(tiempo_total_min // 60)
        tiempo_minutos = int(tiempo_total_min % 60)

        # Generate detailed statistics for frontend
        stats_data = {
            "presion_promedio": round(promedio, 2),
            "tiempo_total_horas": tiempo_horas,
            "pendiente_subida": round(pendiente_subida, 2) if not pd.isna(pendiente_subida) else 0,
            "pendiente_bajada": round(pendiente_bajada, 2) if not pd.isna(pendiente_bajada) else 0,
            "variabilidad_relativa": round(variabilidad_relativa, 3),
            "indice_estabilidad": round(indice_estabilidad, 2),
            "eventos_criticos_total": len(eventos),
        }

        return stats_data

    except Exception as e:
        return {"error": f"Error interno del servidor: {str(e)}"}

@web.put("/usuarios/update-client-number", tags=["🔧 Operaciones de Administrador"])
def update_user_client_number(request: UpdateClientNumberRequest):
    """Actualiza el número de cliente de un usuario específico (solo para administradores)"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Verificar que el usuario existe
        cursor.execute(
            "SELECT id, rol FROM usuarios_auth WHERE email = %s",
            (request.email,)
        )
        usuario = cursor.fetchone()
        cursor.fetchall()  # <-- limpia resultados

        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Verificar que el nuevo número de cliente existe
        cursor.execute(
            "SELECT id_cliente FROM clientes WHERE numero_cliente = %s",
            (request.nuevo_numero_cliente,)
        )
        cliente = cursor.fetchone()
        cursor.fetchall()  # <-- limpia resultados

        if not cliente:
            raise HTTPException(status_code=404, detail="Número de cliente no válido")

        # Actualizar el número de cliente
        cursor.execute(
            "UPDATE usuarios_auth SET numeroCliente = %s WHERE email = %s",
            (request.nuevo_numero_cliente, request.email)
        )

        # Si es un ingeniero, también actualizar en la tabla ingenieros
        if usuario['rol'] == 4:  # rol 1 = ingeniero/directo
            cursor.execute(
                "UPDATE ingenieros SET numeroCliente = %s WHERE email = %s",
                (request.nuevo_numero_cliente, request.email)
            )

        conn.commit()

        return {
            "message": "Número de cliente actualizado exitosamente",
            "email": request.email,
            "nuevo_numero_cliente": request.nuevo_numero_cliente
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating client number: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@web.get("/maintenance/types", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_types(tipo: str = Query(..., description="Tipo de compresor: piston o tornillo")):
    """Fetch maintenance types for compressors"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM mantenimientos_tipo WHERE tipo_compresor = %s", (tipo,))
        maintenance_types = cursor.fetchall()

        return {"maintenance_types": maintenance_types}

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching maintenance types: {str(e)}")
    finally:
        cursor.close()

@web.post("/maintenance/add", tags=["🛠️ Mantenimiento de Compresores"])
def add_maintenance(request: AddMaintenanceRequest):
    """Agregar un nuevo registro de mantenimiento"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Validar que el compresor existe
        cursor.execute("SELECT id FROM compresores WHERE id = %s", (request.id_compresor,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Compresor no encontrado")

        # Insertar el mantenimiento
        cursor.execute(
            """INSERT INTO mantenimientos 
               (id_compresor, id_mantenimiento, frecuencia_horas, ultimo_mantenimiento, activo, 
                observaciones, costo, creado_por, fecha_creacion) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                request.id_compresor,
                request.id_mantenimiento,
                request.frecuencia_horas,
                request.ultimo_mantenimiento,
                request.activo,
                request.observaciones,
                request.costo,
                request.creado_por,
                request.fecha_creacion
            )
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

    except mysql.connector.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding maintenance: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@web.get("/maintenance/list", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_records(
    numero_cliente: Optional[int] = Query(None, description="Número de cliente para filtrar")
):
    """Obtener todos los registros de mantenimiento, opcionalmente filtrados por cliente"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        if numero_cliente:
            # Filtrar por cliente específico
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
            # Obtener todos los registros
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

        return {
            "maintenance_records": maintenance_records,
            "total": len(maintenance_records)
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching maintenance records: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@web.get("/maintenance/semaforo/{id_compresor}", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_semaforo(id_compresor: int):
    """Obtener las horas transcurridas por mantenimiento usando el procedimiento SemaforoMantenimientos
    
    El procedimiento retorna:
    - Primera columna: id_mantenimiento
    - Segunda columna: horas_transcurridas desde el último mantenimiento
    """
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        # Llamar al procedimiento almacenado con el id_compresor
        cursor.callproc('SemaforoMantenimientos', [id_compresor])
        
        # Obtener los resultados
        semaforo_data = []
        for result in cursor.stored_results():
            semaforo_data = result.fetchall()
        
        cursor.close()
        conn.close()

        # Formatear los datos para el frontend
        # El procedimiento retorna: id_mantenimiento, horas_transcurridas
        if not semaforo_data:
            return {
                "id_compresor": id_compresor,
                "mantenimientos": [],
                "message": "No hay datos disponibles"
            }
        
        # Formatear cada fila
        mantenimientos_horas = []
        for row in semaforo_data:
            if isinstance(row, (list, tuple)) and len(row) >= 2:
                mantenimientos_horas.append({
                    "id_mantenimiento": int(row[0]),
                    "horas_transcurridas": float(row[1])
                })
            elif isinstance(row, dict):
                keys = list(row.keys())
                if len(keys) >= 2:
                    mantenimientos_horas.append({
                        "id_mantenimiento": int(row[keys[0]]),
                        "horas_transcurridas": float(row[keys[1]])
                    })

        return {
            "id_compresor": id_compresor,
            "mantenimientos": mantenimientos_horas
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching semaforo data: {str(e)}")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@web.get("/maintenance/{maintenance_id}", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_by_id(maintenance_id: int):
    """Obtener un registro de mantenimiento específico por ID"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
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

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching maintenance record: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@web.put("/maintenance/{maintenance_id}", tags=["🛠️ Mantenimiento de Compresores"])
def update_maintenance(maintenance_id: int, request: UpdateMaintenanceRequest):
    """Actualizar un registro de mantenimiento existente"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Verificar que el mantenimiento existe
        cursor.execute("SELECT id FROM mantenimientos WHERE id = %s", (maintenance_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Registro de mantenimiento no encontrado")

        # Construir la query de actualización dinámicamente
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

        if not update_fields:
            raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")

        # Ejecutar la actualización
        update_query = f"UPDATE mantenimientos SET {', '.join(update_fields)} WHERE id = %s"
        update_values.append(maintenance_id)
        
        cursor.execute(update_query, update_values)
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="No se pudo actualizar el registro")

        return {
            "message": "Mantenimiento actualizado exitosamente",
            "id": maintenance_id
        }

    except mysql.connector.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating maintenance: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@web.delete("/maintenance/{maintenance_id}", tags=["🛠️ Mantenimiento de Compresores"])
def delete_maintenance(maintenance_id: int):
    """Eliminar un registro de mantenimiento"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Verificar que el mantenimiento existe
        cursor.execute("SELECT id, id_compresor FROM mantenimientos WHERE id = %s", (maintenance_id,))
        maintenance = cursor.fetchone()
        if not maintenance:
            raise HTTPException(status_code=404, detail="Registro de mantenimiento no encontrado")

        # Eliminar el registro
        cursor.execute("DELETE FROM mantenimientos WHERE id = %s", (maintenance_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="No se pudo eliminar el registro")

        return {
            "message": "Mantenimiento eliminado exitosamente",
            "id": maintenance_id,
            "id_compresor": maintenance["id_compresor"]
        }

    except mysql.connector.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting maintenance: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@web.get("/maintenance/report-data-by-id/{registro_id}", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_report_data_by_id(registro_id: str):
    """Obtener datos del reporte de mantenimiento por ID de registro específico"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Consultar registro específico por ID
        query = """
        SELECT *
        FROM registros_mantenimiento_tornillo
        WHERE id = %s
        """
        
        cursor.execute(query, (registro_id,))
        registro = cursor.fetchone()

        if not registro:
            raise HTTPException(
                status_code=404, 
                detail=f"No se encontró registro de mantenimiento con ID {registro_id}"
            )

        # Construir lista de mantenimientos realizados
        mantenimientos_realizados = []
        
        for columna_bd, nombre_mantenimiento in MAINTENANCE_COLUMN_MAPPING.items():
            valor = registro.get(columna_bd, "No")
            if valor and valor.lower() in ["sí", "si", "yes", "1"]:
                mantenimientos_realizados.append({
                    "nombre": nombre_mantenimiento,
                    "realizado": True,
                    "valor": valor
                })
            else:
                mantenimientos_realizados.append({
                    "nombre": nombre_mantenimiento,
                    "realizado": False,
                    "valor": valor if valor else "No"
                })

        # Preparar respuesta estructurada
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
            "mantenimientos": mantenimientos_realizados
        }

        cursor.close()
        conn.close()

        return {
            "success": True,
            "reporte": reporte
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching maintenance report data: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@web.get("/maintenance/report-data/{numero_serie}", tags=["🛠️ Mantenimiento de Compresores"])
def get_maintenance_report_data(numero_serie: str):
    """Obtener datos del reporte de mantenimiento por número de serie del día actual"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Consultar registros de mantenimiento del día actual
        query = """
        SELECT *
        FROM registros_mantenimiento_tornillo
        WHERE numero_serie = %s
          AND timestamp >= CURDATE()
          AND timestamp < CURDATE() + INTERVAL 1 DAY
        ORDER BY timestamp DESC
        LIMIT 1
        """
        
        cursor.execute(query, (numero_serie,))
        registro = cursor.fetchone()

        if not registro:
            raise HTTPException(
                status_code=404, 
                detail=f"No se encontró registro de mantenimiento para el número de serie {numero_serie} en el día de hoy"
            )

        # Construir lista de mantenimientos realizados
        mantenimientos_realizados = []
        
        for columna_bd, nombre_mantenimiento in MAINTENANCE_COLUMN_MAPPING.items():
            valor = registro.get(columna_bd, "No")
            if valor and valor.lower() in ["sí", "si", "yes", "1"]:
                mantenimientos_realizados.append({
                    "nombre": nombre_mantenimiento,
                    "realizado": True,
                    "valor": valor
                })
            else:
                mantenimientos_realizados.append({
                    "nombre": nombre_mantenimiento,
                    "realizado": False,
                    "valor": valor if valor else "No"
                })

        # Preparar respuesta estructurada
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
            "mantenimientos": mantenimientos_realizados
        }

        cursor.close()
        conn.close()

        return {
            "success": True,
            "reporte": reporte
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching maintenance report data: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@web.post("/maintenance/sync-sheets", tags=[" Mantenimiento de Compresores"])
def sync_maintenance_sheets():
    """
    Ejecuta la sincronizaci�n de datos desde Google Sheets a la base de datos
    """
    try:
        from maintenance_reports import sync_sheets_to_sql
        result = sync_sheets_to_sql()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en sincronizaci�n: {str(e)}")


@web.get("/maintenance/check-report", tags=[" Mantenimiento de Compresores"])
def check_report_exists(numero_cliente: int, numero_serie: str, fecha: str):
    """
    Verifica si existe un reporte PDF generado para un cliente, compresor y fecha espec�ficos
    """
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)
        
        query = """
        SELECT id, fecha, numero_cliente, nombre_cliente, link_reporte, numero_serie, registro_id, created_at
        FROM links_reportes_mtto
        WHERE numero_cliente = %s AND numero_serie = %s AND fecha = %s
        ORDER BY created_at DESC
        LIMIT 1
        """
        
        cursor.execute(query, (numero_cliente, numero_serie, fecha))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            return {
                "exists": True,
                "report": result
            }
        else:
            return {
                "exists": False,
                "report": None
            }
    
    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking report: {str(e)}")

@web.post("/maintenance/generate-report", tags=["🛠️ Mantenimiento de Compresores"])
def generate_maintenance_report(request: GenerateReportRequest):
    """
    Genera un reporte PDF de mantenimiento usando Playwright y lo sube a Google Drive.
    Renderiza la página Next.js de generación de reportes y la convierte a PDF.
    """
    try:
        # Importar el módulo de generación de PDF con Playwright
        from generate_pdf_report_playwright import generate_and_upload_maintenance_report
        
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)
        
        # Obtener datos del registro de mantenimiento
        if request.registro_id:
            # Buscar por ID específico
            query = """
            SELECT *
            FROM registros_mantenimiento_tornillo
            WHERE id = %s
            """
            cursor.execute(query, (request.registro_id,))
        else:
            # Buscar por número de serie y fecha
            query = """
            SELECT *
            FROM registros_mantenimiento_tornillo
            WHERE numero_serie = %s AND DATE(timestamp) = %s
            ORDER BY timestamp DESC
            LIMIT 1
            """
            cursor.execute(query, (request.numero_serie, request.fecha))
        
        registro = cursor.fetchone()
        
        if not registro:
            raise HTTPException(
                status_code=404,
                detail="No se encontró el registro de mantenimiento"
            )
        
        # Preparar datos del reporte
        mantenimientos_realizados = []
        for columna_bd, nombre_mantenimiento in MAINTENANCE_COLUMN_MAPPING.items():
            valor = registro.get(columna_bd, "No")
            mantenimientos_realizados.append({
                "nombre": nombre_mantenimiento,
                "realizado": valor and valor.lower() in ["sí", "si", "yes", "1"]
            })
        
        report_data = {
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
            "mantenimientos": mantenimientos_realizados
        }
        
        # Generar PDF y subir a Google Drive
        result = generate_and_upload_maintenance_report(report_data)
        
        if not result['success']:
            raise HTTPException(
                status_code=500,
                detail=f"Error generando PDF: {result.get('error', 'Unknown error')}"
            )
        
        # Guardar link en la base de datos
        insert_query = """
        INSERT INTO links_reportes_mtto (fecha, numero_cliente, nombre_cliente, link_reporte, numero_serie, registro_id)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(insert_query, (
            result['fecha'],
            registro.get('numero_cliente'),
            registro.get('cliente'),
            result['pdf_link'],
            registro.get('numero_serie'),
            registro.get('id')
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": "Reporte generado exitosamente",
            "pdf_link": result['pdf_link'],
            "filename": result['filename']
        }
        
    except HTTPException:
        raise
    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

# =======================================================================================
#                                    HELPER FUNCTIONS
# =======================================================================================
def litros_to_ft3(liters):
    """Convert liters to cubic feet"""
    return liters / 28.3168

def déficit_cfm_from_vol_liters(vol_liters, duracion_min):
    """Calculate CFM deficit from volume in liters and duration in minutes"""
    return litros_to_ft3(vol_liters) / duracion_min if duracion_min > 0 else float('inf')

def comp_flow_at_pressure(psig, flow_ref=20.0, p_ref=100.0, sens=0.01):
    """Calculate compressor flow at given pressure"""
    return flow_ref * (1 + sens * (p_ref - psig))

def evaluar_rangos_10psi_api(event, deficit_cfm, pres_min, pres_max, comp_flow_ref, comp_p_ref, sens, margen):
    """Evaluate 10 psi ranges for compressor optimization"""
    results = []
    for cut_out in np.arange(pres_max, pres_min + 9, -1):
        cut_in = cut_out - 10
        if cut_in < 0:
            continue
        flow_out = comp_flow_at_pressure(cut_out, flow_ref=comp_flow_ref, p_ref=comp_p_ref, sens=sens)
        flow_in = comp_flow_at_pressure(cut_in, flow_ref=comp_flow_ref, p_ref=comp_p_ref, sens=sens)
        incremento = flow_in - flow_out
        objetivo = deficit_cfm * (1 + margen)
        cubre = incremento >= objetivo
        results.append({
            'cut_out': float(cut_out),
            'cut_in': float(cut_in),
            'flow_out_cfm': float(flow_out),
            'flow_in_cfm': float(flow_in),
            'incremento_cfm': float(incremento),
            'deficit_cfm': float(deficit_cfm),
            'objetivo_cfm': float(objetivo),
            'cubre': bool(cubre)
        })
    return results

def obtener_datos_presion(p_device_id: int, dispositivo_id: int, linea: str, fecha: str):
    """Fetch pressure data using stored procedure"""
    try:
        conn = mysql.connector.connect(
        host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_DATABASE
    )
        cursor = conn.cursor(dictionary=True)

        params = (p_device_id, dispositivo_id, dispositivo_id, linea, fecha)
        cursor.callproc('DataFiltradaConPresion', params)
        
        data = []
        for result in cursor.stored_results():
            data = result.fetchall()
        
        cursor.close()
        conn.close()
        
        return pd.DataFrame(data)
    
    except Exception as e:
        return pd.DataFrame()

def filtrar_operacion_real(df, presion_min=90, presion_max=110):
    """Filter data to show only real operation periods"""
    if df.empty or 'presion1_psi' not in df.columns or 'estado' not in df.columns:
        return df
    
    inicio_operacion = False
    indices_operacion = []
    
    for i in range(len(df)):
        presion = df['presion1_psi'].iloc[i]
        estado = df['estado'].iloc[i]
        
        if not inicio_operacion and presion <= presion_max:
            inicio_operacion = True
        
        if inicio_operacion:
            indices_operacion.append(i)
            if estado == 0:
                if i+1 == len(df) or all(df['estado'].iloc[i+1:] == 0):
                    break
    
    return df.iloc[indices_operacion].copy() if indices_operacion else df

def calcular_control_limits(df, presion_min=90, presion_max=110):
    """Calculate Six Sigma control limits"""
    if df.empty or 'presion1_psi' not in df.columns:
        return None, None, None, None
    
    # Smooth pressure data
    df['presion_suavizada'] = df['presion1_psi'].rolling(window=3, min_periods=1).mean()
    
    media = df['presion_suavizada'].mean()
    sigma = df['presion_suavizada'].std()
    
    UCL = min(media + 3*sigma, presion_max)  # Don't exceed 110
    LCL = max(media - 3*sigma, presion_min)  # Don't go below 90
    
    return media, sigma, UCL, LCL

def obtener_medidores_presion(numero_cliente):
    """Consulta todos los medidores de presión del cliente y devuelve lista de diccionarios"""
    conn = mysql.connector.connect(
        host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_DATABASE
    )
    cursor = conn.cursor(dictionary=True)  # cursor tipo diccionario
    cursor.execute("""
        SELECT p_device_id, dispositivo_id, linea
        FROM dispositivos_presion
        WHERE cliente_id = %s
    """, (numero_cliente,))
    result = cursor.fetchall()
    cursor.close()
    conn.close()

    # Devolver solo las columnas que queremos
    medidores = [
        {
            "p_device_id": col["p_device_id"],
            "dispositivo_id": col["dispositivo_id"],
            "linea": col["linea"]
        }
        for col in result
    ]
    return medidores

def obtener_compresores(numero_cliente):
    """Consulta todos los compresores del cliente"""
    conn = mysql.connector.connect(
        host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_DATABASE
    )
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id_cliente, c.linea, c.Alias, c.segundosPorRegistro, c.voltaje, c2.CostokWh
        FROM compresores c
        JOIN clientes c2 ON c2.id_cliente = c.id_cliente
        WHERE c2.numero_cliente = %s
    """, (numero_cliente,))
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return result

def obtener_kwh_fp(id_cliente, linea, segundosPR, voltaje):
    """Consulta kWh para un compresor en fechas recientes (optimizado)"""
    conn = mysql.connector.connect(
        host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_DATABASE
    )
    cursor = conn.cursor()
    fecha_fin = date.today() - timedelta(days=1)
    fecha_inicio = fecha_fin - timedelta(days=10)  # Reducido de 17 a 10 días
    cursor.callproc('CalcularKHWSemanalesPorEstadoConCiclosFP', [
        id_cliente, id_cliente, linea,
        fecha_inicio, fecha_fin,
        segundosPR, voltaje
    ])
    datos = []
    for result in cursor.stored_results():
        datos = result.fetchall()
    cursor.close()
    conn.close()
    return pd.DataFrame([(fila[0], fila[1]) for fila in datos], columns=['Fecha', 'kWh'])

def calc_kwh_max(voltaje, amperes, fp=FP, horas=HORAS):
    return np.sqrt(3) * voltaje * amperes * fp * horas / 1000

def generate_predictions_fast(series: pd.Series, days: int = 3) -> Tuple[List[float], str]:
    """Generate predictions using optimized approach (like pythonDaltile.py)"""
    
    # Obtener datos válidos
    hist_valores = series.dropna().values[-7:]
    
    if len(hist_valores) < 3:
        return [0] * days, "Sin datos suficientes"
    
    # Verificar variación para decidir entre modelo o promedio
    variacion = max(hist_valores) - min(hist_valores)
    
    if variacion < 500:  # Usar promedio simple si poca variación
        promedio = np.mean(hist_valores)
        predictions = [promedio] * days
        return predictions, "Promedio (poca variación)"
    
    # Usar SARIMAX solo si hay suficiente variación
    try:
        # Limpiar datos para modelo
        series_clean = series[series > 0].copy()
        if len(series_clean) < 7:
            # Fallback a promedio
            promedio = np.mean(hist_valores)
            return [promedio] * days, "Promedio (datos insuficientes)"
        
        # Log transform
        series_log = np.log1p(series_clean)
        
        # Modelo simple sin validaciones excesivas
        if len(series_clean) < 14:
            model = auto_arima(
                series_log,
                seasonal=False,
                stepwise=True,
                trace=False,
                suppress_warnings=True,
                max_p=2, max_q=2  # Límites más bajos para velocidad
            )
        else:
            model = auto_arima(
                series_log,
                seasonal=True,
                m=7,
                stepwise=True,
                trace=False,
                suppress_warnings=True,
                max_p=2, max_q=2, max_P=1, max_Q=1  # Límites más bajos
            )
        
        p, d, q = model.order
        P, D, Q, m = model.seasonal_order
        
        sarimax_model = SARIMAX(
            endog=series_log,
            order=(p, d, q),
            seasonal_order=(P, D, Q, m),
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        
        model_fit = sarimax_model.fit(disp=False, maxiter=50)  # Menos iteraciones
        pred_result = model_fit.get_forecast(steps=days)
        pred_log = pred_result.predicted_mean
        predictions = np.expm1(pred_log)
        predictions = np.maximum(predictions, 0)
        
        return predictions.tolist(), "Modelo SARIMAX optimizado"
        
    except Exception as e:
        promedio = np.mean(hist_valores)
        return [promedio] * days, "Promedio (modelo falló)"