import os
import sys
from pathlib import Path

def get_app_base_dir() -> str:
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_app_data_dir() -> str:
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

APP_BASE_DIR = get_app_base_dir()
APP_DATA_DIR = get_app_data_dir()

MODELS_DIR = os.path.join(APP_BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

WORKER_TIMEOUT = 3600  # 1 hour
