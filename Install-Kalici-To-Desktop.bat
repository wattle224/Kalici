@echo off
REM Copy this file to your Desktop if Kalici is not installed yet.
REM It clones Kalici to Desktop\Kalici and creates the shortcut.

set "TARGET=%USERPROFILE%\Desktop\Kalici"
set "REPO_SCRIPT=%TARGET%\SETUP-AND-LAUNCH.bat"

if exist "%REPO_SCRIPT%" (
  call "%REPO_SCRIPT%"
  exit /b %ERRORLEVEL%
)

where git >nul 2>&1
if errorlevel 1 (
  echo Install Git from https://git-scm.com/ then run this again.
  pause
  exit /b 1
)

if not exist "%TARGET%" (
  echo Cloning Kalici to %TARGET% ...
  git clone https://github.com/wattle224/Kalici.git "%TARGET%"
)

cd /d "%TARGET%"
git fetch origin cursor/ledger-api-port-8000-ae22
git checkout cursor/ledger-api-port-8000-ae22
call "%TARGET%\SETUP-AND-LAUNCH.bat"
