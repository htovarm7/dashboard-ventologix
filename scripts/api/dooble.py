from fastapi import APIRouter, HTTPException
import mysql.connector
import os
from dotenv import load_dotenv
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

load_dotenv()

dooble_router = APIRouter(prefix="/dooble", tags=["🤖 Dooble"])


def get_dooble_db_connection():
    """Conexión a la base de datos Dooble"""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database="Dooble",
    )


@dooble_router.get("/maquinas-por-cliente")
async def get_maquinas_por_cliente():
    """
    Obtiene todas las máquinas por cliente de la base de datos Dooble
    """
    conn = None
    cursor = None
    try:
        conn = get_dooble_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM maquinas_por_cliente")
        results = cursor.fetchall()
        
        # Convert datetime objects to strings for JSON serialization
        for row in results:
            for key, value in row.items():
                if isinstance(value, datetime):
                    row[key] = value.isoformat()
        
        return {
            "success": True,
            "data": results,
            "count": len(results)
        }
        
    except mysql.connector.Error as err:
        raise HTTPException(
            status_code=500,
            detail=f"Error de base de datos: {str(err)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error inesperado: {str(e)}"
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()