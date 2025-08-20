from fastapi import FastAPI, Query
import mysql.connector
import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from pmdarima import auto_arima
from datetime import timedelta, date
import os
import dotenv

# ========================
# 🔧 CONFIGURACIÓN GLOBAL
# ========================
dotenv.load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

# HARDCODEADO
COLORES = ['purple', 'orange', 'blue', 'green']
FP = 0.9
HORAS = 24

# 'kWh_idCliente_linea : 'alias'
NOMBRES_COMPRESORES = {
    'kWh_16_A': 'ACM0006',
    'kWh_18_A': 'ACM0002',
    'kWh_18_B': 'ACM0004',
    'kWh_17_A': 'ACM0005'
}

# "Select ia from P_{ActualMonth}_{ActualYear} where device_id = %s" (id_cliente), SOLO un resultado
# 'id_cliente+linea' : 'cursor.result' 
CORRIENTES = {
    '16A': 126,
    '17A': 112.8,
    '18A': 110,
    '18B': 124
}

# ========================
# 📦 APP FASTAPI
# ========================
app = FastAPI()

# ========================
# 📂 FUNCIONES DE APOYO
# ========================
def obtener_kwh_fp(id_cliente, linea):
    conn = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_DATABASE
    )
    cursor = conn.cursor()
    cursor.execute("select voltaje, alias, segundosPorRegistro from compresores c where id_cliente = %s", (id_cliente))
    compresorData  = cursor.fetchone
    voltaje = compresorData["voltaje"]
    segundosPR = compresorData["segundosPorRegistro"]
    alias = compresorData["alias"]
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
    return pd.DataFrame([(fila[0], fila[1]) for fila in datos], columns=['Fecha', 'kWh'])

@app.get("/forecast", tags=["energy"])
def forecast_endpoint(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Línea del cliente")
):
    try:
        df = obtener_kwh_fp(id_cliente, id_cliente, linea)
        if df.empty:
            return {"error": "No hay datos para este cliente/línea"}

        df['Fecha'] = pd.to_datetime(df['Fecha'])
        df['kWh'] = df['kWh'].astype(float)
        df = df.groupby('Fecha').sum().asfreq('D')
        df.rename(columns={'kWh': f'kWh_{id_cliente}_{linea}'}, inplace=True)

        df['kWh'] = df.sum(axis=1, skipna=True)
        mask_no_zeros = df['kWh'].notna() & (df['kWh'] > 0)
        q_low = df.loc[mask_no_zeros, 'kWh'].quantile(0.05)
        q_high = df.loc[mask_no_zeros, 'kWh'].quantile(0.95)
        df.loc[mask_no_zeros, 'kWh'] = df.loc[mask_no_zeros, 'kWh'].clip(q_low, q_high)

        df['kWh_log'] = 0.0
        df.loc[mask_no_zeros, 'kWh_log'] = np.log1p(df.loc[mask_no_zeros, 'kWh'])
        dias_prediccion = 3
        ultima_fecha = df.index[-1]
        fechas_prediccion = pd.date_range(ultima_fecha + timedelta(days=1), periods=dias_prediccion, freq='D')

        hist_valores = df['kWh'].dropna().values[-7:]
        usar_modelo = False

        if len(hist_valores) < 3:
            predicciones = [0] * dias_prediccion
        else:
            variacion = max(hist_valores) - min(hist_valores)
            if variacion < 500:
                promedio = np.mean(hist_valores)
                predicciones = [promedio] * dias_prediccion
            else:
                usar_modelo = True
                if mask_no_zeros.sum() < 14:
                    best_model = auto_arima(df.loc[mask_no_zeros, 'kWh_log'], seasonal=False)
                else:
                    best_model = auto_arima(df.loc[mask_no_zeros, 'kWh_log'], seasonal=True, m=7)

                p, d, q = best_model.order
                P, D, Q, m = best_model.seasonal_order

                model = SARIMAX(
                    endog=df.loc[mask_no_zeros, 'kWh_log'],
                    order=(p, d, q),
                    seasonal_order=(P, D, Q, m),
                    enforce_stationarity=False,
                    enforce_invertibility=False
                )
                model_fit = model.fit(disp=False)
                pred_result = model_fit.get_forecast(steps=dias_prediccion)
                pred_log = pred_result.predicted_mean
                predicciones = np.expm1(pred_log)
                predicciones = np.maximum(predicciones, 0)
        hist_kwh = df['kWh'][-6:].tolist()
        pred_kwh = predicciones
        kwh_validos = hist_kwh[1:] + list(pred_kwh)
        promedio_diario = np.mean(kwh_validos)
        kwh_anual = promedio_diario * 365
        costo_anual = kwh_anual * 0.091
        return {
            "id_cliente": id_cliente,
            "linea": linea,
            "usar_modelo": usar_modelo,
            "predicciones": [
                {"fecha": f.strftime("%Y-%m-%d"), "kWh": float(y)}
                for f, y in zip(fechas_prediccion, predicciones)
            ],
            "estimacion_anual": {
                "kWh": round(kwh_anual, 2),
                "costo_usd": round(costo_anual, 2)
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}