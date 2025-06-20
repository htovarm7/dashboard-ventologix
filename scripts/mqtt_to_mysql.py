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
            time.sleep(3)

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
    global conn, cursor

    try:
        payload = json.loads(msg.payload.decode())
        logging.info(f"📨 Mensaje recibido: {payload}")

        # --- Extraer id_kpm desde data[0].point con id=0
        data_points = payload.get("data", [])
        if not data_points:
            logging.error("❌ Sin data en payload")
            return

        points = data_points[0].get("point", [])
        id_kpm_point = next((p for p in points if p.get("id") == 0), None)
        if not id_kpm_point:
            logging.error("❌ id_kpm no encontrado")
            return
        id_kpm = id_kpm_point.get("val")

        # --- Obtener id_cliente
        cursor.execute("SELECT id_cliente FROM dispositivo WHERE id_kpm = %s", (id_kpm,))
        result = cursor.fetchone()
        if not result:
            logging.error(f"Dispositivo no encontrado: {id_kpm}")
            return
        id_device = result['id_cliente']

        # --- Convertir timestamp tp
        tp = data_points[0].get("tp")
        if not tp:
            logging.error("❌ Timestamp (tp) no encontrado")
            return
        time_fmt = datetime.fromtimestamp(tp / 1000).strftime('%Y-%m-%d %H:%M:%S')

        # --- Mapear valores de puntos
        def get_val(point_id):
            return next((p.get("val", 0) for p in points if p.get("id") == point_id), 0)

        ua = get_val(1)
        ub = get_val(2)
        uc = get_val(3)
        ia = get_val(7)
        ib = get_val(8)
        ic = get_val(9)  # en Node-RED tenías ib e ic ambos en id=8, aquí lo separo
        zyggl = get_val(13)

        # --- Insertar en base de datos
        insert_query = """
            INSERT INTO pruebas (device_id, ua, ub, uc, ia, ib, ic, time, zyggl)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (id_device, ua, ub, uc, ia, ib, ic, time_fmt, zyggl)
        cursor.execute(insert_query, values)
        conn.commit()

        logging.info(f"✅ Insertado Device {id_device} | {time_fmt}")

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