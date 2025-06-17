import paho.mqtt.client as mqtt
import mysql.connector
import json
from datetime import datetime
import logging
from dotenv import load_dotenv
import os
import time
import atexit

# Cargar variables de entorno
load_dotenv()

global conn, cursor

MQTT_BROKER = os.getenv("MQTT_BROKER")
MQTT_PORT = int(os.getenv("MQTT_PORT"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC")

db_config = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME")
}

# Configurar logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Conexión persistente a base
def conectar_db():
    while True:
        try:
            conn = mysql.connector.connect(**db_config)
            if conn.is_connected():
                logging.info("🟢 Conectado a la base de datos")
                return conn
        except Exception as e:
            logging.error(f"❌ Error al conectar a la base de datos: {e}")

conn = conectar_db()
cursor = conn.cursor(dictionary=True)

# Cerrar conexión al terminar
def cerrar_conexion():
    if conn.is_connected():
        cursor.close()
        conn.close()
        logging.info("🔴 Conexión a base cerrada")

atexit.register(cerrar_conexion)

# Callback al conectar al broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info("🟢 Conectado al broker MQTT")
        client.subscribe(MQTT_TOPIC)
    else:
        logging.error(f"🔴 Error de conexión MQTT: {rc}")

# Callback al recibir mensaje
def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        logging.info(f"📨 Mensaje recibido: {payload}")

        id_kpm = payload['id']

        cursor.execute("SELECT id_cliente FROM dispositivo WHERE id_kpm = %s", (id_kpm,))
        result = cursor.fetchone()

        if not result:
            logging.error(f"Dispositivo no encontrado: {id_kpm}")
            return

        id_device = result['id_cliente']

        time_str = payload['time']
        time_fmt = datetime.strptime(time_str, '%Y%m%d%H%M%S').strftime('%Y-%m-%d %H:%M:%S')

        insert_query = """
            INSERT INTO pruebas (device_id, ua, ub, uc, ia, ib, ic, time)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (
            id_device,
            payload.get('ua', 0),
            payload.get('ub', 0),
            payload.get('uc', 0),
            payload.get('ia', 0),
            payload.get('ib', 0),
            payload.get('ic', 0),
            time_fmt
        )
        cursor.execute(insert_query, values)
        conn.commit()

        logging.info(f"✅ Insertado correctamente: Device {id_device} a {time_fmt}")

    except mysql.connector.Error as db_err:
        logging.error(f"❌ Error en base de datos: {db_err}")
        if not conn.is_connected():
            logging.warning("🔄 Reintentando conexión a base de datos...")
            conn = conectar_db()
            cursor = conn.cursor(dictionary=True)
    except Exception as e:
        logging.error(f"❌ Error general: {str(e)}")

# Configurar cliente MQTT
client = mqtt.Client(protocol=mqtt.MQTTv311)
client.on_connect = on_connect
client.on_message = on_message

# Conectar al broker MQTT y loop infinito
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()