import dotenv
import mysql.connector
import pandas as pd
import matplotlib.pyplot as plt
import os

# Load environment variables
dotenv.load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

conn = mysql.connector.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_DATABASE
)

params = (1, 4, 4, 'B', '2025-09-1')
cursor = conn.cursor(dictionary=True)
cursor.callproc('DataFiltradaConPresion', params)

# -----------------------------
# 3. Extraer resultados
# -----------------------------
data = []
for result in cursor.stored_results():
    data = result.fetchall()

df = pd.DataFrame(data)
cursor.close()
conn.close()

# -----------------------------
# 4. Filtrar solo la operación real
# -----------------------------
presion_min = 90
presion_max = 110
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

df_operativa = df.iloc[indices_operacion].copy()

# -----------------------------
# 5. Contar eventos por debajo del mínimo
# -----------------------------
bajo_presion = df_operativa[df_operativa['presion1_psi'] < presion_min]
conteo_bajo = len(bajo_presion)
porcentaje_bajo = len(bajo_presion) / len(df_operativa) * 100

print(f"La presión estuvo por debajo de {presion_min} psi {conteo_bajo} veces ({porcentaje_bajo:.2f}%).")

# -----------------------------
# 6. Análisis Six Sigma sobre operación real
# -----------------------------
df_operativa['presion_suavizada'] = df_operativa['presion1_psi'].rolling(window=3, min_periods=1).mean()

media = df_operativa['presion_suavizada'].mean()
sigma = df_operativa['presion_suavizada'].std()

UCL = min(media + 3*sigma, presion_max)   # no pasar de 110
LCL = max(media - 3*sigma, presion_min)   # no bajar de 90

print(f"Media: {media:.2f}, Desviación estándar: {sigma:.2f}")
print(f"Límite superior de control (UCL): {UCL:.2f}")
print(f"Límite inferior de control (LCL): {LCL:.2f}")

# -----------------------------
# 7. Graficar solo zona de operación real
# -----------------------------
plt.figure(figsize=(15,6))

# Línea de presión (azul por default)
plt.plot(df_operativa['time'], df_operativa['presion1_psi'],
         color='blue', label='Presión registrada')

# Resaltar en rojo grueso si rebasa fuera de límites de 6σ
out_of_control = (df_operativa['presion1_psi'] > UCL) | (df_operativa['presion1_psi'] < LCL)
plt.plot(df_operativa['time'][out_of_control],
         df_operativa['presion1_psi'][out_of_control],
         color='red', linewidth=2.5, label='Fuera de control (±3σ)')

# Líneas de control y media (otros colores distintos a rojo)
plt.axhline(media, color='black', linestyle='-', label='Media')
plt.axhline(UCL, color='purple', linestyle='--', label='UCL (3σ)')
plt.axhline(LCL, color='purple', linestyle='--', label='LCL (3σ)')

# Rango operativo (90-110 psi)
plt.axhline(presion_max, color='green', linestyle=':', label='Máx 110 psi')
plt.axhline(presion_min, color='orange', linestyle=':', label='Mín 90 psi')

# Áreas coloreadas (verde dentro, amarillo intermedio, rojo fuera)
plt.fill_between(df_operativa['time'], presion_min, presion_max, color='green', alpha=0.1)
plt.fill_between(df_operativa['time'], LCL, presion_min, color='yellow', alpha=0.1)
plt.fill_between(df_operativa['time'], presion_max, UCL, color='yellow', alpha=0.1)
plt.fill_between(df_operativa['time'], df_operativa['presion1_psi'].min(), LCL, color='red', alpha=0.1)
plt.fill_between(df_operativa['time'], UCL, df_operativa['presion1_psi'].max(), color='red', alpha=0.1)

plt.xlabel('Tiempo')
plt.ylabel('Presión (psi)')
plt.title('Presión y Control Chart - Rango operativo 90 a 110 psi')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()

# -----------------------------
# 8. Tiempo total por debajo del mínimo
# -----------------------------
tiempo_total = len(df_operativa) * 30 / 60  # minutos (30s por registro)
tiempo_bajo = len(bajo_presion) * 30 / 60
porcentaje_tiempo_bajo = tiempo_bajo / tiempo_total * 100

print(f"Tiempo total por debajo de {presion_min} psi: {tiempo_bajo:.2f} min ({porcentaje_tiempo_bajo:.2f}% del tiempo de operación)")

# -----------------------------
# 9. Indicador de posible falta de almacenamiento
# -----------------------------
if porcentaje_tiempo_bajo > 5:
    print("⚠ Posible falta de almacenamiento: la presión pasa demasiado tiempo por debajo del mínimo.")
else:
    print("✅ Almacenamiento suficiente: la presión se mantiene mayormente dentro del rango.")
