"""
Endpoints para gestión del equipo Ventologix
"""
from fastapi import HTTPException, APIRouter, Query
import mysql.connector
import os
from dotenv import load_dotenv
from typing import List
from pydantic import BaseModel, EmailStr
from .db_utils import get_db_connection

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

ventologix = APIRouter(prefix="/ventologix", tags=["🏢 Ventologix"])


class TeamMember(BaseModel):
    """Modelo para miembros del equipo Ventologix"""
    id: int = None
    nombre: str
    puesto: str
    correo: EmailStr
    telefono: str = None
    tecnico: int = 0  # 0 o 1
    rol: int  # 0: SuperADMIN, 1: Ingeniero, 2: Técnico Supervisor, 3: Técnico, 4: Visualización


class TeamMemberResponse(BaseModel):
    """Respuesta con datos del miembro del equipo"""
    id: int
    nombre: str
    puesto: str
    correo: str
    telefono: str = None
    tecnico: int
    rol: int


@ventologix.get("/team", tags=["👥 Equipo Ventologix"])
def get_team_members():
    """Obtiene todos los miembros del equipo Ventologix"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT v.id, v.nombre, v.puesto, v.correo, v.telefono, v.tecnico, ua.rol
            FROM ventologix v
            JOIN usuarios_auth ua ON ua.email = v.correo
            ORDER BY nombre ASC
        """)
        members = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "data": members
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team members: {str(e)}")


@ventologix.get("/team/{team_id}", tags=["👥 Equipo Ventologix"])
def get_team_member(team_id: int):
    """Obtiene un miembro específico del equipo Ventologix"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT v.id, v.nombre, v.puesto, v.correo, v.telefono, v.tecnico, ua.rol
            FROM ventologix v
            JOIN usuarios_auth ua ON ua.email = v.correo
            WHERE v.id = %s
        """, (team_id,))
        member = cursor.fetchone()

        cursor.close()
        conn.close()

        if not member:
            raise HTTPException(status_code=404, detail="Miembro no encontrado")

        return {
            "success": True,
            "data": member
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team member: {str(e)}")


@ventologix.post("/team", tags=["👥 Equipo Ventologix"])
def create_team_member(member: TeamMember):
    """Crea un nuevo miembro del equipo Ventologix"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Validar que el email no exista en ventologix
        cursor.execute(
            "SELECT id FROM ventologix WHERE correo = %s",
            (member.correo,)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="El email ya está registrado")

        # Insertar nuevo miembro en ventologix
        cursor.execute("""
            INSERT INTO ventologix (nombre, puesto, correo, telefono, tecnico)
            VALUES (%s, %s, %s, %s, %s)
        """, (member.nombre, member.puesto, member.correo, member.telefono or "", member.tecnico))

        member_id = cursor.lastrowid
        
        # Insertar/actualizar en usuarios_auth
        cursor.execute("""
            INSERT INTO usuarios_auth (email, rol, name)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE rol = VALUES(rol), name = VALUES(name)
        """, (member.correo, member.rol, member.nombre))
        
        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "data": {
                "id": member_id,
                "nombre": member.nombre,
                "puesto": member.puesto,
                "correo": member.correo,
                "telefono": member.telefono,
                "tecnico": member.tecnico,
                "rol": member.rol
            }
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating team member: {str(e)}")


@ventologix.put("/team/{team_id}", tags=["👥 Equipo Ventologix"])
def update_team_member(team_id: int, member: TeamMember):
    """Actualiza un miembro del equipo Ventologix"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Verificar que el miembro existe
        cursor.execute(
            "SELECT id, correo FROM ventologix WHERE id = %s",
            (team_id,)
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Miembro no encontrado")

        old_email = existing['correo']
        
        # Validar que el email no exista en otro miembro
        if old_email != member.correo:
            cursor.execute(
                "SELECT id FROM ventologix WHERE correo = %s AND id != %s",
                (member.correo, team_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="El email ya está registrado")

        # Actualizar miembro en ventologix
        cursor.execute("""
            UPDATE ventologix
            SET nombre = %s, puesto = %s, correo = %s, telefono = %s, tecnico = %s
            WHERE id = %s
        """, (member.nombre, member.puesto, member.correo, member.telefono or "", member.tecnico, team_id))

        # Si cambió el email, actualizar en usuarios_auth
        if old_email != member.correo:
            # Eliminar registro antiguo
            cursor.execute(
                "DELETE FROM usuarios_auth WHERE email = %s",
                (old_email,)
            )
        
        # Insertar/actualizar en usuarios_auth con el nuevo email y rol
        cursor.execute("""
            INSERT INTO usuarios_auth (email, rol, name)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE rol = VALUES(rol), name = VALUES(name)
        """, (member.correo, member.rol, member.nombre))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "data": {
                "id": team_id,
                "nombre": member.nombre,
                "puesto": member.puesto,
                "correo": member.correo,
                "telefono": member.telefono,
                "tecnico": member.tecnico,
                "rol": member.rol
            }
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating team member: {str(e)}")


@ventologix.delete("/team/{team_id}", tags=["👥 Equipo Ventologix"])
def delete_team_member(team_id: int):
    """Elimina un miembro del equipo Ventologix"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Verificar que el miembro existe y obtener su email
        cursor.execute(
            "SELECT id, correo FROM ventologix WHERE id = %s",
            (team_id,)
        )
        member = cursor.fetchone()
        if not member:
            raise HTTPException(status_code=404, detail="Miembro no encontrado")

        member_email = member['correo']
        
        # Eliminar miembro de ventologix
        cursor.execute("DELETE FROM ventologix WHERE id = %s", (team_id,))
        
        # Eliminar de usuarios_auth también
        cursor.execute(
            "DELETE FROM usuarios_auth WHERE email = %s",
            (member_email,)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Miembro eliminado correctamente"
        }

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting team member: {str(e)}")
