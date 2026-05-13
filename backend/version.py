"""
Single source of truth for application version.

Reads from pyproject.toml at project root in development mode.
Falls back to a hardcoded value for frozen (PyInstaller) builds
where pyproject.toml is not bundled.
"""

import os
import re
import sys


def _read_version() -> str:
    """Parse version from pyproject.toml without external dependencies."""
    # In frozen mode, pyproject.toml is not available
    if getattr(sys, "frozen", False):
        return _FALLBACK_VERSION

    pyproject = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "pyproject.toml",
    )
    if os.path.isfile(pyproject):
        with open(pyproject, "r", encoding="utf-8") as f:
            for line in f:
                m = re.match(r'^version\s*=\s*"([^"]+)"', line)
                if m:
                    return m.group(1)
    return _FALLBACK_VERSION


# Fallback for PyInstaller builds — bump_version.py keeps this in sync
_FALLBACK_VERSION = "1.0.0"

__version__ = _read_version()
