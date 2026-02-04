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

db_config = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_DATABASE")
}

# Configurar logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Conexión persistente a base de datos
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

# Lista global de tópicos MQTT (RTU_IDs)
mqtt_topics = []

# Cerrar conexión al terminar
def cerrar_conexion():
    if conn.is_connected():
        cursor.close()
        conn.close()
        logging.info("🔴 Conexión a base cerrada")

atexit.register(cerrar_conexion)

# Obtener todos los RTU_IDs de la tabla RTU_Especificaciones
def obtener_device_ids():
    try:
        cursor.execute("SELECT DISTINCT RTU_ID FROM RTU_Especificaciones")
        resultados = cursor.fetchall()
        device_ids = [row['RTU_ID'] for row in resultados]
        logging.info(f"📋 {len(device_ids)} dispositivos encontrados: {device_ids}")
        return device_ids
    except Exception as e:
        logging.error(f"❌ Error al obtener device_ids: {e}")
        return []

# Callback al conectar al broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info("🟢 Conectado al broker MQTT")

        # Suscribirse a todos los tópicos
        for topic in mqtt_topics:
            client.subscribe(topic)
            logging.info(f"📡 Suscrito al tópico: {topic}")
    else:
        logging.error(f"🔴 Error de conexión MQTT: {rc}")

# Callback al recibir mensaje
def on_message(client, userdata, msg):
    global conn, cursor

    try:
        # El tópico es el RTU_ID
        rtu_id = msg.topic
        payload = json.loads(msg.payload.decode())

        logging.info(f"📨 Mensaje recibido de {rtu_id}: {payload}")

        # Extraer datos de sensores (ajustar según el formato de tu payload MQTT)
        sensor1 = float(payload.get("sensor1", payload.get("Sensor1", 0)))
        sensor2 = float(payload.get("sensor2", payload.get("Sensor2", 0)))
        sensor3 = float(payload.get("sensor3", payload.get("Sensor3", 0)))
        col4 = float(payload.get("col4", payload.get("Col4", 0)))

        # Parsear timestamp (ajustar según el formato que recibas)
        time_str = payload.get("time", payload.get("timestamp"))
        if time_str:
            # Si el formato es 'YYYYMMDDHHMMSS' (como en mqtt_to_mysql.py)
            if len(time_str) == 14 and time_str.isdigit():
                time_fmt = datetime.strptime(time_str, "%Y%m%d%H%M%S").strftime('%Y-%m-%d %H:%M:%S')
            else:
                # Si es ISO format o similar
                time_fmt = datetime.fromisoformat(time_str).strftime('%Y-%m-%d %H:%M:%S')
        else:
            # Si no viene timestamp, usar el actual
            time_fmt = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Insertar en RTU_Datos
        insert_query = """
            INSERT INTO RTU_Datos (RTU_ID, Sensor1, Sensor2, Sensor3, Col4, time)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        values = (rtu_id, sensor1, sensor2, sensor3, col4, time_fmt)
        cursor.execute(insert_query, values)
        conn.commit()

        logging.info(f"✅ Insertado RTU_ID: {rtu_id} | Tiempo: {time_fmt}")

    except mysql.connector.Error as db_err:
        logging.error(f"❌ Error en base de datos: {db_err}")
        if not conn.is_connected():
            logging.warning("🔄 Reintentando conexión a base de datos...")
            conn = conectar_db()
            cursor = conn.cursor(dictionary=True)
    except json.JSONDecodeError as json_err:
        logging.error(f"❌ Error al decodificar JSON: {json_err} | Payload: {msg.payload}")
    except Exception as e:
        logging.error(f"❌ Error general: {str(e)}")

# Callback de desconexión
def on_disconnect(client, userdata, rc):
    if rc != 0:
        logging.warning(f"⚠️ Desconexión inesperada del broker MQTT (código: {rc})")
        logging.info("🔄 Reintentando conexión...")

# Main
if __name__ == "__main__":
    # Obtener todos los device_ids (RTU_IDs)
    mqtt_topics = obtener_device_ids()

    if not mqtt_topics:
        logging.error("❌ No se encontraron dispositivos. Saliendo...")
        exit(1)

    # Configurar cliente MQTT
    client = mqtt.Client(protocol=mqtt.MQTTv311)
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    # Conectar al broker MQTT y loop infinito
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        logging.info(f"🚀 Iniciando escucha de {len(mqtt_topics)} dispositivos IoT...")
        client.loop_forever()
    except KeyboardInterrupt:
        logging.info("⏹️ Detenido por el usuario")
        client.disconnect()
    except Exception as e:
        logging.error(f"❌ Error al conectar al broker: {e}")
