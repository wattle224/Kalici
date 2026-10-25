@echo off
setlocal EnableExtensions
title Restart QuantEdge web UI only
color 0B

REM Restarts Next on :3000 from THIS folder.
REM Does NOT download new code from GitHub.
REM If you do not see "Build: Auto decision engine", run REINSTALL-AUTO-TRADE.bat instead.

set "ROOT=%~dp0"
set "WEB=%ROOT%web"

echo.
echo  Restarting web UI from:
echo    %WEB%
echo.

if not exist "%WEB%\package.json" (
  color 0C
  echo  [FAIL] web\package.json missing. Run REINSTALL-AUTO-TRADE.bat first.
  pause
  exit /b 1
)

if not exist "%WEB%\public\qe-build.json" (
  color 0E
  echo  [WARN] No qe-build.json — this folder is an OLD build without Auto.
  echo         Ctrl+F5 / restart cannot add Auto. Run REINSTALL-AUTO-TRADE.bat.
  echo.
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='SilentlyContinue'; Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"

if exist "%WEB%\.next" rmdir /s /q "%WEB%\.next" 2>nul

start "IM Web :3000 — KEEP OPEN" /D "%WEB%" cmd /k npm.cmd run dev

echo  Waiting for http://127.0.0.1:3000/ ...
set "OK=0"
for /L %%i in (1,1,40) do (
  powershell -NoProfile -Command "try{(Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/' -TimeoutSec 2).StatusCode}catch{exit 1}" >nul 2>&1
  if not errorlevel 1 set "OK=1" & goto ready
  timeout /t 1 /nobreak >nul
)
:ready
if "%OK%"=="0" (
  color 0C
  echo  [FAIL] Web did not come up. Check the black "IM Web :3000" window.
  pause
  exit /b 1
)

color 0A
echo  [OK] http://127.0.0.1:3000/
echo  Hard-refresh the browser (Ctrl+F5).
echo  Look under the QE logo for: Build: Auto decision engine
echo  If that line is missing, this folder is still old — run REINSTALL-AUTO-TRADE.bat
echo.
pause
exit /b 0
