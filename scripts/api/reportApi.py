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

# Load environment variables
load_dotenv()

# Create FastAPI instance
report = APIRouter(prefix="/report", tags=["report"])

# Get database credentials from environment variables
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

@report.get("/pie-data-proc")
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
        cursor.execute(f"call DataFiltradaDayFecha({id_cliente},{id_cliente},{linea},CURDATE())")

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

@report.get("/line-data-proc")
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
        cursor.execute(f"call DataFiltradaDayFecha({id_cliente},{id_cliente},{linea},CURDATE())")
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
                    grouped_data.reportend({
                        "time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
                        "corriente": avg_corriente
                    })
                # Resetear el grupo y actualizar el tiempo de inicio
                temp_data = [entry]
                start_time = entry["time"]
            else:
                temp_data.reportend(entry)
        
        # Para el último grupo
        if temp_data:
            avg_corriente = np.round(np.mean([item["corriente"] for item in temp_data]), 2)
            grouped_data.reportend({
                "time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
                "corriente": avg_corriente
            })

        # Devolver los datos agrupados
        return JSONResponse(content={"data": grouped_data})

    except Exception as e:
        return JSONResponse(content={"error": str(e)})

@report.get("/comments-data")
def get_comments_data(id_cliente: int = Query(..., description="ID del cliente"), linea: str = Query(..., description="Línea del cliente")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        cursor.execute(f"call DataFiltradaDayFecha({id_cliente},{id_cliente},{linea},CURDATE())")
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

# These remains the same as before
@report.get("/stats-data")
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
        cursor.execute(f"call DataFiltradaDayFecha({id_cliente},{id_cliente},{linea},CURDATE())")
        results1 = cursor.fetchall()

        while cursor.nextset():
            pass

        # Consultar voltaje y HP
        cursor.execute(f"select hp, voltaje from compresores where id_cliente = {id_cliente}")
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
        hp_eq = hp_equivalente(data, compresor_config)
        comentario_hp = comentario_hp_equivalente(hp_eq, 50) # Esta hardcodeado

        return {
            "data": {
                "kWh": kwh_total,
                "hours_worked": horas_total,
                "usd_cost": costo_usd,
                "hp_equivalente": hp_eq,
                "comentario_hp_equivalente": comentario_hp
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/client-data")
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

@report.get("/compressor-data")
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
        cursor.execute(f"SELECT hp, tipo, voltaje, marca, numero_serie FROM compresores WHERE id_cliente = {id_cliente} and linea= {linea}")
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

@report.get("/emails-data")
def get_emails_data(id_cliente: int = Query(..., description="ID del cliente")):
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
        cursor.execute(f"SELECT i.Correo, comp.Alias, comp.linea FROM Ingenieros i JOIN clientes c ON i.id_cliente = c.id_cliente JOIN compresores comp ON c.id_cliente = comp.id_cliente WHERE c.id_cliente = {id_cliente}")
        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified client."}

        # Convert results into a list of dictionaries
        data = [{"correo": row[0], "Alias": row[1], "Linea": row[2]} for row in results]

        return {
            "data": data
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}

@report.get("/clients-data")
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
        cursor.execute("SELECT c.id_cliente, c.nombre_cliente, comp.linea FROM clientes c JOIN compresores comp ON c.id_cliente = comp.id_cliente WHERE c.id_cliente NOT IN (2, 5, 6);")
        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified client."}

        # Convert results into a list of dictionaries
        data = [{"id_cliente": row[0], "nombre_cliente": row[1], "linea": row[2]} for row in results]

        return {
            "data": data
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}
    
class PDFRequest(BaseModel):
    cliente: str
    fecha: str

@report.post("/api/generar_pdf")
def generar_pdf(request: PDFRequest):
    pdf_path = f"pdfs/{request.cliente}_{request.fecha}.pdf"

    # Crear carpeta si no existe
    os.makedirs("pdfs", exist_ok=True)

    # Generar PDF con ReportLab
    c = canvas.Canvas(pdf_path)
    c.drawString(100, 750, f"Reporte de {request.cliente}")
    c.drawString(100, 730, f"Fecha del reporte: {request.fecha}")
    c.save()

    return {"status": "ok", "pdf_path": pdf_path}

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

def hp_equivalente(data, compresor_config, segundos_por_registro=10):
    voltaje = compresor_config[0]["voltage"]  # tomamos el voltaje del primer compresor
    factor_seguridad = 1.4
    factor_conversion = 0.7457  # kW a HP

    # Filtrar registros con estado LOAD
    data_load = [row for row in data if row["estado"] == "LOAD"]

    if not data_load:
        return 0

    # Calcular kWh total solo en estado LOAD
    total_kwh = sum(
        (1.732 * row["corriente"] * voltaje * (segundos_por_registro / 3600)) / 1000
        for row in data_load
    )

    # Calcular total de horas trabajadas
    total_horas = len(data) * (segundos_por_registro / 3600)

    if total_horas == 0:
        return 0

    hp_equivalente = round((total_kwh / total_horas) / factor_conversion * factor_seguridad, 0)
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
