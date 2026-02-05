from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Routers existentes
from scripts.api.report import report
from scripts.api.web import web
from scripts.api.client import client
from scripts.api.compresores import compresores
from scripts.api.ordenes_servicio import ordenes
from scripts.api.modulos import modulos_web
from scripts.api.reportes_mtto import reportes_mtto
from scripts.api.mantenimiento import router as mantenimiento_router

# Nuevos routers modulares
from scripts.api.auth import auth
from scripts.api.ingenieros import ingenieros_router
from scripts.api.pressure import pressure
from scripts.api.prediction import prediction
from scripts.api.maintenance_web import maintenance_web
from scripts.api.reports_daily import reports_daily
from scripts.api.reports_weekly import reports_weekly
from scripts.api.reports_static import reports_static

# Load environment variables
load_dotenv()

app = FastAPI()

ALLOWED_ORIGINS = [
    "https://dashboard.ventologix.com",
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
]

# Apply custom access restriction middleware FIRST (before CORS)
@app.middleware("http")
async def restrict_public_access(request: Request, call_next):
    # Allow preflight requests to pass through for CORS
    if request.method == "OPTIONS":
        response = await call_next(request)
        return response
    
    origin = request.headers.get("origin") or request.headers.get("referer")
    
    if origin is None:
        client_host = request.client.host
        if client_host not in ("127.0.0.1", "localhost"):
            raise HTTPException(status_code=403, detail="Access forbidden")

    elif not any(origin.startswith(allowed) for allowed in ALLOWED_ORIGINS):
        raise HTTPException(status_code=403, detail="Access forbidden")

    response = await call_next(request)
    return response

# Apply CORS middleware AFTER custom middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(client)
app.include_router(compresores)
app.include_router(ordenes)
app.include_router(modulos_web)
app.include_router(reportes_mtto)
app.include_router(mantenimiento_router)

# Routers originales (mantener por compatibilidad)
app.include_router(report)
app.include_router(web)

# Nuevos routers modulares
app.include_router(auth)
app.include_router(ingenieros_router)
app.include_router(pressure)
app.include_router(prediction)
app.include_router(maintenance_web)
app.include_router(reports_daily)
app.include_router(reports_weekly)
app.include_router(reports_static)