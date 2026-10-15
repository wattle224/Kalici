@echo off
setlocal EnableExtensions
title Merge into one Investment Management app
color 0B

echo.
echo  ============================================
echo   Merge into ONE app on your Desktop
echo  ============================================
echo.
echo  This copies the unified Kalici app to:
echo    Desktop\Investment Management
echo  and creates ONE shortcut. Use that only.
echo.
echo  You can ignore / stop using:
echo    C:\Users\User\projects\Investment Management
echo    OneDrive Desktop Launch-Investment-Management.bat
echo.

set "DEST=%USERPROFILE%\Desktop\Investment Management"
set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"

if not exist "%SRC%\Investment-Management.bat" (
  if not exist "%SRC%\backend\server.mjs" if not exist "%SRC%\iam-standalone\server.js" (
    color 0C
    echo  Run this from the Kalici repo folder.
    pause
    exit /b 1
  )
)

echo  Source: %SRC%
echo  Dest:   %DEST%
echo.

if not exist "%DEST%" mkdir "%DEST%"

echo  Copying app files...
robocopy "%SRC%" "%DEST%" /E /XD .git node_modules web\node_modules .next ATLAS.xcodeproj /NFL /NDL /NJH /NJS /nc /ns /np >nul
robocopy "%SRC%\web" "%DEST%\web" /E /XD node_modules .next /NFL /NDL /NJH /NJS /nc /ns /np >nul
robocopy "%SRC%\backend" "%DEST%\backend" /E /XD data /NFL /NDL /NJH /NJS /nc /ns /np >nul
robocopy "%SRC%\iam-standalone" "%DEST%\iam-standalone" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul
robocopy "%SRC%\scripts" "%DEST%\scripts" /E /XD __pycache__ /NFL /NDL /NJH /NJS /nc /ns /np >nul

copy /Y "%SRC%\Investment-Management.bat" "%DEST%\Investment-Management.bat" >nul
copy /Y "%SRC%\package.json" "%DEST%\package.json" >nul 2>nul
copy /Y "%SRC%\README.md" "%DEST%\README.md" >nul 2>nul

echo  Creating single Desktop shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -File "%DEST%\scripts\Create-Desktop-Shortcut.ps1" -RepoPath "%DEST%"

echo.
echo  Starting the unified app...
call "%DEST%\Investment-Management.bat"
exit /b %ERRORLEVEL%
