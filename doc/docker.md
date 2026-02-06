# 🐳 RTU Stack - Docker Deployment

Sistema Docker para correr **acrel.py**, **pressure.py** y **mqtt_to_mysql.py** en paralelo de forma persistente.

---

## 📋 Componentes

El stack incluye **3 scripts Python** corriendo simultáneamente:

| Script               | Descripción            | Tópico MQTT                    | Tabla BD         |
| -------------------- | ---------------------- | ------------------------------ | ---------------- |
| **acrel.py**         | Listener Acrel ADW300  | `ADW300/TEST1`                 | `pruebas`, `hoy` |
| **pressure.py**      | Listener RTU dinámico  | Múltiples (desde `RTU_device`) | `RTU_datos`      |
| **mqtt_to_mysql.py** | Listener MQTT genérico | Configurable via `MQTT_TOPIC`  | `pruebas`, `hoy` |

---

## ⚙️ Configuración

### 1. Verificar `.env` en el root del proyecto

El Docker usa el archivo `.env` que está en el root. Debe contener:

```env
# Base de Datos
DB_HOST=
DB_DATABASE=
DB_USER=
DB_PASSWORD=
DB_PORT=

# MQTT Broker
MQTT_BROKER=
MQTT_PORT=
MQTT_TOPIC=
```

---

## 🚀 Deployment

### Opción 1: Docker Compose (Recomendado)

```bash
# Construir y levantar el stack
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un script específico
docker-compose logs -f | grep acrel
docker-compose logs -f | grep pressure
docker-compose logs -f | grep mqtt_to_mysql

# Detener el stack
docker-compose down

# Reiniciar el stack
docker-compose restart
```

### Opción 2: Docker directo

```bash
# Build
docker build -t rtu-stack .

# Run
docker run -d \
  --name rtu-stack \
  --env-file .env \
  --network host \
  -v $(pwd)/logs:/var/log/supervisor \
  --restart unless-stopped \
  rtu-stack

# Ver logs
docker logs -f rtu-stack
```

---

## ⚠️ Ventologix3 VM (Container-Optimized OS)

**IMPORTANTE:** La VM `ventologix3` corre **Container-Optimized OS (COS)** de Google Cloud, que tiene un filesystem de **solo lectura**. No puedes instalar `docker-compose` directamente.

### Solución: Ejecutar docker-compose en un container

```bash
cd ~/Ventologix

# Ejecutar docker-compose desde un container
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD:$PWD" \
  -w "$PWD" \
  docker/compose:latest up -d
```

---

## 📊 Monitoreo

### Ver estado de los procesos dentro del container

```bash
# Entrar al container
docker exec -it rtu-stack bash

# Ver estado de supervisor
supervisorctl status

# Output esperado:
# acrel                            RUNNING   pid 10, uptime 0:05:23
# pressure                         RUNNING   pid 11, uptime 0:05:23
# mqtt_to_mysql                    RUNNING   pid 12, uptime 0:05:23
```

### Ver logs individuales

Los logs se guardan en `./logs/` en el host:

```bash
# Ver logs de acrel
tail -f logs/acrel.out.log

# Ver logs de pressure
tail -f logs/pressure.out.log

# Ver logs de mqtt_to_mysql
tail -f logs/mqtt_to_mysql.out.log

# Ver errores
tail -f logs/*.err.log
```

---

## 🔧 Troubleshooting

### Script no inicia o está en estado FATAL

```bash
# Ver el error específico
docker exec -it rtu-stack supervisorctl tail acrel stderr
docker exec -it rtu-stack supervisorctl tail pressure stderr
docker exec -it rtu-stack supervisorctl tail mqtt_to_mysql stderr
```

### Reiniciar un script individual

```bash
# Reiniciar solo acrel
docker exec -it rtu-stack supervisorctl restart acrel

# Reiniciar solo pressure
docker exec -it rtu-stack supervisorctl restart pressure

# Reiniciar solo mqtt_to_mysql
docker exec -it rtu-stack supervisorctl restart mqtt_to_mysql

# Reiniciar todos
docker exec -it rtu-stack supervisorctl restart all
```

### Error de conexión a base de datos

1. Verificar que `DB_HOST`, `DB_USER`, `DB_PASSWORD` en `.env` sean correctos
2. Verificar conectividad: `docker exec -it rtu-stack ping DB_HOST`
3. Verificar puerto: `docker exec -it rtu-stack telnet DB_HOST 3306`

### Error de conexión MQTT

1. Verificar que `MQTT_BROKER` y `MQTT_PORT` en `.env` sean correctos
2. Verificar conectividad: `docker exec -it rtu-stack ping MQTT_BROKER`
3. Probar conexión MQTT:
   ```bash
   docker exec -it rtu-stack bash
   apt update && apt install mosquitto-clients
   mosquitto_sub -h $MQTT_BROKER -p $MQTT_PORT -t "#"
   ```

---

## 🔄 Actualizar el código

```bash
# 1. Detener el stack
docker-compose down

# 2. Modificar los scripts Python si es necesario

# 3. Reconstruir la imagen
docker-compose build --no-cache

# 4. Levantar de nuevo
docker-compose up -d
```

---

## 📝 Estructura del proyecto

```
dashboard-ventologix/
├── .env                      # Configuración (ESTE SE USA)
├── Dockerfile                # Imagen Docker del stack
├── docker-compose.yml        # Orquestación
├── supervisord.conf          # Configuración de procesos
├── requirements.txt          # Dependencias Python (proyecto completo)
├── requirements_docker.txt   # Dependencias Python (solo RTU scripts)
├── logs/                     # Logs persistentes (creado automáticamente)
│   ├── acrel.out.log
│   ├── pressure.out.log
│   └── mqtt_to_mysql.out.log
└── scripts/VM/
    ├── acrel.py             # Script 1
    ├── pressure.py          # Script 2
    └── mqtt_to_mysql.py     # Script 3
```

---

## 🎯 Comandos útiles

```bash
# Ver uso de recursos
docker stats rtu-stack

# Ver procesos internos
docker top rtu-stack

# Ejecutar comando dentro del container
docker exec -it rtu-stack supervisorctl status

# Backup de logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# Limpiar logs viejos
docker exec -it rtu-stack find /var/log/supervisor -name "*.log.*" -delete
```

---

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica el estado: `docker exec -it rtu-stack supervisorctl status`
3. Revisa la configuración: `cat .env`
4. Contacta al equipo de desarrollo

---

## 📌 Notas importantes

- ✅ Los 3 scripts **se reinician automáticamente** si fallan
- ✅ El container se reinicia automáticamente con `restart: unless-stopped`
- ✅ Los logs se rotan automáticamente (máx 10MB por archivo)
- ✅ Se usa `network_mode: host` para acceso directo a servicios externos
- ⚠️ Asegúrate de que el `.env` tenga credenciales correctas
- ⚠️ Los scripts necesitan acceso de red a MySQL y MQTT broker

---

## 🚀 Quick Start

```bash
# 1. Verifica .env
cat .env

# 2. Levanta el stack
docker-compose up -d

# 3. Monitorea logs
docker-compose logs -f

# 4. Verifica estado
docker exec -it rtu-stack supervisorctl status
```

✅ **Listo!** Los 3 scripts están corriendo en paralelo y recolectando datos.
