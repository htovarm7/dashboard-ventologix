"""
Script para verificar la configuración de compresores y sus módulos
Esto ayuda a diagnosticar por qué algunos compresores no muestran reportes
"""

import mysql.connector
import os
from dotenv import load_dotenv
from tabulate import tabulate

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

def verificar_compresor(alias_compresor=None, numero_cliente=None):
    """
    Verifica la configuración de un compresor específico o de todos los compresores de un cliente
    """
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        cursor = conn.cursor(dictionary=True)

        print("\n" + "="*100)
        print("VERIFICACIÓN DE CONFIGURACIÓN DE COMPRESORES")
        print("="*100 + "\n")

        # 1. VERIFICAR COMPRESORES
        if alias_compresor:
            query = """
                SELECT c.id, c.Alias, c.linea, c.numero_serie, c.id_cliente,
                       c.proyecto AS numero_cliente_proyecto,
                       cl.numero_cliente, cl.nombre_cliente
                FROM compresores c
                LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
                WHERE c.Alias LIKE %s
            """
            cursor.execute(query, (f"%{alias_compresor}%",))
        elif numero_cliente:
            query = """
                SELECT c.id, c.Alias, c.linea, c.numero_serie, c.id_cliente,
                       c.proyecto AS numero_cliente_proyecto,
                       cl.numero_cliente, cl.nombre_cliente
                FROM compresores c
                LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
                WHERE cl.numero_cliente = %s
            """
            cursor.execute(query, (numero_cliente,))
        else:
            print("❌ Debes proporcionar un alias de compresor o número de cliente")
            return

        compresores = cursor.fetchall()

        if not compresores:
            print(f"❌ No se encontraron compresores con el criterio especificado")
            return

        print(f"✅ Se encontraron {len(compresores)} compresor(es):\n")

        # Mostrar información de compresores
        headers = ["ID", "Alias", "Línea", "No. Serie", "ID Cliente", "No. Cliente", "Nombre Cliente"]
        rows = []
        for c in compresores:
            rows.append([
                c['id'],
                c['Alias'],
                c['linea'],
                c['numero_serie'],
                c['id_cliente'],
                c['numero_cliente'],
                c['nombre_cliente']
            ])

        print(tabulate(rows, headers=headers, tablefmt="grid"))
        print()

        # 2. VERIFICAR SECCIONES HABILITADAS PARA CADA CLIENTE
        print("\n" + "-"*100)
        print("VERIFICACIÓN DE SECCIONES HABILITADAS")
        print("-"*100 + "\n")

        numeros_cliente = list(set([c['numero_cliente'] for c in compresores]))

        for num_cliente in numeros_cliente:
            cursor.execute("""
                SELECT seccion, habilitado
                FROM cliente_secciones
                WHERE numeroCliente = %s
            """, (num_cliente,))

            secciones = cursor.fetchall()

            print(f"\n📋 Cliente No. {num_cliente}:")

            if not secciones:
                print(f"   ⚠️  NO TIENE SECCIONES CONFIGURADAS en 'cliente_secciones'")
                print(f"   ⚠️  ESTO ES LA CAUSA DE QUE NO APAREZCAN LOS REPORTES\n")
                print(f"   💡 Solución: Ejecutar el siguiente comando SQL:")
                print(f"""
   INSERT INTO cliente_secciones (numeroCliente, seccion, habilitado) VALUES
   ({num_cliente}, 'ReporteDia', 1),
   ({num_cliente}, 'ReporteSemana', 1),
   ({num_cliente}, 'Mantenimiento', 1),
   ({num_cliente}, 'Presion', 1),
   ({num_cliente}, 'Prediccion', 1),
   ({num_cliente}, 'KWH', 1);
                """)
            else:
                # Crear tabla de secciones
                headers_sec = ["Sección", "Estado"]
                rows_sec = []

                secciones_dict = {s['seccion']: s['habilitado'] for s in secciones}

                # Verificar secciones importantes
                secciones_importantes = ['ReporteDia', 'ReporteSemana', 'Mantenimiento', 'Presion', 'Prediccion', 'KWH']

                for seccion in secciones_importantes:
                    if seccion in secciones_dict:
                        estado = "✅ HABILITADA" if secciones_dict[seccion] else "❌ DESHABILITADA"
                    else:
                        estado = "⚠️  NO CONFIGURADA"

                    rows_sec.append([seccion, estado])

                print(tabulate(rows_sec, headers=headers_sec, tablefmt="grid"))

                # Verificar si faltan secciones críticas para reportes
                reportes_habilitados = (
                    secciones_dict.get('ReporteDia', 0) or
                    secciones_dict.get('ReporteSemana', 0)
                )

                if not reportes_habilitados:
                    print(f"\n   ⚠️  LOS REPORTES NO ESTÁN HABILITADOS")
                    print(f"   💡 Solución: Ejecutar el siguiente comando SQL:")
                    print(f"""
   UPDATE cliente_secciones SET habilitado = 1
   WHERE numeroCliente = {num_cliente} AND seccion IN ('ReporteDia', 'ReporteSemana');
                    """)

        # 3. VERIFICAR MÓDULOS WEB (opcional, sistema legacy)
        print("\n" + "-"*100)
        print("VERIFICACIÓN DE MÓDULOS WEB (Sistema Alternativo)")
        print("-"*100 + "\n")

        for num_cliente in numeros_cliente:
            cursor.execute("""
                SELECT numero_cliente, mantenimiento, reporteDia, reporteSemana,
                       presion, prediccion, kwh, nombre_cliente
                FROM modulos_web
                WHERE numero_cliente = %s
            """, (num_cliente,))

            modulo = cursor.fetchone()

            if modulo:
                print(f"\n📋 Cliente No. {num_cliente} - {modulo['nombre_cliente']}:")
                headers_mod = ["Módulo", "Estado"]
                rows_mod = [
                    ["Mantenimiento", "✅ HABILITADO" if modulo['mantenimiento'] else "❌ DESHABILITADO"],
                    ["Reporte Día", "✅ HABILITADO" if modulo['reporteDia'] else "❌ DESHABILITADO"],
                    ["Reporte Semana", "✅ HABILITADO" if modulo['reporteSemana'] else "❌ DESHABILITADO"],
                    ["Presión", "✅ HABILITADO" if modulo['presion'] else "❌ DESHABILITADO"],
                    ["Predicción", "✅ HABILITADO" if modulo['prediccion'] else "❌ DESHABILITADO"],
                    ["KWH", "✅ HABILITADO" if modulo['kwh'] else "❌ DESHABILITADO"],
                ]
                print(tabulate(rows_mod, headers=headers_mod, tablefmt="grid"))
            else:
                print(f"\n   ℹ️  Cliente No. {num_cliente}: No tiene configuración en modulos_web")

        print("\n" + "="*100)
        print("RESUMEN")
        print("="*100 + "\n")
        print("Para que los reportes aparezcan, se necesita:")
        print("1. ✅ Compresor registrado en la tabla 'compresores'")
        print("2. ✅ Cliente tiene secciones 'ReporteDia' y 'ReporteSemana' HABILITADAS en 'cliente_secciones'")
        print("3. ✅ El usuario selecciona el compresor en el dropdown")
        print("\nSi alguna de estas condiciones falla, los reportes NO aparecerán.\n")

        cursor.close()
        conn.close()

    except mysql.connector.Error as err:
        print(f"❌ Error de base de datos: {err}")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    import sys

    print("\n🔍 Script de Verificación de Compresores")
    print("Este script verifica la configuración de compresores y módulos\n")

    if len(sys.argv) > 1:
        # Si se pasa un argumento, asumimos que es un alias o número de cliente
        argumento = sys.argv[1]

        # Intentar como número de cliente primero
        try:
            numero = int(argumento)
            verificar_compresor(numero_cliente=numero)
        except ValueError:
            # Si no es número, es un alias
            verificar_compresor(alias_compresor=argumento)
    else:
        # Modo interactivo
        print("Opciones:")
        print("1. Verificar por alias de compresor")
        print("2. Verificar por número de cliente")

        opcion = input("\nSeleccione una opción (1 o 2): ").strip()

        if opcion == "1":
            alias = input("Ingrese el alias del compresor (o parte de él): ").strip()
            verificar_compresor(alias_compresor=alias)
        elif opcion == "2":
            numero = input("Ingrese el número de cliente: ").strip()
            try:
                numero = int(numero)
                verificar_compresor(numero_cliente=numero)
            except ValueError:
                print("❌ El número de cliente debe ser un número válido")
        else:
            print("❌ Opción no válida")