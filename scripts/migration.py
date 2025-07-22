import mysql.connector
import pandas as pd
from google.cloud import bigquery
from dotenv import load_dotenv
import os

load_dotenv()

# MySQL Configuración
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

MYSQL_CONFIG = {
    'host': DB_HOST,
    'user': DB_USER,
    'password': DB_PASSWORD,
    'database': DB_NAME
}

# BigQuery Configuración
PROJECT_ID = 'tu-proyecto'
DATASET_ID = 'tu_dataset'  # Ya debe existir
client = bigquery.Client(project=PROJECT_ID)

def obtener_tablas_mysql():
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES;")
    tablas = [fila[0] for fila in cursor.fetchall()]
    cursor.close()
    conn.close()
    return tablas

def obtener_datos_tabla(nombre_tabla):
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    df = pd.read_sql(f"SELECT * FROM {nombre_tabla}", conn)
    conn.close()
    return df

def subir_tabla_a_bigquery(nombre_tabla, df):
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{nombre_tabla}"

    job_config = bigquery.LoadJobConfig(
        write_disposition="WRITE_TRUNCATE",  # reemplaza cada vez
        autodetect=True
    )

    job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
    job.result()
    print(f"✅ Migrada tabla: {nombre_tabla} ({len(df)} filas)")

def migrar_base_de_datos():
    tablas = obtener_tablas_mysql()
    for tabla in tablas:
        print(f"🔄 Procesando tabla: {tabla}")
        df = obtener_datos_tabla(tabla)
        if not df.empty:
            subir_tabla_a_bigquery(tabla, df)
        else:
            print(f"⚠️ Tabla {tabla} está vacía, se omitió.")

if __name__ == "__main__":
    migrar_base_de_datos()
