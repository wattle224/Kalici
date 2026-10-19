@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Investment Management — Full Install
color 0B

echo.
echo  ============================================
echo   INVESTMENT MANAGEMENT — FULL INSTALL
echo  ============================================
echo.
echo  1. Remove ALL old Desktop / OneDrive shortcuts
echo     (including ones pointing at projects\Investment Management)
echo  2. Install app to Desktop\Investment Management
echo  3. Create ONE new shortcut to Kalici / QuantEdge
echo  4. Free ports 8000/3000 and start ledger + web UI
echo.

set "DEST=%USERPROFILE%\Desktop\Investment Management"
set "DESKTOP=%USERPROFILE%\Desktop"
set "ONEDESK=%USERPROFILE%\OneDrive\Desktop"
if exist "%ONEDESK%" if not exist "%DESKTOP%\*" set "DESKTOP=%ONEDESK%"
if exist "%USERPROFILE%\OneDrive\Desktop" set "ONEDESK=%USERPROFILE%\OneDrive\Desktop"

REM ============================================================
REM  STEP 1 — wipe old shortcuts / launchers from Desktop(s)
REM ============================================================
echo  [1/4] Removing old Desktop shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='SilentlyContinue';" ^
  "$names=@(" ^
  "  'Investment Management.lnk'," ^
  "  'Investment Management.bat'," ^
  "  'Kalici Investment Management.lnk'," ^
  "  'Kalici.lnk'," ^
  "  'Launch-Investment-Management.bat'," ^
  "  'Launch-Investment-Management.lnk'," ^
  "  'GET-IAM-NOW.bat'," ^
  "  'START-IAM.bat'," ^
  "  'START-IAM.lnk'," ^
  "  'RUN-IAM.bat'," ^
  "  'RUN-IAM.lnk'," ^
  "  'SETUP-AND-LAUNCH.bat'," ^
  "  'FIX-UTF16.bat'," ^
  "  'RESTART-WEB-UI.bat'," ^
  "  'Validate-IAM.bat'," ^
  "  'TROUBLESHOOT-IAM.bat'," ^
  "  'MERGE-INTO-ONE.bat'," ^
  "  'INSTALL.bat'," ^
  "  'RUN-WEB-UI.bat'" ^
  ");" ^
  "$desks=@([Environment]::GetFolderPath('Desktop'));" ^
  "$one=Join-Path $env:USERPROFILE 'OneDrive\Desktop';" ^
  "if (Test-Path $one) { $desks += $one };" ^
  "foreach ($d in $desks) {" ^
  "  foreach ($n in $names) {" ^
  "    $p=Join-Path $d $n;" ^
  "    if (Test-Path -LiteralPath $p) {" ^
  "      Remove-Item -LiteralPath $p -Force;" ^
  "      Write-Host ('  removed ' + $p)" ^
  "    }" ^
  "  }" ^
  "  Get-ChildItem -LiteralPath $d -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {" ^
  "    $shell=New-Object -ComObject WScript.Shell;" ^
  "    $t=$shell.CreateShortcut($_.FullName).TargetPath;" ^
  "    if ($t -match 'Investment Management|Kalici|START-IAM|GET-IAM|Launch-Investment|iam-standalone|MERGE-INTO-ONE|projects\\\\Investment') {" ^
  "      Remove-Item -LiteralPath $_.FullName -Force;" ^
  "      Write-Host ('  removed ' + $_.FullName + ' (was ' + $t + ')')" ^
  "    }" ^
  "  }" ^
  "}"

if exist "%USERPROFILE%\projects\Investment Management\Launch-Investment-Management.bat" (
  ren "%USERPROFILE%\projects\Investment Management\Launch-Investment-Management.bat" "Launch-Investment-Management.bat.DISABLED" 2>nul
  echo  [OK] Disabled projects\Investment Management\Launch-Investment-Management.bat
)

echo  [OK] Old shortcuts cleared
echo.

REM ============================================================
REM  STEP 2 — install / refresh app folder
REM ============================================================
echo  [2/4] Installing to: %DEST%
if not exist "%DEST%" mkdir "%DEST%"

set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"

REM If this INSTALL.bat was downloaded alone, pull the repo zip
if not exist "%SRC%\Investment-Management.bat" if not exist "%SRC%\backend\server.mjs" if not exist "%SRC%\iam-standalone\server.js" (
  echo  Downloading app from GitHub...
  set "ZIP=%TEMP%\kalici-im-install.zip"
  set "EXTRACT=%TEMP%\kalici-im-extract"
  if exist "%EXTRACT%" rmdir /s /q "%EXTRACT%" 2>nul
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop';" ^
    "$urls=@(" ^
    "  'https://github.com/wattle224/Kalici/archive/refs/heads/cursor/fix-onedrive-shortcut-ae22.zip'," ^
    "  'https://github.com/wattle224/Kalici/archive/refs/heads/cursor/quantedge-terminal-ae22.zip'," ^
    "  'https://github.com/wattle224/Kalici/archive/refs/heads/cursor/iam-full-audit-ae22.zip'," ^
    "  'https://github.com/wattle224/Kalici/archive/refs/heads/main.zip'" ^
    ");" ^
    "$ok=$false;" ^
    "foreach ($u in $urls) {" ^
    "  try {" ^
    "    Invoke-WebRequest -Uri $u -OutFile '%ZIP%';" ^
    "    if ((Get-Item '%ZIP%').Length -gt 10000) { $ok=$true; break }" ^
    "  } catch {}" ^
    "};" ^
    "if (-not $ok) { throw 'Download failed' };" ^
    "Expand-Archive -Path '%ZIP%' -DestinationPath '%EXTRACT%' -Force;" ^
    "$folder=Get-ChildItem '%EXTRACT%' -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1;" ^
    "Write-Host ('  extracted ' + $folder.FullName);" ^
    "Copy-Item -Path (Join-Path $folder.FullName '*') -Destination '%DEST%' -Recurse -Force"
  if errorlevel 1 (
    color 0C
    echo  Download failed. Check internet and try again.
    pause
    exit /b 1
  )
) else (
  echo  Copying from: %SRC%
  robocopy "%SRC%" "%DEST%" /E /XD .git node_modules web\node_modules .next ATLAS.xcodeproj scripts\__pycache__ /NFL /NDL /NJH /NJS /nc /ns /np >nul
  if exist "%SRC%\web" robocopy "%SRC%\web" "%DEST%\web" /E /XD node_modules .next /NFL /NDL /NJH /NJS /nc /ns /np >nul
  if exist "%SRC%\backend" robocopy "%SRC%\backend" "%DEST%\backend" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul
  if exist "%SRC%\iam-standalone" robocopy "%SRC%\iam-standalone" "%DEST%\iam-standalone" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul
  if exist "%SRC%\scripts" robocopy "%SRC%\scripts" "%DEST%\scripts" /E /XD __pycache__ /NFL /NDL /NJH /NJS /nc /ns /np >nul
  copy /Y "%SRC%\Investment-Management.bat" "%DEST%\Investment-Management.bat" >nul 2>nul
  copy /Y "%SRC%\INSTALL.bat" "%DEST%\INSTALL.bat" >nul 2>nul
  copy /Y "%SRC%\FIX-WRONG-SHORTCUT.bat" "%DEST%\FIX-WRONG-SHORTCUT.bat" >nul 2>nul
  copy /Y "%SRC%\package.json" "%DEST%\package.json" >nul 2>nul
  copy /Y "%SRC%\README.md" "%DEST%\README.md" >nul 2>nul
)

if not exist "%DEST%\Investment-Management.bat" (
  if exist "%DEST%\iam-standalone\RUN-IAM.bat" (
    copy /Y "%DEST%\iam-standalone\RUN-IAM.bat" "%DEST%\Investment-Management.bat" >nul
  )
)

if not exist "%DEST%\Investment-Management.bat" if not exist "%DEST%\backend\server.mjs" if not exist "%DEST%\iam-standalone\server.js" (
  color 0C
  echo  Install incomplete — app files missing in %DEST%
  pause
  exit /b 1
)
echo  [OK] App installed
echo.

REM ============================================================
REM  STEP 3 — one new Desktop shortcut
REM ============================================================
echo  [3/4] Creating new Desktop shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$dest='%DEST%';" ^
  "$target=Join-Path $dest 'Investment-Management.bat';" ^
  "if (-not (Test-Path $target)) { $target=Join-Path $dest 'iam-standalone\RUN-IAM.bat' };" ^
  "if (-not (Test-Path $target)) { throw 'No launcher in install folder' };" ^
  "$desks=@([Environment]::GetFolderPath('Desktop'));" ^
  "$one=Join-Path $env:USERPROFILE 'OneDrive\Desktop';" ^
  "if (Test-Path $one) { $desks += $one };" ^
  "$shell=New-Object -ComObject WScript.Shell;" ^
  "foreach ($d in $desks) {" ^
  "  $lnk=Join-Path $d 'Investment Management.lnk';" ^
  "  $s=$shell.CreateShortcut($lnk);" ^
  "  $s.TargetPath=$target;" ^
  "  $s.WorkingDirectory=(Split-Path -Parent $target);" ^
  "  $s.Description='Investment Management — QuantEdge (Kalici Node ledger, not projects\\ Python app)';" ^
  "  $s.IconLocation='$env:SystemRoot\System32\imageres.dll,109';" ^
  "  $s.Save();" ^
  "  Write-Host ('  created ' + $lnk)" ^
  "}"
if errorlevel 1 (
  color 0C
  echo  Shortcut creation failed.
  pause
  exit /b 1
)
echo  [OK] Shortcut: Investment Management
echo.

REM ============================================================
REM  STEP 4 — start the app
REM ============================================================
echo  [4/4] Starting Investment Management...
echo.
call "%DEST%\Investment-Management.bat"
exit /b %ERRORLEVEL%
