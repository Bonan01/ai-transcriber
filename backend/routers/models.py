import os
import shutil
import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from backend.config import MODELS_DIR

router = APIRouter(prefix="/models", tags=["models"])

KNOWN_MODELS = ["tiny", "base", "small", "medium", "large-v2", "large-v3"]

@router.get("")
async def list_models():
    results = []
    for m in KNOWN_MODELS:
        is_downloaded = False
        size_mb = 0
        if m == "large-v2":
            folder_name = "models--bofenghuang--whisper-large-v2-cv11"
        else:
            folder_name = f"models--Systran--faster-whisper-{m}"

        model_path = os.path.join(MODELS_DIR, folder_name)
        if os.path.exists(model_path):
            is_downloaded = True
            total_size = sum(f.stat().st_size for f in Path(model_path).rglob('*') if f.is_file())
            size_mb = total_size / (1024 * 1024)

        results.append({
            "id": m,
            "name": m.capitalize(),
            "downloaded": is_downloaded,
            "size_mb": round(size_mb, 1) if size_mb > 0 else 0
        })
    return results

@router.post("/{model_id}/download")
async def download_model_endpoint(model_id: str):
    if model_id not in KNOWN_MODELS:
        raise HTTPException(400, "Unknown model")
    from faster_whisper import download_model
    try:
        await asyncio.to_thread(download_model, model_id, cache_dir=MODELS_DIR)
        return {"status": "success"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@router.delete("/{model_id}")
async def delete_model(model_id: str):
    if model_id not in KNOWN_MODELS:
        raise HTTPException(400, "Unknown model")
    folder_name = f"models--Systran--faster-whisper-{model_id}"
    if model_id == "large-v2":
        folder_name = "models--bofenghuang--whisper-large-v2-cv11"
    model_path = os.path.join(MODELS_DIR, folder_name)
    if os.path.exists(model_path):
        shutil.rmtree(model_path, ignore_errors=True)
    return {"status": "deleted"}
