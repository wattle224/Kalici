param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
)

$ErrorActionPreference = "Stop"

$RepoPath = $RepoPath.TrimEnd('\')

# Reject the old Python FastAPI stack
$oldMain = Join-Path $RepoPath "backend\app\main.py"
$nodeLedger = @(
    (Join-Path $RepoPath "iam-standalone\server.js"),
    (Join-Path $RepoPath "backend\server.mjs")
) | Where-Object { Test-Path -LiteralPath $_ }

if ((Test-Path -LiteralPath $oldMain) -and -not $nodeLedger) {
    Write-Error "RepoPath is the OLD Python app (backend\app\main.py). Use Desktop\Investment Management (Kalici) instead."
    exit 1
}

if ($RepoPath -match '[\\/]projects[\\/]Investment Management') {
    Write-Error "Do not point the shortcut at projects\Investment Management. Use Desktop\Investment Management."
    exit 1
}

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

$desks = @([Environment]::GetFolderPath("Desktop"))
$one = Join-Path $env:USERPROFILE "OneDrive\Desktop"
if (Test-Path -LiteralPath $one) { $desks += $one }
$desks = $desks | Select-Object -Unique

# Remove ALL old confusing shortcuts / wrappers — keep one
$oldNames = @(
    "Launch-Investment-Management.bat",
    "Launch-Investment-Management.lnk",
    "Investment Management.lnk",
    "Investment Management.bat",
    "Kalici Investment Management.lnk",
    "GET-IAM-NOW.bat",
    "START-IAM.bat",
    "START-IAM.lnk",
    "RUN-IAM.bat",
    "Kalici.lnk",
    "FIX-WRONG-SHORTCUT.bat"
)

$shell = New-Object -ComObject WScript.Shell
foreach ($Desktop in $desks) {
    foreach ($name in $oldNames) {
        $p = Join-Path $Desktop $name
        if (Test-Path -LiteralPath $p) {
            Remove-Item -LiteralPath $p -Force
            Write-Host "Removed old: $p"
        }
    }
    Get-ChildItem -LiteralPath $Desktop -Filter "*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
        $t = $shell.CreateShortcut($_.FullName).TargetPath
        if ($t -match "projects[\\/]Investment Management|Investment Management|Kalici|START-IAM|GET-IAM|Launch-Investment") {
            Remove-Item -LiteralPath $_.FullName -Force
            Write-Host "Removed old: $($_.FullName) -> $t"
        }
    }
}

foreach ($Desktop in $desks) {
    $lnkPath = Join-Path $Desktop "Investment Management.lnk"
    $lnk = $shell.CreateShortcut($lnkPath)
    $lnk.TargetPath = $PrimaryLauncher
    $lnk.WorkingDirectory = Split-Path -Parent $PrimaryLauncher
    $lnk.Description = "Investment Management - QuantEdge Terminal"
    $lnk.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"
    $lnk.Save()
    Write-Host "VALID: $lnkPath -> $($lnk.TargetPath)"
}

# Disable old projects launcher
$oldLaunch = Join-Path $env:USERPROFILE "projects\Investment Management\Launch-Investment-Management.bat"
if (Test-Path -LiteralPath $oldLaunch) {
    Rename-Item -LiteralPath $oldLaunch -NewName "Launch-Investment-Management.bat.DISABLED" -Force -ErrorAction SilentlyContinue
    Write-Host "Disabled old projects\ launcher"
}

Write-Host "Repo: $RepoPath"
exit 0
