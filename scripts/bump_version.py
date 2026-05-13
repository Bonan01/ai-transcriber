"""
bump_version.py — Semantic version manager for AiTranscriber.

Updates version in all canonical locations:
  - pyproject.toml        (primary source of truth)
  - backend/version.py    (_FALLBACK_VERSION for frozen builds)
  - frontend/package.json

Usage:
    python scripts/bump_version.py patch        # 1.0.0 → 1.0.1
    python scripts/bump_version.py minor        # 1.0.0 → 1.1.0
    python scripts/bump_version.py major        # 1.0.0 → 2.0.0
    python scripts/bump_version.py set 2.5.0    # explicit version
    python scripts/bump_version.py current      # print current version

Flags:
    --no-git    Skip git commit and tag creation
"""

import json
import os
import re
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

PYPROJECT_TOML = os.path.join(PROJECT_ROOT, "pyproject.toml")
VERSION_PY = os.path.join(PROJECT_ROOT, "backend", "version.py")
PACKAGE_JSON = os.path.join(PROJECT_ROOT, "frontend", "package.json")

SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


def read_current_version() -> str:
    """Read current version from pyproject.toml."""
    with open(PYPROJECT_TOML, "r", encoding="utf-8") as f:
        for line in f:
            m = re.match(r'^version\s*=\s*"([^"]+)"', line)
            if m:
                return m.group(1)
    raise RuntimeError("Could not find version in pyproject.toml")


def bump(current: str, part: str) -> str:
    """Compute next version based on bump type."""
    m = SEMVER_RE.match(current)
    if not m:
        raise ValueError(f"Current version '{current}' is not valid semver")

    major, minor, patch = int(m.group(1)), int(m.group(2)), int(m.group(3))

    if part == "patch":
        patch += 1
    elif part == "minor":
        minor += 1
        patch = 0
    elif part == "major":
        major += 1
        minor = 0
        patch = 0
    else:
        raise ValueError(f"Unknown bump type: {part}")

    return f"{major}.{minor}.{patch}"


def update_pyproject(new_version: str) -> None:
    """Update version in pyproject.toml."""
    with open(PYPROJECT_TOML, "r", encoding="utf-8") as f:
        content = f.read()

    updated = re.sub(
        r'^(version\s*=\s*)"[^"]+"',
        f'\\1"{new_version}"',
        content,
        count=1,
        flags=re.MULTILINE,
    )
    with open(PYPROJECT_TOML, "w", encoding="utf-8") as f:
        f.write(updated)

    print(f"  ✓ pyproject.toml → {new_version}")


def update_version_py(new_version: str) -> None:
    """Update _FALLBACK_VERSION in backend/version.py."""
    with open(VERSION_PY, "r", encoding="utf-8") as f:
        content = f.read()

    updated = re.sub(
        r'^(_FALLBACK_VERSION\s*=\s*)"[^"]+"',
        f'\\1"{new_version}"',
        content,
        count=1,
        flags=re.MULTILINE,
    )
    with open(VERSION_PY, "w", encoding="utf-8") as f:
        f.write(updated)

    print(f"  ✓ backend/version.py → {new_version}")


def update_package_json(new_version: str) -> None:
    """Update version in frontend/package.json."""
    with open(PACKAGE_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    data["version"] = new_version

    with open(PACKAGE_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"  ✓ frontend/package.json → {new_version}")


def git_commit_and_tag(new_version: str) -> None:
    """Create a git commit and tag for the new version."""
    tag = f"v{new_version}"

    subprocess.run(
        ["git", "add", PYPROJECT_TOML, VERSION_PY, PACKAGE_JSON],
        cwd=PROJECT_ROOT,
        check=True,
        timeout=30,
    )
    subprocess.run(
        ["git", "commit", "-m", f"chore: bump version to {new_version}"],
        cwd=PROJECT_ROOT,
        check=True,
        timeout=30,
    )
    subprocess.run(
        ["git", "tag", "-a", tag, "-m", f"Release {tag}"],
        cwd=PROJECT_ROOT,
        check=True,
        timeout=30,
    )

    print(f"  ✓ git commit + tag {tag}")


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    action = sys.argv[1].lower()
    no_git = "--no-git" in sys.argv

    current = read_current_version()

    if action == "current":
        print(f"Current version: {current}")
        return

    if action == "set":
        if len(sys.argv) < 3:
            print("Usage: bump_version.py set X.Y.Z")
            sys.exit(1)
        new_version = sys.argv[2]
        if not SEMVER_RE.match(new_version):
            print(f"Error: '{new_version}' is not valid semver (X.Y.Z)")
            sys.exit(1)
    elif action in ("patch", "minor", "major"):
        new_version = bump(current, action)
    else:
        print(f"Unknown action: {action}")
        print("Use: patch | minor | major | set X.Y.Z | current")
        sys.exit(1)

    print(f"\nBumping version: {current} → {new_version}\n")

    update_pyproject(new_version)
    update_version_py(new_version)
    update_package_json(new_version)

    if not no_git:
        print()
        git_commit_and_tag(new_version)

    print(f"\n✅ Version updated to {new_version}\n")


if __name__ == "__main__":
    main()
