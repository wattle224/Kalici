@echo off
setlocal EnableDelayedExpansion

REM Start ONLY the deposit ledger on :8000 (no UI).
REM Use this when QUANTEDGE is open but funding says ledger is not running.

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  Kalici Ledger — start on :8000
echo  ==============================
echo  Root: %ROOT%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Get it from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "%ROOT%\backend\server.mjs" if not exist "%ROOT%\backend\server.ts" (
  echo ERROR: backend\server.mjs / server.ts not found.
  echo Make sure you are in the Kalici repo and on branch cursor/quantedge-frontend-6388.
  pause
  exit /b 1
)

REM Kill anything already listening on 8000 (stale / outdated builds).
powershell -NoProfile -Command ^
  "$conns = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue; ^
   foreach ($c in $conns) { try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }" >nul 2>&1
timeout /t 1 /nobreak >nul

echo Starting deposit ledger...
echo KEEP THIS WINDOW OPEN while you use QUANTEDGE.
echo.
cd /d "%ROOT%"

if exist "%ROOT%\backend\server.ts" (
  npx tsx backend/server.ts
  if errorlevel 1 (
    echo.
    echo tsx failed — falling back to node backend/server.mjs
    node backend/server.mjs
  )
) else (
  node backend/server.mjs
)

echo.
echo Ledger stopped.
pause
