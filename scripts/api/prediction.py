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


@prediction.get("/consumption")
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

                df_grouped = df.groupby('Fecha')['kWh'].sum()
                df_grouped = pd.DataFrame({f'kWh_{id_cliente}_{linea}': df_grouped})

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

        df_total = df_total.sort_index()
        kwh_cols = [col for col in df_total.columns if col.startswith('kWh_')]

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

        # Calcular tamaño dinámico de la figura
        num_dias = len(df_total) + dias_prediccion
        num_compresores = len(kwh_cols)

        # Ancho: mínimo 10, máximo 20, escala con días
        ancho = max(10, min(20, num_dias * 0.8 + 4))

        # Altura: mínimo 6, escala con número de compresores y valores
        altura_base = 6
        if num_compresores > 5:
            altura_base = 7
        if num_compresores > 8:
            altura_base = 8

        plt.switch_backend('Agg')
        fig, ax = plt.subplots(figsize=(ancho, altura_base))

        df_plot = df_total[kwh_cols].fillna(0)

        # Usar posiciones numéricas para las barras
        x_positions = np.arange(len(df_total))
        fechas_labels = [d.strftime('%d/%m') for d in df_total.index]

        bottom = np.zeros(len(df_total))

        # Ajustar ancho de barras según número de días
        bar_width = min(0.8, max(0.4, 8 / num_dias))

        for col, color in zip(kwh_cols, COLORES):
            if col in nombres_compresores:
                label = nombres_compresores[col]
                ax.bar(x_positions, df_plot[col].values, label=label, color=color, bottom=bottom, width=bar_width)
                bottom += df_plot[col].values

        # Ajustar tamaño de fuente de etiquetas según número de días
        label_fontsize = max(6, min(9, 60 / num_dias))

        for i, y in enumerate(df_total['kWh']):
            if pd.notna(y) and y > 0:
                ax.text(i, y + max(y * 0.05, 5), f'{y:.0f}', ha='center', va='bottom', fontsize=label_fontsize, color='black')

        if any(p > 0 for p in predicciones):
            # Posiciones para predicciones (continúan después de los datos históricos)
            x_pred = np.arange(len(df_total), len(df_total) + len(predicciones))
            ax.plot(x_pred, predicciones, label="Predicción", color="black", marker="o", linewidth=2)
            for i, y in enumerate(predicciones):
                ax.text(x_pred[i], y + max(y * 0.05, 5), f"{y:.0f}", ha="center", va="bottom", fontsize=9, color="black", weight='bold')
            # Agregar etiquetas de predicción
            fechas_labels += [d.strftime('%d/%m') for d in fechas_prediccion]

        # Configurar etiquetas del eje X
        all_x = np.arange(len(fechas_labels))
        ax.set_xticks(all_x)
        ax.set_xticklabels(fechas_labels, rotation=45, ha='right')

        # Ajustar posición del recuadro según el ancho de la figura
        recuadro_x = max(0.65, 0.72 - (num_compresores - 5) * 0.02)
        recuadro_y = max(0.75, 0.82 - (num_compresores - 5) * 0.02)

        recuadro = f"Estimación Anual: {kwh_anual:,.0f} kWh\nCosto Estimado: ${costo_anual:,.0f} USD"
        plt.gcf().text(recuadro_x, recuadro_y, recuadro, fontsize=10, bbox=dict(facecolor='white', edgecolor='black', alpha=0.9))

        ax.set_title(f"Consumo Energético Diario", fontsize=14, weight='bold')
        ax.set_xlabel("Fecha", fontsize=11)
        ax.set_ylabel("Consumo (kWh)", fontsize=11)

        # Ajustar leyenda según número de compresores
        legend_fontsize = max(7, min(10, 70 / num_compresores))
        legend_ncol = 1 if num_compresores <= 6 else 2

        ax.legend(loc='upper left', fontsize=legend_fontsize, ncol=legend_ncol, framealpha=0.9)
        ax.grid(True, alpha=0.3, axis='y')

        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=300, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)

        return StreamingResponse(buf, media_type="image/png")

    except Exception as e:
        return {"error": f"Error interno del servidor: {str(e)}"}


@prediction.get("/consumption/debug")
def consumption_debug(
    numero_cliente: int = Query(..., description="Número del cliente")
):
    """Endpoint de debugging para ver los datos en cada paso"""
    try:
        compresores = obtener_compresores(numero_cliente)
        if not compresores:
            return {"error": "El cliente no tiene compresores registrados"}

        debug_info = {
            "compresores_count": len(compresores),
            "compresores_info": [],
            "df_total_info": {},
            "kwh_cols": [],
            "df_plot_sample": {}
        }

        df_total = pd.DataFrame()
        nombres_compresores = {}

        for idx, ((id_cliente, linea, alias, segundosPR, voltaje, costo), color) in enumerate(zip(compresores, COLORES)):
            try:
                df = obtener_kwh_fp(id_cliente, linea, segundosPR, voltaje)

                comp_debug = {
                    "index": idx,
                    "id_cliente": id_cliente,
                    "linea": linea,
                    "alias": alias,
                    "raw_data_count": len(df),
                    "raw_data_empty": df.empty
                }

                if df.empty:
                    comp_debug["status"] = "EMPTY - skipped"
                    debug_info["compresores_info"].append(comp_debug)
                    continue

                comp_debug["raw_data_sample"] = df.head(3).to_dict('records')

                df['Fecha'] = pd.to_datetime(df['Fecha'])
                df['kWh'] = pd.to_numeric(df['kWh'], errors='coerce')

                df_grouped = df.groupby('Fecha')['kWh'].sum()
                df_grouped = pd.DataFrame({f'kWh_{id_cliente}_{linea}': df_grouped})

                comp_debug["grouped_count"] = len(df_grouped)
                comp_debug["grouped_sample"] = df_grouped.head(3).to_dict()
                comp_debug["grouped_sum"] = float(df_grouped.sum().iloc[0]) if not df_grouped.empty else 0

                nombres_compresores[f'kWh_{id_cliente}_{linea}'] = alias

                if df_total.empty:
                    df_total = df_grouped
                else:
                    df_total = df_total.join(df_grouped[f'kWh_{id_cliente}_{linea}'], how='outer')

                comp_debug["status"] = "OK"
                debug_info["compresores_info"].append(comp_debug)

            except Exception as e:
                comp_debug["status"] = f"ERROR: {str(e)}"
                debug_info["compresores_info"].append(comp_debug)
                continue

        if df_total.empty:
            return {"error": "No se pudieron cargar datos de ningún compresor", "debug": debug_info}

        df_total = df_total.sort_index()
        kwh_cols = [col for col in df_total.columns if col.startswith('kWh_')]

        debug_info["df_total_info"] = {
            "shape": df_total.shape,
            "columns": list(df_total.columns),
            "index_type": str(type(df_total.index)),
            "index_sample": [str(d) for d in df_total.index[:5]],
            "data_sample": df_total.head(5).to_dict()
        }

        debug_info["kwh_cols"] = kwh_cols
        debug_info["nombres_compresores"] = nombres_compresores

        df_plot = df_total[kwh_cols].fillna(0)

        debug_info["df_plot_sample"] = {
            "shape": df_plot.shape,
            "first_5_rows": df_plot.head(5).to_dict(),
            "sum_per_col": df_plot.sum().to_dict(),
            "max_per_col": df_plot.max().to_dict()
        }

        return debug_info

    except Exception as e:
        return {"error": f"Error interno del servidor: {str(e)}"}
