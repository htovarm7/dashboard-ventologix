# To run thio docker file run the following command:
    
# sudo docker build -t vento .

FROM python:3.13

CMD ["bash", "-c", "playwright install && bash"]

# Instalar dependencias necesarias para Playwright y navegadores
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        libgstreamer1.0-0 \
        libgtk-4-1 \
        libgraphene-1.0-0 \
        libwoff1 \
        libvpx7 \
        libopus0 \
        gstreamer1.0-plugins-base \
        gstreamer1.0-plugins-good \
        gstreamer1.0-plugins-bad \
        gstreamer1.0-libav \
        gstreamer1.0-tools \
        libflite1 \
        libavif15 \
        libharfbuzz-icu0 \
        libenchant-2-2 \
        libsecret-1-0 \
        libhyphen0 \
        libgles2-mesa && \
    rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar todo el repo dentro del contenedor
COPY . /app

# Actualizar pip e instalar dependencias (incluye playwright)
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Instalar navegadores de Playwright
RUN playwright install

# Por defecto ejecutar bash
CMD ["bash"]
