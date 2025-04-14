# This script connects to a MySQL database using the mysql-connector-python library.
# It retrieves data from the 'clients' table and prints it to the console.
# It uses environment variables to store sensitive information like database credentials.
# Make sure to install the required libraries before running the script.

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

    # Query 1
    query_clients = "SELECT id_client, client_name, RFC FROM clients;"
    cursor.execute(query_clients)
    clients_data = cursor.fetchall()

    # Query 2
    query_sales = "SELECT id_sale, sale_amount, sale_date FROM sales;"
    cursor.execute(query_sales)
    sales_data = cursor.fetchall()

    # Prepare data for React (convert to dictionaries)
    clients_list = [
        {"id_client": row[0], "client_name": row[1], "RFC": row[2]}
        for row in clients_data
    ]

    sales_list = [
        {"id_sale": row[0], "sale_amount": row[1], "sale_date": row[2]}
        for row in sales_data
    ]

    print("Clients Data:", clients_list)
    print("Sales Data:", sales_list)

    cursor.close()
    connection.close()

except mysql.connector.Error as err:
    print(f"Error connecting to the database: {err}")
