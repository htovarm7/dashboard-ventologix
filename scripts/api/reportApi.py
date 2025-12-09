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
from statistics import mean, pstdev

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
report = APIRouter(prefix="/report", tags=["📊 Reports API"])

# Get database credentials from environment variables
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

# Daily endpoints
@report.get("/pie-data-proc", tags=["📅 Reportes Diarios"])
def get_pie_data_proc(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
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

@report.get("/line-data-proc", tags=["📅 Reportes Diarios"])
def get_line_data(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        
        # Conectar a la base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
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
  
@report.get("/daily-report-data", tags=["📅 Reportes Diarios"])
def get_daily_report(id_cliente: int = Query(..., description="ID del cliente"),
                     linea: str = Query(..., description="Línea del cliente")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
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
        
        while cursor.nextset():
            pass
        
        cursor.execute(
            "SELECT CostokWh FROM clientes WHERE id_cliente = %s",
            (id_cliente,)
        )
        usd_por_kwh = cursor.fetchone()
        
        hp_nominal = data[0] if data else 0

        usd_por_kwh = usd_por_kwh[0] if usd_por_kwh else 0.17
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
@report.get("/pie-data-proc-day", tags=["🗓️ Selector de Fechas"])
def get_pie_data_proc(id_cliente: int = Query(...), linea: str = Query(...), date: str = Query(...)):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST, user=DB_USER,
            password=DB_PASSWORD, database=DB_DATABASE
        )
        cursor = conn.cursor()

        # Ejecutar DFDFTest
        cursor.execute(
            "CALL DFDFTest(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, date)
        )

        # Primer resultset = TempConEstadoAnterior
        rows = cursor.fetchall()

        # Saltar al siguiente resultset (resumen)
        cursor.nextset()
        resumen = cursor.fetchone()

        # Consumir cualquier resultset extra
        while cursor.nextset():
            pass

        cursor.close()
        conn.close()

        if not rows:
            return {"error": "No data from DFDFTest"}

        # rows = row_id, time, corriente, estado, estado_anterior
        data = [
            {
                "time": r[1],
                "estado": r[3],
                "estado_anterior": r[4]
            }
            for r in rows
        ]

        load_percentage = np.round(percentage_load(data), 2)
        noload_percentage = np.round(percentage_noload(data), 2)
        off_percentage = np.round(percentage_off(data), 2)

        return {
            "data": {
                "LOAD": float(load_percentage),
                "NOLOAD": float(noload_percentage),
                "OFF": float(off_percentage)
            }
        }

    except Exception as err:
        return {"error": str(err)}

@report.get("/line-data-proc-day", tags=["🗓️ Selector de Fechas"])
def get_line_data(id_cliente: int = Query(...), linea: str = Query(...), date: str = Query(...)):

    try:
        conn = mysql.connector.connect(
            host=DB_HOST, user=DB_USER,
            password=DB_PASSWORD, database=DB_DATABASE
        )
        cursor = conn.cursor()

        # Ejecutar DFDFTest
        cursor.execute(
            "CALL DFDFTest(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, date)
        )

        # Primer resultset = TempConEstadoAnterior
        rows = cursor.fetchall()

        # Saltar al resultset resumen
        cursor.nextset()
        cursor.fetchone()

        # Limpiar resultsets restantes
        while cursor.nextset():
            pass

        cursor.close()
        conn.close()

        if not rows:
            return {"error": "No data in DFDFTest"}

        # rows = row_id, time, corriente, estado, estado_anterior
        data = [{"time": r[1], "corriente": r[2]} for r in rows]

        # Ordenar por time
        data.sort(key=lambda x: x["time"])

        # Agrupar por intervalos de 30s
        grouped_data = []
        temp_data = []
        start_time = data[0]["time"]

        for entry in data:
            if (entry["time"] - start_time) >= timedelta(seconds=30):
                avg_corr = round(np.mean([t["corriente"] for t in temp_data]), 2)
                grouped_data.append({
                    "time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
                    "corriente": avg_corr
                })
                temp_data = [entry]
                start_time = entry["time"]
            else:
                temp_data.append(entry)

        if temp_data:
            avg_corr = round(np.mean([t["corriente"] for t in temp_data]), 2)
            grouped_data.append({
                "time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
                "corriente": avg_corr
            })

        return {"data": grouped_data}

    except Exception as e:
        return {"error": str(e)}


@report.get("/day-report-data", tags=["🗓️ Selector de Fechas"])
def get_day_report(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente"), date: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
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
@report.get("/week/pie-data-proc", tags=["📆 Reportes Semanales"])
def get_pie_data_proc_weekly(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "call DataFiltradaWeek(%s, %s, %s)",
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

@report.get("/week/shifts", tags=["📆 Reportes Semanales"])
def get_shifts(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
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

@report.get("/week/summary-general", tags=["📆 Reportes Semanales"])
def get_weekly_summary_general(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        # Conectar a base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        # Ejecutar procedimiento
        cursor.execute("CALL semanaGeneralFP(%s,%s, %s)", (id_cliente, id_cliente, linea))
        results = cursor.fetchall()
        
        # Consumir todos los result sets pendientes (importante cuando se usan procedimientos almacenados)
        while cursor.nextset():
            pass

        cursor.execute("SELECT CostokWh FROM clientes WHERE id_cliente = %s", (id_cliente,))
        costo_kwh_result = cursor.fetchone()

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
        usd_por_kwh = float(costo_kwh_result[0]) if costo_kwh_result else 0.17
        costo_semana_actual = costo_energia_usd(total_kWh_semana_actual, usd_por_kwh)
        horas_trabajadas_semana_actual = sum(d["horas_trabajadas"] for d in semana_actual)
        promedio_ciclos_semana_actual = sum(d["promedio_ciclos_por_hora"] for d in semana_actual) / len(semana_actual)
        promedio_hp_semana_actual = sum(d["hp_equivalente"] for d in semana_actual) / len(semana_actual)

        # Calcular promedio de semanas anteriores
        if semanas_anteriores:
            kWh_anteriores = sum(d["kWh"] for d in semanas_anteriores) / len(semanas_anteriores)
            horas_trabajadas_anteriores = sum(d["horas_trabajadas"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_kWh_anteriores = sum(d["kWh"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_costo_anteriores = costo_energia_usd(promedio_kWh_anteriores, float(costo_kwh_result[0]) if costo_kwh_result else 0.17)
            promedio_ciclos_anteriores = sum(d["promedio_ciclos_por_hora"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_hp_anteriores = sum(d["hp_equivalente"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_horas_trabajadas = sum(d["horas_trabajadas"] for d in semanas_anteriores) / len(semanas_anteriores)
        else:
            kWh_anteriores = promedio_kWh_anteriores = promedio_costo_anteriores = promedio_ciclos_anteriores = promedio_hp_anteriores = promedio_horas_trabajadas = horas_trabajadas_anteriores= 0

        # Comparacion
        comparacion_kwh = (total_kWh_semana_actual / promedio_kWh_anteriores - 1) if promedio_kWh_anteriores else 0
        comparacion_costo = (costo_semana_actual / promedio_costo_anteriores - 1) if promedio_costo_anteriores else 0
        comparacion_ciclos = (promedio_ciclos_semana_actual / promedio_ciclos_anteriores - 1) if promedio_ciclos_anteriores else 0
        comparacion_hp = (promedio_hp_semana_actual / promedio_hp_anteriores - 1) if promedio_hp_anteriores else 0
        comparacion_horas = (horas_trabajadas_semana_actual / promedio_horas_trabajadas - 1) if promedio_horas_trabajadas else 0

        # Porcentajes de aumento o disminución (convertir a porcentaje)
        porcentaje_kwh = f"{comparacion_kwh * 100:+.2f}"
        porcentaje_costo = f"{comparacion_costo * 100:+.2f}"
        porcentaje_ciclos = f"{comparacion_ciclos * 100:+.2f}"
        porcentaje_hp = f"{comparacion_hp * 100:+.2f}"
        porcentaje_horas = f"{comparacion_horas * 100:+.2f}"

        # Análisis de cumplimiento
        dias_trabajados = [d for d in detalle_semana if (d["horas_load"] + d["horas_noload"]) > 0]
        dias_total = len(detalle_semana)
        dias_cumplen = [d for d in dias_trabajados if 0 < d["promedio_ciclos_por_hora"] <= 12]
        dias_superan_hp = [d for d in dias_trabajados if d["hp_equivalente"] > promedio_hp_anteriores]
        porcentaje_dias_cumplen = (len(dias_cumplen) / len(dias_trabajados)) * 100 if dias_trabajados else 0
        porcentaje_dias_superan = (len(dias_superan_hp) / len(dias_trabajados)) * 100 if dias_trabajados else 0

        # Análisis de picos
        consumos_diarios = [d["kWh"] for d in detalle_semana if d["kWh"] > 0]
        promedio_consumo_diario = mean(consumos_diarios) if consumos_diarios else 0
        desviacion_consumo_diario = pstdev(consumos_diarios) if len(consumos_diarios) > 1 else 0
        limite_superior = promedio_consumo_diario + 2 * desviacion_consumo_diario
        dias_con_picos = sum(1 for kwh in consumos_diarios if kwh > limite_superior)

        # Cálculo de eficiencia
        total_horas_load = sum(d["horas_load"] for d in semana_actual)
        total_horas_trabajadas = sum(d["horas_trabajadas"] for d in semana_actual)
        porcentaje_load = (total_horas_load / total_horas_trabajadas) * 100 if total_horas_trabajadas else 0

        comentario_kwh_picos = f"""
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        Durante la semana, el compresor consumió un total de <b>{total_kWh_semana_actual:.2f} kWh</b>,
        con un costo total de <b>{costo_semana_actual:.2f} USD</b> (a <b>{usd_por_kwh:.2f} por kWh</b>).
        </div>
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        {"Durante la semana, no se identificaron picos de consumo inusualmente altos."
        if dias_con_picos == 0 else
        f"Durante la semana se detectaron <b>{dias_con_picos}</b> días con picos de consumo inusualmente altos (más de dos desviaciones estándar sobre el promedio diario)."}
        </div>
        """

        comentario_ciclos = f"""
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        Durante la semana, se analizaron un total de <b>{len(dias_trabajados)}</b> días.
        De estos, <b>{len(dias_cumplen) if dias_cumplen else 'no se identificaron días'}</b>
        ({porcentaje_dias_cumplen:.2f}%) cumplieron con el rango ideal de ciclos por día (<b>menos de 12 ciclos</b>).
        Esto indica que el sistema cumple con el comportamiento óptimo en <b>{porcentaje_dias_cumplen:.2f}%</b> del tiempo.
        </div>
        """

        comentario_hp = f"""
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        Durante la semana, se analizó el comportamiento del consumo de HP. <b>
        {"No hubo días" if not dias_superan_hp else f"{len(dias_superan_hp)} días"}
        </b> en los que el consumo de HP del compresor superó el valor recomendado por CAGI.
        {f" Esto representa un <b>{porcentaje_dias_superan:.2f}%</b> de los días de la semana." if dias_superan_hp else ""}
        </div>
        """

        comentario_eficiencia = ""
        if porcentaje_load > 80:
            comentario_eficiencia = f"""
            <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
            Con base en el análisis, el tiempo en estado <b>LOAD</b> ha sido del <b>{porcentaje_load:.2f}%</b>,
            lo cual es superior al rango ideal de <b>70% - 80%</b>. Se recomienda reducir el tiempo en estado
            <b>LOAD</b> para evitar un uso excesivo del compresor y optimizar el consumo energético.
            </div>
            """
        elif porcentaje_load < 70:
            comentario_eficiencia = f"""
            <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
            Con base en el análisis, el tiempo en estado <b>LOAD</b> ha sido del <b>{porcentaje_load:.2f}%</b>,
            lo cual está por debajo del rango ideal de <b>70% - 80%</b>. Se recomienda incrementar el tiempo en estado
            <b>LOAD</b> para mejorar la eficiencia energética y reducir costos.
            </div>
            """
        else:
            comentario_eficiencia = f"""
            <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
            Con base en el análisis, el tiempo en estado <b>LOAD</b> ha sido del <b>{porcentaje_load:.2f}%</b>,
            lo cual está dentro del rango ideal de <b>70% - 80%</b>. Esto refleja un buen uso del compresor para mantener
            la eficiencia energética y controlar los costos.
            </div>
            """

        # HTML resumen dividido en secciones
        bloque_A = f"""
        <p>
        En la última semana, el consumo de energía del compresor fue <strong>{comparacion_kwh * 100:.1f}%</strong> {'mayor' if comparacion_kwh > 0 else 'menor'} que el promedio de las últimas 12 semanas.
        El promedio fue de <strong>{promedio_kWh_anteriores:.1f} kWh</strong> y en la última semana se consumieron <strong>{total_kWh_semana_actual:.2f} kWh</strong>.<br>
        Esto generó un costo de <strong>{costo_semana_actual:.2f} USD</strong>, lo que representa un <strong>{comparacion_costo * 100:.2f}%</strong> {'mayor' if comparacion_costo > 0 else 'menor'} que el promedio de <strong>{promedio_costo_anteriores:.2f} USD</strong>.
        </p>
        """

        bloque_B = f"""
        <p>
        En la última semana se realizaron <strong>{promedio_ciclos_semana_actual:.0f}</strong> ciclos, lo que es un <strong>{comparacion_ciclos * 100:.1f}%</strong> {'mayor' if comparacion_ciclos > 0 else 'menor'} respecto al promedio de <strong>{promedio_ciclos_anteriores:.0f}</strong> ciclos.
        Esto refleja la frecuencia de arranques y paros del compresor, afectando su eficiencia y desgaste.
        </p>
        """

        bloque_C = f"""
        <p>
        El HP Equivalente fue de <strong>{promedio_hp_semana_actual:.0f}</strong> en la última semana, lo que representa un <strong>{comparacion_hp * 100:.1f}%</strong> {'mayor' if comparacion_hp > 0 else 'menor'} que el promedio de <strong>{promedio_hp_anteriores:.0f}</strong> HP.
        Esto indica posibles cambios en la carga de trabajo o eficiencia operativa del compresor.
        </p>
        """

        bloque_D = f"""
        <p>
        El compresor trabajó <strong>{horas_trabajadas_semana_actual:.1f}</strong> horas la semana pasada, siendo un <strong>{comparacion_horas * 100:.1f}%</strong> {'más' if comparacion_horas > 0 else 'menos'} que el promedio de <strong>{promedio_horas_trabajadas:.1f}</strong> horas.
        Esto puede reflejar una variación en la demanda o en el patrón de operación.
        </p>
        """

        return {
            "semana_actual": {
                "total_kWh": round(total_kWh_semana_actual, 2),
                "costo_estimado": round(costo_semana_actual, 2),
                "promedio_ciclos_por_hora": round(promedio_ciclos_semana_actual, 0),
                "promedio_hp_equivalente": round(promedio_hp_semana_actual, 0),
                "horas_trabajadas": horas_trabajadas_semana_actual
            },
            "comparacion": {
                "bloque_A": bloque_A,
                "bloque_B": bloque_B,
                "bloque_C": bloque_C,
                "bloque_D": bloque_D,
                "porcentaje_kwh": porcentaje_kwh,
                "porcentaje_costo": porcentaje_costo,
                "porcentaje_ciclos": porcentaje_ciclos,
                "porcentaje_hp": porcentaje_hp,
                "porcentaje_horas": porcentaje_horas
            },
            "comentarios": {
                "comentario_A": comentario_kwh_picos,
                "comentario_B": comentario_ciclos,
                "comentario_C": comentario_hp,
                "comentario_D": comentario_eficiencia
            },
            "detalle_semana_actual": detalle_semana,
            "promedio_semanas_anteriores": {
                "total_kWh_anteriores": round(kWh_anteriores,0),
                "costo_estimado": round(promedio_costo_anteriores, 0),
                "promedio_ciclos_por_hora": round(promedio_ciclos_anteriores, 0),
                "promedio_hp_equivalente": round(promedio_hp_anteriores, 0),
                "horas_trabajadas_anteriores": round(horas_trabajadas_anteriores,2),
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

# Select Week Endpoints
@report.get("/dateWeek/pie-data-proc", tags=["🗓️ Selector de Semanas"])
def get_pie_data_proc_date_week(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Linea del cliente"), fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    try:
        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "call DataFiltradaWeekFecha(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, fecha)
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
    
@report.get("/dateWeek/shifts", tags=["🗓️ Selector de Semanas"])
def get_shifts_by_week(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente"), fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    try:
        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "CALL selectSemanaTurnosFP(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, fecha)
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

@report.get("/dateWeek/summary-general", tags=["🗓️ Selector de Semanas"])
def get_week_summary_general(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente"), fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    try:
        # Conectar a base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        # Ejecutar procedimiento y traer datos
        cursor.execute("CALL selectSemanaGeneralFP(%s,%s, %s, %s)", (id_cliente, id_cliente, linea, fecha))
        results = cursor.fetchall()

        while cursor.nextset():
            pass

        cursor.execute("SELECT CostokWh FROM clientes WHERE id_cliente = %s", (id_cliente,))
        costo_kwh_result = cursor.fetchone()

        columns = [
            "semana", "fecha", "kWh", "horas_trabajadas", "kWh_load", "horas_load",
            "kWh_noload", "horas_noload", "hp_equivalente", "conteo_ciclos", "promedio_ciclos_por_hora"
        ]

        cursor.close()
        conn.close()

        if not results:
            return {"error": "Sin datos en semanaGeneralFP"}

        data = [dict(zip(columns, row)) for row in results]

        # Encontrar el máximo valor de semana que representa la semana "actual" o la más reciente
        max_semana = max(d["semana"] for d in data)

        # Mapear las semanas para que la semana actual sea 0 y las anteriores negativas
        for d in data:
            d["semana"] = d["semana"] - max_semana  # Ahora la semana actual será 0

        # Ahora filtramos con la nueva lógica:
        semana_actual = [d for d in data if d["semana"] == 0 and d["kWh"] > 0]
        detalle_semana = [d for d in data if d["semana"] == 0]  # incluye días sin consumo también

        semanas_anteriores = [d for d in data if d["semana"] < 0 and d["kWh"] > 0]

        if not semana_actual:
            return {"error": "No hay datos con consumo en la semana actual"}

        # Calcular métricas semana actual
        total_kWh_semana_actual = sum(d["kWh"] for d in semana_actual)
        usd_por_kwh = float(costo_kwh_result[0]) if costo_kwh_result else 0.17
        costo_semana_actual = costo_energia_usd(total_kWh_semana_actual, usd_por_kwh)
        horas_trabajadas_semana_actual = sum(d["horas_trabajadas"] for d in semana_actual)
        promedio_ciclos_semana_actual = sum(d["promedio_ciclos_por_hora"] for d in semana_actual) / len(semana_actual)
        promedio_hp_semana_actual = sum(d["hp_equivalente"] for d in semana_actual) / len(semana_actual)

        # Calcular promedio de semanas anteriores
        if semanas_anteriores:
            kWh_anteriores = sum(d["kWh"] for d in semanas_anteriores) / len(semanas_anteriores)
            horas_trabajadas_anteriores = sum(d["horas_trabajadas"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_kWh_anteriores = sum(d["kWh"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_costo_anteriores = costo_energia_usd(promedio_kWh_anteriores, float(costo_kwh_result[0]) if costo_kwh_result else 0.17)
            promedio_ciclos_anteriores = sum(d["promedio_ciclos_por_hora"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_hp_anteriores = sum(d["hp_equivalente"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_horas_trabajadas = sum(d["horas_trabajadas"] for d in semanas_anteriores) / len(semanas_anteriores)
        else:
            kWh_anteriores = promedio_kWh_anteriores = promedio_costo_anteriores = promedio_ciclos_anteriores = promedio_hp_anteriores = promedio_horas_trabajadas = horas_trabajadas_anteriores= 0

        # Comparacion
        comparacion_kwh = (total_kWh_semana_actual / promedio_kWh_anteriores - 1) if promedio_kWh_anteriores else 0
        comparacion_costo = (costo_semana_actual / promedio_costo_anteriores - 1) if promedio_costo_anteriores else 0
        comparacion_ciclos = (promedio_ciclos_semana_actual / promedio_ciclos_anteriores - 1) if promedio_ciclos_anteriores else 0
        comparacion_hp = (promedio_hp_semana_actual / promedio_hp_anteriores - 1) if promedio_hp_anteriores else 0
        comparacion_horas = (horas_trabajadas_semana_actual / promedio_horas_trabajadas - 1) if promedio_horas_trabajadas else 0

        # Porcentajes de aumento o disminución (convertir a porcentaje)
        porcentaje_kwh = f"{comparacion_kwh * 100:+.2f}"
        porcentaje_costo = f"{comparacion_costo * 100:+.2f}"
        porcentaje_ciclos = f"{comparacion_ciclos * 100:+.2f}"
        porcentaje_hp = f"{comparacion_hp * 100:+.2f}"
        porcentaje_horas = f"{comparacion_horas * 100:+.2f}"

        # Análisis de cumplimiento
        dias_trabajados = [d for d in detalle_semana if (d["horas_load"] + d["horas_noload"]) > 0]
        dias_total = len(detalle_semana)
        dias_cumplen = [d for d in dias_trabajados if 0 < d["promedio_ciclos_por_hora"] <= 12]
        dias_superan_hp = [d for d in dias_trabajados if d["hp_equivalente"] > promedio_hp_anteriores]
        porcentaje_dias_cumplen = (len(dias_cumplen) / len(dias_trabajados)) * 100 if dias_trabajados else 0
        porcentaje_dias_superan = (len(dias_superan_hp) / len(dias_trabajados)) * 100 if dias_trabajados else 0

        # Análisis de picos
        consumos_diarios = [d["kWh"] for d in detalle_semana if d["kWh"] > 0]
        promedio_consumo_diario = mean(consumos_diarios) if consumos_diarios else 0
        desviacion_consumo_diario = pstdev(consumos_diarios) if len(consumos_diarios) > 1 else 0
        limite_superior = promedio_consumo_diario + 2 * desviacion_consumo_diario
        dias_con_picos = sum(1 for kwh in consumos_diarios if kwh > limite_superior)

        # Cálculo de eficiencia
        total_horas_load = sum(d["horas_load"] for d in semana_actual)
        total_horas_trabajadas = sum(d["horas_trabajadas"] for d in semana_actual)
        porcentaje_load = (total_horas_load / total_horas_trabajadas) * 100 if total_horas_trabajadas else 0

        comentario_kwh_picos = f"""
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        Durante la semana, el compresor consumió un total de <b>{total_kWh_semana_actual:.2f} kWh</b>,
        con un costo total de <b>{costo_semana_actual:.2f} USD</b> (a <b>{usd_por_kwh:.2f} por kWh</b>).
        </div>
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        {"Durante la semana, no se identificaron picos de consumo inusualmente altos."
        if dias_con_picos == 0 else
        f"Durante la semana se detectaron <b>{dias_con_picos}</b> días con picos de consumo inusualmente altos (más de dos desviaciones estándar sobre el promedio diario)."}
        </div>
        """

        comentario_ciclos = f"""
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        Durante la semana, se analizaron un total de <b>{len(dias_trabajados)}</b> días.
        De estos, <b>{len(dias_cumplen) if dias_cumplen else 'no se identificaron días'}</b>
        ({porcentaje_dias_cumplen:.2f}%) cumplieron con el rango ideal de ciclos por día (<b>menos de 12 ciclos</b>).
        Esto indica que el sistema cumple con el comportamiento óptimo en <b>{porcentaje_dias_cumplen:.2f}%</b> del tiempo.
        </div>
        """

        comentario_hp = f"""
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        Durante la semana, se analizó el comportamiento del consumo de HP. <b>
        {"No hubo días" if not dias_superan_hp else f"{len(dias_superan_hp)} días"}
        </b> en los que el consumo de HP del compresor superó el valor recomendado por CAGI.
        {f" Esto representa un <b>{porcentaje_dias_superan:.2f}%</b> de los días de la semana." if dias_superan_hp else ""}
        </div>
        """

        comentario_eficiencia = ""
        if porcentaje_load > 80:
            comentario_eficiencia = f"""
            <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
            Con base en el análisis, el tiempo en estado <b>LOAD</b> ha sido del <b>{porcentaje_load:.2f}%</b>,
            lo cual es superior al rango ideal de <b>70% - 80%</b>. Se recomienda reducir el tiempo en estado
            <b>LOAD</b> para evitar un uso excesivo del compresor y optimizar el consumo energético.
            </div>
            """
        elif porcentaje_load < 70:
            comentario_eficiencia = f"""
            <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
            Con base en el análisis, el tiempo en estado <b>LOAD</b> ha sido del <b>{porcentaje_load:.2f}%</b>,
            lo cual está por debajo del rango ideal de <b>70% - 80%</b>. Se recomienda incrementar el tiempo en estado
            <b>LOAD</b> para mejorar la eficiencia energética y reducir costos.
            </div>
            """
        else:
            comentario_eficiencia = f"""
            <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
            Con base en el análisis, el tiempo en estado <b>LOAD</b> ha sido del <b>{porcentaje_load:.2f}%</b>,
            lo cual está dentro del rango ideal de <b>70% - 80%</b>. Esto refleja un buen uso del compresor para mantener
            la eficiencia energética y controlar los costos.
            </div>
            """

        # HTML resumen dividido en secciones
        bloque_A = f"""
        <p>
        En la última semana, el consumo de energía del compresor fue <strong>{comparacion_kwh * 100:.1f}%</strong> {'mayor' if comparacion_kwh > 0 else 'menor'} que el promedio de las últimas 12 semanas.
        El promedio fue de <strong>{promedio_kWh_anteriores:.1f} kWh</strong> y en la última semana se consumieron <strong>{total_kWh_semana_actual:.2f} kWh</strong>.<br>
        Esto generó un costo de <strong>{costo_semana_actual:.2f} USD</strong>, lo que representa un <strong>{comparacion_costo * 100:.2f}%</strong> {'mayor' if comparacion_costo > 0 else 'menor'} que el promedio de <strong>{promedio_costo_anteriores:.2f} USD</strong>.
        </p>
        """

        bloque_B = f"""
        <p>
        En la última semana se realizaron <strong>{promedio_ciclos_semana_actual:.0f}</strong> ciclos, lo que es un <strong>{comparacion_ciclos * 100:.1f}%</strong> {'mayor' if comparacion_ciclos > 0 else 'menor'} respecto al promedio de <strong>{promedio_ciclos_anteriores:.0f}</strong> ciclos.
        Esto refleja la frecuencia de arranques y paros del compresor, afectando su eficiencia y desgaste.
        </p>
        """

        bloque_C = f"""
        <p>
        El HP Equivalente fue de <strong>{promedio_hp_semana_actual:.0f}</strong> en la última semana, lo que representa un <strong>{comparacion_hp * 100:.1f}%</strong> {'mayor' if comparacion_hp > 0 else 'menor'} que el promedio de <strong>{promedio_hp_anteriores:.0f}</strong> HP.
        Esto indica posibles cambios en la carga de trabajo o eficiencia operativa del compresor.
        </p>
        """

        bloque_D = f"""
        <p>
        El compresor trabajó <strong>{horas_trabajadas_semana_actual:.1f}</strong> horas la semana pasada, siendo un <strong>{comparacion_horas * 100:.1f}%</strong> {'más' if comparacion_horas > 0 else 'menos'} que el promedio de <strong>{promedio_horas_trabajadas:.1f}</strong> horas.
        Esto puede reflejar una variación en la demanda o en el patrón de operación.
        </p>
        """

        return {
            "semana_actual": {
                "total_kWh": round(total_kWh_semana_actual, 2),
                "costo_estimado": round(costo_semana_actual, 2),
                "promedio_ciclos_por_hora": round(promedio_ciclos_semana_actual, 0),
                "promedio_hp_equivalente": round(promedio_hp_semana_actual, 0),
                "horas_trabajadas": horas_trabajadas_semana_actual
            },
            "comparacion": {
                "bloque_A": bloque_A,
                "bloque_B": bloque_B,
                "bloque_C": bloque_C,
                "bloque_D": bloque_D,
                "porcentaje_kwh": porcentaje_kwh,
                "porcentaje_costo": porcentaje_costo,
                "porcentaje_ciclos": porcentaje_ciclos,
                "porcentaje_hp": porcentaje_hp,
                "porcentaje_horas": porcentaje_horas
            },
            "comentarios": {
                "comentario_A": comentario_kwh_picos,
                "comentario_B": comentario_ciclos,
                "comentario_C": comentario_hp,
                "comentario_D": comentario_eficiencia
            },
            "detalle_semana_actual": detalle_semana,
            "promedio_semanas_anteriores": {
                "total_kWh_anteriores": round(kWh_anteriores,0),
                "costo_estimado": round(promedio_costo_anteriores, 0),
                "promedio_ciclos_por_hora": round(promedio_ciclos_anteriores, 0),
                "promedio_hp_equivalente": round(promedio_hp_anteriores, 0),
                "horas_trabajadas_anteriores": round(horas_trabajadas_anteriores,2),
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

# Static data endpoints
@report.get("/client-data", tags=["📋 Datos Estáticos"])
def get_client_data(id_cliente: int = Query(..., description="ID del cliente")):
    try:
        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        # Fetch data from the clientes table for id_cliente 7
        cursor.execute(f"SELECT numero_cliente, nombre_cliente, RFC, direccion, CostokWh, demoDiario, demoSemanal FROM clientes WHERE id_cliente = {id_cliente}")
        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified client."}

        # Convert results into a list of dictionaries
        data = [{"numero_cliente": row[0], "nombre_cliente": row[1], "RFC": row[2], "direccion": row[3], "costoUSD": row[4], "demoDiario": row[5], "demoSemanal": row[6]} for row in results]

        return {
            "data": data
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/compressor-data", tags=["📋 Datos Estáticos"])
def get_compressor_data(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
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

@report.get("/clients-data", tags=["📋 Datos Estáticos"])
def get_clients_data():
    try:
        # Conectar a la base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        # Obtener clientes con envío diario
        cursor.execute("""
            SELECT e.id_cliente, e.nombre_cliente, comp.linea, comp.Alias
            FROM envios e
            JOIN compresores comp ON e.id_cliente = comp.id_cliente
            WHERE e.Diario = 1;
        """)
        diarios = cursor.fetchall()

        while cursor.nextset():
            pass

        # Obtener clientes con envío semanal
        cursor.execute("""
            SELECT e.id_cliente, e.nombre_cliente, comp.linea, comp.Alias
            FROM envios e
            JOIN compresores comp ON e.id_cliente = comp.id_cliente
            WHERE e.Semanal = 1;
        """)
        semanales = cursor.fetchall()

        # Cerrar conexión
        cursor.close()
        conn.close()

        # Convertir a listas de diccionarios
        data_diarios = [{"id_cliente": row[0], "nombre_cliente": row[1], "linea": row[2], "alias": row[3]} for row in diarios]
        data_semanales = [{"id_cliente": row[0], "nombre_cliente": row[1], "linea": row[2], "alias": row[3]} for row in semanales]

        return {
            "diarios": data_diarios,
            "semanales": data_semanales
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/all-clients", tags=["📋 Datos Estáticos"])
def get_all_clients_data():
    try:
        # Conectar a la base de datos
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        # Obtener clientes con envío diario
        cursor.execute("""
            SELECT e.id_cliente, e.nombre_cliente, comp.linea, comp.Alias
            FROM envios e
            JOIN compresores comp ON e.id_cliente = comp.id_cliente
        """)
        diarios = cursor.fetchall()

        while cursor.nextset():
            pass

        # Obtener clientes con envío semanal
        cursor.execute("""
            SELECT e.id_cliente, e.nombre_cliente, comp.linea, comp.Alias
            FROM envios e
            JOIN compresores comp ON e.id_cliente = comp.id_cliente
        """)
        semanales = cursor.fetchall()

        # Cerrar conexión
        cursor.close()
        conn.close()

        # Convertir a listas de diccionarios
        data_diarios = [{"id_cliente": row[0], "nombre_cliente": row[1], "linea": row[2], "alias": row[3]} for row in diarios]
        data_semanales = [{"id_cliente": row[0], "nombre_cliente": row[1], "linea": row[2], "alias": row[3]} for row in semanales]

        return {
            "diarios": data_diarios,
            "semanales": data_semanales
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

def costo_energia_usd(kwh_total, usd_por_kwh):
    try:
        kwh_total = float(kwh_total)
        return round(kwh_total * usd_por_kwh, 2)
    except (TypeError, ValueError) as e:
        print(f"Error en costo_energia_usd: {e}, kwh_total={kwh_total}")
        return 0.0