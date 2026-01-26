"""
Endpoints de autenticación y gestión de usuarios
"""
from fastapi import HTTPException, APIRouter
from pydantic import BaseModel

from .db_utils import get_db_connection


class UpdateClientNumberRequest(BaseModel):
    email: str
    nuevo_numero_cliente: int


class UpdateUserRoleRequest(BaseModel):
    email: str
    nuevo_rol: int  # 0 = SuperAdmin, 1 = Gerente VT, 2 = VAST, 3 = Gerente Cliente, 4 = Cliente


auth = APIRouter(prefix="/web", tags=["🔐 Autenticación"])


@auth.get("/usuarios/{email}", tags=["🔐 Autenticación"])
def get_usuario_by_email(email: str):
    """Obtener usuario por email para autenticación"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. OBTENER USUARIO
        cursor.execute(
            "SELECT id, email, numeroCliente, rol, name FROM usuarios_auth WHERE email = %s",
            (email,)
        )
        usuario = cursor.fetchall()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        user = usuario[0]
        numeroCliente = user['numeroCliente']
        rol = user['rol']

        # 2. OBTENER COMPRESORES SEGÚN ROL
        compresores = []
        if rol in (3, 4):  # Cliente y gerente cliente
            cursor.execute("""
                SELECT c.id AS id_compresor, c.linea, c.proyecto AS id_cliente,
                       c.Alias AS alias, c.tipo AS tipo, c.numero_serie AS numero_serie
                FROM compresores c
                JOIN clientes c2 ON c2.id_cliente = c.id_cliente
                WHERE c2.numero_cliente = %s
            """, (numeroCliente,))
            compresores = cursor.fetchall()

        elif rol in (0, 1, 2):  # Admin, VT, VAST
            cursor.execute("""
                SELECT c.id AS id_compresor, c.linea, c.proyecto AS id_cliente,
                       c.Alias AS alias, c.numero_serie AS numero_serie,
                       c.tipo AS tipo, c2.nombre_cliente, c2.numero_cliente
                FROM compresores c
                JOIN clientes c2 ON c.id_cliente = c2.id_cliente
            """)
            compresores = cursor.fetchall()

        # 3. OBTENER MÓDULOS HABILITADOS PARA EL CLIENTE
        cursor.execute("""
            SELECT mantenimiento, reporteDia, reporteSemana, presion, prediccion, kwh
            FROM modulos_web
            WHERE numero_cliente = %s
        """, (numeroCliente,))
        modulos_row = cursor.fetchone()

        modulos = {}
        if modulos_row:
            modulos = {
                "mantenimiento": bool(modulos_row.get('mantenimiento', False)),
                "reporteDia": bool(modulos_row.get('reporteDia', False)),
                "reporteSemana": bool(modulos_row.get('reporteSemana', False)),
                "presion": bool(modulos_row.get('presion', False)),
                "prediccion": bool(modulos_row.get('prediccion', False)),
                "kwh": bool(modulos_row.get('kwh', False))
            }

        cursor.close()
        conn.close()

        return {
            "id": user['id'],
            "email": user['email'],
            "numeroCliente": numeroCliente,
            "rol": rol,
            "name": user['name'],
            "compresores": compresores,
            "modulos": modulos
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching usuario: {str(e)}")


@auth.put("/usuarios/update-client-number", tags=["🔧 Operaciones de Administrador"])
def update_user_client_number(request: UpdateClientNumberRequest):
    """Actualiza el número de cliente de un usuario específico (solo para administradores)"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Verificar que el usuario existe
        cursor.execute(
            "SELECT id, rol FROM usuarios_auth WHERE email = %s",
            (request.email,)
        )
        usuario = cursor.fetchone()
        cursor.fetchall()  # limpiar resultados

        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Verificar que el nuevo número de cliente existe
        cursor.execute(
            "SELECT id_cliente FROM clientes WHERE numero_cliente = %s",
            (request.nuevo_numero_cliente,)
        )
        cliente = cursor.fetchone()
        cursor.fetchall()  # limpiar resultados

        if not cliente:
            raise HTTPException(status_code=404, detail="Número de cliente no válido")

        # Actualizar el número de cliente
        cursor.execute(
            "UPDATE usuarios_auth SET numeroCliente = %s WHERE email = %s",
            (request.nuevo_numero_cliente, request.email)
        )

        # Si es un ingeniero, también actualizar en la tabla ingenieros
        if usuario['rol'] == 4:
            cursor.execute(
                "UPDATE ingenieros SET numeroCliente = %s WHERE email = %s",
                (request.nuevo_numero_cliente, request.email)
            )

        conn.commit()

        return {
            "message": "Número de cliente actualizado exitosamente",
            "email": request.email,
            "nuevo_numero_cliente": request.nuevo_numero_cliente
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating client number: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
