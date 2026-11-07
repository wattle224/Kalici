@echo off
setlocal EnableDelayedExpansion

REM QUANTEDGE — Global Financial & System Intelligence Terminal
REM Dev server on http://127.0.0.1:3100

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "APP=%ROOT%\quantedge"
set "LOG=%ROOT%\quantedge-launch.log"

echo.
echo  QUANTEDGE Terminal
echo  ==================
echo  Root: %ROOT%
echo  App:  %APP%
echo  Log:  %LOG%
> "%LOG%" echo QUANTEDGE launch %DATE% %TIME%
>>"%LOG%" echo ROOT=%ROOT%

REM Show which git revision this launcher is about to run.
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
    >>"%LOG%" echo BRANCH=!QE_BRANCH! SHA=!QE_SHA!
    echo  Tip: use "QUANTEDGE Terminal (Update)" to pull the newest commit first.
  )
)
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Get it from https://nodejs.org/
  >>"%LOG%" echo ERROR: node missing
  pause
  exit /b 1
)

REM If quantedge is missing, try switching to the frontend branch automatically.
if not exist "%APP%\package.json" (
  echo quantedge\package.json not found on this checkout.
  where git >nul 2>&1
  if not errorlevel 1 if exist "%ROOT%\.git" (
    echo Trying: git fetch + checkout cursor/quantedge-frontend-6388 ...
    pushd "%ROOT%" >nul
    git fetch --prune origin >nul 2>&1
    git checkout cursor/quantedge-frontend-6388 >nul 2>&1
    if errorlevel 1 git checkout -B cursor/quantedge-frontend-6388 origin/cursor/quantedge-frontend-6388 >nul 2>&1
    popd >nul
  )
)

if not exist "%APP%\package.json" (
  echo ERROR: quantedge\package.json still not found.
  echo Open a terminal in the repo and run:
  echo    git fetch origin
  echo    git checkout cursor/quantedge-frontend-6388
  echo then double-click this launcher again.
  >>"%LOG%" echo ERROR: quantedge package.json missing
  pause
  exit /b 1
)

cd /d "%APP%"
>>"%LOG%" echo cwd=%CD%

set "NEEDS_INSTALL=0"
if not exist "%APP%\node_modules" set "NEEDS_INSTALL=1"
if exist "%APP%\package-lock.json" if exist "%APP%\node_modules\.package-lock.json" (
  for /f %%A in ('powershell -NoProfile -Command "try { if ((Get-Item -LiteralPath '%APP%\package-lock.json').LastWriteTime -gt (Get-Item -LiteralPath '%APP%\node_modules\.package-lock.json').LastWriteTime) { 'yes' } else { 'no' } } catch { 'no' }"') do set "STALE=%%A"
  if /I "!STALE!"=="yes" set "NEEDS_INSTALL=1"
)
if "%NEEDS_INSTALL%"=="1" (
  echo Installing QUANTEDGE dependencies ^(first run or lockfile changed^)...
  >>"%LOG%" echo npm install starting
  call npm.cmd install
  if errorlevel 1 (
    echo npm install failed. See window output / %LOG%
    >>"%LOG%" echo ERROR: npm install failed
    pause
    exit /b 1
  )
)

REM --- helpers: free a TCP listen port via netstat+taskkill (no Get-NetTCPConnection) ---
goto :after_helpers
:free_port
set "FP_PORT=%~1"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%FP_PORT% " ^| findstr "LISTENING"') do (
  if not "%%P"=="0" (
    >>"%LOG%" echo killing pid %%P on port %FP_PORT%
    taskkill /F /PID %%P >nul 2>&1
  )
)
exit /b 0
:after_helpers

REM --- Port 8000: simulation ledger ---
if exist "%ROOT%\backend\server.ts" goto :start_ledger
if exist "%ROOT%\backend\server.mjs" goto :start_ledger
echo WARNING: backend\server.ts / server.mjs not found — ledger will not start.
goto :start_ui

:start_ledger
echo Freeing port 8000 ^(old ledger^)...
call :free_port 8000
timeout /t 1 /nobreak >nul

echo Starting deposit ledger on :8000 ^(KEEP OPEN window^)...
if exist "%ROOT%\backend\server.mjs" (
  REM Prefer pure Node server.mjs — no tsx required, more reliable on Windows.
  start "Kalici Ledger API :8000 - KEEP OPEN" /D "%ROOT%" cmd /k "node backend\server.mjs || (echo. & echo server.mjs failed & pause)"
) else (
  start "Kalici Ledger API :8000 - KEEP OPEN" /D "%ROOT%" cmd /k "npx.cmd tsx backend\server.ts || (echo. & echo tsx failed & pause)"
)

REM Don't block the UI on a long ledger wait — check briefly then continue.
set "LEDGER_OK=0"
for /L %%i in (1,1,8) do (
  powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 1).StatusCode } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    set "LEDGER_OK=1"
    goto :ledger_ready
  )
  timeout /t 1 /nobreak >nul
)
:ledger_ready
if "!LEDGER_OK!"=="0" (
  echo WARNING: Ledger not answering yet on :8000 — UI will still start.
  echo If funding fails, double-click Start-Ledger.bat and keep it open.
  >>"%LOG%" echo WARNING: ledger not ready
) else (
  echo Ledger OK: http://127.0.0.1:8000/health
  >>"%LOG%" echo ledger OK
)

:start_ui
echo Freeing port 3100 ^(old UI^)...
call :free_port 3100
timeout /t 1 /nobreak >nul

echo Starting QUANTEDGE on :3100 ^(KEEP OPEN window^)...
>>"%LOG%" echo starting next dev
start "QUANTEDGE :3100 - KEEP OPEN" /D "%APP%" cmd /k "npm.cmd run dev || (echo. & echo npm run dev failed & pause)"

set "UP=0"
for /L %%i in (1,1,45) do (
  powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3100/' -TimeoutSec 1).StatusCode } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    set "UP=1"
    goto :ready
  )
  timeout /t 1 /nobreak >nul
)
:ready

if "%UP%"=="0" (
  echo.
  echo WARNING: UI did not answer on :3100 within 45s.
  echo Check the "QUANTEDGE :3100 - KEEP OPEN" window for errors.
  echo Log file: %LOG%
  >>"%LOG%" echo WARNING: UI not ready
) else (
  echo QUANTEDGE ready: http://127.0.0.1:3100/trading
  >>"%LOG%" echo UI ready
  start "" "http://127.0.0.1:3100/trading"
)

echo.
echo KEEP OPEN:
echo   - "Kalici Ledger API :8000 - KEEP OPEN"
echo   - "QUANTEDGE :3100 - KEEP OPEN"
echo.
echo If the browser did not open, go to: http://127.0.0.1:3100/trading
echo.
pause
exit /b 0
