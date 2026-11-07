@echo off
setlocal EnableDelayedExpansion

REM Start ONLY the deposit ledger on :8000 (no UI).
REM Keep this window OPEN while you use QUANTEDGE.

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "LOG=%ROOT%\quantedge-ledger-start.log"

echo.
echo  Kalici Ledger — :8000
echo  =====================
echo  Root: %ROOT%
echo  Log:  %LOG%
echo.
>>"%LOG%" echo ----- Start-Ledger.bat %DATE% %TIME% -----
>>"%LOG%" echo ROOT=%ROOT%

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Get it from https://nodejs.org/
  >>"%LOG%" echo ERROR: node missing
  pause
  exit /b 1
)

if not exist "%ROOT%\backend\server.mjs" (
  if not exist "%ROOT%\backend\server.ts" (
    echo ERROR: backend\server.mjs not found in:
    echo   %ROOT%
    echo Make sure this bat lives in the Kalici repo root.
    >>"%LOG%" echo ERROR: server.mjs missing
    pause
    exit /b 1
  )
)

echo Freeing port 8000...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
  if not "%%P"=="0" (
    echo   killing PID %%P
    >>"%LOG%" echo killing PID %%P
    taskkill /F /PID %%P >nul 2>&1
  )
)
timeout /t 1 /nobreak >nul

cd /d "%ROOT%"
echo.
echo Starting ledger — KEEP THIS WINDOW OPEN
echo Browser funding talks to http://127.0.0.1:8000 via the QUANTEDGE proxy.
echo.

if exist "%ROOT%\backend\server.mjs" (
  >>"%LOG%" echo running node backend\server.mjs
  node backend\server.mjs
  set "RC=!ERRORLEVEL!"
) else (
  >>"%LOG%" echo running npx tsx backend\server.ts
  npx.cmd tsx backend\server.ts
  set "RC=!ERRORLEVEL!"
)

echo.
echo Ledger exited with code !RC!
>>"%LOG%" echo ledger exited rc=!RC!
echo If this closed immediately, Node may have crashed — scroll up for errors.
pause
exit /b !RC!
