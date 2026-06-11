@echo off
setlocal EnableExtensions

REM Creates Investment Management.lnk on your Windows Desktop.
REM Usage: Install-Desktop-Launcher.bat          (interactive)
REM        Install-Desktop-Launcher.bat /silent  (no pause)

set "REPO=%~dp0"
if "%REPO:~-1%"=="\" set "REPO=%REPO:~0,-1%"
set "SILENT=0"
if /I "%~1"=="/silent" set "SILENT=1"

if not exist "%REPO%\Launch-Investment-Management.bat" (
  echo ERROR: Run this from the Kalici repository folder.
  echo Expected: %REPO%\Launch-Investment-Management.bat
  if "%SILENT%"=="0" pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO%\scripts\Create-Desktop-Shortcut.ps1" -RepoPath "%REPO%"
set "ERR=%ERRORLEVEL%"

if "%ERR%" NEQ "0" (
  echo ERROR: Could not create Desktop shortcut.
  if "%SILENT%"=="0" pause
  exit /b %ERR%
)

if "%SILENT%"=="0" (
  echo.
  echo SUCCESS — check your Desktop for:
  echo   Investment Management.lnk
  echo.
  pause
)

exit /b 0
