"""
 * @file fastApi.py
 * @date 23/04/2025
 * @author Hector Tovar
 * 
 * @description
 * This file implements fetching data from the database using a FastAPI server and MySQL connector.
 * Based on the data fetched, it returns the data, which is then sent to the graphs.
 * @version 1.0

"""

"""
* @Observations:
* 1. To run the API, use the command:
* uvicorn scripts.api_server:app --reload
* To check the API response, you can use the following URL:
* http://127.0.0.1:8000/docs
* For PENOX use device_id = 7
* If the API is not updating, check the following:
* 1. Run in terminal:
    tasklist | findstr python
* 2. If the process is running, kill it using:
    taskkill /F /PID <PID>
* 3. Where <PID> is the process ID obtained from the previous command, which in this case is 18168.
    python.exe                   18168 Console                    1    67,276 KB
* 4. Run the API again using:
"""

from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated


import os
from dotenv import load_dotenv

from scripts.api.reportApi import report
from scripts.api.webApi import web

# Load environment variables
load_dotenv()

app = FastAPI()
API_SECRET_KEY = os.getenv("API_SECRET", "una-clave-por-defecto-si-no-la-encuentra")

async def verify_api_key(x_internal_api_key: Annotated[str, Header()]):
    """
    Esta función se ejecuta en cada petición.
    Compara la clave de la cabecera con la clave secreta del servidor.
    """
    if x_internal_api_key != API_SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")

# Aplica la protección a TODA la aplicación.
# Cualquier endpoint que definas abajo estará protegido automáticamente.
app = FastAPI(dependencies=[Depends(verify_api_key)])

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Incluir routers
app.include_router(report)
app.include_router(web)