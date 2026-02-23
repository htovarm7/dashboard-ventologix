from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
import mysql.connector
import os
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional, List
import json

from .clases import ReporteMantenimiento, MantenimientoItem

load_dotenv()

router = APIRouter()

# Database configuration
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_DATABASE"),
    )

# ==================== ENDPOINTS ====================

@router.post("/reporte_mantenimiento/")
async def crear_reporte_mantenimiento(data: ReporteMantenimiento):
    """
    Crea o actualiza un reporte de mantenimiento basado en folio
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar si ya existe un reporte para este folio
        check_query = "SELECT folio FROM reportes_mantenimiento WHERE folio = %s"
        cursor.execute(check_query, (data.folio,))
        exists = cursor.fetchone()

        if exists:
            # Actualizar registro existente
            update_query = """
                UPDATE reportes_mantenimiento 
                SET cambio_aceite = %s,
                    cambio_filtro_aceite = %s,
                    cambio_filtro_aire = %s,
                    cambio_separador_aceite = %s,
                    revision_valvula_admision = %s,
                    revision_valvula_descarga = %s,
                    limpieza_radiador = %s,
                    revision_bandas_correas = %s,
                    revision_fugas_aire = %s,
                    revision_fugas_aceite = %s,
                    revision_conexiones_electricas = %s,
                    revision_presostato = %s,
                    revision_manometros = %s,
                    lubricacion_general = %s,
                    limpieza_general = %s,
                    comentarios_generales = %s,
                    comentario_cliente = %s
                WHERE folio = %s
            """
            values = [
                data.cambio_aceite,
                data.cambio_filtro_aceite,
                data.cambio_filtro_aire,
                data.cambio_separador_aceite,
                data.revision_valvula_admision,
                data.revision_valvula_descarga,
                data.limpieza_radiador,
                data.revision_bandas_correas,
                data.revision_fugas_aire,
                data.revision_fugas_aceite,
                data.revision_conexiones_electricas,
                data.revision_presostato,
                data.revision_manometros,
                data.lubricacion_general,
                data.limpieza_general,
                data.comentarios_generales,
                data.comentario_cliente,
                data.folio,
            ]
            cursor.execute(update_query, values)

            # Update estado in reportes table
            cursor.execute(
                "UPDATE reportes SET estado = 'mantenimiento' WHERE folio = %s",
                (data.folio,)
            )

            conn.commit()
            cursor.close()
            conn.close()

            return {
                "success": True,
                "message": "Reporte de mantenimiento actualizado exitosamente",
                "folio": data.folio,
                "action": "updated",
            }
        else:
            # Insertar nuevo registro
            insert_query = """
                INSERT INTO reportes_mantenimiento (
                    folio,
                    cambio_aceite,
                    cambio_filtro_aceite,
                    cambio_filtro_aire,
                    cambio_separador_aceite,
                    revision_valvula_admision,
                    revision_valvula_descarga,
                    limpieza_radiador,
                    revision_bandas_correas,
                    revision_fugas_aire,
                    revision_fugas_aceite,
                    revision_conexiones_electricas,
                    revision_presostato,
                    revision_manometros,
                    lubricacion_general,
                    limpieza_general,
                    comentarios_generales,
                    comentario_cliente
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            values = [
                data.folio,
                data.cambio_aceite,
                data.cambio_filtro_aceite,
                data.cambio_filtro_aire,
                data.cambio_separador_aceite,
                data.revision_valvula_admision,
                data.revision_valvula_descarga,
                data.limpieza_radiador,
                data.revision_bandas_correas,
                data.revision_fugas_aire,
                data.revision_fugas_aceite,
                data.revision_conexiones_electricas,
                data.revision_presostato,
                data.revision_manometros,
                data.lubricacion_general,
                data.limpieza_general,
                data.comentarios_generales,
                data.comentario_cliente,
            ]
            cursor.execute(insert_query, values)

            # Update estado in reportes table
            cursor.execute(
                "UPDATE reportes SET estado = 'mantenimiento' WHERE folio = %s",
                (data.folio,)
            )

            conn.commit()
            cursor.close()
            conn.close()

            return {
                "success": True,
                "message": "Reporte de mantenimiento guardado exitosamente",
                "folio": data.folio,
                "action": "created",
            }

    except mysql.connector.Error as err:
        return {
            "success": False,
            "error": f"Error en base de datos: {err.msg}",
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error inesperado: {str(e)}",
        }


@router.get("/reporte_mantenimiento/{folio}")
async def obtener_reporte_mantenimiento(folio: str):
    """
    Obtiene un reporte de mantenimiento por folio
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = "SELECT * FROM reportes_mantenimiento WHERE folio = %s"
        cursor.execute(query, (folio,))
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if result:
            return {
                "success": True,
                "data": result,
            }
        else:
            return {
                "success": False,
                "message": "Reporte de mantenimiento no encontrado",
            }

    except mysql.connector.Error as err:
        return {
            "success": False,
            "error": f"Error en base de datos: {err.msg}",
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error inesperado: {str(e)}",
        }


@router.delete("/reporte_mantenimiento/{folio}")
async def eliminar_reporte_mantenimiento(folio: str):
    """
    Elimina un reporte de mantenimiento
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = "DELETE FROM reportes_mantenimiento WHERE folio = %s"
        cursor.execute(query, (folio,))
        conn.commit()

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return {
                "success": False,
                "message": "Reporte de mantenimiento no encontrado",
            }

        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Reporte de mantenimiento eliminado exitosamente",
            "folio": folio,
        }

    except mysql.connector.Error as err:
        return {
            "success": False,
            "error": f"Error en base de datos: {err.msg}",
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error inesperado: {str(e)}",
        }