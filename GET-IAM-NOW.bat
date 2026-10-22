@echo off
REM Legacy name — installs/merges then starts the unified app.
cd /d "%~dp0"
if exist "%~dp0MERGE-INTO-ONE.bat" (
  call "%~dp0MERGE-INTO-ONE.bat"
) else (
  call "%~dp0Investment-Management.bat"
)
exit /b %ERRORLEVEL%
