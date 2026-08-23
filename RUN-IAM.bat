@echo off
REM One-click IAM ledger — works from any Kalici folder copy.
cd /d "%~dp0"

if exist "%~dp0iam-standalone\server.js" (
  cd /d "%~dp0iam-standalone"
  call "%~dp0iam-standalone\RUN-IAM.bat"
  exit /b %ERRORLEVEL%
)

if exist "%~dp0server.js" (
  call "%~dp0RUN-IAM.bat"
  exit /b %ERRORLEVEL%
)

if exist "%~dp0backend\server.mjs" (
  call "%~dp0START-IAM.bat"
  exit /b %ERRORLEVEL%
)

echo.
echo  Kalici IAM files not found in: %~dp0
echo  Run GET-IAM-NOW.bat to download to Desktop\Kalici
echo.
pause
exit /b 1
