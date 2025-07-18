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

def conectar_db():
    while True:
        try:
            conn = mysql.connector.connect(**db_config)
            if conn.is_connected():
                logging.info("🟢 Conectado a la base de datos")
                return conn
        except Exception as e:
            logging.error(f"❌ Error al conectar a la base de datos: {e}")
            time.sleep(3)

conn = conectar_db()
cursor = conn.cursor(dictionary=True)

def cerrar_conexion():
    if conn.is_connected():
        cursor.close()
        conn.close()
        logging.info("🔴 Conexión a base cerrada")

atexit.register(cerrar_conexion)

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info("🟢 Conectado al broker MQTT")
        client.subscribe(MQTT_TOPIC)
    else:
        logging.error(f"🔴 Error de conexión MQTT: {rc}")

def on_message(client, userdata, msg):
    global conn, cursor
    try:
        payload = json.loads(msg.payload.decode())
        logging.info(f"📨 Mensaje recibido: {payload}")

        # Ahora procesa el payload según los campos actuales, por ejemplo:
        id_device = payload.get("id")
        if not id_device:
            logging.error("❌ Faltó campo 'id' en payload")
            return

        # Extraer variables directamente del dict recibido
        ua = float(payload.get("ua", 0.0))
        ub = float(payload.get("ub", 0.0))
        uc = float(payload.get("uc", 0.0))
        ia = float(payload.get("ia", 0.0))
        ib = float(payload.get("ib", 0.0))
        ic = float(payload.get("ic", 0.0))

        # Convertir timestamp si tienes "time" en formato YYYYMMDDHHMMSS
        time_str = payload.get("time")
        if not time_str:
            logging.error("❌ Faltó campo 'time' en payload")
            return
        time_fmt = datetime.strptime(time_str, "%Y%m%d%H%M%S").strftime('%Y-%m-%d %H:%M:%S')

        # Puedes mapear id_device a id_cliente o device_id en BD si quieres
        cursor.execute("SELECT id_cliente FROM dispositivo WHERE id_kpm = %s", (id_device,))
        result = cursor.fetchone()
        if not result:
            logging.error(f"❌ Dispositivo no encontrado: {id_device}")
            return
        id_db_device = result["id_cliente"]

        # Insertar en BD
        insert_query = """
            INSERT INTO pruebas (device_id, ua, ub, uc, ia, ib, ic, time)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (id_db_device, ua, ub, uc, ia, ib, ic, time_fmt)
        cursor.execute(insert_query, values)
        conn.commit()

        logging.info(f"✅ Insertado Device {id_db_device} | {time_fmt}")

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