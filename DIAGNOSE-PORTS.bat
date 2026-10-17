@echo off
setlocal EnableExtensions
title Diagnose localhost ports
echo.
echo  What is listening on 3000 / 8000?
echo  ================================
echo.

echo --- Port 8000 (backend / ledger) ---
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 3; Write-Host 'health:' $r.Content } catch { Write-Host 'health: FAIL' }"
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/docs' -TimeoutSec 3; Write-Host 'docs (FastAPI):' $r.StatusCode } catch { Write-Host 'docs: not FastAPI or down' }"
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/api/coinbase' -TimeoutSec 8; Write-Host 'coinbase:' $r.StatusCode $r.Content.Substring(0,[Math]::Min(120,$r.Content.Length)) } catch { Write-Host 'coinbase: FAIL' }"

echo.
echo --- Port 3000 (web UI) ---
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/' -TimeoutSec 5; Write-Host 'status:' $r.StatusCode 'bytes:' $r.RawContentLength; if ($r.Content -match 'iam-live-|Kalici|Coinbase|ATLAS|vite|Next') { Write-Host 'fingerprint: matched app markers' } else { Write-Host 'fingerprint: unknown / possibly stale page' } } catch { Write-Host 'FAIL - nothing on :3000' }"

echo.
echo --- Processes ---
netstat -ano | findstr ":3000" | findstr "LISTENING"
netstat -ano | findstr ":8000" | findstr "LISTENING"

echo.
echo If :3000 looks stale, run RESTART-WEB-UI.bat then Ctrl+F5 in the browser.
echo If your real app is Python IAM, start it from:
echo   C:\Users\User\projects\Investment Management
echo.
pause
