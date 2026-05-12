import os
import sys
import threading
import time
import multiprocessing
import uvicorn
import webview
from backend.main import app as fastapi_app
import pystray
from PIL import Image, ImageDraw


def get_base_dir() -> str:
    """
    Returns the directory next to the exe (or project root in dev mode).
    Used for USER-WRITABLE data: models, config, etc.
    In PyInstaller frozen mode: dirname(sys.executable) = dist/AiTranscriber/
    In dev mode: directory of app.py
    """
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def get_data_dir() -> str:
    """
    Returns the directory where BUNDLED read-only data lives.
    In PyInstaller frozen mode (6.x): sys._MEIPASS = dist/AiTranscriber/_internal/
    In dev mode: same as get_base_dir() (project root)
    Used for: assets/, frontend/out/
    """
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


BASE_DIR = get_base_dir()
DATA_DIR = get_data_dir()

# Load the tray icon (bundled read-only asset)
icon_path = os.path.join(DATA_DIR, "assets", "icon.png")
if os.path.exists(icon_path):
    icon_image = Image.open(icon_path)
else:
    # Fallback if image not found
    def create_image(width, height, color1, color2):
        image = Image.new('RGB', (width, height), color1)
        dc = ImageDraw.Draw(image)
        dc.rectangle((width // 2, 0, width, height // 2), fill=color2)
        dc.rectangle((0, height // 2, width // 2, height), fill=color2)
        return image
    icon_image = create_image(64, 64, 'black', 'white')


class Api:
    def __init__(self):
        self.window = None

    def set_window(self, window):
        self.window = window

    def save_file(self, content, default_filename):
        """Called from Javascript to save a file natively"""
        if not self.window:
            return False

        file_types = ('Text files (*.txt)', 'SRT files (*.srt)', 'All files (*.*)')

        save_ext = ".txt"
        if default_filename.endswith(".srt"):
            save_ext = ".srt"

        try:
            dialog_type = webview.FileDialog.SAVE
        except AttributeError:
            dialog_type = webview.SAVE_DIALOG

        result = self.window.create_file_dialog(
            dialog_type,
            directory='',
            save_filename=default_filename,
            file_types=file_types
        )

        if result and (isinstance(result, tuple) or isinstance(result, list)):
            file_path = result[0]
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                return True
            except Exception as e:
                print(f"Failed to save file: {e}")
                return False
        return False


def start_server():
    """Starts the FastAPI server in a separate thread"""
    uvicorn.run(fastapi_app, host="127.0.0.1", port=8000, log_level="error")


if __name__ == '__main__':
    # REQUIRED for PyInstaller + multiprocessing on Windows.
    # Must be called immediately at the top of __main__.
    multiprocessing.freeze_support()

    frontend_out = os.path.join(BASE_DIR, "frontend", "out")
    if not os.path.exists(frontend_out):
        print("WARNING: 'frontend/out' directory not found.")
        print("Please build the frontend first by running 'npm run build' inside the 'frontend' folder.")

    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(1)

    api = Api()

    window = webview.create_window(
        title="AI Transcriber",
        url="http://127.0.0.1:8000",
        js_api=api,
        width=1200,
        height=800,
        min_size=(900, 600),
        background_color="#050505"
    )

    api.set_window(window)

    def on_closing():
        # Prevent window from destroying, just hide it
        window.hide()
        return False

    window.events.closing += on_closing

    def setup_tray():
        def show_window(icon, item):
            window.show()

        def exit_app(icon, item):
            icon.stop()
            window.destroy()
            sys.exit(0)

        menu = pystray.Menu(
            pystray.MenuItem('Show Window', show_window, default=True),
            pystray.MenuItem('Exit', exit_app)
        )

        icon = pystray.Icon("AITranscriber", icon_image, "AI Transcriber", menu)
        threading.Thread(target=icon.run, daemon=True).start()

    # Setup tray
    setup_tray()

    # Use edgechromium backend explicitly to avoid pywebview mshtml recursion bug
    # (AccessibilityObject.Bounds.Empty... maximum recursion depth exceeded)
    webview.start(private_mode=False, gui='edgechromium', debug=False)
