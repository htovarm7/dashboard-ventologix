from fastapi import FastAPI, Path, HTTPException, APIRouter, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal

import mysql.connector
import os
from dotenv import load_dotenv
from datetime import datetime
import json

from .clases import Modulos, PreMantenimientoRequest
from .drive_utils import upload_maintenance_photos

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

reportes_mtto = APIRouter(prefix="/reporte_mtto", tags=["Reportes de Mantenimiento"])

@reportes_mtto.get("/status")
def get_reporte_status():
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE,
            host=DB_HOST
        )
        cursor = conn.cursor()

        cursor.execute(
            """SELECT * 
            FROM reportes_status;
            """
        )

        res = cursor.fetchall()
        cursor.close()
        conn.close()

        if not res:
            return {"error": "Check connection to DB or the .env"}
        
        status = [
            {
                "folio": row[1],
                "pre_mantenimiento": row[2],
                "mantenimiento": row[3],
                "post_mantenimiento": row[4],
                "enviado": row[5],
            }
            for row in res
        ]

        return {
            "data": status
        }
    except mysql.connector.Error as err:
        return{"error": str(err)}

@reportes_mtto.get("/pre-mtto/{folio}")
def get_pre_answers(folio: str = Path(..., description="Folio del reporte")):
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE,
            host=DB_HOST
        )
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """SELECT * 
            FROM reportes_pre_mantenimiento
            WHERE folio = %s
            ORDER BY fecha_creacion DESC
            LIMIT 1;
            """,
            (folio,)
        )

        res = cursor.fetchone()
        cursor.close()
        conn.close()

        if not res:
            return {"data": None}
        
        return {"data": res}
    except mysql.connector.Error as err:
        return {"error": str(err)}


@reportes_mtto.post("/pre-mtto")
def save_pre_mantenimiento(data: PreMantenimientoRequest):
    """
    Save pre-maintenance data for a compressor report
    """
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE,
            host=DB_HOST
        )
        cursor = conn.cursor()

        # Check if pre-maintenance record exists for this folio
        cursor.execute(
            """SELECT folio FROM reportes_pre_mantenimiento WHERE folio = %s""",
            (data.folio,)
        )
        existing = cursor.fetchone()

        # Build the insert/update query dynamically
        fields = []
        values = []
        
        for key, value in data.dict().items():
            if value is not None and key != "folio":
                fields.append(key)
                values.append(value)

        if existing:
            # Update existing record
            set_clause = ", ".join([f"`{k}` = %s" for k in fields])
            query = f"""
                UPDATE reportes_pre_mantenimiento 
                SET {set_clause}, `fecha_actualizacion` = NOW()
                WHERE folio = %s
            """
            values.append(data.folio)
            cursor.execute(query, values)
        else:
            # Insert new record
            fields.append("folio")
            values.append(data.folio)
            
            placeholders = ", ".join(["%s"] * len(values))
            field_names = ", ".join([f"`{f}`" for f in fields])
            
            query = f"""
                INSERT INTO reportes_pre_mantenimiento ({field_names})
                VALUES ({placeholders})
            """
            cursor.execute(query, values)

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Pre-maintenance data saved successfully",
            "folio": data.folio
        }

    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        return {
            "success": False,
            "error": f"Database error: {str(err)}",
            "details": str(err)
        }
    except Exception as err:
        if conn:
            conn.rollback()
        return {
            "success": False,
            "error": f"Unexpected error: {str(err)}",
            "details": str(err)
        }


@reportes_mtto.post("/upload-photos")
async def upload_photos(
    folio: str = Form(...),
    client_name: str = Form(...),
    category: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Upload photos to Google Drive organized by client/folio/category.
    
    Args:
        folio: Report folio number
        client_name: Client name
        category: Photo category (ACEITE, CONDICIONES_AMBIENTALES, etc.)
        files: List of image files to upload
    
    Returns:
        JSON with upload results and file IDs
    """
    try:
        print(f"\n🔵 [DEBUG] Received upload request:")
        print(f"  - Folio: {folio}")
        print(f"  - Client: {client_name}")
        print(f"  - Category: {category}")
        print(f"  - Files count: {len(files)}")
        
        # Prepare photos for upload
        photos_by_category = {category: []}
        
        for idx, file in enumerate(files):
            # Read file content
            content = await file.read()
            
            # Determine MIME type
            mime_type = file.content_type or 'image/jpeg'
            
            print(f"  - File {idx + 1}: {file.filename} ({len(content)} bytes, MIME: {mime_type})")
            
            photos_by_category[category].append((
                file.filename,
                content,
                mime_type
            ))
        
        print(f"🚀 [DEBUG] Calling upload_maintenance_photos...")
        # Upload to Google Drive
        result = upload_maintenance_photos(
            client_name=client_name,
            folio=folio,
            photos_by_category=photos_by_category
        )
        
        print(f"📋 [DEBUG] Upload result: {result}")
        
        if result.get("success"):
            print(f"✅ [DEBUG] Upload succeeded!")
            return {
                "success": True,
                "message": f"Successfully uploaded {len(files)} photo(s) to Google Drive",
                "uploaded_files": result["uploaded_files"],
                "folder_structure": result["folder_structure"]
            }
        else:
            print(f"❌ [DEBUG] Upload failed: {result.get('error')}")
            return {
                "success": False,
                "error": result.get("error", "Unknown error")
            }
            
    except Exception as err:
        print(f"❌ [EXCEPTION] Error uploading photos: {str(err)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": f"Error uploading photos: {str(err)}"
        }