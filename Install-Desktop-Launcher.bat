@echo off
setlocal EnableExtensions
set "REPO=%~dp0"
if "%REPO:~-1%"=="\" set "REPO=%REPO:~0,-1%"
set "SILENT=0"
if /I "%~1"=="/silent" set "SILENT=1"

if not exist "%REPO%\Investment-Management.bat" (
  echo ERROR: Investment-Management.bat missing in %REPO%
  if "%SILENT%"=="0" pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO%\scripts\Create-Desktop-Shortcut.ps1" -RepoPath "%REPO%"
set "ERR=%ERRORLEVEL%"

if "%SILENT%"=="0" (
  if "%ERR%"=="0" (
    echo.
    echo SUCCESS — Desktop shortcut:
    echo   Investment Management
    echo.
  )
  pause
)
exit /b %ERR%
