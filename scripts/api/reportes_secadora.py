from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Body
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional, List
import mysql.connector
import os
import io
from dotenv import load_dotenv
from datetime import datetime, date

from .drive_utils import upload_maintenance_photos, get_gcs_client, BUCKET_NAME
from .pdf_playwright import generate_pdf_from_react

load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

reportes_secadora = APIRouter(prefix="/reporte_secadora", tags=["Reportes de Secadora"])

DRYER_VIEW_PATH = "/features/compressor-maintenance/reports/view-dryer"


def _get_conn():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_DATABASE,
    )


def _serialize_row(row: dict) -> dict:
    """Convert non-JSON-serializable types in a DB row."""
    for k, v in row.items():
        if isinstance(v, (datetime, date)):
            row[k] = v.isoformat()
    return row


def _list_secadora_photos(client_name: str, folio: str, request: Request) -> dict:
    """List photos from GCS organized by category under Secadoras/ prefix."""
    try:
        client = get_gcs_client()
        clean_client = client_name.strip().replace("/", "-")
        clean_folio = folio.strip().replace("/", "-")
        target_segment = f"/{clean_client}/{clean_folio}/"
        blobs = client.list_blobs(BUCKET_NAME, prefix="Secadoras/")
        by_category = {}
        base = str(request.base_url).rstrip("/")
        for blob in blobs:
            if target_segment not in blob.name:
                continue
            after_folio = blob.name.split(target_segment, 1)[1]
            parts = after_folio.split("/", 1)
            if len(parts) < 2 or not parts[1]:
                continue
            category = parts[0]
            url = f"{base}/reporte_mtto/foto?blob={blob.name}"
            by_category.setdefault(category, []).append(url)
        return by_category
    except Exception as e:
        print(f"Warning: could not list GCS photos for secadora: {e}")
        return {}


# ── GET /listar ──────────────────────────────────────────────────────────────

@reportes_secadora.get("/listar")
def listar_reportes_secadora():
    """List all dryer reports (summary for the listing page)."""
    conn = _get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT id, folio, cliente, numero_cliente, equipo, modelo,
                      no_serie, fecha, estado, created_at
               FROM reportes_secadora
               ORDER BY created_at DESC"""
        )
        rows = cursor.fetchall()
        for r in rows:
            _serialize_row(r)
        return {"success": True, "data": rows}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        cursor.close()
        conn.close()


# ── POST /guardar ────────────────────────────────────────────────────────────

@reportes_secadora.post("/guardar")
async def guardar_reporte_secadora(
    request: Request,
    folio: str = Form(...),
    cliente: str = Form(""),
    numero_cliente: str = Form(""),
    rfc: str = Form(""),
    direccion: str = Form(""),
    ingeniero_obra: str = Form(""),
    ingeniero_ventologix: str = Form(""),
    fecha: str = Form(""),
    equipo: str = Form(""),
    modelo: str = Form(""),
    no_serie: str = Form(""),
    ubicacion: str = Form(""),
    horometro: str = Form(""),
    voltaje: str = Form(""),
    amperaje: str = Form(""),
    ciclo_refrigeracion: str = Form(""),
    ciclo_drenado: str = Form(""),
    tiempo_drenado: str = Form(""),
    tiempo_ciclo: str = Form(""),
    presion_alta: str = Form(""),
    presion_baja: str = Form(""),
    temp_entrada_aire: str = Form(""),
    temp_salida_aire: str = Form(""),
    punto_rocio: str = Form(""),
    drenaje_condensado: str = Form(""),
    intercambiador_calor: str = Form(""),
    evaporadora: str = Form(""),
    valvula_expansion: str = Form(""),
    filtro_deshidratador: str = Form(""),
    condensador: str = Form(""),
    ventiladores_condensador: str = Form(""),
    motor_ventilador: str = Form(""),
    compresor_refrigeracion: str = Form(""),
    cableado_electrico: str = Form(""),
    contactores_relevadores: str = Form(""),
    tarjeta_control: str = Form(""),
    drenaje_automatico: str = Form(""),
    sensor_punto_rocio: str = Form(""),
    estado_general: str = Form(""),
    observaciones: str = Form(""),
    tipo_refrigerante: str = Form(""),
    fotos_PLACAS_EQUIPO: List[UploadFile] = File(default=[]),
    fotos_DISPLAY_HORAS: List[UploadFile] = File(default=[]),
    fotos_COMPONENTES: List[UploadFile] = File(default=[]),
    fotos_REFRIGERACION: List[UploadFile] = File(default=[]),
    fotos_OTROS: List[UploadFile] = File(default=[]),
):
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        # Upload photos to GCS
        photos_by_category = {}
        raw_photos = {
            "PLACAS_EQUIPO": fotos_PLACAS_EQUIPO,
            "DISPLAY_HORAS": fotos_DISPLAY_HORAS,
            "COMPONENTES": fotos_COMPONENTES,
            "REFRIGERACION": fotos_REFRIGERACION,
            "OTROS": fotos_OTROS,
        }
        for category, file_list in raw_photos.items():
            if file_list:
                photos_by_category[category] = []
                for f in file_list:
                    content = await f.read()
                    photos_by_category[category].append({
                        "filename": f.filename,
                        "content": content,
                        "content_type": f.content_type or "image/jpeg",
                    })

        fotos_urls = {}
        if photos_by_category:
            fotos_urls = upload_maintenance_photos(
                client_name=cliente or "sin_cliente",
                folio=folio,
                photos_by_category=photos_by_category,
                parent_folder="Secadoras",
            )

        # Upsert
        cursor.execute("SELECT id FROM reportes_secadora WHERE folio = %s", (folio,))
        existing = cursor.fetchone()

        fields = (
            cliente, numero_cliente, rfc, direccion,
            ingeniero_obra, ingeniero_ventologix, fecha or None,
            equipo, modelo, no_serie, ubicacion, horometro or None,
            voltaje or None, amperaje or None,
            ciclo_refrigeracion or None, ciclo_drenado or None,
            tiempo_drenado or None, tiempo_ciclo or None,
            presion_alta or None, presion_baja or None,
            temp_entrada_aire or None, temp_salida_aire or None, punto_rocio or None,
            drenaje_condensado, intercambiador_calor, evaporadora,
            valvula_expansion, filtro_deshidratador, condensador,
            ventiladores_condensador, motor_ventilador,
            compresor_refrigeracion, cableado_electrico,
            contactores_relevadores, tarjeta_control,
            drenaje_automatico, sensor_punto_rocio,
            estado_general, observaciones,
            tipo_refrigerante or None,
        )

        if existing:
            cursor.execute(
                """
                UPDATE reportes_secadora SET
                    cliente=%s, numero_cliente=%s, rfc=%s, direccion=%s,
                    ingeniero_obra=%s, ingeniero_ventologix=%s, fecha=%s,
                    equipo=%s, modelo=%s, no_serie=%s, ubicacion=%s, horometro=%s,
                    voltaje=%s, amperaje=%s,
                    ciclo_refrigeracion=%s, ciclo_drenado=%s, tiempo_drenado=%s, tiempo_ciclo=%s,
                    presion_alta=%s, presion_baja=%s,
                    temp_entrada_aire=%s, temp_salida_aire=%s, punto_rocio=%s,
                    drenaje_condensado=%s, intercambiador_calor=%s, evaporadora=%s,
                    valvula_expansion=%s, filtro_deshidratador=%s, condensador=%s,
                    ventiladores_condensador=%s, motor_ventilador=%s,
                    compresor_refrigeracion=%s, cableado_electrico=%s,
                    contactores_relevadores=%s, tarjeta_control=%s,
                    drenaje_automatico=%s, sensor_punto_rocio=%s,
                    estado_general=%s, observaciones=%s,
                    tipo_refrigerante=%s,
                    updated_at=NOW()
                WHERE folio=%s
                """,
                (*fields, folio),
            )
        else:
            cursor.execute(
                """
                INSERT INTO reportes_secadora (
                    folio, cliente, numero_cliente, rfc, direccion,
                    ingeniero_obra, ingeniero_ventologix, fecha,
                    equipo, modelo, no_serie, ubicacion, horometro,
                    voltaje, amperaje,
                    ciclo_refrigeracion, ciclo_drenado, tiempo_drenado, tiempo_ciclo,
                    presion_alta, presion_baja,
                    temp_entrada_aire, temp_salida_aire, punto_rocio,
                    drenaje_condensado, intercambiador_calor, evaporadora,
                    valvula_expansion, filtro_deshidratador, condensador,
                    ventiladores_condensador, motor_ventilador,
                    compresor_refrigeracion, cableado_electrico,
                    contactores_relevadores, tarjeta_control,
                    drenaje_automatico, sensor_punto_rocio,
                    estado_general, observaciones,
                    tipo_refrigerante,
                    estado, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s,
                    %s, %s,
                    %s, %s,
                    %s, %s,
                    %s, %s,
                    %s,
                    'en_progreso', NOW(), NOW()
                )
                """,
                (folio, *fields),
            )

        conn.commit()
        return JSONResponse({"ok": True, "folio": folio, "fotos": fotos_urls})

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ── GET /reporte-completo/{folio} ────────────────────────────────────────────

@reportes_secadora.get("/reporte-completo/{folio}")
def get_reporte_completo(folio: str, request: Request):
    conn = _get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM reportes_secadora WHERE folio = %s", (folio,))
        row = cursor.fetchone()
        if not row:
            return {"success": False, "error": "Reporte no encontrado"}
        row = _serialize_row(row)
        row["fotos_por_categoria"] = _list_secadora_photos(
            row.get("cliente", ""), folio, request
        )
        return {"success": True, "data": row}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        cursor.close()
        conn.close()


# ── POST /firmar ─────────────────────────────────────────────────────────────

@reportes_secadora.post("/firmar")
def firmar_reporte(body: dict = Body(...)):
    folio = body.get("folio")
    if not folio:
        raise HTTPException(status_code=400, detail="folio requerido")
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE reportes_secadora
            SET firma_persona_cargo=%s,
                firma_tecnico_ventologix=%s,
                nombre_persona_cargo=%s,
                updated_at=NOW()
            WHERE folio=%s
            """,
            (
                body.get("firma_persona_cargo"),
                body.get("firma_tecnico_ventologix"),
                body.get("nombre_persona_cargo"),
                folio,
            ),
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Reporte no encontrado")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ── POST /finalizar-reporte/{folio} ─────────────────────────────────────────

@reportes_secadora.post("/finalizar-reporte/{folio}")
def finalizar_reporte(folio: str):
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE reportes_secadora SET estado='terminado', updated_at=NOW() WHERE folio=%s",
            (folio,),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return {"success": False, "error": "Reporte no encontrado"}
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ── GET /descargar-pdf/{folio} ───────────────────────────────────────────────

@reportes_secadora.get("/descargar-pdf/{folio}")
async def descargar_pdf_secadora(folio: str):
    frontend_url = os.getenv("FRONTEND_URL", "https://dashboard.ventologix.com")
    pdf_bytes = await generate_pdf_from_react(
        folio, frontend_url, view_path=DRYER_VIEW_PATH
    )
    clean_folio = folio.replace("/", "-").replace("\\", "-")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Reporte_Secadora_{clean_folio}.pdf"'
        },
    )


# ── GET /{folio} (simple, sin fotos) ─────────────────────────────────────────

@reportes_secadora.get("/{folio}")
def get_reporte_secadora(folio: str):
    conn = _get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM reportes_secadora WHERE folio = %s", (folio,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Reporte no encontrado")
        return _serialize_row(row)
    finally:
        cursor.close()
        conn.close()
