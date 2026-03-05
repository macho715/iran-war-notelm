param(
    [switch]$DryRun
)

$repoPattern = "iran-war-notelm-main"

$candidates = Get-CimInstance Win32_Process | Where-Object {
    if ($_.Name -ne "python.exe" -or -not $_.CommandLine) {
        return $false
    }
    $cmd = $_.CommandLine.ToLower()
    $isRunMonitor = $cmd -like "*run_monitor.py*"
    $isLegacyMain = ($cmd -like "* main.py*") -or ($cmd -like "*\\main.py*")
    if (-not ($isRunMonitor -or $isLegacyMain)) {
        return $false
    }
    if ($isRunMonitor) {
        return $true
    }
    $isRepo = ($cmd -like "*$repoPattern*") -or ($cmd -like "*iran-war-uae-monitor*")
    return $isRepo
}

if (-not $candidates) {
    Write-Host "No monitor python process found."
    exit 0
}

$rows = @()
foreach ($p in $candidates) {
    $proc = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
    if ($null -eq $proc) {
        continue
    }
    $rows += [PSCustomObject]@{
        ProcessId   = $p.ProcessId
        StartTime   = $proc.StartTime
        CommandLine = $p.CommandLine
    }
}

if (-not $rows) {
    Write-Host "No live process found after filtering."
    exit 0
}

$sorted = $rows | Sort-Object StartTime -Descending
$keep = $sorted | Select-Object -First 1
$kill = $sorted | Select-Object -Skip 1

Write-Host "Keeping newest monitor process:"
$keep | Format-Table -AutoSize

if (-not $kill) {
    Write-Host "No duplicate process to terminate."
    exit 0
}

Write-Host "Duplicate processes:"
$kill | Format-Table -AutoSize

if ($DryRun) {
    Write-Host "DryRun enabled. No process terminated."
    exit 0
}

foreach ($row in $kill) {
    try {
        Stop-Process -Id $row.ProcessId -Force -ErrorAction Stop
        Write-Host "Stopped PID $($row.ProcessId)"
    } catch {
        Write-Warning "Failed to stop PID $($row.ProcessId): $($_.Exception.Message)"
    }
}
