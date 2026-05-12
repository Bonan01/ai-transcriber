# AI Transcriber

A professional desktop application for fast, offline transcription using local AI models (faster-whisper).

## Features
- Fully offline transcription ensures data privacy.
- Hardware acceleration (CUDA) support out of the box.
- Built with Python (FastAPI backend) and Next.js (Frontend).
- Local model management interface.
- System tray integration for easy access.

## Development

### Requirements
- Python 3.10+
- Node.js 18+
- Git

### Setup
1. Clone the repository.
2. Install backend dependencies:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

### Running Locally
1. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```
2. Start the backend/desktop app:
   ```bash
   python app.py
   ```

### Building for Production
Run the included PowerShell script to bundle the application into a standalone `.exe`:
```powershell
.\scripts\build.ps1
```
