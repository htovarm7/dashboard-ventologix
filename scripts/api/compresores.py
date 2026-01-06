from fastapi import FastAPI, Query, HTTPException, APIRouter
from fastapi.responses import JSONResponse

import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

compresores = APIRouter(prefix="/compresor", tags=["Compresores"])

@compresores.get("/all-compresores")
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
        
        return{
            res
        }
    except mysql.connector.Error as err:
        return{"error": str(err)}
