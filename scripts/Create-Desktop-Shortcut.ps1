param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
)

$ErrorActionPreference = "Stop"

$RepoPath = $RepoPath.TrimEnd('\')
$Launcher = Join-Path $RepoPath "Launch-Investment-Management.bat"

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
    "Kalici Investment Management.lnk"
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
$lnk.TargetPath = $Launcher
$lnk.WorkingDirectory = $RepoPath
$lnk.Description = "Kalici Investment Management (XRP trading UI)"
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

Write-Host ""
Write-Host "Desktop: $Desktop"
Write-Host "Repo:    $RepoPath"
exit 0
