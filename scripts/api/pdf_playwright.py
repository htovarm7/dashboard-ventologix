"""
PDF Generation using Playwright to capture React view
"""
import os
import tempfile
from playwright.async_api import async_playwright
from fastapi import HTTPException


async def generate_pdf_from_react(folio: str, frontend_url: str = "https://dashboard.ventologix.com") -> bytes:
    """
    Generate a PDF by capturing the React view page using Playwright.

    Args:
        folio: The folio number of the report
        frontend_url: Base URL of the frontend application

    Returns:
        PDF file content as bytes
    """
    try:
        async with async_playwright() as p:
            # Launch browser in headless mode
            browser = await p.chromium.launch(headless=True)

            # Create a new page
            page = await browser.new_page()

            # Navigate to the view page with the folio
            view_url = f"{frontend_url}/features/compressor-maintenance/reports/view?folio={folio}"
            print(f"📄 Opening page: {view_url}")

            await page.goto(view_url, wait_until="networkidle", timeout=30000)

            # Wait for the main content to load
            await page.wait_for_selector('.bg-white', timeout=10000)

            # Give extra time for images to load
            await page.wait_for_timeout(2000)

            # Hide navigation buttons and elements that shouldn't be in PDF
            await page.evaluate("""
                () => {
                    // Hide all elements with 'no-print' class
                    const noPrintElements = document.querySelectorAll('.no-print');
                    noPrintElements.forEach(el => {
                        el.style.display = 'none';
                    });
                }
            """)

            # Generate PDF with proper settings in A3 format
            pdf_bytes = await page.pdf(
                format='A3',
                print_background=True,
                margin={
                    'top': '0.5in',
                    'right': '0.5in',
                    'bottom': '0.5in',
                    'left': '0.5in'
                },
                prefer_css_page_size=False,
            )

            await browser.close()

            print(f"✅ PDF generated successfully for folio: {folio}")
            return pdf_bytes

    except Exception as e:
        print(f"❌ Error generating PDF: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating PDF: {str(e)}"
        )
