param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
)

$ErrorActionPreference = "Stop"

$RepoPath   = $RepoPath.TrimEnd('\')
$Launcher   = Join-Path $RepoPath "Launch-Investment-Management.bat"
$QELauncher = Join-Path $RepoPath "Launch-QuantEdge.bat"
$QEUpdate   = Join-Path $RepoPath "Update-And-Launch-QuantEdge.bat"

if (-not (Test-Path -LiteralPath $Launcher)) {
    Write-Error "Launcher not found: $Launcher"
    exit 1
}

$Desktop = [Environment]::GetFolderPath("Desktop")
if (-not (Test-Path -LiteralPath $Desktop)) {
    Write-Error "Desktop folder not found: $Desktop"
    exit 1
}

$oldNames = @(
    "Launch-Investment-Management.bat",
    "Investment Management.lnk",
    "Investment Management.bat",
    "Kalici Investment Management.lnk",
    "QUANTEDGE Terminal.lnk",
    "QUANTEDGE.lnk",
    "QUANTEDGE Terminal (Update).lnk"
)

foreach ($name in $oldNames) {
    $p = Join-Path $Desktop $name
    if (Test-Path -LiteralPath $p) {
        Remove-Item -LiteralPath $p -Force
        Write-Host "Removed old: $name"
    }
}

$wrapperBat = Join-Path $Desktop "Launch-Investment-Management.bat"
@"
@echo off
REM Kalici — auto-generated Desktop launcher
set "KALICI_ROOT=$RepoPath"
call "%KALICI_ROOT%\Launch-Investment-Management.bat"
"@ | Set-Content -LiteralPath $wrapperBat -Encoding ASCII
Write-Host "Created: Launch-Investment-Management.bat"

$shell = New-Object -ComObject WScript.Shell

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

# --- QUANTEDGE Terminal (new front end; see Launch-QuantEdge.bat) ---
if (Test-Path -LiteralPath $QELauncher) {
    $lnk3Path = Join-Path $Desktop "QUANTEDGE Terminal.lnk"
    $lnk3 = $shell.CreateShortcut($lnk3Path)
    $lnk3.TargetPath = $QELauncher
    $lnk3.WorkingDirectory = $RepoPath
    $lnk3.Description = "QUANTEDGE - Global Financial & System Intelligence Terminal (127.0.0.1:3100)"
    # red-ish globe-ish icon from Windows shell32
    $lnk3.IconLocation = "$env:SystemRoot\System32\shell32.dll,14"
    $lnk3.Save()
    Write-Host "Created: QUANTEDGE Terminal.lnk"
} else {
    Write-Host "Skipped QUANTEDGE Terminal.lnk - Launch-QuantEdge.bat not found at $QELauncher"
}

# --- QUANTEDGE Terminal (Update) - git pull first, then launch ---
if (Test-Path -LiteralPath $QEUpdate) {
    $lnk4Path = Join-Path $Desktop "QUANTEDGE Terminal (Update).lnk"
    $lnk4 = $shell.CreateShortcut($lnk4Path)
    $lnk4.TargetPath = $QEUpdate
    $lnk4.WorkingDirectory = $RepoPath
    $lnk4.Description = "QUANTEDGE - git pull latest and launch (use this to update)"
    $lnk4.IconLocation = "$env:SystemRoot\System32\shell32.dll,146"
    $lnk4.Save()
    Write-Host "Created: QUANTEDGE Terminal (Update).lnk"
}

Write-Host ""
Write-Host "Desktop: $Desktop"
Write-Host "Repo:    $RepoPath"
exit 0
