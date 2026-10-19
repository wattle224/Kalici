# Fill Desktop\Investment Management from GitHub and create the shortcut.
# Safe to re-run when the folder is empty or incomplete.
$ErrorActionPreference = "Stop"

$dest = Join-Path $env:USERPROFILE "Desktop\Investment Management"
$zip = Join-Path $env:TEMP "kalici-im-install.zip"
$extract = Join-Path $env:TEMP "kalici-im-extract"
$urls = @(
  "https://github.com/wattle224/Kalici/archive/refs/heads/cursor/fix-onedrive-shortcut-ae22.zip",
  "https://github.com/wattle224/Kalici/archive/refs/heads/cursor/quantedge-terminal-ae22.zip",
  "https://github.com/wattle224/Kalici/archive/refs/heads/cursor/iam-full-audit-ae22.zip",
  "https://github.com/wattle224/Kalici/archive/refs/heads/main.zip"
)

Write-Host ""
Write-Host "=== Install Investment Management (QuantEdge) ==="
Write-Host "Destination: $dest"
Write-Host ""

# Free ports first
foreach ($port in 8000, 3000) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Host "  freed :$port (PID $($_.OwningProcess))"
    }
}

Write-Host "[1/4] Downloading app from GitHub..."
$ok = $false
foreach ($u in $urls) {
  try {
    Write-Host "  try $u"
    Invoke-WebRequest -Uri $u -OutFile $zip -UseBasicParsing
    if ((Get-Item $zip).Length -gt 50000) { $ok = $true; break }
  } catch {
    Write-Host "  failed: $($_.Exception.Message)"
  }
}
if (-not $ok) { throw "Could not download Kalici zip from GitHub. Check internet." }

if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
Expand-Archive -Path $zip -DestinationPath $extract -Force
$folder = Get-ChildItem $extract -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $folder) { throw "Zip extracted but no folder found." }
Write-Host "  extracted $($folder.FullName)"

Write-Host "[2/4] Installing into Desktop folder..."
if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }
# Clear incomplete install but keep the folder
Get-ChildItem -LiteralPath $dest -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $folder.FullName "*") -Destination $dest -Recurse -Force

$launcher = Join-Path $dest "Investment-Management.bat"
if (-not (Test-Path $launcher)) {
  $alt = Join-Path $dest "iam-standalone\RUN-IAM.bat"
  if (Test-Path $alt) { Copy-Item $alt $launcher -Force }
}
if (-not (Test-Path $launcher)) { throw "Install incomplete — Investment-Management.bat missing in $dest" }
if (-not (Test-Path (Join-Path $dest "backend\server.mjs")) -and -not (Test-Path (Join-Path $dest "iam-standalone\server.js"))) {
  throw "Install incomplete — no Node ledger server in $dest"
}
Write-Host "  [OK] $launcher"

Write-Host "[3/4] Creating Desktop / OneDrive shortcuts..."
$desks = @([Environment]::GetFolderPath("Desktop"))
$one = Join-Path $env:USERPROFILE "OneDrive\Desktop"
if (Test-Path $one) { $desks += $one }
$desks = $desks | Select-Object -Unique
$shell = New-Object -ComObject WScript.Shell

$killNames = @(
  "Investment Management.lnk", "Investment Management.bat",
  "Launch-Investment-Management.bat", "Launch-Investment-Management.lnk",
  "Kalici.lnk", "Kalici Investment Management.lnk",
  "GET-IAM-NOW.bat", "START-IAM.bat", "START-IAM.lnk", "RUN-IAM.bat"
)
foreach ($d in $desks) {
  foreach ($n in $killNames) {
    $p = Join-Path $d $n
    if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force }
  }
  Get-ChildItem -LiteralPath $d -Filter "*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
    $t = $shell.CreateShortcut($_.FullName).TargetPath
    if ($t -match "projects[\\/]Investment Management|Investment Management|Kalici|START-IAM|Launch-Investment") {
      Remove-Item -LiteralPath $_.FullName -Force
    }
  }
  $lnkPath = Join-Path $d "Investment Management.lnk"
  $s = $shell.CreateShortcut($lnkPath)
  $s.TargetPath = $launcher
  $s.WorkingDirectory = $dest
  $s.Description = "Investment Management — QuantEdge Terminal"
  $s.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"
  $s.Save()
  Write-Host "  [OK] $lnkPath"
  Write-Host "       -> $launcher"
}

$oldLaunch = Join-Path $env:USERPROFILE "projects\Investment Management\Launch-Investment-Management.bat"
if (Test-Path $oldLaunch) {
  Rename-Item -LiteralPath $oldLaunch -NewName "Launch-Investment-Management.bat.DISABLED" -Force -ErrorAction SilentlyContinue
  Write-Host "  disabled old projects\ launcher"
}

Write-Host "[4/4] Starting app..."
Write-Host "  Keep the two black windows open. Then Ctrl+F5 in the browser."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$launcher`"" -WorkingDirectory $dest
Write-Host ""
Write-Host "DONE. Folder should now contain Investment-Management.bat, backend\, web\, etc."
Write-Host "App: http://127.0.0.1:3000/"
exit 0
