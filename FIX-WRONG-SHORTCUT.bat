@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Fix Investment Management Shortcut
color 0B

REM ============================================================
REM  Fixes the common failure:
REM    Shortcut on OneDrive Desktop still points at
REM    C:\Users\User\projects\Investment Management  (old Python)
REM  Result: FastAPI Errno 10048 on :8000 and "Launch did not complete"
REM
REM  This script:
REM    1. Shows where your current .lnk points
REM    2. Frees ports 8000 and 3000
REM    3. Removes wrong Desktop / OneDrive shortcuts
REM    4. Ensures Desktop\Investment Management (Kalici) exists
REM    5. Creates ONE correct shortcut and starts QuantEdge
REM ============================================================

echo.
echo  ============================================
echo   FIX WRONG SHORTCUT / PORT 8000 CONFLICT
echo  ============================================
echo.

set "DEST=%USERPROFILE%\Desktop\Investment Management"
set "ONEDESK=%USERPROFILE%\OneDrive\Desktop"
if not exist "%USERPROFILE%\Desktop" if exist "%ONEDESK%" set "DEST=%ONEDESK%\Investment Management"

echo  [1/5] Inspecting current shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='SilentlyContinue';" ^
  "$shell=New-Object -ComObject WScript.Shell;" ^
  "$desks=@([Environment]::GetFolderPath('Desktop'));" ^
  "$one=Join-Path $env:USERPROFILE 'OneDrive\Desktop'; if (Test-Path $one) { $desks += $one };" ^
  "foreach ($d in ($desks | Select-Object -Unique)) {" ^
  "  Get-ChildItem -LiteralPath $d -Filter '*.lnk' | Where-Object { $_.Name -match 'Investment|Kalici|IAM|Launch' } | ForEach-Object {" ^
  "    $t=$shell.CreateShortcut($_.FullName).TargetPath;" ^
  "    $bad = ($t -match 'projects\\Investment Management' -or $t -match 'projects/Investment Management');" ^
  "    $tag = if ($bad) { 'WRONG (old Python app)' } else { 'ok?' };" ^
  "    Write-Host ('  ' + $_.FullName);" ^
  "    Write-Host ('    -> ' + $t + '  [' + $tag + ']');" ^
  "  }" ^
  "}"

echo.
echo  [2/5] Freeing ports 8000 and 3000 (old FastAPI / stale Next)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='SilentlyContinue';" ^
  "foreach ($port in 8000,3000) {" ^
  "  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue;" ^
  "  if (-not $conns) {" ^
  "    netstat -ano | Select-String (':' + $port + '\s') | Select-String 'LISTENING' | ForEach-Object {" ^
  "      $parts = ($_ -split '\s+') | Where-Object { $_ -ne '' };" ^
  "      $procId = $parts[-1]; if ($procId -match '^\d+$') { Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue; Write-Host ('  killed PID ' + $procId + ' on :' + $port) }" ^
  "    }; continue" ^
  "  }" ^
  "  foreach ($c in $conns) {" ^
  "    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue;" ^
  "    Write-Host ('  killed PID ' + $c.OwningProcess + ' on :' + $port)" ^
  "  }" ^
  "}"
timeout /t 2 /nobreak >nul

echo.
echo  [3/5] Removing wrong Desktop / OneDrive shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='SilentlyContinue';" ^
  "$shell=New-Object -ComObject WScript.Shell;" ^
  "$desks=@([Environment]::GetFolderPath('Desktop'));" ^
  "$one=Join-Path $env:USERPROFILE 'OneDrive\Desktop'; if (Test-Path $one) { $desks += $one };" ^
  "$names=@('Investment Management.lnk','Investment Management.bat','Launch-Investment-Management.bat','Launch-Investment-Management.lnk','Kalici.lnk','Kalici Investment Management.lnk','GET-IAM-NOW.bat','START-IAM.bat','START-IAM.lnk','RUN-IAM.bat','SETUP-AND-LAUNCH.bat','MERGE-INTO-ONE.bat');" ^
  "foreach ($d in ($desks | Select-Object -Unique)) {" ^
  "  foreach ($n in $names) {" ^
  "    $p=Join-Path $d $n; if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force; Write-Host ('  removed ' + $p) }" ^
  "  }" ^
  "  Get-ChildItem -LiteralPath $d -Filter '*.lnk' | ForEach-Object {" ^
  "    $t=$shell.CreateShortcut($_.FullName).TargetPath;" ^
  "    if ($t -match 'projects\\Investment Management|projects/Investment Management|Kalici|START-IAM|GET-IAM|Launch-Investment|iam-standalone') {" ^
  "      Remove-Item -LiteralPath $_.FullName -Force; Write-Host ('  removed ' + $_.FullName)" ^
  "    }" ^
  "  }" ^
  "}"

REM Disable old Python launcher so it cannot be double-clicked by mistake
set "OLDPROJ=%USERPROFILE%\projects\Investment Management"
if exist "%OLDPROJ%\Launch-Investment-Management.bat" (
  if not exist "%OLDPROJ%\Launch-Investment-Management.bat.DISABLED" (
    ren "%OLDPROJ%\Launch-Investment-Management.bat" "Launch-Investment-Management.bat.DISABLED" 2>nul
    echo  [OK] Disabled old launcher in projects\Investment Management
  )
)
if exist "%OLDPROJ%\backend\app\main.py" (
  echo  NOTE: Old Python app still exists at:
  echo        %OLDPROJ%
  echo        Do not use it. Use Desktop\Investment Management only.
)

echo.
echo  [4/5] Ensuring Kalici app at: %DEST%
if not exist "%DEST%\Investment-Management.bat" (
  echo  App folder empty/missing — downloading full install script...
  set "IPS1=%TEMP%\Install-To-Desktop.ps1"
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop';" ^
    "$out='%IPS1%';" ^
    "$uri='https://raw.githubusercontent.com/wattle224/Kalici/cursor/fix-onedrive-shortcut-ae22/scripts/Install-To-Desktop.ps1';" ^
    "Invoke-WebRequest -Uri $uri -OutFile $out -UseBasicParsing;" ^
    "if (-not (Test-Path $out) -or (Get-Item $out).Length -lt 500) { throw 'download empty' };" ^
    "Write-Host ('  saved ' + $out + ' (' + (Get-Item $out).Length + ' bytes)')"
  if errorlevel 1 (
    color 0C
    echo  Could not download Install-To-Desktop.ps1. Check internet.
    pause
    exit /b 1
  )
  if not exist "%IPS1%" (
    color 0C
    echo  Download reported OK but file missing: %IPS1%
    pause
    exit /b 1
  )
  powershell -NoProfile -ExecutionPolicy Bypass -File "%IPS1%"
  exit /b %ERRORLEVEL%
)

REM Refresh launcher from this script's repo if we are running inside Kalici
set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"
if exist "%SRC%\Investment-Management.bat" if exist "%SRC%\backend\server.mjs" (
  echo  Refreshing launcher files into Desktop folder...
  copy /Y "%SRC%\Investment-Management.bat" "%DEST%\Investment-Management.bat" >nul
  if exist "%SRC%\INSTALL.bat" copy /Y "%SRC%\INSTALL.bat" "%DEST%\INSTALL.bat" >nul
)

echo.
echo  [5/5] Creating correct shortcut + starting app...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$dest='%DEST%';" ^
  "$target=Join-Path $dest 'Investment-Management.bat';" ^
  "if (-not (Test-Path $target)) { throw 'Missing Investment-Management.bat in ' + $dest };" ^
  "$desks=@([Environment]::GetFolderPath('Desktop'));" ^
  "$one=Join-Path $env:USERPROFILE 'OneDrive\Desktop'; if (Test-Path $one) { $desks += $one };" ^
  "$shell=New-Object -ComObject WScript.Shell;" ^
  "foreach ($d in ($desks | Select-Object -Unique)) {" ^
  "  $lnk=Join-Path $d 'Investment Management.lnk';" ^
  "  $s=$shell.CreateShortcut($lnk);" ^
  "  $s.TargetPath=$target;" ^
  "  $s.WorkingDirectory=$dest;" ^
  "  $s.Description='Investment Management — QuantEdge (Kalici Node ledger)';" ^
  "  $s.IconLocation='$env:SystemRoot\System32\imageres.dll,109';" ^
  "  $s.Save();" ^
  "  Write-Host ('  [OK] ' + $lnk);" ^
  "  Write-Host ('       -> ' + $target);" ^
  "}"

echo.
echo  Starting QuantEdge from: %DEST%
echo  Keep the two black windows open. Then use Ctrl+F5 in the browser.
echo.
call "%DEST%\Investment-Management.bat"
exit /b %ERRORLEVEL%
