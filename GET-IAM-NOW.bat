@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Download and Start IAM
color 0B

echo.
echo  ============================================
echo   IAM - Download and Start
echo  ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

where node >nul 2>&1
if errorlevel 1 (
  color 0E
  echo  Node.js not found — downloading LTS from https://nodejs.org/
  echo  Accept the UAC prompt if Windows asks.
  echo.
  set "NODE_PS=%TEMP%\kalici-Install-NodeJS.ps1"
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Invoke-WebRequest -Uri 'https://github.com/wattle224/Kalici/raw/main/scripts/Install-NodeJS.ps1' -OutFile '%NODE_PS%'"
  powershell -NoProfile -ExecutionPolicy Bypass -File "%NODE_PS%"
  set "NODE_ERR=!ERRORLEVEL!"
  if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
  if "!NODE_ERR!"=="2" (
    echo.
    echo  Node.js installed. Restart your PC, then run this file again.
    pause
    exit /b 2
  )
  where node >nul 2>&1
  if errorlevel 1 (
    color 0C
    echo.
    echo  Automatic Node.js install failed.
    echo  Opening https://nodejs.org/ — download LTS, install, restart PC.
    start https://nodejs.org/
    pause
    exit /b 1
  )
)

for /f "delims=" %%v in ('node -v') do echo  Node.js %%v OK
echo.

set "DEST=%USERPROFILE%\Desktop\Kalici"
if not exist "%DEST%" mkdir "%DEST%"

echo  Installing to: %DEST%
echo  Downloading from GitHub...
echo.

set "DOWNLOAD_OK=0"
for %%B in (main cursor/ledger-api-port-8000-ae22) do (
  if "!DOWNLOAD_OK!"=="0" (
    set "BRANCH=%%B"
    set "BASE=https://github.com/wattle224/Kalici/raw/%%B/iam-standalone"
    call :try_download
  )
)

REM Also fetch Node.js installer helper for RUN-IAM.bat on Desktop
if "!DOWNLOAD_OK!"=="1" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Invoke-WebRequest -Uri 'https://github.com/wattle224/Kalici/raw/main/scripts/Install-NodeJS.ps1' -OutFile '%DEST%\Install-NodeJS.ps1'" >nul 2>&1
)

if "%DOWNLOAD_OK%"=="0" (
  echo  Raw download failed — trying ZIP archive...
  call :try_zip
)

if "%DOWNLOAD_OK%"=="0" (
  color 0C
  echo.
  echo  Download failed. Check internet, then try:
  echo    https://github.com/wattle224/Kalici/archive/refs/heads/main.zip
  echo  Extract to Desktop\Kalici and run RUN-IAM.bat
  pause
  exit /b 1
)

echo.
echo  Creating Desktop shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Investment Management.lnk');" ^
  "$s.TargetPath='%DEST%\RUN-IAM.bat';" ^
  "$s.WorkingDirectory='%DEST%';" ^
  "$s.Description='Start IAM ledger port 8000';" ^
  "$s.Save()"

echo.
echo  Starting IAM...
start "IAM Ledger - KEEP OPEN" /D "%DEST%" cmd /k "%DEST%\RUN-IAM.bat"

echo  Waiting for server...
timeout /t 3 /nobreak >nul

set OK=0
for /L %%i in (1,1,30) do (
  powershell -NoProfile -Command "try{(Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2).StatusCode}catch{exit 1}" >nul 2>&1
  if not errorlevel 1 set OK=1 & goto done
  timeout /t 1 /nobreak >nul
)
:done

if "%OK%"=="0" (
  color 0C
  echo.
  echo  Server did not start. Look at the black window titled:
  echo    "IAM Ledger - KEEP OPEN"
  echo  for red error text.
  echo.
  echo  Common fixes:
  echo    - Restart PC after installing Node.js
  echo    - Close other apps using port 8000
  pause
  exit /b 1
)

color 0A
echo.
echo  ============================================
echo   SUCCESS - IAM IS RUNNING
echo  ============================================
echo.
echo  Test: http://127.0.0.1:8000/health
echo  KEEP OPEN the "IAM Ledger - KEEP OPEN" window
echo  Then refresh Investment Management.
echo.
start http://127.0.0.1:8000/health
pause
exit /b 0

:try_download
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$d='%DEST%';" ^
  "$b='%BASE%';" ^
  "Invoke-WebRequest -Uri ($b+'/server.js') -OutFile ($d+'\server.js');" ^
  "Invoke-WebRequest -Uri ($b+'/RUN-IAM.bat') -OutFile ($d+'\RUN-IAM.bat');" ^
  "if ((Get-Item ($d+'\server.js')).Length -lt 1000) { throw 'server.js too small' }"
if not errorlevel 1 set DOWNLOAD_OK=1
exit /b 0

:try_zip
for %%B in (main cursor/ledger-api-port-8000-ae22) do (
  if "%DOWNLOAD_OK%"=="0" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$ErrorActionPreference='Stop';" ^
      "$branch='%%B';" ^
      "$dest='%DEST%';" ^
      "$zip=Join-Path $env:TEMP ('kalici-'+($branch -replace '/','-')+'.zip');" ^
      "$url='https://github.com/wattle224/Kalici/archive/refs/heads/'+$branch+'.zip';" ^
      "Invoke-WebRequest -Uri $url -OutFile $zip;" ^
      "Expand-Archive -Path $zip -DestinationPath $env:TEMP -Force;" ^
      "$folder=Get-ChildItem $env:TEMP -Directory | Where-Object { $_.Name -like 'Kalici-*' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1;" ^
      "$src=Join-Path $folder.FullName 'iam-standalone';" ^
      "if (-not (Test-Path $src)) { throw 'iam-standalone missing in zip' };" ^
      "Copy-Item (Join-Path $src '*') $dest -Force"
    if not errorlevel 1 set DOWNLOAD_OK=1
  )
)
exit /b 0
