import mysql.connector
from mysql.connector import Error
import time
import os 
import dotenv

dotenv.load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

def test_database_connection():
    # Configuración de la base de datos
    db_config = {
        'host': DB_HOST,
        'database': DB_DATABASE,
        'user': DB_USER,
        'password': DB_PASSWORD,
        'port': 3306,
    }

    print("\nIntentando conectar a la base de datos...")
    print(f"Host: {db_config['host']}")
    print(f"Database: {db_config['database']}")
    print(f"User: {db_config['user']}")
    print(f"Port: {db_config['port']}")

    try:
        # Intento de conexión
        start_time = time.time()
        connection = mysql.connector.connect(**db_config)
        end_time = time.time()

        if connection.is_connected():
            db_info = connection.get_server_info()
            cursor = connection.cursor()
            cursor.execute("select database();")
            database_name = cursor.fetchone()[0]
            
            print("\n✅ Conexión exitosa!")
            print(f"Tiempo de conexión: {end_time - start_time:.2f} segundos")
            print(f"Servidor MySQL versión: {db_info}")
            print(f"Base de datos conectada: {database_name}")

            # Probar una consulta simple
            print("\nProbando consulta simple...")
            cursor.execute("SHOW TABLES;")
            tables = cursor.fetchall()
            print("\nTablas en la base de datos:")
            for table in tables:
                print(f"- {table[0]}")

    except Error as e:
        print("\n❌ Error al conectar a MySQL!")
        print(f"Error Code: {e.errno}")
        print(f"Error Message: {e.msg}")
        if hasattr(e, 'sqlstate'):
            print(f"SQL State: {e.sqlstate}")

    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("\nConexión cerrada.")

if __name__ == "__main__":
    test_database_connection()
