from fastapi import FastAPI, Path, HTTPException, APIRouter
from fastapi.responses import JSONResponse

from scripts.api.clases import OrdenServicio

import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

ordenes = APIRouter(prefix="/ordenes", tags=["Ordenes de Servicio"])

# Get all ordenes
@ordenes.get("/")
def get_all_ordenes():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM ordenes_servicio"
        )

        res = cursor.fetchall()
        cursor.close()
        conn.close()

        if not res:
            return {"error": "Check connection to DB or the .env"}
        
        clients = [
            {
                "folio": row[0],
                "id_cliente": row[1],
                "id_cliente_eventual": row[2],
                "nombre_cliente": row[3],
                "numero_cliente": row[4],
                "alias_compresor": row[5],
                "numero_serie": row[6],
                "hp": row[7],
                "tipo": row[8],
                "marca": row[9],
                "anio": row[10],
                "tipo_visita": row[11],
                "prioridad": row[12],
                "fecha_programada": row[13],
                "hora_programada": row[14],
                "estado": row[15],
                "fecha_creacion": row[16],
                "reporte_url": row[17],

            }
            for row in res
        ]

        return{
            "data": clients
        }
    except mysql.connector.Error as err:
        return{"error": str(err)}

# Get orden by folio
@ordenes.get("/{folio}")
def get_ordenes_by_folio(folio: str = Path(..., description="The folio of the orden de servicio to retrieve")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM ordenes_servicio WHERE folio = %s",
            (folio,)
        )

        res = cursor.fetchall()
        cursor.close()
        conn.close()

        if not res:
            return {"error": "Check connection to DB or the .env"}
        
        clients = [
            {
                "folio": row[0],
                "id_cliente": row[1],
                "id_cliente_eventual": row[2],
                "nombre_cliente": row[3],
                "numero_cliente": row[4],
                "alias_compresor": row[5],
                "numero_serie": row[6],
                "hp": row[7],
                "tipo": row[8],
                "marca": row[9],
                "anio": row[10],
                "tipo_visita": row[11],
                "prioridad": row[12],
                "fecha_programada": row[13],
                "hora_programada": row[14],
                "estado": row[15],
                "fecha_creacion": row[16],
                "reporte_url": row[17],

            }
            for row in res
        ]

        return{
            "data": clients
        }
    except mysql.connector.Error as err:
        return{"error": str(err)}


@ordenes.post("/")
def create_orden_servicio(request: OrdenServicio):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """INSERT INTO ordenes_servicio
            (folio, id_cliente, id_cliente_eventual, nombre_cliente, 
            numero_cliente, alias_compresor, numero_serie, hp, tipo, marca, anio,
            tipo_visita, prioridad, fecha_programada, hora_programada,
            estado, fecha_creacion, reporte_url)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
            request.folio,
            request.id_cliente,
            request.id_cliente_eventual,
            request.nombre_cliente,
            request.numero_cliente,
            request.alias_compresor,
            request.numero_serie,
            request.hp,
            request.tipo,
            request.marca,
            request.anio,
            request.tipo_visita,
            request.prioridad,
            request.fecha_programada,
            request.hora_programada,
            request.estado,
            request.fecha_creacion,
            request.reporte_url
            )
        )

        conn.commit()

        return {
            "sucess": True,
            "message": "Orden agregada exitosamente",
            "folio": request.folio
        }
    
    except mysql.connector.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding compresor: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@ordenes.put("/{folio}")
def update_orden_servicio(folio: str, request: OrdenServicio):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.connect()

        cursor.execute(
            "SELECT folio FROM ordenes_servicio WHERE folio = %s"
            (folio,)
        )

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Folio not found")
        
        cursor.exectue(
            """UPDATE ordenes_servicio SET
                id_cliente, id_cliente_eventual, nombre_cliente, numero_cliente, alias_compresor,
                numero_serie, hp, tipo, marca, anio, tipo_visita, prioridad, fecha_programada, hora_programada
                WHERE folio = %s
            """,
            (
                request.id_cliente,
                request.id_cliente_eventual,
                request.nombre_cliente,
                request.numero_cliente,
                request.alias_compresor,
                request.numero_serie,
                request.hp,
                request.tipo,
                request.marca,
                request.anio,
                request.tipo_visita,
                request.prioridad,
                request.fecha_programada,
                request.hora_programada,
                folio

            )
        )

        conn.commit()
        return {"sucess": True, "message": "Folio updated"}
    
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error : {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@ordenes.delete("/{folio}")
def delete_orden_by_folio(folio:  str = Path(...,description="Folio de la Orden" )):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM ordenes_servicio WHERE folio = %s",
        (folio,)
        )

        if (cursor.rowcount==0):
            raise HTTPException(status_code=404, detail="Folio no encontrado")
        
        conn.commit()
        return {"sucess": True, "message": "Orden de servicio eliminada"}
    
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()