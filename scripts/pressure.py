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

def insert_sensor_data(rtu_id, s1, s2, s3):
    """Insertar datos de sensores en la base de datos usando conexión persistente"""
    global db_conn, db_cursor

    try:
        # Verificar conexión
        if not db_conn.is_connected():
            logging.warning("🔄 Reconectando a la base de datos...")
            db_conn = conectar_db()
            db_cursor = db_conn.cursor()

        query = """
            INSERT INTO RTU_datos (RTU_id, S1, S2, S3, Time)
            VALUES (%s, %s, %s, %s, %s)
        """
        timestamp = datetime.now()
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

        logging.info(f"\n📨 Mensaje recibido en tópico: {topic}")
        logging.debug(f"   Payload: {payload}")

        # Obtener RTU_id del tópico
        rtu_id = topic_to_rtu.get(topic)

        if rtu_id is None:
            logging.warning(f"⚠️ Tópico desconocido: {topic}")
            return

        # Parsear el JSON
        data = json.loads(payload)

        # Extraer valores de sensores
        s1 = data.get('S1')
        s2 = data.get('S2')
        s3 = data.get('S3')

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

    logging.info("=" * 60)
    logging.info("   RTU MQTT Listener - Sistema de Monitoreo RTU")
    logging.info("=" * 60)

    # Conectar a la base de datos
    db_conn = conectar_db()
    db_cursor = db_conn.cursor()

    # Cargar tópicos desde la base de datos
    logging.info("\n📋 Cargando tópicos desde RTU_device...")
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

        # Mantener el loop corriendo
        logging.info("\n" + "=" * 60)
        logging.info("✅ Sistema iniciado. Esperando mensajes MQTT...")
        logging.info("   Presiona Ctrl+C para detener")
        logging.info("=" * 60 + "\n")

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
    logging.info("\n" + "=" * 60)
    logging.info("  🚀 Iniciando RTU MQTT Listener")
    logging.info("=" * 60)
    logging.info(f"  Broker: {MQTT_BROKER}:{MQTT_PORT}")
    logging.info(f"  Base de datos: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    logging.info("=" * 60 + "\n")

    # Loop infinito con reconexión automática
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