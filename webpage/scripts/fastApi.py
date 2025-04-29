"""
 * @file fastApi.py
 * @date 23/04/2025
 * @author Hector Tovar
 * 
 * @description
 * This file implements fetching data from the database using a FastAPI server and MySQL connector.
 * Based on the data fetched, it returns the data, which is then sent to the graphs.
 * @version 1.0

"""

"""
* @Observations:
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

@app.get("/api/pie-data-proc")
def get_pie_data_proc():
    try:
        # Connect to DB
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Call the stored procedure
        cursor.execute("call DataFiltradaDay(7,7,'A')")

        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()
        
        if not results:
            return {"error": "No data from procedure"}

        # Map the results (adjust column names)
        data = [
            {"time": row[1], "estado": row[3], "estado_anterior": row[4]}
            for row in results
        ]

        # Calculate percentages
        load_percentage = percentage_load(data)
        noload_percentage = percentage_noload(data)
        off_percentage = percentage_off(data)

        return{
            "data": {
                "LOAD": load_percentage,
                "NOLOAD": noload_percentage,
                "OFF": off_percentage
            }
        }

    except mysql.connector.Error as err:
        return {"error": str(err)}
    
def percentage_load(data):
    load_records = [record for record in data if record['estado'] == "LOAD"]
    total_load = len(load_records)
    total_records = len(data)
    return (total_load / total_records) * 100 if total_records > 0 else 0

def percentage_noload(data):
    noload_records = [record for record in data if record['estado'] == "NOLOAD"]
    total_noload = len(noload_records)
    total_records = len(data)
    return (total_noload / total_records) * 100 if total_records > 0 else 0

def percentage_off(data):
    off_records = [record for record in data if record['estado'] == "OFF"]
    total_off = len(off_records)
    total_records = len(data)
    return (total_off / total_records) * 100 if total_records > 0 else 0

@app.get("/api/line-data")
def get_line_data():
    try:
        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Execute query to fetch data from TempConEstadoAnterior on January 12, 2025
        cursor.execute("""
            SELECT time, estado, corriente
            FROM TempConEstadoAnterior
            WHERE DATE(time) = '2025-01-12'
        """)

        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        # Check if results are fetched correctly
        if not results:
            return {"error": "No data found for the specified date."}

        # Convert results into a list of dictionaries
        data = [
            {"time": row[0], "estado": row[1], "corriente": row[2]}
            for row in results
        ]

        # Verify data before processing
        print(f"Data fetched from database: {data}")

        return {
            "data": data
        }

    except mysql.connector.Error as err:
        # Return error message in case of database error
        return {"error": str(err)}

@app.get("/api/gauge-data")
def get_gauge_data():
    try:
        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()

        # Execute query to fetch data from TempConEstadoAnterior on January 12, 2025
        cursor.execute("""
            SELECT time, estado, corriente
            FROM TempConEstadoAnterior
            WHERE DATE(time) = '2025-01-12'
        """)

        results = cursor.fetchall()

        # Close resources
        cursor.close()
        conn.close()

        # Check if results are fetched correctly
        if not results:
            return {"error": "No data found for the specified date."}

        # Convert results into a list of dictionaries
        data = [
            {"time": row[0], "estado": row[1], "corriente": row[2]}
            for row in results
        ]

        # Verify data before processing
        print(f"Data fetched from database: {data}")

        return {
            "data": data
        }

    except mysql.connector.Error as err:
        # Return error message in case of database error
        return {"error": str(err)}
    
    def gauge_equivalent_usage_percentage(current_equivalent_hp, installed_hp):
        # Calculate usage percentage
        usage_percentage = (current_equivalent_hp / installed_hp) * 100 if installed_hp > 0 else 0

        # Adjust the needle value
        needle = (
            30 if usage_percentage < 30 else
            120 if usage_percentage > 120 else
            usage_percentage
        )

        return needle

"""

Functions to calculate the percentage of LOAD, NOLOAD, and OFF states from POWERBI
def percentage_load(data):
    # Filter records where estado is not "OFF"
    no_off_records = [record for record in data if record['estado'] != "OFF"]

    if not no_off_records:
        return 0  # Return 0 if no records are found

    # Get the first and last timestamps where estado is not "OFF"
    first_no_off_record = min(no_off_records, key=lambda x: x['time'])['time']
    last_no_off_record = max(no_off_records, key=lambda x: x['time'])['time']

    # Filter records within the range of the first and last timestamps
    range_records = [
        record for record in no_off_records
        if first_no_off_record <= record['time'] <= last_no_off_record
    ]

    # Count records where estado is "LOAD"
    total_load = sum(1 for record in range_records if record['estado'] == "LOAD")
    total_range_records = len(range_records)

    # Calculate percentage
    return (total_load / total_range_records) * 100 if total_range_records > 0 else 0


def percentage_noload(data):
    # Filter records where estado is not "OFF"
    no_off_records = [record for record in data if record['estado'] != "OFF"]

    if not no_off_records:
        return 0  # Return 0 if no records are found

    # Get the first and last timestamps where estado is not "OFF"
    first_no_off_record = min(no_off_records, key=lambda x: x['time'])['time']
    last_no_off_record = max(no_off_records, key=lambda x: x['time'])['time']

    # Filter records within the range of the first and last timestamps
    range_records = [
        record for record in no_off_records
        if first_no_off_record <= record['time'] <= last_no_off_record
    ]

    # Count records where estado is "NOLOAD"
    total_noload = sum(1 for record in range_records if record['estado'] == "NOLOAD")
    total_range_records = len(range_records)

    # Calculate percentage
    return (total_noload / total_range_records) * 100 if total_range_records > 0 else 0


def percentage_off(data):
    # Filter records where estado is not "OFF"
    no_off_records = [record for record in data if record['estado'] != "OFF"]

    if not no_off_records:
        return 0  # Return 0 if no records are found

    # Get the first and last timestamps where estado is not "OFF"
    first_no_off_record = min(no_off_records, key=lambda x: x['time'])['time']
    last_no_off_record = max(no_off_records, key=lambda x: x['time'])['time']

    # Filter records within the range of the first and last timestamps
    range_records = [
        record for record in no_off_records
        if first_no_off_record <= record['time'] <= last_no_off_record
    ]

    # Count records where estado is "OFF"
    total_off = sum(1 for record in range_records if record['estado'] == "OFF")
    total_range_records = len(range_records)

    # Calculate percentage
    return (total_off / total_range_records) * 100 if total_range_records > 0 else 0
"""