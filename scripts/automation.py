from playwright.sync_api import sync_playwright
import requests
import smtplib
from email.message import EmailMessage
import os

def obtener_clientes_desde_api():
    # Llamada al API de clientes con líneas
    response = requests.get("http://127.0.0.1:8000/report/clients-data")
    if response.status_code == 200:
        return response.json().get("data", [])
    else:
        print("Error al obtener datos de clientes")
        return []


def generar_pdf_cliente(id_cliente, linea):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 1920, "height": 1080})

        url = f"http://localhost:3000/reportes?id_cliente={id_cliente}&linea={linea}"
        print(f"Abriendo URL: {url}")
        page.goto(url)

        print("Esperando que frontend avise que terminó de renderizar...")
        page.wait_for_function("window.status === 'pdf-ready'", timeout=100000)
        print("Frontend listo, generando PDF...")

        # page.screenshot(path=f"./pdfs/debug_{id_cliente}_linea_{linea}.png", full_page=True)
        page.pdf(path=f"./pdfs/reporte_{id_cliente}_linea_{linea}.pdf", format="A2", print_background=True)

        browser.close()

def generar_todos_los_pdfs():
    clientes = obtener_clientes_desde_api()
    
    if not clientes:
        print("⚠️ No se encontraron clientes.")
        return
    
    for cliente in clientes:
        id_cliente = cliente['id_cliente']
        linea = cliente['linea']
        try:
            print(f"Generando PDF para cliente {id_cliente}, línea {linea}")
            generar_pdf_cliente(id_cliente, linea)
            enviar_pdf_por_correo(id_cliente, linea)
        except Exception as e:
            print(f"❌ Error generando PDF para cliente {id_cliente}, línea {linea}: {e}")
            pass  # Continúa con el siguiente cliente

    print("✅ Todos los PDFs generados.")

def enviar_pdf_por_correo(id_cliente, linea):
    # # Obtén correos desde tu API
    # response = requests.get(f"http://127.0.0.1:8000/report/emails-data?id_cliente={id_cliente}&linea={linea}")
    # if response.status_code != 200:
    #     print(f"Error al obtener correos para cliente {id_cliente}, línea {linea}")
    #     return
    
    # correos = [item['correo'] for item in response.json().get("data", [])]
    # if not correos:
    #     print(f"No se encontraron correos para cliente {id_cliente}, línea {linea}")
    #     return

    # Configuración del correo
    asunto = f"Reporte PDF Cliente {id_cliente} Línea {linea}"
    cuerpo = f"Adjunto se encuentra el reporte PDF del cliente {id_cliente}, línea {linea}."

    ruta_pdf = f"./pdfs/reporte_{id_cliente}_linea_{linea}.pdf"
    if not os.path.exists(ruta_pdf):
        print(f"❌ No se encontró el PDF: {ruta_pdf}")
        return

    msg = EmailMessage()
    msg['Subject'] = asunto
    msg['From'] = 'hector.tovar@ventologix.com'
    # msg['To'] = ', '.join(correos)
    msg['To'] = 'andres.mirazo@ventologix.com'
    msg.set_content(cuerpo)

    # Adjuntar PDF
    with open(ruta_pdf, 'rb') as f:
        pdf_data = f.read()
        msg.add_attachment(pdf_data, maintype='application', subtype='pdf', filename=os.path.basename(ruta_pdf))

    # Enviar correo
    try:
        with smtplib.SMTP('smtp.tudominio.com', 587) as smtp:
            smtp.starttls()
            smtp.login('tucorreo@tudominio.com', 'tu_password')
            smtp.send_message(msg)
            print(f"📧 Correo enviado a andres con PDF {ruta_pdf}")
    except Exception as e:
        print(f"Error al enviar correo: {e}")
