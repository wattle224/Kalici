@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Fix UTF-16 corrupted Python files
color 0B

echo.
echo  ============================================
echo   Fix UTF-16 / PowerShell encoding corruption
echo  ============================================
echo.
echo  This repairs files that show:
echo    SyntaxError: invalid character '∀' (U+2200)
echo.
echo  Common cause: PowerShell Out-File / Set-Content / ^>
echo  saved a .py file as UTF-16 instead of UTF-8.
echo.

REM Prefer the folder that launched this, then common install paths.
set "TARGET="
if exist "%~dp0backend\app\services\strategy_config.py" set "TARGET=%~dp0"
if not defined TARGET if exist "%USERPROFILE%\projects\Investment Management\backend\app\services\strategy_config.py" set "TARGET=%USERPROFILE%\projects\Investment Management"
if not defined TARGET if exist "%USERPROFILE%\OneDrive\projects\Investment Management\backend\app\services\strategy_config.py" set "TARGET=%USERPROFILE%\OneDrive\projects\Investment Management"
if not defined TARGET if exist "C:\Users\User\projects\Investment Management\backend\app\services\strategy_config.py" set "TARGET=C:\Users\User\projects\Investment Management"

if "%~1" neq "" set "TARGET=%~1"

if not defined TARGET (
  color 0C
  echo  Could not find Investment Management project.
  echo  Drag your project folder onto this .bat, or run:
  echo.
  echo    FIX-UTF16.bat "C:\Users\User\projects\Investment Management"
  echo.
  pause
  exit /b 1
)

echo  Target: %TARGET%
echo.

where python >nul 2>&1
if errorlevel 1 where py >nul 2>&1
if errorlevel 1 (
  if exist "%TARGET%\backend\.venv\Scripts\python.exe" (
    set "PY=%TARGET%\backend\.venv\Scripts\python.exe"
  ) else (
    color 0C
    echo  Python not found on PATH.
    pause
    exit /b 1
  )
) else (
  where python >nul 2>&1 && set "PY=python" || set "PY=py"
)

set "SCRIPT=%~dp0scripts\fix-utf16-byteswap.py"
if not exist "%SCRIPT%" set "SCRIPT=%TARGET%\scripts\fix-utf16-byteswap.py"
if not exist "%SCRIPT%" (
  echo  Downloading repair script...
  set "SCRIPT=%TEMP%\fix-utf16-byteswap.py"
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$urls=@('https://github.com/wattle224/Kalici/raw/cursor/iam-full-audit-ae22/scripts/fix-utf16-byteswap.py','https://github.com/wattle224/Kalici/raw/main/scripts/fix-utf16-byteswap.py'); foreach($u in $urls){ try { Invoke-WebRequest -Uri $u -OutFile '%SCRIPT%'; if((Get-Item '%SCRIPT%').Length -gt 500){ exit 0 } } catch {} }; exit 1"
)

if not exist "%SCRIPT%" (
  color 0C
  echo  Repair script missing.
  pause
  exit /b 1
)

echo  Scanning for corrupted files...
echo.
"%PY%" "%SCRIPT%" "%TARGET%\backend" "%TARGET%"
echo.
echo  Applying fixes with backup (.bak)...
echo.
"%PY%" "%SCRIPT%" "%TARGET%\backend" "%TARGET%" --apply --backup
set "ERR=%ERRORLEVEL%"

echo.
if "%ERR%" neq "0" (
  color 0E
  echo  Some files could not be auto-fixed. Open them in VS Code and
  echo  set Encoding to UTF-8, then Save.
) else (
  color 0A
  echo  Done. Now restart Investment Management:
  echo    Launch-Investment-Management.bat
  echo  or from backend folder: uvicorn / your usual start command.
)

echo.
echo  Tip: in PowerShell always write files with:
echo    Set-Content -Encoding utf8 path\to\file.py
echo  Never use bare ^> redirection for .py files.
echo.
pause
exit /b %ERR%
