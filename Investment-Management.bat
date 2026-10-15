@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Investment Management
color 0B

REM ============================================================
REM  ONE launcher for everything:
REM    - Node.js (auto-install if missing)
REM    - Ledger API  http://127.0.0.1:8000
REM    - Web UI      http://127.0.0.1:3000
REM    - Desktop shortcut (single)
REM ============================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ============================================
echo   INVESTMENT MANAGEMENT
echo  ============================================
echo   Folder: %ROOT%
echo.

REM --- Node.js ---
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>&1
if errorlevel 1 (
  echo  Installing Node.js LTS from nodejs.org ...
  set "NODE_PS=%TEMP%\kalici-Install-NodeJS.ps1"
  if exist "%ROOT%\scripts\Install-NodeJS.ps1" (
    set "NODE_PS=%ROOT%\scripts\Install-NodeJS.ps1"
  ) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "Invoke-WebRequest -Uri 'https://github.com/wattle224/Kalici/raw/main/scripts/Install-NodeJS.ps1' -OutFile '%NODE_PS%'"
  )
  powershell -NoProfile -ExecutionPolicy Bypass -File "!NODE_PS!"
  if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
  where node >nul 2>&1
  if errorlevel 1 (
    color 0C
    echo  Node.js install failed. Open https://nodejs.org/ and install LTS, then re-run this file.
    start https://nodejs.org/
    pause
    exit /b 1
  )
)
for /f "delims=" %%v in ('node -v') do echo  [OK] Node %%v

REM --- Resolve server script ---
set "LEDGER_DIR="
set "LEDGER_JS="
if exist "%ROOT%\iam-standalone\server.js" (
  set "LEDGER_DIR=%ROOT%\iam-standalone"
  set "LEDGER_JS=server.js"
) else if exist "%ROOT%\backend\server.mjs" (
  set "LEDGER_DIR=%ROOT%\backend"
  set "LEDGER_JS=server.mjs"
) else if exist "%ROOT%\server.js" (
  set "LEDGER_DIR=%ROOT%"
  set "LEDGER_JS=server.js"
)

if not defined LEDGER_JS (
  color 0C
  echo  [FAIL] No ledger server found in this folder.
  echo  Put this file inside the Kalici / Investment Management repo.
  pause
  exit /b 1
)
echo  [OK] Ledger: %LEDGER_DIR%\%LEDGER_JS%

REM --- One Desktop shortcut ---
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$desk=[Environment]::GetFolderPath('Desktop');" ^
  "$shell=New-Object -ComObject WScript.Shell;" ^
  "@('Launch-Investment-Management.bat','Kalici Investment Management.lnk','Investment Management.bat','GET-IAM-NOW.bat') | ForEach-Object {" ^
  "  $p=Join-Path $desk $_; if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force }" ^
  "};" ^
  "$lnk=Join-Path $desk 'Investment Management.lnk';" ^
  "$s=$shell.CreateShortcut($lnk);" ^
  "$s.TargetPath='%~f0';" ^
  "$s.WorkingDirectory='%ROOT%';" ^
  "$s.Description='Investment Management — ledger + web UI';" ^
  "$s.IconLocation='$env:SystemRoot\System32\imageres.dll,109';" ^
  "$s.Save();" ^
  "Write-Host ' [OK] Desktop shortcut: Investment Management.lnk'"

REM --- Free stale ports then start ledger ---
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
  echo  Stopping stale :8000 PID %%P
  taskkill /F /PID %%P >nul 2>&1
)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo  Stopping stale :3000 PID %%P
  taskkill /F /PID %%P >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo  Starting ledger on port 8000...
start "IM Ledger :8000 — KEEP OPEN" /D "%LEDGER_DIR%" cmd /k node "%LEDGER_JS%"

set "API_OK=0"
for /L %%i in (1,1,30) do (
  powershell -NoProfile -Command "try{(Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2).StatusCode}catch{exit 1}" >nul 2>&1
  if not errorlevel 1 set "API_OK=1" & goto ledger_ready
  timeout /t 1 /nobreak >nul
)
:ledger_ready
if "%API_OK%"=="0" (
  color 0C
  echo  [FAIL] Ledger did not start on port 8000.
  echo  Check the window "IM Ledger :8000 — KEEP OPEN"
  pause
  exit /b 1
)
echo  [OK] http://127.0.0.1:8000/health

REM --- Web UI (npm.cmd avoids PowerShell script block) ---
set "WEB="
if exist "%ROOT%\web\package.json" set "WEB=%ROOT%\web"
if defined WEB (
  echo  Starting web UI on port 3000...
  if not exist "%WEB%\node_modules" (
    pushd "%WEB%"
    call npm.cmd install
    popd
  )
  if exist "%WEB%\.next" rmdir /s /q "%WEB%\.next" 2>nul
  start "IM Web :3000 — KEEP OPEN" /D "%WEB%" cmd /k npm.cmd run dev

  set "WEB_OK=0"
  for /L %%i in (1,1,45) do (
    powershell -NoProfile -Command "try{(Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/' -TimeoutSec 2).StatusCode}catch{exit 1}" >nul 2>&1
    if not errorlevel 1 set "WEB_OK=1" & goto web_ready
    timeout /t 1 /nobreak >nul
  )
  :web_ready
  if "%WEB_OK%"=="0" (
    color 0E
    echo  [WARN] Web UI slow to start — open http://127.0.0.1:3000/ shortly
  ) else (
    echo  [OK] http://127.0.0.1:3000/
  )
) else (
  echo  [INFO] No web\ folder — ledger-only mode
)

color 0A
echo.
echo  ============================================
echo   READY — use ONE address
echo  ============================================
echo.
echo   App:      http://127.0.0.1:3000/
echo   Health:   http://127.0.0.1:8000/health
echo   Coinbase: http://127.0.0.1:8000/api/coinbase
echo.
echo   Desktop shortcut: Investment Management
echo   Keep BOTH black windows open.
echo.
echo   Ignore the old folder:
echo     C:\Users\User\projects\Investment Management
echo   This unified app replaces it for daily use.
echo.
start "" "http://127.0.0.1:3000/"
pause
