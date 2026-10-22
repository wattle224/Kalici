@echo off
REM Legacy name — redirects to the single unified launcher.
cd /d "%~dp0"
call "%~dp0Investment-Management.bat"
exit /b %ERRORLEVEL%
