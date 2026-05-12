import os
import shutil
import tempfile
import asyncio
import logging
import uuid
import multiprocessing as mp
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException
from werkzeug.utils import secure_filename
from backend.config import MODELS_DIR, WORKER_TIMEOUT

logger = logging.getLogger(__name__)

router = APIRouter(tags=["transcription"])

ALLOWED_EXTENSIONS = {'.mp3', '.mp4', '.wav', '.m4a', '.flac', '.ogg'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB

transcription_queue = asyncio.Queue()
active_connections: dict[str, WebSocket] = {}
active_processes: dict[str, mp.Process] = {}
queue_state = {"is_paused": False}
pending_tasks = {}

def is_allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if client_id in active_connections:
            del active_connections[client_id]

async def send_progress(client_id: str, message: dict):
    if client_id in active_connections:
        try:
            await active_connections[client_id].send_json(message)
        except Exception as e:
            logger.error(f"Error sending progress to {client_id}: {e}")

@router.post("/upload")
async def upload_audio(
    client_id: str = Form(...),
    model_size: str = Form("base"),
    device: str = Form("auto"),
    compute_type: str = Form("auto"),
    hf_token: str = Form(""),
    num_workers: int = Form(1),
    language: Optional[str] = Form(None),
    temperature: float = Form(0.0),
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    if not is_allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="File type not allowed")

    file_id = str(uuid.uuid4())
    secure_name = secure_filename(file.filename)

    temp_dir = tempfile.mkdtemp(prefix="transcriber_")
    temp_file_path = os.path.join(temp_dir, secure_name)

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(temp_file_path)
        if file_size > MAX_FILE_SIZE:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(status_code=413, detail="File too large (max 500MB)")

        task_data = {
            "client_id": client_id,
            "file_id": file_id,
            "filename": secure_name,
            "temp_file_path": temp_file_path,
            "temp_dir": temp_dir,
            "model_size": model_size,
            "device": device,
            "compute_type": compute_type,
            "hf_token": hf_token,
            "num_workers": num_workers,
            "language": language,
            "temperature": temperature
        }

        pending_tasks[file_id] = task_data
        await transcription_queue.put(file_id)

        return {"file_id": file_id, "status": "queued", "message": "File added to queue"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="Failed to process upload")

@router.post("/cancel/{file_id}")
async def cancel_task(file_id: str):
    if file_id in pending_tasks:
        task = pending_tasks.pop(file_id)
        shutil.rmtree(task["temp_dir"], ignore_errors=True)
        await send_progress(task["client_id"], {"file_id": file_id, "status": "error", "message": "Cancelled by user"})
        return {"status": "cancelled"}

    if file_id in active_processes:
        p = active_processes[file_id]
        if p.is_alive():
            p.terminate()
            p.join(timeout=2.0)
        return {"status": "terminated"}

    return {"status": "not_found"}

@router.post("/pause")
async def pause_queue():
    queue_state["is_paused"] = True
    return {"status": "paused"}

@router.post("/resume")
async def resume_queue():
    queue_state["is_paused"] = False
    return {"status": "resumed"}

def transcribe_worker(task_data, progress_queue, result_queue):
    try:
        try:
            import torch
            _torch_available = True
        except ImportError:
            torch = None
            _torch_available = False

        from faster_whisper import WhisperModel

        model_size = task_data["model_size"]
        device = task_data["device"]
        compute_type = task_data["compute_type"]
        language = task_data["language"]
        temperature = task_data["temperature"]
        num_workers = task_data.get("num_workers", 1)
        temp_file_path = task_data["temp_file_path"]
        hf_token = task_data.get("hf_token", "")

        progress_queue.put({"type": "status", "status": "loading_model", "message": f"Loading '{model_size}' on {device.upper()}..."})

        if device == "auto":
            try:
                if _torch_available and torch.cuda.is_available():
                    device = "cuda"
                else:
                    try:
                        import ctranslate2
                        supported = ctranslate2.get_supported_compute_types("cuda")
                        device = "cuda" if supported else "cpu"
                    except Exception:
                        device = "cpu"
            except Exception:
                device = "cpu"

        if compute_type == "auto":
            compute_type = "float16" if device == "cuda" else "int8"

        try:
            try:
                model = WhisperModel(model_size, device=device, compute_type=compute_type, num_workers=num_workers, download_root=MODELS_DIR, local_files_only=True)
            except Exception as e:
                if "cublas" in str(e).lower():
                    raise e
                progress_queue.put({"type": "status", "status": "loading_model", "message": f"Downloading '{model_size}' model..."})
                model = WhisperModel(model_size, device=device, compute_type=compute_type, num_workers=num_workers, download_root=MODELS_DIR, local_files_only=False)
        except Exception as dl_e:
            error_msg = str(dl_e)
            if "cublas" in error_msg.lower():
                raise Exception("Отсутствуют драйверы CUDA 12 (cublas64_12.dll). В настройках перейдите в раздел CUDA Toolkit Installer или переключите устройство на CPU.")
            raise dl_e

        progress_queue.put({"type": "status", "status": "transcribing", "message": "Starting transcription..."})

        segments, info = model.transcribe(
            temp_file_path,
            language=language if language != "auto" else None,
            temperature=temperature,
            vad_filter=True
        )

        progress_queue.put({
            "type": "info",
            "message": f"Language: {info.language} ({info.language_probability:.2f})"
        })

        full_text = []
        full_segments = []

        for segment in segments:
            full_text.append(segment.text)
            full_segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
            progress_queue.put({
                "type": "progress",
                "segment": segment.text,
                "start": segment.start,
                "end": segment.end
            })

        result = {
            "text": "".join(full_text),
            "segments": full_segments,
            "language": info.language
        }

        if hf_token:
            progress_queue.put({"type": "status", "status": "loading_model", "message": "Running Speaker Diarization..."})
            try:
                if not _torch_available:
                    raise ImportError("torch is not installed — diarization requires PyTorch.")
                from pyannote.audio import Pipeline

                pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=hf_token
                )

                if device == "cuda" and torch.cuda.is_available():
                    pipeline.to(torch.device("cuda"))

                diarization = pipeline(temp_file_path)

                for seg in result["segments"]:
                    max_overlap = 0
                    best_speaker = "Speaker ?"
                    for turn, _, speaker in diarization.itertracks(yield_label=True):
                        overlap = max(0, min(seg["end"], turn.end) - max(seg["start"], turn.start))
                        if overlap > max_overlap:
                            max_overlap = overlap
                            best_speaker = speaker
                    seg["speaker"] = best_speaker

                diarized_text = ""
                current_speaker = None
                for seg in result["segments"]:
                    if seg["speaker"] != current_speaker:
                        diarized_text += f"\n\n[{seg['speaker']}]: "
                        current_speaker = seg["speaker"]
                    diarized_text += seg["text"] + " "

                result["text"] = diarized_text.strip()

            except ImportError:
                progress_queue.put({"type": "info", "message": "Diarization skipped: pyannote.audio or torch not installed."})
            except Exception as e:
                progress_queue.put({"type": "info", "message": f"Diarization failed: {e}"})

        result_queue.put({"success": True, "result": result})

    except Exception as e:
        result_queue.put({"success": False, "error": str(e)})

async def process_queue():
    while True:
        if queue_state["is_paused"]:
            await asyncio.sleep(1)
            continue

        file_id = await transcription_queue.get()

        if file_id not in pending_tasks:
            transcription_queue.task_done()
            continue

        task = pending_tasks.pop(file_id)
        client_id = task["client_id"]
        temp_dir = task["temp_dir"]

        progress_queue = mp.Queue()
        result_queue = mp.Queue()

        p = mp.Process(target=transcribe_worker, args=(task, progress_queue, result_queue))
        active_processes[file_id] = p
        p.start()

        start_time = asyncio.get_event_loop().time()

        try:
            timed_out = False
            while p.is_alive() or not progress_queue.empty() or not result_queue.empty():
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed > WORKER_TIMEOUT and p.is_alive():
                    logger.error(f"Worker for {file_id} timed out after {WORKER_TIMEOUT}s — terminating.")
                    p.terminate()
                    p.join(timeout=3.0)
                    timed_out = True
                    await send_progress(client_id, {
                        "file_id": file_id,
                        "status": "error",
                        "message": f"Transcription timed out after {WORKER_TIMEOUT // 60} minutes."
                    })
                    break

                while not progress_queue.empty():
                    msg = progress_queue.get()
                    if msg["type"] == "status":
                        await send_progress(client_id, {"file_id": file_id, "status": msg["status"], "message": msg["message"]})
                    elif msg["type"] == "info":
                        await send_progress(client_id, {"file_id": file_id, "status": "info", "message": msg["message"]})
                    elif msg["type"] == "progress":
                        await send_progress(client_id, {
                            "file_id": file_id,
                            "status": "progress",
                            "segment": msg["segment"],
                            "start": msg["start"],
                            "end": msg["end"]
                        })

                if not result_queue.empty():
                    break

                await asyncio.sleep(0.1)

            if not timed_out:
                if p.exitcode is not None and p.exitcode != 0 and result_queue.empty():
                    await send_progress(client_id, {"file_id": file_id, "status": "error", "message": "Process terminated or crashed"})
                elif not result_queue.empty():
                    res = result_queue.get()
                    if res["success"]:
                        await send_progress(client_id, {
                            "file_id": file_id,
                            "status": "done",
                            "message": "Transcription complete.",
                            "result": res["result"]
                        })
                        try:
                            from plyer import notification
                            notification.notify(
                                title="AI Transcriber",
                                message=f"Finished: {task['filename']}",
                                app_name="AI Transcriber",
                                timeout=5
                            )
                        except Exception:
                            pass
                    else:
                        await send_progress(client_id, {"file_id": file_id, "status": "error", "message": res["error"]})

        except Exception as e:
            logger.error(f"Error managing process for {file_id}: {e}")
            await send_progress(client_id, {"file_id": file_id, "status": "error", "message": str(e)})
        finally:
            if file_id in active_processes:
                del active_processes[file_id]
            shutil.rmtree(temp_dir, ignore_errors=True)
            transcription_queue.task_done()
