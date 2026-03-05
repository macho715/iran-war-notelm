$ErrorActionPreference = "Stop"

$pidFile = Join-Path (Join-Path $PSScriptRoot "logs") "local_dashboard_pids.json"

if (-not (Test-Path $pidFile)) {
  Write-Output "PID 파일이 없습니다: $pidFile"
}

$pids = @()
if (Test-Path $pidFile) {
  $payload = Get-Content $pidFile -Raw | ConvertFrom-Json
  $pids += @($payload.api_pid, $payload.ui_pid)
}

$portPids = @()
foreach ($port in @(8000, 3000)) {
  $lines = netstat -ano | Select-String ":$port"
  foreach ($line in $lines) {
    if ($line.ToString() -match "LISTENING\s+(\d+)$") {
      $portPids += [int]$Matches[1]
    }
  }
}

$pids += $portPids
$pids = @($pids | Where-Object { $_ } | Select-Object -Unique)

foreach ($procId in $pids) {
  try {
    Stop-Process -Id $procId -Force -ErrorAction Stop
    Write-Output "Stopped PID: $procId"
  } catch {
    Write-Output "PID already stopped or not found: $procId"
  }
}

Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
Write-Output "Done."
