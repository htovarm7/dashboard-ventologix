"""
 * @file fastApi.py
 * @date 23/04/2025
 * @author Hector Tovar
 * 
 * @description
 * This file implements fetching data from the database using a FastAPI server and MySQL connector.
 * Based on the data fetched, it returns the data, which is then sent to the graphs.
 * @version 1.0

"""

"""
* @Observations:
* For checking the API response, you can use the following URL:
* http://127.0.0.1:8000/docs
* For PENOX use device_id = 7
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Get database credentials from environment variables
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")


# @app.get("/api/clients")
# def get_clients():
#     try:
#         # Connect to the database
#         conn = mysql.connector.connect(
#             host=DB_HOST,
#             user=DB_USER,
#             password=DB_PASSWORD,
#             database=DB_NAME
#         )
#         cursor = conn.cursor()
        
#         # Execute query
#         cursor.execute("""
#             SELECT RFC, nombre_cliente 
#             FROM clientes 
#         """)
#         results = cursor.fetchall()

#         # Close resources
#         cursor.close()
#         conn.close()

#         # Convert results into a list of dictionaries
#         data = [
#             {"RFC": row[0], "count": row[1]}
#             for row in results
#         ]

#         return {"data": data}

#     except mysql.connector.Error as err:
#         # Return error message in case of database error
#         return {"error": str(err)}



@app.get("/api/pie-data")
def get_pie_data():
    try:
        # Conectar a la base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Ejecutar consulta para obtener datos de TempConEstadoAnterior el 12 de enero de 2025
        cursor.execute("""
            SELECT time, estado, corriente
            FROM TempConEstadoAnterior
            WHERE DATE(time) = '2025-01-12'
        """)

        results = cursor.fetchall()

        # Cerrar recursos
        cursor.close()
        conn.close()

        # Verifica si los resultados están llegando correctamente
        if not results:
            return {"error": "No data found for the specified date."}

        # Convertir resultados en una lista de diccionarios
        data = [
            {"time": row[0], "estado": row[1], "corriente": row[2]}
            for row in results
        ]

        # # Verificar los datos antes de procesarlos
        # print(f"Data fetched from database: {data}")

        # # Calcular porcentajes
        # load_percentage = porcentaje_load(data)
        # noload_percentage = porcentaje_noload(data)
        # off_percentage = porcentaje_off(data)

        # # Devolver los porcentajes en formato adecuado para graficar
        # return {
        #     "data": {
        #         "LOAD": load_percentage,
        #         "NOLOAD": noload_percentage,
        #         "OFF": off_percentage
        #     }
        # }

        return  {"data": data}

    except mysql.connector.Error as err:
        # Retornar mensaje de error en caso de error de base de datos
        return {"error": str(err)}

    
def porcentaje_load(data):
    registros_load = [registro for registro in data if registro['estado'] == "LOAD"]
    total_load = len(registros_load)
    total_registros = len(data)
    return (total_load / total_registros) * 100 if total_registros > 0 else 0

def porcentaje_noload(data):
    registros_noload = [registro for registro in data if registro['estado'] == "NOLOAD"]
    total_noload = len(registros_noload)
    total_registros = len(data)
    return (total_noload / total_registros) * 100 if total_registros > 0 else 0

def porcentaje_off(data):
    registros_off = [registro for registro in data if registro['estado'] == "OFF"]
    total_off = len(registros_off)
    total_registros = len(data)
    return (total_off / total_registros) * 100 if total_registros > 0 else 0


"""

Functions to calculate the percentage of LOAD, NOLOAD, and OFF states from the POWERBI
def porcentaje_load(data):
    # Filter records where estado is not "OFF"
    registros_no_off = [registro for registro in data if registro['estado'] != "OFF"]

    if not registros_no_off:
        return 0  # Return 0 if no records are found

    # Get the first and last timestamps where estado is not "OFF"
    primer_registro_no_off = min(registros_no_off, key=lambda x: x['time'])['time']
    ultimo_registro_no_off = max(registros_no_off, key=lambda x: x['time'])['time']

    # Filter records within the range of the first and last timestamps
    registros_rango = [
        registro for registro in registros_no_off
        if primer_registro_no_off <= registro['time'] <= ultimo_registro_no_off
    ]

    # Count records where estado is "LOAD"
    total_load = sum(1 for registro in registros_rango if registro['estado'] == "LOAD")
    total_registros_rango = len(registros_rango)

    # Calculate percentage
    return (total_load / total_registros_rango) * 100 if total_registros_rango > 0 else 0


def porcentaje_noload(data):
    # Filter records where estado is not "OFF"
    registros_no_off = [registro for registro in data if registro['estado'] != "OFF"]

    if not registros_no_off:
        return 0  # Return 0 if no records are found

    # Get the first and last timestamps where estado is not "OFF"
    primer_registro_no_off = min(registros_no_off, key=lambda x: x['time'])['time']
    ultimo_registro_no_off = max(registros_no_off, key=lambda x: x['time'])['time']

    # Filter records within the range of the first and last timestamps
    registros_rango = [
        registro for registro in registros_no_off
        if primer_registro_no_off <= registro['time'] <= ultimo_registro_no_off
    ]

    # Count records where estado is "NOLOAD"
    total_noload = sum(1 for registro in registros_rango if registro['estado'] == "NOLOAD")
    total_registros_rango = len(registros_rango)

    # Calculate percentage
    return (total_noload / total_registros_rango) * 100 if total_registros_rango > 0 else 0


def porcentaje_off(data):
    # Filter records where estado is not "OFF"
    registros_no_off = [registro for registro in data if registro['estado'] != "OFF"]

    if not registros_no_off:
        return 0  # Return 0 if no records are found

    # Get the first and last timestamps where estado is not "OFF"
    primer_registro_no_off = min(registros_no_off, key=lambda x: x['time'])['time']
    ultimo_registro_no_off = max(registros_no_off, key=lambda x: x['time'])['time']

    # Filter records within the range of the first and last timestamps
    registros_rango = [
        registro for registro in registros_no_off
        if primer_registro_no_off <= registro['time'] <= ultimo_registro_no_off
    ]

    # Count records where estado is "OFF"
    total_off = sum(1 for registro in registros_rango if registro['estado'] == "OFF")
    total_registros_rango = len(registros_rango)

    # Calculate percentage
    return (total_off / total_registros_rango) * 100 if total_registros_rango > 0 else 0
"""