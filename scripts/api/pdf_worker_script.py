"""
Standalone PDF worker — runs as a subprocess so Playwright gets a fresh
event loop (ProactorEventLoop on Windows) without conflicting with uvicorn.

Usage: python pdf_worker_script.py <folio> <frontend_url>
Output: raw PDF bytes written to stdout
"""
import sys
import os
import asyncio
import base64
import mimetypes
from pathlib import Path

# Add the script's directory to sys.path so we can import sibling modules
sys.path.insert(0, str(Path(__file__).resolve().parent))

from playwright.async_api import async_playwright

# GCS direct access for serving images without HTTP proxy round-trips
from drive_utils import get_gcs_client, BUCKET_NAME


def _fetch_gcs_blob_as_data_url(blob_name: str) -> str | None:
    """Download a blob from GCS and return it as a base64 data URL."""
    try:
        client = get_gcs_client()
        gcs_blob = client.bucket(BUCKET_NAME).blob(blob_name)
        content = gcs_blob.download_as_bytes()
        content_type = gcs_blob.content_type or mimetypes.guess_type(blob_name)[0] or "image/jpeg"
        b64 = base64.b64encode(content).decode("ascii")
        return f"data:{content_type};base64,{b64}"
    except Exception as e:
        print(f"⚠️  GCS fetch failed for {blob_name}: {e}", file=sys.stderr)
        return None


async def main() -> None:
    folio = sys.argv[1]
    frontend_url = sys.argv[2]
    view_path = sys.argv[3] if len(sys.argv) > 3 else "/features/compressor-maintenance/reports/view"
    view_url = f"{frontend_url}{view_path}?folio={folio}"

    print(f"📄 Opening: {view_url}", file=sys.stderr)

    # Pre-load a cache for intercepted image requests
    image_cache: dict[str, str] = {}  # blob_name -> data URL

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()

            # Intercept foto proxy requests and serve images directly as data URLs
            # This avoids HTTP round-trips through the API proxy
            async def handle_route(route):
                url = route.request.url
                if "/reporte_mtto/foto?" in url:
                    # Extract blob parameter
                    from urllib.parse import urlparse, parse_qs
                    parsed = urlparse(url)
                    params = parse_qs(parsed.query)
                    blob_name = params.get("blob", [None])[0]

                    if blob_name:
                        # Check cache first
                        if blob_name not in image_cache:
                            data_url = _fetch_gcs_blob_as_data_url(blob_name)
                            if data_url:
                                image_cache[blob_name] = data_url

                        if blob_name in image_cache:
                            data_url = image_cache[blob_name]
                            # Extract content type and body from data URL
                            header, b64data = data_url.split(",", 1)
                            content_type = header.split(":")[1].split(";")[0]
                            body = base64.b64decode(b64data)
                            await route.fulfill(
                                status=200,
                                content_type=content_type,
                                body=body,
                            )
                            return

                # Fallback: let the request continue normally
                await route.continue_()

            await page.route("**/reporte_mtto/foto**", handle_route)

            # domcontentloaded is fast; we rely on the selector wait for data
            await page.goto(view_url, wait_until="domcontentloaded", timeout=60000)

            # Wait for the actual report content (not the loading overlay)
            try:
                await page.wait_for_selector(".bg-gradient-to-r", timeout=60000)
                print("✅ Report content loaded", file=sys.stderr)
            except Exception:
                await page.wait_for_selector(".shadow-lg", timeout=60000)
                print("⚠️  Used fallback selector", file=sys.stderr)

            # Brief wait for React to finish rendering sections
            await page.wait_for_timeout(1500)

            # Scroll to trigger any lazy content
            await page.evaluate("""async () => {
                await new Promise(resolve => {
                    let totalHeight = 0;
                    const distance = 400;
                    const timer = setInterval(() => {
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= document.body.scrollHeight) {
                            clearInterval(timer);
                            window.scrollTo(0, 0);
                            resolve();
                        }
                    }, 100);
                });
            }""")

            # Wait for all images to finish loading (served via route intercept)
            img_stats = await page.evaluate("""async () => {
                const imgs = Array.from(document.querySelectorAll('img'));
                let loaded = 0, failed = 0;
                await Promise.all(imgs.map(img => {
                    if (img.complete && img.naturalHeight > 0) {
                        loaded++;
                        return Promise.resolve();
                    }
                    return Promise.race([
                        new Promise(resolve => {
                            img.addEventListener('load', () => { loaded++; resolve(); });
                            img.addEventListener('error', () => { failed++; resolve(); });
                        }),
                        new Promise(resolve => setTimeout(() => { failed++; resolve(); }, 15000))
                    ]);
                }));
                return { total: imgs.length, loaded, failed };
            }""")

            print(f"📸 Images: {img_stats['total']} total, {img_stats['loaded']} loaded, {img_stats['failed']} failed", file=sys.stderr)

            # Brief buffer for final rendering
            await page.wait_for_timeout(1500)

            # Hide non-print elements
            await page.evaluate("""() => {
                document.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');
                const sidebar = document.querySelector('aside');
                if (sidebar) sidebar.style.display = 'none';
                document.querySelectorAll('nav').forEach(nav => nav.style.display = 'none');
                document.querySelectorAll('[class*="fixed"], [class*="sticky"]').forEach(el => {
                    if (!el.closest('.bg-white.rounded-lg')) el.style.display = 'none';
                });
                document.body.style.backgroundColor = 'white';
                const main = document.querySelector('.min-h-screen');
                if (main) { main.style.minHeight = 'auto'; main.style.padding = '20px'; }
            }""")

            pdf_bytes = await page.pdf(
                format="A3",
                print_background=True,
                margin={"top": "0.5in", "right": "0.5in", "bottom": "0.5in", "left": "0.5in"},
                prefer_css_page_size=False,
            )
        finally:
            await browser.close()

    sys.stdout.buffer.write(pdf_bytes)
    print("✅ PDF generated", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(main())
