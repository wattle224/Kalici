@echo off
setlocal EnableDelayedExpansion

REM QUANTEDGE — Global Financial & System Intelligence Terminal
REM Dev server on http://127.0.0.1:3100

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "APP=%ROOT%\quantedge"

echo.
echo  QUANTEDGE Terminal
echo  ==================
echo  Root: %ROOT%
echo  App:  %APP%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Get it from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "%APP%\package.json" (
  echo ERROR: quantedge\package.json not found.
  echo You are probably on the wrong git branch. Run:
  echo    git fetch origin
  echo    git checkout cursor/quantedge-frontend-6388
  echo and try again.
  pause
  exit /b 1
)

cd /d "%APP%"

if not exist "%APP%\node_modules" (
  echo Installing QUANTEDGE dependencies ^(first run only, ~30s^)...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

netstat -ano | findstr ":3100" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo QUANTEDGE already running on port 3100.
  start "" "http://127.0.0.1:3100/"
  exit /b 0
)

echo Starting QUANTEDGE dev server on port 3100...
start "QUANTEDGE :3100 - KEEP OPEN" /D "%APP%" cmd /k npm run dev

REM Wait up to 30s for the server to answer
set "UP=0"
for /L %%i in (1,1,30) do (
  powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3100/' -TimeoutSec 2).StatusCode } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    set "UP=1"
    goto :ready
  )
  timeout /t 1 /nobreak >nul
)
:ready

if "%UP%"=="0" (
  echo WARNING: Server did not respond within 30s. Check the KEEP OPEN window for errors.
) else (
  echo QUANTEDGE is ready: http://127.0.0.1:3100/
  start "" "http://127.0.0.1:3100/"
)

echo.
echo KEEP OPEN: the "QUANTEDGE :3100 - KEEP OPEN" window.
echo Close it to stop the server.
echo.
pause
