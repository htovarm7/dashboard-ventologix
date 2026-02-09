# 🐳 RTU Stack - Docker Deployment

Sistema Docker para correr **acrel.py**, **pressure.py** y **mqtt_to_mysql.py** en paralelo de forma persistente en VM `ventologix3` (Container-Optimized OS).

---

## 📋 Servicios

El stack incluye **3 scripts Python** corriendo simultáneamente:

| Servicio             | Descripción            | Tópico MQTT                    | Tabla BD         |
| -------------------- | ---------------------- | ------------------------------ | ---------------- |
| **acrel**            | Listener Acrel ADW300  | `ADW300/TEST1`                 | `pruebas`, `hoy` |
| **pressure**         | Listener RTU dinámico  | Múltiples (desde `RTU_device`) | `RTU_datos`      |
| **mqtt_to_mysql**    | Listener MQTT genérico | Configurable via `MQTT_TOPIC`  | `pruebas`, `hoy` |

---

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

✅ **Listo!** Los 3 servicios están corriendo y recolectando datos.

---

## ⚙️ Configuración `.env`

El archivo `.env` en el root del proyecto debe contener:

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

# Ver uso de recursos
docker stats rtu-stack
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

---

## 🔧 Troubleshooting

### Servicio en estado FATAL o no inicia

```bash
# Ver el error específico del servicio
docker exec -it rtu-stack supervisorctl tail acrel stderr
docker exec -it rtu-stack supervisorctl tail pressure stderr
docker exec -it rtu-stack supervisorctl tail mqtt_to_mysql stderr

# Ver estado actual
docker exec -it rtu-stack supervisorctl status

# Reiniciar el servicio problemático
docker exec -it rtu-stack supervisorctl restart acrel
```

### Error de conexión a base de datos

```bash
# Verificar .env
cat .env | grep DB_

# Probar conectividad
docker exec -it rtu-stack ping -c 3 $DB_HOST

# Verificar puerto MySQL
docker exec -it rtu-stack nc -zv $DB_HOST 3306
```

### Error de conexión MQTT

```bash
# Verificar .env
cat .env | grep MQTT_

# Probar conectividad
docker exec -it rtu-stack ping -c 3 $MQTT_BROKER

# Probar conexión MQTT (requiere instalar mosquitto-clients)
docker exec -it rtu-stack bash -c "apt update && apt install -y mosquitto-clients && mosquitto_sub -h $MQTT_BROKER -p $MQTT_PORT -t '#' -C 5"
```

### Entrar al container para debugging

```bash
# Shell interactivo
docker exec -it rtu-stack bash

# Dentro del container:
supervisorctl status        # Ver estado de servicios
supervisorctl restart all   # Reiniciar todos
tail -f /var/log/supervisor/*.log  # Ver logs
```

---

## 🎯 Comandos Útiles

```bash
# Ver procesos internos
docker top rtu-stack

# Inspeccionar configuración del container
docker inspect rtu-stack

# Backup de logs
tar -czf logs-backup-$(date +%Y%m%d-%H%M%S).tar.gz logs/

# Limpiar logs rotados viejos
docker exec -it rtu-stack find /var/log/supervisor -name "*.log.*" -delete

# Ver variables de entorno cargadas
docker exec -it rtu-stack env | grep -E "(DB_|MQTT_)"
```

---

## 📝 Estructura del Proyecto

```
dashboard-ventologix/
├── .env                      # ⚠️ Configuración (ESTE SE USA)
├── Dockerfile                # Imagen Docker del stack
├── supervisord.conf          # Configuración de supervisor
├── requirements_docker.txt   # Dependencias Python (solo RTU scripts)
├── logs/                     # Logs persistentes (auto-creado)
│   ├── acrel.out.log
│   ├── acrel.err.log
│   ├── pressure.out.log
│   ├── pressure.err.log
│   ├── mqtt_to_mysql.out.log
│   └── mqtt_to_mysql.err.log
└── scripts/VM/
    ├── acrel.py             # Script Acrel ADW300
    ├── pressure.py          # Script RTU dinámico
    └── mqtt_to_mysql.py     # Script MQTT genérico
```

---

## 📌 Notas Importantes

- ✅ Los 3 servicios se reinician automáticamente si fallan (gestionado por supervisor)
- ✅ El container se reinicia automáticamente con `--restart unless-stopped`
- ✅ Los logs se rotan automáticamente (máx 10MB por archivo, 10 backups)
- ✅ Se usa `--network host` para acceso directo a MySQL y MQTT broker
- ⚠️ Verifica que las credenciales en `.env` sean correctas antes de levantar
- ⚠️ Container-Optimized OS requiere `docker run` en lugar de `docker-compose`
- ⚠️ Los logs persisten en `./logs/` del host incluso si eliminas el container

---

## 🆘 Soporte

Si encuentras problemas:

1. **Ver logs:** `docker logs -f rtu-stack`
2. **Estado de servicios:** `docker exec -it rtu-stack supervisorctl status`
3. **Verificar .env:** `cat .env`
4. **Ver errores específicos:** `tail -f logs/*.err.log`
5. Contacta al equipo de desarrollo con los logs

---

## 📖 Referencia Rápida

```bash
# Ciclo de vida del stack
docker build -t ventologix_rtu-stack .     # Build
docker start rtu-stack                      # Iniciar
docker stop rtu-stack                       # Detener
docker restart rtu-stack                    # Reiniciar
docker logs -f rtu-stack                    # Ver logs

# Gestión de servicios internos
docker exec -it rtu-stack supervisorctl status              # Estado
docker exec -it rtu-stack supervisorctl restart <servicio>  # Reiniciar uno
docker exec -it rtu-stack supervisorctl restart all         # Reiniciar todos

# Servicios disponibles: acrel, pressure, mqtt_to_mysql
```
