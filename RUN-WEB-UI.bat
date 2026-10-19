@echo off
setlocal EnableExtensions
title Start web UI (bypasses PowerShell npm block)
color 0B

REM PowerShell often blocks npm.ps1 ("running scripts is disabled").
REM This .bat calls npm.cmd so it works from Explorer or cmd.

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "WEB="
if exist "%ROOT%\web\package.json" set "WEB=%ROOT%\web"
if not defined WEB if exist "%CD%\package.json" set "WEB=%CD%"
if not defined WEB if exist "%USERPROFILE%\projects\Investment Management\web\package.json" set "WEB=%USERPROFILE%\projects\Investment Management\web"

if "%~1" neq "" (
  if exist "%~1\package.json" set "WEB=%~1"
)

if not defined WEB (
  color 0C
  echo  Could not find web\package.json
  echo  Drag your web folder onto this file, or run from the project root.
  pause
  exit /b 1
)

echo.
echo  Web UI folder: %WEB%
echo.

where node >nul 2>&1
if errorlevel 1 (
  color 0C
  echo  Node.js not found. Install LTS from https://nodejs.org/
  pause
  exit /b 1
)

cd /d "%WEB%"

REM Prefer npm.cmd to avoid PowerShell execution-policy block on npm.ps1
set "NPM=npm.cmd"
where npm.cmd >nul 2>&1
if errorlevel 1 set "NPM=npm"

if not exist "node_modules" (
  echo  Installing dependencies...
  call %NPM% install
  if errorlevel 1 (
    color 0C
    echo  npm install failed.
    pause
    exit /b 1
  )
)

echo  Starting http://localhost:3000/ ...
echo  KEEP THIS WINDOW OPEN
echo.
call %NPM% run dev
pause
