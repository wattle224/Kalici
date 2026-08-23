@echo off
setlocal EnableExtensions

REM === START IAM (Investment Management) ===
REM Starts ledger on port 8000. Keep the black window OPEN.

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

title Kalici IAM Launcher
color 0A
echo.
echo   Investment Management - Startup
echo   ===============================
echo   Folder: %ROOT%
echo.

where node >nul 2>&1
if errorlevel 1 (
  color 0C
  echo [FAIL] Node.js is NOT installed.
  echo.
  echo 1. Go to https://nodejs.org/
  echo 2. Download LTS and install
  echo 3. Restart PC, then run this file again
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do echo [OK] Node.js %%v

set "SERVER_SCRIPT="
set "SERVER_DIR="
if exist "%ROOT%\iam-standalone\server.js" (
  set "SERVER_SCRIPT=server.js"
  set "SERVER_DIR=%ROOT%\iam-standalone"
) else if exist "%ROOT%\backend\server.mjs" (
  set "SERVER_SCRIPT=server.mjs"
  set "SERVER_DIR=%ROOT%\backend"
) else if exist "%ROOT%\server.js" (
  set "SERVER_SCRIPT=server.js"
  set "SERVER_DIR=%ROOT%"
)

if not defined SERVER_SCRIPT (
  color 0C
  echo [FAIL] No ledger server found.
  echo You are not in the Kalici folder.
  echo Run GET-IAM-NOW.bat or SETUP-AND-LAUNCH.bat first.
  echo.
  pause
  exit /b 1
)

echo [OK] Found %SERVER_DIR%\%SERVER_SCRIPT%
echo.

REM Kill stale attempt if port in use but not responding
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2).StatusCode } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo Starting ledger API on port 8000...
  start "Kalici Ledger API - KEEP OPEN" /D "%SERVER_DIR%" cmd /k node "%SERVER_SCRIPT%"
) else (
  echo [OK] Ledger API already running on port 8000
)

echo Waiting for API...
set "OK=0"
for /L %%i in (1,1,30) do (
  powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2).StatusCode } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    set "OK=1"
    goto :ready
  )
  timeout /t 1 /nobreak >nul
)
:ready

if "%OK%"=="0" (
  color 0C
  echo.
  echo [FAIL] Cannot connect to http://127.0.0.1:8000
  echo.
  echo Check the window titled "Kalici Ledger API - KEEP OPEN"
  echo for red error text. Common fixes:
  echo   - Install Node.js from https://nodejs.org/
  echo   - Run this file from Desktop\Kalici folder
  echo.
  pause
  exit /b 1
)

color 0A
echo.
echo [SUCCESS] IAM ledger is running!
echo.
echo   Health:  http://127.0.0.1:8000/health
echo   Ledger:  http://127.0.0.1:8000/api/ledger
echo.
echo Opening health page in browser...
start "" "http://127.0.0.1:8000/health"
echo.
echo IMPORTANT: Do NOT close "Kalici Ledger API - KEEP OPEN" window.
echo Then open your Investment Management app or refresh it.
echo.
pause
