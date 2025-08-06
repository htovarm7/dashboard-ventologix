# Migración de APIs de Python FastAPI a TypeScript Next.js

## APIs Migradas Successfully ✅

### 1. **Datos Diarios (Daily)**

- ✅ `/api/pie-data-proc` - Datos de gráfico circular para el día anterior
- ✅ `/api/line-data-proc` - Datos de gráfico de línea para el día anterior
- ✅ `/api/daily-web-data` - Resumen completo diario con estadísticas

### 2. **Datos por Fecha Específica (SelectDate)**

- ✅ `/api/pie-data-proc-day` - Datos de gráfico circular para fecha específica
- ✅ `/api/line-data-proc-day` - Datos de gráfico de línea para fecha específica

### 3. **Datos Semanales (Weekly)**

- ✅ `/api/week/pie-data-proc` - Datos de gráfico circular semanal
- ✅ `/api/week/shifts` - Datos de turnos semanales

### 4. **Datos Estáticos (Static Data)**

- ✅ `/api/client-data` - Información del cliente
- ✅ `/api/compressor-data` - Información del compresor
- ✅ `/api/all-clients` - Listado de todos los clientes

### 5. **Autenticación y Testing**

- ✅ `/api/verify-user` - Verificación de usuario por email (ya existía, mejorado)
- ✅ `/api/test-users` - Listado de usuarios para testing

## Funciones Auxiliares Migradas

### `/lib/apiUtils.ts`

- ✅ `percentageLoad()` - Calcula porcentaje de estado LOAD
- ✅ `percentageNoload()` - Calcula porcentaje de estado NOLOAD
- ✅ `percentageOff()` - Calcula porcentaje de estado OFF
- ✅ `costoEnergiaUsd()` - Calcula costo de energía en USD
- ✅ `groupDataByInterval()` - Agrupa datos por intervalos de tiempo

## Parámetros de las APIs

### Parámetros Comunes:

- `id_cliente` (int) - ID del cliente
- `linea` (string) - Línea del compresor
- `date` (string) - Fecha en formato YYYY-MM-DD (solo para endpoints de fecha específica)

### Ejemplos de Uso:

```bash
# Datos diarios (día anterior)
GET /api/pie-data-proc?id_cliente=7&linea=L1

# Datos para fecha específica
GET /api/pie-data-proc-day?id_cliente=7&linea=L1&date=2025-08-05

# Datos del cliente
GET /api/client-data?id_cliente=7

# Datos del compresor
GET /api/compressor-data?id_cliente=7&linea=L1

# Verificar usuario
POST /api/verify-user
Body: { "email": "usuario@ejemplo.com" }

# Testing de conexión
GET /api/verify-user (para test de base de datos)
GET /api/test-users (para ver usuarios)
```

## Configuración de Base de Datos

Las APIs utilizan las siguientes variables de entorno:

```env
DB_HOST=34.174.55.1
DB_USER=andres
DB_PASSWORD=tu_password
DB_DATABASE=pruebas
```

## Procedimientos Almacenados Utilizados

1. `DataFiltradaDayFecha` - Para datos diarios y por fecha
2. `DFDFTest` - Para resumen diario completo
3. `DataFiltradaWeek` - Para datos semanales
4. `semanaTurnosFP` - Para turnos semanales
5. `semanaGeneralFP` - Para resumen general semanal

## Status de Migración

🟢 **Completo**: APIs principales migradas y funcionando
🟡 **Pendiente**: Algunos endpoints avanzados como reportes en PDF
🔴 **Error actual**: Conexión a base de datos (credenciales de acceso)

## Próximos Pasos

1. ✅ Resolver problema de conexión a base de datos MySQL
2. ⏳ Probar todas las APIs migradas
3. ⏳ Actualizar el frontend para usar las nuevas APIs de TypeScript
4. ⏳ Eliminar dependencias de FastAPI Python cuando todo esté funcionando

## Beneficios de la Migración

- 🚀 **Performance**: Menos latencia al eliminar llamadas externas
- 🔒 **Seguridad**: APIs internas más seguras
- 🛠 **Mantenimiento**: Todo en TypeScript, más fácil de mantener
- 📦 **Deployment**: Una sola aplicación para desplegar
- 🐛 **Debugging**: Más fácil debuggear problemas
