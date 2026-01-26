"""
Endpoints de reportes semanales y selector de semanas
"""
from fastapi import APIRouter, Query
import numpy as np
from statistics import mean, pstdev

from .db_utils import get_db_connection, percentage_load, percentage_noload, percentage_off, costo_energia_usd


reports_weekly = APIRouter(prefix="/report", tags=["📆 Reportes Semanales"])


@reports_weekly.get("/week/pie-data-proc", tags=["📆 Reportes Semanales"])
def get_pie_data_proc_weekly(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Línea del cliente")
):
    """Obtiene datos de pie chart semanal"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "call DataFiltradaWeek(%s, %s, %s)",
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


@reports_weekly.get("/week/shifts", tags=["📆 Reportes Semanales"])
def get_shifts(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Línea del cliente")
):
    """Obtiene turnos de trabajo semanales"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "CALL semanaTurnosFP(%s, %s, %s)",
            (id_cliente, id_cliente, linea)
        )

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data from procedure"}

        data = [
            {"fecha": row[1], "Turno": row[2], "kwhTurno": row[3], "TimestampInicio": row[4], "TimestampFin": row[5]}
            for row in results
        ]

        return {"data": data}

    except Exception as err:
        return {"error": str(err)}


@reports_weekly.get("/week/summary-general", tags=["📆 Reportes Semanales"])
def get_weekly_summary_general(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Línea del cliente")
):
    """Obtiene resumen general semanal con análisis completo"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("CALL semanaGeneralFP(%s,%s, %s)", (id_cliente, id_cliente, linea))
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

        semana_actual = [d for d in data if d["semana"] == 0 and d["kWh"] > 0]
        detalle_semana = [d for d in data if d["semana"] == 0]
        semanas_anteriores = [d for d in data if d["semana"] > 0 and d["kWh"] > 0]

        if not semana_actual:
            return {"error": "No hay datos con consumo en la semana actual"}

        total_kWh_semana_actual = sum(d["kWh"] for d in semana_actual)
        usd_por_kwh = float(costo_kwh_result[0]) if costo_kwh_result else 0.17
        costo_semana_actual = costo_energia_usd(total_kWh_semana_actual, usd_por_kwh)
        horas_trabajadas_semana_actual = sum(d["horas_trabajadas"] for d in semana_actual)
        promedio_ciclos_semana_actual = sum(d["promedio_ciclos_por_hora"] for d in semana_actual) / len(semana_actual)
        promedio_hp_semana_actual = sum(d["hp_equivalente"] for d in semana_actual) / len(semana_actual)

        if semanas_anteriores:
            kWh_anteriores = sum(d["kWh"] for d in semanas_anteriores) / len(semanas_anteriores)
            horas_trabajadas_anteriores = sum(d["horas_trabajadas"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_kWh_anteriores = sum(d["kWh"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_costo_anteriores = costo_energia_usd(promedio_kWh_anteriores, usd_por_kwh)
            promedio_ciclos_anteriores = sum(d["promedio_ciclos_por_hora"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_hp_anteriores = sum(d["hp_equivalente"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_horas_trabajadas = sum(d["horas_trabajadas"] for d in semanas_anteriores) / len(semanas_anteriores)
        else:
            kWh_anteriores = promedio_kWh_anteriores = promedio_costo_anteriores = 0
            promedio_ciclos_anteriores = promedio_hp_anteriores = promedio_horas_trabajadas = horas_trabajadas_anteriores = 0

        comparacion_kwh = (total_kWh_semana_actual / promedio_kWh_anteriores - 1) if promedio_kWh_anteriores else 0
        comparacion_costo = (costo_semana_actual / promedio_costo_anteriores - 1) if promedio_costo_anteriores else 0
        comparacion_ciclos = (promedio_ciclos_semana_actual / promedio_ciclos_anteriores - 1) if promedio_ciclos_anteriores else 0
        comparacion_hp = (promedio_hp_semana_actual / promedio_hp_anteriores - 1) if promedio_hp_anteriores else 0
        comparacion_horas = (horas_trabajadas_semana_actual / promedio_horas_trabajadas - 1) if promedio_horas_trabajadas else 0

        porcentaje_kwh = f"{comparacion_kwh * 100:+.2f}"
        porcentaje_costo = f"{comparacion_costo * 100:+.2f}"
        porcentaje_ciclos = f"{comparacion_ciclos * 100:+.2f}"
        porcentaje_hp = f"{comparacion_hp * 100:+.2f}"
        porcentaje_horas = f"{comparacion_horas * 100:+.2f}"

        dias_trabajados = [d for d in detalle_semana if (d["horas_load"] + d["horas_noload"]) > 0]
        dias_cumplen = [d for d in dias_trabajados if 0 < d["promedio_ciclos_por_hora"] <= 12]
        dias_superan_hp = [d for d in dias_trabajados if d["hp_equivalente"] > promedio_hp_anteriores]
        porcentaje_dias_cumplen = (len(dias_cumplen) / len(dias_trabajados)) * 100 if dias_trabajados else 0
        porcentaje_dias_superan = (len(dias_superan_hp) / len(dias_trabajados)) * 100 if dias_trabajados else 0

        consumos_diarios = [d["kWh"] for d in detalle_semana if d["kWh"] > 0]
        promedio_consumo_diario = mean(consumos_diarios) if consumos_diarios else 0
        desviacion_consumo_diario = pstdev(consumos_diarios) if len(consumos_diarios) > 1 else 0
        limite_superior = promedio_consumo_diario + 2 * desviacion_consumo_diario
        dias_con_picos = sum(1 for kwh in consumos_diarios if kwh > limite_superior)

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
        f"Durante la semana se detectaron <b>{dias_con_picos}</b> días con picos de consumo inusualmente altos."}
        </div>
        """

        comentario_ciclos = f"""
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        Durante la semana, se analizaron un total de <b>{len(dias_trabajados)}</b> días.
        De estos, <b>{len(dias_cumplen) if dias_cumplen else 'no se identificaron días'}</b>
        ({porcentaje_dias_cumplen:.2f}%) cumplieron con el rango ideal de ciclos por día (<b>menos de 12 ciclos</b>).
        </div>
        """

        comentario_hp = f"""
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        Durante la semana, se analizó el comportamiento del consumo de HP. <b>
        {"No hubo días" if not dias_superan_hp else f"{len(dias_superan_hp)} días"}
        </b> en los que el consumo de HP del compresor superó el valor recomendado por CAGI.
        </div>
        """

        if porcentaje_load > 80:
            comentario_eficiencia = f"""
            <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
            El tiempo en estado <b>LOAD</b> ha sido del <b>{porcentaje_load:.2f}%</b>,
            superior al rango ideal de <b>70% - 80%</b>. Se recomienda reducir el tiempo en estado LOAD.
            </div>
            """
        elif porcentaje_load < 70:
            comentario_eficiencia = f"""
            <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
            El tiempo en estado <b>LOAD</b> ha sido del <b>{porcentaje_load:.2f}%</b>,
            por debajo del rango ideal de <b>70% - 80%</b>. Se recomienda incrementar el tiempo en estado LOAD.
            </div>
            """
        else:
            comentario_eficiencia = f"""
            <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
            El tiempo en estado <b>LOAD</b> ha sido del <b>{porcentaje_load:.2f}%</b>,
            dentro del rango ideal de <b>70% - 80%</b>.
            </div>
            """

        bloque_A = f"""
        <p>
        En la última semana, el consumo de energía fue <strong>{comparacion_kwh * 100:.1f}%</strong> {'mayor' if comparacion_kwh > 0 else 'menor'} que el promedio.
        El promedio fue de <strong>{promedio_kWh_anteriores:.1f} kWh</strong> y en la última semana se consumieron <strong>{total_kWh_semana_actual:.2f} kWh</strong>.
        </p>
        """

        bloque_B = f"""
        <p>
        En la última semana se realizaron <strong>{promedio_ciclos_semana_actual:.0f}</strong> ciclos, un <strong>{comparacion_ciclos * 100:.1f}%</strong> {'mayor' if comparacion_ciclos > 0 else 'menor'} respecto al promedio.
        </p>
        """

        bloque_C = f"""
        <p>
        El HP Equivalente fue de <strong>{promedio_hp_semana_actual:.0f}</strong>, un <strong>{comparacion_hp * 100:.1f}%</strong> {'mayor' if comparacion_hp > 0 else 'menor'} que el promedio.
        </p>
        """

        bloque_D = f"""
        <p>
        El compresor trabajó <strong>{horas_trabajadas_semana_actual:.1f}</strong> horas, un <strong>{comparacion_horas * 100:.1f}%</strong> {'más' if comparacion_horas > 0 else 'menos'} que el promedio.
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
                "total_kWh_anteriores": round(kWh_anteriores, 0),
                "costo_estimado": round(promedio_costo_anteriores, 0),
                "promedio_ciclos_por_hora": round(promedio_ciclos_anteriores, 0),
                "promedio_hp_equivalente": round(promedio_hp_anteriores, 0),
                "horas_trabajadas_anteriores": round(horas_trabajadas_anteriores, 2),
            }
        }

    except Exception as err:
        return {"error": str(err)}


# Selector de Semanas
@reports_weekly.get("/dateWeek/pie-data-proc", tags=["🗓️ Selector de Semanas"])
def get_pie_data_proc_date_week(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Linea del cliente"),
    fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")
):
    """Obtiene datos de pie chart para una semana específica"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "call DataFiltradaWeekFecha(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, fecha)
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


@reports_weekly.get("/dateWeek/shifts", tags=["🗓️ Selector de Semanas"])
def get_shifts_by_week(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Línea del cliente"),
    fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")
):
    """Obtiene turnos de trabajo para una semana específica"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "CALL selectSemanaTurnosFP(%s, %s, %s, %s)",
            (id_cliente, id_cliente, linea, fecha)
        )

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data from procedure"}

        data = [
            {"fecha": row[1], "Turno": row[2], "kwhTurno": row[3], "TimestampInicio": row[4], "TimestampFin": row[5]}
            for row in results
        ]

        return {"data": data}

    except Exception as err:
        return {"error": str(err)}


@reports_weekly.get("/dateWeek/summary-general", tags=["🗓️ Selector de Semanas"])
def get_week_summary_general(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Línea del cliente"),
    fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")
):
    """Obtiene resumen general para una semana específica"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

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

        max_semana = max(d["semana"] for d in data)
        for d in data:
            d["semana"] = d["semana"] - max_semana

        semana_actual = [d for d in data if d["semana"] == 0 and d["kWh"] > 0]
        detalle_semana = [d for d in data if d["semana"] == 0]
        semanas_anteriores = [d for d in data if d["semana"] < 0 and d["kWh"] > 0]

        if not semana_actual:
            return {"error": "No hay datos con consumo en la semana actual"}

        total_kWh_semana_actual = sum(d["kWh"] for d in semana_actual)
        usd_por_kwh = float(costo_kwh_result[0]) if costo_kwh_result else 0.17
        costo_semana_actual = costo_energia_usd(total_kWh_semana_actual, usd_por_kwh)
        horas_trabajadas_semana_actual = sum(d["horas_trabajadas"] for d in semana_actual)
        promedio_ciclos_semana_actual = sum(d["promedio_ciclos_por_hora"] for d in semana_actual) / len(semana_actual)
        promedio_hp_semana_actual = sum(d["hp_equivalente"] for d in semana_actual) / len(semana_actual)

        if semanas_anteriores:
            kWh_anteriores = sum(d["kWh"] for d in semanas_anteriores) / len(semanas_anteriores)
            horas_trabajadas_anteriores = sum(d["horas_trabajadas"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_kWh_anteriores = sum(d["kWh"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_costo_anteriores = costo_energia_usd(promedio_kWh_anteriores, usd_por_kwh)
            promedio_ciclos_anteriores = sum(d["promedio_ciclos_por_hora"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_hp_anteriores = sum(d["hp_equivalente"] for d in semanas_anteriores) / len(semanas_anteriores)
            promedio_horas_trabajadas = sum(d["horas_trabajadas"] for d in semanas_anteriores) / len(semanas_anteriores)
        else:
            kWh_anteriores = promedio_kWh_anteriores = promedio_costo_anteriores = 0
            promedio_ciclos_anteriores = promedio_hp_anteriores = promedio_horas_trabajadas = horas_trabajadas_anteriores = 0

        comparacion_kwh = (total_kWh_semana_actual / promedio_kWh_anteriores - 1) if promedio_kWh_anteriores else 0
        comparacion_costo = (costo_semana_actual / promedio_costo_anteriores - 1) if promedio_costo_anteriores else 0
        comparacion_ciclos = (promedio_ciclos_semana_actual / promedio_ciclos_anteriores - 1) if promedio_ciclos_anteriores else 0
        comparacion_hp = (promedio_hp_semana_actual / promedio_hp_anteriores - 1) if promedio_hp_anteriores else 0
        comparacion_horas = (horas_trabajadas_semana_actual / promedio_horas_trabajadas - 1) if promedio_horas_trabajadas else 0

        porcentaje_kwh = f"{comparacion_kwh * 100:+.2f}"
        porcentaje_costo = f"{comparacion_costo * 100:+.2f}"
        porcentaje_ciclos = f"{comparacion_ciclos * 100:+.2f}"
        porcentaje_hp = f"{comparacion_hp * 100:+.2f}"
        porcentaje_horas = f"{comparacion_horas * 100:+.2f}"

        dias_trabajados = [d for d in detalle_semana if (d["horas_load"] + d["horas_noload"]) > 0]
        dias_cumplen = [d for d in dias_trabajados if 0 < d["promedio_ciclos_por_hora"] <= 12]
        dias_superan_hp = [d for d in dias_trabajados if d["hp_equivalente"] > promedio_hp_anteriores]
        porcentaje_dias_cumplen = (len(dias_cumplen) / len(dias_trabajados)) * 100 if dias_trabajados else 0
        porcentaje_dias_superan = (len(dias_superan_hp) / len(dias_trabajados)) * 100 if dias_trabajados else 0

        consumos_diarios = [d["kWh"] for d in detalle_semana if d["kWh"] > 0]
        promedio_consumo_diario = mean(consumos_diarios) if consumos_diarios else 0
        desviacion_consumo_diario = pstdev(consumos_diarios) if len(consumos_diarios) > 1 else 0
        limite_superior = promedio_consumo_diario + 2 * desviacion_consumo_diario
        dias_con_picos = sum(1 for kwh in consumos_diarios if kwh > limite_superior)

        total_horas_load = sum(d["horas_load"] for d in semana_actual)
        total_horas_trabajadas = sum(d["horas_trabajadas"] for d in semana_actual)
        porcentaje_load = (total_horas_load / total_horas_trabajadas) * 100 if total_horas_trabajadas else 0

        comentario_kwh_picos = f"""
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        Durante la semana, el compresor consumió un total de <b>{total_kWh_semana_actual:.2f} kWh</b>,
        con un costo total de <b>{costo_semana_actual:.2f} USD</b>.
        </div>
        """

        comentario_ciclos = f"""
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        Se analizaron <b>{len(dias_trabajados)}</b> días. <b>{len(dias_cumplen) if dias_cumplen else 0}</b>
        ({porcentaje_dias_cumplen:.2f}%) cumplieron con el rango ideal de ciclos.
        </div>
        """

        comentario_hp = f"""
        <div style='font-size: 16px; font-family: DIN, sans-serif; margin-left: 20px; text-align: justify;'>
        {"No hubo días" if not dias_superan_hp else f"{len(dias_superan_hp)} días"} en los que el HP superó el valor recomendado.
        </div>
        """

        if porcentaje_load > 80:
            comentario_eficiencia = f"El tiempo en LOAD ({porcentaje_load:.2f}%) supera el rango ideal."
        elif porcentaje_load < 70:
            comentario_eficiencia = f"El tiempo en LOAD ({porcentaje_load:.2f}%) está por debajo del rango ideal."
        else:
            comentario_eficiencia = f"El tiempo en LOAD ({porcentaje_load:.2f}%) está dentro del rango ideal."

        bloque_A = f"<p>Consumo: {total_kWh_semana_actual:.2f} kWh ({comparacion_kwh * 100:.1f}% vs promedio)</p>"
        bloque_B = f"<p>Ciclos: {promedio_ciclos_semana_actual:.0f} ({comparacion_ciclos * 100:.1f}% vs promedio)</p>"
        bloque_C = f"<p>HP Equivalente: {promedio_hp_semana_actual:.0f} ({comparacion_hp * 100:.1f}% vs promedio)</p>"
        bloque_D = f"<p>Horas trabajadas: {horas_trabajadas_semana_actual:.1f} ({comparacion_horas * 100:.1f}% vs promedio)</p>"

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
                "total_kWh_anteriores": round(kWh_anteriores, 0),
                "costo_estimado": round(promedio_costo_anteriores, 0),
                "promedio_ciclos_por_hora": round(promedio_ciclos_anteriores, 0),
                "promedio_hp_equivalente": round(promedio_hp_anteriores, 0),
                "horas_trabajadas_anteriores": round(horas_trabajadas_anteriores, 2),
            }
        }

    except Exception as err:
        return {"error": str(err)}
