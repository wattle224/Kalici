@echo off
title IAM Ledger - KEEP THIS WINDOW OPEN
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  NODE.JS IS NOT INSTALLED
  echo  Download from: https://nodejs.org/  ^(click LTS^)
  echo  Install, restart PC, run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0server.js" (
  echo server.js not found in %~dp0
  pause
  exit /b 1
)

echo Starting IAM ledger on port 8000...
node "%~dp0server.js"
