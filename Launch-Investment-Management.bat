@echo off
setlocal EnableDelayedExpansion

REM Kalici Investment Management — starts ledger API (8000) then web UI (3000)
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

REM --- Ledger API on port 8000 (required — UI fails without this) ---
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if errorlevel 1 (
  echo Starting ledger API on port 8000...
  start "Kalici Ledger API :8000" cmd /k "cd /d "%ROOT%" && npx --yes tsx backend/server.ts"
  timeout /t 4 /nobreak >nul
) else (
  echo Port 8000 already in use — assuming ledger API is running.
)

REM --- Health check ---
curl -s http://127.0.0.1:8000/health >nul 2>&1
if errorlevel 1 (
  echo.
  echo WARNING: Ledger API did not respond on http://127.0.0.1:8000/health
  echo Check the "Kalici Ledger API" window for errors.
  echo.
) else (
  echo Ledger API OK: http://127.0.0.1:8000
)

REM --- Web UI on port 3000 ---
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
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
echo Done. Keep both console windows open:
echo   - Kalici Ledger API :8000
echo   - Kalici Web UI :3000
echo.
pause
