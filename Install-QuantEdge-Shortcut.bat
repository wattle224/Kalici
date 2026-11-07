@echo off
setlocal EnableExtensions

REM Double-click to put QUANTEDGE on your Desktop.
REM Creates:
REM   QUANTEDGE Terminal.lnk          -> Launch-QuantEdge.bat
REM   QUANTEDGE Terminal (Update).lnk -> Update-And-Launch-QuantEdge.bat
REM
REM Also refreshes the Investment Management shortcuts if their launchers exist.

set "REPO=%~dp0"
if "%REPO:~-1%"=="\" set "REPO=%REPO:~0,-1%"

if not exist "%REPO%\Launch-QuantEdge.bat" (
  echo ERROR: Launch-QuantEdge.bat not found in this folder.
  echo You are probably on the wrong git branch. Run:
  echo    git fetch origin
  echo    git checkout cursor/quantedge-frontend-6388
  echo and run this installer again.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO%\scripts\Create-Desktop-Shortcut.ps1" -RepoPath "%REPO%"
set "ERR=%ERRORLEVEL%"

if "%ERR%" NEQ "0" (
  echo ERROR: Could not create Desktop shortcuts.
  pause
  exit /b %ERR%
)

echo.
echo SUCCESS - look on your Desktop for:
echo   QUANTEDGE Terminal.lnk              (double-click to launch)
echo   QUANTEDGE Terminal (Update).lnk     (git pull + launch)
echo.
pause
exit /b 0
