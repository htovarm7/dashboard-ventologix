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

reportes_mtto = APIRouter(prefix="/reporte_mtto", tags=["Reportes de Mantenimiento"])

@reportes_mtto.get("/status")
def get_reporte_status():
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE,
            host=DB_HOST
        )
        cursor = conn.connect()

        cursor.execute(
            """SELECT * 
            FROM reportes_status;
            """
        )

        res = cursor.fetchall()
        cursor.close()
        conn.close()

        if not res:
            return {"error": "Check connection to DB or the .env"}
        
        status = [
            {
                "folio": row[1],
                "pre_mantenimiento": row[2],
                "mantenimiento": row[3],
                "post_mantenimiento": row[4],
                "enviado": row[5],
            }
            for row in res
        ]

        return {
            "data": status
        }
    except mysql.connector.Error as err:
        return{"error": str(err)}

@reportes_mtto.get("/pre-mtto/{folio}")
def get_pre_answers(folio: str = Path(...,description="Folio del reporte"))
    try:
        
        return {}
    except mysql.connector.Error as err:
        return{"error": str(err)}