from fastapi import FastAPI, Path, HTTPException, APIRouter
from fastapi.responses import JSONResponse

import mysql.connector
import os
from dotenv import load_dotenv

from .clases import Compresor, CompresorEventual

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

compresores = APIRouter(prefix="/compresores", tags=["Compresores"])

@compresores.get("/")
def get_all_compresores():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            """SELECT c.*, cl.nombre_cliente 
               FROM compresores c
               LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente"""
        )

        res = cursor.fetchall()

        cursor.close()
        conn.close()

        if not res:
            return {"error": "Check connection to DB"}
        
        compresores = [
            {
                "id": row[0],
                "hp": row[1],
                "tipo": row[2],
                "voltaje": row[3],
                "marca": row[4],
                "numero_serie": row[5],
                "anio": row[6],
                "id_cliente": row[7],
                "Amp_Load": row[8],
                "Amp_No_Load": row[9],
                "proyecto": row[10],
                "linea": row[11],
                "LOAD_NO_LOAD": row[12],
                "Alias": row[13],
                "fecha_utlimo_mtto": row[15],
                "nombre_cliente": row[16]
            }
            for row in res
        ]
        
        return{
            "data": compresores
        }
    except mysql.connector.Error as err:
        return{"error": str(err)}

@compresores.get("/{numero_cliente}")
def get_compresores_cliente(numero_cliente: int = Path(...,description="Numero del Cliente")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            """SELECT c.* FROM compresores c
                JOIN clientes c2 ON c2.id_cliente = c.id_cliente
                WHERE c2.numero_cliente = %s
            """,
            (numero_cliente,)
        )

        res = cursor.fetchall()
        cursor.close()
        conn.close()

        if not res:
            return{"error": "Check connection to DB or the .env"}
        
        compresores = [
            {
                "id": row[0],
                "hp": row[1],
                "tipo": row[2],
                "voltaje": row[3],
                "marca": row[4],
                "numero_serie": row[5],
                "anio": row[6],
                "id_cliente": row[7],
                "Amp_Load": row[8],
                "Amp_No_Load": row[9],
                "proyecto": row[10],
                "linea": row[11],
                "LOAD_NO_LOAD": row[12],
                "Alias": row[13],
                "fecha_utlimo_mtto": row[14]
            }
            for row in res
        ]

        return {
            "data": compresores
        }
    
    except mysql.connector.Error as err:
        return{ "error": str(err)}

@compresores.get("/compresor-cliente/{query}")
def search_compresores(query: str = Path(..., description="Número de serie o número de cliente")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        # Search by serial number or client number
        cursor.execute(
            """SELECT c.hp, c.tipo, c.marca, c.numero_serie, c.anio, c.id_cliente, c.Alias , cl.nombre_cliente, cl.numero_cliente
               FROM compresores c
               JOIN clientes cl ON cl.id_cliente = c.id_cliente
               WHERE c.numero_serie LIKE %s OR cl.numero_cliente LIKE %s
               LIMIT 20
            """,
            (f"%{query}%", f"%{query}%")
        )

        res = cursor.fetchall()
        cursor.close()
        conn.close()

        if not res:
            return {"data": []}
        
        compresores = [
            {
                "hp": row[0],
                "tipo": row[1],
                "marca": row[2],
                "numero_serie": row[3],
                "anio": row[4],
                "id_cliente": row[5],
                "alias": row[6],
                "nombre_cliente": row[7],
                "numero_cliente": row[8],
            }
            for row in res
        ]
        
        return {
            "data": compresores
        }
    
    except mysql.connector.Error as err:
        return {"error": str(err)}

# Add Compresor
@compresores.post("/")
def create_compresor(request: Compresor):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Check if numero_serie already exists
        if request.numero_serie:
            cursor.execute(
                "SELECT id FROM compresores WHERE numero_serie = %s",
                (request.numero_serie,)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail="El número de serie ya existe")
            cursor.fetchall()

        # Get next available ID
        cursor.execute("""
            SELECT MAX(id) as max_id FROM compresores
        """)
        result = cursor.fetchone()
        next_id = (result['max_id'] or 0) + 1
        cursor.fetchall()

        cursor.execute(
            """INSERT INTO compresores
                (id, hp, tipo, voltaje, marca, numero_serie, anio, id_cliente, 
                Amp_Load, Amp_No_Load, proyecto, linea, LOAD_NO_LOAD, Alias, fecha_utlimo_mtto)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                next_id,
                request.hp,
                request.tipo,
                request.voltaje,
                request.marca,
                request.numero_serie,
                request.anio,
                request.id_cliente,
                request.Amp_Load,
                request.Amp_No_Load,
                request.proyecto,
                request.linea,
                request.LOAD_NO_LOAD,
                request.Alias,
                request.fecha_ultimo_mtto
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Compresor agregado exitosamente",
            "id": next_id,
            "numero_serie": request.numero_serie,
            "alias": request.Alias
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

# Update Existing Compresor
@compresores.put("/{compresor_id}")
def update_compresor(compresor_id: int = Path(..., description="ID del compresor"), request: Compresor = None):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        # Check if compresor exists
        cursor.execute(
            "SELECT id FROM compresores WHERE id = %s",
            (compresor_id,)
        )
        
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Compresor no encontrado")

        cursor.execute(
            """UPDATE compresores SET 
               hp = %s, tipo = %s, voltaje = %s, marca = %s, numero_serie = %s,
               anio = %s, id_cliente = %s, Amp_Load = %s, Amp_No_Load = %s,
               proyecto = %s, linea = %s, LOAD_NO_LOAD = %s, Alias = %s,
               fecha_utlimo_mtto = %s
               WHERE id = %s""",
            (
                request.hp,
                request.tipo,
                request.voltaje,
                request.marca,
                request.numero_serie,
                request.anio,
                request.id_cliente,
                request.Amp_Load,
                request.Amp_No_Load,
                request.proyecto,
                request.linea,
                request.LOAD_NO_LOAD,
                request.Alias,
                request.fecha_ultimo_mtto,
                compresor_id
            )
        )
        
        conn.commit()
        return {"success": True, "message": "Compresor actualizado exitosamente"}
    
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Delete Existing Compresor
@compresores.delete("/{compresor_id}")
def delete_compresor(compresor_id: int = Path(..., description="ID del compresor")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM compresores WHERE id = %s",
            (compresor_id,)
        )
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Compresor no encontrado")
        
        conn.commit()
        return {"success": True, "message": "Compresor eliminado exitosamente"}
    
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

""" ================= Eventuales ==================="""

# Get all compresores eventuales
@compresores.get("/eventuales")
def get_all_compresores_eventuales():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM compresores_eventuales")
        res = cursor.fetchall()
        cursor.close()
        conn.close()

        if not res:
            return {"data": []}
        
        compresores = [
            {
                "id": row[0],
                "hp": row[1],
                "tipo": row[2],
                "voltaje": row[3],
                "marca": row[4],
                "numero_serie": row[5],
                "anio": row[6],
                "id_cliente": row[7],
                "Amp_Load": row[8],
                "Amp_No_Load": row[9],
                "proyecto": row[10],
                "linea": row[11],
                "LOAD_NO_LOAD": row[12],
                "Alias": row[13],
                "segundosPorRegistro": row[14],
                "fecha_ultimo_mtto": row[15],
                "modelo": row[16]
            }
            for row in res
        ]

        return {"data": compresores}
    except mysql.connector.Error as err:
        return {"error": str(err)}

# Get single compresor eventual by id
@compresores.get("/eventuales/{id}")
def get_compresor_eventual_by_id(id: int = Path(..., description="ID del compresor eventual")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM compresores_eventuales WHERE id = %s",
            (id,)
        )
        
        res = cursor.fetchone()
        cursor.close()
        conn.close()

        if not res:
            return {"error": "Compresor eventual no encontrado"}
        
        compresor = {
            "id": res[0],
            "hp": res[1],
            "tipo": res[2],
            "voltaje": res[3],
            "marca": res[4],
            "numero_serie": res[5],
            "anio": res[6],
            "id_cliente": res[7],
            "Amp_Load": res[8],
            "Amp_No_Load": res[9],
            "proyecto": res[10],
            "linea": res[11],
            "LOAD_NO_LOAD": res[12],
            "Alias": res[13],
            "segundosPorRegistro": res[14],
            "fecha_ultimo_mtto": res[15],
            "modelo": res[16]
        }

        return {"data": compresor}
    except mysql.connector.Error as err:
        return {"error": str(err)}

# Create compresor eventual
@compresores.post("/eventuales")
def create_compresor_eventual(request: CompresorEventual):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            """INSERT INTO compresores_eventuales
                (hp, tipo, voltaje, marca, numero_serie, anio, id_cliente, 
                Amp_Load, Amp_No_Load, proyecto, linea, LOAD_NO_LOAD, Alias, 
                segundosPorRegistro, fecha_ultimo_mtto, modelo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                request.hp,
                request.tipo,
                request.voltaje,
                request.marca,
                request.numero_serie,
                request.anio,
                request.id_cliente,
                request.Amp_Load,
                request.Amp_No_Load,
                request.proyecto,
                request.linea,
                request.LOAD_NO_LOAD,
                request.Alias,
                request.segundosPorRegistro,
                request.fecha_ultimo_mtto,
                request.modelo
            )
        )

        conn.commit()
        new_id = cursor.lastrowid

        return {
            "success": True,
            "message": "Compresor eventual agregado exitosamente",
            "id": new_id,
            "numero_serie": request.numero_serie,
            "alias": request.Alias
        }
    
    except mysql.connector.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding compresor eventual: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Update compresor eventual
@compresores.put("/eventuales/{id}")
def update_compresor_eventual(id: int = Path(..., description="ID del compresor eventual"), request: CompresorEventual = None):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id FROM compresores_eventuales WHERE id = %s",
            (id,)
        )
        
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Compresor eventual no encontrado")

        cursor.execute(
            """UPDATE compresores_eventuales SET 
               hp = %s, tipo = %s, voltaje = %s, marca = %s, numero_serie = %s,
               anio = %s, id_cliente = %s, Amp_Load = %s, Amp_No_Load = %s,
               proyecto = %s, linea = %s, LOAD_NO_LOAD = %s, Alias = %s,
               segundosPorRegistro = %s, fecha_ultimo_mtto = %s, modelo = %s
               WHERE id = %s""",
            (
                request.hp,
                request.tipo,
                request.voltaje,
                request.marca,
                request.numero_serie,
                request.anio,
                request.id_cliente,
                request.Amp_Load,
                request.Amp_No_Load,
                request.proyecto,
                request.linea,
                request.LOAD_NO_LOAD,
                request.Alias,
                request.segundosPorRegistro,
                request.fecha_ultimo_mtto,
                request.modelo,
                id
            )
        )
        
        conn.commit()
        return {"success": True, "message": "Compresor eventual actualizado exitosamente"}
    
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Delete compresor eventual
@compresores.delete("/eventuales/{id}")
def delete_compresor_eventual(id: int = Path(..., description="ID del compresor eventual")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM compresores_eventuales WHERE id = %s",
            (id,)
        )
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Compresor eventual no encontrado")
        
        conn.commit()
        return {"success": True, "message": "Compresor eventual eliminado exitosamente"}
    
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
