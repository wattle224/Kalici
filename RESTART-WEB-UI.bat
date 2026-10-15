@echo off
setlocal EnableExtensions
title Restart localhost:3000 (fresh web UI)
color 0B

echo.
echo  Restart web UI on http://localhost:3000/
echo  ========================================
echo.

REM Kill whatever is holding port 3000 (stale Next/Vite/old build)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo  Stopping PID %%P on port 3000...
  taskkill /F /PID %%P >nul 2>&1
)

timeout /t 2 /nobreak >nul

set "ROOT="
if exist "%~dp0web\package.json" set "ROOT=%~dp0"
if not defined ROOT if exist "%USERPROFILE%\Desktop\Kalici\web\package.json" set "ROOT=%USERPROFILE%\Desktop\Kalici\"
if not defined ROOT if exist "%USERPROFILE%\projects\Investment Management\frontend\package.json" set "ROOT=%USERPROFILE%\projects\Investment Management\"
if not defined ROOT if exist "%USERPROFILE%\projects\Investment Management\web\package.json" set "ROOT=%USERPROFILE%\projects\Investment Management\"

if "%~1" neq "" set "ROOT=%~1"

if not defined ROOT (
  color 0C
  echo  Could not find a web UI folder.
  echo  Drag your Kalici or Investment Management folder onto this .bat
  pause
  exit /b 1
)

if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
echo  Project: %ROOT%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  Node.js missing — install from https://nodejs.org/
  pause
  exit /b 1
)

REM Prefer Kalici web/, else frontend/, else package.json at root
set "WEB="
if exist "%ROOT%\web\package.json" set "WEB=%ROOT%\web"
if not defined WEB if exist "%ROOT%\frontend\package.json" set "WEB=%ROOT%\frontend"
if not defined WEB if exist "%ROOT%\package.json" set "WEB=%ROOT%"

if not defined WEB (
  color 0C
  echo  No package.json web app found under %ROOT%
  pause
  exit /b 1
)

echo  Web folder: %WEB%
cd /d "%WEB%"

if not exist "node_modules" (
  echo  npm install...
  call npm install
)

REM Clear Next.js cache so the page is not stale
if exist ".next" (
  echo  Clearing .next cache...
  rmdir /s /q ".next" 2>nul
)

echo  Starting fresh web UI...
start "Web UI :3000 - KEEP OPEN" /D "%WEB%" cmd /k npm run dev

echo  Waiting for http://localhost:3000 ...
set OK=0
for /L %%i in (1,1,40) do (
  powershell -NoProfile -Command "try{(Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/' -TimeoutSec 2).StatusCode}catch{exit 1}" >nul 2>&1
  if not errorlevel 1 set OK=1 & goto ready
  timeout /t 1 /nobreak >nul
)
:ready

if "%OK%"=="0" (
  color 0C
  echo  Web UI did not start. Check the "Web UI :3000" window for errors.
  pause
  exit /b 1
)

color 0A
echo.
echo  READY — open a hard refresh in the browser:
echo    http://localhost:3000/
echo  Press Ctrl+F5 (or Ctrl+Shift+R) to bypass cache.
echo.
start http://localhost:3000/
pause
