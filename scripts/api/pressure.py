"""
Endpoints de análisis de presión
"""
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import io

from .db_utils import obtener_medidores_presion, obtener_datos_presion, get_db_connection


pressure = APIRouter(prefix="/pressure", tags=["📈 Presión"])


# ===== Modelo Pydantic para configuración operacional de presión =====
class PressureConfigModel(BaseModel):
    presion_max: float = 120.0
    presion_min: float = 100.0
    presion_alerta: float = 95.0
    v_tanque: float = 700.0


@pressure.get("/config/{rtu_id}", tags=["⚙️ Configuración"])
def get_pressure_config_endpoint(rtu_id: int):
    """Obtiene la configuración operacional de un dispositivo RTU"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT presion_max, presion_min, presion_alerta, v_tanque FROM RTU_device WHERE RTU_id = %s",
            (rtu_id,)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        return {"success": True, "data": {
            "presion_max": row["presion_max"] if row["presion_max"] is not None else 120.0,
            "presion_min": row["presion_min"] if row["presion_min"] is not None else 100.0,
            "presion_alerta": row["presion_alerta"] if row["presion_alerta"] is not None else 95.0,
            "v_tanque": row["v_tanque"] if row["v_tanque"] is not None else 700.0,
        }}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener configuración: {str(e)}")


@pressure.put("/config/{rtu_id}", tags=["⚙️ Configuración"])
def update_pressure_config(rtu_id: int, config: PressureConfigModel):
    """Actualiza la configuración operacional de un dispositivo RTU"""
    if config.presion_alerta >= config.presion_min:
        raise HTTPException(status_code=400, detail="presion_alerta debe ser menor que presion_min")
    if config.presion_min >= config.presion_max:
        raise HTTPException(status_code=400, detail="presion_min debe ser menor que presion_max")
    if config.v_tanque <= 0:
        raise HTTPException(status_code=400, detail="v_tanque debe ser mayor que 0")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE RTU_device
            SET presion_max = %s, presion_min = %s, presion_alerta = %s, v_tanque = %s
            WHERE RTU_id = %s
        """, (config.presion_max, config.presion_min, config.presion_alerta, config.v_tanque, rtu_id))
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True, "message": "Configuración actualizada correctamente", "data": config.model_dump()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar configuración: {str(e)}")


# ===== Modelos Pydantic para RTU =====
class RTUSensorModel(BaseModel):
    C: int
    Vmin: Optional[float] = None
    Vmax: Optional[float] = None
    Lmin: Optional[float] = None
    Lmax: Optional[float] = None


class RTUPortModel(BaseModel):
    P1: Optional[int] = None
    P2: Optional[int] = None
    P3: Optional[int] = None


class RTUDeviceModel(BaseModel):
    numero_serie_topico: str
    RTU_id: int
    numero_cliente: int
    alias: Optional[str] = None


class RTUCreateModel(BaseModel):
    device: RTUDeviceModel
    sensors: List[RTUSensorModel]
    ports: RTUPortModel


@pressure.get("/devices", tags=["📈 Presión"])
def get_client_devices(numero_cliente: int = Query(..., description="Número del cliente")):
    """Lista todos los dispositivos RTU de un cliente"""
    dispositivos = obtener_medidores_presion(numero_cliente)
    return {"success": True, "data": dispositivos}


@pressure.get("/plot", tags=["📈 Visualización de Datos"])
def pressure_analysis_plot(
    numero_cliente: int = Query(..., description="Número del cliente"),
    fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD"),
    rtu_id: Optional[int] = Query(None, description="RTU_id del dispositivo (opcional, usa el primero si no se especifica)")
):
    """Genera gráfica de análisis de presión"""
    try:
        dispositivos = obtener_medidores_presion(numero_cliente)

        if not dispositivos:
            return {"error": "No se encontraron dispositivos de presión para este cliente"}

        if rtu_id is not None:
            device = next((d for d in dispositivos if d["RTU_id"] == rtu_id), None)
            if device is None:
                return {"error": f"Dispositivo RTU_id={rtu_id} no pertenece a este cliente"}
        else:
            device = dispositivos[0]

        presion_min = device["presion_min"]
        presion_max = device["presion_max"]
        presion_alerta = device["presion_alerta"]
        V_tanque = device["v_tanque"]
        RTU_id = device["RTU_id"]
        linea = device["linea"]

        df = obtener_datos_presion(RTU_id, fecha=fecha)

        if df.empty:
            return {"error": "No se encontraron datos de presión para los parámetros especificados"}

        if 'time' in df.columns:
            df['time'] = pd.to_datetime(df['time'], errors='coerce')

        df['presion1_psi'] = pd.to_numeric(df['presion1_psi'], errors='coerce')
        df = df.dropna(subset=['presion1_psi']).reset_index(drop=True)

        start_idx = df.index[df['presion1_psi'] >= presion_min].min()
        end_idx = df.index[df['estado'].notna()].max() if df['estado'].notna().any() else df.index[-1]

        if pd.isna(start_idx):
            start_idx = 0

        df_operativa = df.loc[start_idx:end_idx].copy()

        if df_operativa.empty:
            return {"error": "No hay datos operativos válidos"}

        df_operativa['presion_suavizada'] = df_operativa['presion1_psi'].rolling(window=3, min_periods=1).mean()
        promedio = df_operativa['presion_suavizada'].mean()

        # Detección de eventos críticos
        fuera_bajo = df_operativa['presion1_psi'] < presion_min

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

        # Crear gráfica
        plt.switch_backend('Agg')
        fig, ax = plt.subplots(figsize=(15, 6))

        ax.plot(df_operativa['time'], df_operativa['presion1_psi'], color='blue', label='Presión registrada')
        ax.fill_between(df_operativa['time'], presion_min, presion_max,
                       color='green', alpha=0.1, label=f'Zona Operativa {presion_min}-{presion_max} psi')
        ax.fill_between(df_operativa['time'], presion_alerta, presion_min,
                       color='yellow', alpha=0.2, label=f'Zona Riesgo {presion_alerta}–{presion_min} psi')
        ax.axhline(presion_alerta, color='red', alpha=0.4, label=f'Alarma Whatsapp psi < {presion_alerta}')

        evento_riesgo = (df_operativa['presion1_psi'] >= presion_alerta) & (df_operativa['presion1_psi'] < presion_min)
        ax.plot(df_operativa['time'][evento_riesgo], df_operativa['presion1_psi'][evento_riesgo],
               'o', color='orange', label=f'Evento de Riesgo ({presion_alerta}-{presion_min} psi)', markersize=4)

        fuera_bajo_plot = df_operativa['presion1_psi'] < presion_alerta
        ax.plot(df_operativa['time'][fuera_bajo_plot], df_operativa['presion1_psi'][fuera_bajo_plot],
               'o', color='red', label=f'Evento Crítico (psi < {presion_alerta})', markersize=4)

        ax.axhline(promedio, color='black', linestyle='-', label='Promedio suavizado')

        for ev in top_eventos:
            registros = df_operativa.loc[ev['start_idx']:ev['end_idx']]
            if not registros.empty:
                ax.fill_between(registros['time'], registros['presion1_psi'], presion_max,
                               color='red', alpha=0.3)

        ax.set_xlabel('Tiempo')
        ax.set_ylabel('Presión (psi)')
        ax.set_title('Presión y operación real - Indicadores y evaluación de bandas 10psi')
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)

        return StreamingResponse(buf, media_type="image/png")

    except Exception as e:
        return {"error": f"Error interno del servidor: {str(e)}"}


@pressure.get("/stats", tags=["📊 Análisis y Predicciones"])
def pressure_analysis_stats(
    numero_cliente: int = Query(..., description="Número del cliente"),
    fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD"),
    rtu_id: Optional[int] = Query(None, description="RTU_id del dispositivo (opcional, usa el primero si no se especifica)")
):
    """Obtiene estadísticas detalladas de análisis de presión"""
    try:
        dispositivos = obtener_medidores_presion(numero_cliente)

        if not dispositivos:
            return {"error": "No se encontraron dispositivos de presión para este cliente"}

        if rtu_id is not None:
            device = next((d for d in dispositivos if d["RTU_id"] == rtu_id), None)
            if device is None:
                return {"error": f"Dispositivo RTU_id={rtu_id} no pertenece a este cliente"}
        else:
            device = dispositivos[0]

        presion_min = device["presion_min"]
        presion_max = device["presion_max"]
        RTU_id = device["RTU_id"]

        df = obtener_datos_presion(RTU_id, fecha=fecha)

        if df.empty:
            return {"error": "No se encontraron datos de presión para los parámetros especificados"}

        if 'time' in df.columns:
            df['time'] = pd.to_datetime(df['time'], errors='coerce')

        df['presion1_psi'] = pd.to_numeric(df['presion1_psi'], errors='coerce')
        df = df.dropna(subset=['presion1_psi']).reset_index(drop=True)

        start_idx = df.index[df['presion1_psi'] >= presion_min].min()
        end_idx = df.index[df['estado'].notna()].max() if df['estado'].notna().any() else df.index[-1]

        if pd.isna(start_idx):
            start_idx = 0

        df_operativa = df.loc[start_idx:end_idx].copy()

        if df_operativa.empty:
            return {"error": "No hay datos operativos válidos"}

        df_operativa['presion_suavizada'] = df_operativa['presion1_psi'].rolling(window=3, min_periods=1).mean()
        promedio = df_operativa['presion_suavizada'].mean()

        fuera_bajo = df_operativa['presion1_psi'] < presion_min

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

        # Métricas
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

        return {
            "presion_promedio": round(promedio, 2),
            "tiempo_total_horas": tiempo_horas,
            "pendiente_subida": round(pendiente_subida, 2) if not pd.isna(pendiente_subida) else 0,
            "pendiente_bajada": round(pendiente_bajada, 2) if not pd.isna(pendiente_bajada) else 0,
            "variabilidad_relativa": round(variabilidad_relativa, 3),
            "indice_estabilidad": round(indice_estabilidad, 2),
            "eventos_criticos_total": len(eventos),
        }

    except Exception as e:
        return {"error": f"Error interno del servidor: {str(e)}"}


# ===== CRUD Endpoints para RTU Devices =====

@pressure.get("/rtu-devices", tags=["🔧 RTU Devices"])
def get_rtu_devices():
    """Obtiene todos los dispositivos RTU con información del cliente"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                d.id,
                d.numero_serie_topico,
                d.RTU_id,
                d.numero_cliente,
                d.alias,
                c.nombre_cliente
            FROM RTU_device d
            LEFT JOIN Clientes c ON d.numero_cliente = c.numero_cliente
            ORDER BY d.RTU_id
        """)

        devices = cursor.fetchall()
        cursor.close()
        conn.close()

        return {"success": True, "data": devices}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener dispositivos RTU: {str(e)}")


@pressure.get("/rtu-devices/{rtu_id}", tags=["🔧 RTU Devices"])
def get_rtu_device(rtu_id: int):
    """Obtiene un dispositivo RTU específico"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                d.id,
                d.numero_serie_topico,
                d.RTU_id,
                d.numero_cliente,
                d.alias,
                c.nombre_cliente
            FROM RTU_device d
            LEFT JOIN Clientes c ON d.numero_cliente = c.numero_cliente
            WHERE d.RTU_id = %s
        """, (rtu_id,))

        device = cursor.fetchone()
        cursor.close()
        conn.close()

        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo RTU no encontrado")

        return {"success": True, "data": device}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener dispositivo RTU: {str(e)}")


@pressure.get("/rtu-sensors/{rtu_id}", tags=["🔧 RTU Devices"])
def get_rtu_sensors(rtu_id: int):
    """Obtiene los sensores de un dispositivo RTU"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, RTU_id, C, Vmin, Vmax, Lmin, Lmax
            FROM RTU_sensores
            WHERE RTU_id = %s
            ORDER BY C
        """, (rtu_id,))

        sensors = cursor.fetchall()
        cursor.close()
        conn.close()

        return {"success": True, "data": sensors}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener sensores: {str(e)}")


@pressure.get("/rtu-ports/{rtu_id}", tags=["🔧 RTU Devices"])
def get_rtu_ports(rtu_id: int):
    """Obtiene los puertos de un dispositivo RTU"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, RTU_id, P1, P2, P3
            FROM RTU_puertos
            WHERE RTU_id = %s
        """, (rtu_id,))

        ports = cursor.fetchone()
        cursor.close()
        conn.close()

        return {"success": True, "data": ports or {}}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener puertos: {str(e)}")


@pressure.post("/rtu-devices", tags=["🔧 RTU Devices"])
def create_rtu_device(rtu_data: RTUCreateModel):
    """Crea un nuevo dispositivo RTU con sus sensores y puertos"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar si el RTU_id ya existe
        cursor.execute("SELECT COUNT(*) as count FROM RTU_device WHERE RTU_id = %s", (rtu_data.device.RTU_id,))
        result = cursor.fetchone()
        if result[0] > 0:
            raise HTTPException(status_code=400, detail=f"Ya existe un dispositivo con RTU_id {rtu_data.device.RTU_id}")

        # Insertar dispositivo
        cursor.execute("""
            INSERT INTO RTU_device (numero_serie_topico, RTU_id, numero_cliente, alias)
            VALUES (%s, %s, %s, %s)
        """, (
            rtu_data.device.numero_serie_topico,
            rtu_data.device.RTU_id,
            rtu_data.device.numero_cliente,
            rtu_data.device.alias
        ))

        # Insertar sensores
        for sensor in rtu_data.sensors:
            cursor.execute("""
                INSERT INTO RTU_sensores (RTU_id, C, Vmin, Vmax, Lmin, Lmax)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                rtu_data.device.RTU_id,
                sensor.C,
                sensor.Vmin,
                sensor.Vmax,
                sensor.Lmin,
                sensor.Lmax
            ))

        # Insertar puertos
        cursor.execute("""
            INSERT INTO RTU_puertos (RTU_id, P1, P2, P3)
            VALUES (%s, %s, %s, %s)
        """, (
            rtu_data.device.RTU_id,
            rtu_data.ports.P1,
            rtu_data.ports.P2,
            rtu_data.ports.P3
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True, "message": "Dispositivo RTU creado exitosamente"}

    except HTTPException:
        if conn:
            conn.rollback()
            conn.close()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        raise HTTPException(status_code=500, detail=f"Error al crear dispositivo RTU: {str(e)}")


@pressure.put("/rtu-devices/{rtu_id}", tags=["🔧 RTU Devices"])
def update_rtu_device(rtu_id: int, rtu_data: RTUCreateModel):
    """Actualiza un dispositivo RTU existente con sus sensores y puertos"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar si el dispositivo existe
        cursor.execute("SELECT COUNT(*) as count FROM RTU_device WHERE RTU_id = %s", (rtu_id,))
        result = cursor.fetchone()
        if result[0] == 0:
            raise HTTPException(status_code=404, detail=f"No existe un dispositivo con RTU_id {rtu_id}")

        # Actualizar dispositivo
        cursor.execute("""
            UPDATE RTU_device
            SET numero_serie_topico = %s, numero_cliente = %s, alias = %s
            WHERE RTU_id = %s
        """, (
            rtu_data.device.numero_serie_topico,
            rtu_data.device.numero_cliente,
            rtu_data.device.alias,
            rtu_id
        ))

        # Eliminar y reinsertar sensores
        cursor.execute("DELETE FROM RTU_sensores WHERE RTU_id = %s", (rtu_id,))
        for sensor in rtu_data.sensors:
            cursor.execute("""
                INSERT INTO RTU_sensores (RTU_id, C, Vmin, Vmax, Lmin, Lmax)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                rtu_id,
                sensor.C,
                sensor.Vmin,
                sensor.Vmax,
                sensor.Lmin,
                sensor.Lmax
            ))

        # Actualizar puertos
        cursor.execute("""
            UPDATE RTU_puertos
            SET P1 = %s, P2 = %s, P3 = %s
            WHERE RTU_id = %s
        """, (
            rtu_data.ports.P1,
            rtu_data.ports.P2,
            rtu_data.ports.P3,
            rtu_id
        ))

        # Si no existe registro de puertos, insertarlo
        if cursor.rowcount == 0:
            cursor.execute("""
                INSERT INTO RTU_puertos (RTU_id, P1, P2, P3)
                VALUES (%s, %s, %s, %s)
            """, (
                rtu_id,
                rtu_data.ports.P1,
                rtu_data.ports.P2,
                rtu_data.ports.P3
            ))

        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True, "message": "Dispositivo RTU actualizado exitosamente"}

    except HTTPException:
        if conn:
            conn.rollback()
            conn.close()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        raise HTTPException(status_code=500, detail=f"Error al actualizar dispositivo RTU: {str(e)}")


@pressure.delete("/rtu-devices/{rtu_id}", tags=["🔧 RTU Devices"])
def delete_rtu_device(rtu_id: int):
    """Elimina un dispositivo RTU y todos sus datos relacionados (sensores, puertos, datos)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar si el dispositivo existe
        cursor.execute("SELECT COUNT(*) as count FROM RTU_device WHERE RTU_id = %s", (rtu_id,))
        result = cursor.fetchone()
        if result[0] == 0:
            raise HTTPException(status_code=404, detail=f"No existe un dispositivo con RTU_id {rtu_id}")

        # El CASCADE en las foreign keys eliminará automáticamente sensores, puertos y datos
        cursor.execute("DELETE FROM RTU_device WHERE RTU_id = %s", (rtu_id,))

        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True, "message": "Dispositivo RTU eliminado exitosamente"}

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        raise HTTPException(status_code=500, detail=f"Error al eliminar dispositivo RTU: {str(e)}")
