from fastapi import FastAPI, Path, HTTPException, APIRouter
from fastapi.responses import JSONResponse

from scripts.api.clases import Client, ClienteEventual

import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

client = APIRouter(prefix="/clients", tags=["Clientes"])

# Get all clients
@client.get("/")
def get_all_clients():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            """SELECT DISTINCT numero_cliente, nombre_cliente, RFC, direccion, champion, CostokWh, demoDiario, demoSemanal
                FROM clientes;
            """
        )

        res = cursor.fetchall()
        cursor.close()
        conn.close()

        if not res:
            return {"error": "Check connection to DB or the .env"}
        
        clients = [
            {
                "numero_cliente": row[0],
                "nombre_cliente": row[1],
                "RFC": row[2],
                "direccion": row[3],
                "champion": row[4],
                "CostokWh": row[5],
                "demoDiario": row[6],
                "demoSemanal": row[7]

            }
            for row in res
        ]

        return{
            "data": clients
        }
    except mysql.connector.Error as err:
        return{"error": str(err)}

""" ================= Eventuales ==================="""

# Get all eventuales clients
@client.get("/eventuales")
def get_all_eventuales():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM clientes_eventuales")
        res = cursor.fetchall()
        cursor.close()
        conn.close()

        if not res:
            return {"data": []}
        
        eventuales = [
            {
                "id": row[0],
                "nombre_cliente": row[1],
                "telefono": row[2],
                "email": row[3],
                "direccion": row[4]
            }
            for row in res
        ]

        return {"data": eventuales}
    except mysql.connector.Error as err:
        return {"error": str(err)}

# Get single eventual client by id
@client.get("/eventuales/{id}")
def get_eventual_by_id(id: int = Path(..., description="ID del cliente eventual")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM clientes_eventuales WHERE id = %s",
            (id,)
        )
        
        res = cursor.fetchone()
        cursor.close()
        conn.close()

        if not res:
            return {"error": "Cliente eventual no encontrado"}
        
        eventual = {
            "id": res[0],
            "nombre_cliente": res[1],
            "telefono": res[2],
            "email": res[3],
            "direccion": res[4]
        }

        return {"data": eventual}
    except mysql.connector.Error as err:
        return {"error": str(err)}

# Create eventual client
@client.post("/eventuales")
def create_eventual(request: ClienteEventual):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            """INSERT INTO clientes_eventuales
                (nombre_cliente, telefono, email, direccion)
                VALUES (%s, %s, %s, %s)
            """,
            (
                request.nombre_cliente,
                request.telefono,
                request.email,
                request.direccion
            )
        )

        conn.commit()
        new_id = cursor.lastrowid

        return {
            "success": True,
            "message": "Cliente eventual agregado exitosamente",
            "id": new_id,
            "nombre_cliente": request.nombre_cliente
        }
    
    except mysql.connector.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding eventual client: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Update eventual client
@client.put("/eventuales/{id}")
def update_eventual(id: int = Path(..., description="ID del cliente eventual"), request: ClienteEventual = None):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id FROM clientes_eventuales WHERE id = %s",
            (id,)
        )
        
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Cliente eventual no encontrado")

        cursor.execute(
            """UPDATE clientes_eventuales SET nombre_cliente = %s, telefono = %s, 
               email = %s, direccion = %s
               WHERE id = %s""",
            (
                request.nombre_cliente,
                request.telefono,
                request.email,
                request.direccion,
                id
            )
        )
        
        conn.commit()
        return {"success": True, "message": "Cliente eventual actualizado exitosamente"}
    
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Delete eventual client
@client.delete("/eventuales/{id}")
def delete_eventual(id: int = Path(..., description="ID del cliente eventual")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM clientes_eventuales WHERE id = %s",
            (id,)
        )
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Cliente eventual no encontrado")
        
        conn.commit()
        return {"success": True, "message": "Cliente eventual eliminado exitosamente"}
    
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Get data from a client based on the id_cliente
@client.get("/by-id/{id_cliente}")
def get_client_by_id(id_cliente: int = Path(...,description="ID del Cliente")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM clientes WHERE id_cliente = %s",
            (id_cliente,)
        )
        
        res = cursor.fetchone()
        cursor.close()
        conn.close()

        if not res:
            return {"error": "Cliente no encontrado"}
        
        client = {
                "id_cliente": res[0],
                "numero_cliente": res[1],
                "nombre_cliente": res[2],
                "RFC": res[3],
                "direccion": res[4],
                "champion": res[5],
                "CostokWh": res[6],
                "demoDiario": res[7],
                "demoSemanal": res[8]
                }

        return{
            "data": client
        }
    except mysql.connector.Error as err:
        return{"error": str(err)}

# Get data from a single client using numero de cliente
@client.get("/{numero_cliente}")
def get_client_data(numero_cliente: int = Path(...,description="Numero del Cliente")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM clientes WHERE numero_cliente = %s",
            (numero_cliente,)
        )
        
        res = cursor.fetchone()
        cursor.close()
        conn.close()

        if not res:
            return {"error": "Check connection to DB or the .env"}
        
        client = {
                "id_cliente": res[0],
                "numero_cliente": res[1],
                "nombre_cliente": res[2],
                "RFC": res[3],
                "direccion": res[4],
                "champion": res[5],
                "CostokWh": res[6],
                "demoDiario": res[7],
                "demoSemanal": res[8]
                }

        return{
            "data": client
        }
    except mysql.connector.Error as err:
        return{"error": str(err)}

# Get data from a client based on the id_cliente
@client.get("/by-id/{id_cliente}")
def get_client_by_id(id_cliente: int = Path(...,description="ID del Cliente")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM clientes WHERE id_cliente = %s",
            (id_cliente,)
        )
        
        res = cursor.fetchone()
        cursor.close()
        conn.close()

        if not res:
            return {"error": "Cliente no encontrado"}
        
        client = {
                "id_cliente": res[0],
                "numero_cliente": res[1],
                "nombre_cliente": res[2],
                "RFC": res[3],
                "direccion": res[4],
                "champion": res[5],
                "CostokWh": res[6],
                "demoDiario": res[7],
                "demoSemanal": res[8]
                }

        return{
            "data": client
        }
    except mysql.connector.Error as err:
        return{"error": str(err)}


# Add Client
@client.post("/")
def create_client(request: Client):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id_cliente FROM clientes WHERE numero_cliente = %s",
            (request.numero_cliente,)
        )

        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="El número de cliente ya existe")
        cursor.fetchall()

        # Obtener el siguiente id_cliente disponible
        cursor.execute("""
            SELECT MAX(id_cliente) as max_id
            FROM clientes
            WHERE id_cliente NOT IN (20000, 101010)
        """)
        result = cursor.fetchone()
        next_id_cliente = (result['max_id'] or 0) + 1
        cursor.fetchall()  # Limpiar resultados

        cursor.execute(
            """INSERT INTO clientes
                (id_cliente, numero_cliente, nombre_cliente, RFC, direccion, champion, costokWh, demoDiario, demoSemanal)
                VALUES (%s, %s, %s, %s, %s, %s, %s,%s)
            """,
            (
                next_id_cliente,
                request.numero_cliente,
                request.nombre_cliente,
                request.RFC,
                request.direccion,
                request.champion,
                request.CostokWh if request.CostokWh else 0.17,
                request.demoDiario if request.demoDiario else 0,
                request.demoSemanal if request.demoSemanal else 0
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Cliente agregado exitosamente",
            "id_cliente": next_id_cliente,
            "numero_cliente": request.numero_cliente,
            "nombre_cliente": request.nombre_cliente
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
        raise HTTPException(status_code=500, detail=f"Error adding client: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Update Exisiting Client
@client.put("/{numero_cliente}")
def update_client(numero_cliente: int = Path(..., description="Numero del cliente"), request: Client = None):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id_cliente FROM clientes WHERE numero_cliente = %s",
            (numero_cliente,)
        )
        
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

        cursor.execute(
            """UPDATE clientes SET nombre_cliente = %s, RFC = %s, direccion = %s, 
               champion = %s, costokWh = %s, demoDiario = %s, demoSemanal = %s
               WHERE numero_cliente = %s""",
            (
                request.nombre_cliente,
                request.RFC,
                request.direccion,
                request.champion,
                request.CostokWh if request.CostokWh else 0.17,
                request.demoDiario if request.demoDiario else 0,
                request.demoSemanal if request.demoSemanal else 0,
                numero_cliente
            )
        )
        
        conn.commit()
        return {"success": True, "message": "Cliente actualizado exitosamente"}
    
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Delete existent client
@client.delete("/{numero_cliente}")
def delete_client(numero_cliente: int = Path(..., description="Numero del cliente")):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM clientes WHERE numero_cliente = %s",
            (numero_cliente,)
        )
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        conn.commit()
        return {"success": True, "message": "Cliente eliminado exitosamente"}
    
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()