from fastapi import FastAPI, Path, HTTPException, APIRouter
from fastapi.responses import JSONResponse

import mysql.connector
import os
from dotenv import load_dotenv

from .clases import Compresor

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
            "SELECT * FROM compresores"
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
                "fecha_utlimo_mtto": row[14]
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
    
# Add Compresor
# @compresores.post("/")
# def create_compresor(request: Compresor):
#     try:
#         conn = mysql.connector.connect(
#             host=DB_HOST,
#             user=DB_USER,
#             password=DB_PASSWORD,
#             database=DB_DATABASE
#         )
#         cursor = conn.cursor(dictionary=True)

#         cursor.execute(
#             "SELECT id FROM compresores "
#         )