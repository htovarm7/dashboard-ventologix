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

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse

import mysql.connector
import os
from dotenv import load_dotenv
import numpy as np
from datetime import datetime, timedelta
import pandas as pd
from io import BytesIO

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
def get_pie_data_proc(fecha: str = Query(...)):
    try:
        fecha_dt = datetime.strptime(fecha, '%Y-%m-%d')

        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Call the stored procedure
        cursor.execute("call DataFiltradaDayFecha(7,7,'A', %s)", (fecha_dt,))

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

        return JSONResponse(content={
            "data": {
                "LOAD": load_percentage,
                "NOLOAD": noload_percentage,
                "OFF": off_percentage
            }
        })

    except Exception as e:
        return JSONResponse(content={"error": str(e)})

@app.get("/api/line-data-proc")
def get_line_data(fecha: str = Query(...)):
    try:
        fecha_dt = datetime.strptime(fecha, '%Y-%m-%d')
        
        # Conectar a la base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Ejecutar SP con la fecha proporcionada
        cursor.execute("call DataFiltradaDayFecha(7,7,'A', %s)", (fecha_dt,))
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified date."}

        # Organizar los datos por tiempo
        data = [
            {"time": row[1], "corriente": row[2]} for row in results
        ]
        
        # Ordenar los datos por tiempo
        data.sort(key=lambda x: x["time"])

        # Agrupar los datos en intervalos de 30 segundos y calcular el promedio
        grouped_data = []
        temp_data = []
        start_time = data[0]["time"]  # Empezar desde el primer registro

        for entry in data:
            # Si la diferencia entre el tiempo actual y el primer registro del grupo es mayor a 30 segundos, hacer un promedio
            if (entry["time"] - start_time) >= timedelta(seconds=30):
                if temp_data:
                    avg_corriente = np.round(np.mean([item["corriente"] for item in temp_data]), 2)
                    grouped_data.append({
                        "time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
                        "corriente": avg_corriente
                    })
                # Resetear el grupo y actualizar el tiempo de inicio
                temp_data = [entry]
                start_time = entry["time"]
            else:
                temp_data.append(entry)
        
        # Para el último grupo
        if temp_data:
            avg_corriente = np.round(np.mean([item["corriente"] for item in temp_data]), 2)
            grouped_data.append({
                "time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
                "corriente": avg_corriente
            })

        # Devolver los datos agrupados
        return JSONResponse(content={"data": grouped_data})

    except Exception as e:
        return JSONResponse(content={"error": str(e)})


@app.get("/api/comments-data")
def get_comments_data(fecha: str = Query(...)):
    try:
        fecha_dt = datetime.strptime(fecha, '%Y-%m-%d')

        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        cursor.execute("call DataFiltradaDayFecha(7,7,'A', %s)", (fecha_dt,))
        results = cursor.fetchall()

        if not results:
            return {"data": None, "message": "No data found."}

        data = [{"time": row[1], "estado": row[3]} for row in results]
        estados_no_off = [d for d in data if d["estado"] != "OFF"]

        if not estados_no_off:
            return JSONResponse(content={ {
                "data": {
                    "first_time": None,
                    "last_time": None,
                    "total_ciclos": 0,
                    "promedio_ciclos_hora": 0,
                    "comentario_ciclos": "El compresor permaneció apagado durante todo el día."
                }
            }
            })

        first_time = estados_no_off[0]["time"].strftime("%H:%M:%S")
        last_time = estados_no_off[-1]["time"].strftime("%H:%M:%S")

        # Ciclos de trabajo: LOAD → NOLOAD
        ciclos = 0
        for i in range(1, len(estados_no_off)):
            if estados_no_off[i-1]['estado'] == "LOAD" and estados_no_off[i]['estado'] == "NOLOAD":
                ciclos += 1
        ciclos = ciclos // 2  # por pares consecutivos

        segundos_por_registro = 10  # ajusta si cambia tu muestreo
        total_registros = len(estados_no_off)
        total_segundos = total_registros * segundos_por_registro
        horas_trabajadas = total_segundos / 3600

        promedio_ciclos_hora = round(ciclos / horas_trabajadas, 1) if horas_trabajadas else 0

        # Comentario según rango recomendado
        if promedio_ciclos_hora >= 12 and promedio_ciclos_hora <= 15:
            comentario = "El promedio de ciclos por hora trabajada está dentro del rango recomendado de 12 a 15 ciclos/hora, por lo que parece estar funcionando correctamente."
        else:
            comentario = "El promedio de ciclos por hora trabajada está fuera del rango recomendado de 12 a 15 ciclos/hora. Se recomienda realizar un análisis en el compresor para identificar posibles anomalías."

        cursor.close()
        conn.close()

        return JSONResponse(content={
            "data": {
                "first_time": first_time,
                "last_time": last_time,
                "total_ciclos": ciclos,
                "promedio_ciclos_hora": promedio_ciclos_hora,
                "comentario_ciclos": comentario
            }
        })

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=400)

@app.get("/api/raw-data-excel")
def get_raw_data_excel(fecha: str = Query(...)):
    try:
        # Convertir la fecha en formato datetime
        fecha_dt = datetime.strptime(fecha, '%Y-%m-%d')

        # Conectar a la base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Ejecutar el procedimiento almacenado
        cursor.execute("call DataFiltradaDayFecha(7,7,'A', %s)", (fecha_dt,))
        results = cursor.fetchall()

        # Cerrar la conexión a la base de datos
        cursor.close()
        conn.close()

        # Si no hay resultados, devolver error
        if not results:
            return {"error": "No data found for the specified date."}

        # Convertir los resultados en un DataFrame de pandas
        df = pd.DataFrame(results, columns=["id", "time", "corriente", "estado", "estado_anterior"])

        # Guardar los datos en un archivo Excel en memoria
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='RawData')

        # Volver al inicio del archivo en memoria
        output.seek(0)

        # Retornar como un archivo Excel en una respuesta de streaming
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=raw_data.xlsx"}
        )

    except Exception as e:
        # Cualquier otro error inesperado
        return {"error": f"Unexpected error: {str(e)}"}
    

# These remains the same as before
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
        usd_por_kwh = 0.17  # aquí puedes parametrizarlo desde BD o env var
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

# Functions to calculate different metrics
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

def energy_calculated(data, compresor_data, segundos_por_registro=5):
    filtered_currents = [record['corriente'] for record in data if record['corriente'] > 0]
    if not filtered_currents:
        return 0

    tiempo_horas = segundos_por_registro / 3600

    energia_calculada = sum(
        corriente * 1.732 * 440 * 1 / 1000 * tiempo_horas
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

def costo_energia_usd(kwh_total, usd_por_kwh=0.17):
    return round(kwh_total * usd_por_kwh, 2)

"""
# APIs that worked without the need of filtering the date

@app.get("/api/line-data-proc")
def get_line_data():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        cursor.execute("call DataFiltradaDayFecha(7,7,'A',CURDATE())")
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified date."}

        # Convert to list of dicts
        data = [
            {"time": row[1], "corriente": row[2]}
            for row in results
        ]

        # Agrupar cada 6 registros y sacar promedio
        agrupado = []
        chunk_size = 6

        for i in range(0, len(data), chunk_size):
            chunk = data[i:i + chunk_size]
            if not chunk:
                continue

            promedio_corriente = sum(item["corriente"] for item in chunk) / len(chunk)
            time_ref = chunk[0]["time"].strftime('%Y-%m-%d %H:%M:%S')  # 👈 lo convertimos a string

            agrupado.append({
                "time": time_ref,
                "corriente": np.round(promedio_corriente, 2)
            })

        return JSONResponse(content={"data": agrupado})

    except mysql.connector.Error as err:
        return {"error": str(err)}

"""



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