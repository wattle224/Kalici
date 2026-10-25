@echo off
setlocal EnableExtensions
title Reinstall QuantEdge (Auto decision engine)
color 0B

REM One-click: pull cursor/quantedge-auto-trade-ae22 into Desktop\Investment Management
REM and start ledger + web. Keeps web\.env.local if present.

echo.
echo  ================================================
echo   REINSTALL QuantEdge — Auto decision engine
echo   Branch: cursor/quantedge-auto-trade-ae22
echo  ================================================
echo.

set "PS1=%TEMP%\Install-IM-Auto.ps1"
set "URL=https://raw.githubusercontent.com/wattle224/Kalici/cursor/quantedge-auto-trade-ae22/scripts/Install-To-Desktop.ps1"

echo  Downloading install script...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Invoke-WebRequest -Uri '%URL%' -OutFile '%PS1%' -UseBasicParsing; if ((Get-Item '%PS1%').Length -lt 500) { throw 'download too small' } } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 (
  color 0C
  echo  [FAIL] Could not download install script. Check internet / GitHub.
  pause
  exit /b 1
)

echo  Running install (frees :8000/:3000, refreshes Desktop folder, starts app)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  color 0A
  echo  [OK] Open http://127.0.0.1:3000/  then Ctrl+F5
  echo  Under the QE logo you should see: Build: Auto decision engine
  echo  Trading ^& Analysis — right column — "Auto decision engine"
  echo  Then click Start Auto — Orders ^& fills should populate.
) else (
  color 0C
  echo  [FAIL] Install exited with code %RC%
)
echo.
pause
exit /b %RC%
