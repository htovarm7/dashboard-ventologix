from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from scripts.api.reportApi import report
from scripts.api.webApi import web

# Load environment variables
load_dotenv()

app = FastAPI()

origins = [
    "https://dashboard.ventologix.com",  
    "http://localhost",                 
    "http://localhost:3000",             
    "http://127.0.0.1:8000",            
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"], 
)

# Incluir routers
app.include_router(report)
app.include_router(web)