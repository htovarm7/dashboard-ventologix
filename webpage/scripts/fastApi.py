"""
 * @file fastApi.py
 * @date 23/04/2025
 * @author Hector Tovar
 * 
 * @description
 * This file implements fetch data from the database using a FastAPI server and MySQL connector.
 * Based on the data fetched, it returns the data and its stored then sendend to the graphs
 * @version 1.0

"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Get database credentials from environment variables
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

@app.get("/api/pie-data")
def get_pie_data():
    try:
        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()
        # Execute SQL query to fetch data
        cursor.execute("SELECT p.device_id, c.RFC, p.ua, p.ub FROM pruebas p INNER JOIN clientes c ON p.device_id = c.RFC;")
        result = cursor.fetchone()
        conn.close()
        # Return the result if data is found
        if result:
            return {"data": list(result)}
        # Return default data if no result is found
        return {"data": [0, 0, 0]}
    except mysql.connector.Error as err:
        # Return error message in case of a database error
        return {"error": str(err)}
