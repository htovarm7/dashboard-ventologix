# ============================================
# Dockerfile para RTU Stack Completo
# Corre: acrel.py, pressure.py, mqtt_to_mysql.py
# ============================================
FROM python:3.11-slim

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Establecer directorio de trabajo
WORKDIR /app

# Copiar y instalar dependencias Python (solo las necesarias para RTU scripts)
COPY requirements_docker.txt .
RUN pip install --no-cache-dir -r requirements_docker.txt

# Copiar todos los scripts
COPY scripts/VM/acrel.py ./acrel.py
COPY scripts/VM/pressure.py ./pressure.py
COPY scripts/VM/mqtt_to_mysql.py ./mqtt_to_mysql.py

# Copiar archivo .env desde root
COPY .env .env

# Crear directorio para logs
RUN mkdir -p /var/log/supervisor

# Copiar configuración de supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Variables de entorno
ENV PYTHONUNBUFFERED=1

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD supervisorctl status | grep -E "(acrel|pressure|mqtt_to_mysql)" | grep RUNNING || exit 1

# Comando de inicio
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
