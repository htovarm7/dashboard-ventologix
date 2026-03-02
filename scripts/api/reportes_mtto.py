from fastapi import FastAPI, Path, HTTPException, APIRouter, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal

import mysql.connector
import os
import io
from dotenv import load_dotenv
from datetime import datetime
import json

from .clases import Modulos, PreMantenimientoRequest, PostMantenimientoRequest
from .drive_utils import upload_maintenance_photos, list_gcs_photos_by_folio, get_gcs_client, BUCKET_NAME
from .pdf_playwright import generate_pdf_from_react

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

reportes_mtto = APIRouter(prefix="/reporte_mtto", tags=["Reportes de Mantenimiento"])


def _foto_url(request: Request, blob_name: str) -> str:
    base = str(request.base_url).rstrip("/")
    return f"{base}/reporte_mtto/foto?blob={blob_name}"


@reportes_mtto.get("/foto")
def get_foto(blob: str, request: Request):
    """Proxy endpoint: descarga una foto de GCS y la sirve al cliente."""
    try:
        client = get_gcs_client()
        gcs_blob = client.bucket(BUCKET_NAME).blob(blob)
        content = gcs_blob.download_as_bytes()
        content_type = gcs_blob.content_type or "image/jpeg"
        return StreamingResponse(io.BytesIO(content), media_type=content_type)
    except Exception as err:
        raise HTTPException(status_code=404, detail=f"Photo not found: {str(err)}")


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

            # Create the master record in `reportes` table
            cursor.execute(
                "SELECT id_cliente FROM ordenes_servicio WHERE folio = %s",
                (data.folio,)
            )
            orden = cursor.fetchone()
            id_cliente = orden[0] if orden else None

            cursor.execute(
                """INSERT IGNORE INTO reportes (folio, id_cliente, estado)
                   VALUES (%s, %s, 'pre_mantenimiento')""",
                (data.folio, id_cliente)
            )

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
    request: Request,
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
            uploaded_with_urls = {
                cat: [{**f, "public_url": _foto_url(request, f["blob_name"])} for f in files]
                for cat, files in result["uploaded_files"].items()
            }
            return {
                "success": True,
                "message": f"Successfully uploaded {len(files)} photo(s) to Google Cloud Storage",
                "uploaded_files": uploaded_with_urls,
                "gcs_prefix": result["gcs_prefix"]
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


# ==================== POST-MANTENIMIENTO ====================

@reportes_mtto.post("/post-mtto")
def save_post_mantenimiento(data: PostMantenimientoRequest):
    """
    Save post-maintenance data and mark the report as terminado.
    Also updates the orden_servicio status to 'terminado'.
    """
    conn = None
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE,
            host=DB_HOST
        )
        cursor = conn.cursor()

        # Check if post-maintenance record exists for this folio
        cursor.execute(
            "SELECT folio FROM reportes_post_mantenimiento WHERE folio = %s",
            (data.folio,)
        )
        existing = cursor.fetchone()

        # Build fields dynamically (skip None values and folio)
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
                UPDATE reportes_post_mantenimiento
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
                INSERT INTO reportes_post_mantenimiento ({field_names})
                VALUES ({placeholders})
            """
            cursor.execute(query, values)

        # Update reportes_status: mark post_mantenimiento as done
        cursor.execute(
            """UPDATE reportes_status
               SET post_mantenimiento = 1
               WHERE folio = %s""",
            (data.folio,)
        )

        # Update estado in reportes table
        cursor.execute(
            "UPDATE reportes SET estado = 'completado' WHERE folio = %s",
            (data.folio,)
        )

        # Note: Status is NOT automatically set to 'terminado' here
        # It should only be set when the user explicitly clicks "Terminar Reporte"
        # Use the /finalizar-reporte/{folio} endpoint instead

        conn.commit()
        cursor.close()

        return {
            "success": True,
            "message": "Post-maintenance data saved successfully.",
            "folio": data.folio
        }

    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        return {
            "success": False,
            "error": f"Database error: {str(err)}"
        }
    except Exception as err:
        if conn:
            conn.rollback()
        return {
            "success": False,
            "error": f"Unexpected error: {str(err)}"
        }
    finally:
        if conn and conn.is_connected():
            conn.close()


@reportes_mtto.post("/finalizar-reporte/{folio}")
def finalizar_reporte(folio: str = Path(..., description="Folio del reporte")):
    """
    Mark a report as 'terminado' (finished) and resets the semaforo
    (horas_acumuladas = 0) for all maintenance items performed.
    Also auto-registers the compressor in mantenimientos if not found.
    """
    conn = None
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE,
            host=DB_HOST
        )
        cursor = conn.cursor(dictionary=True)

        # Update orden_servicio status to 'terminado'
        cursor.execute(
            """UPDATE ordenes_servicio
               SET estado = 'terminado'
               WHERE folio = %s""",
            (folio,)
        )

        # Update reportes_status: mark as enviado
        cursor.execute(
            """UPDATE reportes_status
               SET enviado = 1
               WHERE folio = %s""",
            (folio,)
        )

        # Update estado in reportes table
        cursor.execute(
            "UPDATE reportes SET estado = 'enviado' WHERE folio = %s",
            (folio,)
        )

        # ── Semáforo: reset y alta automática ──────────────────────────────
        # 1. Resolve id_compresor and tipo_compresor from ordenes_servicio
        # COLLATE forces a consistent collation to avoid utf8mb4 mismatch errors
        cursor.execute(
            """SELECT c.id AS id_compresor, o.tipo
               FROM ordenes_servicio o
               JOIN compresores c
                 ON o.numero_serie COLLATE utf8mb4_unicode_ci = c.numero_serie COLLATE utf8mb4_unicode_ci
               WHERE o.folio = %s
               LIMIT 1""",
            (folio,)
        )
        comp_row = cursor.fetchone()

        if comp_row:
            id_compresor = comp_row["id_compresor"]
            tipo_compresor = comp_row["tipo"]  # 'tornillo' or 'piston'
            today = datetime.now().date()

            # Map report DB columns → nombre_tipo in mantenimientos_tipo
            column_to_tipo = {
                "cambio_aceite":                  "Cambio de aceite",
                "cambio_filtro_aceite":            "Cambio de filtro de aceite",
                "cambio_filtro_aire":              "Cambio de filtro de aire",
                "cambio_separador_aceite":         "Cambio de separador de aceite",
                "revision_valvula_admision":       "Revisión de válvula de admisión",
                "revision_valvula_descarga":       "Revisión de válvula de descarga",
                "limpieza_radiador":               "Limpieza de radiador",
                "revision_bandas_correas":         "Revisión de bandas/correas",
                "revision_fugas_aire":             "Revisión de fugas de aire",
                "revision_fugas_aceite":           "Revisión de fugas de aceite",
                "revision_conexiones_electricas":  "Revisión de conexiones eléctricas",
                "revision_presostato":             "Revisión de presostato",
                "revision_manometros":             "Revisión de manómetros",
                "lubricacion_general":             "Lubricación general",
                "limpieza_general":                "Limpieza general del equipo",
            }

            # 2. Get ALL maintenance types defined for this compressor type
            cursor.execute(
                "SELECT * FROM mantenimientos_tipo WHERE tipo_compresor = %s",
                (tipo_compresor,)
            )
            all_tipos = cursor.fetchall()

            # 3. Get which id_mantenimiento records already exist for this compressor
            cursor.execute(
                "SELECT id_mantenimiento FROM mantenimientos WHERE id_compresor = %s",
                (id_compresor,)
            )
            existing_ids = {r["id_mantenimiento"] for r in cursor.fetchall()}

            # 4. Get the maintenance items actually performed in this report
            cursor.execute(
                "SELECT * FROM reportes_mantenimiento WHERE folio = %s LIMIT 1",
                (folio,)
            )
            mtto_items = cursor.fetchone() or {}

            # Build set of nombre_tipo that were performed (column value == "Sí")
            done_nombres = {
                tipo_nombre
                for col, tipo_nombre in column_to_tipo.items()
                if mtto_items.get(col) == "Sí"
            }

            # 5. Process every type defined for this compressor type
            for tipo in all_tipos:
                id_m = tipo["id_mantenimiento"]
                nombre = tipo.get("nombre_tipo", "")
                # frecuencia: try common column names, default 2000
                freq = (
                    tipo.get("frecuencia_horas")
                    or tipo.get("frecuencia")
                    or 2000
                )
                is_done = nombre in done_nombres

                if id_m not in existing_ids:
                    # Compressor not registered for this type → INSERT
                    cursor.execute(
                        """INSERT INTO mantenimientos
                           (id_compresor, id_mantenimiento, frecuencia_horas,
                            ultimo_mantenimiento, horas_acumuladas, activo,
                            observaciones, creado_por, fecha_creacion)
                           VALUES (%s, %s, %s, %s, 0, 1, %s, %s, %s)""",
                        (
                            id_compresor,
                            id_m,
                            freq,
                            today if is_done else None,
                            f"Auto-registrado desde reporte {folio}",
                            "Sistema",
                            today,
                        )
                    )
                elif is_done:
                    # Already registered AND performed → reset semáforo
                    cursor.execute(
                        """UPDATE mantenimientos
                           SET horas_acumuladas = 0,
                               ultimo_mantenimiento = %s
                           WHERE id_compresor = %s
                             AND id_mantenimiento = %s""",
                        (today, id_compresor, id_m)
                    )
                # else: already registered, not done → leave untouched
        # ── End semáforo ───────────────────────────────────────────────────

        conn.commit()
        cursor.close()

        return {
            "success": True,
            "message": f"Report {folio} marked as terminado.",
            "folio": folio
        }

    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        return {
            "success": False,
            "error": f"Database error: {str(err)}"
        }
    except Exception as err:
        if conn:
            conn.rollback()
        return {
            "success": False,
            "error": f"Unexpected error: {str(err)}"
        }
    finally:
        if conn and conn.is_connected():
            conn.close()


@reportes_mtto.get("/post-mtto/{folio}")
def get_post_mantenimiento(folio: str = Path(..., description="Folio del reporte")):
    """
    Get post-maintenance data by folio.
    """
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE,
            host=DB_HOST
        )
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """SELECT * FROM reportes_post_mantenimiento
               WHERE folio = %s
               ORDER BY fecha_creacion DESC LIMIT 1""",
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


@reportes_mtto.get("/historial")
def get_report_history():
    """
    Get full report history joining ordenes_servicio with report status.
    Returns all completed and in-progress reports.
    """
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE,
            host=DB_HOST
        )
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                o.folio,
                o.nombre_cliente,
                o.numero_cliente,
                o.alias_compresor,
                o.numero_serie,
                o.hp,
                o.tipo,
                o.marca,
                o.tipo_visita,
                o.tipo_mantenimiento,
                o.prioridad,
                o.fecha_programada,
                o.hora_programada,
                o.estado,
                o.fecha_creacion,
                rs.pre_mantenimiento,
                rs.mantenimiento,
                rs.post_mantenimiento,
                rs.enviado
            FROM ordenes_servicio o
            LEFT JOIN reportes_status rs ON o.folio = rs.folio
            ORDER BY o.fecha_creacion DESC
        """)

        reportes = cursor.fetchall()
        cursor.close()
        conn.close()

        return {"success": True, "data": reportes}
    except mysql.connector.Error as err:
        return {"success": False, "error": str(err)}


@reportes_mtto.get("/reporte-completo/{folio}")
def get_full_report(request: Request, folio: str = Path(..., description="Folio del reporte")):
    """
    Get all report data (pre, maintenance, post) for PDF generation and client view.
    Includes photos from Google Drive if available.
    """
    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE,
            host=DB_HOST
        )
        cursor = conn.cursor(dictionary=True)

        # Get orden info
        cursor.execute(
            "SELECT * FROM ordenes_servicio WHERE folio = %s", (folio,)
        )
        orden = cursor.fetchone()

        # Get pre-maintenance
        cursor.execute(
            "SELECT * FROM reportes_pre_mantenimiento WHERE folio = %s", (folio,)
        )
        pre_mtto = cursor.fetchone()

        # Get maintenance
        cursor.execute(
            "SELECT * FROM reportes_mantenimiento WHERE folio = %s", (folio,)
        )
        mtto = cursor.fetchone()

        # Get post-maintenance
        cursor.execute(
            "SELECT * FROM reportes_post_mantenimiento WHERE folio = %s", (folio,)
        )
        post_mtto = cursor.fetchone()

        # Get status
        cursor.execute(
            "SELECT * FROM reportes_status WHERE folio = %s", (folio,)
        )
        status = cursor.fetchone()

        cursor.close()
        conn.close()

        if not orden:
            return {"success": False, "error": "Folio not found"}

        # Get photos from Google Cloud Storage organized by category
        fotos_by_category = {}
        fotos_drive_flat = []
        try:
            client_name = (orden.get("nombre_cliente") or "").strip().replace('/', '-')
            if client_name:
                gcs_result = list_gcs_photos_by_folio(client_name, folio)
                fotos_by_category = {
                    cat: [_foto_url(request, b) for b in blobs]
                    for cat, blobs in gcs_result["by_category"].items()
                }
                fotos_drive_flat = [_foto_url(request, b) for b in gcs_result["flat"]]
        except Exception as e:
            print(f"Warning: Could not fetch photos from GCS: {str(e)}")

        return {
            "success": True,
            "data": {
                "orden": orden,
                "pre_mantenimiento": pre_mtto,
                "mantenimiento": mtto,
                "post_mantenimiento": post_mtto,
                "status": status,
                "fotos_drive": fotos_drive_flat,
                "fotos_por_categoria": fotos_by_category
            }
        }
    except mysql.connector.Error as err:
        return {"success": False, "error": str(err)}


@reportes_mtto.get("/descargar-pdf/{folio}")
async def download_report_pdf(folio: str = Path(..., description="Folio del reporte")):
    """
    Generate PDF from React view using Playwright.
    This creates a PDF that looks exactly like the web view with all photos.
    """
    try:
        # Get the frontend URL from environment or use default
        frontend_url = os.getenv("FRONTEND_URL", "https://dashboard.ventologix.com")

        # Generate PDF using Playwright
        pdf_bytes = await generate_pdf_from_react(folio, frontend_url)

        # Return PDF as downloadable file
        clean_folio = folio.replace("/", "-").replace("\\", "-")
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Reporte_{clean_folio}.pdf"'
            }
        )
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Error generating PDF with Playwright: {str(err)}")


# OLD REPORTLAB CODE - DEPRECATED AND REMOVED
# The old PDF generation using ReportLab has been replaced with Playwright
# to generate PDFs that look exactly like the React view
@reportes_mtto.get("/descargar-pdf-OLD/{folio}")
async def download_report_pdf_old(folio: str = Path(..., description="Folio del reporte")):
    """
    OLD PDF generation - DEPRECATED. Use /descargar-pdf/{folio} instead.
    """
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    import base64

    try:
        conn = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE,
            host=DB_HOST
        )
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM ordenes_servicio WHERE folio = %s", (folio,))
        orden = cursor.fetchone()
        if not orden:
            raise HTTPException(status_code=404, detail="Folio not found")

        cursor.execute("SELECT * FROM reportes_pre_mantenimiento WHERE folio = %s", (folio,))
        pre = cursor.fetchone() or {}

        cursor.execute("SELECT * FROM reportes_mantenimiento WHERE folio = %s", (folio,))
        mtto = cursor.fetchone() or {}

        cursor.execute("SELECT * FROM reportes_post_mantenimiento WHERE folio = %s", (folio,))
        post = cursor.fetchone() or {}

        cursor.close()
        conn.close()

        # --- Build PDF ---
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=letter,
            topMargin=0.5*inch, bottomMargin=0.5*inch,
            leftMargin=0.6*inch, rightMargin=0.6*inch
        )

        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name="SectionHeader",
            parent=styles["Heading2"],
            textColor=colors.white,
            backColor=colors.HexColor("#1e3a5f"),
            alignment=TA_CENTER,
            spaceAfter=6, spaceBefore=12,
            fontSize=12, leading=16
        ))
        styles.add(ParagraphStyle(
            name="PostHeader",
            parent=styles["Heading2"],
            textColor=colors.white,
            backColor=colors.HexColor("#b91c1c"),
            alignment=TA_CENTER,
            spaceAfter=6, spaceBefore=12,
            fontSize=12, leading=16
        ))
        styles.add(ParagraphStyle(
            name="CellLabel",
            parent=styles["Normal"],
            fontSize=8, leading=10, textColor=colors.HexColor("#374151")
        ))
        styles.add(ParagraphStyle(
            name="CellValue",
            parent=styles["Normal"],
            fontSize=9, leading=11, textColor=colors.black
        ))

        elements = []

        def v(d, key, default="\u2014"):
            val = d.get(key)
            if val is None or val == "":
                return default
            return str(val)

        def make_table(data_rows, col_widths=None):
            t = Table(data_rows, colWidths=col_widths, hAlign="LEFT")
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#374151")),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            return t

        col_w = [2.5*inch, 4.5*inch]

        # ===== HEADER =====
        elements.append(Paragraph(
            f"REPORTE DE MANTENIMIENTO &mdash; {folio}",
            ParagraphStyle(
                name="ReportTitle", parent=styles["Title"],
                textColor=colors.HexColor("#1e3a5f"), fontSize=16
            )
        ))
        elements.append(Spacer(1, 6))

        # General info
        elements.append(Paragraph("INFORMACI\u00d3N GENERAL", styles["SectionHeader"]))
        elements.append(make_table([
            ["Cliente", v(orden, "nombre_cliente")],
            ["Compresor", v(orden, "alias_compresor")],
            ["No. Serie", v(orden, "numero_serie")],
            ["HP", v(orden, "hp")],
            ["Tipo", v(orden, "tipo")],
            ["Marca", v(orden, "marca")],
            ["Tipo Visita", v(orden, "tipo_visita")],
            ["Tipo Mantenimiento", v(orden, "tipo_mantenimiento")],
            ["Fecha Programada", v(orden, "fecha_programada")],
        ], col_w))
        elements.append(Spacer(1, 8))

        # ===== PRE-MANTENIMIENTO =====
        if pre:
            elements.append(Paragraph("PRE-MANTENIMIENTO: DISPLAY Y HORAS", styles["SectionHeader"]))
            elements.append(make_table([
                ["Display Enciende", v(pre, "display_enciende")],
                ["Horas Totales", v(pre, "horas_totales")],
                ["Horas en Carga", v(pre, "horas_carga")],
                ["Horas en Descarga", v(pre, "horas_descarga")],
            ], col_w))
            elements.append(Spacer(1, 4))

            elements.append(Paragraph("PRE-MANTENIMIENTO: VOLTAJES Y AMPERAJES", styles["SectionHeader"]))
            elements.append(make_table([
                ["Voltaje Alimentaci\u00f3n (V)", v(pre, "voltaje_alimentacion")],
                ["Amperaje Motor en Carga (A)", v(pre, "amperaje_motor_carga")],
                ["Amperaje Ventilador (A)", v(pre, "amperaje_ventilador")],
            ], col_w))
            elements.append(Spacer(1, 4))

            elements.append(Paragraph("PRE-MANTENIMIENTO: ACEITE", styles["SectionHeader"]))
            elements.append(make_table([
                ["Fugas de Aceite Visibles", v(pre, "fugas_aceite_visibles")],
                ["Aceite Oscuro/Degradado", v(pre, "aceite_oscuro_degradado")],
            ], col_w))
            elements.append(Spacer(1, 4))

            elements.append(Paragraph("PRE-MANTENIMIENTO: TEMPERATURAS", styles["SectionHeader"]))
            elements.append(make_table([
                ["Temp. Ambiente (\u00b0C)", v(pre, "temp_ambiente")],
                ["Temp. Compresi\u00f3n Display (\u00b0C)", v(pre, "temp_compresion_display")],
                ["Temp. Compresi\u00f3n L\u00e1ser (\u00b0C)", v(pre, "temp_compresion_laser")],
                ["Temp. Separador Aceite (\u00b0C)", v(pre, "temp_separador_aceite")],
                ["Temp. Interna Cuarto (\u00b0C)", v(pre, "temp_interna_cuarto")],
                ["Delta T Enfriador Aceite (\u00b0C)", v(pre, "delta_t_enfriador_aceite")],
                ["Temp. Motor El\u00e9ctrico (\u00b0C)", v(pre, "temp_motor_electrico")],
            ], col_w))
            elements.append(Spacer(1, 4))

            elements.append(Paragraph("PRE-MANTENIMIENTO: PRESIONES", styles["SectionHeader"]))
            elements.append(make_table([
                ["Presi\u00f3n Carga (PSI)", v(pre, "presion_carga")],
                ["Presi\u00f3n Descarga (PSI)", v(pre, "presion_descarga")],
                ["Delta P Separador (PSI)", v(pre, "delta_p_separador")],
            ], col_w))
            elements.append(Spacer(1, 4))

            elements.append(Paragraph("PRE-MANTENIMIENTO: CONDICIONES", styles["SectionHeader"]))
            elements.append(make_table([
                ["Fugas de Aire Audibles", v(pre, "fugas_aire_audibles")],
                ["Ubicaci\u00f3n Compresor", v(pre, "ubicacion_compresor")],
                ["Expulsi\u00f3n Aire Caliente", v(pre, "expulsion_aire_caliente")],
                ["Compresor Bien Instalado", v(pre, "compresor_bien_instalado")],
                ["Condiciones Especiales", v(pre, "condiciones_especiales")],
            ], col_w))
            elements.append(Spacer(1, 8))

        # ===== MANTENIMIENTO =====
        if mtto:
            elements.append(Paragraph("MANTENIMIENTO REALIZADO", styles["SectionHeader"]))
            mtto_items = [
                ("Cambio de Aceite", "cambio_aceite"),
                ("Cambio Filtro Aceite", "cambio_filtro_aceite"),
                ("Cambio Filtro Aire", "cambio_filtro_aire"),
                ("Cambio Separador Aceite", "cambio_separador_aceite"),
                ("Revisi\u00f3n V\u00e1lvula Admisi\u00f3n", "revision_valvula_admision"),
                ("Revisi\u00f3n V\u00e1lvula Descarga", "revision_valvula_descarga"),
                ("Limpieza Radiador", "limpieza_radiador"),
                ("Revisi\u00f3n Bandas/Correas", "revision_bandas_correas"),
                ("Revisi\u00f3n Fugas Aire", "revision_fugas_aire"),
                ("Revisi\u00f3n Fugas Aceite", "revision_fugas_aceite"),
                ("Revisi\u00f3n Conexiones El\u00e9ctricas", "revision_conexiones_electricas"),
                ("Revisi\u00f3n Presostato", "revision_presostato"),
                ("Revisi\u00f3n Man\u00f3metros", "revision_manometros"),
                ("Lubricaci\u00f3n General", "lubricacion_general"),
                ("Limpieza General", "limpieza_general"),
            ]
            rows = [[label, v(mtto, key)] for label, key in mtto_items]
            elements.append(make_table(rows, col_w))
            elements.append(Spacer(1, 4))

            if mtto.get("comentarios_generales"):
                elements.append(Paragraph("COMENTARIOS GENERALES", styles["SectionHeader"]))
                elements.append(Paragraph(mtto["comentarios_generales"], styles["Normal"]))
                elements.append(Spacer(1, 4))

            if mtto.get("comentario_cliente"):
                elements.append(Paragraph("COMENTARIO DEL CLIENTE", styles["SectionHeader"]))
                elements.append(Paragraph(mtto["comentario_cliente"], styles["Normal"]))
                elements.append(Spacer(1, 4))

            elements.append(Spacer(1, 8))

        # ===== POST-MANTENIMIENTO =====
        if post:
            elements.append(Paragraph("POST-MANTENIMIENTO: DISPLAY Y HORAS", styles["PostHeader"]))
            elements.append(make_table([
                ["Display Enciende (Final)", v(post, "display_enciende_final")],
                ["Horas Totales (Final)", v(post, "horas_totales_final")],
                ["Horas en Carga (Final)", v(post, "horas_carga_final")],
                ["Horas en Descarga (Final)", v(post, "horas_descarga_final")],
            ], col_w))
            elements.append(Spacer(1, 4))

            elements.append(Paragraph("POST-MANTENIMIENTO: VOLTAJES Y AMPERAJES", styles["PostHeader"]))
            elements.append(make_table([
                ["Voltaje Alimentaci\u00f3n (Final) (V)", v(post, "voltaje_alimentacion_final")],
                ["Amperaje Motor Carga (Final) (A)", v(post, "amperaje_motor_carga_final")],
                ["Amperaje Ventilador (Final) (A)", v(post, "amperaje_ventilador_final")],
            ], col_w))
            elements.append(Spacer(1, 4))

            elements.append(Paragraph("POST-MANTENIMIENTO: ACEITE", styles["PostHeader"]))
            elements.append(make_table([
                ["Fugas de Aceite (Final)", v(post, "fugas_aceite_final")],
                ["Aceite Oscuro (Final)", v(post, "aceite_oscuro_final")],
            ], col_w))
            elements.append(Spacer(1, 4))

            elements.append(Paragraph("POST-MANTENIMIENTO: TEMPERATURAS", styles["PostHeader"]))
            elements.append(make_table([
                ["Temp. Ambiente (Final) (\u00b0C)", v(post, "temp_ambiente_final")],
                ["Temp. Compresi\u00f3n Display (Final) (\u00b0C)", v(post, "temp_compresion_display_final")],
                ["Temp. Compresi\u00f3n L\u00e1ser (Final) (\u00b0C)", v(post, "temp_compresion_laser_final")],
                ["Temp. Separador Aceite (Final) (\u00b0C)", v(post, "temp_separador_aceite_final")],
                ["Temp. Interna Cuarto (Final) (\u00b0C)", v(post, "temp_interna_cuarto_final")],
                ["Delta T Enfriador Aceite (Final) (\u00b0C)", v(post, "delta_t_enfriador_aceite_final")],
                ["Temp. Motor El\u00e9ctrico (Final) (\u00b0C)", v(post, "temp_motor_electrico_final")],
            ], col_w))
            elements.append(Spacer(1, 4))

            elements.append(Paragraph("POST-MANTENIMIENTO: PRESIONES", styles["PostHeader"]))
            elements.append(make_table([
                ["Presi\u00f3n Carga (Final) (PSI)", v(post, "presion_carga_final")],
                ["Presi\u00f3n Descarga (Final) (PSI)", v(post, "presion_descarga_final")],
                ["Delta P Separador (Final) (PSI)", v(post, "delta_p_separador_final")],
            ], col_w))
            elements.append(Spacer(1, 4))

            elements.append(Paragraph("POST-MANTENIMIENTO: FUGAS DE AIRE", styles["PostHeader"]))
            elements.append(make_table([
                ["Fugas de Aire Audibles (Final)", v(post, "fugas_aire_final")],
            ], col_w))
            elements.append(Spacer(1, 8))

            # Signatures
            elements.append(Paragraph("FIRMAS Y VALIDACI\u00d3N", styles["PostHeader"]))
            sig_data = [["Persona a Cargo (Cliente)", v(post, "nombre_persona_cargo")]]
            elements.append(make_table(sig_data, col_w))

            # Render client signature image if present
            firma_b64 = post.get("firma_persona_cargo")
            if firma_b64 and isinstance(firma_b64, str) and firma_b64.startswith("data:image"):
                try:
                    header, encoded = firma_b64.split(",", 1)
                    sig_bytes = base64.b64decode(encoded)
                    sig_buffer = io.BytesIO(sig_bytes)
                    elements.append(Spacer(1, 4))
                    elements.append(Paragraph("Firma del Cliente:", styles["CellLabel"]))
                    elements.append(RLImage(sig_buffer, width=2.5*inch, height=1*inch))
                except Exception:
                    pass

            elements.append(Spacer(1, 12))

        # ===== GOOGLE CLOUD STORAGE PHOTOS LINK =====
        gcs_photos_url = None
        try:
            from datetime import datetime as _dt
            client_name = (orden.get("nombre_cliente") or "").strip().replace('/', '-')
            clean_folio = folio.strip().replace('/', '-')
            if client_name:
                now = _dt.now()
                gcs_photos_url = (
                    f"https://storage.googleapis.com/{BUCKET_NAME}"
                    f"/mantenimiento/{now.strftime('%Y')}/{now.strftime('%m')}"
                    f"/{client_name}/{clean_folio}"
                )
        except Exception:
            pass

        if gcs_photos_url:
            elements.append(Spacer(1, 12))
            elements.append(Paragraph("EVIDENCIAS FOTOGRÁFICAS", styles["SectionHeader"]))
            elements.append(Spacer(1, 4))
            elements.append(Paragraph(
                f'Las fotografías del servicio se encuentran disponibles en Google Cloud Storage:<br/>'
                f'<a href="{gcs_photos_url}" color="blue"><u>{gcs_photos_url}</u></a>',
                ParagraphStyle(
                    name="GCSLink", parent=styles["Normal"],
                    fontSize=9, leading=14, alignment=TA_CENTER,
                    spaceAfter=8
                )
            ))
            elements.append(Spacer(1, 8))

        # Footer
        elements.append(Paragraph(
            f"Reporte generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} \u2014 VENTOLOGIX",
            ParagraphStyle(
                name="FooterStyle", parent=styles["Normal"],
                alignment=TA_CENTER, fontSize=8, textColor=colors.gray
            )
        ))

        doc.build(elements)
        buffer.seek(0)

        clean_folio = folio.replace("/", "-").replace("\\", "-")
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Reporte_{clean_folio}.pdf"'
            }
        )

    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(err)}")


@reportes_mtto.get("/descargar-pdf-react/{folio}")
async def download_report_pdf_react(folio: str = Path(..., description="Folio del reporte")):
    """
    Generate PDF from React view using Playwright.
    This creates a PDF that looks exactly like the web view.
    """
    try:
        # Get the frontend URL from environment or use default
        frontend_url = os.getenv("FRONTEND_URL", "https://dashboard.ventologix.com")

        # Generate PDF using Playwright
        pdf_bytes = await generate_pdf_from_react(folio, frontend_url)

        # Return PDF as downloadable file
        clean_folio = folio.replace("/", "-").replace("\\", "-")
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Reporte_{clean_folio}.pdf"'
            }
        )
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Error generating PDF with Playwright: {str(err)}")