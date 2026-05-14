import sys
import asyncio
import threading
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from backend.version import __version__

router = APIRouter(prefix="/system", tags=["system"])

# --- Single-instance support ---
# When a second process detects the app is already running,
# it sends POST /system/show to signal the first instance to show its window.
_show_window_lock = threading.Lock()
_show_window_pending = False


@router.post("/show")
async def request_show_window():
    """Signal the running instance to bring its window to front."""
    global _show_window_pending
    with _show_window_lock:
        _show_window_pending = True
    return {"status": "ok"}


@router.get("/show-pending")
async def check_show_pending():
    """Polled by app.py to know when to call window.show()."""
    global _show_window_pending
    with _show_window_lock:
        pending = _show_window_pending
        _show_window_pending = False
    return {"pending": pending}

@router.get("/version")
async def get_version():
    return {"version": __version__}

@router.get("/cuda")
async def check_cuda():
    has_cuda = False
    try:
        import torch
        has_cuda = torch.cuda.is_available()
    except ImportError:
        try:
            import ctranslate2
            has_cuda = "cuda" in ctranslate2.get_supported_compute_types("cuda")
        except Exception:
            has_cuda = False
    except Exception:
        has_cuda = False

    has_cublas = False
    try:
        import nvidia.cublas
        has_cublas = True
    except ImportError:
        pass

    return {
        "has_cuda": has_cuda,
        "has_cublas_pip": has_cublas
    }

@router.post("/cuda/install")
async def install_cuda():
    import subprocess
    python_exe = sys.executable
    try:
        await asyncio.to_thread(
            subprocess.check_call,
            [python_exe, "-m", "pip", "install", "nvidia-cublas-cu12", "nvidia-cudnn-cu12"],
            timeout=300,
        )
        return {"status": "success", "message": "CUDA Libraries installed."}
    except subprocess.TimeoutExpired:
        return JSONResponse(status_code=500, content={"status": "error", "message": "pip install timed out (5 min)."})
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
