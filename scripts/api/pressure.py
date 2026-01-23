"""
Endpoints de análisis de presión
"""
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import io

from .db_utils import obtener_medidores_presion, obtener_datos_presion


pressure = APIRouter(prefix="/pressure", tags=["📈 Presión"])


@pressure.get("/plot", tags=["📈 Visualización de Datos"])
def pressure_analysis_plot(
    numero_cliente: int = Query(..., description="Número del cliente"),
    fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")
):
    """Genera gráfica de análisis de presión"""
    try:
        dispositivos = obtener_medidores_presion(numero_cliente)

        if not dispositivos:
            return {"error": "No se encontraron dispositivos de presión para este cliente"}

        # Constantes
        presion_min = 100
        presion_max = 120
        V_tanque = 700

        first_device = dispositivos[0]
        p_device_id = first_device["p_device_id"]
        dispositivo_id = first_device["dispositivo_id"]
        linea = first_device["linea"].strip()

        df = obtener_datos_presion(p_device_id, dispositivo_id, linea, fecha)

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
        ax.fill_between(df_operativa['time'], 95, 100, color='yellow', alpha=0.2, label='Zona Riesgo 95–100 psi')
        ax.axhline(95, color='red', alpha=0.4, label='Alarma Whatsapp psi < 95')

        evento_riesgo = (df_operativa['presion1_psi'] >= 95) & (df_operativa['presion1_psi'] < 100)
        ax.plot(df_operativa['time'][evento_riesgo], df_operativa['presion1_psi'][evento_riesgo],
               'o', color='orange', label='Evento de Riesgo (95-100 psi)', markersize=4)

        fuera_bajo_plot = df_operativa['presion1_psi'] < 95
        ax.plot(df_operativa['time'][fuera_bajo_plot], df_operativa['presion1_psi'][fuera_bajo_plot],
               'o', color='red', label='Evento Crítico (psi < 95)', markersize=4)

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
    fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")
):
    """Obtiene estadísticas detalladas de análisis de presión"""
    try:
        dispositivos = obtener_medidores_presion(numero_cliente)

        if not dispositivos:
            return {"error": "No se encontraron dispositivos de presión para este cliente"}

        presion_min = 100
        presion_max = 120

        first_device = dispositivos[0]
        p_device_id = first_device["p_device_id"]
        dispositivo_id = first_device["dispositivo_id"]
        linea = first_device["linea"].strip()

        df = obtener_datos_presion(p_device_id, dispositivo_id, linea, fecha)

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
