import sys
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from backend.version import __version__

router = APIRouter(prefix="/system", tags=["system"])

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
