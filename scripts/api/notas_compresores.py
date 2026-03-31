from fastapi import Path, HTTPException, APIRouter

import mysql.connector
import os
from dotenv import load_dotenv

from .clases import NotaCompresor, NotaCompresorUpdate

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

notas_compresores = APIRouter(prefix="/notas-compresores", tags=["Notas Compresores"])


@notas_compresores.get("/")
def get_all_notas():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            """SELECT nc.id, nc.numero_serie, nc.nota, nc.creado_por, nc.fecha_creacion, nc.fecha_actualizacion,
                      c.Alias, cl.nombre_cliente, cl.numero_cliente
               FROM notas_compresores nc
               LEFT JOIN compresores c ON c.numero_serie = nc.numero_serie
               LEFT JOIN clientes cl ON cl.id_cliente = c.id_cliente
               ORDER BY nc.fecha_creacion DESC"""
        )

        res = cursor.fetchall()
        cursor.close()
        conn.close()

        notas = [
            {
                "id": row[0],
                "numero_serie": row[1],
                "nota": row[2],
                "creado_por": row[3],
                "fecha_creacion": row[4],
                "fecha_actualizacion": row[5],
                "alias_compresor": row[6],
                "nombre_cliente": row[7],
                "numero_cliente": row[8],
            }
            for row in res
        ]

        return {"data": notas}
    except mysql.connector.Error as err:
        return {"error": str(err)}


@notas_compresores.get("/{numero_serie}")
def get_notas_by_compresor(numero_serie: str = Path(..., description="Numero de serie del compresor")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            """SELECT nc.id, nc.numero_serie, nc.nota, nc.creado_por, nc.fecha_creacion, nc.fecha_actualizacion,
                      c.Alias, cl.nombre_cliente, cl.numero_cliente
               FROM notas_compresores nc
               LEFT JOIN compresores c ON c.numero_serie = nc.numero_serie
               LEFT JOIN clientes cl ON cl.id_cliente = c.id_cliente
               WHERE nc.numero_serie = %s
               ORDER BY nc.fecha_creacion DESC""",
            (numero_serie,)
        )

        res = cursor.fetchall()
        cursor.close()
        conn.close()

        notas = [
            {
                "id": row[0],
                "numero_serie": row[1],
                "nota": row[2],
                "creado_por": row[3],
                "fecha_creacion": row[4],
                "fecha_actualizacion": row[5],
                "alias_compresor": row[6],
                "nombre_cliente": row[7],
                "numero_cliente": row[8],
            }
            for row in res
        ]

        return {"data": notas}
    except mysql.connector.Error as err:
        return {"error": str(err)}


@notas_compresores.post("/")
def create_nota(request: NotaCompresor):
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            """INSERT INTO notas_compresores (numero_serie, nota, creado_por)
               VALUES (%s, %s, %s)""",
            (request.numero_serie, request.nota, request.creado_por)
        )

        conn.commit()
        new_id = cursor.lastrowid

        return {
            "success": True,
            "message": "Nota agregada exitosamente",
            "id": new_id
        }

    except mysql.connector.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@notas_compresores.put("/{nota_id}")
def update_nota(request: NotaCompresorUpdate, nota_id: int = Path(..., description="ID de la nota")):
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id FROM notas_compresores WHERE id = %s",
            (nota_id,)
        )

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Nota no encontrada")

        cursor.execute(
            "UPDATE notas_compresores SET nota = %s WHERE id = %s",
            (request.nota, nota_id)
        )

        conn.commit()
        return {"success": True, "message": "Nota actualizada exitosamente"}

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


@notas_compresores.delete("/{nota_id}")
def delete_nota(nota_id: int = Path(..., description="ID de la nota")):
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM notas_compresores WHERE id = %s",
            (nota_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Nota no encontrada")

        conn.commit()
        return {"success": True, "message": "Nota eliminada exitosamente"}

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
