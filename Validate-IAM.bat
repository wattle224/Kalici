@echo off
echo.
echo  IAM Health Check
echo  ================
echo.

set "FAIL=0"

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 5; Write-Host 'Port 8000 /health:' $r.StatusCode 'OK'; exit 0 } catch { Write-Host 'Port 8000 /health: FAIL'; exit 1 }"
if errorlevel 1 set "FAIL=1"

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/api/ledger' -TimeoutSec 5; Write-Host 'Port 8000 /api/ledger:' $r.StatusCode 'OK'; exit 0 } catch { Write-Host 'Port 8000 /api/ledger: FAIL'; exit 1 }"
if errorlevel 1 set "FAIL=1"

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/api/ledger' -TimeoutSec 5; Write-Host 'Port 3000 /api/ledger:' $r.StatusCode 'OK'; exit 0 } catch { Write-Host 'Port 3000 /api/ledger: FAIL (optional)'; exit 0 }"

echo.
if "%FAIL%"=="1" (
  echo IAM NOT STARTED — run Launch-Investment-Management.bat
  echo Keep the "Kalici Ledger API :8000" window open.
) else (
  echo IAM STARTED SUCCESSFULLY
)
echo.
pause
