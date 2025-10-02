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

# Modelos para las actualizaciones
class UpdateClientNumberRequest(BaseModel):
    email: str
    nuevo_numero_cliente: int

class UpdateUserRoleRequest(BaseModel):
    email: str
    nuevo_rol: int  # 0 = Admin, 1 = Directo, 2 = Gerente, 3 = Ingeniero

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
            cursor.execute("SELECT  c.linea, c.proyecto as id_cliente, c.Alias as alias , c2.nombre_cliente, c2.numero_cliente FROM compresores c JOIN clientes c2 ON c.id_cliente = c2.id_cliente")
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
                "rol": ingeniero.get('rol', 1),  # Por defecto rol 1 si no existe
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
    numeroCliente: int = Body(..., description="Número de cliente"),
    rol: int = Body(default=1, description="Rol del usuario: 1=Ingeniero, 2=Administrador, 3=Gerente")
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
@web.put("/ingenieros/{ingeniero_id}", tags=["CRUD Admin"])
def update_ingeniero(
    ingeniero_id: int,
    name: str = Body(...),
    email: EmailStr = Body(...),
    compressors: list[str] = Body(default=[]),
    numeroCliente: int = Body(..., description="Número de cliente"),
    rol: int = Body(default=1, description="Rol del usuario: 1=Ingeniero, 2=Administrador, 3=Gerente")
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

# PATCH - Actualizar preferencias de email (endpoint alternativo para PATCH requests)
@web.patch("/ingenieros/{ingeniero_id}/preferences", tags=["CRUD Admin"])
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
    
@web.get("/beta/consumption_prediction", tags=["Web"])
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

@web.get("/beta/pressure-plot", tags=["Web"])
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

@web.get("/beta/pressure-stats", tags=["Web"])
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

# Helper functions
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

# PUT - Actualizar número de cliente de un usuario (solo para administradores rol 0)
@web.put("/usuarios/update-client-number", tags=["Admin Operations"])
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

        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Verificar que el nuevo número de cliente existe
        cursor.execute(
            "SELECT id_cliente FROM clientes WHERE numero_cliente = %s",
            (request.nuevo_numero_cliente,)
        )
        cliente = cursor.fetchone()

        if not cliente:
            raise HTTPException(status_code=404, detail="Número de cliente no válido")

        # Actualizar el número de cliente
        cursor.execute(
            "UPDATE usuarios_auth SET numeroCliente = %s WHERE email = %s",
            (request.nuevo_numero_cliente, request.email)
        )

        # Si es un ingeniero, también actualizar en la tabla ingenieros
        if usuario['rol'] == 1:  # rol 1 = ingeniero/directo
            cursor.execute(
                "UPDATE ingenieros SET numeroCliente = %s WHERE email = %s",
                (request.nuevo_numero_cliente, request.email)
            )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Número de cliente actualizado exitosamente",
            "email": request.email,
            "nuevo_numero_cliente": request.nuevo_numero_cliente
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating client number: {str(e)}")

# PUT - Actualizar rol de un usuario (solo para administradores rol 0)
@web.put("/usuarios/update-role", tags=["Admin Operations"])
def update_user_role(request: UpdateUserRoleRequest):
    """Actualiza el rol de un usuario específico (solo para administradores)"""
    try:
        # Validar que el rol es válido
        valid_roles = [0, 1, 2, 3]  # 0=Admin, 1=Ingeniero, 2=Director, 3=Gerente
        if request.nuevo_rol not in valid_roles:
            raise HTTPException(status_code=400, detail="Rol no válido. Debe ser 0 (Admin), 1 (Ingeniero), 2 (Administrador) o 3 (Gerente)")

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

        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Actualizar el rol
        cursor.execute(
            "UPDATE usuarios_auth SET rol = %s WHERE email = %s",
            (request.nuevo_rol, request.email)
        )

        conn.commit()
        cursor.close()
        conn.close()

        role_names = {0: "Administrador", 1: "Ingeniero", 2: "Director", 3: "Gerente"}

        return {
            "message": "Rol actualizado exitosamente",
            "email": request.email,
            "nuevo_rol": request.nuevo_rol,
            "nombre_rol": role_names.get(request.nuevo_rol, "Desconocido")
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user role: {str(e)}")