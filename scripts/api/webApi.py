from ast import List
from fastapi import FastAPI, Query, HTTPException, APIRouter, Body, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse

import mysql.connector
import os
from dotenv import load_dotenv
import numpy as np
from datetime import datetime, timedelta
import pandas as pd
from io import BytesIO
from pydantic import BaseModel, EmailStr
from statistics import mean, pstdev

"""
* @Observations:
* 1. To run the API, use the command:
* uvicorn scripts.api_server:webApi --reload
* To check the API response, you can use the following URL:
* http://127.0.0.1:8000/docs
* For PENOX use device_id = 7
* If the API is not updating, check the following:
* 1. Run in terminal:
    tasklist | findstr python
* 2. If the process is running, kill it using:
    taskkill /F /PID <PID>
* 3. Where <PID> is the process ID obtained from the previous command, which in this case is 18168.
    python.exe                   18168 Console                    1    67,276 KB
* 4. Run the API again using:
"""

# Load environment variables
load_dotenv()

# Create FastAPI instance
web = APIRouter(prefix="/web", tags=["web"])

# Get database credentials from environment variables
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")


@web.post("/verify-email", tags=["AUTH"])
def verify_email(email: EmailStr = Body(..., embed=True),):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Paso 1: Obtener numero_cliente y rol
        cursor.execute("SELECT numero_cliente, rol FROM usuarios_auth WHERE email = %s", (email,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=403, detail="Email not authorized")

        numero_cliente = result["numero_cliente"]
        rol = result.get("rol", 2)  # Por defecto cliente (2) si no hay valor

        # Lógica según el rol
        if rol == 0:  # Super admin
            query = """
                SELECT c2.id_cliente, c2.linea, c2.alias, c.nombre_cliente
                FROM clientes c
                JOIN compresores c2 ON c.id_cliente = c2.proyecto
            """
            cursor.execute(query)

        elif rol == 1:  # Admin
            query = """
                SELECT c2.id_cliente, c2.linea, c2.alias, c.nombre_cliente
                FROM clientes c
                JOIN compresores c2 ON c.id_cliente = c2.proyecto
                WHERE c.numero_cliente = %s
            """
            cursor.execute(query, (numero_cliente,))

        else:  # Cliente
            query = """
                SELECT c2.id_cliente, c2.linea, c2.alias
                FROM usuarios_auth ua
                JOIN clientes c ON ua.numero_cliente = c.numero_cliente
                JOIN compresores c2 ON c.id_cliente = c2.proyecto
                WHERE ua.numero_cliente = %s
            """
            cursor.execute(query, (numero_cliente,))

        compresores = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "authorized": True,
            "numero_cliente": numero_cliente,
            "rol": rol,
            "compresores": compresores
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@web.get("/ingenieros", tags=["CRUD Admin"])
def get_ingenieros():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT e.id, e.name, e.email, GROUP_CONCAT(ec.compresor_id) as compresores
            FROM ingenieros e
            LEFT JOIN ingeniero_compresor ec ON e.id = ec.ingeniero_id
            GROUP BY e.id, e.name, e.email
        """
        cursor.execute(query)
        ingenieros = cursor.fetchall()

        # Procesar los compresores
        for ingeniero in ingenieros:
            if ingeniero['compresores']:
                ingeniero['compresores'] = ingeniero['compresores'].split(',')
            else:
                ingeniero['compresores'] = []

        cursor.close()
        conn.close()

        return {"ingenieros": ingenieros}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching ingenieros: {str(e)}")


@web.post("/ingenieros", tags=["CRUD Admin"])
def create_ingeniero(
    name: str = Body(...),
    email: EmailStr = Body(...),
    compresores: List[int] = Body(default=[])
):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Insertar el ingeniero
        cursor.execute(
            "INSERT INTO ingenieros (name, email) VALUES (%s, %s)",
            (name, email)
        )
        ingeniero_id = cursor.lastrowid

        # Insertar las relaciones con compresores si existen
        if compresores and len(compresores) > 0:
            values = [(ingeniero_id, compresor_id) for compresor_id in compresores]
            cursor.executemany(
                "INSERT INTO ingeniero_compresor (ingeniero_id, compresor_id) VALUES (%s, %s)",
                values
            )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": ingeniero_id,
            "name": name,
            "email": email,
            "compresores": compresores
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating ingeniero: {str(e)}")
    
@web.get("/ingenieros", tags=["CRUD Admin"])
def get_ingenieros():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT e.id, e.name, e.email, GROUP_CONCAT(ec.compresor_id) as compresores
            FROM ingenieros e
            LEFT JOIN ingeniero_compresor ec ON e.id = ec.ingeniero_id
            GROUP BY e.id, e.name, e.email
        """
        cursor.execute(query)
        ingenieros = cursor.fetchall()

        # Procesar los compresores
        for ingeniero in ingenieros:
            if ingeniero['compresores']:
                ingeniero['compresores'] = ingeniero['compresores'].split(',')
            else:
                ingeniero['compresores'] = []

        cursor.close()
        conn.close()

        return {"ingenieros": ingenieros}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching ingenieros: {str(e)}")


@web.post("/ingenieros", tags=["CRUD Admin"])
def create_ingeniero(
    name: str = Body(...),
    email: EmailStr = Body(...),
    compresores: List[int] = Body(default=[])
):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        # Insertar el ingeniero
        cursor.execute(
            "INSERT INTO ingenieros (name, email) VALUES (%s, %s)",
            (name, email)
        )
        ingeniero_id = cursor.lastrowid

        # Insertar las relaciones con compresores si existen
        if compresores and len(compresores) > 0:
            values = [(ingeniero_id, compresor_id) for compresor_id in compresores]
            cursor.executemany(
                "INSERT INTO ingeniero_compresor (ingeniero_id, compresor_id) VALUES (%s, %s)",
                values
            )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": ingeniero_id,
            "name": name,
            "email": email,
            "compresores": compresores
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating ingeniero: {str(e)}")