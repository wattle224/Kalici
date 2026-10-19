# Free TCP listen ports used by Investment Management (ledger :8000, web :3000).
param(
    [int[]]$Ports = @(8000, 3000)
)

$ErrorActionPreference = "SilentlyContinue"

foreach ($port in $Ports) {
    $killed = @{}
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $procId = $c.OwningProcess
        if ($procId -and -not $killed.ContainsKey($procId)) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            $killed[$procId] = $true
            Write-Host "  killed PID $procId on :$port"
        }
    }
    if ($killed.Count -eq 0) {
        netstat -ano | Select-String (":$port\s") | Select-String "LISTENING" | ForEach-Object {
            $parts = ($_ -split "\s+") | Where-Object { $_ -ne "" }
            $pidText = $parts[-1]
            if ($pidText -match "^\d+$") {
                $procId = [int]$pidText
                if (-not $killed.ContainsKey($procId)) {
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                    $killed[$procId] = $true
                    Write-Host "  killed PID $procId on :$port (netstat)"
                }
            }
        }
    }
    if ($killed.Count -eq 0) {
        Write-Host "  :$port was free"
    }
}

Start-Sleep -Seconds 1
exit 0
