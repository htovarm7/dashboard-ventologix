"""
RTU MQTT Listener - Escucha tópicos MQTT e inserta datos en RTU_datos
"""
import mysql.connector
from mysql.connector import Error
import paho.mqtt.client as mqtt
import json
import time
import logging
from datetime import datetime
from dotenv import load_dotenv
import os
import atexit

# Cargar variables de entorno
load_dotenv()

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Configuración de la base de datos
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_DATABASE', 'tu_database'),
    'port': int(os.getenv('DB_PORT', 3306))
}

# Configuración MQTT
MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))
MQTT_USER = os.getenv('MQTT_USER', '')
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', '')

# Diccionario para mapear tópicos a RTU_id
topic_to_rtu = {}

# Conexión persistente a la base de datos
db_conn = None
db_cursor = None

def conectar_db():
    """Crear conexión persistente a la base de datos con reintentos"""
    while True:
        try:
            conn = mysql.connector.connect(**DB_CONFIG)
            if conn.is_connected():
                logging.info("🟢 Conectado a la base de datos MySQL")
                return conn
        except Error as e:
            logging.error(f"❌ Error al conectar a MySQL: {e}")
            logging.info("⏳ Reintentando en 5 segundos...")
            time.sleep(5)

def cerrar_conexion():
    """Cerrar conexión a la base de datos al terminar"""
    global db_conn, db_cursor
    try:
        if db_cursor:
            db_cursor.close()
        if db_conn and db_conn.is_connected():
            db_conn.close()
            logging.info("🔴 Conexión a base de datos cerrada")
    except:
        pass

# Registrar cierre de conexión al terminar
atexit.register(cerrar_conexion)

def load_topics_from_db():
    """Cargar todos los tópicos y RTU_ids desde la base de datos"""
    global topic_to_rtu

    try:
        # Usar conexión temporal para cargar tópicos
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT numero_serie_topico, RTU_id FROM RTU_device")
        devices = cursor.fetchall()

        topic_to_rtu.clear()
        for device in devices:
            topic = device['numero_serie_topico']
            rtu_id = device['RTU_id']
            topic_to_rtu[topic] = rtu_id
            logging.info(f"✓ Tópico cargado: {topic} -> RTU_id: {rtu_id}")

        cursor.close()
        conn.close()
        logging.info(f"✓ Total de tópicos cargados: {len(topic_to_rtu)}")

    except Error as e:
        logging.error(f"❌ Error al cargar tópicos: {e}")

def round_seconds_to_half_minute(dt):
    """
    Redondear segundos a 0 o 30 (replicando lógica de Node-RED)
    - Si segundos < 15 → 0
    - Si 15 <= segundos < 45 → 30
    - Si segundos >= 45 → próximo minuto con segundos en 0
    """
    seconds = dt.second

    if seconds < 15:
        # Mantener minuto actual, segundos en 0
        return dt.replace(second=0, microsecond=0)
    elif seconds < 45:
        # Mantener minuto actual, segundos en 30
        return dt.replace(second=30, microsecond=0)
    else:
        # Avanzar al siguiente minuto, segundos en 0
        from datetime import timedelta
        next_minute = dt.replace(second=0, microsecond=0) + timedelta(minutes=1)
        return next_minute

def get_adjusted_timestamp():
    """
    Obtener timestamp ajustado:
    1. Hora actual UTC
    2. Restar 6 horas para zona Monterrey (UTC-6 fijo)
    3. Redondear segundos a 0 o 30
    """
    from datetime import timedelta, timezone

    # Obtener hora UTC actual (usando método recomendado)
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    # Restar 6 horas para UTC-6 (Monterrey)
    monterrey_time = now_utc - timedelta(hours=6)

    # Redondear segundos a 0 o 30
    adjusted_time = round_seconds_to_half_minute(monterrey_time)

    return adjusted_time

def insert_sensor_data(rtu_id, s1, s2, s3):
    """Insertar datos de sensores en la base de datos usando conexión persistente"""
    global db_conn, db_cursor

    try:
        # Verificar conexión
        if not db_conn.is_connected():
            logging.warning("🔄 Reconectando a la base de datos...")
            db_conn = conectar_db()
            db_cursor = db_conn.cursor()

        # Obtener timestamp ajustado a UTC-6 con redondeo
        timestamp = get_adjusted_timestamp()

        query = """
            INSERT INTO RTU_datos (RTU_id, S1, S2, S3, Time)
            VALUES (%s, %s, %s, %s, %s)
        """
        db_cursor.execute(query, (rtu_id, s1, s2, s3, timestamp))
        db_conn.commit()

        logging.info(f"✅ Datos insertados - RTU_id: {rtu_id}, S1: {s1}, S2: {s2}, S3: {s3}, Time: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        return True

    except Error as e:
        logging.error(f"❌ Error al insertar datos: {e}")
        # Intentar reconectar
        try:
            db_conn = conectar_db()
            db_cursor = db_conn.cursor()
        except:
            pass
        return False

def on_connect(client, userdata, flags, rc):
    """Callback cuando se conecta al broker MQTT"""
    if rc == 0:
        logging.info("🟢 Conectado al broker MQTT")

        # Suscribirse a todos los tópicos
        if not topic_to_rtu:
            logging.warning("⚠️ No hay tópicos para suscribirse")
            return

        for topic in topic_to_rtu.keys():
            client.subscribe(topic)
            logging.info(f"📡 Suscrito al tópico: {topic}")

        logging.info(f"✅ Sistema listo. Escuchando {len(topic_to_rtu)} tópicos...")
    else:
        logging.error(f"❌ Error de conexión MQTT. Código: {rc}")

def on_message(client, userdata, msg):
    """Callback cuando se recibe un mensaje MQTT"""
    try:
        topic = msg.topic
        payload = msg.payload.decode('utf-8')

        # Obtener RTU_id del tópico
        rtu_id = topic_to_rtu.get(topic)

        if rtu_id is None:
            logging.warning(f"⚠️ Tópico desconocido: {topic}")
            return

        # Parsear el JSON
        data = json.loads(payload)

        # Detectar formato del payload y extraer sensores
        s1, s2, s3 = None, None, None

        # Formato 1: Node-RED con sensorDatas array
        if 'sensorDatas' in data:
            sensor_datas = data['sensorDatas']

            # Validar que el array tenga al menos 3 elementos
            if not sensor_datas or len(sensor_datas) < 3:
                logging.warning(f"⚠️ Payload incompleto. Se esperan al menos 3 sensores, recibidos: {len(sensor_datas) if sensor_datas else 0}")
                return

            # Extraer valores (sensores 0, 1, 2 → S1, S2, S3)
            try:
                s1 = float(sensor_datas[0].get('value', 0))
                s2 = float(sensor_datas[1].get('value', 0))
                s3 = float(sensor_datas[2].get('value', 0))
            except (ValueError, KeyError, AttributeError) as e:
                logging.error(f"❌ Error al extraer valores de sensorDatas: {e}")
                return

        # Formato 2: Directo con S1, S2, S3
        elif 'S1' in data or 'S2' in data or 'S3' in data:
            s1 = data.get('S1')
            s2 = data.get('S2')
            s3 = data.get('S3')
            logging.debug(f"   Formato directo detectado: S1={s1}, S2={s2}, S3={s3}")

        else:
            logging.warning(f"⚠️ Formato de payload no reconocido. Formatos soportados:")
            logging.warning(f"   1. Node-RED: {{\"sensorDatas\": [{{\"value\": \"1.23\"}}, ...]}}")
            logging.warning(f"   2. Directo: {{\"S1\": 1.23, \"S2\": 4.56, \"S3\": 7.89}}")
            return

        # Validar que al menos un sensor tenga datos
        if s1 is None and s2 is None and s3 is None:
            logging.warning(f"⚠️ No se encontraron datos de sensores en el payload")
            return

        # Insertar en la base de datos
        insert_sensor_data(rtu_id, s1, s2, s3)

    except json.JSONDecodeError as e:
        logging.error(f"❌ Error al parsear JSON: {e}")
        logging.debug(f"   Payload recibido: {msg.payload}")
    except Exception as e:
        logging.error(f"❌ Error al procesar mensaje: {e}")
        import traceback
        logging.debug(traceback.format_exc())

def on_disconnect(client, userdata, rc):
    """Callback cuando se desconecta del broker"""
    if rc != 0:
        logging.warning(f"⚠️ Desconexión inesperada del broker MQTT. Código: {rc}")
        logging.info("🔄 El cliente intentará reconectar automáticamente...")
    else:
        logging.info("🔴 Desconectado del broker MQTT")

def main():
    """Función principal"""
    global db_conn, db_cursor

    # Conectar a la base de datos
    db_conn = conectar_db()
    db_cursor = db_conn.cursor()

    # Cargar tópicos desde la base de datos
    load_topics_from_db()

    if not topic_to_rtu:
        logging.error("❌ No hay tópicos para escuchar. Verifica la tabla RTU_device")
        logging.info("💡 Agrega dispositivos RTU desde la interfaz web: /add-RTU")
        return

    # Configurar cliente MQTT
    client = mqtt.Client(client_id="RTU_Listener", clean_session=True)
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    # Credenciales MQTT (si se requieren)
    if MQTT_USER and MQTT_PASSWORD:
        client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
        logging.info("🔐 Autenticación MQTT configurada")

    # Conectar al broker
    try:
        logging.info(f"\n🌐 Conectando a broker MQTT: {MQTT_BROKER}:{MQTT_PORT}")
        client.connect(MQTT_BROKER, MQTT_PORT, 60)

        client.loop_forever()

    except KeyboardInterrupt:
        logging.info("\n\n⏸️  Deteniendo servicio...")
        client.disconnect()
        cerrar_conexion()
        logging.info("✅ Servicio detenido correctamente")

    except Exception as e:
        logging.error(f"\n❌ Error fatal: {e}")
        time.sleep(5)

if __name__ == "__main__":
    while True:
        try:
            main()
        except KeyboardInterrupt:
            logging.info("\n👋 Saliendo...")
            break
        except Exception as e:
            logging.error(f"\n❌ Error en el loop principal: {e}")
            logging.info("🔄 Reiniciando en 10 segundos...\n")
            time.sleep(10)