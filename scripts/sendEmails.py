import mysql.connector
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from datetime import datetime, timedelta

# --- CONFIGURACIÓN SMTP ---
SMTP_SERVER = "tu.servidor.smtp.com"
SMTP_PORT = 587
SMTP_USER = "tu_correo@ventologix.com"
SMTP_PASS = "tu_password"

# --- CONFIGURACIÓN DB ---
DB_CONFIG = {
    'host': 'localhost',
    'user': 'tu_usuario',
    'password': 'tu_password',
    'database': 'pruebas'
}

def obtener_datos_envio(tipo_reporte="diario"):
    """
    Obtiene usuarios y sus compresores asociados filtrando por el check en la DB.
    """
    columna_filtro = "envio_diario" if tipo_reporte == "diario" else "envio_semanal"
    
    query = f"""
    SELECT 
        u.email, u.name as usuario_nombre, u.rol,
        c.nombre_cliente, c.numero_cliente, c.champion,
        comp.Alias as compresor_alias,
        d.id_kpm as vto_id
    FROM usuarios_auth u
    JOIN clientes c ON u.numeroCliente = c.numero_cliente
    JOIN compresores comp ON c.id_cliente = comp.id_cliente
    JOIN dispositivo d ON comp.id_cliente = d.id_cliente
    WHERE u.{columna_filtro} = 1
    ORDER BY c.numero_cliente;
    """
    
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query)
    resultados = cursor.fetchall()
    cursor.close()
    conn.close()
    return resultados

def procesar_y_enviar(tipo_reporte="diario"):
    datos = obtener_datos_envio(tipo_reporte)
    if not datos:
        print(f"No hay envíos programados para el reporte {tipo_reporte}.")
        return

    # Agrupamos por Numero de Cliente para mandar un solo correo por empresa
    clientes_agrupados = {}
    for fila in datos:
        num_cliente = fila['numero_cliente']
        if num_cliente not in clientes_agrupados:
            clientes_agrupados[num_cliente] = {
                'info_cliente': {
                    'nombre': fila['nombre_cliente'],
                    'champion': fila['champion']
                },
                'destinatarios': {'to': [], 'cc': []},
                'equipos': []
            }
        
        # Clasificar emails por Rol (0,1,2 -> CC | 3,4 -> TO)
        if fila['rol'] in [0, 1, 2]:
            if fila['email'] not in clientes_agrupados[num_cliente]['destinatarios']['cc']:
                clientes_agrupados[num_cliente]['destinatarios']['cc'].append(fila['email'])
        else:
            if fila['email'] not in clientes_agrupados[num_cliente]['destinatarios']['to']:
                clientes_agrupados[num_cliente]['destinatarios']['to'].append(fila['email'])
        
        # Agregar equipo a la lista de adjuntos (evitar duplicados de equipos)
        equipo = {'alias': fila['compresor_alias'], 'vto': fila['vto_id']}
        if equipo not in clientes_agrupados[num_cliente]['equipos']:
            clientes_agrupados[num_cliente]['equipos'].append(equipo)

    # Enviar los correos
    fecha_str = (datetime.now() - timedelta(days=1)).strftime('%d/%m/%Y')
    
    for num_id, contenido in clientes_agrupados.items():
        if not contenido['destinatarios']['to']: continue # Saltar si no hay cliente a quien enviar

        msg = MIMEMultipart()
        msg['Subject'] = f"Reporte {tipo_reporte.capitalize()} VENTOLOGIX - {contenido['info_cliente']['nombre']} ({fecha_str})"
        msg['From'] = SMTP_USER
        msg['To'] = ", ".join(contenido['destinatarios']['to'])
        if contenido['destinatarios']['cc']:
            msg['Cc'] = ", ".join(contenido['destinatarios']['cc'])

        # Cuerpo del correo dinámico
        lista_equipos_html = "".join([f"<li>{e['alias']} (VTO: {e['vto']})</li>" for e in contenido['equipos']])
        
        cuerpo = f"""
        <html>
            <body>
                <p>Estimado Ing. <strong>{contenido['info_cliente']['champion']}</strong>:</p>
                <p>Soy el sistema <strong>VTO</strong> de VENTOLOGIX. Adjunto encontrará el reporte <strong>{tipo_reporte}</strong> 
                correspondiente a sus equipos en la planta <strong>{contenido['info_cliente']['nombre']}</strong>:</p>
                <ul>{lista_equipos_html}</ul>
                <p>Los datos han sido analizados y procesados automáticamente para su revisión.</p>
                <p><strong>IQ YOUR CFMs!</strong></p>
            </body>
        </html>
        """
        msg.attach(MIMEText(cuerpo, 'html'))

        # Lógica de Adjuntos (Aquí simulas la ruta de tus PDFs generados)
        for e in contenido['equipos']:
            try:
                # AQUÍ defines la ruta real de tus PDFs según tu estructura
                ruta_pdf = f"reportes_generados/{tipo_reporte}_{e['vto']}_{fecha_str.replace('/','-')}.pdf"
                with open(ruta_pdf, "rb") as f:
                    part = MIMEApplication(f.read(), Name=f"Reporte_{e['alias']}.pdf")
                    part['Content-Disposition'] = f'attachment; filename="Reporte_{e["alias"]}.pdf"'
                    msg.attach(part)
            except FileNotFoundError:
                print(f"Archivo no encontrado para {e['alias']}, se envía correo sin este adjunto.")

        # Envío real por SMTP
        try:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
            print(f"Correo enviado exitosamente a {contenido['info_cliente']['nombre']}")
        except Exception as ex:
            print(f"Error enviando a {contenido['info_cliente']['nombre']}: {ex}")

# --- DISPARADORES ---
if __name__ == "__main__":
    # Puedes ejecutar esto con un CronJob:
    # python automation_reports.py diario  -> a las 7:00 AM
    # python automation_reports.py semanal -> los lunes a las 8:00 AM
    import sys
    tipo = sys.argv[1] if len(sys.argv) > 1 else "diario"
    procesar_y_enviar(tipo)