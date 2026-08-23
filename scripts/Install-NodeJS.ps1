# Downloads and installs Node.js LTS from https://nodejs.org/ (Windows x64).
# Returns exit 0 when node.exe is available.

param(
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    if (-not $Quiet) { Write-Host $Message }
}

function Find-NodeExe {
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd -and (Test-Path -LiteralPath $cmd.Source)) {
        return $cmd.Source
    }
    $candidates = @(
        "${env:ProgramFiles}\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe"
    )
    foreach ($path in $candidates) {
        if (Test-Path -LiteralPath $path) { return $path }
    }
    return $null
}

$existing = Find-NodeExe
if ($existing) {
    $version = & $existing -v
    Write-Step "Node.js already installed: $version"
    exit 0
}

Write-Step ""
Write-Step "  Node.js LTS not found — downloading from nodejs.org..."
Write-Step ""

$arch = "x64"
if ($env:PROCESSOR_ARCHITECTURE -match "ARM") { $arch = "arm64" }

try {
    $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing
} catch {
    Write-Host "ERROR: Could not reach https://nodejs.org/ — check your internet connection."
    exit 1
}

$lts = $index | Where-Object { $_.lts -ne $false } | Select-Object -First 1
if (-not $lts) {
    Write-Host "ERROR: Could not find Node.js LTS release on nodejs.org."
    exit 1
}

$version = $lts.version
$file = "node-$version-$arch.msi"
$url = "https://nodejs.org/dist/$version/$file"
$msi = Join-Path $env:TEMP $file

Write-Step "  Version: $version ($($lts.lts))"
Write-Step "  Download: $url"
Write-Step ""

try {
    Invoke-WebRequest -Uri $url -OutFile $msi -UseBasicParsing
} catch {
    Write-Host "ERROR: Download failed. Open https://nodejs.org/ and install LTS manually."
    exit 1
}

Write-Step "  Installing Node.js (you may see a UAC prompt)..."
Write-Step ""

$log = Join-Path $env:TEMP "nodejs-install.log"
$args = @("/i", $msi, "/passive", "/norestart", "/L*v", $log)
$p = Start-Process -FilePath "msiexec.exe" -ArgumentList $args -Wait -PassThru

if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) {
    Write-Host "ERROR: Node.js installer failed (exit $($p.ExitCode))."
    Write-Host "Log: $log"
    Write-Host "Install manually from https://nodejs.org/"
    exit 1
}

$nodeExe = Find-NodeExe
if (-not $nodeExe) {
    Write-Host ""
    Write-Host "Node.js installed but not on PATH yet."
    Write-Host "Close this window, restart your PC, then run GET-IAM-NOW.bat again."
    exit 2
}

$installedVersion = & $nodeExe -v
Write-Step ""
Write-Step "  Node.js installed: $installedVersion"
Write-Step ""

exit 0
