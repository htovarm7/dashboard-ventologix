"""
Utilidades de base de datos y funciones auxiliares compartidas
"""
import mysql.connector
import os
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from datetime import date, timedelta
from typing import List, Tuple, Optional

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

# Constantes compartidas
FP = 0.9
HORAS = 24
COLORES = ['purple', 'orange', 'blue', 'green', 'red', 'cyan', 'brown', 'magenta', 'teal', 'lime', 'pink', 'gold']


def get_db_connection():
    """Obtiene una conexión a la base de datos"""
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_DATABASE
    )


# =======================================================================================
#                              FUNCIONES DE PRESIÓN
# =======================================================================================
def obtener_medidores_presion(numero_cliente: int) -> List[dict]:
    """Consulta todos los medidores de presión del cliente"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT p_device_id, dispositivo_id, linea
        FROM dispositivos_presion
        WHERE cliente_id = %s
    """, (numero_cliente,))
    result = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {
            "p_device_id": col["p_device_id"],
            "dispositivo_id": col["dispositivo_id"],
            "linea": col["linea"]
        }
        for col in result
    ]


def obtener_datos_presion(p_device_id: int, dispositivo_id: int, linea: str, fecha: str) -> pd.DataFrame:
    """Obtiene datos de presión usando procedimiento almacenado"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        params = (p_device_id, dispositivo_id, dispositivo_id, linea, fecha)
        cursor.callproc('DataFiltradaConPresion', params)

        data = []
        for result in cursor.stored_results():
            data = result.fetchall()

        cursor.close()
        conn.close()

        return pd.DataFrame(data)
    except Exception:
        return pd.DataFrame()


def litros_to_ft3(liters: float) -> float:
    """Convierte litros a pies cúbicos"""
    return liters / 28.3168


def deficit_cfm_from_vol_liters(vol_liters: float, duracion_min: float) -> float:
    """Calcula déficit de CFM desde volumen en litros y duración en minutos"""
    return litros_to_ft3(vol_liters) / duracion_min if duracion_min > 0 else float('inf')


def comp_flow_at_pressure(psig: float, flow_ref: float = 20.0, p_ref: float = 100.0, sens: float = 0.01) -> float:
    """Calcula flujo del compresor a presión dada"""
    return flow_ref * (1 + sens * (p_ref - psig))


def evaluar_rangos_10psi_api(event: dict, deficit_cfm: float, pres_min: float, pres_max: float,
                             comp_flow_ref: float, comp_p_ref: float, sens: float, margen: float) -> List[dict]:
    """Evalúa rangos de 10 psi para optimización de compresor"""
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


def filtrar_operacion_real(df: pd.DataFrame, presion_min: float = 90, presion_max: float = 110) -> pd.DataFrame:
    """Filtra datos para mostrar solo períodos de operación real"""
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


def calcular_control_limits(df: pd.DataFrame, presion_min: float = 90, presion_max: float = 110):
    """Calcula límites de control Six Sigma"""
    if df.empty or 'presion1_psi' not in df.columns:
        return None, None, None, None

    df['presion_suavizada'] = df['presion1_psi'].rolling(window=3, min_periods=1).mean()

    media = df['presion_suavizada'].mean()
    sigma = df['presion_suavizada'].std()

    UCL = min(media + 3*sigma, presion_max)
    LCL = max(media - 3*sigma, presion_min)

    return media, sigma, UCL, LCL


# =======================================================================================
#                              FUNCIONES DE COMPRESORES Y KWH
# =======================================================================================
def obtener_compresores(numero_cliente: int) -> List[tuple]:
    """Consulta todos los compresores del cliente"""
    conn = get_db_connection()
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


def obtener_kwh_fp(id_cliente: int, linea: str, segundosPR: int, voltaje: int) -> pd.DataFrame:
    """Consulta kWh para un compresor en fechas recientes"""
    conn = get_db_connection()
    cursor = conn.cursor()
    fecha_fin = date.today() - timedelta(days=1)
    fecha_inicio = fecha_fin - timedelta(days=10)
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


def calc_kwh_max(voltaje: int, amperes: float, fp: float = FP, horas: int = HORAS) -> float:
    """Calcula kWh máximo"""
    return np.sqrt(3) * voltaje * amperes * fp * horas / 1000


# =======================================================================================
#                              FUNCIONES DE REPORTES
# =======================================================================================
def percentage_load(data: List[dict]) -> float:
    """Calcula porcentaje de tiempo en LOAD"""
    load_records = [record for record in data if record['estado'] == "LOAD"]
    total_load = len(load_records)
    total_records = len(data)
    return (total_load / total_records) * 100 if total_records > 0 else 0


def percentage_noload(data: List[dict]) -> float:
    """Calcula porcentaje de tiempo en NOLOAD"""
    noload_records = [record for record in data if record['estado'] == "NOLOAD"]
    total_noload = len(noload_records)
    total_records = len(data)
    return (total_noload / total_records) * 100 if total_records > 0 else 0


def percentage_off(data: List[dict]) -> float:
    """Calcula porcentaje de tiempo en OFF"""
    off_records = [record for record in data if record['estado'] == "OFF"]
    total_off = len(off_records)
    total_records = len(data)
    return (total_off / total_records) * 100 if total_records > 0 else 0


def costo_energia_usd(kwh_total: float, usd_por_kwh: float) -> float:
    """Calcula costo de energía en USD"""
    try:
        kwh_total = float(kwh_total)
        return round(kwh_total * usd_por_kwh, 2)
    except (TypeError, ValueError):
        return 0.0
