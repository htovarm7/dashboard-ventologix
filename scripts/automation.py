from playwright.sync_api import sync_playwright
import requests

def generar_pdf_cliente(id_cliente):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        url = f"http://localhost:3000/reportes?id_cliente={id_cliente}"
        page.goto(url)

        # Espera a que se rendericen los gráficos
        page.wait_for_selector("#grafico-listo", timeout=50000)

        # Exporta a PDF
        page.pdf(path=f"./pdfs/reporte_{id_cliente}.pdf", format="A4")

        browser.close()

response = requests.get("http://127.0.0.1:8000/report/clients-data")
clientes_data = response.json().get("data", [])

for cliente in clientes_data:
    id_cliente = cliente.get("id_cliente")
    generar_pdf_cliente(id_cliente)

# Para correrlo en la VM 0 8 * * * /usr/bin/python3 /ruta/script_generar_pdfs.py

