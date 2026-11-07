param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
)

$ErrorActionPreference = "Stop"

$RepoPath   = $RepoPath.TrimEnd('\')
$Launcher   = Join-Path $RepoPath "Launch-Investment-Management.bat"
$QELauncher = Join-Path $RepoPath "Launch-QuantEdge.bat"
$QEUpdate   = Join-Path $RepoPath "Update-And-Launch-QuantEdge.bat"
$QELedger   = Join-Path $RepoPath "Start-Ledger.bat"

if (-not (Test-Path -LiteralPath $QELauncher)) {
    Write-Error "Launch-QuantEdge.bat not found: $QELauncher"
    exit 1
}

$Desktop = [Environment]::GetFolderPath("Desktop")
if (-not (Test-Path -LiteralPath $Desktop)) {
    # OneDrive Desktop fallback
    $onedrive = Join-Path $env:USERPROFILE "OneDrive\Desktop"
    if (Test-Path -LiteralPath $onedrive) {
        $Desktop = $onedrive
    } else {
        Write-Error "Desktop folder not found"
        exit 1
    }
}

$oldNames = @(
    "Launch-Investment-Management.bat",
    "Investment Management.lnk",
    "Investment Management.bat",
    "Kalici Investment Management.lnk",
    "QUANTEDGE Terminal.lnk",
    "QUANTEDGE.lnk",
    "QUANTEDGE Terminal (Update).lnk",
    "QUANTEDGE Ledger.lnk",
    "Update-And-Launch-QuantEdge.bat",
    "Launch-QuantEdge.bat"
)

foreach ($name in $oldNames) {
    $p = Join-Path $Desktop $name
    if (Test-Path -LiteralPath $p) {
        Remove-Item -LiteralPath $p -Force
        Write-Host "Removed old: $name"
    }
}

$shell = New-Object -ComObject WScript.Shell

# Optional Investment Management shortcuts (skip cleanly if absent)
if (Test-Path -LiteralPath $Launcher) {
    $wrapperBat = Join-Path $Desktop "Launch-Investment-Management.bat"
    @"
@echo off
REM Kalici — auto-generated Desktop launcher
set "KALICI_ROOT=$RepoPath"
call "%KALICI_ROOT%\Launch-Investment-Management.bat"
"@ | Set-Content -LiteralPath $wrapperBat -Encoding ASCII
    Write-Host "Created: Launch-Investment-Management.bat"

    $lnkPath = Join-Path $Desktop "Investment Management.lnk"
    $lnk = $shell.CreateShortcut($lnkPath)
    $lnk.TargetPath = Join-Path $RepoPath "START-IAM.bat"
    $lnk.WorkingDirectory = $RepoPath
    $lnk.Description = "Start Investment Management ledger (port 8000)"
    $lnk.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"
    $lnk.Save()
    Write-Host "Created: Investment Management.lnk"

    $lnk2Path = Join-Path $Desktop "Kalici Investment Management.lnk"
    $lnk2 = $shell.CreateShortcut($lnk2Path)
    $lnk2.TargetPath = $Launcher
    $lnk2.WorkingDirectory = $RepoPath
    $lnk2.Description = "Kalici Investment Management (XRP trading UI)"
    $lnk2.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"
    $lnk2.Save()
    Write-Host "Created: Kalici Investment Management.lnk"
} else {
    Write-Host "Skipped Investment Management shortcuts (launcher not present)"
}

# --- Desktop wrapper bats (more reliable than .lnk alone on OneDrive Desktop) ---
$qeWrap = Join-Path $Desktop "Launch-QuantEdge.bat"
@"
@echo off
REM Auto-generated — launches QUANTEDGE from the Kalici repo
set "KALICI_ROOT=$RepoPath"
if not exist "%KALICI_ROOT%\Launch-QuantEdge.bat" (
  echo ERROR: Repo launcher missing:
  echo   %KALICI_ROOT%\Launch-QuantEdge.bat
  echo Re-run Install-QuantEdge-Shortcut.bat from your Kalici checkout.
  pause
  exit /b 1
)
call "%KALICI_ROOT%\Launch-QuantEdge.bat"
"@ | Set-Content -LiteralPath $qeWrap -Encoding ASCII
Write-Host "Created: Desktop\Launch-QuantEdge.bat"

$qeUpdateWrap = Join-Path $Desktop "Update-And-Launch-QuantEdge.bat"
@"
@echo off
REM Auto-generated — update + launch QUANTEDGE from the Kalici repo
set "KALICI_ROOT=$RepoPath"
if not exist "%KALICI_ROOT%\Update-And-Launch-QuantEdge.bat" (
  echo ERROR: Repo updater missing:
  echo   %KALICI_ROOT%\Update-And-Launch-QuantEdge.bat
  echo Re-run Install-QuantEdge-Shortcut.bat from your Kalici checkout.
  pause
  exit /b 1
)
call "%KALICI_ROOT%\Update-And-Launch-QuantEdge.bat"
"@ | Set-Content -LiteralPath $qeUpdateWrap -Encoding ASCII
Write-Host "Created: Desktop\Update-And-Launch-QuantEdge.bat"

# --- QUANTEDGE Terminal.lnk ---
$lnk3Path = Join-Path $Desktop "QUANTEDGE Terminal.lnk"
$lnk3 = $shell.CreateShortcut($lnk3Path)
$lnk3.TargetPath = $qeWrap
$lnk3.WorkingDirectory = $RepoPath
$lnk3.Description = "QUANTEDGE - Global Financial & System Intelligence Terminal (127.0.0.1:3100)"
$lnk3.IconLocation = "$env:SystemRoot\System32\shell32.dll,14"
$lnk3.Save()
Write-Host "Created: QUANTEDGE Terminal.lnk -> Desktop\Launch-QuantEdge.bat"

# --- QUANTEDGE Terminal (Update).lnk ---
if (Test-Path -LiteralPath $QEUpdate) {
    $lnk4Path = Join-Path $Desktop "QUANTEDGE Terminal (Update).lnk"
    $lnk4 = $shell.CreateShortcut($lnk4Path)
    $lnk4.TargetPath = $qeUpdateWrap
    $lnk4.WorkingDirectory = $RepoPath
    $lnk4.Description = "QUANTEDGE - git pull latest and launch (use this to update)"
    $lnk4.IconLocation = "$env:SystemRoot\System32\shell32.dll,146"
    $lnk4.Save()
    Write-Host "Created: QUANTEDGE Terminal (Update).lnk -> Desktop\Update-And-Launch-QuantEdge.bat"
} else {
    Write-Host "Skipped Update shortcut - Update-And-Launch-QuantEdge.bat missing"
}

# --- QUANTEDGE Ledger.lnk ---
if (Test-Path -LiteralPath $QELedger) {
    $lnk5Path = Join-Path $Desktop "QUANTEDGE Ledger.lnk"
    $lnk5 = $shell.CreateShortcut($lnk5Path)
    $lnk5.TargetPath = $QELedger
    $lnk5.WorkingDirectory = $RepoPath
    $lnk5.Description = "Start Kalici deposit ledger on :8000 (keep window open)"
    $lnk5.IconLocation = "$env:SystemRoot\System32\shell32.dll,167"
    $lnk5.Save()
    Write-Host "Created: QUANTEDGE Ledger.lnk"
}

Write-Host ""
Write-Host "Desktop: $Desktop"
Write-Host "Repo:    $RepoPath"
Write-Host ""
Write-Host "Double-click either:"
Write-Host "  QUANTEDGE Terminal (Update).lnk"
Write-Host "  or Update-And-Launch-QuantEdge.bat on the Desktop"
exit 0
