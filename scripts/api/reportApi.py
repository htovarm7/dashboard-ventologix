from fastapi import FastAPI, Query, HTTPException, APIRouter
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
from pydantic import BaseModel
from reportlab.pdfgen import canvas

"""
* @Observations:
* 1. To run the API, use the command:
* uvicorn scripts.api_server:webApi --reload
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

# Load environment variables
load_dotenv()

# Create FastAPI instance
report = APIRouter(prefix="/report", tags=["report"])

# Get database credentials from environment variables
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

# Daily endpoints
@report.get("/pie-data-proc", tags=["daily"])
def get_pie_data_proc(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Llamar al procedimiento con id_cliente en vez de 7,7
        cursor.execute(
            "call DataFiltradaDayFecha(%s, %s, %s, DATE_SUB(CURDATE(), INTERVAL 1 DAY))",
            (id_cliente, id_cliente, linea)
        )

        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data from procedure"}

        # Map the results (ajustar columnas)
        data = [
            {"time": row[1], "estado": row[3], "estado_anterior": row[4]}
            for row in results
        ]

        # Calcular porcentajes
        load_percentage = np.round(percentage_load(data), 2)
        noload_percentage = np.round(percentage_noload(data), 2)
        off_percentage = np.round(percentage_off(data), 2)

        return {
            "data": {
                "LOAD": load_percentage,
                "NOLOAD": noload_percentage,
                "OFF": off_percentage
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/line-data-proc", tags=["daily"])
def get_line_data(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        
        # Conectar a la base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Ejecutar SP con la fecha proporcionada
        cursor.execute(
            "call DataFiltradaDayFecha(%s, %s, %s, DATE_SUB(CURDATE(), INTERVAL 1 DAY))",
            (id_cliente, id_cliente, linea)
        )
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
  
@report.get("/daily-report-data", tags=["daily"])
def get_daily_report(id_cliente: int = Query(..., description="ID del cliente"),
                     linea: str = Query(..., description="Línea del cliente")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Llamar procedimiento almacenado DFDFTest
        cursor.execute(
            "CALL DFDFTest(%s, %s, %s, DATE_SUB(CURDATE(), INTERVAL 1 DAY))",
            (id_cliente, id_cliente, linea)
        )

        # Leer primer resultset (TempConEstadoAnterior) para consumirlo
        cursor.fetchall()

        # Pasar al siguiente resultset (el que tiene el resumen)
        cursor.nextset()
        result = cursor.fetchone()

        if not result:
            return {"data": None, "message": "Sin datos para ese día"}

        # Mapear resultado del procedimiento
        (fecha, inicio, fin, horas_trab, kWh, horas_load, horas_noload,
         hp_equivalente, ciclos, prom_ciclos_hora) = result

        # Limpiar todos los resultsets restantes del procedimiento
        while cursor.nextset():
            pass

        # Consultar hp nominal y voltaje para ese cliente y línea
        cursor.execute(
            "SELECT hp, voltaje FROM compresores WHERE id_cliente = %s AND linea = %s LIMIT 1",
            (id_cliente, linea)
        )
        data = cursor.fetchone()
        hp_nominal = data[0] if data else 0

        usd_por_kwh = 0.17
        costo_usd = round(float(kWh) * usd_por_kwh, 2)

        # Comentario ciclos
        if 6 <= prom_ciclos_hora <= 15:
            comentario_ciclos = "El promedio de ciclos por hora trabajada está dentro del rango recomendado de 6 a 15 ciclos/hora."
        else:
            comentario_ciclos = "El promedio de ciclos por hora trabajada está fuera del rango recomendado. Se recomienda revisar el compresor."

        # Comentario HP
        if hp_nominal == 0:
            comentario_hp = "Sin información de HP nominal."
        elif hp_equivalente <= hp_nominal:
            comentario_hp = "El HP equivalente está dentro del rango nominal."
        else:
            comentario_hp = "El HP equivalente supera al nominal, se recomienda revisión."

        cursor.close()
        conn.close()

        return {
            "data": {
                "fecha": fecha.strftime("%Y-%m-%d"),
                "inicio_funcionamiento": str(inicio),
                "fin_funcionamiento": str(fin),
                "horas_trabajadas": float(horas_trab),
                "kWh": float(kWh),
                "horas_load": float(horas_load),
                "horas_noload": float(horas_noload),
                "hp_nominal": int(hp_nominal),
                "hp_equivalente": int(hp_equivalente),
                "ciclos": int(ciclos),
                "promedio_ciclos_hora": float(prom_ciclos_hora),
                "costo_usd": float(costo_usd),
                "comentario_ciclos": comentario_ciclos,
                "comentario_hp_equivalente": comentario_hp
            }
        }

    except mysql.connector.Error as err:
        return {"error": f"Error de base de datos: {str(err)}"}
    except Exception as e:
        return {"error": f"Error inesperado: {str(e)}"}

# Select Date
@report.get("/pie-data-proc-day", tags=["selectDate"])
def get_pie_data_proc(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente"), date: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    try:
        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Llamar al procedimiento con id_cliente en vez de 7,7
        cursor.execute(
            "call DataFiltradaDayFecha(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, date)
        )

        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data from procedure"}

        # Map the results (ajustar columnas)
        data = [
            {"time": row[1], "estado": row[3], "estado_anterior": row[4]}
            for row in results
        ]

        # Calcular porcentajes
        load_percentage = np.round(percentage_load(data), 2)
        noload_percentage = np.round(percentage_noload(data), 2)
        off_percentage = np.round(percentage_off(data), 2)

        return {
            "data": {
                "LOAD": load_percentage,
                "NOLOAD": noload_percentage,
                "OFF": off_percentage
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/line-data-proc-day", tags=["selectDate"])
def get_line_data(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente"), date: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    try:
        
        # Conectar a la base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Ejecutar SP con la fecha proporcionada
        cursor.execute(
            "call DataFiltradaDayFecha(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, date)
        )
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

@report.get("/day-report-data", tags=["selectDate"])
def get_day_report(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente"), date: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Llamar procedimiento almacenado DFDFTest
        cursor.execute(
            "CALL DFDFTest(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, date)
        )

        # Leer primer resultset (TempConEstadoAnterior) para consumirlo
        cursor.fetchall()

        # Pasar al siguiente resultset (el que tiene el resumen)
        cursor.nextset()
        result = cursor.fetchone()

        if not result:
            return {"data": None, "message": "Sin datos para ese día"}

        # Mapear resultado del procedimiento
        (fecha, inicio, fin, horas_trab, kWh, horas_load, horas_noload,
         hp_equivalente, ciclos, prom_ciclos_hora) = result

        # Limpiar todos los resultsets restantes del procedimiento
        while cursor.nextset():
            pass

        # Consultar hp nominal y voltaje para ese cliente y línea
        cursor.execute(
            "SELECT hp, voltaje FROM compresores WHERE id_cliente = %s AND linea = %s LIMIT 1",
            (id_cliente, linea)
        )
        data = cursor.fetchone()
        hp_nominal = data[0] if data else 0

        usd_por_kwh = 0.17
        costo_usd = round(float(kWh) * usd_por_kwh, 2)

        # Comentario ciclos
        if 6 <= prom_ciclos_hora <= 15:
            comentario_ciclos = "El promedio de ciclos por hora trabajada está dentro del rango recomendado de 6 a 15 ciclos/hora."
        else:
            comentario_ciclos = "El promedio de ciclos por hora trabajada está fuera del rango recomendado. Se recomienda revisar el compresor."

        # Comentario HP
        if hp_nominal == 0:
            comentario_hp = "Sin información de HP nominal."
        elif hp_equivalente <= hp_nominal:
            comentario_hp = "El HP equivalente está dentro del rango nominal."
        else:
            comentario_hp = "El HP equivalente supera al nominal, se recomienda revisión."

        cursor.close()
        conn.close()

        return {
            "data": {
                "fecha": fecha.strftime("%Y-%m-%d"),
                "inicio_funcionamiento": str(inicio),
                "fin_funcionamiento": str(fin),
                "horas_trabajadas": float(horas_trab),
                "kWh": float(kWh),
                "horas_load": float(horas_load),
                "horas_noload": float(horas_noload),
                "hp_nominal": int(hp_nominal),
                "hp_equivalente": int(hp_equivalente),
                "ciclos": int(ciclos),
                "promedio_ciclos_hora": float(prom_ciclos_hora),
                "costo_usd": float(costo_usd),
                "comentario_ciclos": comentario_ciclos,
                "comentario_hp_equivalente": comentario_hp
            }
        }

    except mysql.connector.Error as err:
        return {"error": f"Error de base de datos: {str(err)}"}
    except Exception as e:
        return {"error": f"Error inesperado: {str(e)}"}

# Weekly endpoints
@report.get("/week/pie-data-proc", tags=["weekly"])
def get_pie_data_proc_weekly(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        cursor.execute(
            "call DataFiltradaWeekFecha(%s, %s, %s,  DATE_SUB(CURDATE(), INTERVAL 1 DAY))",
            (id_cliente, id_cliente, linea)
        )

        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data from procedure"}

        # Map the results (adjust columns)
        data = [
            {"time": row[1], "estado": row[3], "estado_anterior": row[4]}
            for row in results
        ]

        # Calculate percentages
        load_percentage = np.round(percentage_load(data), 2)
        noload_percentage = np.round(percentage_noload(data), 2)
        off_percentage = np.round(percentage_off(data), 2)

        return {
            "data": {
                "LOAD": load_percentage,
                "NOLOAD": noload_percentage,
                "OFF": off_percentage
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/week/shifts", tags=["weekly"])
def get_shifts(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        cursor.execute(
            "CALL semanaTurnosFP(%s, %s, %s)",
            (id_cliente, id_cliente, linea)
        )

        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data from procedure"}

        # Map the results (adjust columns)
        data = [
            {"fecha": row[1], "Turno": row[2], "kwhTurno": row[3], "TimestampInicio": row[4], "TimestampFin": row[5]}
            for row in results
        ]

        return {
            "data": data
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/week/summary-general", tags=["weekly"])
def get_weekly_summary_general(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        # Conectar a base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Ejecutar procedimiento
        cursor.execute("CALL semanaGeneralFP(%s,%s, %s)", (id_cliente, id_cliente, linea))
        results = cursor.fetchall()

        # Columnas esperadas
        columns = [
            "semana", "fecha", "kWh", "horas_trabajadas", "kWh_load", "horas_load",
            "kWh_noload", "horas_noload", "hp_equivalente", "conteo_ciclos", "promedio_ciclos_por_hora"
        ]

        cursor.close()
        conn.close()

        if not results:
            return {"error": "Sin datos en semanaGeneralFP"}

        # Mapear resultados a dict
        data = [dict(zip(columns, row)) for row in results]

        # Filtrar semana actual (semana == 0 y con kWh > 0)
        semana_actual = [d for d in data if d["semana"] == 0 and d["kWh"] > 0]
        detalle_semana = [d for d in data if d["semana"] == 0]  # Incluye días sin consumo también

        semanas_anteriores = [d for d in data if d["semana"] > 0 and d["kWh"] > 0]

        if not semana_actual:
            return {"error": "No hay datos con consumo en la semana actual"}

        # Calcular métricas semana actual
        total_kWh_semana_actual = sum(d["kWh"] for d in semana_actual)
        costo_semana_actual = costo_energia_usd(total_kWh_semana_actual)
        horas_trabajadas_semana_actual = sum(d["horas_trabajadas"] for d in semana_actual)
        promedio_ciclos_semana_actual = round(
            sum(d["promedio_ciclos_por_hora"] for d in semana_actual) / len(semana_actual), 2
        )
        promedio_hp_semana_actual = round(
            sum(d["hp_equivalente"] for d in semana_actual) / len(semana_actual), 2
        )

        # Calcular promedio de semanas anteriores
        if semanas_anteriores:
            kWh_anteriores = round(
                sum(d["kWh"] for d in semanas_anteriores) / len(semanas_anteriores)
            )
            horas_trabajadas_anteriores = round(
                sum(d["horas_trabajadas"] for d in semanas_anteriores) / len(semanas_anteriores)
            )
            promedio_kWh_anteriores = round(
                sum(d["kWh"] for d in semanas_anteriores) / len(semanas_anteriores), 2
            )
            promedio_costo_anteriores = costo_energia_usd(promedio_kWh_anteriores)
            promedio_ciclos_anteriores = round(
                sum(d["promedio_ciclos_por_hora"] for d in semanas_anteriores) / len(semanas_anteriores), 2
            )
            promedio_hp_anteriores = round(
                sum(d["hp_equivalente"] for d in semanas_anteriores) / len(semanas_anteriores), 2
            )
            promedio_horas_uso = round(
                sum(d["horas_trabajadas"] for d in semanas_anteriores) / len(semanas_anteriores), 2
            )
        else:
            promedio_kWh_anteriores = promedio_costo_anteriores = promedio_ciclos_anteriores = promedio_hp_anteriores = promedio_horas_uso = 0

        return {
            "semana_actual": {
                "total_kWh": round(total_kWh_semana_actual, 2),
                "costo_estimado": round(costo_semana_actual, 2),
                "promedio_ciclos_por_hora": round(promedio_ciclos_semana_actual, 0),
                "promedio_hp_equivalente": round(promedio_hp_semana_actual, 0),
                "horas_trabajadas": horas_trabajadas_semana_actual
            },
            "detalle_semana_actual": detalle_semana,
            "promedio_semanas_anteriores": {
                "total_kWh_anteriores": kWh_anteriores,
                "costo_estimado": round(promedio_costo_anteriores, 0),
                "promedio_ciclos_por_hora": round(promedio_ciclos_anteriores, 0),
                "promedio_hp_equivalente": round(promedio_hp_anteriores, 0),
                "horas_trabajadas": horas_trabajadas_anteriores,
                "promedio_horas_uso": round(promedio_horas_uso, 0)
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

# Static data endpoints
@report.get("/client-data", tags=["staticData"])
def get_client_data(id_cliente: int = Query(..., description="ID del cliente")):
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
        cursor.execute(f"SELECT numero_cliente, nombre_cliente, RFC, direccion FROM clientes WHERE id_cliente = {id_cliente}")
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

@report.get("/compressor-data", tags=["staticData"])
def get_compressor_data(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
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
        cursor.execute(f"SELECT hp, tipo, voltaje, marca, numero_serie, Alias, LOAD_NO_LOAD  FROM compresores WHERE id_cliente = %s and linea= %s", (id_cliente, linea))
        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified client."}

        # Convert results into a list of dictionaries
        data = [{"hp": row[0], "tipo": row[1], "voltaje": row[2], "marca": row[3], "numero_serie": row[4], "alias": row[5], "limite": row[6]} for row in results]

        return {
            "data": data
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/clients-data", tags=["staticData"])
def get_clients_data():
    try:
        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Fetch data from the clientes table
        cursor.execute("SELECT e.id_cliente, e.nombre_cliente, comp.linea, comp.Alias FROM envios e JOIN compresores comp ON e.id_cliente = comp.id_cliente WHERE e.Diario = 1;")
        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified client."}

        # Convert results into a list of dictionaries
        data = [{"id_cliente": row[0], "nombre_cliente": row[1], "linea": row[2], "alias": row[3]} for row in results]

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

def costo_energia_usd(kwh_total, usd_por_kwh=0.17):
    return round(float(kwh_total) * usd_por_kwh, 2)