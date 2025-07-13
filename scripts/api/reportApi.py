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

@report.get("/comments-data", tags=["daily"])
def get_comments_data(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        cursor.execute(
            "call DataFiltradaDayFecha(%s, %s, %s, DATE_SUB(CURDATE(), INTERVAL 1 DAY))",
            (id_cliente, id_cliente, linea)
        )
        results = cursor.fetchall()

        if not results:
            return {"data": None, "message": "No data found."}

        data = [{"time": row[1], "estado": row[3]} for row in results]
        estados_no_off = [d for d in data if d["estado"] != "OFF"]

        if not estados_no_off:
            return {
                "data": {
                    "first_time": None,
                    "last_time": None,
                    "total_ciclos": 0,
                    "promedio_ciclos_hora": 0,
                    "comentario_ciclos": "El compresor permaneció apagado durante todo el día."
                }
            }

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
        if promedio_ciclos_hora >= 6 and promedio_ciclos_hora <= 15:
            comentario = "El promedio de ciclos por hora trabajada está dentro del rango recomendado de 6 a 15 ciclos/hora, por lo que parece estar funcionando correctamente."
        else:
            comentario = "El promedio de ciclos por hora trabajada está fuera del rango recomendado de 6 a 15 ciclos/hora. Se recomienda realizar un análisis en el compresor para identificar posibles anomalías."

        cursor.close()
        conn.close()

        return {
            "data": {
                "first_time": first_time,
                "last_time": last_time,
                "total_ciclos": ciclos,
                "promedio_ciclos_hora": promedio_ciclos_hora,
                "comentario_ciclos": comentario
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/stats-data", tags=["daily"])
def get_stats_data(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
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
        cursor.execute(
            "call DataFiltradaDayFecha(%s, %s, %s, DATE_SUB(CURDATE(), INTERVAL 1 DAY))",
            (id_cliente, id_cliente, linea)
        )
        results1 = cursor.fetchall()

        while cursor.nextset():
            pass

        # Consultar voltaje y HP
        cursor.execute(f"select hp, voltaje, timestamp from compresores where id_cliente = {id_cliente} and linea = '{linea}'")
        results2 = cursor.fetchall()

        # Cerrar recursos
        cursor.close()
        conn.close()

        if not results1 or not results2:
            return {"error": "No data found for the specified queries."}

        # Preparar datos
        data = [{"time": row[1], "corriente": row[2], "estado": row[3]} for row in results1]
        compresor_config = [{"hp": row[0], "voltage": row[1], "timestamp": row[2]} for row in results2]
        compresor_config = compresor_config[0]
        timestamp = compresor_config["timestamp"]

        # Calcular kWh y horas trabajadas
        kwh_total = energy_calculated(data, compresor_config,timestamp)
        horas_total = np.round(horas_trabajadas(data,timestamp),2)
        usd_por_kwh = 0.17  # aquí puedes parametrizarlo desde BD o env var
        costo_usd = costo_energia_usd(kwh_total, usd_por_kwh)
        hp_nominal = compresor_config["hp"]  # tomamos el hp del primer compresor
        hp_eq = hp_equivalente(data, compresor_config,timestamp)
        comentario_hp = comentario_hp_equivalente(hp_eq, hp_nominal) # Esta hardcodeado
        
        return {
            "data": {
                "kWh": float(kwh_total),
                "hours_worked": float(horas_total),
                "usd_cost": float(costo_usd),
                "hp_nominal": int(hp_nominal),
                "hp_equivalente": int(hp_eq),
                "comentario_hp_equivalente": comentario_hp
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}
    
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

@report.get("/comments-data-day", tags=["selectDate"])
def get_comments_data(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente"), date: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        cursor.execute(
            "call DataFiltradaDayFecha(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, date)
        )
        results = cursor.fetchall()

        if not results:
            return {"data": None, "message": "No data found."}

        data = [{"time": row[1], "estado": row[3]} for row in results]
        estados_no_off = [d for d in data if d["estado"] != "OFF"]

        if not estados_no_off:
            return {
                "data": {
                    "first_time": None,
                    "last_time": None,
                    "total_ciclos": 0,
                    "promedio_ciclos_hora": 0,
                    "comentario_ciclos": "El compresor permaneció apagado durante todo el día."
                }
            }

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
        if promedio_ciclos_hora >= 6 and promedio_ciclos_hora <= 15:
            comentario = "El promedio de ciclos por hora trabajada está dentro del rango recomendado de 6 a 15 ciclos/hora, por lo que parece estar funcionando correctamente."
        else:
            comentario = "El promedio de ciclos por hora trabajada está fuera del rango recomendado de 6 a 15 ciclos/hora. Se recomienda realizar un análisis en el compresor para identificar posibles anomalías."

        cursor.close()
        conn.close()

        return {
            "data": {
                "first_time": first_time,
                "last_time": last_time,
                "total_ciclos": ciclos,
                "promedio_ciclos_hora": promedio_ciclos_hora,
                "comentario_ciclos": comentario
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/stats-data-day", tags=["selectDate"])
def get_stats_data(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente"), date: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
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
        cursor.execute(
            "call DataFiltradaDayFecha(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, date)
        )
        results1 = cursor.fetchall()

        while cursor.nextset():
            pass

        # Consultar voltaje y HP
        cursor.execute(f"select hp, voltaje, timestamp from compresores where id_cliente = {id_cliente} and linea = '{linea}'")
        results2 = cursor.fetchall()

        # Cerrar recursos
        cursor.close()
        conn.close()

        if not results1 or not results2:
            return {"error": "No data found for the specified queries."}

        # Preparar datos
        data = [{"time": row[1], "corriente": row[2], "estado": row[3]} for row in results1]
        compresor_config = [{"hp": row[0], "voltage": row[1], "timestamp": row[2]} for row in results2]
        compresor_config = compresor_config[0]
        timestamp = compresor_config["timestamp"]

        # Calcular kWh y horas trabajadas
        kwh_total = energy_calculated(data, compresor_config,timestamp)
        horas_total = np.round(horas_trabajadas(data,timestamp),2)
        usd_por_kwh = 0.17  # aquí puedes parametrizarlo desde BD o env var
        costo_usd = costo_energia_usd(kwh_total, usd_por_kwh)
        hp_nominal = compresor_config["hp"]  # tomamos el hp del primer compresor
        hp_eq = hp_equivalente(data, compresor_config,timestamp)
        comentario_hp = comentario_hp_equivalente(hp_eq, hp_nominal) # Esta hardcodeado

        return {
            "data": {
                "kWh": float(kwh_total),
                "hours_worked": float(horas_total),
                "usd_cost": float(costo_usd),
                "hp_nominal": int(hp_nominal),
                "hp_equivalente": int(hp_eq),
                "comentario_hp_equivalente": comentario_hp
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

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
def get_weekly_summary_general(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente") ):
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
        cursor.execute("CALL semanaGeneralFP(%s, %s)", (id_cliente, linea))
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

        # Semana actual (semana 0)
        semana_actual = [d for d in data if d["semana"] == 0 and d["kWh"] > 0]
        semanas_anteriores = [d for d in data if d["semana"] > 0 and d["kWh"] > 0]

        if not semana_actual:
            return {"error": "No hay datos con consumo en la semana actual"}

        # Calcular métricas semana actual
        total_kWh_semana_actual = sum(d["kWh"] for d in semana_actual) / len(semanas_anteriores)
        costo_semana_actual = costo_energia_usd(total_kWh_semana_actual)
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
        else:
            promedio_kWh_anteriores = promedio_costo_anteriores = promedio_ciclos_anteriores = promedio_hp_anteriores = 0

        return {
            "semana_actual": {
                "total_kWh": total_kWh_semana_actual,
                "costo_estimado": round(costo_semana_actual, 2),
                "promedio_ciclos_por_hora": promedio_ciclos_semana_actual,
                "promedio_hp_equivalente": promedio_hp_semana_actual
            },
            "promedio_semanas_anteriores": {
                "total_kWh_anteriores": kWh_anteriores,
                "costo_estimado": round(promedio_costo_anteriores, 2),
                "promedio_ciclos_por_hora": promedio_ciclos_anteriores,
                "promedio_hp_equivalente": promedio_hp_anteriores
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/week/byDayDataHoras", tags=["weekly"])
def get_byDayDataHoras(id_cliente: int = Query(...), linea: str = Query(...)):
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
        cursor.execute("CALL semanaTurnosFP(%s, %s, %s)", (id_cliente, id_cliente, linea))
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        if not results:
            return {"error": "Sin datos en semanaTurnosFP"}

        # Mapear resultados a dict
        columns = ['id', 'fecha', 'turno', 'kwh', 'hora_inicio', 'hora_fin']
        data = [dict(zip(columns, row)) for row in results]

        # Sumar kWh y horas por día
        suma_por_dia = {}
        for item in data:
            fecha = item['fecha']
            kwh = float(item['kwh'])
            horas = (item['hora_fin'] - item['hora_inicio']).total_seconds() / 3600

            if fecha not in suma_por_dia:
                suma_por_dia[fecha] = {'total_kWh': 0.0, 'total_horas': 0.0}

            suma_por_dia[fecha]['total_kWh'] += kwh
            suma_por_dia[fecha]['total_horas'] += horas

        # Convertir a lista de diccionarios para la respuesta
        response_data = [
            {
                "fecha": fecha,
                "total_kWh": round(val['total_kWh'], 2),
                "total_horas": round(val['total_horas'], 2)
            }
            for fecha, val in suma_por_dia.items()
        ]

        return {"data": response_data}

    except Exception as e:
        return {"error": str(e)}

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

def energy_calculated(data, compresor_data, timestamp):
    if not data:
        return 0

    # Calcular segundos entre registros
    if len(data) > 1:
        segundos_por_registro = (data[1]['time'] - data[0]['time']).total_seconds()
    else:
        segundos_por_registro = 10  # Valor por defecto

    voltaje = compresor_data["voltage"]
    tiempo_horas = segundos_por_registro / 3600

    energia_calculada = 0
    for record in data:
        corriente = record['corriente']
        estado = record['estado']

        if corriente > 0:
            # Factor de potencia según estado
            if estado == "LOAD":
                fp = 0.85
            elif estado == "NOLOAD":
                fp = 0.6
            else:
                fp = None  # o seguir con None y no sumar energía

            if fp is not None:
                potencia_kw = corriente * 1.732 * voltaje * fp / 1000
                energia_calculada += potencia_kw * tiempo_horas

    return round(energia_calculada, 3)

def horas_trabajadas(data, timestamp):
    if not data:
        return 0
        
    # Calcular segundos entre registros
    if len(data) > 1:
        segundos_por_registro = (data[1]['time'] - data[0]['time']).total_seconds()
    else:
        segundos_por_registro = 10  # Valor por defecto
    
    registros_no_off = [record for record in data if record['estado'] != "OFF"]
    if not registros_no_off:
        return 0
        
    total_registros_no_off = len(registros_no_off)
    total_segundos = total_registros_no_off * segundos_por_registro
    return round(total_segundos / 3600, 2)

def costo_energia_usd(kwh_total, usd_por_kwh=0.17):
    return round(float(kwh_total) * usd_por_kwh, 2)

def hp_equivalente(data, compresor_config, timestamp):
    if not data:
        return 0
        
    # Calcular segundos entre registros
    if len(data) > 1:
        segundos_por_registro = (data[1]['time'] - data[0]['time']).total_seconds()
    else:
        segundos_por_registro = 10  # Valor por defecto
        
    voltaje = compresor_config["voltage"]
    factor_seguridad = 1.4
    factor_conversion = 0.7457  # kW a HP

    # Filtrar registros con estado LOAD
    data_load = [row for row in data if row["estado"] == "LOAD"]
    if not data_load:
        return 0

    # Calcular kWh total solo en estado LOAD
    tiempo_horas = segundos_por_registro / 3600
    total_kwh = sum(
        (1.732 * row["corriente"] * voltaje * tiempo_horas) / 1000
        for row in data_load
    )

    # Calcular total de horas trabajadas (solo LOAD)
    total_horas_load = len(data_load) * tiempo_horas
    if total_horas_load == 0:
        return 0

    hp_equivalente = round((total_kwh / total_horas_load) / factor_conversion * factor_seguridad, 0)
    return hp_equivalente

def comentario_hp_equivalente(hp_eq, hp_nominal):
    if hp_nominal == 0:
        return "No se tiene configurado el HP nominal del compresor."

    if hp_nominal * 0.9 <= hp_eq <= hp_nominal * 1.1:
        return (
            "El HP Equivalente está dentro del 10% de diferencia del HP nominal del compresor, lo que indica que está operando de manera óptima."
        )
    elif hp_eq > hp_nominal * 1.1:
        return (
            "El HP Equivalente es mayor que el HP nominal del compresor, lo que sugiere que el compresor podría estar forzado. Se recomienda revisar su operación."
        )
    else:
        return (
            "El HP Equivalente es mucho menor que el HP nominal del compresor, lo que sugiere que la demanda podría aumentarse para mejorar la eficiencia."
        )