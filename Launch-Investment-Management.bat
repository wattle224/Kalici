@echo off
setlocal EnableDelayedExpansion

REM Investment Management — port 8000 ledger API is REQUIRED for the IAM app.
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  Kalici Investment Management
echo  ============================
echo  Root: %ROOT%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Get it from https://nodejs.org/
  pause
  exit /b 1
)

cd /d "%ROOT%"

REM --- Port 8000: ledger API (REQUIRED) ---
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo Starting ledger API on port 8000...
  start "Kalici Ledger API :8000" cmd /k "cd /d "%ROOT%" && node backend/server.mjs"
) else (
  echo Port 8000 already in use.
)

set "API_OK=0"
for /L %%i in (1,1,20) do (
  powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 3).StatusCode } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    set "API_OK=1"
    goto :api_ready
  )
  timeout /t 1 /nobreak >nul
)
:api_ready

if "%API_OK%"=="0" (
  echo.
  echo ERROR: Ledger API failed on port 8000.
  echo Open the "Kalici Ledger API :8000" window and check for errors.
  echo Try manually: node backend/server.mjs
  pause
  exit /b 1
)
echo Ledger API OK: http://127.0.0.1:8000/api/ledger

REM --- Port 3000: web UI (optional dashboard) ---
if not exist "%ROOT%\web\node_modules" (
  echo Installing web UI dependencies...
  cd /d "%ROOT%\web"
  call npm install
  cd /d "%ROOT%"
)

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo Starting web UI on port 3000...
  start "Kalici Web UI :3000" cmd /k "cd /d "%ROOT%\web" && npm run dev"
  timeout /t 6 /nobreak >nul
)

echo.
echo IAM is ready. Ledger: http://127.0.0.1:8000/api/ledger
echo Opening dashboard: http://127.0.0.1:3000/
start "" "http://127.0.0.1:3000/"

echo.
echo KEEP OPEN: "Kalici Ledger API :8000" window
echo.
pause
