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

REM Show which git revision this launcher is about to run, so the user
REM can tell at a glance whether the Desktop shortcut is on the latest
REM version. Harmless if git is missing or this is not a git checkout.
where git >nul 2>&1
if not errorlevel 1 (
  if exist "%ROOT%\.git" (
    pushd "%ROOT%" >nul
    for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "QE_BRANCH=%%b"
    for /f "delims=" %%s in ('git rev-parse --short HEAD 2^>nul') do set "QE_SHA=%%s"
    for /f "delims=" %%d in ('git log -1 --format=%%cs HEAD 2^>nul') do set "QE_DATE=%%d"
    popd >nul
    if defined QE_BRANCH echo  Branch: !QE_BRANCH!
    if defined QE_SHA echo  Commit: !QE_SHA!  ^(!QE_DATE!^)
    echo  Tip: use "Update-And-Launch-QuantEdge.bat" or the "QUANTEDGE Terminal (Update)" shortcut
    echo       on your Desktop to pull the newest commit before launching.
  )
)
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

set "NEEDS_INSTALL=0"
if not exist "%APP%\node_modules" set "NEEDS_INSTALL=1"
REM If npm's own install sentinel is older than package-lock.json, deps are stale
REM (e.g. you just ran git pull and package-lock.json changed). npm writes this
REM file after install completes, so comparing against it is robust across locales.
if exist "%APP%\package-lock.json" if exist "%APP%\node_modules\.package-lock.json" (
  for /f %%A in ('powershell -NoProfile -Command "if ((Get-Item '%APP%\package-lock.json').LastWriteTime -gt (Get-Item '%APP%\node_modules\.package-lock.json').LastWriteTime) { 'yes' } else { 'no' }"') do set "STALE=%%A"
  if /I "!STALE!"=="yes" set "NEEDS_INSTALL=1"
)
if "%NEEDS_INSTALL%"=="1" (
  echo Installing QUANTEDGE dependencies ^(first run or package-lock.json changed, ~30s^)...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

REM --- Port 8000: simulation ledger API (REQUIRED for orders / fills / PnL) ---
if not exist "%ROOT%\backend\server.ts" if not exist "%ROOT%\backend\server.mjs" (
  echo WARNING: backend\server.ts not found — simulation ledger cannot start.
) else (
  powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2).StatusCode } catch { exit 1 }" >nul 2>&1
  if errorlevel 1 (
    echo Starting deposit-based simulation ledger on port 8000...
    REM Prefer the TypeScript server (decision engine + capital account).
    start "Kalici Ledger API :8000 - KEEP OPEN" /D "%ROOT%" cmd /k npx tsx backend/server.ts
  ) else (
    echo Ledger API already running on port 8000.
  )

  set "LEDGER_OK=0"
  for /L %%i in (1,1,20) do (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2).StatusCode } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
      set "LEDGER_OK=1"
      goto :ledger_ready
    )
    timeout /t 1 /nobreak >nul
  )
  :ledger_ready
  if "!LEDGER_OK!"=="0" (
    echo WARNING: Ledger API did not answer on :8000 within 20s.
    echo Check the "Kalici Ledger API :8000 - KEEP OPEN" window for errors.
  ) else (
    echo Ledger API OK: http://127.0.0.1:8000/health
  )
)

netstat -ano | findstr ":3100" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo QUANTEDGE already running on port 3100.
  start "" "http://127.0.0.1:3100/trading"
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
  echo QUANTEDGE is ready: http://127.0.0.1:3100/trading
  start "" "http://127.0.0.1:3100/trading"
)

echo.
echo KEEP OPEN:
echo   - "Kalici Ledger API :8000 - KEEP OPEN"  ^(orders / fills / PnL^)
echo   - "QUANTEDGE :3100 - KEEP OPEN"          ^(the terminal UI^)
echo Close either window to stop that service.
echo.
pause
