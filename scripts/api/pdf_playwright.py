"""
PDF Generation using Playwright.
Runs the browser in a separate subprocess to avoid asyncio/ProactorEventLoop
conflicts on Windows when called from uvicorn.
"""
import asyncio
import os
import subprocess
import sys
import traceback

from fastapi import HTTPException

_WORKER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdf_worker_script.py")


def _run_worker(folio: str, frontend_url: str, view_path: str = "/features/compressor-maintenance/reports/view") -> bytes:
    """Blocking call — intended to run inside run_in_executor."""
    result = subprocess.run(
        [sys.executable, _WORKER, folio, frontend_url, view_path],
        capture_output=True,
        timeout=300,
    )
    stderr_text = result.stderr.decode("utf-8", errors="replace")
    if stderr_text:
        print(stderr_text)  # forward worker logs to server console

    if result.returncode != 0:
        raise RuntimeError(f"PDF worker exited {result.returncode}:\n{stderr_text}")

    if not result.stdout:
        raise RuntimeError(f"PDF worker returned no data.\n{stderr_text}")

    return result.stdout


async def generate_pdf_from_react(folio: str, frontend_url: str = "https://dashboard.ventologix.com", view_path: str = "/features/compressor-maintenance/reports/view") -> bytes:
    """
    Generate a PDF by capturing the React view page using Playwright.
    The browser runs in a subprocess to avoid Windows event-loop conflicts.
    """
    try:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _run_worker, folio, frontend_url, view_path)
    except Exception as e:
        tb = traceback.format_exc()
        print(f"❌ Error generating PDF: {type(e).__name__}: {repr(e)}\n{tb}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating PDF [{type(e).__name__}]: {repr(e)}",
        )
