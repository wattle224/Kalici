param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
)

$ErrorActionPreference = "Stop"

$RepoPath = $RepoPath.TrimEnd('\')

# Prefer the most reliable launcher available in this install.
$candidates = @(
    (Join-Path $RepoPath "START-IAM.bat"),
    (Join-Path $RepoPath "RUN-IAM.bat"),
    (Join-Path $RepoPath "iam-standalone\RUN-IAM.bat"),
    (Join-Path $RepoPath "Launch-Investment-Management.bat")
)

$PrimaryLauncher = $null
foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) {
        $PrimaryLauncher = $c
        break
    }
}

if (-not $PrimaryLauncher) {
    Write-Error "No IAM launcher found under: $RepoPath"
    exit 1
}

$FullLauncher = Join-Path $RepoPath "Launch-Investment-Management.bat"
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
REM Kalici — auto-generated Desktop launcher (do not edit path by hand)
set "KALICI_ROOT=$RepoPath"
if not exist "%KALICI_ROOT%\START-IAM.bat" if not exist "%KALICI_ROOT%\RUN-IAM.bat" if not exist "%KALICI_ROOT%\server.js" (
  echo ERROR: Kalici folder missing or incomplete: %KALICI_ROOT%
  echo Re-run GET-IAM-NOW.bat from GitHub.
  pause
  exit /b 1
)
if exist "%KALICI_ROOT%\START-IAM.bat" (
  call "%KALICI_ROOT%\START-IAM.bat"
) else if exist "%KALICI_ROOT%\RUN-IAM.bat" (
  call "%KALICI_ROOT%\RUN-IAM.bat"
) else if exist "%KALICI_ROOT%\iam-standalone\RUN-IAM.bat" (
  call "%KALICI_ROOT%\iam-standalone\RUN-IAM.bat"
) else (
  call "%KALICI_ROOT%\Launch-Investment-Management.bat"
)
"@ | Set-Content -LiteralPath $wrapperBat -Encoding ASCII
Write-Host "Created: Launch-Investment-Management.bat -> $RepoPath"

$shell = New-Object -ComObject WScript.Shell

$lnkPath = Join-Path $Desktop "Investment Management.lnk"
$lnk = $shell.CreateShortcut($lnkPath)
$lnk.TargetPath = $PrimaryLauncher
$lnk.WorkingDirectory = Split-Path -Parent $PrimaryLauncher
$lnk.Description = "Start Investment Management ledger (port 8000)"
$lnk.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"
$lnk.Save()
Write-Host "Created: Investment Management.lnk -> $PrimaryLauncher"

if (Test-Path -LiteralPath $FullLauncher) {
    $lnk2Path = Join-Path $Desktop "Kalici Investment Management.lnk"
    $lnk2 = $shell.CreateShortcut($lnk2Path)
    $lnk2.TargetPath = $FullLauncher
    $lnk2.WorkingDirectory = $RepoPath
    $lnk2.Description = "Kalici Investment Management (ledger + web UI)"
    $lnk2.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"
    $lnk2.Save()
    Write-Host "Created: Kalici Investment Management.lnk -> $FullLauncher"
}

# Validate shortcuts target existing files
$invalid = @()
Get-ChildItem -LiteralPath $Desktop -Filter "*.lnk" | ForEach-Object {
    if ($_.Name -match "Investment Management|Kalici") {
        $s = $shell.CreateShortcut($_.FullName)
        if (-not (Test-Path -LiteralPath $s.TargetPath)) {
            $invalid += "$($_.Name) -> missing $($s.TargetPath)"
        } else {
            Write-Host "VALID: $($_.Name) -> $($s.TargetPath)"
        }
    }
}

if ($invalid.Count -gt 0) {
    Write-Error ("Invalid shortcuts:`n" + ($invalid -join "`n"))
    exit 1
}

Write-Host ""
Write-Host "Desktop: $Desktop"
Write-Host "Repo:    $RepoPath"
Write-Host "Primary: $PrimaryLauncher"
exit 0
