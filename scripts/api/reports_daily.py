"""
Endpoints de reportes diarios y selector de fechas
"""
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from datetime import timedelta
import numpy as np

from .db_utils import get_db_connection, percentage_load, percentage_noload, percentage_off


reports_daily = APIRouter(prefix="/report", tags=["📅 Reportes Diarios"])


@reports_daily.get("/pie-data-proc", tags=["📅 Reportes Diarios"])
def get_pie_data_proc(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Línea del cliente")
):
    """Obtiene datos de pie chart para el día anterior"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "call DataFiltradaDayFecha(%s, %s, %s, DATE_SUB(CURDATE(), INTERVAL 1 DAY))",
            (id_cliente, id_cliente, linea)
        )

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data from procedure"}

        data = [
            {"time": row[1], "estado": row[3], "estado_anterior": row[4]}
            for row in results
        ]

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

    except Exception as err:
        return {"error": str(err)}


@reports_daily.get("/line-data-proc", tags=["📅 Reportes Diarios"])
def get_line_data(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Línea del cliente")
):
    """Obtiene datos de línea de corriente para el día anterior"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "call DataFiltradaDayFecha(%s, %s, %s, DATE_SUB(CURDATE(), INTERVAL 1 DAY))",
            (id_cliente, id_cliente, linea)
        )
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified date."}

        data = [{"time": row[1], "corriente": row[2]} for row in results]
        data.sort(key=lambda x: x["time"])

        grouped_data = []
        temp_data = []
        start_time = data[0]["time"]

        for entry in data:
            if (entry["time"] - start_time) >= timedelta(seconds=30):
                if temp_data:
                    avg_corriente = np.round(np.mean([item["corriente"] for item in temp_data]), 2)
                    grouped_data.append({
                        "time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
                        "corriente": avg_corriente
                    })
                temp_data = [entry]
                start_time = entry["time"]
            else:
                temp_data.append(entry)

        if temp_data:
            avg_corriente = np.round(np.mean([item["corriente"] for item in temp_data]), 2)
            grouped_data.append({
                "time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
                "corriente": avg_corriente
            })

        return JSONResponse(content={"data": grouped_data})

    except Exception as e:
        return JSONResponse(content={"error": str(e)})


@reports_daily.get("/daily-report-data", tags=["📅 Reportes Diarios"])
def get_daily_report(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Línea del cliente")
):
    """Obtiene resumen del reporte diario para el día anterior"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "CALL DFDFTest(%s, %s, %s, DATE_SUB(CURDATE(), INTERVAL 1 DAY))",
            (id_cliente, id_cliente, linea)
        )

        cursor.fetchall()
        cursor.nextset()
        result = cursor.fetchone()

        if not result:
            return {"data": None, "message": "Sin datos para ese día"}

        (fecha, inicio, fin, horas_trab, kWh, horas_load, horas_noload,
         hp_equivalente, ciclos, prom_ciclos_hora) = result

        while cursor.nextset():
            pass

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

        if 6 <= prom_ciclos_hora <= 15:
            comentario_ciclos = "El promedio de ciclos por hora trabajada está dentro del rango recomendado de 6 a 15 ciclos/hora."
        else:
            comentario_ciclos = "El promedio de ciclos por hora trabajada está fuera del rango recomendado. Se recomienda revisar el compresor."

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

    except Exception as e:
        return {"error": f"Error inesperado: {str(e)}"}


# Selector de Fechas
@reports_daily.get("/pie-data-proc-day", tags=["🗓️ Selector de Fechas"])
def get_pie_data_proc_day(
    id_cliente: int = Query(...),
    linea: str = Query(...),
    date: str = Query(...)
):
    """Obtiene datos de pie chart para una fecha específica"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "CALL DFDFTest(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, date)
        )

        rows = cursor.fetchall()
        cursor.nextset()
        cursor.fetchone()

        while cursor.nextset():
            pass

        cursor.close()
        conn.close()

        if not rows:
            return {"error": "No data from DFDFTest"}

        data = [
            {"time": r[1], "estado": r[3], "estado_anterior": r[4]}
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


@reports_daily.get("/line-data-proc-day", tags=["🗓️ Selector de Fechas"])
def get_line_data_day(
    id_cliente: int = Query(...),
    linea: str = Query(...),
    date: str = Query(...)
):
    """Obtiene datos de línea de corriente para una fecha específica"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "CALL DFDFTest(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, date)
        )

        rows = cursor.fetchall()
        cursor.nextset()
        cursor.fetchone()

        while cursor.nextset():
            pass

        cursor.close()
        conn.close()

        if not rows:
            return {"error": "No data in DFDFTest"}

        data = [{"time": r[1], "corriente": r[2]} for r in rows]
        data.sort(key=lambda x: x["time"])

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


@reports_daily.get("/day-report-data", tags=["🗓️ Selector de Fechas"])
def get_day_report(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Línea del cliente"),
    date: str = Query(..., description="Fecha en formato YYYY-MM-DD")
):
    """Obtiene resumen del reporte para una fecha específica"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "CALL DFDFTest(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, date)
        )

        cursor.fetchall()
        cursor.nextset()
        result = cursor.fetchone()

        if not result:
            return {"data": None, "message": "Sin datos para ese día"}

        (fecha, inicio, fin, horas_trab, kWh, horas_load, horas_noload,
         hp_equivalente, ciclos, prom_ciclos_hora) = result

        while cursor.nextset():
            pass

        cursor.execute(
            "SELECT hp, voltaje FROM compresores WHERE id_cliente = %s AND linea = %s LIMIT 1",
            (id_cliente, linea)
        )
        data = cursor.fetchone()
        hp_nominal = data[0] if data else 0

        usd_por_kwh = 0.17
        costo_usd = round(float(kWh) * usd_por_kwh, 2)

        if 6 <= prom_ciclos_hora <= 15:
            comentario_ciclos = "El promedio de ciclos por hora trabajada está dentro del rango recomendado de 6 a 15 ciclos/hora."
        else:
            comentario_ciclos = "El promedio de ciclos por hora trabajada está fuera del rango recomendado. Se recomienda revisar el compresor."

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

    except Exception as e:
        return {"error": f"Error inesperado: {str(e)}"}
