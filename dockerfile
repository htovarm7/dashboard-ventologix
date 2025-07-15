FROM python:3.11-slim

WORKDIR /app

# Copia el archivo requirements.txt primero para aprovechar el cache de Docker
COPY requirements.txt /app/

# Instala las dependencias listadas en requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del código
COPY ./scripts/mqtt_to_mysql.py /app/
# Si tienes más archivos o carpetas, agrégalos también aquí:
# COPY ./scripts/ /app/

CMD ["python", "mqtt_to_mysql.py"]
