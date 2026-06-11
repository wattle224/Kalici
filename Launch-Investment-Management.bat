@echo off
setlocal EnableDelayedExpansion

REM Kalici Investment Management — web UI (3000) includes /api/ledger; port 8000 is optional extra.
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

if not exist "%ROOT%\web\node_modules" (
  echo Installing web dependencies...
  cd /d "%ROOT%\web"
  call npm install
  cd /d "%ROOT%"
)

REM --- Optional ledger file API on port 8000 ---
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  if exist "%ROOT%\node_modules\tsx" (
    echo Starting optional ledger file API on port 8000...
    start "Kalici Ledger API :8000" cmd /k "cd /d "%ROOT%" && npm run ledger"
    timeout /t 3 /nobreak >nul
  ) else (
    echo Skipping port 8000 ^(run "npm install" in repo root to enable^).
  )
) else (
  echo Port 8000 already in use.
)

REM --- Web UI on port 3000 (includes GET /api/ledger — required) ---
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo Starting web UI on port 3000...
  start "Kalici Web UI :3000" cmd /k "cd /d "%ROOT%\web" && npm run dev"
  echo Waiting for web UI...
  timeout /t 8 /nobreak >nul
) else (
  echo Port 3000 already in use — assuming web UI is running.
)

REM --- Health: web ledger on same port as UI (this is what the page loads first) ---
set "UI_OK=0"
for /L %%i in (1,1,12) do (
  powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/api/ledger' -TimeoutSec 4).StatusCode } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    set "UI_OK=1"
    goto :ui_ready
  )
  timeout /t 2 /nobreak >nul
)
:ui_ready

if "%UI_OK%"=="0" (
  echo.
  echo ERROR: Web UI ledger not responding at http://127.0.0.1:3000/api/ledger
  echo Check the "Kalici Web UI :3000" window for errors.
  pause
  exit /b 1
)

echo Web ledger OK: http://127.0.0.1:3000/api/ledger
echo Opening http://127.0.0.1:3000/
start "" "http://127.0.0.1:3000/"

echo.
echo Done. Keep the "Kalici Web UI :3000" window open.
echo Port 8000 is optional; the UI loads ledger from port 3000 first.
echo.
pause
