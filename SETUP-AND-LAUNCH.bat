@echo off
setlocal EnableExtensions

echo.
echo  Kalici — find or install
echo  ========================
echo.

REM 1) Already inside the repo?
if exist "%~dp0Launch-Investment-Management.bat" (
  echo Found Kalici here: %~dp0
  goto :found
)

REM 2) Common locations
set "FOUND="
for %%D in (
  "%USERPROFILE%\Desktop\Kalici"
  "%USERPROFILE%\Documents\Kalici"
  "%USERPROFILE%\Kalici"
  "C:\Kalici"
  "D:\Kalici"
) do (
  if exist "%%~D\Launch-Investment-Management.bat" (
    set "FOUND=%%~D"
    goto :found_path
  )
)

echo Kalici folder not found on this PC.
echo.
echo Option A — Clone to your Desktop ^(recommended^):
echo   git clone https://github.com/wattle224/Kalici.git "%USERPROFILE%\Desktop\Kalici"
echo.
echo Option B — Download ZIP from:
echo   https://github.com/wattle224/Kalici
echo   Extract to Desktop\Kalici
echo.
set /p "CLONE=Clone to Desktop now? (Y/N): "
if /I not "%CLONE%"=="Y" (
  echo.
  echo After you have the folder, open it in File Explorer and double-click:
  echo   SETUP-AND-LAUNCH.bat
  pause
  exit /b 1
)

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git is not installed. Install Git or download the ZIP from GitHub.
  pause
  exit /b 1
)

set "TARGET=%USERPROFILE%\Desktop\Kalici"
if exist "%TARGET%" (
  echo Folder already exists: %TARGET%
  set "REPO=%TARGET%"
  goto :found
)

echo Cloning to %TARGET% ...
git clone https://github.com/wattle224/Kalici.git "%TARGET%"
if errorlevel 1 (
  echo Clone failed.
  pause
  exit /b 1
)
set "REPO=%TARGET%"
goto :found

:found_path
set "REPO=%FOUND%"
:found
if "%REPO:~-1%"=="\" set "REPO=%REPO:~0,-1%"
cd /d "%REPO%"

echo.
echo Using: %REPO%
echo.

git fetch origin cursor/ledger-api-port-8000-ae22 2>nul
git checkout cursor/ledger-api-port-8000-ae22 2>nul || git checkout main 2>nul

call "%REPO%\Install-Desktop-Launcher.bat" /silent
call "%REPO%\Launch-Investment-Management.bat"
exit /b %ERRORLEVEL%
