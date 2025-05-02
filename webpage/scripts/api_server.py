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
* 1. To run the API, use the command:
* uvicorn scripts.api_server:app --reload
* To check the API response, you can use the following URL:
* http://127.0.0.1:8000/docs
* For PENOX use device_id = 7
* If the API is not updating, check the following:
* 1. Run in terminal:
    tasklist | findstr python
* 2. If the process is running, kill it using:
    taskkill /F /PID <PID>
* 3. Where <PID> is the process ID obtained from the previous command, which in this case is 18168.
    python.exe                   18168 Console                    1    67,276 KB
* 4. Run the API again using:
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
import os
from dotenv import load_dotenv
import numpy as np

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

@app.get("/api/pie-data-proc")
def get_pie_data_proc():
    try:
        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Call the stored procedure
        cursor.execute("call DataFiltradaDayFecha(7,7,'A',CURDATE())")

        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()
        
        if not results:
            return {"error": "No data from procedure"}

        # Map the results (adjust column names)
        data = [
            {"time": row[1], "estado": row[3], "estado_anterior": row[4]}
            for row in results
        ]

        # Calculate percentages
        load_percentage = np.round(percentage_load(data),3)
        noload_percentage = np.round(percentage_noload(data),3)
        off_percentage = np.round(percentage_off(data),3)
        
        # LOAD / NO LOAD /  OFF
        arr = [load_percentage,noload_percentage,off_percentage]
        
        # print(arr)

        return{
            "data": {
                "LOAD": load_percentage,
                "NOLOAD": noload_percentage,
                "OFF": off_percentage
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@app.get("/api/line-data-proc")
def get_line_data():
    try:
        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Execute query to fetch data from TempConEstadoAnterior on January 12, 2025
        cursor.execute("call DataFiltradaDayFecha(7,7,'A',CURDATE())")

        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        # Check if results are fetched correctly
        if not results:
            return {"error": "No data found for the specified date."}

        # Convert results into a list of dictionaries
        data = [
            {"time": row[1], "corriente": row[2]}
            for row in results
        ]
        
        # Verify data before processing
        # print(f"Data fetched from database: {data}")

        return {
            "data": data
        }

    except mysql.connector.Error as err:
        # Return error message in case of database error
        return {"error": str(err)}

@app.get("/api/gauge-data-proc")
def get_gauge_data():
    try:
        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Fetch hp values for id_cliente 7
        cursor.execute("SELECT hp FROM compresores WHERE id_cliente = 7")
        results = cursor.fetchall()

        # Close DB connections
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified client."}

        # Convert results to list of dicts
        data = [{"hp": row[0]} for row in results]

        # print(f"Results from DB: {results}")
        # print(f"Data processed: {data}")

        hp_instalado = 70.0

        # Sum hp values safely
        total_hp = sum(item["hp"] for item in data if isinstance(item["hp"], (int, float))) / 2

        porcentaje_uso = np.round((total_hp / hp_instalado) * 100,2)
        normalized_value = max(0, min(1, (porcentaje_uso - 30) / (120 - 30)))

        return {
            "porcentaje_uso": porcentaje_uso,
            "normalized_value": normalized_value
        }

    except Exception as e:
        return {"error": str(e)}
    
@app.get("/api/stats-data")
def get_stats_data():
    try:
        # Conectar a la base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Ejecutar procedimiento almacenado
        cursor.execute("call DataFiltradaDayFecha(7,7,'A',CURDATE())")
        results1 = cursor.fetchall()

        while cursor.nextset():
            pass

        # Consultar voltaje y HP
        cursor.execute("select hp, voltaje from compresores where id_cliente = 7")
        results2 = cursor.fetchall()

        # Cerrar recursos
        cursor.close()
        conn.close()

        if not results1 or not results2:
            return {"error": "No data found for the specified queries."}

        # Preparar datos
        data = [{"time": row[1], "corriente": row[2], "estado": row[3]} for row in results1]
        compresor_config = [{"hp": row[0], "voltage": row[1]} for row in results2]

        # Calcular kWh y horas trabajadas
        kwh_total = energy_calculated(data, compresor_config)
        horas_total = np.round(horas_trabajadas(data),2)
        usd_por_kwh = 0.12  # aquí puedes parametrizarlo desde BD o env var
        costo_usd = costo_energia_usd(kwh_total, usd_por_kwh)

        return {
            "data": {
                "kWh": kwh_total,
                "hours_worked": horas_total,
                "usd_cost": costo_usd
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@app.get("/api/compressor-data")
def get_compressor_data():
    try:
        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Fetch data from the compressor table for id_cliente 7
        cursor.execute("SELECT hp, tipo, voltaje, marca, numero_serie FROM compresores WHERE id_cliente = 7 and linea= 'A'")
        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified client."}

        # Convert results into a list of dictionaries
        data = [{"hp": row[0], "tipo": row[1], "voltaje": row[2], "marca": row[3], "numero_serie": row[4]} for row in results]

        return {
            "data": data
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@app.get("/api/client-data")
def get_client_data():
    try:
        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Fetch data from the clientes table for id_cliente 7
        cursor.execute("SELECT numero_cliente, nombre_cliente, RFC, direccion FROM clientes WHERE id_cliente = 7")
        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified client."}

        # Convert results into a list of dictionaries
        data = [{"numero_cliente": row[0], "nombre_cliente": row[1], "RFC": row[2], "direccion": row[3]} for row in results]

        return {
            "data": data
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}


def percentage_load(data):
    load_records = [record for record in data if record['estado'] == "LOAD"]
    total_load = len(load_records)
    total_records = len(data)
    return (total_load / total_records) * 100 if total_records > 0 else 0

def percentage_noload(data):
    noload_records = [record for record in data if record['estado'] == "NOLOAD"]
    total_noload = len(noload_records)
    total_records = len(data)
    return (total_noload / total_records) * 100 if total_records > 0 else 0

def percentage_off(data):
    off_records = [record for record in data if record['estado'] == "OFF"]
    total_off = len(off_records)
    total_records = len(data)
    return (total_off / total_records) * 100 if total_records > 0 else 0

def energy_calculated(data, compresor_data, segundos_por_registro=60):
    filtered_currents = [record['corriente'] for record in data if record['corriente'] > 0]
    if not filtered_currents:
        return 0

    voltage_values = [record['voltage'] for record in compresor_data if record['voltage'] is not None]
    if not voltage_values:
        return 0

    average_voltage = np.mean(voltage_values)
    tiempo_horas = segundos_por_registro / 3600

    energia_calculada = sum(
        corriente * 1.732 * average_voltage * 1 / 1000 * tiempo_horas
        for corriente in filtered_currents
    )

    return round(energia_calculada, 3)

def horas_trabajadas(data, segundos_por_registro=5):
    if not data:
        return 0

    registros_no_off = [record for record in data if record['estado'] != "OFF"]

    total_registros = len(data)
    registros_no_off_count = len(registros_no_off)

    if total_registros == 0 or registros_no_off_count == 0:
        return 0

    primer_no_off_time = min(record['time'] for record in registros_no_off)
    ultimo_no_off_time = max(record['time'] for record in registros_no_off)

    registros_rango = [
        record for record in data
        if primer_no_off_time <= record['time'] <= ultimo_no_off_time
    ]

    total_registros_rango = len(registros_rango)
    total_segundos = total_registros_rango * segundos_por_registro
    total_horas = total_segundos / 3600

    return round(total_horas, 3)

def costo_energia_usd(kwh_total, usd_por_kwh=0.12):
    return round(kwh_total * usd_por_kwh, 2)


"""

Functions to calculate the percentage of LOAD, NOLOAD, and OFF states from POWERBI
def percentage_load(data):
    # Filter records where estado is not "OFF"
    no_off_records = [record for record in data if record['estado'] != "OFF"]

    if not no_off_records:
        return 0  # Return 0 if no records are found

    # Get the first and last timestamps where estado is not "OFF"
    first_no_off_record = min(no_off_records, key=lambda x: x['time'])['time']
    last_no_off_record = max(no_off_records, key=lambda x: x['time'])['time']

    # Filter records within the range of the first and last timestamps
    range_records = [
        record for record in no_off_records
        if first_no_off_record <= record['time'] <= last_no_off_record
    ]

    # Count records where estado is "LOAD"
    total_load = sum(1 for record in range_records if record['estado'] == "LOAD")
    total_range_records = len(range_records)

    # Calculate percentage
    return (total_load / total_range_records) * 100 if total_range_records > 0 else 0


def percentage_noload(data):
    # Filter records where estado is not "OFF"
    no_off_records = [record for record in data if record['estado'] != "OFF"]

    if not no_off_records:
        return 0  # Return 0 if no records are found

    # Get the first and last timestamps where estado is not "OFF"
    first_no_off_record = min(no_off_records, key=lambda x: x['time'])['time']
    last_no_off_record = max(no_off_records, key=lambda x: x['time'])['time']

    # Filter records within the range of the first and last timestamps
    range_records = [
        record for record in no_off_records
        if first_no_off_record <= record['time'] <= last_no_off_record
    ]

    # Count records where estado is "NOLOAD"
    total_noload = sum(1 for record in range_records if record['estado'] == "NOLOAD")
    total_range_records = len(range_records)

    # Calculate percentage
    return (total_noload / total_range_records) * 100 if total_range_records > 0 else 0


def percentage_off(data):
    # Filter records where estado is not "OFF"
    no_off_records = [record for record in data if record['estado'] != "OFF"]

    if not no_off_records:
        return 0  # Return 0 if no records are found

    # Get the first and last timestamps where estado is not "OFF"
    first_no_off_record = min(no_off_records, key=lambda x: x['time'])['time']
    last_no_off_record = max(no_off_records, key=lambda x: x['time'])['time']

    # Filter records within the range of the first and last timestamps
    range_records = [
        record for record in no_off_records
        if first_no_off_record <= record['time'] <= last_no_off_record
    ]

    # Count records where estado is "OFF"
    total_off = sum(1 for record in range_records if record['estado'] == "OFF")
    total_range_records = len(range_records)

    # Calculate percentage
    return (total_off / total_range_records) * 100 if total_range_records > 0 else 0
"""