"""
make_ico.py — Converts assets/icon.png to assets/icon.ico for PyInstaller.
Run once before building: python scripts/make_ico.py
"""
import os
import sys
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

SRC = os.path.join(PROJECT_ROOT, "assets", "icon.png")
DST = os.path.join(PROJECT_ROOT, "assets", "icon.ico")

SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

def main():
    if not os.path.exists(SRC):
        print(f"[ERROR] Source icon not found: {SRC}")
        sys.exit(1)

    img = Image.open(SRC).convert("RGBA")
    icons = []
    for size in SIZES:
        resized = img.resize(size, Image.LANCZOS)
        icons.append(resized)

    icons[0].save(DST, format="ICO", sizes=SIZES, append_images=icons[1:])
    print(f"[OK] Icon saved: {DST}")

if __name__ == "__main__":
    main()
