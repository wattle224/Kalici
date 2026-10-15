@echo off
REM Alias — full install clears old shortcuts, installs, creates one shortcut, starts app.
cd /d "%~dp0"
call "%~dp0INSTALL.bat"
exit /b %ERRORLEVEL%
