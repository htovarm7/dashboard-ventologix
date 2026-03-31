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
            await page.goto(view_url, wait_until="networkidle", timeout=60000)
            await page.wait_for_selector(".bg-white", timeout=15000)

            # Scroll through the full page to trigger lazy-loaded images
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

            # Wait for every <img> to finish loading (max 30s per image)
            await page.evaluate("""async () => {
                const imgs = Array.from(document.querySelectorAll('img'));
                await Promise.all(imgs.map(img => {
                    if (img.complete) return Promise.resolve();
                    return Promise.race([
                        new Promise(resolve => {
                            img.addEventListener('load', resolve);
                            img.addEventListener('error', resolve);
                        }),
                        new Promise(resolve => setTimeout(resolve, 30000))
                    ]);
                }));
            }""")

            # Extra buffer after images load
            await page.wait_for_timeout(1500)

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
