from playwright.sync_api import sync_playwright
import requests

def generar_pdf_cliente(id_cliente, linea):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 1920, "height": 1080})

        url = f"http://localhost:3000/reportes?id_cliente={id_cliente}&linea={linea}"
        page.goto(url)

        page.wait_for_selector("#grafico-listo", timeout=50000)
        page.wait_for_timeout(10000) 

        page.screenshot(path=f"./pdfs/debug_{id_cliente}_linea_{linea}.png", full_page=True)
        # Exporta a PDF con id_cliente y linea en el nombre
        page.pdf(path=f"./pdfs/reporte_{id_cliente}_linea_{linea}.pdf", format="A4", print_background=True)

        browser.close()

generar_pdf_cliente(7, 'A')

# response = requests.get("http://127.0.0.1:8000/report/clients-data")
# clientes_data = response.json().get("data", [])

# for cliente in clientes_data:
#     id_cliente = cliente.get("id_cliente")
#     lineas = cliente.get("lineas", [])
    
#     for linea in lineas:
#         generar_pdf_cliente(id_cliente, linea)

# Para correrlo en la VM
# 0 8 * * * /usr/bin/python3 /ruta/script_generar_pdfs.py
