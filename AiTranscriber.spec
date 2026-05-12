# ─────────────────────────────────────────────────────────────────────────────
# AiTranscriber.spec — PyInstaller spec file
#
# Mode: onedir (NOT onefile) — required for:
#   • faster-whisper / CTranslate2 native DLLs
#   • multiprocessing on Windows (freeze_support)
#   • large frontend/out static files
#
# Build command (from project root, with venv activated):
#   pyinstaller AiTranscriber.spec --clean
# ─────────────────────────────────────────────────────────────────────────────

import os
from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs

# Project root (where this .spec file lives)
ROOT = os.path.abspath('.')

# ── Collect data files ──────────────────────────────────────────────────────

# Include the pre-built Next.js static output
frontend_out_src = os.path.join(ROOT, 'frontend', 'out')
frontend_datas = []
for dirpath, dirnames, filenames in os.walk(frontend_out_src):
    rel = os.path.relpath(dirpath, ROOT)
    for fname in filenames:
        src_file = os.path.join(dirpath, fname)
        frontend_datas.append((src_file, rel))

# Include assets (tray icon etc.)
assets_datas = [
    (os.path.join(ROOT, 'assets', 'icon.png'), 'assets'),
    (os.path.join(ROOT, 'assets', 'icon.ico'), 'assets'),
]

# faster-whisper tokenizer assets (e.g. tokenizer.json files)
fw_datas = collect_data_files('faster_whisper')

# webview assets (HTML/JS templates used by pywebview)
webview_datas = collect_data_files('webview')

# pystray/plyer may need some data files
pystray_datas = collect_data_files('pystray')

all_datas = (
    frontend_datas
    + assets_datas
    + fw_datas
    + webview_datas
    + pystray_datas
)

# ── Collect native binaries ─────────────────────────────────────────────────

# ctranslate2 packs its own DLLs — collect them
ct2_binaries = collect_dynamic_libs('ctranslate2')

# ── Hidden imports ──────────────────────────────────────────────────────────

hidden_imports = [
    # FastAPI / uvicorn
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'fastapi.staticfiles',
    'fastapi.responses',
    'starlette',
    'starlette.staticfiles',
    'starlette.routing',
    'starlette.middleware',
    'anyio',
    'anyio.abc',
    # Werkzeug
    'werkzeug',
    'werkzeug.utils',
    # faster-whisper / ctranslate2
    'faster_whisper',
    'ctranslate2',
    'tokenizers',
    'huggingface_hub',
    'huggingface_hub.utils',
    # pywebview
    'webview',
    'webview.platforms',
    'webview.platforms.winforms',
    # pystray / plyer
    'pystray',
    'plyer',
    'plyer.platforms',
    'plyer.platforms.win',
    'plyer.platforms.win.notification',
    # Pillow
    'PIL',
    'PIL.Image',
    'PIL.ImageDraw',
    # multiprocessing support (freeze_support is called in app.py, not a hidden import)
    'multiprocessing',
    # python-multipart (required by fastapi file uploads)
    'multipart',
    # websockets
    'websockets',
    'websockets.legacy',
    'websockets.legacy.server',
]

# ── Analysis ────────────────────────────────────────────────────────────────

a = Analysis(
    ['app.py'],
    pathex=[ROOT],
    binaries=ct2_binaries,
    datas=all_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # These are large optional deps — exclude to keep size manageable.
        # User can install them separately if they want diarization.
        'torch',
        'torchaudio',
        'pyannote',
        'pyannote.audio',
        'matplotlib',
        'IPython',
        'notebook',
        'scipy',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,   # onedir mode: binaries go to COLLECT, not embedded
    name='AiTranscriber',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,               # UPX can corrupt some DLLs — disabled for safety
    console=False,           # No console window (GUI app)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=os.path.join(ROOT, 'assets', 'icon.ico'),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='AiTranscriber',    # Output folder: dist/AiTranscriber/
)
