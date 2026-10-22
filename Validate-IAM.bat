@echo off
echo.
echo  IAM Health Check
echo  ================
echo.

set "FAIL=0"
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 5; Write-Host 'Port 8000 /health:' $r.StatusCode 'OK'; exit 0 } catch { Write-Host 'Port 8000 /health: FAIL'; exit 1 }"
if errorlevel 1 set "FAIL=1"

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/api/ledger' -TimeoutSec 5; Write-Host 'Port 8000 /api/ledger:' $r.StatusCode 'OK'; exit 0 } catch { Write-Host 'Port 8000 /api/ledger: FAIL'; exit 1 }"
if errorlevel 1 set "FAIL=1"

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/api/ledger' -TimeoutSec 5; Write-Host 'Port 3000 /api/ledger:' $r.StatusCode 'OK'; exit 0 } catch { Write-Host 'Port 3000 /api/ledger: FAIL (optional)'; exit 0 }"

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/api/coinbase' -TimeoutSec 15; Write-Host 'Port 8000 /api/coinbase:' $r.StatusCode; Write-Host $r.Content; if ($r.StatusCode -ge 400) { exit 1 }; exit 0 } catch { Write-Host 'Port 8000 /api/coinbase: FAIL'; exit 1 }"
if errorlevel 1 set "FAIL=1"

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/api/coinbase' -TimeoutSec 15; Write-Host 'Port 3000 /api/coinbase:' $r.StatusCode 'OK'; exit 0 } catch { Write-Host 'Port 3000 /api/coinbase: FAIL (optional web UI)'; exit 0 }"

echo.
echo --- Coinbase (direct) ---
where node >nul 2>&1
if not errorlevel 1 (
  if exist "%ROOT%\backend\coinbase-check.mjs" (
    node "%ROOT%\backend\coinbase-check.mjs"
    if errorlevel 1 set "FAIL=1"
  )
) else (
  echo Node.js not on PATH — skipped direct Coinbase check
)

echo.
echo --- Desktop shortcut ---
if exist "%USERPROFILE%\Desktop\Investment Management.lnk" (
  echo [OK] Investment Management.lnk present
) else if exist "%USERPROFILE%\Desktop\Launch-Investment-Management.bat" (
  echo [OK] Launch-Investment-Management.bat present
) else (
  echo [WARN] No Desktop shortcut — run Install-Desktop-Launcher.bat
)

echo.
if "%FAIL%"=="1" (
  echo IAM CHECK FAILED — run Launch-Investment-Management.bat / START-IAM.bat
  echo Keep the "Kalici Ledger API - KEEP OPEN" window open.
) else (
  echo IAM CHECK PASSED
)
echo.
pause
