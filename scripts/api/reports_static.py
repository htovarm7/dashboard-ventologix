"""
Endpoints de datos estáticos y reportes de KWh por fases
"""
from fastapi import APIRouter, Query

from .db_utils import get_db_connection


reports_static = APIRouter(prefix="/report", tags=["📋 Datos Estáticos"])


# KWh y Fases endpoints
@reports_static.get("/kwh-mensual-por-dia", tags=["📊 KWh Mensual"])
def get_kwh_mensual_por_dia(
    año: int = Query(..., description="Año"),
    mes: int = Query(..., description="Mes")
):
    """Obtiene consumo kWh mensual por día"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("CALL kwh_mensual_por_dia(%s, %s)", (año, mes,))
        results = cursor.fetchall()

        while cursor.nextset():
            pass

        cursor.close()
        conn.close()

        if not results:
            return {"data": []}

        columns = ["fecha", "kwh"]
        data = [dict(zip(columns, row)) for row in results]

        return {"data": data, "periodo": f"{año}-{mes:02d}"}

    except Exception as e:
        return {"error": f"Error inesperado: {str(e)}"}


@reports_static.get("/kwh-diario-fases", tags=["📊 KWh Diario por Fases"])
def get_kwh_diario_fases(fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    """Obtiene consumo kWh por fases para una fecha"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("CALL kwh_diario_fases(%s)", (fecha,))
        results = cursor.fetchall()

        while cursor.nextset():
            pass

        cursor.close()
        conn.close()

        if not results:
            return {"data": []}

        columns = ["time", "kWa", "kWb", "kWc"]
        data = [dict(zip(columns, row)) for row in results]

        return {"data": data, "fecha": fecha}

    except Exception as e:
        return {"error": f"Error inesperado: {str(e)}"}


@reports_static.get("/amperaje-diario-fases", tags=["📊 Amperaje Diario por Fases"])
def get_amperaje_diario_fases(fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    """Obtiene amperaje por fases para una fecha"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("CALL amperaje_diario_fases(%s)", (fecha,))
        results = cursor.fetchall()

        while cursor.nextset():
            pass

        cursor.close()
        conn.close()

        if not results:
            return {"data": []}

        columns = ["time", "ia", "ib", "ic"]
        data = [dict(zip(columns, row)) for row in results]

        return {"data": data, "fecha": fecha}

    except Exception as e:
        return {"error": f"Error inesperado: {str(e)}"}


@reports_static.get("/voltaje-diario-fases", tags=["📊 Voltaje Diario por Fases"])
def get_voltaje_diario_fases(fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD")):
    """Obtiene voltaje por fases para una fecha"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("CALL voltaje_diario_fases(%s)", (fecha,))
        results = cursor.fetchall()

        while cursor.nextset():
            pass

        cursor.close()
        conn.close()

        if not results:
            return {"data": []}

        columns = ["time", "ua", "ub", "uc"]
        data = [dict(zip(columns, row)) for row in results]

        return {"data": data, "fecha": fecha}

    except Exception as e:
        return {"error": f"Error inesperado: {str(e)}"}


# Datos estáticos endpoints
@reports_static.get("/client-data", tags=["📋 Datos Estáticos"])
def get_client_data(id_cliente: int = Query(..., description="ID del cliente")):
    """Obtiene datos del cliente"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            f"SELECT numero_cliente, nombre_cliente, RFC, direccion, CostokWh, demoDiario, demoSemanal FROM clientes WHERE id_cliente = {id_cliente}"
        )
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified client."}

        data = [
            {
                "numero_cliente": row[0],
                "nombre_cliente": row[1],
                "RFC": row[2],
                "direccion": row[3],
                "costoUSD": row[4],
                "demoDiario": row[5],
                "demoSemanal": row[6]
            }
            for row in results
        ]

        return {"data": data}

    except Exception as err:
        return {"error": str(err)}


@reports_static.get("/compressor-data", tags=["📋 Datos Estáticos"])
def get_compressor_data(
    id_cliente: int = Query(..., description="ID del cliente"),
    linea: str = Query(..., description="Línea del cliente")
):
    """Obtiene datos del compresor"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT hp, tipo, voltaje, marca, numero_serie, Alias, LOAD_NO_LOAD FROM compresores WHERE id_cliente = %s and linea= %s",
            (id_cliente, linea)
        )
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        if not results:
            return {"error": "No data found for the specified client."}

        data = [
            {
                "hp": row[0],
                "tipo": row[1],
                "voltaje": row[2],
                "marca": row[3],
                "numero_serie": row[4],
                "alias": row[5],
                "limite": row[6]
            }
            for row in results
        ]

        return {"data": data}

    except Exception as err:
        return {"error": str(err)}


@reports_static.get("/clients-data", tags=["📋 Datos Estáticos"])
def get_clients_data():
    """Obtiene clientes con envío diario/semanal"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT e.id_cliente, e.nombre_cliente, comp.linea, comp.Alias
            FROM envios e
            JOIN compresores comp ON e.id_cliente = comp.id_cliente
            WHERE e.Diario = 1;
        """)
        diarios = cursor.fetchall()

        while cursor.nextset():
            pass

        cursor.execute("""
            SELECT e.id_cliente, e.nombre_cliente, comp.linea, comp.Alias
            FROM envios e
            JOIN compresores comp ON e.id_cliente = comp.id_cliente
            WHERE e.Semanal = 1;
        """)
        semanales = cursor.fetchall()

        cursor.close()
        conn.close()

        data_diarios = [{"id_cliente": row[0], "nombre_cliente": row[1], "linea": row[2], "alias": row[3]} for row in diarios]
        data_semanales = [{"id_cliente": row[0], "nombre_cliente": row[1], "linea": row[2], "alias": row[3]} for row in semanales]

        return {"diarios": data_diarios, "semanales": data_semanales}

    except Exception as err:
        return {"error": str(err)}


@reports_static.get("/all-clients", tags=["📋 Datos Estáticos"])
def get_all_clients_data():
    """Obtiene todos los clientes"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT e.id_cliente, e.nombre_cliente, comp.linea, comp.Alias
            FROM envios e
            JOIN compresores comp ON e.id_cliente = comp.id_cliente
        """)
        diarios = cursor.fetchall()

        while cursor.nextset():
            pass

        cursor.execute("""
            SELECT e.id_cliente, e.nombre_cliente, comp.linea, comp.Alias
            FROM envios e
            JOIN compresores comp ON e.id_cliente = comp.id_cliente
        """)
        semanales = cursor.fetchall()

        cursor.close()
        conn.close()

        data_diarios = [{"id_cliente": row[0], "nombre_cliente": row[1], "linea": row[2], "alias": row[3]} for row in diarios]
        data_semanales = [{"id_cliente": row[0], "nombre_cliente": row[1], "linea": row[2], "alias": row[3]} for row in semanales]

        return {"diarios": data_diarios, "semanales": data_semanales}

    except Exception as err:
        return {"error": str(err)}
