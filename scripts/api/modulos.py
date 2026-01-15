from fastapi import FastAPI, Path, HTTPException, APIRouter
from fastapi.responses import JSONResponse

import mysql.connector
import os
from dotenv import load_dotenv

from .clases import Modulos

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

modulos_web = APIRouter(prefix="/modulos", tags=["Modulos"])

@modulos_web.get("/")
def get_modulos():
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            host=DB_HOST,
            database=DB_DATABASE,
            password=DB_PASSWORD
        )
        
        cursor = conn.cursor()

        cursor.execute(
            """ SELECT *
                FROM modulos_web
            """
        )

        res = cursor.fetchall()

        cursor.close()
        conn.close()

        if not res:
            return{"error": "Check connection to DB or .env"}
        
        modulos = [
            {
                "numero_cliente": row[0],
                "mantenimiento": row[1],
                "reporteDia": row[2],
                "reporteSemana": row[3],
                "presion": row[4],
                "prediccion": row[5],
                "kwh": row[6],
                "nombre_cliente": row[7]
            }
            for row in res
        ]

        return {
            "data": modulos
        }
    
    except mysql.connector.Error as err:
        return{"error": str(err)}

@modulos_web.get("/{numero_cliente}")
def get_modulos_by_cliente(numero_cliente: int = Path(..., description="Numero del cliente")):
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            host=DB_HOST,
            database=DB_DATABASE,
            password=DB_PASSWORD
        )
        
        cursor = conn.cursor()

        cursor.execute(
            """SELECT *
               FROM modulos_web
               WHERE numero_cliente = %s
            """,
            (numero_cliente,)
        )

        res = cursor.fetchone()

        cursor.close()
        conn.close()

        if not res:
            raise HTTPException(status_code=404, detail="Cliente no encontrado en modulos_web")
        
        modulo = {
            "numero_cliente": res[0],
            "mantenimiento": res[1],
            "reporteDia": res[2],
            "reporteSemana": res[3],
            "presion": res[4],
            "prediccion": res[5],
            "kwh": res[6],
            "nombre_cliente": res[7]
        }

        return {
            "data": modulo
        }
    
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    
@modulos_web.post("/")
def submit_modulos_permission(request : Modulos):
    try: 
        conn = mysql.connector.connect(
            user=DB_USER,
            host=DB_HOST,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )

        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """INSERT into modulos_web
                (numero_cliente, mantenimiento, reporteDia, reporteSemana, presion, prediccion, kwh, nombre_cliente)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                request.numero_cliente,
                request.mantenimiento,
                request.reporteDia,
                request.reporteSemana,
                request.presion,
                request.prediccion,
                request.kwh,
                request.nombre_cliente
            )
        )

        conn.commit()

        return{
            "sucess": True,
            "message": "Cliente dado de alta en Web"
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

@modulos_web.put("/{numero_cliente}")
def update_modulos_cliente(numero_cliente: int = Path(...,description="Numero del cliente"), request: Modulos = None):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )

        cursor = conn.cursor()

        cursor.execute(
            """UPDATE modulos_web SET
                mantenimiento = %s, reporteDia = %s, reporteSemana = %s,
                prediccion = %s, presion = %s, kwh = %s
                WHERE numero_cliente = %s
            """,
            (
                request.mantenimiento,
                request.reporteDia,
                request.reporteSemana,
                request.prediccion,
                request.presion,
                request.kwh,
                numero_cliente
            )
        )
        conn.commit()
        return {"success": True, "message": "Modulos del cliente actualizado"}
    
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@modulos_web.delete("/{numero_cliente}")
def delete_cliente_web(numero_cliente: int = Path(...,description="Numero del cliente")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )

        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM modulos_web WHERE numero_cliente = %s",
            (numero_cliente,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Numero de cliente no encontrado")
        
        conn.commit()
        return {"sucess": True, "message": "Cliente dado de baja de web"}
    
        
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()