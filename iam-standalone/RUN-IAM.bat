@echo off
title IAM Ledger - KEEP THIS WINDOW OPEN
cd /d "%~dp0"

if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Node.js not found — installing LTS from https://nodejs.org/ ...
  echo.
  if exist "%~dp0Install-NodeJS.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-NodeJS.ps1"
  ) else (
    set "NODE_PS=%TEMP%\kalici-Install-NodeJS.ps1"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://github.com/wattle224/Kalici/raw/main/scripts/Install-NodeJS.ps1' -OutFile '%NODE_PS%'"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%NODE_PS%"
  )
  if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
  where node >nul 2>&1
  if errorlevel 1 (
    echo.
    echo  Run GET-IAM-NOW.bat on your Desktop, or install from https://nodejs.org/
    pause
    exit /b 1
  )
)

if not exist "%~dp0server.js" (
  echo server.js not found in %~dp0
  pause
  exit /b 1
)

echo Starting IAM ledger on port 8000...
node "%~dp0server.js"
