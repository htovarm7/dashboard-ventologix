from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from scripts.api.reportApi import report
from scripts.api.webApi import web

# Load environment variables
load_dotenv()

app = FastAPI()

# Solo tu dashboard y entornos de prueba locales
ALLOWED_ORIGINS = [
    "https://dashboard.ventologix.com",
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
]

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Middleware de verificación de origen
@app.middleware("http")
async def restrict_public_access(request: Request, call_next):
    origin = request.headers.get("origin") or request.headers.get("referer")
    
    # Permite llamadas locales (por ejemplo, scripts internos o PM2 en localhost)
    if origin is None:
        client_host = request.client.host
        if client_host not in ("127.0.0.1", "localhost"):
            raise HTTPException(status_code=403, detail="Access forbidden")

    elif not any(origin.startswith(allowed) for allowed in ALLOWED_ORIGINS):
        raise HTTPException(status_code=403, detail="Access forbidden")

    response = await call_next(request)
    return response

# Incluir routers
app.include_router(report)
app.include_router(web)