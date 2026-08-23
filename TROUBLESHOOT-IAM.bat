@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  IAM Troubleshooting
echo  ===================
echo  Folder: %ROOT%
echo.

echo --- Node.js ---
where node >nul 2>&1
if errorlevel 1 (
  echo [FAIL] Node.js not installed - get it from https://nodejs.org/
) else (
  for /f "delims=" %%v in ('node -v') do echo [OK] Node.js %%v
)

echo.
echo --- Files ---
if exist "%ROOT%\backend\server.mjs" (echo [OK] backend\server.mjs) else (echo [FAIL] backend\server.mjs missing)
if exist "%ROOT%\Launch-Investment-Management.bat" (echo [OK] Launch-Investment-Management.bat) else (echo [FAIL] launcher missing)

echo.
echo --- Port 8000 (ledger - REQUIRED) ---
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo [FAIL] Nothing listening on port 8000
  echo        Run START-IAM.bat to start the ledger
) else (
  echo [OK] Port 8000 is in use
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 3; Write-Host '[OK] http://127.0.0.1:8000/health' $r.StatusCode } catch { Write-Host '[FAIL] Port open but API not responding' }"
)

echo.
echo --- Port 3000 (web dashboard - optional) ---
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo [--] Port 3000 not running ^(optional^)
) else (
  echo [OK] Port 3000 is in use
)

echo.
echo --- Fix ---
echo If port 8000 failed, double-click: START-IAM.bat
echo Keep the "Kalici Ledger API - KEEP OPEN" window open.
echo.
pause
