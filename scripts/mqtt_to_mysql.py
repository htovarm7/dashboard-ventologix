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

db_config = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME")
}

log_path = os.getenv("LOG_PATH")

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
        id_kpm = payload['data'][0]['point'][0]['val']

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

        # Extraer datos
        points = payload['data'][0]['point']
        tp = payload['data'][0]['tp']
        time = datetime.fromtimestamp(tp / 1000).strftime('%Y-%m-%d %H:%M:%S')

        def get_val(point_id):
            for p in points:
                if p['id'] == point_id:
                    return p['val']
            return 0

        ua = get_val(1)
        ub = get_val(2)
        uc = get_val(3)
        ia = get_val(7)
        ib = get_val(8)
        ic = get_val(8)  # Ojo, revisa si debería ser 9
        zyggl = get_val(13)

        # Insertar a base
        insert_query = """
            INSERT INTO pruebas (device_id, ua, ub, uc, ia, ib, ic, time, zyggl)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (id_device, ua, ub, uc, ia, ib, ic, time, zyggl)
        cursor.execute(insert_query, values)
        conn.commit()

        logging.info(f"Insertado correctamente: Device {id_device} a {time}")

    except Exception as e:
        logging.error(f"Error al procesar mensaje: {str(e)}")

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# Configuración cliente MQTT
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

# Conectar
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()
