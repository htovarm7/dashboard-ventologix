"""
Endpoints de predicción de consumo energético con SARIMAX/ARIMA
"""
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import timedelta
from typing import List, Tuple
import io

from statsmodels.tsa.statespace.sarimax import SARIMAX
from pmdarima import auto_arima

from .db_utils import obtener_compresores, obtener_kwh_fp, COLORES


prediction = APIRouter(prefix="/prediction", tags=["📊 Predicciones"])


def generate_predictions_fast(series: pd.Series, days: int = 3) -> Tuple[List[float], str]:
    """Genera predicciones usando enfoque optimizado"""

    hist_valores = series.dropna().values[-7:]

    if len(hist_valores) < 3:
        return [0] * days, "Sin datos suficientes"

    variacion = max(hist_valores) - min(hist_valores)

    if variacion < 500:
        promedio = np.mean(hist_valores)
        predictions = [promedio] * days
        return predictions, "Promedio (poca variación)"

    try:
        series_clean = series[series > 0].copy()
        if len(series_clean) < 7:
            promedio = np.mean(hist_valores)
            return [promedio] * days, "Promedio (datos insuficientes)"

        series_log = np.log1p(series_clean)

        if len(series_clean) < 14:
            model = auto_arima(
                series_log,
                seasonal=False,
                stepwise=True,
                trace=False,
                suppress_warnings=True,
                max_p=2, max_q=2
            )
        else:
            model = auto_arima(
                series_log,
                seasonal=True,
                m=7,
                stepwise=True,
                trace=False,
                suppress_warnings=True,
                max_p=2, max_q=2, max_P=1, max_Q=1
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

        model_fit = sarimax_model.fit(disp=False, maxiter=50)
        pred_result = model_fit.get_forecast(steps=days)
        pred_log = pred_result.predicted_mean
        predictions = np.expm1(pred_log)
        predictions = np.maximum(predictions, 0)

        return predictions.tolist(), "Modelo SARIMAX optimizado"

    except Exception:
        promedio = np.mean(hist_valores)
        return [promedio] * days, "Promedio (modelo falló)"


@prediction.get("/consumption", tags=["📊 Análisis y Predicciones"])
def consumption_prediction_plot(
    numero_cliente: int = Query(..., description="Número del cliente")
):
    """Genera gráfica de predicción de consumo energético"""
    try:
        compresores = obtener_compresores(numero_cliente)
        if not compresores:
            return {"error": "El cliente no tiene compresores registrados"}

        df_total = pd.DataFrame()
        nombres_compresores = {}
        voltaje_ref = 440
        costoKwh = 0.1

        for (id_cliente, linea, alias, segundosPR, voltaje, costo), color in zip(compresores, COLORES):
            try:
                df = obtener_kwh_fp(id_cliente, linea, segundosPR, voltaje)
                if df.empty:
                    continue

                df['Fecha'] = pd.to_datetime(df['Fecha'])
                df['kWh'] = pd.to_numeric(df['kWh'], errors='coerce')

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

            except Exception:
                continue

        if df_total.empty:
            return {"error": "No se pudieron cargar datos de ningún compresor"}

        kwh_cols = [col for col in df_total.columns if col.startswith('kWh_') and '_' in col]

        df_total['kWh'] = df_total[kwh_cols].sum(axis=1, skipna=True)

        mask_no_zeros = df_total['kWh'].notna() & (df_total['kWh'] > 0)
        if mask_no_zeros.sum() > 3:
            q_low = df_total.loc[mask_no_zeros, 'kWh'].quantile(0.05)
            q_high = df_total.loc[mask_no_zeros, 'kWh'].quantile(0.95)
            df_total.loc[mask_no_zeros, 'kWh'] = df_total.loc[mask_no_zeros, 'kWh'].clip(q_low, q_high)

        dias_prediccion = 3
        ultima_fecha = df_total.index[-1]
        fechas_prediccion = pd.date_range(ultima_fecha + timedelta(days=1), periods=dias_prediccion, freq='D')

        predicciones, metodo_usado = generate_predictions_fast(df_total['kWh'], dias_prediccion)

        hist_kwh = df_total['kWh'].dropna()[-6:].tolist()
        kwh_validos = [x for x in hist_kwh if x > 0] + [x for x in predicciones if x > 0]

        if kwh_validos:
            promedio_diario = np.mean(kwh_validos)
        else:
            promedio_diario = 0

        kwh_anual = promedio_diario * 365
        costo_anual = kwh_anual * costoKwh

        plt.switch_backend('Agg')
        fig, ax = plt.subplots(figsize=(12, 6))

        df_plot = df_total[kwh_cols].fillna(0)
        bottom = np.zeros(len(df_total))

        for col, color in zip(kwh_cols, COLORES):
            if col in nombres_compresores:
                label = nombres_compresores[col]
                ax.bar(df_total.index, df_plot[col], label=label, color=color, bottom=bottom, width=0.8)
                bottom += df_plot[col].values

        for x, y in zip(df_total.index, df_total['kWh']):
            if pd.notna(y) and y > 0:
                ax.text(x, y + max(y * 0.05, 5), f'{y:.0f}', ha='center', va='bottom', fontsize=8, color='black')

        if any(p > 0 for p in predicciones):
            ax.plot(fechas_prediccion, predicciones, label="Predicción", color="black", marker="o", linewidth=2)
            for x, y in zip(fechas_prediccion, predicciones):
                ax.text(x, y + max(y * 0.05, 5), f"{y:.0f}", ha="center", va="bottom", fontsize=9, color="black", weight='bold')

        recuadro = f"Estimación Anual: {kwh_anual:,.0f} kWh\nCosto Estimado: ${costo_anual:,.0f} USD"
        plt.gcf().text(0.72, 0.82, recuadro, fontsize=11, bbox=dict(facecolor='white', edgecolor='black', alpha=0.9))

        ax.set_title(f"Consumo Energético Diario", fontsize=14, weight='bold')
        ax.set_xlabel("Fecha")
        ax.set_ylabel("Consumo (kWh)")
        ax.legend(loc='upper left')
        ax.grid(True, alpha=0.3)

        fig.autofmt_xdate()
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)

        return StreamingResponse(buf, media_type="image/png")

    except Exception as e:
        return {"error": f"Error interno del servidor: {str(e)}"}
