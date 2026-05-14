<p align="center">
  <img src="assets/icon.png" alt="AI Transcriber" width="128" />
</p>

<h1 align="center">AI Transcriber</h1>

<p align="center">
  Fast, offline audio transcription powered by local AI models.
</p>

<p align="center">
  <a href="https://github.com/Bonan01/ai-transcriber/releases"><img src="https://img.shields.io/github/v/release/Bonan01/ai-transcriber?style=flat-square" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Bonan01/ai-transcriber?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/python-3.10%2B-blue?style=flat-square" alt="Python">
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey?style=flat-square" alt="Platform">
</p>

---

## About

AI Transcriber is a desktop application that transcribes audio files **entirely on your machine** — no internet connection or cloud API required. It uses [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (CTranslate2) for high-performance inference with optional CUDA GPU acceleration.

### Key Features

- 🔒 **Fully offline** — your audio never leaves your computer
- ⚡ **GPU-accelerated** — CUDA support for fast transcription
- 🎛️ **Model Manager** — download, switch, and delete Whisper models from the UI
- 📂 **Multi-file queue** — drag & drop multiple files, process them sequentially
- ✏️ **Built-in editor** — review and edit transcription results before saving
- 🔔 **System tray** — runs in background, notifies on completion
- 📤 **Export formats** — save as `.txt` or `.srt` (subtitles)
- 🗣️ **Speaker diarization** — optional, with a Hugging Face token

---

## Quick Start

### Download

Go to the [Releases page](https://github.com/Bonan01/ai-transcriber/releases) and download the archive that matches your hardware:

| Archive | Size | Description |
|---------|------|-------------|
| `AiTranscriber_v*_CUDA.zip` | ~630 MB | **Recommended** if you have an NVIDIA GPU — includes CUDA libraries for fast transcription |
| `AiTranscriber_v*_CPU.zip` | ~100 MB | Lightweight CPU-only version — works on any Windows 10/11 machine |

> **Note:** Whisper models are **not included** in the download. The app will prompt you to download one (~150–1500 MB depending on model size) on first launch via the built-in Model Manager.

### Getting Started

1. Extract the archive to any folder
2. Run `AiTranscriber_vX.Y.Z.exe`
3. Go to the **Model Manager** tab and download a Whisper model (e.g. `small` or `medium`)
4. Drop an audio file and transcribe!

---

## Development

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| Git | any |

### Setup

```bash
# Clone the repository
git clone https://github.com/Bonan01/ai-transcriber.git
cd ai-transcriber

# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r ..\requirements.txt

# Frontend
cd ..\frontend
npm install
```

### Running Locally

```bash
# Terminal 1 — Frontend dev server (optional, for hot reload)
cd frontend
npm run dev

# Terminal 2 — Desktop app
python app.py
```

### Building for Production

Build a standalone `.exe` using the included scripts:

```powershell
# Option A — Full build (frontend + exe)
.\MakeBuild.bat

# Option B — Exe only (assumes frontend is already built)
.\scripts\build.ps1
```

Output: `dist/AiTranscriber/AiTranscriber_vX.Y.Z.exe`

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed overview.

```
app.py (entry point)
├── pywebview        → GUI shell (Edge WebView2)
├── pystray          → system tray icon
└── FastAPI (uvicorn :8000)
    ├── Next.js static frontend (served from frontend/out/)
    ├── /upload, /ws → transcription (multiprocessing + faster-whisper)
    ├── /models      → model management
    └── /system      → version, CUDA status
```

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/). The version is managed centrally in [`pyproject.toml`](pyproject.toml) and synchronized across the codebase using:

```bash
python scripts/bump_version.py patch   # 1.0.0 → 1.0.1
python scripts/bump_version.py minor   # 1.0.0 → 1.1.0
python scripts/bump_version.py major   # 1.0.0 → 2.0.0
```

See the [Changelog](CHANGELOG.md) for release history.

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.
