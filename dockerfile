# Imagen base con Python
FROM python:3.13

# Instalar dependencias necesarias para Playwright y navegadores
RUN apt-get update && apt-get install -y \
    wget curl gnupg \
    libnss3 libatk-bridge2.0-0 libx11-xcb1 libgtk-3-0 libasound2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpangocairo-1.0-0 libcups2 libxss1 libxshmfence1 libxtst6 libatspi2.0-0 libdrm2 libepoxy0 && \
    rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar todo el repo dentro del contenedor
COPY . /app

# Actualizar pip e instalar dependencias (incluye playwright)
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Instalar navegadores de Playwright
RUN python -m playwright install

# Por defecto ejecutar tu app o abrir shell
CMD ["bash"]
