from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
import mysql.connector
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.statespace.sarimax import SARIMAX
from pmdarima import auto_arima
from datetime import timedelta, date
import os
import dotenv
import io
import logging
from typing import List, Tuple, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

dotenv.load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

COLORES = ['purple', 'orange', 'blue', 'green', 'red', 'cyan', 'brown']
FP = 0.9
HORAS = 24

app = FastAPI()

# ========================
# 📂 FUNCIONES DE APOYO
# ========================
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
    # Asumiendo que el procedure devuelve: (Fecha, kWh, HorasTrabajadas)
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
    
    # Check for sufficient variance
    if series.var() == 0:
        logger.warning("Series has zero variance")
        return False
    
    return True

def clean_outliers_with_std(series: pd.Series, std_threshold=2.0) -> pd.Series:
    """Clean outliers using standard deviation method"""
    if series.empty or series.isna().all():
        return series
    
    # Solo considerar valores > 0 para el cálculo
    valid_data = series[series > 0]
    if len(valid_data) < 3:
        return series
    
    mean_val = valid_data.mean()
    std_val = valid_data.std()
    
    if std_val == 0:
        return series
    
    # Límites basados en desviación estándar
    lower_limit = max(0, mean_val - std_threshold * std_val)
    upper_limit = mean_val + std_threshold * std_val
    
    series_clean = series.copy()
    # Solo aplicar límites a valores > 0
    mask = series_clean > 0
    series_clean[mask] = series_clean[mask].clip(lower_limit, upper_limit)
    
    return series_clean

def safe_auto_arima(series: pd.Series, seasonal: bool = True, m: int = 7) -> Optional[object]:
    """Safely run auto_arima with proper error handling"""
    try:
        # Validate series
        if not validate_time_series(series, min_length=14):
            logger.warning("Series validation failed for auto_arima")
            return None
        
        # Additional checks for seasonal modeling
        if seasonal and len(series) < 2 * m:
            logger.warning(f"Insufficient data for seasonal modeling: {len(series)} < {2 * m}")
            seasonal = False
            m = 1
        
        # Remove any infinite or extremely large values
        series_clean = series.copy()
        series_clean = series_clean.replace([np.inf, -np.inf], np.nan)
        series_clean = series_clean.dropna()
        
        if len(series_clean) < 7:  # Minimum for any meaningful model
            logger.warning("Too few valid observations after cleaning")
            return None
        
        # Configure auto_arima with conservative parameters
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
    
    # Method 1: Try ARIMA model
    try:
        best_model = safe_auto_arima(series, seasonal=True, m=7)
        
        if best_model is not None:
            # Prepare series for modeling (remove zeros and transform)
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
    
    # Method 2: Moving average with trend
    try:
        if len(series) >= 7:
            # Use last 7 days for trend calculation
            recent_data = series[-7:].dropna()
            if len(recent_data) >= 3:
                # Simple linear trend
                x = np.arange(len(recent_data))
                y = recent_data.values
                
                # Fit linear trend
                if len(x) > 1 and np.var(x) > 0:
                    slope = np.corrcoef(x, y)[0, 1] * np.std(y) / np.std(x)
                    intercept = np.mean(y) - slope * np.mean(x)
                    
                    # Project trend forward
                    future_x = np.arange(len(recent_data), len(recent_data) + days)
                    predictions = intercept + slope * future_x
                    predictions = np.maximum(predictions, 0)
                    
                    logger.info("Using trend-based predictions")
                    return predictions.tolist(), "Tendencia lineal"
    except Exception as e:
        logger.error(f"Trend modeling failed: {str(e)}")
    
    # Method 3: Simple moving average
    try:
        valid_data = series.dropna()
        if len(valid_data) > 0:
            # Use different windows based on data availability
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
    
    # Method 4: Last resort - zero predictions
    logger.warning("All prediction methods failed, using zero predictions")
    return [0] * days, "Sin predicción"

# ========================
# 📈 ENDPOINT DE GRÁFICA
# ========================

# Agregar por FECHAS de Inicio y Fin
@app.get("/forecast/plot", tags=["energy"])
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