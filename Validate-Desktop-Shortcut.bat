@echo off
setlocal EnableExtensions

REM Validates Desktop Investment Management shortcuts point at real launchers.

set "DESKTOP=%USERPROFILE%\Desktop"
set "FAIL=0"

echo.
echo  Desktop shortcut validation
echo  ===========================
echo  Desktop: %DESKTOP%
echo.

if not exist "%DESKTOP%\Investment Management.lnk" if not exist "%DESKTOP%\Launch-Investment-Management.bat" (
  echo [FAIL] No Investment Management shortcut on Desktop
  echo        Run Install-Desktop-Launcher.bat or GET-IAM-NOW.bat
  set FAIL=1
  goto :done
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$desk=[Environment]::GetFolderPath('Desktop');" ^
  "$shell=New-Object -ComObject WScript.Shell;" ^
  "$ok=$true;" ^
  "Get-ChildItem -LiteralPath $desk -Filter '*.lnk' | Where-Object { $_.Name -match 'Investment Management|Kalici' } | ForEach-Object {" ^
  "  $s=$shell.CreateShortcut($_.FullName);" ^
  "  if (-not (Test-Path -LiteralPath $s.TargetPath)) {" ^
  "    Write-Host ('[FAIL] ' + $_.Name + ' -> MISSING ' + $s.TargetPath); $script:ok=$false" ^
  "  } else {" ^
  "    Write-Host ('[OK] ' + $_.Name + ' -> ' + $s.TargetPath)" ^
  "  }" ^
  "};" ^
  "if (Test-Path (Join-Path $desk 'Launch-Investment-Management.bat')) { Write-Host '[OK] Launch-Investment-Management.bat present' };" ^
  "if (-not $ok) { exit 1 }"

if errorlevel 1 set FAIL=1

:done
echo.
if "%FAIL%"=="1" (
  echo Fix: open your Kalici folder and run Install-Desktop-Launcher.bat
  pause
  exit /b 1
)
echo All checked shortcuts are valid.
pause
exit /b 0
