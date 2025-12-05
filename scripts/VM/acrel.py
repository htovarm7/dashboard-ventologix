import json
import os
from datetime import datetime, timedelta
import pytz
import mysql.connector
from mysql.connector import Error
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

print("Antes de load_dotenv()")
load_dotenv()
print("Después de load_dotenv()")

MQTT_BROKER = os.getenv("MQTT_BROKER")
MQTT_PORT = int(os.getenv("MQTT_PORT"))
MQTT_TOPIC = "ADW300/TEST1"

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

def find_val(points, id):
    return next((p["val"] for p in points if p["id"] == id), 0)

def redondear_a_30s(timestamp_ms):
    # Convertir timestamp UTC a datetime UTC
    dt_utc = datetime.utcfromtimestamp(timestamp_ms / 1000.0).replace(tzinfo=pytz.UTC)

    # Convertir a hora de Monterrey
    monterrey_tz = pytz.timezone("America/Monterrey")
    dt_mty = dt_utc.astimezone(monterrey_tz)

    # Redondear segundos a 0 o 30
    segundos = dt_mty.second
    if segundos < 15:
        nuevos_segundos = 0
    elif segundos < 45:
        nuevos_segundos = 30
    else:
        nuevos_segundos = 0
        dt_mty += timedelta(minutes=1)

    return dt_mty.replace(second=nuevos_segundos, microsecond=0)


def insert_data(payload):
    try:
        # Conexión a MySQL
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )

        if connection.is_connected():
            cursor = connection.cursor(dictionary=True)

            # Paso 1: Extraer id_kpm
            id_kpm = next((p["val"] for p in payload["data"][0]["point"] if p["id"] == 0), None)
            if not id_kpm:
                print("ID_KPM no encontrado en el mensaje.")
                return

            # Paso 2: Buscar id_cliente
            select_query = f"SELECT id_cliente FROM dispositivo WHERE id_kpm = '{id_kpm}'"
            cursor.execute(select_query)
            result = cursor.fetchone()
            if not result:
                print(f"No se encontró id_cliente para id_kpm={id_kpm}")
                return
            id_cliente = result["id_cliente"]

            # Paso 3: Obtener y redondear timestamp `tp` del payload
            tp_raw = payload["data"][0].get("tp")
            if tp_raw is None:
                print("Timestamp 'tp' no encontrado en el payload.")
                return

            # Convertir y redondear a :00 o :30
            formatted_time = redondear_a_30s(tp_raw).strftime("%Y-%m-%d %H:%M:%S")

            # Paso 4: Valores eléctricos
            points = payload["data"][0].get("point", [])
            ua = find_val(points, 1)
            ub = find_val(points, 2)
            uc = find_val(points, 3)
            ia = find_val(points, 7)
            ib = find_val(points, 8)
            ic = find_val(points, 9)

            insert_electrico = """
                INSERT INTO pruebas (device_id, ua, ub, uc, ia, ib, ic, time)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            """

            insert_hoy = """
                INSERT INTO hoy (device_id, ua, ub, uc, ia, ib, ic, time)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            """
            cursor.execute(insert_electrico, (id_cliente, ua, ub, uc, ia, ib, ic, formatted_time))
            cursor.execute(insert_hoy, (id_cliente, ua, ub, uc, ia, ib, ic, formatted_time))

            # Paso 5: Insertar sensores si existen
            sensor_data = payload.get("sensorDatas", [])
            if len(sensor_data) >= 4:
                sensor1 = float(sensor_data[0]["value"])
                sensor2 = float(sensor_data[1]["value"])
                sensor3 = float(sensor_data[2]["value"])
                columna4 = float(sensor_data[3]["value"])
                p_device_id = 1  # Fijo

                insert_presion = """
                    INSERT INTO presion (p_device_id, sensor1, sensor2, sensor3, columna4, timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s);
                """
                cursor.execute(insert_presion, (p_device_id, sensor1, sensor2, sensor3, columna4, formatted_time))
            else:
                print("Advertencia: Datos de sensores incompletos.")

            # Confirmar cambios
            connection.commit()
            print(f"✅ Datos insertados para KPM {id_kpm} a {formatted_time}")

    except Error as e:
        print("❌ Error en MySQL:", e)

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# Callback cuando se recibe un mensaje MQTT
def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        insert_data(payload)
    except Exception as e:
        print("❌ Error procesando mensaje MQTT:", e)

# Configurar cliente MQTT
client = mqtt.Client(protocol=mqtt.MQTTv311)
client.on_message = on_message

print("Conectando a MQTT...")
client.connect(MQTT_BROKER, MQTT_PORT)
client.subscribe(MQTT_TOPIC)
print(f"Escuchando en topic: {MQTT_TOPIC}")

# Ejecutar para siempre
client.loop_forever()