from mysql.connector import Error
import os
from dotenv import load_dotenv

import mysql.connector

def connect_to_database():
    load_dotenv()

    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD')
        )
        if connection.is_connected():
            print("Conexión exitosa a la base de datos")
            return connection
    except Error as e:
        print(f"Error al conectar a la base de datos: {e}")
        return None

def close_connection(connection):
    if connection and connection.is_connected():
        connection.close()
        print("Conexión cerrada")

if __name__ == "__main__":
    db_connection = connect_to_database()
    # Aquí puedes realizar operaciones con la base de datos
    close_connection(db_connection)