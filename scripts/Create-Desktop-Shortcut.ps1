param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
)

$ErrorActionPreference = "Stop"

$RepoPath = $RepoPath.TrimEnd('\')

# Single entry point — prefer the unified launcher
$candidates = @(
    (Join-Path $RepoPath "Investment-Management.bat"),
    (Join-Path $RepoPath "Launch-Investment-Management.bat"),
    (Join-Path $RepoPath "START-IAM.bat"),
    (Join-Path $RepoPath "RUN-IAM.bat"),
    (Join-Path $RepoPath "iam-standalone\RUN-IAM.bat")
)

$PrimaryLauncher = $null
foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) {
        $PrimaryLauncher = $c
        break
    }
}

if (-not $PrimaryLauncher) {
    Write-Error "No Investment Management launcher found under: $RepoPath"
    exit 1
}

$Desktop = [Environment]::GetFolderPath("Desktop")
if (-not (Test-Path -LiteralPath $Desktop)) {
    Write-Error "Desktop folder not found: $Desktop"
    exit 1
}

# Remove ALL old confusing shortcuts / wrappers — keep one
$oldNames = @(
    "Launch-Investment-Management.bat",
    "Investment Management.lnk",
    "Investment Management.bat",
    "Kalici Investment Management.lnk",
    "GET-IAM-NOW.bat",
    "START-IAM.bat",
    "RUN-IAM.bat",
    "Kalici.lnk"
)

foreach ($name in $oldNames) {
    $p = Join-Path $Desktop $name
    if (Test-Path -LiteralPath $p) {
        Remove-Item -LiteralPath $p -Force
        Write-Host "Removed old: $name"
    }
}

$shell = New-Object -ComObject WScript.Shell
$lnkPath = Join-Path $Desktop "Investment Management.lnk"
$lnk = $shell.CreateShortcut($lnkPath)
$lnk.TargetPath = $PrimaryLauncher
$lnk.WorkingDirectory = Split-Path -Parent $PrimaryLauncher
$lnk.Description = "Investment Management — one-click start"
$lnk.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"
$lnk.Save()

if (-not (Test-Path -LiteralPath $lnk.TargetPath)) {
    Write-Error "Shortcut target missing: $($lnk.TargetPath)"
    exit 1
}

Write-Host "VALID: Investment Management.lnk -> $($lnk.TargetPath)"
Write-Host "Desktop: $Desktop"
Write-Host "Repo:    $RepoPath"
exit 0
