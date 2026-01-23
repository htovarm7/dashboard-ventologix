from fastapi import FastAPI, Path, HTTPException, APIRouter
from fastapi.responses import JSONResponse

import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

pressure = APIRouter(prefix="/pressure", tags=["Presion"])
