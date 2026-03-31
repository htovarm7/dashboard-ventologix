"""
Standalone PDF worker — runs as a subprocess so Playwright gets a fresh
event loop (ProactorEventLoop on Windows) without conflicting with uvicorn.

Usage: python pdf_worker_script.py <folio> <frontend_url>
Output: raw PDF bytes written to stdout
"""
import sys
import asyncio
from playwright.async_api import async_playwright


async def main() -> None:
    folio = sys.argv[1]
    frontend_url = sys.argv[2]
    view_path = sys.argv[3] if len(sys.argv) > 3 else "/features/compressor-maintenance/reports/view"
    view_url = f"{frontend_url}{view_path}?folio={folio}"

    print(f"📄 Opening: {view_url}", file=sys.stderr)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            # Use networkidle to wait for API fetches to complete
            await page.goto(view_url, wait_until="networkidle", timeout=120000)

            # Wait for the actual report content (not the loading overlay)
            # The report header has a gradient background that only renders after data loads
            try:
                await page.wait_for_selector(".bg-gradient-to-r", timeout=60000)
                print("✅ Report content loaded", file=sys.stderr)
            except Exception:
                # Fallback: wait for any shadow-lg card (report sections)
                await page.wait_for_selector(".shadow-lg", timeout=60000)
                print("⚠️  Used fallback selector for report content", file=sys.stderr)

            # Additional wait for React to finish rendering all sections
            await page.wait_for_timeout(3000)

            # Scroll through the full page to trigger any remaining lazy content
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

            # Wait for images to appear in DOM after scroll
            await page.wait_for_timeout(2000)

            # Convert all images to base64 data URLs to avoid CORS/loading issues in PDF
            img_info = await page.evaluate("""async () => {
                const imgs = Array.from(document.querySelectorAll('img'));
                let failed = 0;
                let converted = 0;
                await Promise.all(imgs.map(async (img) => {
                    const src = img.src;
                    if (!src || src.startsWith('data:')) return;
                    try {
                        const resp = await fetch(src);
                        if (!resp.ok) { failed++; return; }
                        const blob = await resp.blob();
                        const dataUrl = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                        img.src = dataUrl;
                        converted++;
                    } catch (e) {
                        failed++;
                    }
                }));
                return { total: imgs.length, converted, failed };
            }""")

            print(f"📸 Images: {img_info['total']} total, {img_info['converted']} converted, {img_info['failed']} failed", file=sys.stderr)

            # Wait for all images with base64 src to finish rendering
            await page.evaluate("""async () => {
                const imgs = Array.from(document.querySelectorAll('img'));
                await Promise.all(imgs.map(img => {
                    if (img.complete && img.naturalHeight > 0) return Promise.resolve();
                    return Promise.race([
                        new Promise(resolve => {
                            img.addEventListener('load', resolve);
                            img.addEventListener('error', resolve);
                        }),
                        new Promise(resolve => setTimeout(resolve, 15000))
                    ]);
                }));
            }""")

            # Extra buffer after images render
            await page.wait_for_timeout(3000)

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
