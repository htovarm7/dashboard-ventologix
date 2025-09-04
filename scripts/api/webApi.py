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

"""
* @Observations:
* 1. To run the API, use the command:
* uvicorn scripts.api_server:webApi --reload
* To check the API response, you can use the following URL:
* http://127.0.0.1:8000/docs
* For PENOX use device_id = 7
* If the API is not updating, check the following:
* 1. Run in terminal:
    tasklist | findstr python
* 2. If the process is running, kill it using:
    taskkill /F /PID <PID>
* 3. Where <PID> is the process ID obtained from the previous command, which in this case is 18168.
    python.exe                   18168 Console                    1    67,276 KB
* 4. Run the API again using:
"""

# Load environment variables
dotenv.load_dotenv()

# Create FastAPI instance
web = APIRouter(prefix="/web", tags=["web"])

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
logger = logging.getLogger(__name__)

# GET - Obtener usuario por email (para autenticación)
@web.get("/usuarios/{email}", tags=["Auth"])
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

        # 0 = Administrador, 1 = Director, 2 = Gerente, 3 = Ingeniero
        if(rol == 2 or rol == 1):
            cursor.execute("SELECT c.linea, c.proyecto as id_cliente, c.Alias as alias FROM compresores c JOIN clientes c2 ON c2.id_cliente = c.id_cliente WHERE c2.numero_cliente  = %s;", (numeroCliente,))
            compresores = cursor.fetchall()

        if(rol == 0):
            cursor.execute("SELECT  c.linea, c.proyecto as id_cliente, c.Alias as alias , c2.nombre_cliente FROM compresores c JOIN clientes c2 ON c.id_cliente = c2.id_cliente")
            compresores = cursor.fetchall()

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
@web.get("/ingenieros", tags=["CRUD Admin"])
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

        # Query que filtra por número de cliente
        query = """
            SELECT 
                e.id, 
                e.name, 
                e.email,
                e.numeroCliente,
                e.email_daily,
                e.email_weekly,
                e.email_monthly,
                GROUP_CONCAT(DISTINCT c.Alias) as compressor_names
            FROM ingenieros e
            LEFT JOIN clientes cl ON e.numeroCliente = cl.numero_cliente
            LEFT JOIN compresores c ON cl.id_cliente = c.id_cliente
            WHERE e.numeroCliente = %s
            GROUP BY e.id, e.name, e.email, e.numeroCliente, e.email_daily, e.email_weekly, e.email_monthly
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
@web.get("/compresores", tags=["CRUD Admin"])
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
@web.post("/ingenieros", tags=["CRUD Admin"])
def create_ingeniero(
    name: str = Body(...),
    email: EmailStr = Body(...),
    compressors: list[str] = Body(default=[]),
    numeroCliente: int = Body(..., description="Número de cliente")
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

        # También crear entrada en usuarios_auth para el ingeniero (rol 2)
        cursor.execute(
            """INSERT INTO usuarios_auth (email, numeroCliente, rol, name) 
               VALUES (%s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE 
               numeroCliente = VALUES(numeroCliente),
               rol = VALUES(rol),
               name = VALUES(name)""",
            (email, numeroCliente, 2, name)
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
@web.put("/ingenieros/{ingeniero_id}", tags=["CRUD Admin"])
def update_ingeniero(
    ingeniero_id: int,
    name: str = Body(...),
    email: EmailStr = Body(...),
    compressors: list[str] = Body(default=[]),
    numeroCliente: int = Body(..., description="Número de cliente")
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

        # Actualizar también la tabla usuarios_auth si cambió el email
        if old_email != email:
            cursor.execute(
                "UPDATE usuarios_auth SET email = %s, name = %s WHERE email = %s AND numeroCliente = %s",
                (email, name, old_email, numeroCliente)
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
@web.delete("/ingenieros/{ingeniero_id}", tags=["CRUD Admin"])
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
            "DELETE FROM usuarios_auth WHERE email = %s AND numeroCliente = %s AND rol = 2",
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
@web.put("/ingenieros/{ingeniero_id}/email-preferences", tags=["CRUD Admin"])
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

# GET - Obtener compresores asignados a un ingeniero (para vista de ingeniero)
@web.get("/ingenieros/{email}/compresores", tags=["Engineer View"])
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
    
@web.get("/forecast/plot", tags=["Web"])
def forecast_plot(
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

        # Para cada compresor, cargar datos
        for (id_cliente, linea, alias, segundosPR, voltaje, costo), color in zip(compresores, COLORES):
            try:
                df = obtener_kwh_fp(id_cliente, linea, segundosPR, voltaje)
                if df.empty:
                    logger.warning(f"No data for compressor {alias}")
                    continue
                    
                df['Fecha'] = pd.to_datetime(df['Fecha'])
                df['kWh'] = pd.to_numeric(df['kWh'], errors='coerce')
                df['HorasTrabajadas'] = pd.to_numeric(df['HorasTrabajadas'], errors='coerce')
                
                # Agrupar por fecha y sumar
                df_grouped = df.groupby('Fecha').agg({
                    'kWh': 'sum',
                    'HorasTrabajadas': 'sum'
                }).asfreq('D')
                
                # Crear columnas separadas para gráfico y modelo
                df_grouped[f'kWh_{id_cliente}_{linea}'] = df_grouped['kWh']
                df_grouped[f'kWh_modelo_{id_cliente}_{linea}'] = df_grouped['kWh'].where(
                    df_grouped['HorasTrabajadas'] >= 14, 0
                )
                
                nombres_compresores[f'kWh_{id_cliente}_{linea}'] = alias
                voltaje_ref = voltaje
                costoKwh = costo

                if df_total.empty:
                    df_total = df_grouped
                else:
                    df_total = df_total.join(df_grouped, how='outer', rsuffix='_temp')
                    # Manejar columnas duplicadas
                    for col in ['kWh', 'HorasTrabajadas']:
                        if f'{col}_temp' in df_total.columns:
                            df_total[col] = df_total[col].fillna(0) + df_total[f'{col}_temp'].fillna(0)
                            df_total.drop(f'{col}_temp', axis=1, inplace=True)
                    
            except Exception as e:
                logger.error(f"Error processing compressor {alias}: {str(e)}")
                continue

        if df_total.empty:
            return {"error": "No se pudieron cargar datos de ningún compresor"}

        # Identificar columnas para gráfico y modelo
        kwh_cols = [col for col in df_total.columns if col.startswith('kWh_') and not col.startswith('kWh_modelo_')]
        kwh_modelo_cols = [col for col in df_total.columns if col.startswith('kWh_modelo_')]
        
        # Total diario para gráfico (todos los datos)
        df_total['kWh'] = df_total[kwh_cols].sum(axis=1, skipna=True)
        
        # Total diario para modelo (solo días con >= 14 horas)
        df_total['kWh_modelo'] = df_total[kwh_modelo_cols].sum(axis=1, skipna=True)
        
        # Clean data usando desviación estándar
        df_total['kWh'] = clean_outliers_with_std(df_total['kWh'], std_threshold=2.0)
        df_total['kWh_modelo'] = clean_outliers_with_std(df_total['kWh_modelo'], std_threshold=2.0)
        
        # Generate predictions usando solo datos del modelo (>= 14 horas)
        dias_prediccion = 3
        ultima_fecha = df_total.index[-1]
        fechas_prediccion = pd.date_range(ultima_fecha + timedelta(days=1), periods=dias_prediccion, freq='D')
        
        predicciones, metodo_usado = generate_predictions(df_total['kWh_modelo'], dias_prediccion)

        # Estimación anual basada en datos del modelo
        hist_kwh_modelo = df_total['kWh_modelo'].dropna()[-6:].tolist()
        kwh_validos = [x for x in hist_kwh_modelo if x > 0] + [x for x in predicciones if x > 0]
        
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
        recuadro = f"Método: {metodo_usado}\n"
        recuadro += f"Estimación Anual: {kwh_anual:,.0f} kWh\nCosto Estimado: ${costo_anual:,.0f} USD"
        plt.gcf().text(0.72, 0.82, recuadro, fontsize=11, bbox=dict(facecolor='white', edgecolor='black', alpha=0.9))

        ax.set_title(f"Consumo Energético Diario - Cliente {numero_cliente}", fontsize=14, weight='bold')
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
        logger.error(f"Critical error in forecast_plot: {str(e)}")
        return {"error": f"Error interno del servidor: {str(e)}"}

@web.get("/pressure/analysis", tags=["Web"])
def pressure_analysis_plot(
    p_device_id: int = Query(..., description="Número del cliente"),
    dispositivo_id: int = Query(..., description="Línea del compresor"),
    linea: str = Query(..., description="Tanque (A o B)"),
    fecha: str = Query(..., description="Fecha de análisis (YYYY-MM-DD)")
):
    """
    Generate Six Sigma pressure control chart analysis for compressor operation
    """
    try:
        # Fetch pressure data
        df = obtener_datos_presion(p_device_id, dispositivo_id, dispositivo_id, linea, fecha)

        if df.empty:
            return {"error": "No se encontraron datos de presión para los parámetros especificados"}
        
        # Convert time column to datetime if needed
        if 'time' in df.columns:
            df['time'] = pd.to_datetime(df['time'])
        
        # Filter to operational data only
        presion_min = 90
        presion_max = 110
        df_operativa = filtrar_operacion_real(df, presion_min, presion_max)
        
        if df_operativa.empty:
            return {"error": "No se encontraron períodos de operación válidos"}
        
        # Count events below minimum pressure
        bajo_presion = df_operativa[df_operativa['presion1_psi'] < presion_min]
        conteo_bajo = len(bajo_presion)
        porcentaje_bajo = len(bajo_presion) / len(df_operativa) * 100 if len(df_operativa) > 0 else 0
        
        # Calculate Six Sigma control limits
        media, sigma, UCL, LCL = calcular_control_limits(df_operativa, presion_min, presion_max)
        
        if media is None:
            return {"error": "No se pudieron calcular los límites de control"}
        
        # Calculate time analysis
        tiempo_total = len(df_operativa) * 30 / 60  # minutes (30s per record)
        tiempo_bajo = len(bajo_presion) * 30 / 60
        porcentaje_tiempo_bajo = tiempo_bajo / tiempo_total * 100 if tiempo_total > 0 else 0
        
        # Storage sufficiency indicator
        almacenamiento_suficiente = porcentaje_tiempo_bajo <= 5
        
        # 🎨 CREATE CONTROL CHART
        plt.switch_backend('Agg')  # Use non-GUI backend
        fig, ax = plt.subplots(figsize=(15, 8))
        
        # Main pressure line (blue)
        ax.plot(df_operativa['time'], df_operativa['presion1_psi'], 
                color='blue', linewidth=1, label='Presión registrada')
        
        # Highlight out-of-control points in red
        out_of_control = (df_operativa['presion1_psi'] > UCL) | (df_operativa['presion1_psi'] < LCL)
        if out_of_control.any():
            ax.plot(df_operativa['time'][out_of_control],
                   df_operativa['presion1_psi'][out_of_control],
                   color='red', linewidth=2.5, marker='o', markersize=4,
                   linestyle='None', label='Fuera de control (±3σ)')
        
        # Control lines
        ax.axhline(media, color='black', linestyle='-', linewidth=1, label=f'Media ({media:.1f})')
        ax.axhline(UCL, color='purple', linestyle='--', linewidth=1, label=f'UCL ({UCL:.1f})')
        ax.axhline(LCL, color='purple', linestyle='--', linewidth=1, label=f'LCL ({LCL:.1f})')
        
        # Operational range lines
        ax.axhline(presion_max, color='green', linestyle=':', linewidth=1, label='Máx 110 psi')
        ax.axhline(presion_min, color='orange', linestyle=':', linewidth=1, label='Mín 90 psi')
        
        # Colored areas
        y_min = df_operativa['presion1_psi'].min() - 5
        y_max = df_operativa['presion1_psi'].max() + 5
        
        # Green area: optimal range (90-110)
        ax.fill_between(df_operativa['time'], presion_min, presion_max, 
                       color='green', alpha=0.1, label='Rango óptimo')
        
        # Yellow areas: warning zones
        ax.fill_between(df_operativa['time'], LCL, presion_min, 
                       color='yellow', alpha=0.15, label='Zona de advertencia')
        ax.fill_between(df_operativa['time'], presion_max, UCL, 
                       color='yellow', alpha=0.15)
        
        # Red areas: out of control zones
        ax.fill_between(df_operativa['time'], y_min, LCL, 
                       color='red', alpha=0.1, label='Fuera de control')
        ax.fill_between(df_operativa['time'], UCL, y_max, 
                       color='red', alpha=0.1)
        
        # Set labels and title
        ax.set_xlabel('Tiempo', fontsize=12)
        ax.set_ylabel('Presión (psi)', fontsize=12)
        ax.set_title(f'Análisis de Control Six Sigma - DeviceId {p_device_id} | Linea {linea}', 
                    fontsize=14, weight='bold')
        
        # Legend and grid
        ax.legend(loc='upper left', fontsize=10)
        ax.grid(True, alpha=0.3)
        
        # Statistics box
        stats_text = f"""Estadísticas de Operación:
• Media: {media:.1f} psi
• Desv. Estándar: {sigma:.1f} psi
• Tiempo bajo mínimo: {tiempo_bajo:.1f} min ({porcentaje_tiempo_bajo:.1f}%)
• Eventos bajo mínimo: {conteo_bajo} ({porcentaje_bajo:.1f}%)
• Estado almacenamiento: {'✅ Suficiente' if almacenamiento_suficiente else '⚠ Insuficiente'}"""
        
        # Add statistics box
        plt.gcf().text(0.02, 0.98, stats_text, fontsize=10, 
                      bbox=dict(boxstyle="round,pad=0.5", facecolor='lightblue', alpha=0.8),
                      verticalalignment='top', transform=ax.transAxes)
        
        # Format dates
        fig.autofmt_xdate()
        plt.tight_layout()
        
        # Save to buffer
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        
        return StreamingResponse(buf, media_type="image/png")
        
    except Exception as e:
        logger.error(f"Critical error in pressure_analysis_plot: {str(e)}")
        return {"error": f"Error interno del servidor: {str(e)}"}

# Functions
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
        logger.error(f"Error fetching pressure data: {str(e)}")
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
    """Consulta kWh para un compresor en fechas recientes"""
    conn = mysql.connector.connect(
        host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_DATABASE
    )
    cursor = conn.cursor()
    fecha_fin = date.today() - timedelta(days=2)
    fecha_inicio = fecha_fin - timedelta(days=17)
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
    return pd.DataFrame([(fila[0], fila[1], fila[2]) for fila in datos], columns=['Fecha', 'kWh', 'HorasTrabajadas'])

def calc_kwh_max(voltaje, amperes, fp=FP, horas=HORAS):
    return np.sqrt(3) * voltaje * amperes * fp * horas / 1000

def validate_time_series(series: pd.Series, min_length: int = 3) -> bool:
    """Validate if time series is suitable for modeling"""
    if len(series) < min_length:
        logger.warning(f"Series too short: {len(series)} < {min_length}")
        return False
    
    if series.isna().all():
        logger.warning("Series contains only NaN values")
        return False
    
    if (series == 0).all():
        logger.warning("Series contains only zero values")
        return False
    
    if series.var() == 0:
        logger.warning("Series has zero variance")
        return False
    
    return True

def clean_outliers_with_std(series: pd.Series, std_threshold=2.0) -> pd.Series:
    """Clean outliers using standard deviation method"""
    if series.empty or series.isna().all():
        return series
    
    valid_data = series[series > 0]
    if len(valid_data) < 3:
        return series
    
    mean_val = valid_data.mean()
    std_val = valid_data.std()
    
    if std_val == 0:
        return series
    
    lower_limit = max(0, mean_val - std_threshold * std_val)
    upper_limit = mean_val + std_threshold * std_val
    
    series_clean = series.copy()
    mask = series_clean > 0
    series_clean[mask] = series_clean[mask].clip(lower_limit, upper_limit)
    
    return series_clean

def safe_auto_arima(series: pd.Series, seasonal: bool = True, m: int = 7) -> Optional[object]:
    """Safely run auto_arima with proper error handling"""
    try:
        if not validate_time_series(series, min_length=14):
            logger.warning("Series validation failed for auto_arima")
            return None
        
        if seasonal and len(series) < 2 * m:
            logger.warning(f"Insufficient data for seasonal modeling: {len(series)} < {2 * m}")
            seasonal = False
            m = 1
        
        series_clean = series.copy()
        series_clean = series_clean.replace([np.inf, -np.inf], np.nan)
        series_clean = series_clean.dropna()
        
        if len(series_clean) < 7:  # Minimum for any meaningful model
            logger.warning("Too few valid observations after cleaning")
            return None
        
        model = auto_arima(
            series_clean,
            seasonal=seasonal,
            m=m,
            max_p=3,
            max_q=3,
            max_P=2,
            max_Q=2,
            max_d=2,
            max_D=1,
            stepwise=True,
            suppress_warnings=True,
            error_action='ignore',
            trace=False,
            random_state=42
        )
        
        logger.info(f"Successfully fitted ARIMA model: {model.order} x {model.seasonal_order}")
        return model
        
    except Exception as e:
        logger.error(f"Error in auto_arima: {str(e)}")
        return None

def generate_predictions(series: pd.Series, days: int = 3) -> Tuple[List[float], str]:
    """Generate predictions using multiple fallback methods"""
    
    try:
        best_model = safe_auto_arima(series, seasonal=True, m=7)
        
        if best_model is not None:
            series_clean = series[series > 0].copy()
            series_log = np.log1p(series_clean)
            
            if validate_time_series(series_log, min_length=7):
                p, d, q = best_model.order
                P, D, Q, m = best_model.seasonal_order
                
                model = SARIMAX(
                    endog=series_log,
                    order=(p, d, q),
                    seasonal_order=(P, D, Q, m),
                    enforce_stationarity=False,
                    enforce_invertibility=False
                )
                
                model_fit = model.fit(disp=False, maxiter=100)
                pred_result = model_fit.get_forecast(steps=days)
                pred_log = pred_result.predicted_mean
                predictions = np.expm1(pred_log)
                predictions = np.maximum(predictions, 0)
                
                logger.info("Using ARIMA model predictions")
                return predictions.tolist(), "Modelo ARIMA"
                
    except Exception as e:
        logger.error(f"ARIMA modeling failed: {str(e)}")
    
    try:
        if len(series) >= 7:
            recent_data = series[-7:].dropna()
            if len(recent_data) >= 3:
                x = np.arange(len(recent_data))
                y = recent_data.values
                
                if len(x) > 1 and np.var(x) > 0:
                    slope = np.corrcoef(x, y)[0, 1] * np.std(y) / np.std(x)
                    intercept = np.mean(y) - slope * np.mean(x)
                    
                    future_x = np.arange(len(recent_data), len(recent_data) + days)
                    predictions = intercept + slope * future_x
                    predictions = np.maximum(predictions, 0)
                    
                    logger.info("Using trend-based predictions")
                    return predictions.tolist(), "Tendencia lineal"
    except Exception as e:
        logger.error(f"Trend modeling failed: {str(e)}")
    
    try:
        valid_data = series.dropna()
        if len(valid_data) > 0:
            if len(valid_data) >= 7:
                avg = valid_data[-7:].mean()
            elif len(valid_data) >= 3:
                avg = valid_data[-3:].mean()
            else:
                avg = valid_data.mean()
            
            predictions = [max(avg, 0)] * days
            logger.info("Using moving average predictions")
            return predictions, "Promedio móvil"
    except Exception as e:
        logger.error(f"Moving average failed: {str(e)}")
    
    logger.warning("All prediction methods failed, using zero predictions")
    return [0] * days, "Sin predicción"