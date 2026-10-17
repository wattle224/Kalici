@echo off
REM Legacy name — redirects to merge + start.
cd /d "%~dp0"
call "%~dp0MERGE-INTO-ONE.bat"
exit /b %ERRORLEVEL%
