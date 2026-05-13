@echo off
chcp 65001 >nul
color 0B

echo ==================================================
echo   Автоматическая сборка AI Transcriber
echo ==================================================
echo.

echo [1/2] Собираем интерфейс (Frontend)...
cd frontend
call npm.cmd install
call npm.cmd run build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ОШИБКА] Не удалось собрать интерфейс!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
color 0E
echo [2/2] Компилируем приложение в .exe...
powershell -ExecutionPolicy Bypass -File .\scripts\build.ps1

echo.
pause
