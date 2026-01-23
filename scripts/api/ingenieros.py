"""
Endpoints de gestión de ingenieros y preferencias de usuario
"""
from fastapi import HTTPException, APIRouter, Query, Body
from pydantic import EmailStr
from typing import Optional

from .db_utils import get_db_connection


ingenieros_router = APIRouter(prefix="/web", tags=["👥 Gestión de Usuarios"])


@ingenieros_router.get("/ingenieros", tags=["👥 Gestión de Usuarios"])
def get_ingenieros(cliente: int = Query(..., description="Número de cliente")):
    """Obtiene todos los ingenieros de un cliente específico con sus compresores asignados"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT
                e.id,
                e.name,
                e.email,
                e.numeroCliente,
                e.email_daily,
                e.email_weekly,
                e.email_monthly,
                u.rol,
                GROUP_CONCAT(DISTINCT c.Alias) as compressor_names
            FROM ingenieros e
            LEFT JOIN usuarios_auth u ON e.email = u.email AND e.numeroCliente = u.numeroCliente
            LEFT JOIN ingeniero_compresor ic ON e.id = ic.ingeniero_id
            LEFT JOIN compresores c ON ic.compresor_id = c.id
            WHERE e.numeroCliente = %s
            GROUP BY e.id, e.name, e.email, e.numeroCliente, e.email_daily, e.email_weekly, e.email_monthly, u.rol
            ORDER BY e.name;
        """
        cursor.execute(query, (cliente,))
        ingenieros = cursor.fetchall()

        formatted_ingenieros = []
        for ingeniero in ingenieros:
            formatted_ingeniero = {
                "id": str(ingeniero['id']),
                "name": ingeniero['name'],
                "email": ingeniero['email'],
                "rol": ingeniero.get('rol', 4),
                "compressors": [],
                "emailPreferences": {
                    "daily": bool(ingeniero.get('email_daily', False)),
                    "weekly": bool(ingeniero.get('email_weekly', False)),
                    "monthly": bool(ingeniero.get('email_monthly', False))
                }
            }

            if ingeniero['compressor_names']:
                formatted_ingeniero['compressors'] = ingeniero['compressor_names'].split(',')

            formatted_ingenieros.append(formatted_ingeniero)

        cursor.close()
        conn.close()

        return formatted_ingenieros

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching ingenieros: {str(e)}")


@ingenieros_router.get("/compresores", tags=["⚙️ Gestión de Compresores"])
def get_compresores(cliente: int = Query(..., description="Número de cliente")):
    """Obtiene todos los compresores de un cliente específico"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT c.id, c.linea, c.proyecto as id_cliente, c.Alias as alias FROM compresores c JOIN clientes c2 ON c2.id_cliente = c.id_cliente WHERE c2.numero_cliente = %s;",
            (cliente,)
        )
        compresores = cursor.fetchall()

        cursor.close()
        conn.close()

        formatted_compresores = [
            {
                "id": str(comp['id']),
                "id_cliente": comp['id_cliente'],
                "linea": comp['linea'],
                "alias": comp['alias'],
            }
            for comp in compresores
        ]

        return formatted_compresores

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching compresores: {str(e)}")


@ingenieros_router.post("/ingenieros", tags=["👥 Gestión de Usuarios"])
def create_ingeniero(
    name: str = Body(...),
    email: EmailStr = Body(...),
    compressors: list[str] = Body(default=[]),
    numeroCliente: int = Body(..., description="Número de cliente"),
    rol: int = Body(default=4, description="Rol del usuario")
):
    """Crea un nuevo ingeniero con sus compresores asignados"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Verificar si el email ya existe
        cursor.execute("SELECT id FROM ingenieros WHERE email = %s", (email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="El email ya está registrado")

        # Insertar el ingeniero
        cursor.execute(
            """INSERT INTO ingenieros (name, email, numeroCliente, email_daily, email_weekly, email_monthly)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (name, email, numeroCliente, False, False, False)
        )
        ingeniero_id = cursor.lastrowid

        # Asignar compresores
        if compressors and len(compressors) > 0:
            cursor.execute(
                """SELECT c.id, c.id_cliente, c.linea, c.Alias
                   FROM compresores c
                   JOIN clientes cl ON c.id_cliente = cl.id_cliente
                   WHERE c.id IN (%s) AND cl.numero_cliente = %s""" %
                (','.join(['%s'] * len(compressors)), '%s'),
                compressors + [numeroCliente]
            )
            valid_compressors = cursor.fetchall()

            if valid_compressors:
                values = [(ingeniero_id, comp['id']) for comp in valid_compressors]
                cursor.executemany(
                    "INSERT INTO ingeniero_compresor (ingeniero_id, compresor_id) VALUES (%s, %s)",
                    values
                )

        # Crear entrada en usuarios_auth
        cursor.execute(
            """INSERT INTO usuarios_auth (email, numeroCliente, rol, name)
               VALUES (%s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE
               numeroCliente = VALUES(numeroCliente),
               rol = VALUES(rol),
               name = VALUES(name)""",
            (email, numeroCliente, rol, name)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": str(ingeniero_id),
            "name": name,
            "email": email,
            "compressors": compressors,
            "emailPreferences": {
                "daily": False,
                "weekly": False,
                "monthly": False
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating ingeniero: {str(e)}")


@ingenieros_router.put("/ingenieros/{ingeniero_id}", tags=["👥 Gestión de Usuarios"])
def update_ingeniero(
    ingeniero_id: int,
    name: str = Body(...),
    email: EmailStr = Body(...),
    compressors: list[str] = Body(default=[]),
    numeroCliente: int = Body(..., description="Número de cliente"),
    rol: int = Body(default=4, description="Rol del usuario")
):
    """Actualiza un ingeniero existente y sus compresores asignados"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Verificar si el ingeniero existe
        cursor.execute(
            "SELECT id, email FROM ingenieros WHERE id = %s AND numeroCliente = %s",
            (ingeniero_id, numeroCliente)
        )
        existing_engineer = cursor.fetchone()
        if not existing_engineer:
            raise HTTPException(status_code=404, detail="Ingeniero no encontrado")

        old_email = existing_engineer['email']

        # Verificar email duplicado
        cursor.execute(
            "SELECT id FROM ingenieros WHERE email = %s AND id != %s",
            (email, ingeniero_id)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="El email ya está registrado")

        # Actualizar datos
        cursor.execute(
            "UPDATE ingenieros SET name = %s, email = %s WHERE id = %s",
            (name, email, ingeniero_id)
        )

        # Eliminar asignaciones existentes
        cursor.execute(
            "DELETE FROM ingeniero_compresor WHERE ingeniero_id = %s",
            (ingeniero_id,)
        )

        # Asignar nuevos compresores
        if compressors and len(compressors) > 0:
            cursor.execute(
                """SELECT c.id, c.id_cliente, c.linea, c.Alias
                   FROM compresores c
                   JOIN clientes cl ON c.id_cliente = cl.id_cliente
                   WHERE c.id IN (%s) AND cl.numero_cliente = %s""" %
                (','.join(['%s'] * len(compressors)), '%s'),
                compressors + [numeroCliente]
            )
            valid_compressors = cursor.fetchall()

            if valid_compressors:
                values = [(ingeniero_id, comp['id']) for comp in valid_compressors]
                cursor.executemany(
                    "INSERT INTO ingeniero_compresor (ingeniero_id, compresor_id) VALUES (%s, %s)",
                    values
                )

        # Actualizar usuarios_auth
        cursor.execute(
            """UPDATE usuarios_auth SET email = %s, name = %s, rol = %s
               WHERE email = %s AND numeroCliente = %s""",
            (email, name, rol, old_email, numeroCliente)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": str(ingeniero_id),
            "name": name,
            "email": email,
            "compressors": compressors
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating ingeniero: {str(e)}")


@ingenieros_router.delete("/ingenieros/{ingeniero_id}", tags=["👥 Gestión de Usuarios"])
def delete_ingeniero(
    ingeniero_id: int,
    cliente: int = Query(..., description="Número de cliente para verificación")
):
    """Elimina un ingeniero y sus asignaciones de compresores"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT name, email FROM ingenieros WHERE id = %s AND numeroCliente = %s",
            (ingeniero_id, cliente)
        )
        ingeniero = cursor.fetchone()
        if not ingeniero:
            raise HTTPException(status_code=404, detail="Ingeniero no encontrado")

        cursor.execute(
            "DELETE FROM ingeniero_compresor WHERE ingeniero_id = %s",
            (ingeniero_id,)
        )

        cursor.execute("DELETE FROM ingenieros WHERE id = %s", (ingeniero_id,))

        cursor.execute(
            "DELETE FROM usuarios_auth WHERE email = %s AND numeroCliente = %s AND rol = 3",
            (ingeniero['email'], cliente)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": f"Ingeniero {ingeniero['name']} eliminado correctamente",
            "id": str(ingeniero_id)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting ingeniero: {str(e)}")


@ingenieros_router.put("/ingenieros/{ingeniero_id}/email-preferences", tags=["⚙️ Configuración de Usuario"])
def update_email_preferences(
    ingeniero_id: int,
    daily: bool = Body(...),
    weekly: bool = Body(...),
    monthly: bool = Body(...)
):
    """Actualiza las preferencias de email de un ingeniero"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM ingenieros WHERE id = %s", (ingeniero_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Ingeniero no encontrado")

        cursor.execute(
            """UPDATE ingenieros
               SET email_daily = %s, email_weekly = %s, email_monthly = %s
               WHERE id = %s""",
            (daily, weekly, monthly, ingeniero_id)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": str(ingeniero_id),
            "emailPreferences": {
                "daily": daily,
                "weekly": weekly,
                "monthly": monthly
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating email preferences: {str(e)}")


@ingenieros_router.patch("/ingenieros/{ingeniero_id}/preferences", tags=["⚙️ Configuración de Usuario"])
def patch_email_preferences(
    ingeniero_id: int,
    daily: Optional[bool] = Body(None),
    weekly: Optional[bool] = Body(None),
    monthly: Optional[bool] = Body(None)
):
    """Actualiza las preferencias de email de un ingeniero (PATCH method)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT email_daily, email_weekly, email_monthly FROM ingenieros WHERE id = %s", (ingeniero_id,))
        current_prefs = cursor.fetchone()
        if not current_prefs:
            raise HTTPException(status_code=404, detail="Ingeniero no encontrado")

        new_daily = daily if daily is not None else current_prefs['email_daily']
        new_weekly = weekly if weekly is not None else current_prefs['email_weekly']
        new_monthly = monthly if monthly is not None else current_prefs['email_monthly']

        cursor.execute(
            """UPDATE ingenieros
               SET email_daily = %s, email_weekly = %s, email_monthly = %s
               WHERE id = %s""",
            (new_daily, new_weekly, new_monthly, ingeniero_id)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "id": str(ingeniero_id),
            "emailPreferences": {
                "daily": new_daily,
                "weekly": new_weekly,
                "monthly": new_monthly
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating email preferences: {str(e)}")


@ingenieros_router.get("/ingenieros/{email}/compresores", tags=["👨‍💼 Vista de Ingeniero"])
def get_engineer_compressors(email: str):
    """Obtiene los compresores asignados a un ingeniero específico"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT DISTINCT
                c.id,
                COALESCE(c.Alias, CONCAT(c.marca, ' - ', c.numero_serie)) as name,
                c.id_cliente,
                c.tipo,
                c.hp
            FROM compresores c
            INNER JOIN ingeniero_compresor ec ON c.id = ec.compresor_id
            INNER JOIN ingenieros e ON ec.ingeniero_id = e.id
            WHERE e.email = %s
            ORDER BY COALESCE(c.Alias, c.marca)
        """
        cursor.execute(query, (email,))
        compresores = cursor.fetchall()

        cursor.close()
        conn.close()

        formatted_compresores = [
            {
                "id": str(comp['id']),
                "name": comp['name'],
                "id_cliente": comp['id_cliente'],
                "details": f"{comp['tipo']} - {comp['hp']}HP" if comp['tipo'] and comp['hp'] else ""
            }
            for comp in compresores
        ]

        return formatted_compresores

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching engineer compressors: {str(e)}")
