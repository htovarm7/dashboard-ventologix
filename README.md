<img src="public/Ventologix_02.jpg" alt="Ventologix Logo" width="300">

# Ventologix Dashboard

Dashboard industrial IoT para monitoreo y gestion de sistemas de compresores de aire. Plataforma multi-tenant con control de acceso por roles, datos en tiempo real via MQTT, mantenimiento predictivo con IA y reportes automatizados.

## Tech Stack

| Capa | Tecnologia |
|------|-----------|
| **Frontend** | Next.js 16, React 18, TypeScript, Tailwind CSS 4 |
| **Estado** | Zustand 5 |
| **Graficas** | Chart.js, ECharts |
| **Animaciones** | Framer Motion |
| **Auth** | Auth0 (Google OAuth2) |
| **Backend** | FastAPI (Python) |
| **Base de datos** | MySQL |
| **IoT** | MQTT, Supervisor, Docker |
| **IA/ML** | LangChain, LangGraph, OpenAI |
| **PDF** | html2pdf.js, jsPDF, Puppeteer |
| **Notificaciones** | SMTP (email), Twilio (WhatsApp) |

## Estructura del Proyecto

```
dashboard-ventologix/
├── app/                          # Next.js App Router
│   ├── (routes)/                 # Rutas protegidas
│   │   ├── home/                 # Dashboard principal
│   │   ├── admin-view/           # Panel de administrador de cliente (rol 3)
│   │   ├── clients/              # CRUD de clientes
│   │   ├── compresors-vto/       # Gestion de compresores y dispositivos VTO
│   │   ├── add-RTU/              # Registro de sensores RTU de presion
│   │   ├── modules/              # Configuracion de modulos por cliente
│   │   ├── features/
│   │   │   ├── compressor-maintenance/  # Modulo de mantenimiento
│   │   │   │   ├── maintenance/         # Programar mantenimientos
│   │   │   │   ├── reports/             # Ver reportes de mantenimiento
│   │   │   │   ├── views/               # Vistas y generacion de PDF
│   │   │   │   └── technician/          # Interfaz de tecnicos
│   │   │   ├── consumption-kwh/         # Consumo energetico (kWh)
│   │   │   ├── prediction/              # Predicciones con IA
│   │   │   └── pressure/               # Monitoreo de presion
│   │   ├── graphsDateDay/        # Graficas diarias
│   │   ├── graphsDateWeek/       # Graficas semanales
│   │   ├── reportesDate/         # Reportes por fecha
│   │   ├── reportesDateS/        # Reportes resumen
│   │   ├── reportesM/            # Reportes mensuales
│   │   └── automation/           # Reportes automatizados
│   │       ├── mtto-report/      # Reportes de mantenimiento
│   │       ├── reportesD/        # Reportes diarios
│   │       └── reportesS/        # Reportes semanales
│   ├── layout.tsx                # Layout raiz con Auth0 provider
│   └── page.tsx                  # Pagina de login
│
├── components/                   # Componentes reutilizables
│   ├── auth-provider.tsx         # Wrapper de Auth0
│   ├── sideBar.tsx               # Sidebar con menu dinamico por rol
│   ├── navBar.tsx                # Barra de navegacion superior
│   ├── CompressorSearch.tsx      # Busqueda y seleccion de compresores
│   ├── MaintenanceForm.tsx       # Formulario de mantenimiento
│   ├── MaintenanceStatusCard.tsx # Tarjeta de estado de mantenimiento
│   ├── PhotoUploadSection.tsx    # Subida de fotos
│   ├── CustomDialog.tsx          # Dialogo reutilizable
│   ├── DateNavigator.tsx         # Navegacion por fechas
│   ├── LoadingOverlay.tsx        # Overlay de carga
│   ├── printPageButton.tsx       # Exportar a PDF
│   └── motion-transitions.tsx    # Configuraciones de Framer Motion
│
├── hooks/                        # Custom React hooks
│   ├── useAuthCheck.ts           # Verificacion de autenticacion
│   ├── useDialog.ts              # Manejo de dialogos
│   ├── usePhotoUpload.ts         # Subida de fotos
│   ├── usePreMantenimiento.ts    # Datos pre-mantenimiento
│   └── usePostMantenimiento.ts   # Datos post-mantenimiento
│
├── lib/                          # Tipos y utilidades
│   ├── types.ts                  # Definiciones de tipos TypeScript
│   └── credentials.json          # Credenciales Google Drive
│
├── scripts/                      # Backend FastAPI (Python)
│   ├── api_server.py             # Servidor principal FastAPI
│   ├── api/                      # Routers de la API
│   │   ├── clients.py            # Endpoints de clientes
│   │   ├── compresores.py        # Endpoints de compresores
│   │   ├── vto.py                # Endpoints de dispositivos VTO
│   │   ├── ordenes.py            # Endpoints de ordenes de servicio
│   │   ├── modulos.py            # Endpoints de modulos
│   │   ├── maintenance.py        # Endpoints de mantenimiento
│   │   ├── reportes_mtto.py      # Endpoints de reportes de mtto
│   │   ├── ingenieros.py         # Endpoints de ingenieros
│   │   ├── pressure.py           # Endpoints de presion
│   │   ├── prediction.py         # Endpoints de prediccion
│   │   ├── reports_daily.py      # Endpoints de reportes diarios
│   │   ├── reports_weekly.py     # Endpoints de reportes semanales
│   │   ├── reports_static.py     # Endpoints de reportes estaticos
│   │   ├── web.py                # Endpoints generales web
│   │   ├── web_usuarios.py       # Endpoints de usuarios
│   │   └── db_utils.py           # Utilidades (conversion presion, kWh, Six Sigma)
│   ├── acrel.py                  # Listener MQTT para medidores Acrel
│   ├── pressure.py               # Listener MQTT para RTU de presion
│   └── mqtt_to_mysql.py          # Puente MQTT → MySQL
│
├── VTO-AI/                       # Modulo de IA (LangGraph)
├── config/                       # Archivos de configuracion
├── data/                         # Datos estaticos (recipients.json)
├── public/                       # Assets estaticos
├── docker-compose.yml            # Orquestacion Docker
├── Dockerfile                    # Imagen para servicios RTU
└── supervisord.conf              # Gestion de procesos RTU
```

## Endpoints de la API

Base URL: `http://127.0.0.1:8000`

### Clientes (`/clients`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/clients/` | Obtener todos los clientes |
| GET | `/clients/eventuales` | Obtener clientes eventuales |
| POST | `/clients/` | Crear cliente |
| PUT | `/clients/{id}` | Actualizar cliente |
| DELETE | `/clients/{id}` | Eliminar cliente |

### Compresores (`/compresores`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/compresores/` | Obtener todos los compresores |
| GET | `/compresores/{numero_cliente}` | Compresores de un cliente |
| POST | `/compresores/` | Crear compresor |
| PUT | `/compresores/{id}` | Actualizar compresor |
| DELETE | `/compresores/{id}` | Eliminar compresor |

### Dispositivos VTO (`/vto`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/vto/` | Listar todos los dispositivos VTO |
| GET | `/vto/{dispositivo_id}` | Obtener dispositivo especifico |
| POST | `/vto/` | Crear dispositivo |
| POST | `/vto/bulk` | Creacion masiva de dispositivos |
| PUT | `/vto/{id}` | Actualizar dispositivo |
| DELETE | `/vto/{id}` | Eliminar dispositivo |

### Ordenes de Servicio (`/ordenes`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/ordenes/` | Obtener todas las ordenes |
| GET | `/ordenes/{folio}` | Obtener orden por folio |
| POST | `/ordenes/` | Crear orden de servicio |
| PUT | `/ordenes/{folio}` | Actualizar orden |
| DELETE | `/ordenes/{folio}` | Eliminar orden |

### Modulos (`/modulos`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/modulos/{numero_cliente}` | Modulos habilitados del cliente |
| PUT | `/modulos/{numero_cliente}` | Activar/desactivar modulos |

### Usuarios (`/web/usuarios`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/web/usuarios/{email}` | Obtener usuario por email |
| PUT | `/web/usuarios/update-client-number` | Actualizar numero de cliente del usuario |

### Ingenieros (`/ingenieros`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/ingenieros/` | Listar ingenieros |
| POST | `/ingenieros/` | Crear ingeniero |
| PUT | `/ingenieros/{id}` | Actualizar ingeniero |
| DELETE | `/ingenieros/{id}` | Eliminar ingeniero |

### Mantenimiento (`/maintenance`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/maintenance/` | Obtener registros de mantenimiento |
| POST | `/maintenance/` | Crear registro de mantenimiento |
| PUT | `/maintenance/{id}` | Actualizar registro |

### Reportes de Mantenimiento (`/reportes_mtto`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/reportes_mtto/` | Obtener reportes de mantenimiento |
| POST | `/reportes_mtto/` | Crear reporte |

### Presion (`/pressure`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/pressure/` | Datos de presion en tiempo real |

### Prediccion (`/prediction`)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/prediction/` | Datos de prediccion con IA |

### Reportes

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/reports_daily/` | Reportes diarios |
| GET | `/reports_weekly/` | Reportes semanales |
| GET | `/reports_static/` | Reportes estaticos |

## Base de Datos

Motor: **MySQL** | Base de datos: `pruebas`

### Tablas Principales

#### `clientes`
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id_cliente | INT | ID unico |
| numero_cliente | INT | Numero de cliente |
| nombre_cliente | VARCHAR | Nombre del cliente |
| RFC | VARCHAR | RFC fiscal |
| direccion | VARCHAR | Direccion |
| champion | VARCHAR | Contacto principal |
| CostokWh | DECIMAL | Costo por kWh |
| demoDiario | BOOLEAN | Demo reporte diario |
| demoSemanal | BOOLEAN | Demo reporte semanal |

#### `compresores`
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT PK | ID unico |
| hp | INT | Caballos de fuerza |
| tipo | ENUM | `tornillo` o `piston` |
| voltaje | INT | Voltaje |
| marca | VARCHAR | Marca del compresor |
| numero_serie | VARCHAR | Numero de serie |
| anio | INT | Ano de fabricacion |
| id_cliente | INT FK | Cliente propietario |
| Amp_Load / Amp_No_Load | INT | Amperaje con/sin carga |
| Alias | VARCHAR | Alias del compresor |
| fecha_ultimo_mtto | DATETIME | Ultimo mantenimiento |
| modelo | VARCHAR | Modelo |

#### `usuarios_auth`
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT PK | ID unico |
| email | VARCHAR | Email del usuario |
| numeroCliente | INT | Cliente asignado |
| rol | INT | Rol (0-4) |
| name | VARCHAR | Nombre |

#### `ordenes_servicio`
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| folio | VARCHAR PK | Folio unico |
| id_cliente | INT | Cliente |
| alias_compresor | VARCHAR | Alias del compresor |
| tipo_visita | VARCHAR | Tipo de visita |
| tipo_mantenimiento | VARCHAR | Tipo de mantenimiento |
| prioridad | ENUM | `baja`, `media`, `alta`, `urgente` |
| estado | ENUM | `no_iniciado`, `en_progreso`, `terminado`, `enviado` |
| fecha_programada | DATETIME | Fecha programada |
| reporte_url | VARCHAR | URL del reporte generado |

#### `modulos_web`
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| numero_cliente | INT | Cliente |
| mantenimiento | BOOLEAN | Modulo de mantenimiento |
| reporteDia | BOOLEAN | Reporte diario |
| reporteSemana | BOOLEAN | Reporte semanal |
| presion | BOOLEAN | Monitoreo presion |
| prediccion | BOOLEAN | Prediccion IA |
| kwh | BOOLEAN | Consumo kWh |

#### `dispositivo` (VTO)
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT PK | ID unico |
| id_kpm | VARCHAR | ID KPM del dispositivo |
| id_proyecto | INT | Proyecto asignado |
| id_cliente | INT FK | Cliente propietario |

#### `RTU_device` / `RTU_sensores` / `RTU_datos`
Tablas para gestion de sensores de presion RTU, almacenamiento de datos en tiempo real y configuracion de calibracion de sensores.

## Autenticacion y Roles

### Flujo de Auth
1. Login via **Auth0** con Google OAuth2
2. Callback con token al frontend
3. Se consulta `/web/usuarios/{email}` para obtener datos del usuario
4. Se almacena en `sessionStorage` junto con compresores y modulos
5. Redireccion segun rol

### Roles de Usuario

| Rol | Nombre | Acceso |
|-----|--------|--------|
| 0 | SuperAdmin | Acceso total, puede cambiar de cliente |
| 1 | Gerente VT | Gestion interna de Ventologix |
| 2 | VAST (Tecnico) | Interfaz de tecnico de campo |
| 3 | Gerente Cliente | Panel de administrador de cliente |
| 4 | Cliente | Acceso limitado a su informacion |

### Modulos por Cliente
Cada cliente tiene modulos activados/desactivados que controlan la visibilidad de features en el sidebar.

## Como Ejecutar

### Requisitos
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/downloads/) (3.11+)
- [Docker](https://www.docker.com/) (opcional, para servicios RTU)

### 1. Frontend (Next.js)

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

### 2. Backend (FastAPI)

```bash
pip install -r requirements.txt
uvicorn scripts.api_server:app --reload
```

Documentacion interactiva en [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Servicios RTU (Docker)

```bash
docker-compose up -d
```

Levanta 3 servicios gestionados por Supervisor:
- **acrel.py** - Listener MQTT para medidores Acrel
- **pressure.py** - Listener MQTT para sensores RTU de presion
- **mqtt_to_mysql.py** - Puente MQTT a MySQL

### Variables de Entorno

Crear un archivo `.env` en la raiz con:

```env
# Auth0
NEXT_PUBLIC_AUTH0_DOMAIN=<auth0-domain>
NEXT_PUBLIC_AUTH0_CLIENT_ID=<auth0-client-id>

# API
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
API_SECRET=<api-secret>

# Base de datos
DB_HOST=<db-host>
DB_DATABASE=<db-name>
DB_USER=<db-user>
DB_PASSWORD=<db-password>

# MQTT
MQTT_BROKER=<mqtt-broker-ip>
MQTT_PORT=1883

# SMTP
SMTP_PASSWORD=<smtp-password>

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=<twilio-sid>
TWILIO_AUTH_TOKEN=<twilio-token>
```
