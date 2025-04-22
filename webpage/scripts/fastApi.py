from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Obtener credenciales de la base de datos desde las variables de entorno
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

@app.get("/api/pie-data")
def get_pie_data():
    try:
        # Conexión a la base de datos MySQL
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()
        cursor.execute("SELECT p.device_id, c.RFC, p.ua, p.ub FROM pruebas p INNER JOIN clientes c ON p.device_id = c.RFC;")
        result = cursor.fetchone()
        conn.close()
        if result:
            return {"data": list(result)}
        return {"data": [0, 0, 0]}
    except mysql.connector.Error as err:
        return {"error": str(err)}
