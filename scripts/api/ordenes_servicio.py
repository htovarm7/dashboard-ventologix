from fastapi import FastAPI, Path, HTTPException, APIRouter
from fastapi.responses import JSONResponse

from scripts.api.clases import Client

import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

ordenes = APIRouter(prefix="/ordenes", tags=["Ordenes de Servicio"])

# Get all clients
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
            "SELECT * FROM clientes"
        )

        res = cursor.fetchall()
        cursor.close()
        conn.close()

        if not res:
            return {"error": "Check connection to DB or the .env"}
        
        clients = [
            {
                "id_cliente": row[0],
                "numero_cliente": row[1],
                "nombre_cliente": row[2],
                "RFC": row[3],
                "direccion": row[4],
                "champion": row[5],
                "CostokWh": row[6],
                "demoDiario": row[7],
                "demoSemanal": row[8]

            }
            for row in res
        ]

        return{
            "data": clients
        }
    except mysql.connector.Error as err:
        return{"error": str(err)}
