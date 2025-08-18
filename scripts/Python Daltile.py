import mysql.connector
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.statespace.sarimax import SARIMAX
from pmdarima import auto_arima
from datetime import timedelta, date
import os
import dotenv 

dotenv.load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")


# 🚀 Conexión MySQL
db_connection = mysql.connector.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_DATABASE
)

# 🔄 Función para llamar al SP con FP
def obtener_kwh_fp(device_id, proyecto_id, linea):
    cursor = db_connection.cursor()
    fecha_fin = date.today() - timedelta(days=2)
    fecha_inicio = fecha_fin - timedelta(days=17)
    cursor.callproc('CalcularKHWSemanalesPorEstadoConCiclosFP', [
        device_id, proyecto_id, linea,
        fecha_inicio, fecha_fin,
        30, 440
    ])
    for result in cursor.stored_results():
        datos = result.fetchall()
    cursor.close()
    return pd.DataFrame([(fila[0], fila[1]) for fila in datos], columns=['Fecha', 'kWh'])

# 🗕 Llamadas
llamadas = [
    (16, 16, 'A'),
    (18, 18, 'A'),
    (18, 18, 'B'),
    (17, 17, 'A')
]

nombres_compresores = {
    'kWh_16_A': 'ACM0006',
    'kWh_18_A': 'ACM0002',
    'kWh_18_B': 'ACM0004',
    'kWh_17_A': 'ACM0005'
}

# 📊 Cargar y preparar
colores = ['purple', 'orange', 'blue', 'green']
df_total = pd.DataFrame()

for (device_id, proyecto_id, linea), color in zip(llamadas, colores):
    df = obtener_kwh_fp(device_id, proyecto_id, linea)
    df['Fecha'] = pd.to_datetime(df['Fecha'])
    df['kWh'] = df['kWh'].astype(float)
    df = df.groupby('Fecha').sum().asfreq('D')
    df.rename(columns={'kWh': f'kWh_{device_id}_{linea}'}, inplace=True)
    if df_total.empty:
        df_total = df
    else:
        df_total = df_total.join(df, how='outer')

# 🔢 Total y log-transform
kwh_cols = df_total.columns.tolist()
df_total['kWh'] = df_total[kwh_cols].sum(axis=1, skipna=True)
mask_no_zeros = df_total['kWh'].notna() & (df_total['kWh'] > 0)

q_low = df_total.loc[mask_no_zeros, 'kWh'].quantile(0.05)
q_high = df_total.loc[mask_no_zeros, 'kWh'].quantile(0.95)
df_total.loc[mask_no_zeros, 'kWh'] = df_total.loc[mask_no_zeros, 'kWh'].clip(q_low, q_high)

df_total['kWh_log'] = 0.0
df_total.loc[mask_no_zeros, 'kWh_log'] = np.log1p(df_total.loc[mask_no_zeros, 'kWh'])

dias_prediccion = 3
ultima_fecha = df_total.index[-1]
fechas_prediccion = pd.date_range(ultima_fecha + timedelta(days=1), periods=dias_prediccion, freq='D')

# 📈 Modelo o Promedio
hist_valores = df_total['kWh'].dropna().values[-7:]
usar_modelo = False  # 🚩 Bandera

if len(hist_valores) < 3:
    print("❌ No hay suficientes datos para modelar.")
    predicciones = [0] * dias_prediccion
    conf_int_lower = conf_int_upper = predicciones
    usar_modelo = False
else:
    variacion = max(hist_valores) - min(hist_valores)

    if variacion < 500:
        print("⚠️ Variación menor a 500 kWh. Se usará promedio plano en lugar de SARIMAX.")
        promedio = np.mean(hist_valores)
        predicciones = [promedio] * dias_prediccion
        conf_int_lower = conf_int_upper = predicciones
        usar_modelo = False
    else:
        usar_modelo = True
        if mask_no_zeros.sum() < 14:
            print(f"⚠️ Solo hay {mask_no_zeros.sum()} días con datos válidos. Se ajustará sin estacionalidad.")
            best_model = auto_arima(
                df_total.loc[mask_no_zeros, 'kWh_log'],
                seasonal=False,
                stepwise=True,
                trace=False
            )
        else:
            best_model = auto_arima(
                df_total.loc[mask_no_zeros, 'kWh_log'],
                seasonal=True,
                m=7,
                stepwise=True,
                trace=False
            )

        p, d, q = best_model.order
        P, D, Q, m = best_model.seasonal_order

        model = SARIMAX(
            endog=df_total.loc[mask_no_zeros, 'kWh_log'],
            order=(p, d, q),
            seasonal_order=(P, D, Q, m),
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        model_fit = model.fit(disp=False)
        pred_result = model_fit.get_forecast(steps=dias_prediccion)
        pred_log = pred_result.predicted_mean
        conf_int = pred_result.conf_int()
        predicciones = np.expm1(pred_log)
        conf_int_lower = np.expm1(conf_int.iloc[:, 0])
        conf_int_upper = np.expm1(conf_int.iloc[:, 1])
        predicciones = np.maximum(predicciones, 0)

# 💡 Líneas de Consumo Máximo
voltaje = 440
fp = 0.9
horas = 24

def calc_kwh_max(amperes):
    return np.sqrt(3) * voltaje * amperes * fp * horas / 1000

corrientes = {
    '16A': 126,
    '17A': 112.8,
    '18A': 110,
    '18B': 124
}

kwh_max_4 = calc_kwh_max(sum(corrientes.values()))
kwh_max_3 = calc_kwh_max(corrientes['17A'] + corrientes['18A'] + corrientes['18B'])

# 🎨 GRAFICAR
plt.figure(figsize=(12, 6))
bottom = np.zeros(len(df_total))

for col, color in zip(kwh_cols, colores):
    label = nombres_compresores.get(col, col)
    plt.bar(df_total.index, df_total[col], label=label, color=color, bottom=bottom, width=0.8)
    for i, (x, y, b) in enumerate(zip(df_total.index, df_total[col], bottom)):
        if pd.notna(y) and y > 0:
            plt.text(x, b + y / 2, f'{y:.0f}', ha='center', va='center', fontsize=8, color='white')
    bottom += df_total[col].fillna(0).values

for x, y in zip(df_total.index, df_total['kWh']):
    if pd.notna(y):
        plt.text(x, y + 5, f'{y:.0f}', ha='center', va='bottom', fontsize=9, color='black')

plt.axhline(kwh_max_4, color='black', linestyle='--', label=f'Máximo 4 compresores: {kwh_max_4:.0f} kWh')
plt.axhline(kwh_max_3, color='red', linestyle='--', label=f'Máximo 3 compresores: {kwh_max_3:.0f} kWh')

plt.plot(fechas_prediccion, predicciones, label='Predicción (Promedio)' if not usar_modelo else 'Predicción Total', color='black', marker='o')

if usar_modelo:
    plt.fill_between(fechas_prediccion, conf_int_lower, conf_int_upper,
                     color='black', alpha=0.3, label='Intervalo 95%')

for x, y in zip(fechas_prediccion, predicciones):
    plt.text(x, y + 5, f'{y:.0f}', ha='center', va='bottom', fontsize=9, color='black')

# ⬆️ Estimación anual y costo
hist_kwh = df_total['kWh'][-6:].tolist()
pred_kwh = predicciones
kwh_validos = hist_kwh[1:] + list(pred_kwh)
promedio_diario = np.mean(kwh_validos)
kwh_anual = promedio_diario * 365
costo_anual = kwh_anual * 0.091

recuadro = f"{'⚠️ Promedio estimado' if not usar_modelo else 'Estimación con modelo'}\n"
recuadro += f"Estimación Anual: {kwh_anual:,.0f} kWh\nCosto Estimado: ${costo_anual:,.0f} USD"
plt.gcf().text(0.72, 0.82, recuadro, fontsize=11, bbox=dict(facecolor='white', edgecolor='black'))

plt.title('Consumo Energético Diario por Compresor y Predicción')
plt.xlabel('Fecha')
plt.ylabel('Consumo (kWh)')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()

# 🖨️ Salida por consola
print("\U0001f52e Predicciones de Consumo (Total):")
for fecha, consumo in zip(fechas_prediccion, predicciones):
    print(f"{fecha.strftime('%A %d-%m-%Y')}: {consumo:.2f} kWh")

print("\n📊 Estimación Anual:", f"{kwh_anual:.0f} kWh", "(promedio)" if not usar_modelo else "")
print("💲 Costo Estimado:", f"${costo_anual:.0f} USD")

# 🔚 Cerrar conexión
db_connection.close()
