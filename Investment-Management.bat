@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Investment Management
color 0B

REM ============================================================
REM  ONE launcher for everything:
REM    - Node.js (auto-install if missing)
REM    - Ledger API  http://127.0.0.1:8000
REM    - Web UI      http://127.0.0.1:3000  (QuantEdge Terminal)
REM    - Desktop + OneDrive Desktop shortcut (single correct target)
REM ============================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ============================================
echo   INVESTMENT MANAGEMENT — QuantEdge
echo  ============================================
echo   Folder: %ROOT%
echo.

REM --- Refuse the old Python / FastAPI stack ---
if exist "%ROOT%\backend\app\main.py" (
  if not exist "%ROOT%\iam-standalone\server.js" if not exist "%ROOT%\backend\server.mjs" (
    color 0C
    echo  [FAIL] This folder is the OLD Python Investment Management app.
    echo.
    echo  Path looks like: ...\projects\Investment Management
    echo  That stack uses FastAPI on :8000 and investment-dashboard on :3000.
    echo  It is NOT QuantEdge / Kalici.
    echo.
    echo  Fix: run FIX-WRONG-SHORTCUT.bat or INSTALL.bat from Kalici, then use
    echo  Desktop\Investment Management only.
    echo.
    echo  Opening fix instructions...
    start "" "https://github.com/wattle224/Kalici/blob/cursor/fix-onedrive-shortcut-ae22/README.md"
    pause
    exit /b 1
  )
)
echo %ROOT% | findstr /I /C:"\projects\Investment Management" >nul
if not errorlevel 1 (
  if exist "%ROOT%\backend\app\main.py" (
    color 0C
    echo  [FAIL] Shortcut still points at projects\Investment Management.
    echo  Run FIX-WRONG-SHORTCUT.bat from the Kalici install instead.
    pause
    exit /b 1
  )
)

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
  echo  [FAIL] No Node ledger server found in this folder.
  echo  Expected iam-standalone\server.js or backend\server.mjs
  echo  If you clicked a Desktop shortcut that opens projects\Investment Management,
  echo  run FIX-WRONG-SHORTCUT.bat instead.
  pause
  exit /b 1
)
echo  [OK] Ledger: %LEDGER_DIR%\%LEDGER_JS%

REM --- Wipe old / wrong shortcuts, create ONE pointing HERE ---
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='SilentlyContinue';" ^
  "$desks=@([Environment]::GetFolderPath('Desktop'));" ^
  "$one=Join-Path $env:USERPROFILE 'OneDrive\Desktop'; if (Test-Path $one) { $desks += $one };" ^
  "$desks=$desks | Select-Object -Unique;" ^
  "$kill=@('Launch-Investment-Management.bat','Launch-Investment-Management.lnk','Kalici Investment Management.lnk','Kalici.lnk','Investment Management.bat','Investment Management.lnk','GET-IAM-NOW.bat','START-IAM.bat','START-IAM.lnk','RUN-IAM.bat','SETUP-AND-LAUNCH.bat','MERGE-INTO-ONE.bat','INSTALL.bat','RESTART-WEB-UI.bat','FIX-WRONG-SHORTCUT.bat');" ^
  "$shell=New-Object -ComObject WScript.Shell;" ^
  "foreach ($d in $desks) {" ^
  "  foreach ($n in $kill) { $p=Join-Path $d $n; if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force; Write-Host ('  removed ' + $p) } };" ^
  "  Get-ChildItem -LiteralPath $d -Filter '*.lnk' | ForEach-Object {" ^
  "    $t=$shell.CreateShortcut($_.FullName).TargetPath;" ^
  "    if ($t -match 'Investment Management|Kalici|START-IAM|GET-IAM|Launch-Investment|iam-standalone|projects\\Investment') {" ^
  "      Remove-Item $_.FullName -Force; Write-Host ('  removed ' + $_.FullName)" ^
  "    }" ^
  "  }" ^
  "};" ^
  "foreach ($d in $desks) {" ^
  "  $lnk=Join-Path $d 'Investment Management.lnk';" ^
  "  $s=$shell.CreateShortcut($lnk);" ^
  "  $s.TargetPath='%~f0'; $s.WorkingDirectory='%ROOT%';" ^
  "  $s.Description='Investment Management — QuantEdge Terminal';" ^
  "  $s.IconLocation='$env:SystemRoot\System32\imageres.dll,109'; $s.Save();" ^
  "  Write-Host (' [OK] Shortcut: ' + $lnk + ' -> %~f0')" ^
  "}"

REM Disable old projects launcher if present
if exist "%USERPROFILE%\projects\Investment Management\Launch-Investment-Management.bat" (
  ren "%USERPROFILE%\projects\Investment Management\Launch-Investment-Management.bat" "Launch-Investment-Management.bat.DISABLED" 2>nul
  echo  [OK] Disabled old projects\ Launch-Investment-Management.bat
)

REM --- Free stale ports (FastAPI / old Next / prior ledger) ---
echo  Freeing ports 8000 and 3000...
if exist "%ROOT%\scripts\Free-Ports.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\Free-Ports.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='SilentlyContinue'; foreach ($port in 8000,3000) { Get-NetTCPConnection -LocalPort $port -State Listen -EA SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue; Write-Host ('  killed PID ' + $_.OwningProcess + ' on :' + $port) } }"
)
timeout /t 2 /nobreak >nul

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
  echo  If you still see FastAPI / Errno 10048, run FIX-WRONG-SHORTCUT.bat
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
  for /L %%i in (1,1,60) do (
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
echo   READY — QuantEdge Terminal
echo  ============================================
echo.
echo   App:      http://127.0.0.1:3000/
echo   Health:   http://127.0.0.1:8000/health
echo   Legacy:   http://127.0.0.1:3000/legacy
echo.
echo   Desktop shortcut must show Target:
echo     ...\Desktop\Investment Management\Investment-Management.bat
echo   NOT:
echo     ...\projects\Investment Management\...
echo.
echo   Keep BOTH black windows open. Use Ctrl+F5 if the page looks old.
echo.
start "" "http://127.0.0.1:3000/"
pause
