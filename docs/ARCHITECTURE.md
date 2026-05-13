# Architecture

## Overview

AI Transcriber is a desktop application for offline audio transcription. It combines a Python backend with a modern web-based frontend, packaged as a standalone Windows executable.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Desktop Shell                            │
│  ┌───────────┐         ┌─────────────────────────────────────┐  │
│  │  pystray   │         │           pywebview (Edge)          │  │
│  │ (tray icon)│         │  ┌───────────────────────────────┐  │  │
│  └─────┬─────┘         │  │    Next.js Frontend (React)   │  │  │
│        │                │  │  ┌─────────────────────────┐  │  │  │
│        │                │  │  │  Components / Hooks      │  │  │  │
│        │                │  │  │  (TypeScript, Tailwind)   │  │  │  │
│        │                │  │  └────────┬────────────────┘  │  │  │
│        │                │  └───────────┼────────────────────┘  │  │
│        │                └──────────────┼──────────────────────┘  │
│        │                               │ HTTP + WebSocket         │
│        │                ┌──────────────▼──────────────────────┐  │
│        │                │       FastAPI Backend (uvicorn)      │  │
│        │                │  ┌────────────────────────────────┐  │  │
│        └────────────────►  │ Routers:                       │  │  │
│                         │  │  • /upload, /ws — transcription │  │  │
│                         │  │  • /models     — model mgmt    │  │  │
│                         │  │  • /system     — version, CUDA │  │  │
│                         │  └──────────┬─────────────────────┘  │  │
│                         └─────────────┼────────────────────────┘  │
│                                       │                            │
│                         ┌─────────────▼────────────────────────┐  │
│                         │    faster-whisper (CTranslate2)       │  │
│                         │    Local Whisper models               │  │
│                         └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Entry Point — `app.py`

- Starts the FastAPI server in a background thread via `uvicorn`
- Creates a `pywebview` window pointing to `http://127.0.0.1:8000`
- Sets up `pystray` tray icon (show/hide/exit)
- Handles `multiprocessing.freeze_support()` for PyInstaller compatibility

### Backend — `backend/`

| File | Responsibility |
|------|---------------|
| `main.py` | FastAPI application factory, CORS, static file serving, lifespan management |
| `config.py` | Path resolution (base dir, data dir, models dir), timeout constants |
| `version.py` | Application version (reads from `pyproject.toml`) |
| `routers/transcription.py` | File upload, transcription queue, WebSocket progress, multiprocessing worker |
| `routers/models.py` | List / download / delete Whisper models |
| `routers/system.py` | Version endpoint, CUDA detection, CUDA toolkit installer |

### Frontend — `frontend/`

Built with **Next.js** (App Router) and exported as static HTML (`next build` → `out/`).

| Directory | Contents |
|-----------|----------|
| `src/app/` | Root layout, main page, global styles |
| `src/components/` | UI components: DropZone, FileQueue, TranscriptionEditor, SettingsPanel, ModelManager, SystemPanel, ConfirmModal, ErrorBoundary |
| `src/hooks/` | Custom hooks: useQueue, useSettings, useWebSocket |
| `src/lib/` | API client, type definitions, utility functions |

### Build Pipeline — `scripts/`

| File | Purpose |
|------|---------|
| `build.ps1` | Full build pipeline: venv check → PyInstaller → icon → shortcut |
| `make_ico.py` | Converts `assets/icon.png` → multi-size `assets/icon.ico` |
| `bump_version.py` | Semantic version management across all project files |

## Data Flow — Transcription

```
1. User drops audio file → DropZone component
2. Frontend POSTs to /upload with file + settings
3. Backend saves file to temp dir, enqueues task
4. process_queue() picks up task, spawns multiprocessing.Process
5. Worker loads faster-whisper model, runs transcription
6. Progress sent via mp.Queue → async loop → WebSocket → Frontend
7. On completion: result sent via WebSocket, OS notification via plyer
8. Temp files cleaned up
```

## Deployment

The app is packaged with **PyInstaller** in `onedir` mode:
- `dist/AiTranscriber/` contains the executable + all dependencies
- `models/` folder is created at runtime next to the exe
- Frontend static files are bundled inside `_internal/frontend/out/`
