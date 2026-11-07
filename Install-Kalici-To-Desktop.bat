@echo off
setlocal EnableExtensions

REM Copy this file to your Desktop if Kalici is not installed yet.
REM It clones Kalici to Desktop\Kalici and creates all Desktop shortcuts
REM (Investment Management AND the new QUANTEDGE Terminal).

REM Branch to install from. Defaults to "main". Override by passing an
REM argument, e.g.  Install-Kalici-To-Desktop.bat cursor/quantedge-frontend-6388
set "BRANCH=%~1"
if "%BRANCH%"=="" set "BRANCH=main"

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
  if errorlevel 1 (
    echo Clone failed.
    pause
    exit /b 1
  )
)

cd /d "%TARGET%"
echo Checking out branch: %BRANCH%
git fetch origin %BRANCH% 2>nul
git checkout %BRANCH% 2>nul
git pull --ff-only origin %BRANCH% 2>nul

REM Install Desktop shortcuts (IAM + QUANTEDGE if present on this branch).
call "%TARGET%\Install-Desktop-Launcher.bat" /silent

REM Run the generic setup/launch path for Investment Management.
call "%TARGET%\SETUP-AND-LAUNCH.bat"
