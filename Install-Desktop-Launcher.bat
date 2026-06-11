@echo off
setlocal EnableExtensions

REM Run this ONCE from the Kalici repo folder after git pull.
REM Removes the old Desktop shortcut and installs the correct launcher.

set "REPO=%~dp0"
if "%REPO:~-1%"=="\" set "REPO=%REPO:~0,-1%"
set "DESKTOP=%USERPROFILE%\Desktop"

if not exist "%REPO%\Launch-Investment-Management.bat" (
  echo ERROR: Launch-Investment-Management.bat not found in:
  echo   %REPO%
  echo Run this installer from the Kalici repository root.
  pause
  exit /b 1
)

echo.
echo  Kalici — install Desktop launcher
echo  =================================
echo  Repo:    %REPO%
echo  Desktop: %DESKTOP%
echo.

echo Removing old Desktop launchers...
if exist "%DESKTOP%\Launch-Investment-Management.bat" (
  del /f /q "%DESKTOP%\Launch-Investment-Management.bat"
  echo   Removed Launch-Investment-Management.bat
)
if exist "%DESKTOP%\Investment Management.lnk" (
  del /f /q "%DESKTOP%\Investment Management.lnk"
  echo   Removed Investment Management.lnk
)
if exist "%DESKTOP%\Investment Management.bat" (
  del /f /q "%DESKTOP%\Investment Management.bat"
  echo   Removed Investment Management.bat
)

echo.
echo Installing new Desktop launcher...

(
  echo @echo off
  echo REM Kalici Investment Management — do not edit; calls repo launcher
  echo set "KALICI_ROOT=%REPO%"
  echo call "%%KALICI_ROOT%%\Launch-Investment-Management.bat"
) > "%DESKTOP%\Launch-Investment-Management.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$d = [Environment]::GetFolderPath('Desktop');" ^
  "$p = Join-Path $d 'Investment Management.lnk';" ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut($p);" ^
  "$s.TargetPath = Join-Path $d 'Launch-Investment-Management.bat';" ^
  "$s.WorkingDirectory = '%REPO%';" ^
  "$s.Description = 'Kalici Investment Management (ledger API port 8000 + UI port 3000)';" ^
  "$s.Save();" ^
  "Write-Host '   Created Investment Management.lnk'"

if errorlevel 1 (
  echo ERROR: Could not create Investment Management.lnk
  echo You can still use: %DESKTOP%\Launch-Investment-Management.bat
  pause
  exit /b 1
)

echo   Created Launch-Investment-Management.bat
echo.
echo SUCCESS. Use either on your Desktop:
echo   - Investment Management.lnk
echo   - Launch-Investment-Management.bat
echo.
echo Both start the ledger API ^(port 8000^) then the web UI ^(port 3000^).
echo.
pause
