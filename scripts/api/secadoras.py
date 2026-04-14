from fastapi import APIRouter, Path, HTTPException
import mysql.connector
import os
from dotenv import load_dotenv

from .clases import Secadora

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

secadoras = APIRouter(prefix="/secadoras", tags=["Secadoras"])


def _get_conn():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_DATABASE,
    )


# GET /secadoras/ — todas las secadoras con nombre de cliente
@secadoras.get("/")
def get_all_secadoras():
    try:
        conn = _get_conn()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """SELECT s.*, cl.nombre_cliente
               FROM secadores s
               LEFT JOIN clientes cl ON cl.id_cliente = s.id_cliente
               ORDER BY s.id DESC"""
        )
        rows = cursor.fetchall()
        return {"data": rows}
    except mysql.connector.Error as err:
        return {"error": str(err)}
    finally:
        cursor.close()
        conn.close()


# GET /secadoras/search/{query} — buscar por alias, serie o cliente
@secadoras.get("/search/{query}")
def search_secadoras(query: str = Path(..., description="Alias, número de serie o nombre de cliente")):
    try:
        conn = _get_conn()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """SELECT s.id, s.tipo, s.alias, s.numero_serie, s.marca, s.anio,
                      s.id_cliente, cl.nombre_cliente, cl.numero_cliente
               FROM secadores s
               LEFT JOIN clientes cl ON cl.id_cliente = s.id_cliente
               WHERE s.alias LIKE %s OR s.numero_serie LIKE %s
                  OR cl.nombre_cliente LIKE %s OR cl.numero_cliente LIKE %s
               LIMIT 20""",
            (f"%{query}%", f"%{query}%", f"%{query}%", f"%{query}%"),
        )
        rows = cursor.fetchall()
        return {"data": rows}
    except mysql.connector.Error as err:
        return {"error": str(err)}
    finally:
        cursor.close()
        conn.close()


# POST /secadoras/ — crear secadora
@secadoras.post("/")
def create_secadora(request: Secadora):
    conn = None
    cursor = None
    try:
        conn = _get_conn()
        cursor = conn.cursor(dictionary=True)

        if request.numero_serie:
            cursor.execute(
                "SELECT id FROM secadores WHERE numero_serie = %s",
                (request.numero_serie,),
            )
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail="El número de serie ya existe")
            cursor.fetchall()

        cursor.execute(
            """INSERT INTO secadores (tipo, alias, numero_serie, marca, anio, id_cliente, fecha_ultimo_mtto)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                request.tipo,
                request.alias,
                request.numero_serie,
                request.marca,
                request.anio,
                request.id_cliente,
                request.fecha_ultimo_mtto,
            ),
        )
        conn.commit()
        return {
            "success": True,
            "message": "Secadora agregada exitosamente",
            "id": cursor.lastrowid,
        }
    except mysql.connector.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except HTTPException:
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# PUT /secadoras/{secadora_id} — actualizar secadora
@secadoras.put("/{secadora_id}")
def update_secadora(secadora_id: int = Path(..., description="ID de la secadora"), request: Secadora = None):
    conn = None
    cursor = None
    try:
        conn = _get_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM secadores WHERE id = %s", (secadora_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Secadora no encontrada")

        cursor.execute(
            """UPDATE secadores SET
               tipo = %s, alias = %s, numero_serie = %s, marca = %s,
               anio = %s, id_cliente = %s, fecha_ultimo_mtto = %s
               WHERE id = %s""",
            (
                request.tipo,
                request.alias,
                request.numero_serie,
                request.marca,
                request.anio,
                request.id_cliente,
                request.fecha_ultimo_mtto,
                secadora_id,
            ),
        )
        conn.commit()
        return {"success": True, "message": "Secadora actualizada exitosamente"}
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    except HTTPException:
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# DELETE /secadoras/{secadora_id} — eliminar secadora
@secadoras.delete("/{secadora_id}")
def delete_secadora(secadora_id: int = Path(..., description="ID de la secadora")):
    conn = None
    cursor = None
    try:
        conn = _get_conn()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM secadores WHERE id = %s", (secadora_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Secadora no encontrada")

        conn.commit()
        return {"success": True, "message": "Secadora eliminada exitosamente"}
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
