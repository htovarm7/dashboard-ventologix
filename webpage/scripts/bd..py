from dotenv import load_dotenv
import os

import mysql.connector

try:
    load_dotenv()

    conexion = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )
    print("Conexión exitosa")

    cursor = conexion.cursor()
    
    query = "SELECT id_cliente, nombre_cliente, RFC FROM clientes;"
    cursor.execute(query)

    resultados = cursor.fetchall()
    
    for fila in resultados:
        print(fila)

    cursor.close()
    conexion.close()

except mysql.connector.Error as err:
    print(f"Error al conectar a la base de datos: {err}")
