@echo off
setlocal EnableExtensions

where node >nul 2>&1
if not errorlevel 1 exit /b 0

if exist "%ProgramFiles%\nodejs\node.exe" (
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
  where node >nul 2>&1
  if not errorlevel 1 exit /b 0
)

set "PS1=%~dp0Install-NodeJS.ps1"
if not exist "%PS1%" set "PS1=%~dp0..\scripts\Install-NodeJS.ps1"

echo.
echo  Installing Node.js LTS from https://nodejs.org/ ...
echo  This may take a few minutes. Accept the UAC prompt if asked.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "ERR=%ERRORLEVEL%"

if "%ERR%"=="2" exit /b 2

if exist "%ProgramFiles%\nodejs\node.exe" (
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

where node >nul 2>&1
if errorlevel 1 exit /b 1
exit /b 0
