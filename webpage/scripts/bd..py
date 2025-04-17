"""
@file bd.py
@date 13/04/2025
@author Hector Tovar

@description
This script connects to a MySQL database using the mysql-connector-python library.
It retrieves data from the 'clients' table and the 'sales' table, and prints it to the console.
It uses environment variables to store sensitive information like database credentials.
Make sure to install the required libraries before running the script.

@version 1.0
"""

from dotenv import load_dotenv
import os
import mysql.connector

try:
    load_dotenv()

    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )
    print("Connection successful")

    cursor = connection.cursor()

    # Query 1: Retrieve data from the 'clients' table
    # query_clients = "SELECT id_cliente, nombre_cliente, RFC FROM clientes;"
    # cursor.execute(query_clients)
    # clients_data = cursor.fetchall()
    
    """
    Query 2.1: Retrieve data from the 'pruebas' table and connection with device_id = RFC from clients table
    The client id is the RFC from client and its paired with the device_id in the pruebas table also it has ua ub uc ia ib ic as data from the pruebas table
    """
    #query_device = "SELECT p.device_id, c.RFC, p.ua, p.ub FROM pruebas p INNER JOIN clientes c ON p.device_id = c.RFC;"
    
    """
    Query 2.2: Retrieve data from the 'pruebas' table only ua ub uc ia ib ic
    Dictionary
    Motor trifasico
    Trabajan con ia, ib, ic
    """
    
    query_device = "SELECT device_id, ua, ub, uc, ia, ib, ic FROM pruebas;"
    cursor.execute(query_device)
    device_data = cursor.fetchall()
    
    if not device_data:
        print("No data found. Please check your database table structure and column names.")

    # Prepare data for React (convert to dictionaries)
    # clients_list = [
    #     {"id_client": row[0], "client_name": row[1], "RFC": row[2]}
    #     for row in clients_data
    # ]

    device_list = [
        {"device_id": row[0], "ua": row[1], "ub": row[2]}
        for row in device_data
    ]

    # print("Clients Data:", clients_list)
    print("Device Data:", device_list)

    cursor.close()
    connection.close()

except mysql.connector.Error as err:
    print(f"Error connecting to the database: {err}")