# 🐳 RTU Stack - Docker Deployment

Sistema Docker para correr **acrel.py**, **pressure.py** y **mqtt_to_mysql.py** en paralelo de forma persistente en VM `ventologix3` (Container-Optimized OS).

## 🚀 Quick Start

```bash
# 1. Ir al directorio del proyecto
cd ~/Ventologix

# 2. Verificar configuración
cat .env

# 3. Construir y levantar
docker build -t ventologix_rtu-stack .
docker run -d \
  --name rtu-stack \
  --env-file .env \
  --network host \
  -v $(pwd)/logs:/var/log/supervisor \
  --restart unless-stopped \
  ventologix_rtu-stack

# 4. Verificar que está corriendo
docker logs -f rtu-stack
```

## 🎛️ Operaciones Diarias

### Control del Stack

```bash
# Ver logs en tiempo real
docker logs -f rtu-stack

# Ver logs filtrados por servicio
docker logs -f rtu-stack | grep acrel
docker logs -f rtu-stack | grep pressure
docker logs -f rtu-stack | grep mqtt_to_mysql

# Detener el stack
docker stop rtu-stack

# Iniciar el stack (si ya existe)
docker start rtu-stack

# Reiniciar el stack completo
docker restart rtu-stack
```

### Gestión de Servicios Individuales

```bash
# Enumerar servicios y su estado
docker exec -it rtu-stack supervisorctl status

# Output esperado:
# acrel                            RUNNING   pid 10, uptime 0:05:23
# pressure                         RUNNING   pid 11, uptime 0:05:23
# mqtt_to_mysql                    RUNNING   pid 12, uptime 0:05:23

# Reiniciar SOLO un servicio específico
docker exec -it rtu-stack supervisorctl restart acrel          # Solo Acrel ADW300
docker exec -it rtu-stack supervisorctl restart pressure       # Solo RTU dinámico
docker exec -it rtu-stack supervisorctl restart mqtt_to_mysql  # Solo MQTT genérico
docker exec -it rtu-stack supervisorctl restart all            # Reiniciar todos
```

### Monitoreo de Logs

```bash
# Logs desde el container (todos los servicios)
docker logs -f rtu-stack

# Logs individuales desde archivos persistentes
tail -f logs/acrel.out.log
tail -f logs/pressure.out.log
tail -f logs/mqtt_to_mysql.out.log

# Ver solo errores
tail -f logs/*.err.log
```

---

## 🔄 Actualización de Código

Cuando modifiques scripts Python o configuración:

```bash
# 1. Detener y eliminar el container
docker stop rtu-stack && docker rm rtu-stack

# 2. Reconstruir la imagen
docker build --no-cache -t ventologix_rtu-stack .

# 3. Levantar de nuevo
docker run -d \
  --name rtu-stack \
  --env-file .env \
  --network host \
  -v $(pwd)/logs:/var/log/supervisor \
  --restart unless-stopped \
  ventologix_rtu-stack

# 4. Verificar
docker logs -f rtu-stack
```