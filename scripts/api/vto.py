from fastapi import APIRouter, Path, HTTPException
from fastapi.responses import JSONResponse

import mysql.connector
import os
from dotenv import load_dotenv

from .clases import Dispositivo

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

vto_web = APIRouter(prefix="/vto", tags=["VTO"])

@vto_web.get("/")
def get_dispositivos():
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            host=DB_HOST,
            database=DB_DATABASE,
            password=DB_PASSWORD
        )

        cursor = conn.cursor()

        cursor.execute(
            """SELECT d.id, d.id_kpm, d.id_proyecto, d.id_cliente, c.nombre_cliente
               FROM dispositivo d
               LEFT JOIN clientes c ON d.id_cliente = c.id_cliente
            """
        )

        res = cursor.fetchall()

        cursor.close()
        conn.close()

        if not res:
            return {"data": []}

        dispositivos = [
            {
                "id": row[0],
                "id_kpm": row[1],
                "id_proyecto": row[2],
                "id_cliente": row[3],
                "nombre_cliente": row[4]
            }
            for row in res
        ]

        return {
            "data": dispositivos
        }

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")

@vto_web.get("/{dispositivo_id}")
def get_dispositivo_by_id(dispositivo_id: int = Path(..., description="ID del dispositivo")):
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            host=DB_HOST,
            database=DB_DATABASE,
            password=DB_PASSWORD
        )

        cursor = conn.cursor()

        cursor.execute(
            """SELECT d.id, d.id_kpm, d.id_proyecto, d.id_cliente, c.nombre_cliente
               FROM dispositivo d
               LEFT JOIN clientes c ON d.id_cliente = c.id_cliente
               WHERE d.id = %s
            """,
            (dispositivo_id,)
        )

        res = cursor.fetchone()

        cursor.close()
        conn.close()

        if not res:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

        dispositivo = {
            "id": res[0],
            "id_kpm": res[1],
            "id_proyecto": res[2],
            "id_cliente": res[3],
            "nombre_cliente": res[4]
        }

        return {
            "data": dispositivo
        }

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")

@vto_web.post("/")
def create_dispositivo(request: Dispositivo):
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            host=DB_HOST,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )

        cursor = conn.cursor()

        cursor.execute(
            """INSERT INTO dispositivo (id_kpm, id_proyecto, id_cliente)
               VALUES (%s, %s, %s)
            """,
            (
                request.id_kpm,
                request.id_proyecto,
                request.id_cliente
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Dispositivo creado exitosamente"
        }
    except mysql.connector.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding dispositivo: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@vto_web.put("/{dispositivo_id}")
def update_dispositivo(dispositivo_id: int = Path(..., description="ID del dispositivo"), request: Dispositivo = None):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )

        cursor = conn.cursor()

        cursor.execute(
            """UPDATE dispositivo SET
                id_kpm = %s, id_proyecto = %s, id_cliente = %s
                WHERE id = %s
            """,
            (
                request.id_kpm,
                request.id_proyecto,
                request.id_cliente,
                dispositivo_id
            )
        )
        conn.commit()
        return {"success": True, "message": "Dispositivo actualizado exitosamente"}

    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@vto_web.delete("/{dispositivo_id}")
def delete_dispositivo(dispositivo_id: int = Path(..., description="ID del dispositivo")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )

        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM dispositivo WHERE id = %s",
            (dispositivo_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

        conn.commit()
        return {"success": True, "message": "Dispositivo eliminado exitosamente"}

    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
