import os
import asyncio
import logging
import multiprocessing as mp
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Required for PyInstaller frozen executables on Windows
mp.freeze_support()

from backend.config import APP_DATA_DIR
from backend.routers import system, models, transcription

# Add pip site-packages to PATH to ensure CTranslate2 can find cublas DLLs if installed via pip
import site
for p in site.getsitepackages():
    cublas_bin = os.path.join(p, "nvidia", "cublas", "bin")
    cudnn_bin = os.path.join(p, "nvidia", "cudnn", "bin")
    if os.path.exists(cublas_bin):
        os.environ["PATH"] = cublas_bin + os.pathsep + os.environ.get("PATH", "")
    if os.path.exists(cudnn_bin):
        os.environ["PATH"] = cudnn_bin + os.pathsep + os.environ.get("PATH", "")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start transcription queue worker
    worker_task = asyncio.create_task(transcription.process_queue())
    yield
    # Cleanup on exit
    worker_task.cancel()
    for p in transcription.active_processes.values():
        if p.is_alive():
            p.terminate()

app = FastAPI(title="AI Transcriber API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(system.router)
app.include_router(models.router)
app.include_router(transcription.router)

# Serve Frontend
FRONTEND_DIR = os.path.join(APP_DATA_DIR, "frontend", "out")
if os.path.exists(FRONTEND_DIR):
    app.mount("/_next", StaticFiles(directory=os.path.join(FRONTEND_DIR, "_next")), name="next_static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
