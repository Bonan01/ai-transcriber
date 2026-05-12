# ============================================================
#  build.ps1 — AiTranscriber build script
#  Run from the project root:  .\scripts\build.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$VenvPython  = Join-Path $ProjectRoot "backend\venv\Scripts\python.exe"
$VenvPip     = Join-Path $ProjectRoot "backend\venv\Scripts\pip.exe"
$SpecFile    = Join-Path $ProjectRoot "AiTranscriber.spec"
$MakeIco     = Join-Path $ProjectRoot "scripts\make_ico.py"
$DistDir     = Join-Path $ProjectRoot "dist\AiTranscriber"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  AiTranscriber — Build Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Check venv ────────────────────────────────────────────────────────────
if (-not (Test-Path $VenvPython)) {
    Write-Host "[ERROR] Virtual environment not found at:" -ForegroundColor Red
    Write-Host "        $VenvPython" -ForegroundColor Red
    Write-Host ""
    Write-Host "Create it first:" -ForegroundColor Yellow
    Write-Host "  cd '$ProjectRoot\backend'" -ForegroundColor Yellow
    Write-Host "  python -m venv venv" -ForegroundColor Yellow
    Write-Host "  venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/5] Virtual environment found." -ForegroundColor Green

# ── 2. Install / upgrade PyInstaller in venv ─────────────────────────────────
Write-Host "[2/5] Installing / upgrading PyInstaller..." -ForegroundColor Yellow
$pipJob = Start-Process -FilePath $VenvPip `
    -ArgumentList "install --upgrade pyinstaller" `
    -NoNewWindow -PassThru -Wait
if ($pipJob.ExitCode -ne 0) {
    Write-Host "[ERROR] Failed to install PyInstaller." -ForegroundColor Red
    exit 1
}
Write-Host "       PyInstaller ready." -ForegroundColor Green

# ── 3. Convert icon PNG -> ICO ───────────────────────────────────────────────
Write-Host "[3/5] Converting icon.png -> icon.ico..." -ForegroundColor Yellow
$icoJob = Start-Process -FilePath $VenvPython `
    -ArgumentList "`"$MakeIco`"" `
    -NoNewWindow -PassThru -Wait
if ($icoJob.ExitCode -ne 0) {
    Write-Host "[ERROR] Icon conversion failed." -ForegroundColor Red
    exit 1
}
Write-Host "       Icon converted." -ForegroundColor Green

# ── 4. Check frontend/out ────────────────────────────────────────────────────
$FrontendOut = Join-Path $ProjectRoot "frontend\out"
if (-not (Test-Path $FrontendOut)) {
    Write-Host ""
    Write-Host "[WARNING] frontend/out not found!" -ForegroundColor Yellow
    Write-Host "          Build the frontend first:" -ForegroundColor Yellow
    Write-Host "            cd '$ProjectRoot\frontend'" -ForegroundColor Yellow
    Write-Host "            npm run build" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "          Continuing without frontend — the exe will not show UI." -ForegroundColor Yellow
    Write-Host ""
}

# ── 5. Run PyInstaller ───────────────────────────────────────────────────────
$PyInstaller = Join-Path $ProjectRoot "backend\venv\Scripts\pyinstaller.exe"
Write-Host "[4/5] Running PyInstaller (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host "      Spec: $SpecFile" -ForegroundColor DarkGray
Write-Host ""

$buildJob = Start-Process -FilePath $PyInstaller `
    -ArgumentList "`"$SpecFile`" --clean -y" `
    -WorkingDirectory $ProjectRoot `
    -NoNewWindow -PassThru -Wait
if ($buildJob.ExitCode -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] PyInstaller build failed! Check output above." -ForegroundColor Red
    exit 1
}

# ── 6. Add version to executable name ────────────────────────────────────────
$VersionFile = Join-Path $ProjectRoot "backend\version.py"
$AppVersion = "Unknown"
if (Test-Path $VersionFile) {
    $VersionLine = Get-Content $VersionFile | Select-String "__version__"
    if ($VersionLine) {
        $AppVersion = $VersionLine -replace '.*"([^"]+)".*', '$1'
    }
}

$OldExe = Join-Path $DistDir "AiTranscriber.exe"
$NewExeName = "AiTranscriber_v$AppVersion.exe"
$NewExePath = Join-Path $DistDir $NewExeName
if (Test-Path $OldExe) {
    Rename-Item $OldExe $NewExeName -Force
}

# ── 7. Copy models folder symlink hint ──────────────────────────────────────
Write-Host ""
Write-Host "[5/5] Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Output folder: $DistDir" -ForegroundColor Cyan
Write-Host "  Executable:    $NewExePath" -ForegroundColor Cyan
Write-Host ""
Write-Host "  IMPORTANT: Copy or symlink your 'models' folder next to the exe:" -ForegroundColor Yellow
Write-Host "    Copy-Item -Recurse '$ProjectRoot\models' '$DistDir\models'" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "  Or you can let the app download models on first run via the UI." -ForegroundColor DarkGray
Write-Host ""

# ── 8. Optionally create desktop shortcut ────────────────────────────────────
$CreateShortcut = Read-Host "Create desktop shortcut? (y/n)"
if ($CreateShortcut -eq 'y' -or $CreateShortcut -eq 'Y') {
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $ShortcutPath = Join-Path $DesktopPath "AI Transcriber.lnk"
    $ExePath = $NewExePath
    $IconPath = Join-Path $DistDir "assets\icon.ico"

    $Shell = New-Object -ComObject WScript.Shell
    $Shortcut = $Shell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $ExePath
    $Shortcut.WorkingDirectory = $DistDir
    $Shortcut.IconLocation = "$IconPath,0"
    $Shortcut.Description = "AI Transcriber"
    $Shortcut.Save()

    Write-Host "  Shortcut created: $ShortcutPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "  Done. Run the app:" -ForegroundColor Cyan
Write-Host "    $DistDir\AiTranscriber.exe" -ForegroundColor White
Write-Host ""
