@echo off
setlocal EnableDelayedExpansion

REM Kalici Investment Management — ledger API (8000) MUST start before web UI (3000)
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  Kalici Investment Management
echo  ============================
echo  Root: %ROOT%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not on PATH.
  echo Install from https://nodejs.org/ then run this script again.
  pause
  exit /b 1
)

cd /d "%ROOT%"

if not exist "%ROOT%\node_modules\tsx" (
  echo Installing ledger API dependencies...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed in %ROOT%
    pause
    exit /b 1
  )
)

REM --- Ledger API on port 8000 (required — UI fails without this) ---
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo Starting ledger API on port 8000...
  start "Kalici Ledger API :8000" cmd /k "cd /d "%ROOT%" && npm run ledger"
  timeout /t 5 /nobreak >nul
) else (
  echo Port 8000 already in use — assuming ledger API is running.
)

REM --- Health check (PowerShell — works without curl) ---
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 5).StatusCode } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: Ledger API is not responding on http://127.0.0.1:8000/health
  echo Check the "Kalici Ledger API :8000" window for errors.
  echo.
  pause
  exit /b 1
)
echo Ledger API OK: http://127.0.0.1:8000

REM --- Web UI on port 3000 ---
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo Starting web UI on port 3000...
  if not exist "%ROOT%\web\node_modules" (
    echo Installing web dependencies...
    cd /d "%ROOT%\web"
    call npm install
    cd /d "%ROOT%"
  )
  start "Kalici Web UI :3000" cmd /k "cd /d "%ROOT%\web" && npm run dev"
  timeout /t 6 /nobreak >nul
) else (
  echo Port 3000 already in use — assuming web UI is running.
)

echo Opening http://127.0.0.1:3000/
start "" "http://127.0.0.1:3000/"

echo.
echo Done. Keep BOTH console windows open:
echo   - Kalici Ledger API :8000
echo   - Kalici Web UI :3000
echo.
pause
