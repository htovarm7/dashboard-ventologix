import paho.mqtt.client as mqtt
import mysql.connector
import json
from datetime import datetime
import logging
from dotenv import load_dotenv
import os

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER")
MQTT_PORT = int(os.getenv("MQTT_PORT"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC")

#CAMBIAR EL DE TEST POR PRODUCCIÓN
db_config = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME")
}

# Configurar logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Callback al conectar
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("🟢 Conectado al broker MQTT")
        client.subscribe(MQTT_TOPIC)
    else:
        print("🔴 Error de conexión MQTT", rc)

# Callback al recibir mensaje
def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        logging.info(f"📨 Mensaje recibido: {payload}")

        id_kpm = payload['id']

        # Conectar a BD
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # Buscar id_cliente
        cursor.execute("SELECT id_cliente FROM dispositivo WHERE id_kpm = %s", (id_kpm,))
        result = cursor.fetchone()

        if not result:
            logging.error(f"Dispositivo no encontrado: {id_kpm}")
            return

        id_device = result['id_cliente']

        # Convertir time a datetime
        time_str = payload['time']  # '20250617155305'
        time = datetime.strptime(time_str, '%Y%m%d%H%M%S').strftime('%Y-%m-%d %H:%M:%S')

        # Insertar a base
        insert_query = """
            INSERT INTO pruebas (device_id, ua, ub, uc, ia, ib, ic, time, zyggl)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (
            id_device,
            payload.get('ua', 0),
            payload.get('ub', 0),
            payload.get('uc', 0),
            payload.get('ia', 0),
            payload.get('ib', 0),
            payload.get('ic', 0),
            time,
            payload.get('zyggl', 0)
        )
        cursor.execute(insert_query, values)
        conn.commit()

        logging.info(f"✅ Insertado correctamente: Device {id_device} a {time}")

    except Exception as e:
        logging.error(f"❌ Error al procesar mensaje: {str(e)}")

    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

# Configuración cliente MQTT
client = mqtt.Client(protocol=mqtt.MQTTv311)
client.on_connect = on_connect
client.on_message = on_message

# Conectar
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()